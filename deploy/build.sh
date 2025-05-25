#!/bin/bash

VERSION=$(jq -r '.version' package.json)

docker build -t gcr.io/emubench-459802/emubench-serv:$VERSION --no-cache -t gcr.io/emubench-459802/emubench-serv:latest . && \
docker push gcr.io/emubench-459802/emubench-serv:$VERSION && \
docker push gcr.io/emubench-459802/emubench-serv:latest
