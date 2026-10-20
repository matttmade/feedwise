import Link from "next/link";
import type { CardItem } from "@/lib/data/feed";
import { CardImage } from "@/components/cards/card-image";

/** Things already started, newest first, with how far along each one is. Never more than six. */
export function ContinueRail({ items }: { items: CardItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="continue-heading" className="mt-10">
      <h2 id="continue-heading" className="text-lg font-bold">
        Continue
      </h2>
      <ul className="mt-3 flex snap-x gap-4 overflow-x-auto pb-3">
        {items.map((item) => {
          const pct = Math.round(item.resumePosition * 100);
          return (
            <li key={item.id} className="w-60 shrink-0 snap-start sm:w-64">
              <Link
                href={`/reader/${item.id}`}
                className="block overflow-hidden rounded-card border border-line bg-surface hover:shadow-card"
              >
                <CardImage item={item} ratio="wide" sizes="256px" />
                <div className="p-3">
                  <p className="line-clamp-2 font-bold">{item.title}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <span
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </span>
                    <span>{pct ? `${pct}%` : "Started"}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
