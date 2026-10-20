import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getExplore, getSources, getTopics } from "@/lib/data/feed";
import { eagerIndexes } from "@/lib/feed/masonry";
import { TIME_CHIPS, parseTimeChip, type TimeChip } from "@/lib/feed/select";
import { ItemCard } from "@/components/cards/item-card";
import { CheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return (
    <>
      <h1 className="pt-2 text-2xl font-bold lg:pt-0">Explore</h1>
      <p className="mt-1 text-muted">
        What your sources published lately. Tap anything to open it.
      </p>
      <Suspense fallback={<BoardSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Search = Awaited<PageProps<"/explore">["searchParams"]>;
const one = (v: Search[string]) => (Array.isArray(v) ? v[0] : v);

async function Board({ searchParams }: { searchParams: PageProps<"/explore">["searchParams"] }) {
  const params = await searchParams;
  const topic = one(params.topic);
  const source = one(params.source);
  const time = parseTimeChip(one(params.time));
  const [topics, sources, { items, more }] = await Promise.all([
    getTopics(),
    getSources(),
    getExplore({ topic, source, time }),
  ]);

  const eager = eagerIndexes(items.map((i) => (i.image ? i.image.width / i.image.height : 4 / 3)));

  const href = (next: { topic?: string; source?: string; time?: TimeChip }) => {
    const q = new URLSearchParams();
    if (next.topic) q.set("topic", next.topic);
    if (next.source) q.set("source", next.source);
    if (next.time && next.time !== "any") q.set("time", next.time);
    const s = q.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  const tabs = [
    { key: "all", label: "Everything", href: href({ time }), active: !topic && !source },
    ...topics.map((t) => ({
      key: `t-${t.id}`,
      label: t.name,
      href: href({ topic: t.id, time }),
      active: topic === t.id,
    })),
    ...sources
      .filter((s) => !s.muted)
      .map((s) => ({
        key: `s-${s.id}`,
        label: s.title,
        href: href({ source: s.id, time }),
        active: source === s.id,
      })),
  ];

  return (
    <>
      <nav aria-label="Filter by topic or source" className="mt-5">
        <ul className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <li key={t.key} className="shrink-0">
              <Link
                href={t.href}
                prefetch={false}
                aria-current={t.active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full border px-4 whitespace-nowrap ${
                  t.active
                    ? "border-ink bg-ink font-bold text-bg"
                    : "border-line bg-surface hover:border-ink"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="Filter by time" className="mt-2">
        <ul className="flex flex-wrap gap-2">
          {TIME_CHIPS.map((c) => (
            <li key={c.id}>
              <Link
                href={href({ topic, source, time: c.id })}
                prefetch={false}
                aria-current={time === c.id ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-control px-3 text-sm ${
                  time === c.id
                    ? "bg-accent-soft font-bold text-accent"
                    : "text-muted hover:bg-surface-2"
                }`}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <h2 className="sr-only">Posts</h2>
      <div className="mt-6 columns-2 gap-4 sm:columns-3 lg:columns-4 2xl:columns-5">
        {items.map((item, i) => (
          <ItemCard
            key={item.id}
            item={item}
            priority={eager.has(i)}
            sizes="(min-width: 1536px) 18vw, (min-width: 1024px) 21vw, (min-width: 640px) 30vw, 44vw"
          />
        ))}
      </div>
      <CaughtUp
        shown={items.length}
        more={more}
        filtered={Boolean(topic || source || time !== "any")}
      />
    </>
  );
}

function CaughtUp({ shown, more, filtered }: { shown: number; more: number; filtered: boolean }) {
  const title =
    shown === 0
      ? filtered
        ? "Nothing here right now."
        : "You're caught up."
      : more
        ? "That's this board."
        : "You're caught up.";
  const body =
    shown === 0 && filtered
      ? "Try another topic or length, or come back after the next check."
      : more
        ? `${more} more are waiting. Pick a topic or length to see different ones — there's no rush.`
        : "That's everything new from your sources. Fresh posts arrive through the day.";
  return (
    <section className="mt-4 flex items-start gap-4 rounded-card bg-keep-soft p-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-keep text-white">
        <CheckIcon />
      </span>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1">{body}</p>
      </div>
    </section>
  );
}

function BoardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mt-6 animate-pulse columns-2 gap-4 sm:columns-3 lg:columns-4"
    >
      {[220, 160, 260, 180, 240, 200, 170, 230].map((h, i) => (
        <div key={i} className="mb-4 rounded-card bg-surface-2" style={{ height: h }} />
      ))}
    </div>
  );
}
