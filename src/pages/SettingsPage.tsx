import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  exportJson,
  exportMarkdown,
  importJson,
  loadLocalDataBackupSummary,
  restoreLocalDataBackup,
  saveLocalDataBackup,
  type LocalDataBackupSummary,
} from "../lib/storage";
import { todayYmd } from "../lib/date";
import { downloadTextFile } from "../lib/workout";
import {
  checkCloudHealth,
  createSyncSecret,
  deriveSyncSettings,
  getCloudMetadata,
  pullCloudData,
  pushCloudData,
  type CloudMetadata,
  saveCloudSyncSettings,
  type CloudHealth,
  type CloudSyncSettings,
} from "../lib/cloudSync";
import type { AppData } from "../types";

type SettingsPageProps = {
  data: AppData;
  cloudSettings: CloudSyncSettings;
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onBack: () => void;
  onCloudSettingsChange: (settings: CloudSyncSettings) => void;
  onImport: (data: AppData) => void;
  onReset: () => void;
  onClear: () => void;
  pwaStatus: {
    canInstall: boolean;
    isOnline: boolean;
    isStandalone: boolean;
    serviceWorkerSupported: boolean;
    updateAvailable: boolean;
    onInstall: () => void;
    onUpdate: () => void;
  };
};

type SyncBusyState = "save" | "push" | "pull" | null;
type CloudMetaStatus = "idle" | "loading" | "error";

