FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache docker-cli docker-cli-compose
COPY package.json package-lock.json ./
RUN npm ci --production
COPY src/ ./src/
EXPOSE 4000
CMD ["node", "src/server.js"]
