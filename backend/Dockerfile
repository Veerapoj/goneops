FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssh-client
COPY package.json package-lock.json ./
RUN npm ci --production
COPY src/ ./src/
EXPOSE 4000
CMD ["node", "src/server.js"]
