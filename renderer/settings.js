// DOM Elements
const settingsForm = document.getElementById('settingsForm');
const usernameInput = document.getElementById('username');
const serverUrlInput = document.getElementById('serverUrl');
const autoStartCheckbox = document.getElementById('autoStart');
const soundEnabledCheckbox = document.getElementById('soundEnabled');
const boss1ShortcutSelect = document.getElementById('boss1Shortcut');
const boss2ShortcutSelect = document.getElementById('boss2Shortcut');
const muteShortcutSelect = document.getElementById('muteShortcut');
const cancelBtn = document.getElementById('cancelBtn');
const successBanner = document.getElementById('successBanner');

// Load current settings
async function loadSettings() {
  const settings = await window.electronAPI.getSettings();
  
  usernameInput.value = settings.username || '';
  serverUrlInput.value = settings.serverUrl || 'http://localhost:3000';
  autoStartCheckbox.checked = settings.autoStart !== false; // default true
  soundEnabledCheckbox.checked = settings.soundEnabled !== false; // default true
  boss1ShortcutSelect.value = settings.boss1Shortcut || 'numdiv';
  boss2ShortcutSelect.value = settings.boss2Shortcut || 'nummult';
  muteShortcutSelect.value = settings.muteShortcut || 'numsub';
}

// Save settings
settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const settings = {
    username: usernameInput.value.trim(),
    serverUrl: serverUrlInput.value.trim(),
    autoStart: autoStartCheckbox.checked,
    soundEnabled: soundEnabledCheckbox.checked,
    boss1Shortcut: boss1ShortcutSelect.value,
    boss2Shortcut: boss2ShortcutSelect.value,
    muteShortcut: muteShortcutSelect.value
  };

  if (!settings.username) {
    alert('Please enter your username');
    return;
  }

  if (!settings.serverUrl) {
    alert('Please enter the server URL');
    return;
  }

  // Check for duplicate shortcuts
  const shortcuts = [settings.boss1Shortcut, settings.boss2Shortcut, settings.muteShortcut];
  const uniqueShortcuts = new Set(shortcuts);
  if (uniqueShortcuts.size !== shortcuts.length) {
    alert('All shortcuts must be different');
    return;
  }

  // Save settings
  const result = await window.electronAPI.saveSettings(settings);

  if (result.success) {
    // Show success message
    successBanner.classList.add('show');
    
    if (result.needsRestart) {
      // Auto-restart for critical settings
      setTimeout(() => {
        successBanner.textContent = 'Settings saved! Restarting app...';
        setTimeout(() => {
          window.electronAPI.restartApp();
        }, 1000);
      }, 500);
    } else {
      // Just close settings window
      setTimeout(() => {
        successBanner.classList.remove('show');
        window.close();
      }, 2000);
    }
  }
});

// Cancel button
cancelBtn.addEventListener('click', () => {
  window.close();
});

// Initialize
window.addEventListener('DOMContentLoaded', loadSettings);
