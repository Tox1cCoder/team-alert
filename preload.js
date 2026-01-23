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
  
  // Update mute state for tray
  updateMuteState: (isMuted) => ipcRenderer.send('update-mute-state', isMuted),

  // Alert trigger from shortcut
  onTriggerAlert: (callback) => {
    ipcRenderer.on('trigger-alert', callback);
  },
  
  // Notification failed fallback
  onNotificationFailed: (callback) => {
    ipcRenderer.on('notification-failed', callback);
  },
  
  // Toggle mute from shortcut
  onToggleMute: (callback) => {
    ipcRenderer.on('toggle-mute', callback);
  },
  
  // Settings updated
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', (event, newSettings) => callback(newSettings));
  }
});
