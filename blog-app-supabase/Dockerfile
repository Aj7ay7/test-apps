# Build stage (Debian so Prisma gets OpenSSL 3; Alpine musl would need libssl.so.1.1)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
# Ensure public exists (project may have no top-level public folder)
RUN mkdir -p public
RUN npm run build

# Production stage (Debian slim: Prisma engine + OpenSSL)
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma schema engine requires OpenSSL
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd -r -g 1001 nodejs && useradd -r -u 1001 -g nodejs nextjs

# Copy standalone build and Prisma client (do NOT run npm install here or we lose "next")
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Isolated db-tools for migrations/seed only (so we don't prune standalone node_modules)
RUN mkdir -p /app/db-tools
COPY --from=builder /app/prisma /app/db-tools/prisma
RUN echo '{"name":"db-tools","private":true,"prisma":{"seed":"npx tsx prisma/seed.ts"},"dependencies":{"@prisma/client":"5.22.0","prisma":"5","tsx":"^4.19.0"}}' > /app/db-tools/package.json
RUN cd /app/db-tools && npm install
COPY --from=builder /app/node_modules/.prisma /app/db-tools/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/db-tools/node_modules/@prisma

# Entrypoint must be copied and chmod'd as root (before USER nextjs)
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# nextjs must own /app so prisma in db-tools can write engine binaries at runtime
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENTRYPOINT ["./docker-entrypoint.sh"]
