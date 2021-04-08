#!/bin/sh

rm -rf layer && unzip layer.zip -d layer

LOADER_TYPE="commonjs"
case "$1" in
 module) LOADER_TYPE=$1 ;;
 commonjs) LOADER_TYPE=$1 ;;
esac

echo Testing test/$LOADER_TYPE
cd test/$LOADER_TYPE

npm ci

# Create zipfile for uploading to Lambda – we don't use this here
rm -f lambda.zip && zip -qyr lambda.zip index.js data.json node_modules

docker run --rm -v "$PWD":/var/task -v "$PWD"/../../layer:/opt -e NODE_MODULE_LOADER_TYPE=$LOADER_TYPE lambci/lambda:provided index.handler

docker run --rm -v "$PWD":/var/task -v "$PWD"/../../layer:/opt -e NODE_MODULE_LOADER_TYPE=$LOADER_TYPE lambci/lambda:provided index.handler2

docker run --rm -v "$PWD":/var/task -v "$PWD"/../../layer:/opt -e NODE_MODULE_LOADER_TYPE=$LOADER_TYPE lambci/lambda:provided index.handler3

docker run --rm -v "$PWD":/var/task -v "$PWD"/../../layer:/opt -e NODE_MODULE_LOADER_TYPE=$LOADER_TYPE lambci/lambda:provided index.handler4

docker run --rm -v "$PWD":/var/task -v "$PWD"/../../layer:/opt -e NODE_MODULE_LOADER_TYPE=$LOADER_TYPE lambci/lambda:provided index.handler5

docker run --rm -v "$PWD":/var/task -v "$PWD"/../../layer:/opt -e NODE_MODULE_LOADER_TYPE=$LOADER_TYPE lambci/lambda:provided index.handler6

docker run --rm -v "$PWD":/var/task -v "$PWD"/../../layer:/opt -e NODE_MODULE_LOADER_TYPE=$LOADER_TYPE lambci/lambda:provided index.handler7

docker run --rm -v "$PWD":/var/task -v "$PWD"/../../layer:/opt -e NODE_MODULE_LOADER_TYPE=invalid lambci/lambda:provided index.handler7
