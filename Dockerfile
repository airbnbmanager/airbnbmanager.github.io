FROM node:20-alpine

WORKDIR /app

COPY whatsapp-bot/package*.json ./
RUN npm install --omit=dev

COPY whatsapp-bot/ ./

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "start"]
