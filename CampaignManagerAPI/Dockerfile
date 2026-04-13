FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts
COPY docker ./docker

RUN npm run build

ENV PGHOST=postgres
ENV PGPORT=5432
ENV PGUSER=postgres

RUN chmod +x docker/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "/app/docker/entrypoint.sh"]
