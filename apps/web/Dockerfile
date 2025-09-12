# Etapa 1: build
# Node.js version pinned for reproducible builds. Update as needed.
FROM node:20.12-bullseye AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Etapa 2: produção
# Keep in sync with the builder stage above.
FROM node:20.12-bullseye
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
RUN groupadd --system app && useradd --system --gid app app
EXPOSE 3000
USER app
CMD ["npm", "start"]
