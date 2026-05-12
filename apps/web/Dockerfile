# ── 1. deps ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.3 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/i18n/package.json     packages/i18n/
COPY packages/ui/package.json       packages/ui/
COPY packages/api-client/package.json packages/api-client/
COPY apps/web/package.json          apps/web/

RUN pnpm install --frozen-lockfile --filter @elearning/web...

# ── 2. build ──────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY packages/tsconfig    packages/tsconfig
COPY packages/i18n        packages/i18n
COPY packages/ui          packages/ui
COPY packages/api-client  packages/api-client
COPY apps/web             apps/web

ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG API_URL

ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV API_URL=$API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @elearning/web build

# ── 3. runtime ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/apps/web/.next/standalone  ./
COPY --from=build /app/apps/web/.next/static      apps/web/.next/static
COPY --from=build /app/apps/web/public            apps/web/public

USER appuser
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
