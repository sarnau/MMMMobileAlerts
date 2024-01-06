FROM node:lts-alpine
COPY ../maserver /maserver
RUN apk update &&\
    apk upgrade &&\
    apk add --no-cache bash &&\
    npm install /maserver

ENTRYPOINT node /maserver/mobilealerts.js
WORKDIR /maserver

