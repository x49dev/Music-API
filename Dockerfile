FROM node:26-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src/ src/

RUN npm run build

FROM node:26-alpine AS production

RUN apk add --no-cache python3 make g++ yt-dlp

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY drizzle/ ./drizzle/

RUN chown -R appuser:appgroup /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
