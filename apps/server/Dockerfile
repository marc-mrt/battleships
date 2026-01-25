FROM node:24.11.0-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/game-messages/package.json packages/game-messages/
COPY packages/game-rules/package.json packages/game-rules/
RUN pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/game-messages/node_modules ./packages/game-messages/node_modules
COPY --from=deps /app/packages/game-rules/node_modules ./packages/game-rules/node_modules
COPY apps/server ./apps/server
COPY packages/game-messages ./packages/game-messages
COPY packages/game-rules ./packages/game-rules
COPY tsconfig.base.json ./
EXPOSE 3000
ARG DATABASE_CONNECTION_STRING
ARG JWT_SECRET
ARG ALLOWED_ORIGINS
ENV DATABASE_CONNECTION_STRING=$DATABASE_CONNECTION_STRING
ENV JWT_SECRET=$JWT_SECRET
ENV ALLOWED_ORIGINS=$ALLOWED_ORIGINS
WORKDIR /app/apps/server
CMD ["npx", "tsx", "src/index.ts"]
