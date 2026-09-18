/**
 * TBC — Toolbox Companion. Local HTTP server (tile launcher UI).
 * Default port: tbc.config.json → port, or 4010.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { logError, getErrorLogs, getDbPath } = require('./lib/db');
const { validateAndNormalize } = require('./lib/validate-config');

const ROOT = __dirname;
const MAX_CONFIG_BODY = 2 * 1024 * 1024;
const CONFIG = path.join(ROOT, 'tbc.config.json');
const PUBLIC = path.join(ROOT, 'public');

function applyPortableMacros(cfg) {
  if (!cfg.macros || typeof cfg.macros !== 'object' || Array.isArray(cfg.macros)) {
    cfg.macros = {};
  }
  cfg.macros.TBC_ROOT = ROOT;
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith('TBC_MACRO_') || typeof v !== 'string' || v === '') continue;
    const name = k.slice('TBC_MACRO_'.length);
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      cfg.macros[name] = v;
    }
  }
}

function loadConfig() {
  const raw = fs.readFileSync(CONFIG, 'utf8');
  const cfg = JSON.parse(raw);
  applyPortableMacros(cfg);
  return cfg;
}

function resolveMacros(str, macros) {
  if (typeof str !== 'string') return str;
  let s = str;
  for (const [k, v] of Object.entries(macros || {})) {
    s = s.split('{{' + k + '}}').join(v);
  }
  return s;
}

function resolveMacrosInObject(obj, macros) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return resolveMacros(obj, macros);
  if (Array.isArray(obj)) return obj.map((x) => resolveMacrosInObject(x, macros));
  if (typeof obj === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(obj)) {
      o[k] = resolveMacrosInObject(v, macros);
    }
    return o;
  }
  return obj;
}

function findTile(cfg, id) {
  for (const page of cfg.pages || []) {
    for (const tile of page.tiles || []) {
      if (tile.id === id) return { tile, page };
    }
  }
  return null;
}

function collectAllTiles(cfg) {
  const out = [];
  for (const page of cfg.pages || []) {
    for (const tile of page.tiles || []) {
      out.push({
        ...tile,
        pageId: page.id,
        pageTitle: page.title || page.id
      });
    }
  }
  return out;
}

function getTileIdSet(cfg) {
  return new Set(collectAllTiles(cfg).map((t) => t.id));
}

function rawLauncherGrid(cfg) {
  if (cfg.launcherGrid && typeof cfg.launcherGrid === 'object') return cfg.launcherGrid;
  if (cfg.streamdeck && typeof cfg.streamdeck === 'object') return cfg.streamdeck;
  return null;
}

function normalizeLauncherGrid(cfg) {
  const tiles = collectAllTiles(cfg);
  const ids = getTileIdSet(cfg);
  const lg = rawLauncherGrid(cfg);
  if (lg) {
    const cols = Math.max(1, Math.min(16, parseInt(lg.columns, 10) || 5));
    const rows = Math.max(1, Math.min(16, parseInt(lg.rows, 10) || 2));
    const need = cols * rows;
    const raw = Array.isArray(lg.cells) ? lg.cells : [];
    const cells = [];
    for (let i = 0; i < need; i++) {
      const c = raw[i];
      if (c == null || typeof c !== 'object') {
        cells.push(null);
        continue;
      }
      const tid = String(c.tileId || '').trim();
      if (!tid || !ids.has(tid)) {
        cells.push(null);
        continue;
      }
      cells.push({ tileId: tid });
    }
    return { columns: cols, rows, cells };
  }
  const defaultCols = 5;
  const n = tiles.length;
  const defaultRows = n ? Math.max(1, Math.ceil(n / defaultCols)) : 1;
  const need = defaultCols * defaultRows;
  const cells = [];
  for (let i = 0; i < need; i++) {
    cells.push(tiles[i] ? { tileId: tiles[i].id } : null);
  }
  return { columns: defaultCols, rows: defaultRows, cells };
}

function requestBaseUrl(req) {
  const h = (req.headers.host || '').toString().trim();
  if (h) return 'http://' + h.replace(/\/$/, '');
  try {
    const cfg = loadConfig();
    const p = Number(process.env.TBC_PORT || cfg.port || 4010);
    return 'http://127.0.0.1:' + p;
  } catch (_) {
    return 'http://127.0.0.1:4010';
  }
}

async function runTileAndRespond(res, tileId) {
  const id = String(tileId || '').trim();
  if (!id) {
    logError({
      level: 'warn',
      code: 'RUN_BAD_REQUEST',
      message: 'id required',
      context: 'runTile'
    });
    sendJson(res, 400, { ok: false, error: 'id required' });
    return;
  }
  const cfg = loadConfig();
  const found = findTile(cfg, id);
  if (!found) {
    logError({
      level: 'warn',
      code: 'TILE_NOT_FOUND',
      message: 'Tile not found',
      context: 'tile:' + id
    });
    sendJson(res, 404, { ok: false, error: 'Tile not found' });
    return;
  }
  const result = await executeTile(found.tile, cfg.macros || {});
  if (result.ok && result.mode === 'openUrl') {
    const openR = await runOpenWindows(result.url);
    if (!openR.ok) {
      logError({
        level: 'error',
        code: 'RUN_OPENURL_FAILED',
        message: openR.error || 'open url failed',
        context: 'tile:' + id
      });
      sendJson(res, 500, { ok: false, error: openR.error || 'Could not open URL' });
      return;
    }
    sendJson(res, 200, { ok: true, mode: 'openUrl', url: result.url });
    return;
  }
  if (!result.ok) {
    logError({
      level: 'error',
      code: 'RUN_FAILED',
      message: result.error || 'run failed',
      context: 'tile:' + id
    });
  }
  sendJson(res, result.ok ? 200 : 500, {
    ok: !!result.ok,
    error: result.error || null
  });
}

async function launcherRunBySlot(res, bodyStr) {
  let j;
  try {
    j = JSON.parse(bodyStr || '{}');
  } catch (err) {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    return;
  }
  const slot = parseInt(j.slot, 10);
  const cfg = loadConfig();
  const layout = normalizeLauncherGrid(cfg);
  const cells = layout.cells || [];
  if (Number.isNaN(slot) || slot < 0 || slot >= cells.length) {
    sendJson(res, 400, { ok: false, error: 'Invalid slot' });
    return;
  }
  const cell = cells[slot];
  if (!cell || !cell.tileId) {
    sendJson(res, 400, { ok: false, error: 'Empty slot' });
    return;
  }
  await runTileAndRespond(res, cell.tileId);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runOpenWindows(target) {
  return new Promise((resolve) => {
    const t = String(target || '').trim();
    if (!t) {
      resolve({ ok: false, error: 'Empty target' });
      return;
    }
    const child = spawn('cmd.exe', ['/c', 'start', '', t], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
    child.unref();
    resolve({ ok: true });
  });
}

async function executeTile(tile, macros) {
  const kind = (tile.kind || 'open').toLowerCase();

  if (kind === 'url') {
    const url = resolveMacros(tile.target, macros);
    if (!/^https?:\/\//i.test(url)) {
      return { ok: false, error: 'Invalid URL' };
    }
    return { ok: true, mode: 'openUrl', url };
  }

  if (kind === 'multi') {
    const list = tile.targets || [];
    if (!Array.isArray(list) || !list.length) {
      return { ok: false, error: 'multi action has no targets' };
    }
    for (const raw of list) {
      const t = resolveMacros(raw, macros);
      const r = await runOpenWindows(t);
      if (!r.ok) return r;
      await delay(220);
    }
    return { ok: true, mode: 'done' };
  }

  if (kind === 'open') {
    const t = resolveMacros(tile.target, macros);
    if (/^https?:\/\//i.test(t)) {
      return { ok: true, mode: 'openUrl', url: t };
    }
    return runOpenWindows(t);
  }

  return { ok: false, error: 'unsupported kind: ' + kind };
}

/** ArgusForge Workshop — browser on localhost may call /health, /api/run, /api/config (Phase 2). */
function forgeCorsOrigin(req) {
  const o = req.headers && req.headers.origin;
  if (!o || typeof o !== 'string') return null;
  if (process.env.TBC_CORS_ORIGIN && o === process.env.TBC_CORS_ORIGIN) return o;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o)) return o;
  const extra = (process.env.TBC_CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (extra.includes(o)) return o;
  return null;
}

