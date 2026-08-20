# BOBA Bear local Docker runtime (IMP-005A, customer-auth stages IMP-009,
# workforce-auth stages IMP-010, customer-commerce stages IMP-024).
#
# Produces four independent images from one file:
#   - `tooling`                — Node + repo scripts + Drizzle migrations,
#                                 used only by one-shot Compose services
#                                 (migrate/db-check/*).
#   - `customer-auth-runtime`  — compiled customer-auth HTTP service (see
#                                 `docker/nginx/nginx.conf`'s proxy and the
#                                 `customer-auth` Compose service). Production
#                                 dependencies and compiled JavaScript only —
#                                 no TypeScript source, no tests, no `tsx`,
#                                 no migration credentials, no `.env` file.
#   - `workforce-auth-runtime` — compiled workforce-auth HTTP service (see
#                                 `docker/nginx/nginx.conf`'s proxy and the
#                                 `workforce-auth` Compose service). Same
#                                 production-only constraints as
#                                 `customer-auth-runtime`; never receives
#                                 customer-auth or migration credentials.
#   - `web-runtime`            — the final default target: static Nginx
#                                 serving the Next.js `output: "export"`
#                                 bundle. No Node, no npm, no source, no
#                                 database credentials.
#
# The static export architecture (next.config.ts `output: "export"`) is
# preserved end to end: `builder` only ever runs `next build`, never starts
# a Next.js server, and never touches PostgreSQL.

ARG NODE_IMAGE=docker.io/library/node:22.23.1-bookworm-slim
ARG NGINX_IMAGE=docker.io/library/nginx:1.30.4-alpine3.24

# ── base ─────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── dependencies ─────────────────────────────────────────────────────────
# Copied and installed before any other repository file so this layer is
# cached across builds that only change application source.
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ──────────────────────────────────────────────────────────────
# Runs the real production build (`next build --webpack`) and nothing else.
# Only public, non-secret build-time values are accepted as ARGs — no
# database URL is ever accepted here.
FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL="https://thebobabear.in"
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=""
ARG BOBA_BEAR_IMAGE_RELEASE="local-docker"
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID} \
    NODE_ENV=production
RUN groupadd --system --gid 1001 nextbuild \
  && useradd --system --uid 1001 --gid nextbuild --home-dir /app nextbuild \
  && chown nextbuild:nextbuild /app
COPY --from=dependencies --chown=nextbuild:nextbuild /app/node_modules ./node_modules
COPY --chown=nextbuild:nextbuild package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs ./
COPY --chown=nextbuild:nextbuild public ./public
COPY --chown=nextbuild:nextbuild src ./src
USER nextbuild
RUN npm run build \
  && test -f out/index.html \
  && test -f out/404.html \
  && test -f out/privacy/index.html \
  && test -f out/login/index.html \
  && test -f out/workforce/login/index.html \
  && test -d out/_next

# ── tooling ──────────────────────────────────────────────────────────────
# Used only by one-shot Compose services under the `tools` profile
# (migrate / db-check / db-check-migration). Never the default target,
# never started automatically, never exposes a port. Receives runtime
# database credentials only via ignored env files passed at `docker compose
# run` time — none are baked into this image.
FROM base AS tooling
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle
COPY scripts/database ./scripts/database
COPY scripts/menu ./scripts/menu
COPY scripts/assortment ./scripts/assortment
COPY scripts/pricing ./scripts/pricing
COPY scripts/catalog ./scripts/catalog
COPY scripts/check-config.ts ./scripts/check-config.ts
COPY data/platform/imports ./data/platform/imports
COPY data/platform/pricing ./data/platform/pricing
COPY data/platform/catalog ./data/platform/catalog
COPY public/assets/menu ./public/assets/menu
USER node

# ── customer-auth-builder ────────────────────────────────────────────────
# Compiles `src/server/customer-auth/main.ts` and everything it imports to
# plain ESM JavaScript (`scripts/customer-auth/build.mjs` — `tsc` followed by
# a specifier-rewrite pass, since `tsc` never resolves the `@/*` path alias
# or adds `.js` extensions at emit time). Uses the full `dependencies` layer
# (including the `typescript` devDependency) — discarded after this stage;
# none of it reaches `customer-auth-runtime`.
FROM dependencies AS customer-auth-builder
COPY tsconfig.json tsconfig.customer-auth.json ./
COPY scripts/customer-auth ./scripts/customer-auth
COPY src ./src
RUN npm run customer-auth:build

