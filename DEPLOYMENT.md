# Team Alert System - Deployment Guide

## Quick Start (For Your IT Team)

This guide will help you deploy the Team Alert System to all 9 team members.

## Prerequisites

- All team members must have Windows 10 or later
- All computers must be on the same network (or connected via VPN)
- Node.js must be installed on the server machine

## Step 1: Set Up the Server

### Option A: Dedicated Server/PC (Recommended)

1. **Choose a server PC** that will stay running (can be any workstation or server)

2. **Find the server's IP address:**
   - Open Command Prompt
   - Type: `ipconfig`
   - Look for "IPv4 Address" (example: `192.168.1.100`)
   - **Write this down** - you'll need it for Step 3

3. **Configure Windows Firewall:**
   ```cmd
   netsh advfirewall firewall add rule name="Team Alert Server" dir=in action=allow protocol=TCP localport=3000
   ```

4. **Copy the server folder** to the server PC

5. **Install dependencies:**
   ```cmd
   cd server
   npm install
   ```

6. **Start the server:**
   ```cmd
   npm start
   ```

7. **Verify server is running:**
   - Open browser to `http://localhost:3000/health`
   - Should show: `{"status":"healthy",...}`

### Option B: Keep Server Running Permanently (PM2)

For production use, use PM2 to keep the server running:

```cmd
npm install -g pm2
cd server
pm2 start index.js --name team-alert-server
pm2 save
pm2 startup
```

The server will now:
- Auto-restart if it crashes
- Start automatically when Windows starts

## Step 2: Find Your Server IP Address

From all other team member PCs, verify they can reach the server:

```cmd
ping [server-ip-address]
```

Example: `ping 192.168.1.100`

If this fails, check:
- Both PCs are on the same network
- Firewall is configured correctly
- Server is running

## Step 3: Install Client App on Each Team Member PC

### For Now (Development/Testing):

1. **Copy the entire project folder** to each team member's PC

2. **Install dependencies:**
   ```cmd
   npm install
   ```

3. **Start the app:**
   ```cmd
   npm start
   ```

4. **First-time setup:**
   - Click Settings (⚙️)
   - Enter your name (e.g., "John", "Sarah", etc.)
   - Enter server URL: `http://[server-ip]:3000`
   - Enable "Start with Windows" ✓
   - Enable "Enable alert sound" ✓
   - Click "Save Settings"
   - **Restart the app**

### For Production (After Building Installer):

Once you build the installer (see Step 4), you'll:

1. Copy `Team-Alert-Setup-1.0.0.exe` to each PC
2. Run the installer
3. Launch the app and configure settings (same as above)

## Step 4: Build the Installer (Optional)

To create a distributable installer:

```cmd
npm run build
```

The installer will be created at:
```
dist\Team-Alert-Setup-1.0.0.exe
```

Distribute this file to all team members via:
- Network share
- USB drives
- Email (if file size allows)

## Step 5: Test the System

### Test with 2 PCs First:

1. **PC 1 (Server PC):**
   - Start the server
   - Start the client app
   - Configure username: "User1"
   - Configure server: `http://localhost:3000`

2. **PC 2:**
   - Start the client app
   - Configure username: "User2"
   - Configure server: `http://[server-ip]:3000`

3. **Verify both users appear in the "Team Members" list**

4. **Test alert from PC 1:**
   - Click the big red "SEND ALERT" button
   - PC 2 should receive notification + sound

5. **Test shortcut from PC 2:**
   - Minimize the app
   - Press `Numpad /`
   - PC 1 should receive the alert

### Test with All 9 Members:

1. All 9 members launch the app
2. Verify all 9 appear in each other's "Team Members" list
3. Each person sends one test alert
4. Everyone should receive 8 alerts total

## Configuration Reference

### Server Configuration (`server/.env`)

```env
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production          # Environment (development/production)
LOG_LEVEL=info              # Logging level (info/warn/error)
```

