FROM node:alpine

WORKDIR /app
RUN apk upgrade -U \
  && apk add ca-certificates ffmpeg libva-intel-driver \
  && rm -rf /var/cache/*

COPY package.json .
RUN npm install
COPY . .

EXPOSE 8000
EXPOSE 1935

CMD ["npm","start"]
