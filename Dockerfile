# Back To Eden: the whole product as one image.
#
# The NestJS API also serves the built React web app, so production is a single
# service with a single address (and a single volume for data). Used by Railway,
# which picks up a Dockerfile at the repo root automatically, and by
# docker-compose.yml for testing the same image locally.
#
# Node 24: the database layer uses the built-in node:sqlite module.

# ---- web app ---------------------------------------------------------------
FROM node:24-slim AS web
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY shared /src/shared
COPY frontend/ ./
RUN npm run build

# ---- API -------------------------------------------------------------------
FROM node:24-slim AS api
WORKDIR /src/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM node:24-slim
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=api /src/backend/dist ./dist
COPY --from=web /src/frontend/dist ./public

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /app/data && chown node:node /app/data

# Databases, photos and nightly snapshots. Mount a volume here (Railway: add a
# volume to the service with mount path /app/data).
VOLUME /app/data
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
