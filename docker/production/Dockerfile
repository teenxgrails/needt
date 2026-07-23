# Build stage
FROM node:22-alpine3.19 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci --legacy-peer-deps
RUN npx prisma generate

# Copy source
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine3.19 AS runner
# Install netcat and jq for JSON manipulation
RUN apk add --no-cache netcat-openbsd jq python3 make g++

WORKDIR /app

# Create the runtime user before copying so ownership is assigned while layers
# are created instead of recursively rewriting the entire dependency tree.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Install production dependencies
COPY --chown=nextjs:nodejs --from=builder /app/package*.json ./
RUN npm ci --only=production --legacy-peer-deps --ignore-scripts

# Copy built application
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nextjs:nodejs --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=nextjs:nodejs --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Start the application
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
