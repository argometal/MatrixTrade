/**
 * TBC en Electron — mismo patrón que sl-mouse-sim: sin .bat/.vbs/cmd en runtime.
 * ORM: ORM/ORM-00-Index.md
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(() => {
  const userRoot = path.join(app.getPath('userData'), 'tb-companion');
  process.env.TBC_DATA_ROOT = userRoot;
  process.env.TBC_PUBLIC = path.join(__dirname, 'public');
  process.env.TBC_DEFAULT_CONFIG = path.join(__dirname, 'packaging', 'default-tbc.config.json');
  process.env.TBC_EXE_DIR = path.dirname(process.execPath);
  process.env.TBC_ELECTRON = '1';

  const { initLog, log, getLogPath } = require('./lib/app-log');
  initLog(userRoot);
  try {
    log('info', 'electron', 'app ready', { userRoot, logFile: getLogPath() });
  } catch (_) {
    /* ignore */
  }

  const { start } = require('./server.cjs');
  start((err, port) => {
    if (err) {
      try {
        log('fatal', 'electron', 'servidor no arrancó', err);
      } catch (_) {
        /* ignore */
      }
      console.error(err);
      app.quit();
      return;
    }
    createWindow(port);
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
