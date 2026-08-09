# Stage 1: Build the React application
FROM node:20-alpine as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Node.js server
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./

# Copy built React app from Stage 1 to server's public directory
# (Assuming Express is configured to serve static files from 'public' in production)
COPY --from=client-build /app/client/dist ./public

# Expose the API port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
