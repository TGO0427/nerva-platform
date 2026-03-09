# ── Stage 1: Install dependencies ─────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace root files needed for install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package first, then API
RUN cd packages/shared && pnpm build || true
RUN cd apps/api && pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# ── Stage 3: Production ──────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nerva && \
    adduser --system --uid 1001 --ingroup nerva nerva

# Copy production node_modules from build stage
COPY --from=build --chown=nerva:nerva /app/node_modules ./node_modules
COPY --from=build --chown=nerva:nerva /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=nerva:nerva /app/packages/shared ./packages/shared

# Copy compiled output
COPY --from=build --chown=nerva:nerva /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nerva:nerva /app/apps/api/package.json ./apps/api/

USER nerva

EXPOSE 4000

ENV NODE_ENV=production
ENV API_PORT=4000

CMD ["dumb-init", "node", "apps/api/dist/main"]