### Client Settings

- **Username**: Your display name (shown to team)
- **Server URL**: 
  - On server PC: `http://localhost:3000`
  - On other PCs: `http://[server-ip]:3000`
- **Start with Windows**: Check this for all team members
- **Enable alert sound**: Recommended

## Troubleshooting

### Problem: Can't connect to server

**Solution:**
1. Verify server is running: Check `http://[server-ip]:3000/health` in browser
2. Ping the server: `ping [server-ip]`
3. Check firewall: Make sure port 3000 is allowed
4. Verify server URL in settings is correct

### Problem: No notification appears

**Solution:**
1. Check Windows notification settings
2. Disable "Focus Assist" in Windows
3. Verify sound is enabled in app settings
4. Try sending an alert to yourself first

### Problem: Global shortcuts don't work

**Solution:**
1. Make sure app is running (check system tray)
2. Verify no other app is using Numpad / or *
3. Try restarting the app
4. Check if NumLock is on

### Problem: App doesn't start with Windows

**Solution:**
1. Enable "Start with Windows" in Settings
2. Check Task Manager > Startup tab
3. Verify app is not disabled there

### Problem: User shows as offline but they're running the app

**Solution:**
1. Check their connection status (top of app)
2. Verify server URL is correct in their settings
3. Try restarting their app
4. Check network connectivity

## Network Information You'll Need

| Information | Where to Find | Example |
|------------|---------------|---------|
| Server IP | `ipconfig` on server PC | `192.168.1.100` |
| Server Port | `server/.env` (default: 3000) | `3000` |
| Server URL | Combine IP + Port | `http://192.168.1.100:3000` |

## Security Notes

- This system uses a **trust-based approach** (no passwords)
- Designed for use on a **trusted local network**
- Username is self-identified (honor system)
- **Do not expose server to the internet** without additional security

## Getting Your Server IP (Detailed)

### On the Server PC:

1. Press `Win + R`
2. Type `cmd` and press Enter
3. Type `ipconfig` and press Enter
4. Look for your network adapter (usually "Ethernet" or "Wi-Fi")
5. Find "IPv4 Address" - this is your server IP

Example output:
```
Ethernet adapter Ethernet:
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
```

Use: `192.168.1.100`

## Daily Usage

### For Team Members:

1. **App runs in background** - look for icon in system tray
2. **To send alert:**
   - Press `Numpad /` or `*` (from anywhere), OR
   - Right-click tray icon → "Send Alert", OR
   - Open app window and click big red button
3. **When you receive an alert:**
   - Notification will appear
   - Sound will play (if enabled)
   - Alert appears in app's "Recent Alerts" list

### For Server Administrator:

1. **Keep server PC running**
2. **Monitor server:**
   - Check `http://localhost:3000/users` to see who's online
   - Check `http://localhost:3000/health` for server status
3. **If server crashes:**
   - Restart it: `npm start` (or PM2 will auto-restart)
4. **View server logs:**
   - Console output shows all connections/disconnections
   - `server.log` file contains full logs

## Checklist for Deployment

- [ ] Server PC selected and prepared
- [ ] Node.js installed on server PC
- [ ] Server IP address identified: `___________________`
- [ ] Firewall rule added for port 3000
- [ ] Server started and health check passes
- [ ] Client apps installed on all 9 PCs
- [ ] Each user configured their username
- [ ] Each user configured server URL
- [ ] All 9 users appear in "Team Members" list
- [ ] Test alerts sent and received successfully
- [ ] Global shortcuts tested (Numpad /)
- [ ] Auto-start verified (apps restart with Windows)
- [ ] All team members trained on usage

## Support

If you encounter issues:

1. Check this troubleshooting guide first
2. Verify all PCs can ping the server
3. Check the server logs (`server.log`)
4. Restart both server and client apps

---

**You're all set! Your team can now alert each other instantly. 🚨**
