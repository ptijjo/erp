# Pin mineur 22.22 (Prisma exige Node ≥ 22.12 ; aligné avec le front).
FROM node:22.22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# URL factice : prisma.config.ts exige DATABASE_URL au moment du `generate`.
ARG DATABASE_URL="postgresql://prisma:prisma@127.0.0.1:5432/prisma"
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# --- Runtime ---
FROM node:22.22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Coolify / docker-compose peuvent surcharger PORT.
ENV PORT=3000

# URL factice pour `prisma generate` au build image (la vraie URL est injectée au runtime).
ARG DATABASE_URL="postgresql://prisma:prisma@127.0.0.1:5432/prisma"
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY docker-entrypoint.sh ./

# Déps prod + CLI Prisma (devDependency) pour `migrate deploy` au démarrage.
RUN npm ci --omit=dev \
  && npm install prisma@7.8.0 @prisma/config@7.8.0 --omit=dev --no-save \
  && npx prisma generate \
  && chmod +x docker-entrypoint.sh

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated

EXPOSE 3000

# Pas de curl/wget : healthcheck Node sur PORT (Coolify peut le changer).
# start-period élevé : migrate + seed Nest au boot.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD node -e "const p=process.env.PORT||'3000';require('http').get('http://127.0.0.1:'+p+'/',(r)=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
