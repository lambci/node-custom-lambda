FROM lambci/lambda-base:build

COPY bootstrap.c bootstrap.js /opt/

ARG NODE_VERSION

RUN curl -sSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz | \
  tar -xJ -C /opt --strip-components 1 -- node-v${NODE_VERSION}-linux-x64/bin/node && \
  strip /opt/bin/node

RUN cd /opt && \
  export NODE_MAJOR=$(echo $NODE_VERSION | awk -F. '{print "\""$1"\""}') && \
  clang -Wall -Werror -s -O2 -D NODE_MAJOR="$NODE_MAJOR" -o bootstrap bootstrap.c && \
  rm bootstrap.c && \
  zip -yr /tmp/layer.zip .
