FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 8686

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
