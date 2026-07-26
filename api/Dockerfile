# --- Étape de Build ---
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Installation des dépendances nécessaires pour Prisma / l'architecture
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

# Installation propre des dépendances
RUN npm ci

COPY . .

# Génération du client Prisma et build de NestJS
RUN npx prisma generate
RUN npm run build

# --- Étape de Runtime ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# On n'installe que les dépendances de production
RUN npm ci --only=production

# On régénère le client Prisma spécifiquement pour la prod
RUN npx prisma generate

# On récupère le build NestJS et le client Prisma généré
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Vérifie toutes les 30s que l'API répond 200 sur l'endpoint choisi (ex: /)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]