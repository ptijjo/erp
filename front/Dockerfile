# Pin mineur 22.22 (correctifs CVE Node) plutôt que le floating tag 22-bookworm-slim.
FROM node:22.22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get upgrade -y \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_BASE_URL=http://localhost:8686
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

ARG NEXT_PUBLIC_JWT_ACCESS_EXPIRES_SECONDS=3600
ENV NEXT_PUBLIC_JWT_ACCESS_EXPIRES_SECONDS=${NEXT_PUBLIC_JWT_ACCESS_EXPIRES_SECONDS}

RUN npm run build

EXPOSE 3005

# Coolify lit le HEALTHCHECK du Dockerfile (pas besoin de curl/wget).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3005/',(r)=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3005"]
