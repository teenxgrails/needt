"use strict";

// Node 26 removed the deprecated SlowBuffer export. A transitive Google Auth
// dependency still reads SlowBuffer.prototype while loading, so keep the test
// runner compatible with newer local Node versions. Production and CI remain
// pinned to the supported Node 22 line.
const nodeBuffer = require("node:buffer");

if (!nodeBuffer.SlowBuffer) {
  nodeBuffer.SlowBuffer = nodeBuffer.Buffer;
}
