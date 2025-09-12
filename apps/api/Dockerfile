# Etapa 1: build
# Node.js version pinned for reproducible builds. Update as needed.
FROM node:20.12-alpine AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Etapa 2: produção
# Keep in sync with the builder stage above.
FROM node:20.12-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
RUN addgroup app && adduser -S -G app app
EXPOSE 4000
USER app
CMD ["npm", "start"]