function applyForgeCors(req, res) {
  const origin = forgeCorsOrigin(req);
  if (!origin) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function getClientIp(req) {
  const a = req.socket && req.socket.remoteAddress;
  return a ? String(a) : '';
}

function isLocalReq(req) {
  const a = getClientIp(req);
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

function canSaveConfig(req) {
  return isLocalReq(req);
}

function writeConfigAtomic(obj) {
  const tmp = CONFIG + '.tmp';
  const json = JSON.stringify(obj, null, 2);
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, CONFIG);
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.png': 'image/png'
  };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('NOT FOUND');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  applyForgeCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/api/run') {
    const id = url.searchParams.get('id') || '';
    runTileAndRespond(res, id).catch((e) => {
      logError({
        level: 'error',
        code: 'RUN_EXCEPTION',
        message: e.message || String(e),
        detail: e.stack,
        context: 'GET /api/run'
      });
      sendJson(res, 500, { ok: false, error: e.message || String(e) });
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/run') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const j = JSON.parse(body || '{}');
        await runTileAndRespond(res, j.id);
      } catch (e) {
        logError({
          level: 'error',
          code: 'RUN_EXCEPTION',
          message: e.message || String(e),
          detail: e.stack,
          context: 'POST /api/run'
        });
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  function sendLauncherManifest() {
    try {
      const cfg = loadConfig();
      const base = requestBaseUrl(req);
      const layout = normalizeLauncherGrid(cfg);
      const tiles = collectAllTiles(cfg);
      const list = tiles.map((t) => ({
        id: t.id,
        label: t.label,
        icon: t.icon,
        pageId: t.pageId,
        pageTitle: t.pageTitle,
        kind: t.kind,
        runUrlGet: base + '/api/run?id=' + encodeURIComponent(t.id),
        runPostBody: JSON.stringify({ id: t.id })
      }));
      sendJson(res, 200, {
        version: 1,
        name: cfg.name || 'TBC',
        port: Number(process.env.TBC_PORT || cfg.port || 4010),
        baseUrl: base,
        tiles: list,
        launcherGrid: layout
      });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/launcher') {
    sendLauncherManifest();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/streamdeck') {
    sendLauncherManifest();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/launcher/run') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      launcherRunBySlot(res, body).catch((e) => {
        logError({
          level: 'error',
          code: 'LAUNCHER_RUN',
          message: e.message || String(e),
          detail: e.stack,
          context: 'POST /api/launcher/run'
        });
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      });
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/streamdeck/run') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      launcherRunBySlot(res, body).catch((e) => {
        logError({
          level: 'error',
          code: 'LAUNCHER_RUN',
          message: e.message || String(e),
          detail: e.stack,
          context: 'POST /api/streamdeck/run'
        });
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      });
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/launcher-open') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      launcherRunBySlot(res, body).catch((e) => {
        logError({
          level: 'error',
          code: 'LAUNCHER_OPEN',
          message: e.message || String(e),
          detail: e.stack,
          context: 'POST /launcher-open'
        });
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      });
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/streamdeck-open') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      launcherRunBySlot(res, body).catch((e) => {
        logError({
          level: 'error',
          code: 'LAUNCHER_OPEN',
          message: e.message || String(e),
          detail: e.stack,
          context: 'POST /streamdeck-open'
        });
        sendJson(res, 500, { ok: false, error: e.message || String(e) });
      });
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    try {
      const cfg = loadConfig();
      sendJson(res, 200, cfg);
    } catch (e) {
      logError({
        level: 'error',
        code: 'CONFIG_READ',
        message: e.message || String(e),
        detail: e.stack,
        context: 'GET /api/config'
      });
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/config') {
    if (!canSaveConfig(req)) {
      sendJson(res, 403, {
        ok: false,
        error: 'Forbidden: save only from this PC (127.0.0.1)'
      });
      return;
    }
    let body = '';
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_CONFIG_BODY) {
        req.destroy();
        return;
      }
      body += c;
    });
    req.on('end', () => {
      try {
        if (size > MAX_CONFIG_BODY) {
          sendJson(res, 413, { ok: false, error: 'Config too large' });
          return;
        }
        const raw = JSON.parse(body || '{}');
        const v = validateAndNormalize(raw);
        if (!v.ok) {
          sendJson(res, 400, { ok: false, error: v.error });
          return;
        }
        writeConfigAtomic(v.config);
        sendJson(res, 200, { ok: true, config: v.config });
      } catch (e) {
        logError({
          level: 'error',
          code: 'CONFIG_SAVE',
          message: e.message || String(e),
          detail: e.stack,
          context: 'POST /api/config'
        });
        sendJson(res, 400, { ok: false, error: e.message || String(e) });
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/errors') {
    try {
      const limit = url.searchParams.get('limit') || '100';
      const rows = getErrorLogs(limit);
      sendJson(res, 200, { ok: true, errors: rows, db: getDbPath() });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      name: 'TBC Toolbox Companion',
      root: ROOT,
      sqliteDb: getDbPath()
    });
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    serveStatic(res, path.join(PUBLIC, 'index.html'));
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/launcher' || url.pathname === '/launcher.html')) {
    serveStatic(res, path.join(PUBLIC, 'launcher.html'));
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/streamdeck' || url.pathname === '/streamdeck.html')) {
    res.writeHead(302, { Location: '/launcher' });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/public/')) {
    const rel = url.pathname.slice('/public/'.length).replace(/\.\./g, '');
    serveStatic(res, path.join(PUBLIC, rel));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/css/tbc.css') {
    serveStatic(res, path.join(PUBLIC, 'css', 'tbc.css'));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/js/tbc.js') {
    serveStatic(res, path.join(PUBLIC, 'js', 'tbc.js'));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/js/tbc-editor.js') {
    serveStatic(res, path.join(PUBLIC, 'js', 'tbc-editor.js'));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('NOT FOUND');
});

let cfg0;
try {
  cfg0 = loadConfig();
} catch (e) {
  console.error('[TBC] Error reading tbc.config.json:', e.message);
  try {
    logError({
      level: 'error',
      code: 'CONFIG_STARTUP',
      message: e.message || String(e),
      detail: e.stack,
      context: 'tbc.config.json'
    });
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
}

const PORT = Number(process.env.TBC_PORT || cfg0.port || 4010);

process.on('uncaughtException', (err) => {
  try {
    logError({
      level: 'error',
      code: 'UNCAUGHT_EXCEPTION',
      message: err.message || String(err),
      detail: err.stack,
      context: 'process'
    });
  } catch (_) {
    /* ignore */
  }
  console.error('[TBC] uncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const detail = reason instanceof Error ? reason.stack : undefined;
  try {
    logError({
      level: 'error',
      code: 'UNHANDLED_REJECTION',
      message: msg,
      detail,
      context: 'process'
    });
  } catch (_) {
    /* ignore */
  }
  console.error('[TBC] unhandledRejection:', reason);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  TBC Toolbox Companion');
  console.log('  http://127.0.0.1:' + PORT);
  console.log('  Root: ' + ROOT);
  console.log('  Error DB: ' + getDbPath());
  console.log('');
});
