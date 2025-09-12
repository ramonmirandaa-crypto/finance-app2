# Etapa 1: build
# Node.js version pinned for reproducible builds. Update as needed.
FROM node:20.12-alpine AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# Etapa 2: produção
# Keep in sync with the builder stage above.
FROM node:20.12-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start"]
