FROM node:22 AS builder

WORKDIR /app

COPY package.json bun.lock* package-lock* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DB_PATH=/data/mannru.db

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output

VOLUME /data
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
