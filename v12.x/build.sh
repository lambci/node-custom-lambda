#!/bin/sh

export NODE_VERSION=12.12.0

docker build --build-arg NODE_VERSION -t node-provided-lambda-v12.x .
docker run --rm node-provided-lambda-v12.x cat /tmp/node-v${NODE_VERSION}.zip > ./layer.zip
