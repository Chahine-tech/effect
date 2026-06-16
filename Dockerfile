FROM node:22-alpine AS base
RUN corepack enable

# Install dependencies for api and its workspace deps (contract)
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/contract/package.json ./packages/contract/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile

# pnpm deploy creates a flat production bundle:
# - resolves @myapp/contract from the workspace (copies its src/ alongside its node_modules)
# - produces /app/production with all prod deps and no symlinks
FROM deps AS deploy
COPY packages/contract/src ./packages/contract/src
COPY packages/api/src ./packages/api/src
RUN pnpm deploy --filter @myapp/api --prod /app/production

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app
COPY --from=deploy /app/production .
EXPOSE 3000
ENV NODE_ENV=production
# tsx is a production dep — handles TypeScript imports at runtime (same as dev)
CMD ["node", "--import", "tsx/esm", "src/interface/server.ts"]
