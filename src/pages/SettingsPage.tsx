import { useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { exportJson, exportMarkdown, importJson } from "../lib/storage";
import { todayYmd } from "../lib/date";
import { downloadTextFile } from "../lib/workout";
import {
  createSyncSecret,
  deriveSyncSettings,
  pullCloudData,
  pushCloudData,
  saveCloudSyncSettings,
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
};

type SyncBusyState = "save" | "push" | "pull" | null;

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
  );
}

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

export function SettingsPage({
  data,
  cloudSettings,
  notify,
  onBack,
  onCloudSettingsChange,
  onImport,
  onReset,
  onClear,
}: SettingsPageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmCloudPull, setConfirmCloudPull] = useState(false);
  const [syncSecret, setSyncSecret] = useState("");
  const [generatedSecret, setGeneratedSecret] = useState("");
  const [syncBusy, setSyncBusy] = useState<SyncBusyState>(null);
  const [standalone] = useState(isStandalonePwa);

  function persistCloudSettings(next: CloudSyncSettings): CloudSyncSettings {
    const saved = saveCloudSyncSettings(next);
    onCloudSettingsChange(saved);
    return saved;
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
      notify("云同步码已保存");
    } catch (error) {
      notify(error instanceof Error ? error.message : "同步码保存失败", "danger");
    } finally {
      setSyncBusy(null);
    }
  }

  async function handlePushCloud() {
    if (!cloudSettings.syncId) {
      notify("请先设置同步码", "warning");
      return;
    }
    try {
      setSyncBusy("push");
      const result = await pushCloudData(cloudSettings.syncId, data);
      persistCloudSettings({
        ...cloudSettings,
        lastPushedAt: result.updatedAt,
        lastSyncedAt: result.updatedAt,
      });
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
      persistCloudSettings({
        ...cloudSettings,
        lastPulledAt: snapshot.updatedAt,
        lastSyncedAt: snapshot.updatedAt,
      });
      onImport(snapshot.data);
      notify("已从云端恢复");
    } catch (error) {
      notify(error instanceof Error ? error.message : "恢复失败", "danger");
    } finally {
      setSyncBusy(null);
      setConfirmCloudPull(false);
    }
  }

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

      <section className="panel">
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
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>iPhone 安装</h2>
          <span>{standalone ? "已用 App 模式打开" : "Safari 添加到主屏幕"}</span>
        </div>
        <div className="asset-credit">
          <strong>推荐用法：</strong>用 iPhone Safari 打开 Vercel 地址，点分享按钮，选择「添加到主屏幕」。
          安装后会使用独立窗口、主屏幕图标和 iOS 安全区布局。
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>云同步</h2>
          <span>{cloudSettings.syncId ? cloudSettings.syncLabel || "已连接" : "未设置"}</span>
        </div>
        <div className="cloud-sync-card">
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
            <span>上次上传：{formatSyncTime(cloudSettings.lastPushedAt)}</span>
            <span>上次恢复：{formatSyncTime(cloudSettings.lastPulledAt)}</span>
          </div>
          <div className="button-stack">
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
                notify("已关闭云同步");
              }}
            >
              关闭云同步
            </button>
          </div>
          <p>
            同步码相当于这份训练数据的钥匙。换手机时，在新设备输入同一个同步码，然后点「从云端恢复到本机」。
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>导出</h2>
        </div>
        <div className="button-stack">
          <button
            className="button button--primary button--block"
            type="button"
            onClick={() => {
              downloadTextFile(`fitlog-${todayYmd()}.json`, exportJson(data), "application/json");
              notify("JSON 已导出");
            }}
          >
            导出 JSON
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
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>导入</h2>
        </div>
        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleImport(event.target.files?.[0] ?? null)}
        />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>重置</h2>
        </div>
        <div className="button-stack">
          <button className="button button--secondary button--block" type="button" onClick={() => setConfirmReset(true)}>
            恢复初始数据
          </button>
          <button className="button button--danger button--block" type="button" onClick={() => setConfirmClear(true)}>
            清空所有数据
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>插画来源</h2>
        </div>
        <p className="asset-credit">
          动作插画来自 Open Training / Everkinetic，使用 CC BY-SA 3.0 授权；无匹配素材的动作使用本地绘制线稿。
        </p>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="恢复初始数据？"
        description="当前数据会被 seed 数据覆盖。"
        confirmLabel="恢复"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
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
    </div>
  );
}
