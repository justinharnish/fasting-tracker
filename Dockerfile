FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ src/
COPY dashboard/ dashboard/
RUN mkdir -p data
EXPOSE 3456
CMD ["node", "src/app.js"]
