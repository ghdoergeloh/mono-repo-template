# syntax=docker/dockerfile:1
#
# One image for the API (with the built SPA on the same origin) and the
# database migrations.
#
#   docker build -t app .
#
# The API starts by default. Migrations run the CLI in the same image:
#
#   docker run --rm -e DATABASE_URL=… app node apps/cli/dist/index.js migrate
#
# tini runs as PID 1 for both commands. It passes SIGTERM on to Node.js, so a
# container stops at once instead of being killed after the grace period.
#
# Behind a proxy that inspects TLS, pass its CA certificate as a build secret.
# It is mounted only while dependencies are downloaded and is not part of any
# image layer:
#
#   docker build --secret id=ca,src=/path/to/ca.pem -t app .

# Node.js 24 on Debian bookworm, pinned by digest. Dependabot updates it.
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS node-base

FROM node-base AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    TURBO_TELEMETRY_DISABLED=1
# corepack installs the pnpm version from "packageManager" in package.json.
RUN corepack enable

# Reduce the monorepo to the apps in the image and their workspace
# dependencies. json/ holds only the package manifests, so the install layer
# below stays cached until a dependency changes.
FROM base AS pruner
WORKDIR /repo
COPY . .
RUN --mount=type=secret,id=ca \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    TURBO_VERSION=$(awk '/^importers:/{i=1} i&&/^      turbo:$/{getline; getline; print $2; exit}' pnpm-lock.yaml) && \
    test -n "$TURBO_VERSION" && \
    pnpm dlx "turbo@${TURBO_VERSION}" prune @repo/api @repo/react @repo/cli --docker

FROM base AS builder
WORKDIR /repo
COPY --from=pruner /repo/out/json/ ./
# Lifecycle scripts are skipped: the root scripts need git and a network
# download, and the native packages (esbuild, lightningcss, Tailwind oxide)
# ship as optional dependencies that need no install script.
RUN --mount=type=secret,id=ca \
    --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir=/pnpm/store
COPY --from=pruner /repo/out/full/ ./
RUN pnpm turbo run build --filter=@repo/api --filter=@repo/react --filter=@repo/cli

# The API and the CLI are bundled by esbuild, so the runtime needs no
# node_modules. The CLI bundle carries the SQL migrations in dist/drizzle.
FROM node-base AS runner
RUN apt-get update && \
    apt-get install --yes --no-install-recommends tini && \
    rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    API_PORT=3000 \
    SPA_DIR=/app/apps/react/dist
WORKDIR /app
COPY --from=builder --chown=root:root /repo/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=root:root /repo/apps/react/dist ./apps/react/dist
COPY --from=builder --chown=root:root /repo/apps/cli/dist ./apps/cli/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.API_PORT}/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--enable-source-maps", "apps/api/dist/index.js"]
