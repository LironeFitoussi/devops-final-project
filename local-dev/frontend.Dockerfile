# Dev-only image for local-dev/docker-compose.yml. The frontend has no
# Dockerfile of its own — per docs/lab/stage-1.md it ships as a static
# build to S3/CloudFront in prod, mirrored here via nginx for local parity.
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=local-dev nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
