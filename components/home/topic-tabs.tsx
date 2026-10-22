"use client";

import { useState, type ReactNode } from "react";

/** Topic tabs: the panels are rendered on the server; this only switches which shows. */
export function TopicTabs({ tabs }: { tabs: { id: string; name: string; panel: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div
        role="tablist"
        aria-label="Topics"
        className="dots t-label -mx-(--gutter) overflow-x-auto px-(--gutter)"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`flex min-h-11 items-center whitespace-nowrap decoration-1 underline-offset-4 hover:underline ${
              active === t.id ? "underline" : ""
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={active !== t.id}
          className="mt-(--s-4)"
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
