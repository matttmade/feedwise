import Link from "next/link";
import type { CardItem } from "@/lib/data/feed";

/** Things already started, newest first, with how far along each one is. Never more than six.
    An index: number, title, source, progress; a hairline between rows. */
export function ContinueRail({ items }: { items: CardItem[] }) {
  if (!items.length) return null;
  return (
    <ol className="border-t border-rule">
      {items.map((item, i) => {
        const pct = Math.round(item.resumePosition * 100);
        return (
          <li key={item.id} className="border-b border-rule">
            <Link
              href={`/reader/${item.id}`}
              className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-(--s-3) py-(--s-3) lg:grid-12"
            >
              <span className="t-label">{String(i + 1).padStart(2, "0")}</span>
              <span className="decoration-1 underline-offset-4 group-hover:underline lg:col-span-7">
                {item.title}
              </span>
              <span className="t-label hidden lg:col-span-2 lg:block">{item.sourceTitle}</span>
              <span className="t-label flex items-center gap-(--s-2) justify-self-end lg:col-span-2">
                <span aria-hidden="true" className="relative hidden h-px w-12 bg-rule sm:block">
                  <span
                    className="absolute inset-y-0 left-0 bg-accent"
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  />
                </span>
                {pct ? `${pct}%` : "Started"}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
