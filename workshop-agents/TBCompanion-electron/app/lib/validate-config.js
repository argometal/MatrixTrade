/**
 * Validates and normalizes tbc.config.json shape before writing to disk.
 * ORM (Alexandria-style): `ORM/ORM-00-Index.md`.
 */
const KINDS = new Set(['url', 'open', 'multi']);

function slug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function validateAndNormalize(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Config must be a JSON object' };
  }

  const out = {};
  out.version = typeof raw.version === 'number' ? raw.version : 2;
  out.name = typeof raw.name === 'string' ? raw.name.trim() || 'TBC' : 'TBC';
  out.port =
    typeof raw.port === 'number' && raw.port >= 1 && raw.port <= 65535 ? Math.floor(raw.port) : 4010;
  out.description =
    typeof raw.description === 'string' ? raw.description : 'Toolbox Companion configuration';

  out.macros = {};
  if (raw.macros && typeof raw.macros === 'object' && !Array.isArray(raw.macros)) {
    for (const [k, v] of Object.entries(raw.macros)) {
      if (typeof k === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) && typeof v === 'string') {
        out.macros[k] = v;
      }
    }
  }

  if (!Array.isArray(raw.pages) || raw.pages.length === 0) {
    return { ok: false, error: 'At least one page is required' };
  }

  const seenPageIds = new Set();
  const seenTileIds = new Set();
  out.pages = [];

  for (let pi = 0; pi < raw.pages.length; pi++) {
    const p = raw.pages[pi];
    if (!p || typeof p !== 'object') {
      return { ok: false, error: 'Invalid page at index ' + pi };
    }
    let pid = slug(p.id);
    if (!pid) pid = 'page_' + (pi + 1);
    if (seenPageIds.has(pid)) {
      return { ok: false, error: 'Duplicate page id: ' + pid };
    }
    seenPageIds.add(pid);

    const page = {
      id: pid,
      title: typeof p.title === 'string' && p.title.trim() ? p.title.trim() : pid,
      subtitle: typeof p.subtitle === 'string' ? p.subtitle.trim() : '',
      tiles: []
    };

    const tiles = Array.isArray(p.tiles) ? p.tiles : [];
    for (let ti = 0; ti < tiles.length; ti++) {
      const t = tiles[ti];
      if (!t || typeof t !== 'object') {
        return { ok: false, error: 'Invalid tile on page "' + pid + '" at index ' + ti };
      }
      let tid = slug(t.id);
      if (!tid) tid = 'tile_' + pi + '_' + ti;
      if (seenTileIds.has(tid)) {
        return { ok: false, error: 'Duplicate tile id (must be unique): ' + tid };
      }
      seenTileIds.add(tid);

      let kind = String(t.kind || 'open').toLowerCase();
      if (!KINDS.has(kind)) {
        return { ok: false, error: 'Invalid kind for tile "' + tid + '": ' + kind };
      }

      const tile = {
        id: tid,
        label: typeof t.label === 'string' && t.label.trim() ? t.label.trim() : tid,
        icon: typeof t.icon === 'string' ? t.icon.trim() : '📌',
        kind
      };

      if (typeof t.hint === 'string' && t.hint.trim()) tile.hint = t.hint.trim();
      if (typeof t.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(t.accent.trim())) {
        tile.accent = t.accent.trim();
      }

      if (kind === 'multi') {
        const targets = Array.isArray(t.targets) ? t.targets : [];
        const list = targets
          .map((x) => String(x || '').trim())
          .filter(Boolean);
        if (!list.length) {
          return { ok: false, error: 'Multi tile "' + tid + '" needs at least one target line' };
        }
        tile.targets = list;
      } else {
        const target = typeof t.target === 'string' ? t.target.trim() : '';
        if (!target) {
          return { ok: false, error: 'Tile "' + tid + '" needs a target (URL or path)' };
        }
        tile.target = target;
      }

      page.tiles.push(tile);
    }

    out.pages.push(page);
  }

  const gridRaw =
    raw.launcherGrid != null && typeof raw.launcherGrid === 'object' && !Array.isArray(raw.launcherGrid)
      ? raw.launcherGrid
      : raw.streamdeck != null && typeof raw.streamdeck === 'object' && !Array.isArray(raw.streamdeck)
        ? raw.streamdeck
        : null;
  if (gridRaw) {
    const cols = Math.max(1, Math.min(16, parseInt(gridRaw.columns, 10) || 5));
    const rows = Math.max(1, Math.min(16, parseInt(gridRaw.rows, 10) || 2));
    const need = cols * rows;
    const cellsIn = Array.isArray(gridRaw.cells) ? gridRaw.cells : [];
    const cells = [];
    for (let i = 0; i < need; i++) {
      const c = cellsIn[i];
      if (c == null) {
        cells.push(null);
        continue;
      }
      if (typeof c !== 'object' || Array.isArray(c)) {
        return { ok: false, error: 'Invalid launcherGrid.cells at index ' + i };
      }
      const ref = slug(c.tileId != null ? c.tileId : c.tileid);
      if (!ref) {
        cells.push(null);
        continue;
      }
      if (!seenTileIds.has(ref)) {
        return { ok: false, error: 'launcherGrid references unknown tile id: ' + ref };
      }
      cells.push({ tileId: ref });
    }
    out.launcherGrid = { columns: cols, rows, cells };
  }

  return { ok: true, config: out };
}

module.exports = { validateAndNormalize, slug };
