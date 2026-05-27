import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const failures = [];

function file(path) {
  return resolve(root, path);
}

function read(path) {
  return readFileSync(file(path), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function fileExists(path) {
  try {
    return statSync(file(path)).isFile();
  } catch {
    return false;
  }
}

function pngSize(path) {
  const buffer = readFileSync(file(path));
  if (buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`${path} is not a PNG`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const manifest = JSON.parse(read("public/manifest.webmanifest"));
assert(manifest.display === "standalone", "manifest display should be standalone");
assert(manifest.orientation === "portrait", "manifest orientation should be portrait");
assert(manifest.scope === "/", "manifest scope should be /");
assert(manifest.start_url === "/", "manifest start_url should be /");
assert(Array.isArray(manifest.icons), "manifest icons should be an array");
assert(
  manifest.icons.some((icon) => icon.src === "/pwa-icon-192.png" && icon.sizes === "192x192"),
  "manifest should include 192x192 PNG icon",
);
assert(
  manifest.icons.some((icon) => icon.src === "/pwa-icon-512.png" && icon.sizes === "512x512"),
  "manifest should include 512x512 PNG icon",
);

const index = read("index.html");
[
  'name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"',
  'name="apple-mobile-web-app-capable" content="yes"',
  'name="apple-mobile-web-app-title" content="练一下"',
  'name="apple-mobile-web-app-status-bar-style" content="black-translucent"',
  'rel="apple-touch-icon" href="/apple-touch-icon.png"',
].forEach((needle) => assert(index.includes(needle), `index.html missing ${needle}`));

[
  ["public/apple-touch-icon.png", 180],
  ["public/pwa-icon-192.png", 192],
  ["public/pwa-icon-512.png", 512],
].forEach(([path, expected]) => {
  assert(fileExists(path), `${path} should exist`);
  if (fileExists(path)) {
    const size = pngSize(path);
    assert(size.width === expected && size.height === expected, `${path} should be ${expected}x${expected}`);
  }
});

const serviceWorker = read("public/sw.js");
assert(serviceWorker.includes('CACHE_NAME = "fitlog-minimal-v2"'), "service worker cache version should be v2");
assert(serviceWorker.includes('url.pathname.startsWith("/api/")'), "service worker should bypass API requests");

const syncApi = read("api/sync.js");
assert(syncApi.includes("@upstash/redis"), "sync API should use Upstash Redis");
assert(syncApi.includes("UPSTASH_REDIS_REST_URL"), "sync API should reference Upstash URL env var");
assert(syncApi.includes("UPSTASH_REDIS_REST_TOKEN"), "sync API should reference Upstash token env var");

const envExample = read(".env.example");
assert(envExample.includes("UPSTASH_REDIS_REST_URL="), ".env.example missing UPSTASH_REDIS_REST_URL");
assert(envExample.includes("UPSTASH_REDIS_REST_TOKEN="), ".env.example missing UPSTASH_REDIS_REST_TOKEN");

const vercel = JSON.parse(read("vercel.json"));
assert(vercel.framework === "vite", "vercel.json framework should be vite");
assert(vercel.buildCommand === "npm run build", "vercel.json buildCommand should be npm run build");
assert(vercel.outputDirectory === "dist", "vercel.json outputDirectory should be dist");
assert(Boolean(vercel.functions?.["api/sync.js"]), "vercel.json should configure api/sync.js");

const packageJson = JSON.parse(read("package.json"));
assert(Boolean(packageJson.dependencies?.["@upstash/redis"]), "package.json should include @upstash/redis");
assert(packageJson.scripts?.build === "tsc -b && vite build", "package.json should include build script");
assert(Boolean(packageJson.scripts?.["smoke:api"]), "package.json should include smoke:api script");

if (failures.length) {
  console.error("Deploy readiness check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("deploy readiness ok");
