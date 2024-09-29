FROM node:20 as builder

COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY ./ ./

RUN yarn backend:build

EXPOSE 3000

CMD ["yarn", "backend:prod"]

