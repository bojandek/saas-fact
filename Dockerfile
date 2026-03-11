# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY blocks ./blocks
COPY packages ./packages
COPY apps/saas-001-booking ./apps/saas-001-booking

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build monorepo
RUN pnpm --filter=@saas-factory/auth build
RUN pnpm --filter=@saas-factory/database build
RUN pnpm --filter=@saas-factory/payments build
RUN pnpm --filter=@saas-factory/emails build
RUN pnpm --filter=saas-001-booking build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built app from builder
COPY --from=builder /app/apps/saas-001-booking/.next ./.next
COPY --from=builder /app/apps/saas-001-booking/public ./public
COPY --from=builder /app/apps/saas-001-booking/package.json ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["pnpm", "start"]
