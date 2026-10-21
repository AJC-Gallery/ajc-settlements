import { createServer } from "node:http";
import { readCommit, readPort } from "./config/env.js";

// Phase 0 placeholder so dev has something to deploy and smoke-test.
// The backend agent replaces this with the NestJS bootstrap in Phase 1.
const commit = readCommit();

const server = createServer((req, res) => {
  if (req.url === "/health/live") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", commit }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ code: "NOT_FOUND" }));
});

server.listen(readPort());
