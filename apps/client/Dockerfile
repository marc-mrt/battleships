FROM node:24.11.0-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY packages/game-messages/package.json packages/game-messages/
COPY packages/game-rules/package.json packages/game-rules/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/client/node_modules ./apps/client/node_modules
COPY --from=deps /app/packages/game-messages/node_modules ./packages/game-messages/node_modules
COPY --from=deps /app/packages/game-rules/node_modules ./packages/game-rules/node_modules
COPY . .
RUN pnpm --filter ./apps/client build

FROM nginx:alpine AS runner
COPY --from=build /app/apps/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
