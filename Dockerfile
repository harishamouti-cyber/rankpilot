# syntax=docker/dockerfile:1

# ------------------------------------------------------------------------------
# Stage 1: Base Alpine image with Node 20 & OpenSSL for Prisma
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

RUN apk add --no-cache openssl libc6-compat ca-certificates

WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Install dependencies
# ------------------------------------------------------------------------------
FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# ------------------------------------------------------------------------------
# Stage 3: Build application
# ------------------------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# ------------------------------------------------------------------------------
# Stage 4: Production Runner
# ------------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/data/rankpilot.sqlite"

WORKDIR /app

# Create dedicated persistent storage mount directory for SQLite
RUN mkdir -p /data && chown -R node:node /data

# Copy artifacts from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/docker-entrypoint.sh ./docker-entrypoint.sh

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
