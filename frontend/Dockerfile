FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency resolution
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY . .

# Generate production build
RUN npm run build

# Production stage - serve with lightweight server
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve globally for serving static files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Serve the built files
CMD ["serve", "-s", "dist", "-l", "3000"]

