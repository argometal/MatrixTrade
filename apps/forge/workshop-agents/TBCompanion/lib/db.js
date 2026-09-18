/**
 * TBC local SQLite — error log for offline debugging (no cloud, no AI on host).
 * File: <TBCompanion>/data/tbc.db (+ WAL sidecars).
 */
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'tbc.db');

const MAX_ROWS = 5000;

let db;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function applyPragmas(d) {
  d.exec('PRAGMA journal_mode = WAL;');
  d.exec('PRAGMA synchronous = NORMAL;');
  d.exec('PRAGMA busy_timeout = 5000;');
}

function getDb() {
  if (db) return db;
  ensureDataDir();
  db = new DatabaseSync(DB_PATH);
  applyPragmas(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS error_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      level TEXT NOT NULL,
      code TEXT,
      message TEXT NOT NULL,
      detail TEXT,
      context TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tbc_err_created ON error_log(created_at);
  `);
  return db;
}

function trimRows() {
  try {
    const d = getDb();
    const row = d
      .prepare('SELECT id FROM error_log ORDER BY id DESC LIMIT 1 OFFSET ?')
      .get(MAX_ROWS - 1);
    if (!row) return;
    d.prepare('DELETE FROM error_log WHERE id < ?').run(row.id);
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {object} o
 * @param {'error'|'warn'} o.level
 * @param {string} [o.code] short stable code e.g. RUN_FAILED, CONFIG_PARSE
 * @param {string} o.message
 * @param {string} [o.detail] stack or extra JSON
 * @param {string} [o.context] e.g. tile id, route
 */
function logError(o) {
  try {
    const d = getDb();
    const stmt = d.prepare(
      'INSERT INTO error_log (created_at, level, code, message, detail, context) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(
      new Date().toISOString(),
      String(o.level || 'error'),
      o.code != null ? String(o.code) : null,
      String(o.message || ''),
      o.detail != null ? String(o.detail) : null,
      o.context != null ? String(o.context) : null
    );
    trimRows();
  } catch (e) {
    try {
      fs.appendFileSync(path.join(DATA_DIR, 'tbc-fallback.log'), `${new Date().toISOString()} ${e.message}\n`);
    } catch (_) {
      /* last resort */
    }
  }
}

function getErrorLogs(limit) {
  const n = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const d = getDb();
  const stmt = d.prepare(
    'SELECT id, created_at, level, code, message, detail, context FROM error_log ORDER BY id DESC LIMIT ?'
  );
  return stmt.all(n);
}

function getDbPath() {
  return DB_PATH;
}

module.exports = {
  getDb,
  logError,
  getErrorLogs,
  getDbPath
};
