# ── Stage 1: Install dependencies ─────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace root files needed for install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package first, then Next.js
RUN cd packages/shared && pnpm build || true
RUN cd apps/web && pnpm build

# ── Stage 3: Production ──────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nerva && \
    adduser --system --uid 1001 --ingroup nerva nerva

# Copy Next.js standalone output
COPY --from=build --chown=nerva:nerva /app/apps/web/.next/standalone ./
COPY --from=build --chown=nerva:nerva /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nerva:nerva /app/apps/web/public ./apps/web/public

USER nerva

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["dumb-init", "node", "apps/web/server.js"]
