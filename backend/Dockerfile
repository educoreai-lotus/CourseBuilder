FROM node:20-alpine

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

WORKDIR /app

# Copy package files for dependency resolution
COPY package*.json ./

# Install dependencies
# Use npm install instead of npm ci for better Railway compatibility
RUN npm install --omit=dev --no-audit --no-fund --legacy-peer-deps || npm install --production --no-audit --no-fund

# Copy backend source
COPY . .

EXPOSE 3000

# Use node directly instead of npm start for better Railway compatibility
CMD ["node", "server.js"]

