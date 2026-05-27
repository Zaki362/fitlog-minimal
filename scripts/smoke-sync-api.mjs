import { Readable } from "node:stream";
import handler from "../api/sync.js";

function createRequest({ method, url = "/api/sync", body }) {
  const request = new Readable({
    read() {
      if (body === undefined) {
        this.push(null);
        return;
      }
      this.push(body);
      this.push(null);
    },
  });
  request.method = method;
  request.url = url;
  return request;
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(value = "") {
      this.body += value;
    },
    json() {
      return this.body ? JSON.parse(this.body) : null;
    },
  };
}

async function invoke(options) {
  const request = createRequest(options);
  const response = createResponse();
  await handler(request, response);
  return response;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const invalidGet = await invoke({ method: "GET", url: "/api/sync?syncId=nope" });
assert(invalidGet.statusCode === 400, "GET invalid syncId should return 400");
assert(invalidGet.json().message === "同步 ID 无效", "GET invalid syncId should explain error");

const health = await invoke({ method: "GET", url: "/api/sync?health=1" });
assert(health.statusCode === 503, "Health without Upstash env should return 503");
assert(health.json().configured === false, "Health should report missing storage config");

const options = await invoke({ method: "OPTIONS" });
assert(options.statusCode === 204, "OPTIONS should return 204");

const bufferBody = Buffer.from(JSON.stringify({ syncId: "nope", data: {} }));
const invalidPut = await invoke({ method: "PUT", body: bufferBody });
assert(invalidPut.statusCode === 400, "PUT invalid syncId should return 400 after parsing Buffer body");

const validBody = JSON.stringify({
  syncId: "a".repeat(64),
  data: {
    version: 1,
    exercises: [],
    sessions: [],
    progressUpdates: [],
  },
});
const missingEnv = await invoke({ method: "PUT", body: validBody });
assert(missingEnv.statusCode === 503, "PUT without Upstash env should return 503");
assert(
  String(missingEnv.json().message).includes("UPSTASH_REDIS_REST_URL"),
  "Missing env error should mention Upstash config",
);

console.log("sync api smoke ok");
