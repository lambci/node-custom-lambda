#!/bin/sh

export NODE_VERSION=11.4.0

LAYER_VERSION=$(aws lambda publish-layer-version --layer-name nodejs11 --zip-file fileb://layer.zip \
  --description "Node.js v${NODE_VERSION} custom runtime" --query Version --output text)

aws lambda add-layer-version-permission --layer-name nodejs11 --version-number $LAYER_VERSION \
  --statement-id sid1 --action lambda:GetLayerVersion --principal '*'
