FROM mmdevpr.tnis.com:7443/mymo-node-base:1.0.1
LABEL maintainer="MobiLife International"

RUN mkdir -p /app
WORKDIR /app

COPY . /app

EXPOSE 3000
CMD ["npm", "run", "js-start"]
