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

# On récupère le build NestJS et le client Prisma généré
COPY --from=builder /app/dist ./dist
COPY --from=builder /node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "dist/main"]