# syntax=docker/dockerfile:1

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV PORT=3001 \
    SPRING_BOOT_URL=http://backend:8080

EXPOSE 3001

CMD ["npm", "start"]
