FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD npm run host
EXPOSE 5173