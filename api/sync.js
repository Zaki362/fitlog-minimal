import { Redis } from "@upstash/redis";

const KEY_PREFIX = "fitlog:minimal:v1:";
const MAX_BODY_BYTES = 1_000_000;

let redisClient = null;

function getRedisConfig() {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    return { url: upstashUrl, token: upstashToken, source: "upstash-rest" };
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    return { url: kvUrl, token: kvToken, source: "vercel-kv-rest" };
  }

  return null;
}

function hasRedisEnv() {
  return Boolean(getRedisConfig());
}

function getRedis() {
  if (redisClient) {
    return redisClient;
  }
  const config = getRedisConfig();
  if (!config) {
    throw new Error(
      "云存储未配置：缺少 UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN 或 KV_REST_API_URL/KV_REST_API_TOKEN",
    );
  }
  redisClient = new Redis({ url: config.url, token: config.token });
  return redisClient;
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function isSyncId(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAppDataLike(value) {
  return (
    isObject(value) &&
    Array.isArray(value.exercises) &&
    Array.isArray(value.sessions) &&
    Array.isArray(value.progressUpdates) &&
    typeof value.version === "number"
  );
}

async function readJsonBody(request) {
  if (!request.body) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_BODY_BYTES) {
        throw new Error("数据太大，无法同步");
      }
      chunks.push(buffer);
    }

    if (!chunks.length) {
      throw new Error("请求体为空");
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  if (request.body && typeof request.body === "object") {
    if (Buffer.isBuffer(request.body) || request.body instanceof Uint8Array) {
      return JSON.parse(Buffer.from(request.body).toString("utf8"));
    }
    return request.body;
  }
  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  throw new Error("请求体格式无效");
}

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url ?? "", "https://fitlog.local");
      if (url.searchParams.get("health") === "1") {
        const config = getRedisConfig();
        sendJson(response, config ? 200 : 503, {
          ok: Boolean(config),
          storage: "upstash-redis",
          configured: Boolean(config),
          envSource: config?.source ?? null,
          message: config ? "云存储已配置" : "云存储未配置：缺少 Upstash Redis 环境变量",
        });
        return;
      }
      const syncId = url.searchParams.get("syncId");
      if (!isSyncId(syncId)) {
        sendJson(response, 400, { message: "同步 ID 无效" });
        return;
      }

      const record = await getRedis().get(`${KEY_PREFIX}${syncId}`);
      if (!isObject(record) || !isAppDataLike(record.data)) {
        if (url.searchParams.get("meta") === "1") {
          sendJson(response, 200, { exists: false, updatedAt: null, dataUpdatedAt: null });
          return;
        }
        sendJson(response, 404, { message: "云端还没有数据，请先从一台设备上传" });
        return;
      }

      const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString();
      const dataUpdatedAt = typeof record.data.updatedAt === "string" ? record.data.updatedAt : updatedAt;

      if (url.searchParams.get("meta") === "1") {
        sendJson(response, 200, {
          exists: true,
          updatedAt,
          dataUpdatedAt,
          sessionCount: Array.isArray(record.data.sessions) ? record.data.sessions.length : 0,
        });
        return;
      }

      sendJson(response, 200, {
        data: record.data,
        updatedAt,
      });
      return;
    }

    if (request.method === "PUT") {
      const body = await readJsonBody(request);
      const syncId = isObject(body) ? body.syncId : null;
      const data = isObject(body) ? body.data : null;

      if (!isSyncId(syncId)) {
        sendJson(response, 400, { message: "同步 ID 无效" });
        return;
      }
      if (!isAppDataLike(data)) {
        sendJson(response, 400, { message: "同步数据格式无效" });
        return;
      }

      const updatedAt = new Date().toISOString();
      await getRedis().set(`${KEY_PREFIX}${syncId}`, {
        schemaVersion: 1,
        updatedAt,
        data,
      });

      sendJson(response, 200, { updatedAt });
      return;
    }

    sendJson(response, 405, { message: "不支持的请求方法" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "云同步服务异常";
    sendJson(response, message.includes("未配置") ? 503 : 500, { message });
  }
}
