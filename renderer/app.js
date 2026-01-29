// Socket.io is loaded from CDN in index.html

let socket = null;
let settings = null;
let currentUsername = "";
let onlineUsers = [];
let recentAlerts = [];

// Audio for alerts
const alertAudio = new Audio("../assets/alert.mp3");

// DOM Elements
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const currentUsernameEl = document.getElementById("currentUsername");
const onlineCountEl = document.getElementById("onlineCount");
const usersListEl = document.getElementById("usersList");
const alertsListEl = document.getElementById("alertsList");
const alertBoss1Btn = document.getElementById("alertBoss1");
const alertBoss2Btn = document.getElementById("alertBoss2");
const settingsBtn = document.getElementById("settingsBtn");
const boss1Indicator = document.getElementById("boss1Indicator");
const boss2Indicator = document.getElementById("boss2Indicator");
const muteBtn = document.getElementById("muteBtn");

// State
let isMuted = false;
let muteTimer = null;
const SNOOZE_DURATION = 3 * 60 * 1000; // 3 minutes

// Team member names from the layout
const teamMembers = [
  "Anh Danh",
  "Hiếu",
  "Phúc",
  "Quí",
  "Chi Trâm",
  "Chị Diệu",
  "Anh Tấn",
  "Thái",
  "Minh",
];

// Top row members (opposite side) - layout should flip for them
const topRowMembers = ["Anh Danh", "Hiếu", "Phúc", "Quí"];

// Check if layout should be flipped
let isLayoutFlipped = false;

// Spam prevention
let lastAlertTime = 0;
const ALERT_COOLDOWN = 1000; // 1 second

// Shortcut display labels
const shortcutLabels = {
  numdiv: "Num /",
  nummult: "Num *",
  numadd: "Num +",
  numsub: "Num -",
  f1: "F1",
  f2: "F2",
  f3: "F3",
  f4: "F4",
};

// Initialize app
async function init() {
  // Load settings
  settings = await window.electronAPI.getSettings();
  currentUsername = settings.username;
  currentUsernameEl.textContent = currentUsername || "Not configured";

  // Check if user is on top row (opposite side) - flip layout
  if (topRowMembers.includes(currentUsername)) {
    isLayoutFlipped = true;
    flipLayout();
  }

  // Check if username is set
  if (!currentUsername) {
    updateStatus("disconnected", "Please configure username in settings");
    return;
  }

  // Connect to server
  connectToServer();

  // Listen for settings updates
  window.electronAPI.onSettingsUpdated((newSettings) => {
    settings = newSettings;
    updateShortcutHints();
    // Also update username if changed (though restart usually required for fully applying changes)
    if (newSettings.username !== currentUsername) {
      currentUsername = newSettings.username;
      currentUsernameEl.textContent = currentUsername || "Not configured";
    }
  });

  // Listen for global mute shortcut
  window.electronAPI.onToggleMute(() => {
    toggleMute();
  });

  // Update hints
  updateShortcutHints();

  // Sync initial mute state (unmuted by default)
  window.electronAPI.updateMuteState(isMuted);
}

function updateShortcutHints() {
  if (!settings) return;

  const boss1Label = shortcutLabels[settings.boss1Shortcut] || "Num /";
  const boss2Label = shortcutLabels[settings.boss2Shortcut] || "Num *";
  const muteLabel = shortcutLabels[settings.muteShortcut] || "Num -";

  const boss1Hint = document.getElementById("boss1Hint");
  const boss2Hint = document.getElementById("boss2Hint");
  const muteHint = document.getElementById("muteHint");

  if (boss1Hint) boss1Hint.textContent = `${boss1Label} = Boss 1`;
  if (boss2Hint) boss2Hint.textContent = `${boss2Label} = Boss 2`;
  if (muteHint) muteHint.textContent = `${muteLabel} = Mute`;
}

