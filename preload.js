const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  openSettings: () => ipcRenderer.send('open-settings'),
  restartApp: () => ipcRenderer.send('restart-app'),
  
  // Notifications
  showNotification: (data) => ipcRenderer.send('show-notification', data),
  
  // Online count update
  updateOnlineCount: (count) => ipcRenderer.send('update-online-count', count),
  
  // Alert trigger from shortcut
  onTriggerAlert: (callback) => {
    ipcRenderer.on('trigger-alert', callback);
  },
  
  // Notification failed fallback
  onNotificationFailed: (callback) => {
    ipcRenderer.on('notification-failed', callback);
  }
});
