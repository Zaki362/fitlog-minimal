const baseUrl = (process.argv[2] ?? "https://fitlog-minimal.vercel.app").replace(/\/$/, "");

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function randomSyncId() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const healthResponse = await fetch(`${baseUrl}/api/sync?health=1`, {
  headers: { Accept: "application/json" },
});
const health = await readJson(healthResponse);

if (!healthResponse.ok || !health.configured) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        stage: "health",
        url: baseUrl,
        message: health.message ?? "云存储未配置",
        configured: Boolean(health.configured),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const syncId = randomSyncId();
const marker = `verify-${Date.now()}`;
const data = {
  version: 1,
  updatedAt: new Date().toISOString(),
  exercises: [
    {
      id: marker,
      name: "云同步验证动作",
      muscleGroup: "custom",
      defaultWeightKg: null,
      targetSets: null,
      targetReps: null,
      unit: "mixed",
      notes: marker,
      isFavorite: false,
      isArchived: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  sessions: [],
  progressUpdates: [],
};

const pushResponse = await fetch(`${baseUrl}/api/sync`, {
  method: "PUT",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ syncId, data }),
});
const push = await readJson(pushResponse);
if (!pushResponse.ok) {
  fail(`云端写入失败：${push.message ?? push.raw ?? pushResponse.status}`);
}

const pullResponse = await fetch(`${baseUrl}/api/sync?syncId=${encodeURIComponent(syncId)}`, {
  headers: { Accept: "application/json" },
});
const pull = await readJson(pullResponse);
if (!pullResponse.ok) {
  fail(`云端读取失败：${pull.message ?? pull.raw ?? pullResponse.status}`);
}

const pulledMarker = pull.data?.exercises?.[0]?.id;
if (pulledMarker !== marker) {
  fail("云端读取数据和写入数据不一致");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      stage: "roundtrip",
      url: baseUrl,
      updatedAt: pull.updatedAt,
      marker,
    },
    null,
    2,
  ),
);