function flipLayout() {
  console.log("Flipping layout for opposite side perspective");

  // Rebuild seating grid with reversed order
  const seatingGrid = document.querySelector(".seating-grid");
  seatingGrid.innerHTML = `
    <!-- Row 1 - Reversed -->
    <div class="seat" data-name="Minh">
      <div class="seat-name">Minh</div>
      <div class="seat-status"></div>
    </div>
    <div class="seat" data-name="Thái">
      <div class="seat-name">Thái</div>
      <div class="seat-status"></div>
    </div>
    <div class="seat" data-name="Anh Tấn">
      <div class="seat-name">Anh Tấn</div>
      <div class="seat-status"></div>
    </div>
    <div class="seat" data-name="Chị Diệu">
      <div class="seat-name">Chị Diệu</div>
      <div class="seat-status"></div>
    </div>
    <div class="seat" data-name="Chi Trâm">
      <div class="seat-name">Chi Trâm</div>
      <div class="seat-status"></div>
    </div>

    <!-- Row 2 - Reversed -->
    <div class="seat empty-seat">
      <div class="seat-name">—</div>
    </div>
    <div class="seat" data-name="Quí">
      <div class="seat-name">Quí</div>
      <div class="seat-status"></div>
    </div>
    <div class="seat" data-name="Phúc">
      <div class="seat-name">Phúc</div>
      <div class="seat-status"></div>
    </div>
    <div class="seat" data-name="Hiếu">
      <div class="seat-name">Hiếu</div>
      <div class="seat-status"></div>
    </div>
    <div class="seat" data-name="Anh Danh">
      <div class="seat-name">Anh Danh</div>
      <div class="seat-status"></div>
    </div>
  `;

  // Swap boss indicators positions
  const officeContainer = document.querySelector(".office-container");
  const boss1 = document.getElementById("boss1Indicator");
  const boss2 = document.getElementById("boss2Indicator");

  // Move Boss 1 to the right, Boss 2 to the left
  officeContainer.appendChild(boss1);
  officeContainer.insertBefore(boss2, seatingGrid);

  // Update boss labels (keep Boss 1 as Boss 1, but on opposite side)
  boss1.querySelector(".boss-label span:last-child").textContent = "Boss 1";
  boss2.querySelector(".boss-label span:last-child").textContent = "Boss 2";

  // Flip arrows - Boss 1 now comes from right (←), Boss 2 from left (→)
  const boss1Arrow = boss1.querySelector(".boss-arrow .material-icons");
  const boss2Arrow = boss2.querySelector(".boss-arrow .material-icons");
  boss1Arrow.textContent = "arrow_back"; // ←
  boss2Arrow.textContent = "arrow_forward"; // →

  // Update button labels
  document
    .getElementById("alertBoss1")
    .querySelector(".alert-subtitle").textContent = "From right side";
  document
    .getElementById("alertBoss2")
    .querySelector(".alert-subtitle").textContent = "From left side";

  // Swap Red/Blue buttons (Boss 1/Boss 2 buttons)
  // Boss 1 is Red, Boss 2 is Blue. In flipped mode, we want Blue (left) then Red (right) layout-wise to match indicators?
  // User asked: "swap 2 button Boss 1 Alert and Boss 2 Alert (red and blue button)."
  const alertButtonsContainer = document.querySelector(".alert-buttons");
  alertButtonsContainer.appendChild(alertBoss1Btn); // Moves Boss 1 (Red) to the end (Right side)
}

function connectToServer() {
  updateStatus("connecting", "Connecting to server...");

  socket = io(settings.serverUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    transports: ["websocket", "polling"],
  });

  // Connection events
  socket.on("connect", () => {
    console.log("Connected to server");
    updateStatus("connected", "Connected");

    // Register user
    socket.emit("register", { username: currentUsername });
  });

  socket.on("disconnect", (reason) => {
    console.log("Disconnected:", reason);
    updateStatus("disconnected", "Disconnected - Reconnecting...");
    onlineUsers = [];
    updateUsersList();
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    updateStatus("disconnected", "Connection error - Check server");
  });

  // Registration confirmation
  socket.on("registered", (data) => {
    console.log("Registered successfully:", data);
    onlineUsers = data.users || [];
    updateUsersList();
    updateStatus("connected", `Connected as ${currentUsername}`);
  });

  // Alert received
  socket.on("alert", (data) => {
    console.log("Alert received:", data);
    handleAlertReceived(data);
  });

  // User joined
  socket.on("user-joined", (data) => {
    console.log("User joined:", data);
    onlineUsers = data.users || [];
    updateUsersList();
    showToast(`${data.username} joined`);
  });

  // User left
  socket.on("user-left", (data) => {
    console.log("User left:", data);
    onlineUsers = data.users || [];
    updateUsersList();
    showToast(`${data.username} left`);
  });

  // Users update
  socket.on("users-update", (data) => {
    onlineUsers = data.users || [];
    updateUsersList();
  });

  // Error
  socket.on("error", (error) => {
    console.error("Socket error:", error);
    showToast(error.message || "An error occurred", "error");
  });
}

function updateStatus(status, text) {
  statusText.textContent = text;
  statusDot.className = "status-dot";

  if (status === "connected") {
    statusDot.classList.add("connected");
  } else if (status === "disconnected") {
    statusDot.classList.add("disconnected");
  }
}

