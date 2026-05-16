FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable pnpm

FROM base AS dev
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --ignore-scripts && pnpm rebuild esbuild sharp 2>/dev/null || true
CMD ["pnpm", "dev"]

FROM base AS builder
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm approve-builds --yes 2>/dev/null || true
RUN pnpm rebuild esbuild sharp 2>/dev/null || true
COPY . .
RUN pnpm build

FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN addgroup -S nebula && adduser -S nebula -G nebula
USER nebula
EXPOSE 3000
CMD ["node", "server.js"]
