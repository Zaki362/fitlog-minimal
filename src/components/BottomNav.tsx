import type { MainTab } from "../App";

type BottomNavProps = {
  activeTab: MainTab;
  onNavigate: (tab: MainTab) => void;
};

const tabs: Array<{ id: MainTab; label: string }> = [
  { id: "dashboard", label: "首页" },
  { id: "start", label: "开练" },
  { id: "history", label: "记录" },
  { id: "exercises", label: "动作库" },
];

function NavIcon({ id }: { id: MainTab }) {
  if (id === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.4 12 4l8 7.4" />
        <path d="M6.5 10.4V20h4.1v-5.1h2.8V20h4.1v-9.6" />
      </svg>
    );
  }

  if (id === "start") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.8 13.2 4.6 11l2.8-2.8 2.2 2.2" />
        <path d="m14.4 13.6 2.2 2.2 2.8-2.8-2.2-2.2" />
        <path d="m8.6 14.4 5.8-5.8" />
        <path d="m5.8 7 2-2 2.1 2.1-2 2" />
        <path d="m14.1 16.9 2 2 2-2-2-2" />
      </svg>
    );
  }

  if (id === "history") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="3" />
        <path d="m8.5 12 2.4 2.4 4.8-5.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 8.5h10l1.2 11H5.8z" />
      <path d="M9 8.5V6.8C9 5.3 10.2 4 12 4s3 1.3 3 2.8v1.7" />
      <path d="M12 12.2v4.2" />
      <path d="M9.9 14.3h4.2" />
    </svg>
  );
}

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
          <span className="bottom-nav__icon">
            <NavIcon id={tab.id} />
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
