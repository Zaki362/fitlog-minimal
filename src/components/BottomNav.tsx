import type { MainTab } from "../App";

type BottomNavProps = {
  activeTab: MainTab;
  onNavigate: (tab: MainTab) => void;
};

const tabs: Array<{ id: MainTab; label: string }> = [
  { id: "dashboard", label: "首页" },
  { id: "start", label: "开练" },
  { id: "history", label: "记录" },
  { id: "exercises", label: "动作" },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {tabs.map((tab) => (
        <button
          className={`bottom-nav__item ${activeTab === tab.id ? "is-active" : ""}`}
          key={tab.id}
          type="button"
          onClick={() => onNavigate(tab.id)}
        >
          <span className="bottom-nav__dot" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
