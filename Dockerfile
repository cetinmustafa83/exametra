FROM node:22-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm prisma generate && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 schulos && adduser --system --uid 1001 schulos

COPY --from=builder /app/public ./public
COPY --from=builder --chown=schulos:schulos /app/.next/standalone ./
COPY --from=builder --chown=schulos:schulos /app/.next/static ./.next/static
COPY --from=builder --chown=schulos:schulos /app/prisma ./prisma
COPY --from=builder --chown=schulos:schulos /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p /data/db /data/uploads /data/exports /data/backups && chown -R schulos:schulos /data

USER schulos
EXPOSE 3000

CMD ["node", "server.js"]
