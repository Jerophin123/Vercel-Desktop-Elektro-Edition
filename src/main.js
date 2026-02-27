/**
 * Vercel Desktop - Main Process
 * Production-ready Electron app wrapping https://vercel.com/dashboard
 * Security: contextIsolation, no nodeIntegration, sandbox, no remote.
 */

const { app, BrowserWindow, Tray, Menu, globalShortcut, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DASHBOARD_URL = 'https://vercel.com/dashboard';
const ALLOWED_ORIGIN = 'https://vercel.com';
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

let mainWindow = null;
let tray = null;

// ---------------------------------------------------------------------------
// Icon from assets folder: uses icon.png (generated from icon.svg by postinstall), else .ico, else .svg path
// ---------------------------------------------------------------------------
function getIconPath() {
  const extensions = ['png', 'ico', 'svg'];
  for (const ext of extensions) {
    const p = path.join(ASSETS_DIR, `icon.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return path.join(ASSETS_DIR, 'icon.png');
}

// ---------------------------------------------------------------------------
// Config: Auto-start on system boot (optional)
// setLoginItemSettings works on Windows/macOS; Linux requires .desktop in autostart
// ---------------------------------------------------------------------------
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { openAtLogin: false };
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

function getAutoStart() {
  return loadConfig().openAtLogin === true;
}

function setAutoStart(enable) {
  const config = loadConfig();
  config.openAtLogin = !!enable;
  saveConfig(config);
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: false
    });
  }
  // Linux: user can add a .desktop file to ~/.config/autostart if desired
}

// ---------------------------------------------------------------------------
// Tray icon: use icon from assets (resized for tray)
// ---------------------------------------------------------------------------
function getTrayIcon() {
  const iconPath = getIconPath();
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
  } catch (_) {}
  return nativeImage.createEmpty();
}

// ---------------------------------------------------------------------------
// Main window creation (secure, production defaults)
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Vercel Desktop',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Performance: avoid throttling when window is in background (e.g. WebSockets)
      backgroundThrottling: false
    },
    icon: getIconPath(),
    show: false
  });

  // Hardware acceleration is enabled by default in Electron; ensure it's not disabled
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide to tray on close instead of quitting (user can Quit from tray)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting && tray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle('Vercel Desktop');
  });

  // Hide scrollbars visually; scrolling still works (touch, wheel, keyboard)
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      ::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; }
    `);
  });

  // Right-click context menu: Back / Forward (using navigationHistory API)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const nav = mainWindow.webContents.navigationHistory;
    const menu = Menu.buildFromTemplate([
      {
        label: 'Back',
        enabled: nav.canGoBack(),
        click: () => nav.goBack()
      },
      {
        label: 'Forward',
        enabled: nav.canGoForward(),
        click: () => nav.goForward()
      },
      { type: 'separator' },
      { label: 'Reload', click: () => mainWindow.webContents.reload() }
    ]);
    menu.popup({ window: mainWindow, x: params.x, y: params.y });
  });

  loadDashboard();
  setupNavigationLock();
}

function loadDashboard() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(DASHBOARD_URL);
  }
}

// ---------------------------------------------------------------------------
// Security: block navigation outside vercel.com
// ---------------------------------------------------------------------------
function setupNavigationLock() {
  if (!mainWindow) return;
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== ALLOWED_ORIGIN) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (_) {
      event.preventDefault();
    }
  });

  // Deny window.open; load vercel.com links in same window, open others in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin === ALLOWED_ORIGIN) {
        mainWindow.loadURL(url);
      } else {
        shell.openExternal(url);
      }
    } catch (_) {}
    return { action: 'deny' };
  });
}

// ---------------------------------------------------------------------------
// System tray
// ---------------------------------------------------------------------------
function createTray() {
  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Vercel Desktop');
  tray.on('click', () => showWindow());
  // Build and show menu on right-click so "Open at login" checkbox is always current (Windows does not emit right-click when setContextMenu is used)
  tray.on('right-click', () => {
    const trayMenu = getTrayMenuTemplate();
    tray.popUpContextMenu(trayMenu);
  });
}

function getTrayMenuTemplate() {
  const autoStart = getAutoStart();
  return Menu.buildFromTemplate([
    { label: 'Open Vercel', click: () => showWindow() },
    { label: 'Reload', click: () => { if (mainWindow) mainWindow.reload(); } },
    { type: 'separator' },
    {
      label: 'Open at login',
      type: 'checkbox',
      checked: autoStart,
      click: (menuItem) => setAutoStart(menuItem.checked)
    },
    { type: 'separator' },
    { label: 'Quit', click: () => quitApp() }
  ]);
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function quitApp() {
  app.isQuitting = true;
  if (tray) tray.destroy();
  tray = null;
  if (mainWindow) mainWindow.destroy();
  mainWindow = null;
  app.quit();
}

// ---------------------------------------------------------------------------
// Global shortcut: Ctrl+Shift+V (Cmd+Shift+V on macOS)
// ---------------------------------------------------------------------------
function registerShortcut() {
  const shortcut = process.platform === 'darwin' ? 'Command+Shift+V' : 'Control+Shift+V';
  globalShortcut.register(shortcut, () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  // Disable remote module (deprecated and unsafe)
  if (typeof app.disableHardwareAcceleration === 'function') {
    // Keep hardware acceleration ON; do not call disableHardwareAcceleration
  }

  createWindow();
  createTray();
  registerShortcut();

  // Apply saved auto-start preference
  if (getAutoStart() && (process.platform === 'win32' || process.platform === 'darwin')) {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: false });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
