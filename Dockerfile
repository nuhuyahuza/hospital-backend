# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL and other build dependencies
RUN apk add --no-cache openssl openssl-dev

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm ci
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install OpenSSL
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma

# Create node_modules with correct permissions
RUN mkdir -p node_modules && chown -R node:node .
USER node

RUN npm ci --omit=dev --ignore-scripts
RUN npx prisma generate

COPY --from=builder --chown=node:node /app/dist ./dist
COPY .env.example ./.env

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]