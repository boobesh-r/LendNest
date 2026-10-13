# ==============================================================
# LendNest Production Multi-Stage Dockerfile
# Node.js 22 is required for native node:sqlite engine
# ==============================================================

# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_API_BASE=/api
RUN npm run build

# Stage 2: Build Backend TypeScript
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_PATH=/app/database/lendnest.sqlite
ENV FRONTEND_DIST=/app/frontend/dist

# Install only production dependencies for the backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy compiled backend dist and frontend dist
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create database directory for persistent volume mount
RUN mkdir -p /app/database

# Expose HTTP port
EXPOSE 5000

# Volume mount point for SQLite database persistence
VOLUME ["/app/database"]

# Launch compiled backend server
CMD ["node", "dist/server.js"]
