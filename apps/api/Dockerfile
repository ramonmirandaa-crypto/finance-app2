# Etapa 1: build
FROM node:20-alpine AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Etapa 2: produção
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 4000
CMD ["npm", "start"]
