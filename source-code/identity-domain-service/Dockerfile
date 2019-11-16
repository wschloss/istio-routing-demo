FROM node:10

WORKDIR /app/main/
RUN mkdir /app/main/data/
COPY package.json /app/main/
COPY data/ /app/main/data/
RUN npm install

COPY index.js /app/main

ARG SERVICE_VERSION
ENV SERVICE_VERSION=${SERVICE_VERSION}

CMD [ "npm", "start" ]