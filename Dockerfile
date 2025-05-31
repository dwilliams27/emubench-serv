FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm i --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 8080

ENTRYPOINT ["node", "dist/index.js"]