function updateUsersList() {
  const count = onlineUsers.length;
  onlineCountEl.textContent = count;

  // Update tray menu
  window.electronAPI.updateOnlineCount(count);

  // Update seat statuses in the office layout
  const seats = document.querySelectorAll(".seat");
  seats.forEach((seat) => {
    const seatName = seat.getAttribute("data-name");
    const isOnline = onlineUsers.some((user) => user.username === seatName);
    const isYou = seatName === currentUsername;

    // Update classes
    seat.classList.toggle("online", isOnline);
    seat.classList.toggle("you", isYou);
  });

  // Update the user list section (keep it for reference)
  if (count === 0) {
    usersListEl.innerHTML =
      '<div class="empty-state">No team members online</div>';
    return;
  }

  usersListEl.innerHTML = onlineUsers
    .map((user) => {
      const isYou = user.username === currentUsername;
      return `
      <div class="user-item online ${isYou ? "you" : ""}">
        <span class="user-name-text">${user.username}</span>
        ${isYou ? '<span class="user-badge">YOU</span>' : ""}
      </div>
    `;
    })
    .join("");
}

function updateAlertsList() {
  if (recentAlerts.length === 0) {
    alertsListEl.innerHTML = '<div class="empty-state">No alerts yet</div>';
    return;
  }

  alertsListEl.innerHTML = recentAlerts
    .slice(0, 10)
    .map((alert) => {
      const time = new Date(alert.timestamp).toLocaleTimeString();
      return `
      <div class="alert-item">
        <div class="alert-item-header">
          <span class="alert-sender">🚨 ${alert.sender}</span>
          <span class="alert-time">${time}</span>
        </div>
        <div class="alert-message">${alert.message}</div>
      </div>
    `;
    })
    .join("");
}

function sendAlert(bossDirection = "boss1") {
  // Spam prevention - 1 second cooldown
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN) {
    const remaining = Math.ceil(
      (ALERT_COOLDOWN - (now - lastAlertTime)) / 1000,
    );
    showToast(
      `Please wait ${remaining}s before sending another alert`,
      "error",
    );
    return;
  }

  if (!socket || !socket.connected) {
    showToast("Not connected to server", "error");
    return;
  }

  if (!currentUsername) {
    showToast("Please configure username in settings", "error");
    window.electronAPI.openSettings();
    return;
  }

  // Update last alert time
  lastAlertTime = now;

  // Add visual feedback
  const button = bossDirection === "boss1" ? alertBoss1Btn : alertBoss2Btn;
  const indicator = bossDirection === "boss1" ? boss1Indicator : boss2Indicator;

  button.classList.add("sending");
  indicator.classList.add("active");

  setTimeout(() => {
    button.classList.remove("sending");
    indicator.classList.remove("active");
  }, 1000);

  // Determine message based on layout perspective
  let directionParts = { text: "", icon: "" };

  if (isLayoutFlipped) {
    // For opposite side: Boss 1 comes from right, Boss 2 from left
    if (bossDirection === "boss1") {
      // Right side, arrow pointing left (inwards/back)? Or pointing towards content?
      directionParts = { text: "right", icon: "arrow_back" };
    } else {
      directionParts = { text: "left", icon: "arrow_forward" };
    }
  } else {
    // Normal side: Boss 1 comes from left, Boss 2 from right
    if (bossDirection === "boss1") {
      // Left side, arrow pointing Right ("===>")
      directionParts = { text: "left", icon: "arrow_forward" };
    } else {
      directionParts = { text: "right", icon: "arrow_back" };
    }
  }

  // Send alert to server - include boss number but not direction yet
  // Each client will add their own perspective's direction
  const bossNumber = bossDirection === "boss1" ? "1" : "2";
  socket.emit("send-alert", {
    message: `Update data ${bossNumber}`, // Base message with boss number
    bossDirection: bossDirection,
    isFlipped: isLayoutFlipped,
  });

  showToast(
    `Alert sent: Boss ${bossDirection === "boss1" ? "1" : "2"}!`,
    "success",
  );
}

function handleAlertReceived(data) {
  let bossDirection = data.bossDirection || "boss1";

  // Calculate direction from MY perspective
  // If sender and I have same layout, use their direction
  // If sender and I have different layout, flip the direction
  let myDirection = data.senderDirection || "left";
  const senderIsFlipped = data.senderIsFlipped || false;

  if (senderIsFlipped !== isLayoutFlipped) {
    // Different layouts - flip the direction
    myDirection = myDirection === "left" ? "right" : "left";
  }

  // Build the message with MY perspective's direction
  const displayMessage = `${data.message} ${myDirection}`;

  // Add to recent alerts with personalized message
  const alertForDisplay = {
    ...data,
    message: displayMessage,
  };
  recentAlerts.unshift(alertForDisplay);
  if (recentAlerts.length > 50) {
    recentAlerts.pop();
  }
  updateAlertsList();

  const sideText = myDirection.toUpperCase(); // 'LEFT' or 'RIGHT'

  // Show boss direction indicator
  const indicator = bossDirection === "boss1" ? boss1Indicator : boss2Indicator;

  // Remove active from both first to prevent stuck states
  boss1Indicator.classList.remove("active");
  boss2Indicator.classList.remove("active");

  // Force reflow to restart animation if needed
  void indicator.offsetWidth;

  indicator.classList.add("active");
  setTimeout(() => indicator.classList.remove("active"), 3000);

  showBigArrowOverlay(sideText);

  // Highlight all seats briefly
  const seats = document.querySelectorAll(".seat");
  seats.forEach((seat) => {
    seat.classList.add("alert-active");
  });
  setTimeout(() => {
    seats.forEach((seat) => seat.classList.remove("alert-active"));
  }, 3000);

  // Play sound if enabled and not muted
  if (settings.soundEnabled && !isMuted) {
    alertAudio.currentTime = 0;
    alertAudio
      .play()
      .catch((err) => console.error("Error playing sound:", err));
  }

  // Show notification - ONLY if not muted
  const isSelf = data.sender === currentUsername;
  if (!isSelf && !isMuted) {
    window.electronAPI.showNotification({
      title: "Data Syncing...",
      body: `${data.sender}: ${displayMessage}`,
    });
  }
}

