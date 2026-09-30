FROM node:22-bookworm-slim
WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --prefix server --omit=dev
COPY server/src ./server/src
COPY src/types ./src/types
COPY src/lib ./src/lib
COPY src/data/communes.ts ./src/data/communes.ts
ENV NODE_ENV=production PORT=3001 HOST=0.0.0.0 DATABASE_PATH=/data/liked.sqlite UPLOAD_DIR=/data/uploads
EXPOSE 3001
WORKDIR /app/server
CMD ["npm", "start"]
