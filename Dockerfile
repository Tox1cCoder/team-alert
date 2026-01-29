# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy server directory
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy server source code
COPY server/ ./

# Expose the port
EXPOSE 3003

# Start the server
CMD ["npm", "start"]
