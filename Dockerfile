# syntax=docker/dockerfile:1.7
#
# Pencil web app (tenant accounting): Next.js standalone server, non-root, no secrets baked in.
# Runtime configuration (SESSION_SECRET, PENCIL_API_URL, ...) is injected by the
# deployment (pencil_backend/deploy). Missing values make the server fail fast.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

FROM deps AS build
COPY . .
# src/lib/env.ts validates at import time, which also happens during
# `next build`. These are deliberately NON-secret placeholders scoped to this
# stage only; they do not exist in the runtime image.
ENV NEXT_TELEMETRY_DISABLED=1 \
    PENCIL_API_URL=http://api.invalid/api/v1 \
    SESSION_SECRET=example-build-placeholder-not-a-secret \
    COOKIE_SECURE=true
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
CMD ["node", "server.js"]
