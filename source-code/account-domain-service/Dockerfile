FROM node:10

WORKDIR /app/main/
COPY package.json /app/main/
RUN npm install

COPY index.js /app/main

ARG SERVICE_VERSION
ENV SERVICE_VERSION=${SERVICE_VERSION}

CMD [ "npm", "start" ]