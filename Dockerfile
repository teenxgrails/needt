# Base stage for both development and production
FROM node:22-alpine3.19 AS base
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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
COPY package*.json ./
RUN npm ci --include=dev --legacy-peer-deps --ignore-scripts
COPY . .
RUN npm run prisma:generate
RUN npm run build:worker
RUN npm run build

# Worker stage - same image, runs the BullMQ worker instead of the web server.
# Coolify: set this service's "Docker Build Stage Target" to `worker`.
FROM base AS worker
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/worker ./dist/worker
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

# entrypoint.sh runs `exec "$@"`, so this CMD becomes the worker process.
CMD ["node", "dist/worker/index.js"]

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist/worker ./dist/worker
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
# Run the web service with the default command. In Coolify, create a second
# service from the same image and override its command with:
# node dist/worker/index.js
CMD ["node", "server.js"] 
