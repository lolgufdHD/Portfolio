FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY backend ./backend
COPY frontend ./frontend   # optional, if you want to bundle static content

EXPOSE 3000

CMD ["npm", "start"]
