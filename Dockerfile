FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/node_modules ./node_modules

RUN npm prune --omit=dev

USER node

EXPOSE 3000

CMD ["node", "server.js"]
