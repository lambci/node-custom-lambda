#!/bin/sh

rm -rf layer && unzip layer.zip -d layer

cd test

npm ci

# Create zipfile for uploading to Lambda – we don't use this here
rm -f lambda.zip && zip -qyr lambda.zip index.js node_modules

docker run --rm -v "$PWD":/var/task -v "$PWD"/../layer:/opt lambci/lambda:provided index.handler

docker run --rm -v "$PWD":/var/task -v "$PWD"/../layer:/opt lambci/lambda:provided index.handler2

docker run --rm -v "$PWD":/var/task -v "$PWD"/../layer:/opt lambci/lambda:provided index.handler3

docker run --rm -v "$PWD":/var/task -v "$PWD"/../layer:/opt lambci/lambda:provided index.handler4

docker run --rm -v "$PWD":/var/task -v "$PWD"/../layer:/opt lambci/lambda:provided index.handler5

docker run --rm -v "$PWD":/var/task -v "$PWD"/../layer:/opt lambci/lambda:provided index.handler6
