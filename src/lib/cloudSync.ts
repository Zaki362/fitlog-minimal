import type { AppData } from "../types";
import { validateAppData } from "./storage";

const CLOUD_SYNC_SETTINGS_KEY = "fitlog_minimal_cloud_sync_v1";

export type CloudSyncSettings = {
  syncId: string | null;
  syncLabel: string;
  autoSync: boolean;
  lastPulledAt?: string;
  lastPushedAt?: string;
  lastSyncedAt?: string;
};

export type CloudSnapshot = {
  data: AppData;
  updatedAt: string;
};

export type CloudPushResult = {
  updatedAt: string;
};

export type CloudHealth = {
  ok: boolean;
  configured: boolean;
  storage: string;
  message: string;
};

const emptySettings: CloudSyncSettings = {
  syncId: null,
  syncLabel: "",
  autoSync: false,
};

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isHex64(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function syncLabelFromSecret(secret: string): string {
  const normalized = secret.trim();
  if (normalized.length <= 8) {
    return normalized ? `•••• ${normalized}` : "";
  }
  return `•••• ${normalized.slice(-6)}`;
}

function normalizeSettings(value: unknown): CloudSyncSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySettings;
  }
  const record = value as Record<string, unknown>;
  const syncId = typeof record.syncId === "string" && isHex64(record.syncId) ? record.syncId : null;
  return {
    syncId,
    syncLabel: typeof record.syncLabel === "string" ? record.syncLabel : "",
    autoSync: Boolean(record.autoSync && syncId),
    lastPulledAt: typeof record.lastPulledAt === "string" ? record.lastPulledAt : undefined,
    lastPushedAt: typeof record.lastPushedAt === "string" ? record.lastPushedAt : undefined,
    lastSyncedAt: typeof record.lastSyncedAt === "string" ? record.lastSyncedAt : undefined,
  };
}

export function loadCloudSyncSettings(): CloudSyncSettings {
  if (!hasStorage()) {
    return emptySettings;
  }
  const raw = window.localStorage.getItem(CLOUD_SYNC_SETTINGS_KEY);
  if (!raw) {
    return emptySettings;
  }
  try {
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return emptySettings;
  }
}

export function saveCloudSyncSettings(settings: CloudSyncSettings): CloudSyncSettings {
  const normalized = normalizeSettings(settings);
  if (hasStorage()) {
    window.localStorage.setItem(CLOUD_SYNC_SETTINGS_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function createSyncSecret(): string {
  const bytes = new Uint8Array(12);
  window.crypto.getRandomValues(bytes);
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `FITLOG-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export async function deriveSyncSettings(secret: string): Promise<CloudSyncSettings> {
  const normalized = secret.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 10) {
    throw new Error("同步码太短，请至少使用 10 个字符");
  }
  const encoded = new TextEncoder().encode(`fitlog-minimal:${normalized}`);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  const syncId = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    syncId,
    syncLabel: syncLabelFromSecret(normalized),
    autoSync: false,
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown };
    return typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : "云同步失败";
  } catch {
    return response.status === 404 ? "云端还没有数据" : "云同步失败";
  }
}

export async function pullCloudData(syncId: string): Promise<CloudSnapshot> {
  const response = await fetch(`/api/sync?syncId=${encodeURIComponent(syncId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { data?: unknown; updatedAt?: unknown };
  return {
    data: validateAppData(body.data),
    updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : new Date().toISOString(),
  };
}

export async function pushCloudData(syncId: string, data: AppData): Promise<CloudPushResult> {
  const response = await fetch("/api/sync", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ syncId, data }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const body = (await response.json()) as { updatedAt?: unknown };
  return {
    updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : new Date().toISOString(),
  };
}

export async function checkCloudHealth(): Promise<CloudHealth> {
  const response = await fetch("/api/sync?health=1", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const body = (await response.json().catch(() => ({}))) as {
    ok?: unknown;
    configured?: unknown;
    storage?: unknown;
    message?: unknown;
  };
  return {
    ok: Boolean(body.ok && response.ok),
    configured: Boolean(body.configured),
    storage: typeof body.storage === "string" ? body.storage : "upstash-redis",
    message:
      typeof body.message === "string"
        ? body.message
        : response.ok
          ? "云存储已配置"
          : "云存储暂不可用",
  };
}
