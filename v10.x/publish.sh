#!/bin/sh

export NODE_VERSION=10.14.1

LAYER_VERSION=$(aws lambda publish-layer-version --layer-name nodejs10 --zip-file fileb://layer.zip \
  --description "Node.js v${NODE_VERSION} custom runtime" --query Version --output text)

aws lambda add-layer-version-permission --layer-name nodejs10 --version-number $LAYER_VERSION \
  --statement-id sid1 --action lambda:GetLayerVersion --principal '*'
