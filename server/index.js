const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const config = require('./config');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configure Winston logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ]
});

// Store connected users
const connectedUsers = new Map(); // socketId -> { username, socketId, connectedAt }
const alertHistory = []; // Store recent alerts

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Get connected users (for debugging)
app.get('/users', (req, res) => {
  const users = Array.from(connectedUsers.values()).map(user => ({
    username: user.username,
    connectedAt: user.connectedAt
  }));
  res.json({ users, count: users.length });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info(`New connection: ${socket.id}`);

  // Handle user registration
  socket.on('register', (data) => {
    const { username } = data;
    
    if (!username || username.trim() === '') {
      socket.emit('error', { message: 'Username is required' });
      return;
    }

    // Store user info
    connectedUsers.set(socket.id, {
      username: username.trim(),
      socketId: socket.id,
      connectedAt: new Date().toISOString()
    });

    logger.info(`User registered: ${username} (${socket.id})`);

    // Send confirmation to the user
    socket.emit('registered', {
      userId: socket.id,
      username: username.trim(),
      users: getOnlineUsers()
    });

    // Notify all other users
    socket.broadcast.emit('user-joined', {
      username: username.trim(),
      users: getOnlineUsers()
    });

    // Send current users list to everyone
    io.emit('users-update', {
      users: getOnlineUsers()
    });
  });

  // Handle alert sending
  socket.on('send-alert', (data) => {
    const user = connectedUsers.get(socket.id);
    
    if (!user) {
      socket.emit('error', { message: 'User not registered' });
      return;
    }

    const alertData = {
      sender: user.username,
      senderId: socket.id,
      timestamp: Date.now(),
      message: data.message || '🚨 BOSS ALERT! 🚨'
    };

    // Store in history (keep last 50 alerts)
    alertHistory.unshift(alertData);
    if (alertHistory.length > 50) {
      alertHistory.pop();
    }

    logger.warn(`ALERT from ${user.username}: ${alertData.message}`);

    // Broadcast alert to ALL connected clients (including sender for confirmation)
    io.emit('alert', alertData);
  });

  // Handle heartbeat/ping
  socket.on('heartbeat', () => {
    socket.emit('heartbeat-ack', { timestamp: Date.now() });
  });

  // Get alert history
  socket.on('get-history', () => {
    socket.emit('alert-history', {
      alerts: alertHistory.slice(0, 20) // Send last 20 alerts
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      logger.info(`User disconnected: ${user.username} (${socket.id}) - Reason: ${reason}`);
      
      // Remove user from connected list
      connectedUsers.delete(socket.id);

      // Notify all remaining users
      io.emit('user-left', {
        username: user.username,
        users: getOnlineUsers()
      });

      io.emit('users-update', {
        users: getOnlineUsers()
      });
    } else {
      logger.info(`Unknown user disconnected: ${socket.id}`);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}: ${error.message}`);
  });
});

// Helper function to get online users list
function getOnlineUsers() {
  return Array.from(connectedUsers.values()).map(user => ({
    username: user.username,
    socketId: user.socketId,
    connectedAt: user.connectedAt
  }));
}

// Start server
httpServer.listen(config.port, () => {
  logger.info(`===========================================`);
  logger.info(`Team Alert Server Started`);
  logger.info(`===========================================`);
  logger.info(`Port: ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Health Check: http://localhost:${config.port}/health`);
  logger.info(`Users Endpoint: http://localhost:${config.port}/users`);
  logger.info(`===========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
