FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

FROM base AS build
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/tsconfig.json ./apps/server/
COPY apps/server/src ./apps/server/src
COPY packages/game-rules/package.json packages/game-rules/tsconfig.json packages/game-rules/tsconfig.build.json ./packages/game-rules/
COPY packages/game-rules/src ./packages/game-rules/src
COPY packages/game-messages/package.json packages/game-messages/tsconfig.json packages/game-messages/tsconfig.build.json ./packages/game-messages/
COPY packages/game-messages/src ./packages/game-messages/src
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build
RUN pnpm deploy --filter ./apps/server --prod /prod/server

FROM base AS server
COPY --from=build /prod/server /prod/server
WORKDIR /prod/server
EXPOSE 3000
CMD [ "pnpm", "start" ]