# ── customer-auth-dependencies ───────────────────────────────────────────
# Production-only install for the customer-auth runtime image — no
# `typescript`, `tsx`, `vitest`, `playwright`, `eslint`, or other
# devDependency reaches `customer-auth-runtime`.
FROM base AS customer-auth-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── customer-auth-runtime ─────────────────────────────────────────────────
# Compiled output only — no TypeScript source, no tests, no `tsx`, no
# migration credentials, no `.env` file. Never the default target; only
# reachable via `docker compose build customer-auth` / `target:
# customer-auth-runtime` (see compose.yaml). Never publishes a host port —
# only Nginx's `/api/customer-auth/` proxy (docker/nginx/nginx.conf) reaches
# this service, over the Compose-internal network on port 8081.
FROM base AS customer-auth-runtime
ENV NODE_ENV=production
COPY --from=customer-auth-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=customer-auth-builder --chown=node:node /app/dist-customer-auth ./dist-customer-auth

# npm/npx/corepack are never invoked at runtime (the CMD below calls `node`
# directly) — removing them shrinks the image and its attack surface.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

USER node
EXPOSE 8081

CMD ["node", "--conditions=react-server", "dist-customer-auth/server/customer-auth/main.js"]

# ── workforce-auth-builder ───────────────────────────────────────────────
# Compiles `src/server/workforce-auth/main.ts` and everything it imports to
# plain ESM JavaScript (`scripts/workforce-auth/build.mjs` — `tsc` followed
# by a specifier-rewrite pass, since `tsc` never resolves the `@/*` path
# alias or adds `.js` extensions at emit time). Uses the full
# `dependencies` layer (including the `typescript` devDependency) —
# discarded after this stage; none of it reaches `workforce-auth-runtime`.
FROM dependencies AS workforce-auth-builder
COPY tsconfig.json tsconfig.workforce-auth.json ./
COPY scripts/workforce-auth ./scripts/workforce-auth
COPY src ./src
RUN npm run workforce-auth:build

# ── workforce-auth-dependencies ──────────────────────────────────────────
# Production-only install for the workforce-auth runtime image — no
# `typescript`, `tsx`, `vitest`, `playwright`, `eslint`, or other
# devDependency reaches `workforce-auth-runtime`.
FROM base AS workforce-auth-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── workforce-auth-runtime ───────────────────────────────────────────────
# Compiled output only — no TypeScript source, no tests, no `tsx`, no
# migration credentials, no customer-auth secrets, no `.env` file. Never
# the default target; only reachable via `docker compose build
# workforce-auth` / `target: workforce-auth-runtime` (see compose.yaml).
# Never publishes a host port — only Nginx's `/api/workforce-auth/` proxy
# (docker/nginx/nginx.conf) reaches this service, over the Compose-internal
# network on port 8082.
FROM base AS workforce-auth-runtime
ENV NODE_ENV=production
COPY --from=workforce-auth-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=workforce-auth-builder --chown=node:node /app/dist-workforce-auth ./dist-workforce-auth

# npm/npx/corepack are never invoked at runtime (the CMD below calls `node`
# directly) — removing them shrinks the image and its attack surface.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

USER node
EXPOSE 8082

CMD ["node", "--conditions=react-server", "dist-workforce-auth/server/workforce-auth/main.js"]

# ── customer-commerce-builder ────────────────────────────────────────────
# Compiles `src/server/customer-commerce/main.ts` and everything it imports
# to plain ESM JavaScript (`scripts/customer-commerce/build.mjs`).
FROM dependencies AS customer-commerce-builder
COPY tsconfig.json tsconfig.customer-commerce.json ./
COPY scripts/customer-commerce ./scripts/customer-commerce
COPY src ./src
RUN npm run customer-commerce:build

# ── customer-commerce-dependencies ───────────────────────────────────────
FROM base AS customer-commerce-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── customer-commerce-runtime ────────────────────────────────────────────
# Thin customer ordering transport façade (IMP-024 / D-359). Internal port
# 8083 only — Nginx `/api/v1/` proxy reaches it; never a published host port.
FROM base AS customer-commerce-runtime
ENV NODE_ENV=production
COPY --from=customer-commerce-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=customer-commerce-builder --chown=node:node /app/dist-customer-commerce ./dist-customer-commerce

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

USER node
EXPOSE 8083

CMD ["node", "--conditions=react-server", "dist-customer-commerce/server/customer-commerce/main.js"]

# ── web-runtime ──────────────────────────────────────────────────────────
# Final default target. Static Nginx only — no Node, npm, or application
# source. The static app has no runtime database connection: database
# connectivity is proven separately, from the `tooling` image, by the
# db-check / db-check-migration Compose services.
FROM ${NGINX_IMAGE} AS web-runtime

RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/out /usr/share/nginx/html

# The image's built-in "nginx" user (uid 101) already owns
# /var/cache/nginx, /var/log/nginx, and /var/run; the html root is the only
# additional path this read-only, non-root runtime needs owned. Nginx's own
# writable paths (pid file, temp dirs) all live under /tmp — a fresh tmpfs
# mount at container runtime (see compose.yaml `app` service) — so nothing
# under /tmp needs to be prepared or chowned at build time.
RUN chown -R nginx:nginx /usr/share/nginx/html \
  && chmod -R a+rX /usr/share/nginx/html

USER nginx
EXPOSE 8080
STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
