FROM node:20-alpine AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
# Set working directory
WORKDIR /app
RUN pnpm install -g turbo

# Copy monorepo
COPY . .
# Prune the workspace for the backend specifically
RUN turbo prune @vedix/backend --docker

FROM base AS installer
WORKDIR /app

# Install dependencies based on pruned lockfile
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=@vedix/backend

FROM base AS runner
WORKDIR /app

# Only copy what we need for production
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/services/backend/dist ./dist
COPY --from=installer /app/services/backend/package.json ./package.json

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/server.js"]
