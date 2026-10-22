import Link from "next/link";
import type { CardItem } from "@/lib/data/feed";
import { costLabel } from "@/lib/feed/select";
import { CardFrame, KeepButton, SkipButton } from "@/components/cards/card-frame";
import { CardImage } from "@/components/cards/card-image";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * The one next thing, set like a magazine opener: image edge to edge, the title huge and
 * overlapping it, and the facts as a lettered table. Read is the screen's primary action
 * unless reviews lead (then it's a plain link).
 */
export function LeadStory({
  item,
  resuming,
  primary,
}: {
  item: CardItem;
  resuming: boolean;
  primary: boolean;
}) {
  const cost = costLabel(item);
  const verb = item.type === "video" ? "Watch" : "Read";
  const href = `/reader/${item.id}`;
  const pct = Math.round(item.resumePosition * 100);
  const facts: [string, string, string][] = [
    ["A", "Source", item.sourceTitle],
    ["B", "Length", cost ?? "—"],
    ["C", "Published", date(item.sortAt)],
    ["D", "Status", !resuming ? "New" : pct > 0 ? `${pct}% read` : "Started"],
  ];

  return (
    <CardFrame itemId={item.id} title={item.title} labelledBy="lead-title" className="card">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="-mx-(--gutter) block"
        data-speed="0.9"
      >
        <CardImage item={item} ratio="cinema" sizes="100vw" priority />
      </Link>
      <div className="lg:grid-12">
        <h2
          id="lead-title"
          className="t-headline relative z-10 -mt-[0.6em] max-w-[18ch] text-paper mix-blend-difference lg:col-span-10"
          data-speed="1.06"
        >
          <Link href={href} className="decoration-1 underline-offset-8 hover:underline">
            {item.title}
          </Link>
        </h2>
      </div>
      <div className="mt-(--s-4) flex flex-col gap-(--s-4) lg:grid-12">
        <dl className="t-label grid grid-cols-[1.5rem_6rem_minmax(0,1fr)] gap-y-(--s-1) lg:col-span-5">
          {facts.map(([letter, term, value]) => (
            <div key={letter} className="contents">
              <span aria-hidden="true" className="text-muted">
                {letter}
              </span>
              <dt>{term}</dt>
              <dd className="truncate">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-(--s-3) lg:col-span-6 lg:col-start-7">
          {item.summary && !resuming && <p className="line-clamp-4 max-w-[52ch]">{item.summary}</p>}
          <div className="flex flex-wrap items-center gap-x-(--s-4) gap-y-(--s-2)">
            <Link href={href} className={primary ? "btn" : "link"}>
              {resuming ? `Continue ${verb.toLowerCase()}ing` : verb} →
            </Link>
            {!resuming && (
              <>
                <KeepButton label="Keep for later" className="link" />
                <SkipButton label="Not today" className="link" />
              </>
            )}
          </div>
        </div>
      </div>
    </CardFrame>
  );
}
