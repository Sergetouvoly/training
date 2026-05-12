# ── 1. deps ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.3 --activate

# Copier les manifestes workspace d'abord (cache layer)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/domain/package.json   packages/domain/
COPY packages/db/package.json       packages/db/
COPY packages/crypto/package.json   packages/crypto/
COPY apps/api/package.json          apps/api/

RUN pnpm install --frozen-lockfile --filter @elearning/api...

# ── 2. build ──────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

COPY packages/tsconfig  packages/tsconfig
COPY packages/domain    packages/domain
COPY packages/db        packages/db
COPY packages/crypto    packages/crypto
COPY apps/api           apps/api

# Générer le client Prisma
RUN pnpm --filter @elearning/db exec prisma generate

# Compiler NestJS
RUN pnpm --filter @elearning/api build

# ── 3. runtime ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.3 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/domain/package.json   packages/domain/
COPY packages/db/package.json       packages/db/
COPY packages/crypto/package.json   packages/crypto/
COPY apps/api/package.json          apps/api/

RUN pnpm install --frozen-lockfile --filter @elearning/api... --prod

# Résultat de la compilation + Prisma schema pour migrate
COPY --from=build /app/apps/api/dist          apps/api/dist
COPY --from=build /app/packages/db/prisma     packages/db/prisma
COPY --from=build /app/node_modules/.prisma   node_modules/.prisma

# Utilisateur non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

# Migrer puis démarrer
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma && node apps/api/dist/main.js"]
