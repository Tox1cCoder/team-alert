const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, ipcMain, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize settings store
const store = new Store({
  defaults: {
    username: '',
    serverUrl: 'http://localhost:3000',
    autoStart: true,
    soundEnabled: true,
    boss1Shortcut: 'numdiv',  // Numpad /
    boss2Shortcut: 'nummult'  // Numpad *
  }
});

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let isQuitting = false;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 850,
    minWidth: 600,
    minHeight: 700,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    // Only show if it's the first run or user doesn't have a username
    if (!store.get('username')) {
      mainWindow.show();
    } else {
      // Just start minimized to tray
      console.log('Starting minimized to tray');
    }
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Show notification on first hide
      if (Notification.isSupported() && !store.get('hideMinimizeNotification')) {
        new Notification({
          title: 'Team Alert',
          body: 'App is running in the background. Use the system tray to access it.',
          icon: path.join(__dirname, 'assets', 'icon.png')
        }).show();
        store.set('hideMinimizeNotification', true);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 450,
    height: 500,
    resizable: false,
    parent: mainWindow,
    modal: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true
  });

  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Team Alert System');

  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu(onlineUsers = 0) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Team Alert - ${store.get('username') || 'Not configured'}`,
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: `Online: ${onlineUsers} members`,
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Boss 1 Alert (Numpad /)',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('trigger-alert', { bossDirection: 'boss1' });
        }
      }
    },
    {
      label: 'Boss 2 Alert (Numpad *)',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('trigger-alert', { bossDirection: 'boss2' });
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function registerGlobalShortcuts() {
  // Unregister all existing shortcuts first
  globalShortcut.unregisterAll();

  const boss1Key = store.get('boss1Shortcut') || 'numdiv';
  const boss2Key = store.get('boss2Shortcut') || 'nummult';

  // Boss 1 Alert
  const ret1 = globalShortcut.register(boss1Key, () => {
    console.log(`${boss1Key} pressed - sending Boss 1 alert`);
    if (mainWindow) {
      mainWindow.webContents.send('trigger-alert', { bossDirection: 'boss1' });
    }
  });

  // Boss 2 Alert
  const ret2 = globalShortcut.register(boss2Key, () => {
    console.log(`${boss2Key} pressed - sending Boss 2 alert`);
    if (mainWindow) {
      mainWindow.webContents.send('trigger-alert', { bossDirection: 'boss2' });
    }
  });

  if (!ret1 || !ret2) {
    console.log('Global shortcut registration failed');
  } else {
    console.log('Global shortcuts registered successfully');
    console.log(`  ${boss1Key} = Boss 1 Alert`);
    console.log(`  ${boss2Key} = Boss 2 Alert`);
  }
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return {
    username: store.get('username'),
    serverUrl: store.get('serverUrl'),
    autoStart: store.get('autoStart'),
    soundEnabled: store.get('soundEnabled'),
    boss1Shortcut: store.get('boss1Shortcut'),
    boss2Shortcut: store.get('boss2Shortcut')
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  const oldUsername = store.get('username');
  const oldServerUrl = store.get('serverUrl');
  const oldBoss1 = store.get('boss1Shortcut');
  const oldBoss2 = store.get('boss2Shortcut');

  store.set('username', settings.username);
  store.set('serverUrl', settings.serverUrl);
  store.set('autoStart', settings.autoStart);
  store.set('soundEnabled', settings.soundEnabled);
  store.set('boss1Shortcut', settings.boss1Shortcut || 'numdiv');
  store.set('boss2Shortcut', settings.boss2Shortcut || 'nummult');
  
  // Update auto-start
  if (settings.autoStart) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    });
  } else {
    app.setLoginItemSettings({
      openAtLogin: false
    });
  }

  // Check if shortcuts changed - re-register them
  if (oldBoss1 !== settings.boss1Shortcut || oldBoss2 !== settings.boss2Shortcut) {
    registerGlobalShortcuts();
  }

  // Check if critical settings changed - trigger restart
  const needsRestart = (oldUsername !== settings.username) || (oldServerUrl !== settings.serverUrl);

  return { 
    success: true,
    needsRestart: needsRestart
  };
});

ipcMain.on('update-online-count', (event, count) => {
  updateTrayMenu(count);
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});

ipcMain.on('show-notification', (event, data) => {
  if (Notification.isSupported()) {
    try {
      const notification = new Notification({
        title: data.title || 'Team Alert',
        body: data.body || 'Alert received!',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        urgency: 'critical',
        timeoutType: 'default',
        silent: false // Ensure sound plays
      });

      notification.show();

      // Auto-close notification after 3 seconds
      setTimeout(() => {
        try {
          notification.close();
        } catch (err) {
          console.log('Could not close notification:', err);
        }
      }, 3000);

      // Flash tray icon
      if (tray) {
        let flashCount = 0;
        const flashInterval = setInterval(() => {
          tray.setImage(
            flashCount % 2 === 0 
              ? nativeImage.createEmpty() 
              : nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 16, height: 16 })
          );
          flashCount++;
          if (flashCount > 10) {
            clearInterval(flashInterval);
            tray.setImage(nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 16, height: 16 }));
          }
        }, 500);
      }

      notification.on('click', () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });

      notification.on('error', (error) => {
        console.error('Notification error:', error);
        // Send message back to renderer to show in-app alert
        if (mainWindow) {
          mainWindow.webContents.send('notification-failed', data);
        }
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
      // Send message back to renderer to show in-app alert
      if (mainWindow) {
        mainWindow.webContents.send('notification-failed', data);
      }
    }
  } else {
    console.log('Notifications not supported');
    // Send message back to renderer to show in-app alert
    if (mainWindow) {
      mainWindow.webContents.send('notification-failed', data);
    }
  }
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();
  createTray();
  registerGlobalShortcuts();

  // Set auto-start if enabled
  if (store.get('autoStart')) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    });
  }
});

app.on('window-all-closed', (e) => {
  // Prevent app from quitting when all windows are closed
  e.preventDefault();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});
