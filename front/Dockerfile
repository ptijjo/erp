FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_BASE_URL=http://localhost:8686
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

RUN npm run build

EXPOSE 3005

CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3005"]
