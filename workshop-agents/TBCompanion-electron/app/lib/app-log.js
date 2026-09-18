/**
 * Registro en archivo (texto plano) para diagnóstico; complementa SQLite en lib/db.js.
 * ORM: ORM/ORM-00-Index.md — sección «Registro archivo».
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

let logPath = null;
let writeWarned = false;

function ts() {
  return new Date().toISOString();
}

function writeLine(absPath, line) {
  if (!absPath) return;
  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    const s = line.endsWith('\n') ? line : line + '\n';
    fs.appendFileSync(absPath, s, 'utf8');
  } catch (err) {
    if (!writeWarned) {
      writeWarned = true;
      console.error('[TBC] no se pudo escribir el registro:', absPath, err && err.message);
    }
  }
}

/**
 * @param {string} baseDir carpeta raíz de la instalación (INSTALL_ROOT)
 */
function initLog(baseDir) {
  const dir = path.join(baseDir, 'logs');
  const next = path.join(dir, 'tb-companion.log');
  if (logPath === next) {
    return;
  }
  logPath = next;
  const line = `${ts()} [info] [boot] iniciando registro en ${logPath}`;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, line + '\n', 'utf8');
  } catch (e) {
    const fb = path.join(os.tmpdir(), 'tb-companion.log');
    console.error(
      '[TBC] no se pudo crear el registro en la carpeta de la app; usando temporal:',
      fb,
      '(' + (e && e.message) + ')'
    );
    logPath = fb;
    writeLine(logPath, line + ' | fallback a ' + fb + ' | ' + (e && e.message));
  }
}

function getLogPath() {
  return logPath;
}

/**
 * @param {'debug'|'info'|'warn'|'error'|'fatal'} level
 */
function log(level, tag, msg, extra) {
  if (!logPath) return;
  let line = `${ts()} [${level}] [${tag}] ${msg}`;
  if (extra !== undefined && extra !== null) {
    const tail =
      typeof extra === 'string'
        ? extra
        : extra instanceof Error
          ? extra.stack || extra.message
          : (() => {
              try {
                return JSON.stringify(extra);
              } catch (_) {
                return String(extra);
              }
            })();
    line += ' | ' + tail;
  }
  writeLine(logPath, line);
}

module.exports = { initLog, log, getLogPath, writeLine };
