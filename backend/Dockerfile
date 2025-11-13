FROM node:18-alpine

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

WORKDIR /app

# Copy package files for dependency resolution
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --no-audit --no-fund --prefer-offline

# Copy backend source
COPY . .

EXPOSE 3000

CMD ["npm", "start"]

