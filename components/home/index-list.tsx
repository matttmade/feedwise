import Link from "next/link";
import type { CardItem } from "@/lib/data/feed";
import { costLabel } from "@/lib/feed/select";
import { CardImage } from "@/components/cards/card-image";

/**
 * A Zajno-style index: number · a lead (source name or title) · detail · length, with a
 * thumbnail on the right that comes into colour on hover. A hairline between rows.
 */
export function IndexList({
  items,
  lead,
}: {
  items: CardItem[];
  /** What the big serif column shows. */
  lead: "source" | "title";
}) {
  return (
    <ol className="border-t border-rule">
      {items.map((item, i) => (
        <li key={item.id} className="card fly-in border-b border-rule" data-lag={0.06 + i * 0.05}>
          <Link
            href={`/reader/${item.id}`}
            className="group grid grid-cols-[2rem_minmax(0,1fr)_5.5rem] items-start gap-x-(--s-3) py-(--s-3) lg:grid-12"
          >
            <span className="t-label pt-1.5">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex min-w-0 flex-col gap-(--s-1) lg:col-span-5">
              <span className="t-lead decoration-1 underline-offset-4 group-hover:underline">
                {lead === "source" ? item.sourceTitle : item.title}
              </span>
              <span className="lg:hidden">{lead === "source" ? item.title : item.sourceTitle}</span>
            </span>
            <span className="hidden pt-1 lg:col-span-4 lg:block">
              {lead === "source" ? item.title : item.sourceTitle}
            </span>
            <span className="t-label hidden pt-1.5 lg:col-span-1 lg:block">
              {costLabel(item) ?? ""}
            </span>
            <span className="lg:col-span-1 lg:col-start-12">
              <CardImage item={item} ratio="wide" sizes="120px" />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
