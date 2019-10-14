FROM ubuntu:16.04

RUN apt-get -yq update
RUN apt-get install -y build-essential
RUN apt-get install -y curl

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash
RUN apt-get install -y nodejs

RUN npm install -g forgae

ENV DOCKER_CHANNEL stable
ENV DOCKER_VERSION 17.03.1-ce
ENV DOCKER_API_VERSION 1.27
RUN curl -fsSL "https://download.docker.com/linux/static/${DOCKER_CHANNEL}/x86_64/docker-${DOCKER_VERSION}.tgz" \
  | tar -xzC /usr/local/bin --strip=1 docker/docker