function showBigArrowOverlay(sideText) {
  const overlay = document.createElement("div");
  overlay.className = "big-arrow-overlay";

  // Icon: arrow_back (West/Left), arrow_forward (East/Right)
  const iconName = sideText === "LEFT" ? "arrow_forward" : "arrow_back";

  overlay.innerHTML = `
        <div class="big-arrow-container">
            <span class="material-icons big-arrow-icon">${iconName}</span>
            <span class="big-arrow-text">${sideText} SIDE</span>
        </div>
    `;

  document.body.appendChild(overlay);

  // Remove after 2 seconds
  setTimeout(() => {
    overlay.style.transition = "opacity 0.3s";
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 300);
  }, 2000);
}

function toggleMute() {
  isMuted = !isMuted;

  // Clear any existing timer
  if (muteTimer) {
    clearTimeout(muteTimer);
    muteTimer = null;
  }

  const icon = muteBtn.querySelector(".material-icons");
  if (isMuted) {
    icon.textContent = "volume_off";
    muteBtn.classList.add("active");
    muteBtn.style.color = "#ff6b6b";
    showToast("Notifications snoozed for 3 min", "error");

    // Auto-unmute after 3 minutes
    muteTimer = setTimeout(() => {
      if (isMuted) {
        toggleMute(); // This will flip it back to unmuted
        showToast("Snooze ended - Notifications active");
      }
    }, SNOOZE_DURATION);
  } else {
    icon.textContent = "volume_up";
    muteBtn.classList.remove("active");
    muteBtn.style.color = "";
    showToast("Notifications unmuted");
  }

  // Update tray menu
  window.electronAPI.updateMuteState(isMuted);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "success-message";
  toast.textContent = message;

  if (type === "error") {
    toast.style.background = "#ff6b6b";
  }

  document.body.appendChild(toast);

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Event listeners
alertBoss1Btn.addEventListener("click", () => sendAlert("boss1"));
alertBoss2Btn.addEventListener("click", () => sendAlert("boss2"));
if (muteBtn) {
  muteBtn.addEventListener("click", toggleMute);
}

console.log("Settings button:", settingsBtn);

if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    console.log("Settings button clicked!");
    window.electronAPI.openSettings();
  });
} else {
  console.error("Settings button not found!");
}

// Listen for alert trigger from global shortcut
// We'll need to update main.js to distinguish between shortcuts
window.electronAPI.onTriggerAlert((event, data) => {
  const bossDirection = data?.bossDirection || "boss1";
  sendAlert(bossDirection);
});

// Listen for notification failures - show in-app fallback
window.electronAPI.onNotificationFailed((event, data) => {
  console.log("Native notification failed, showing in-app alert");
  // Show prominent in-app notification
  showLargeAlert(data.title, data.body);
});

function showLargeAlert(title, message) {
  // Create a large, prominent alert overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    z-index: 10000;
    text-align: center;
    min-width: 400px;
    animation: popIn 0.3s ease-out;
  `;

  overlay.innerHTML = `
    <h2 style="font-size: 32px; margin-bottom: 16px;">${title}</h2>
    <p style="font-size: 20px; margin: 0;">${message}</p>
  `;

  document.body.appendChild(overlay);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    overlay.style.animation = "popOut 0.3s ease-in";
    setTimeout(() => overlay.remove(), 300);
  }, 5000);

  // Click to dismiss
  overlay.addEventListener("click", () => {
    overlay.style.animation = "popOut 0.3s ease-in";
    setTimeout(() => overlay.remove(), 300);
  });
}

// Initialize on load
window.addEventListener("DOMContentLoaded", init);

// Heartbeat to keep connection alive
setInterval(() => {
  if (socket && socket.connected) {
    socket.emit("heartbeat");
  }
}, 30000);
