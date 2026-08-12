# Base stage for both development and production
FROM node:22-alpine3.19 AS base
WORKDIR /app
ARG SOURCE_COMMIT=local
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEEDT_BUILD_SHA=$SOURCE_COMMIT

# Install netcat
RUN apk add --no-cache netcat-openbsd

# Development stage
FROM base AS development
WORKDIR /app
ENV NODE_ENV=development
COPY . .
COPY package*.json ./
RUN npm install --legacy-peer-deps --ignore-scripts
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Production builder stage
FROM base AS builder
WORKDIR /app
# Next.js type checking can exceed Node's default ~2 GiB heap in Coolify's
# source build. Match the dedicated production Dockerfile's build allowance.
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY package*.json ./
RUN npm ci --include=dev --legacy-peer-deps --ignore-scripts
COPY . .
RUN npm run prisma:generate
RUN npm run build:worker
RUN npm run build:collaboration
RUN npm run build

# Runtime dependencies are installed from package-lock.json so the entrypoint
# always uses the project's Prisma 6 CLI. Without this layer, `npx prisma`
# downloads the latest major at container startup and can reject our schema.
FROM base AS runtime-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts
# `prisma migrate deploy` needs the schema engine. Lifecycle scripts are
# intentionally disabled above, so copy the engine downloaded by the builder's
# explicit `prisma generate` step instead of downloading into a read-only
# node_modules directory at container startup.
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
RUN test -x /app/node_modules/@prisma/engines/schema-engine-*

# Worker stage - same image, runs the BullMQ worker instead of the web server.
# Coolify: set this service's "Docker Build Stage Target" to `worker`.
FROM base AS worker
WORKDIR /app

ENV NODE_ENV=production

COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist/worker ./dist/worker
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh
USER node

# entrypoint.sh runs `exec "$@"`, so this CMD becomes the worker process.
CMD ["node", "dist/worker/index.js"]

# Collaboration stage - same image, runs the Hocuspocus collaboration server.
# Coolify: set this service's "Docker Build Stage Target" to `collaboration`.
FROM base AS collaboration
WORKDIR /app

ENV NODE_ENV=production

COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist/collaboration ./dist/collaboration
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh
USER node

EXPOSE 1234

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/collaboration/index.js"]

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist/worker ./dist/worker
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh
USER node

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
# Run the web service with the default command. In Coolify, create a second
# service from the same image and override its command with:
# node dist/worker/index.js
CMD ["node", "server.js"] 
