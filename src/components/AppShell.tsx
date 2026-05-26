import type { ReactNode } from "react";
import type { MainTab } from "../App";
import { BottomNav } from "./BottomNav";

type AppShellProps = {
  activeTab: MainTab;
  children: ReactNode;
  onNavigate: (tab: MainTab) => void;
};

export function AppShell({ activeTab, children, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <BottomNav activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
}
