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

CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3005"]
