# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Cloud Run sets PORT and expects the container to listen on it — server.ts
# already reads process.env.PORT and binds 0.0.0.0, so no override needed.
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
