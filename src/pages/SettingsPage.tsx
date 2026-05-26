import { useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { exportJson, exportMarkdown, importJson } from "../lib/storage";
import { todayYmd } from "../lib/date";
import { downloadTextFile } from "../lib/workout";
import type { AppData } from "../types";

type SettingsPageProps = {
  data: AppData;
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onBack: () => void;
  onImport: (data: AppData) => void;
  onReset: () => void;
  onClear: () => void;
};

export function SettingsPage({ data, notify, onBack, onImport, onReset, onClear }: SettingsPageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

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
    </div>
  );
}
