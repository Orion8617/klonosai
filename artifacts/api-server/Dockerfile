FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN npm install -g pnpm@10 && \
    pnpm install --frozen-lockfile && \
    pnpm --filter @workspace/api-server run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S klonos -u 1001

COPY --from=builder --chown=klonos:nodejs /app/artifacts/api-server/dist ./dist
COPY --from=builder --chown=klonos:nodejs /app/node_modules ./node_modules

USER klonos
EXPOSE 8080
ENV NODE_ENV=production PORT=8080

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
