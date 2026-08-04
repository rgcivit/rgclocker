# Build stage for production-ready backend container
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose server port
EXPOSE 5000

# Run the API server
CMD ["npm", "start"]
