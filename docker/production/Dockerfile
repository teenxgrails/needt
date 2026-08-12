# Build stage
FROM node:22-alpine3.19 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json .npmrc ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci
RUN npx prisma generate

# Copy source
COPY . .

# Build application
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build
RUN npm run build:worker
RUN npm run build:collaboration
RUN npm run check:collaboration-runtime && test -s dist/collaboration/index.mjs

# Production stage
FROM node:22-alpine3.19 AS runner
ARG NEEDT_BUILD_SHA=local
# Install netcat and jq for JSON manipulation
RUN apk add --no-cache netcat-openbsd jq python3 make g++

WORKDIR /app

# Create the runtime user before copying so ownership is assigned while layers
# are created instead of recursively rewriting the entire dependency tree.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN chown nextjs:nodejs /app

# Install production dependencies
COPY --chown=nextjs:nodejs --from=builder /app/package*.json /app/.npmrc ./
USER nextjs
RUN npm ci --omit=dev --ignore-scripts

# Copy built application
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/dist ./dist
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nextjs:nodejs --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=nextjs:nodejs --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
RUN test -x /app/node_modules/@prisma/engines/schema-engine-*
COPY --chown=nextjs:nodejs --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 3000 1234

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEEDT_BUILD_SHA=$NEEDT_BUILD_SHA

# Start the application
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
