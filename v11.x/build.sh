#!/bin/sh

export NODE_VERSION=11.3.0

docker build --build-arg NODE_VERSION -t node-provided-lambda-v11.x .
docker run --rm node-provided-lambda-v11.x cat /tmp/node-v${NODE_VERSION}.zip > ./layer.zip
