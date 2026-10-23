import type { ReactNode } from "react";

/**
 * A home section: a hairline, a numbered mono label with an arrow, an optional count and
 * link on the right, then the section's own way of engaging (grid, swipe row, prompt…).
 */
export function Section({
  id,
  number,
  label,
  aside,
  children,
}: {
  id: string;
  number: number;
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="mt-[calc(var(--s-6)*var(--k-sections,1))] border-t border-rule pt-(--s-3)"
    >
      <div className="t-label flex items-baseline justify-between gap-(--s-3)">
        <h2 id={id}>
          <span className="mr-(--s-3)">{String(number).padStart(2, "0")}</span>
          {label} <span aria-hidden="true">↘</span>
        </h2>
        {aside}
      </div>
      <div className="mt-(--s-4)">{children}</div>
    </section>
  );
}
