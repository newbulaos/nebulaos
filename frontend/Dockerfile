FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable pnpm

FROM base AS dev
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install
CMD ["pnpm", "dev"]

FROM base AS builder
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
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