function formatSyncTime(value: string | undefined): string {
  if (!value) {
    return "尚未同步";
  }
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBackupSummary(summary: LocalDataBackupSummary | null): string {
  if (!summary) {
    return "暂无备份";
  }

  return `${formatSyncTime(summary.createdAt)} · ${summary.sessionCount} 条记录`;
}

function isRemoteDataNewer(remoteUpdatedAt: string | undefined, localUpdatedAt: string): boolean {
  const remoteTime = Date.parse(remoteUpdatedAt ?? "");
  const localTime = Date.parse(localUpdatedAt);
  if (!Number.isFinite(remoteTime) || !Number.isFinite(localTime)) {
    return false;
  }

  return remoteTime > localTime + 1000;
}

export function SettingsPage({
  data,
  cloudSettings,
  notify,
  onBack,
  onCloudSettingsChange,
  onImport,
  onReset,
  onClear,
  pwaStatus,
}: SettingsPageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmCloudPull, setConfirmCloudPull] = useState(false);
  const [confirmCloudPushOverwrite, setConfirmCloudPushOverwrite] = useState(false);
  const [confirmBackupRestore, setConfirmBackupRestore] = useState(false);
  const [syncSecret, setSyncSecret] = useState("");
  const [generatedSecret, setGeneratedSecret] = useState("");
  const [syncBusy, setSyncBusy] = useState<SyncBusyState>(null);
  const [cloudHealth, setCloudHealth] = useState<CloudHealth | null>(null);
  const [cloudMetadata, setCloudMetadata] = useState<CloudMetadata | null>(null);
  const [cloudMetaStatus, setCloudMetaStatus] = useState<CloudMetaStatus>("idle");
  const [backupSummary, setBackupSummary] = useState(loadLocalDataBackupSummary);

  useEffect(() => {
    let ignore = false;
    void checkCloudHealth()
      .then((health) => {
        if (!ignore) {
          setCloudHealth(health);
        }
      })
      .catch(() => {
        if (!ignore) {
          setCloudHealth({
            ok: false,
            configured: false,
            storage: "upstash-redis",
            message: "云同步服务暂不可用",
          });
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!cloudSettings.syncId) {
      setCloudMetadata(null);
      setCloudMetaStatus("idle");
      return () => {
        ignore = true;
      };
    }

    setCloudMetaStatus("loading");
    void getCloudMetadata(cloudSettings.syncId)
      .then((metadata) => {
        if (!ignore) {
          setCloudMetadata(metadata);
          setCloudMetaStatus("idle");
        }
      })
      .catch(() => {
        if (!ignore) {
          setCloudMetadata(null);
          setCloudMetaStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [cloudSettings.syncId]);

  function persistCloudSettings(next: CloudSyncSettings): CloudSyncSettings {
    const saved = saveCloudSyncSettings(next);
    onCloudSettingsChange(saved);
    return saved;
  }

  function createLocalBackup(reason: string) {
    const summary = saveLocalDataBackup(data, reason);
    if (summary) {
      setBackupSummary(summary);
    }
    return summary;
  }

  async function refreshCloudMetadata(syncId = cloudSettings.syncId): Promise<CloudMetadata | null> {
    if (!syncId) {
      setCloudMetadata(null);
      setCloudMetaStatus("idle");
      return null;
    }

    setCloudMetaStatus("loading");
    try {
      const metadata = await getCloudMetadata(syncId);
      setCloudMetadata(metadata);
      setCloudMetaStatus("idle");
      return metadata;
    } catch (error) {
      setCloudMetadata(null);
      setCloudMetaStatus("error");
      throw error;
    }
  }

  function formatCloudMetadataTime(): string {
    if (!cloudSettings.syncId) {
      return "未设置";
    }
    if (cloudMetaStatus === "loading") {
      return "检查中";
    }
    if (cloudMetaStatus === "error") {
      return "检查失败";
    }
    if (!cloudMetadata?.exists) {
      return "尚未上传";
    }
    return formatSyncTime(cloudMetadata.dataUpdatedAt ?? cloudMetadata.updatedAt);
  }

  async function handleImport(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const result = importJson(text);
      if (!result.ok) {
        notify(result.error, "danger");
        return;
      }
      createLocalBackup("JSON 导入前自动备份");
      onImport(result.data);
      notify("导入成功");
    } catch {
      notify("读取文件失败", "danger");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleGenerateSyncSecret() {
    const next = createSyncSecret();
    setSyncSecret(next);
    setGeneratedSecret(next);
    void window.navigator.clipboard?.writeText(next).catch(() => undefined);
    notify("同步码已生成，请保存到 iCloud 钥匙串或备忘录");
  }

  async function handleSaveSyncSecret() {
    try {
      setSyncBusy("save");
      const next = await deriveSyncSettings(syncSecret);
      const sameSyncId = next.syncId === cloudSettings.syncId;
      const saved = persistCloudSettings({
        ...next,
        autoSync: sameSyncId ? cloudSettings.autoSync : false,
        lastPulledAt: sameSyncId ? cloudSettings.lastPulledAt : undefined,
        lastPushedAt: sameSyncId ? cloudSettings.lastPushedAt : undefined,
        lastSyncedAt: sameSyncId ? cloudSettings.lastSyncedAt : undefined,
      });
      if (!saved.syncId) {
        notify("同步码保存失败", "danger");
        return;
      }
      setSyncSecret("");
      void refreshCloudMetadata(saved.syncId).catch(() => undefined);
      notify("云同步码已保存");
    } catch (error) {
      notify(error instanceof Error ? error.message : "同步码保存失败", "danger");
    } finally {
      setSyncBusy(null);
    }
  }

  async function handlePushCloud(forceOverwrite = false) {
    if (!cloudSettings.syncId) {
      notify("请先设置同步码", "warning");
      return;
    }
    try {
      setSyncBusy("push");
      const metadata = await refreshCloudMetadata(cloudSettings.syncId);
      if (
        !forceOverwrite &&
        metadata?.exists &&
        isRemoteDataNewer(metadata.dataUpdatedAt ?? metadata.updatedAt, data.updatedAt)
      ) {
        setConfirmCloudPushOverwrite(true);
        return;
      }

      const result = await pushCloudData(cloudSettings.syncId, data);
      persistCloudSettings({
        ...cloudSettings,
        lastPushedAt: result.updatedAt,
        lastSyncedAt: result.updatedAt,
      });
      setCloudMetadata({
        exists: true,
        updatedAt: result.updatedAt,
        dataUpdatedAt: data.updatedAt,
        sessionCount: data.sessions.length,
      });
      setCloudMetaStatus("idle");
      notify("已上传到云端");
    } catch (error) {
      notify(error instanceof Error ? error.message : "上传失败", "danger");
    } finally {
      setSyncBusy(null);
    }
  }

  async function handlePullCloud() {
    if (!cloudSettings.syncId) {
      notify("请先设置同步码", "warning");
      return;
    }
    try {
      setSyncBusy("pull");
      const snapshot = await pullCloudData(cloudSettings.syncId);
      createLocalBackup("云端恢复前自动备份");
      persistCloudSettings({
        ...cloudSettings,
        lastPulledAt: snapshot.updatedAt,
        lastSyncedAt: snapshot.updatedAt,
      });
      setCloudMetadata({
        exists: true,
        updatedAt: snapshot.updatedAt,
        dataUpdatedAt: snapshot.data.updatedAt,
        sessionCount: snapshot.data.sessions.length,
      });
      setCloudMetaStatus("idle");
      onImport(snapshot.data);
      notify("已从云端恢复");
    } catch (error) {
      notify(error instanceof Error ? error.message : "恢复失败", "danger");
    } finally {
      setSyncBusy(null);
      setConfirmCloudPull(false);
    }
  }

  function handleRestoreLocalBackup() {
    const result = restoreLocalDataBackup();
    if (!result.ok) {
      notify(result.error, "danger");
      return;
    }
    onImport(result.data);
    notify("已恢复最近本机备份");
    setConfirmBackupRestore(false);
  }

  const cloudDataIsNewer = Boolean(
    cloudMetadata?.exists && isRemoteDataNewer(cloudMetadata.dataUpdatedAt ?? cloudMetadata.updatedAt, data.updatedAt),
  );

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-button icon-button--solid" type="button" onClick={onBack}>
          返回
        </button>
        <div className="page-header__main">
          <p className="eyebrow">设置</p>
          <h1>数据管理</h1>
        </div>
      </header>

      <section className="panel settings-section">
        <div className="section-title">
          <h2>App 状态</h2>
          <span>{pwaStatus.isStandalone ? "已安装" : "网页模式"}</span>
        </div>
        <div className="settings-grid">
          <div>
            <span>动作</span>
            <strong>{data.exercises.length}</strong>
          </div>
          <div>
            <span>记录</span>
            <strong>{data.sessions.length}</strong>
          </div>
          <div>
            <span>进步</span>
            <strong>{data.progressUpdates.length}</strong>
          </div>
        </div>
        <div className="pwa-status-grid">
          <div>
            <span>离线缓存</span>
            <strong>{pwaStatus.serviceWorkerSupported ? "支持" : "不支持"}</strong>
          </div>
          <div>
            <span>网络</span>
            <strong>{pwaStatus.isOnline ? "在线" : "离线"}</strong>
          </div>
          <div>
            <span>版本</span>
            <strong>{pwaStatus.updateAvailable ? "有新版" : "最新"}</strong>
          </div>
        </div>
        <div className="settings-action-grid">
          <button
            className="button button--primary button--block"
            type="button"
            disabled={pwaStatus.isStandalone && !pwaStatus.canInstall}
            onClick={pwaStatus.onInstall}
          >
            {pwaStatus.canInstall ? "安装到设备" : pwaStatus.isStandalone ? "已安装" : "安装方式"}
          </button>
          <button
            className="button button--secondary button--block"
            type="button"
            disabled={!pwaStatus.updateAvailable}
            onClick={pwaStatus.onUpdate}
          >
            更新
          </button>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="section-title">
          <h2>备份与迁移</h2>
          <span>{formatBackupSummary(backupSummary)}</span>
        </div>
        <div className="backup-card">
          <strong>{backupSummary ? backupSummary.reason : "还没有本机备份"}</strong>
          <span>
            {backupSummary
              ? `数据时间 ${formatSyncTime(backupSummary.dataUpdatedAt)} · ${backupSummary.exerciseCount} 个动作`
              : "重要操作前会自动保存最近一次本机备份"}
          </span>
        </div>
        <div className="settings-action-grid">
          <button
            className="button button--secondary button--block"
            type="button"
            onClick={() => {
              createLocalBackup("手动本机备份");
              notify("本机备份已保存");
            }}
          >
            本机备份
          </button>
          <button
            className="button button--primary button--block"
            type="button"
            disabled={!backupSummary}
            onClick={() => setConfirmBackupRestore(true)}
          >
            恢复备份
          </button>
          <button
            className="button button--secondary button--block"
            type="button"
            onClick={() => {
              downloadTextFile(`fitlog-${todayYmd()}.json`, exportJson(data), "application/json");
              notify("JSON 已导出");
            }}
          >
            导出 JSON
          </button>
          <button className="button button--secondary button--block" type="button" onClick={() => inputRef.current?.click()}>
            导入 JSON
          </button>
          <button
            className="button button--secondary button--block"
            type="button"
            onClick={() => {
              downloadTextFile(`fitlog-${todayYmd()}.md`, exportMarkdown(data), "text/markdown");
              notify("Markdown 已导出");
            }}
          >
            导出 Markdown
          </button>
        </div>
        <input
          ref={inputRef}
          className="file-input file-input--hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleImport(event.target.files?.[0] ?? null)}
        />
      </section>

      <section className="panel settings-section">
        <div className="section-title">
          <h2>多设备同步</h2>
          <span>{cloudSettings.syncId ? cloudSettings.syncLabel || "已连接" : "未设置"}</span>
        </div>
        <div className="cloud-sync-card">
          <div className={`cloud-health ${cloudHealth?.ok ? "is-ok" : "is-warning"}`}>
            <strong>{cloudHealth?.ok ? "云端服务已就绪" : "云端服务未配置"}</strong>
            <span>{cloudHealth?.message ?? "正在检查云同步服务..."}</span>
          </div>
          <label>
            同步码
            <input
              autoComplete="one-time-code"
              inputMode="text"
              placeholder="输入同一个同步码即可连接另一台设备"
              type="text"
              value={syncSecret}
              onChange={(event) => setSyncSecret(event.target.value)}
            />
          </label>
          {generatedSecret ? (
            <p className="cloud-sync-card__secret">
              新同步码：<strong>{generatedSecret}</strong>
            </p>
          ) : null}
          <div className="inline-actions">
            <button className="button button--secondary" type="button" onClick={handleGenerateSyncSecret}>
              生成同步码
            </button>
            <button
              className="button button--primary"
              type="button"
              disabled={!syncSecret.trim() || syncBusy === "save"}
              onClick={() => void handleSaveSyncSecret()}
            >
              保存同步码
            </button>
          </div>
          <label className="toggle-row cloud-sync-card__toggle">
            <input
              checked={Boolean(cloudSettings.autoSync && cloudSettings.syncId)}
              type="checkbox"
              onChange={(event) => {
                if (!cloudSettings.syncId) {
                  notify("请先设置同步码", "warning");
                  return;
                }
                persistCloudSettings({ ...cloudSettings, autoSync: event.target.checked });
              }}
            />
            <span>保存本机修改后自动上传</span>
          </label>
          <div className="cloud-sync-card__status">
            <span>本机更新：{formatSyncTime(data.updatedAt)}</span>
            <span className={cloudDataIsNewer ? "is-warning" : undefined}>
              云端更新：{formatCloudMetadataTime()}
            </span>
            <span>上次上传：{formatSyncTime(cloudSettings.lastPushedAt)}</span>
            <span>上次恢复：{formatSyncTime(cloudSettings.lastPulledAt)}</span>
          </div>
          <div className="settings-action-grid">
            <button
              className="button button--primary button--block"
              type="button"
              disabled={!cloudSettings.syncId || syncBusy === "push"}
              onClick={() => void handlePushCloud()}
            >
              上传本机数据到云端
            </button>
            <button
              className="button button--secondary button--block"
              type="button"
              disabled={!cloudSettings.syncId || syncBusy === "pull"}
              onClick={() => setConfirmCloudPull(true)}
            >
              从云端恢复到本机
            </button>
            <button
              className="button button--secondary button--block"
              type="button"
              disabled={!cloudSettings.syncId}
              onClick={() => {
                persistCloudSettings({ syncId: null, syncLabel: "", autoSync: false });
                setCloudMetadata(null);
                setCloudMetaStatus("idle");
                notify("已关闭云同步");
              }}
            >
              关闭云同步
            </button>
          </div>
        </div>
      </section>

      <section className="panel settings-section">
        <div className="section-title">
          <h2>危险操作</h2>
          <span>不可撤销</span>
        </div>
        <div className="settings-action-grid">
          <button className="button button--secondary button--block" type="button" onClick={() => setConfirmReset(true)}>
            恢复初始数据
          </button>
          <button className="button button--danger button--block" type="button" onClick={() => setConfirmClear(true)}>
            清空所有数据
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="恢复初始数据？"
        description="当前数据会被 seed 数据覆盖。"
        confirmLabel="恢复"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          createLocalBackup("恢复初始数据前自动备份");
          onReset();
          setConfirmReset(false);
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="清空所有数据？"
        description="动作、记录和进步历史都会变为空。"
        danger
        confirmLabel="清空"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          createLocalBackup("清空数据前自动备份");
          onClear();
          setConfirmClear(false);
        }}
      />

      <ConfirmDialog
        open={confirmCloudPull}
        title="从云端恢复？"
        description="本机当前数据会被云端快照覆盖。建议先导出 JSON 备份。"
        confirmLabel="恢复"
        onCancel={() => setConfirmCloudPull(false)}
        onConfirm={() => void handlePullCloud()}
      />

      <ConfirmDialog
        open={confirmCloudPushOverwrite}
        title="云端数据更新较新"
        description="继续上传会用本机数据覆盖云端。建议先从云端恢复或导出 JSON 备份。"
        confirmLabel="仍然上传"
        onCancel={() => setConfirmCloudPushOverwrite(false)}
        onConfirm={() => {
          setConfirmCloudPushOverwrite(false);
          void handlePushCloud(true);
        }}
      />

      <ConfirmDialog
        open={confirmBackupRestore}
        title="恢复最近本机备份？"
        description="当前数据会被最近一次本机备份覆盖。"
        confirmLabel="恢复"
        onCancel={() => setConfirmBackupRestore(false)}
        onConfirm={handleRestoreLocalBackup}
      />
    </div>
  );
}
