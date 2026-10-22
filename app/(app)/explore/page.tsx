import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getExplore, getSettings, getSources, getTopics, getWatchItems } from "@/lib/data/feed";
import { effectivePrefs } from "@/lib/prefs";
import { eagerIndexes } from "@/lib/feed/masonry";
import { TIME_CHIPS, parseTimeChip, type TimeChip } from "@/lib/feed/select";
import { ItemCard } from "@/components/cards/item-card";
import { LeanBoard } from "@/components/motion/lean-board";
import { SwipeDeck } from "@/components/modes/swipe-deck";
import { WatchStream } from "@/components/modes/watch-stream";
import { Finish } from "@/components/ui/finish";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return (
    <>
      <h1 className="t-display">Explore</h1>
      <Suspense fallback={<BoardSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Search = Awaited<PageProps<"/explore">["searchParams"]>;
const one = (v: Search[string]) => (Array.isArray(v) ? v[0] : v);

const MODES = [
  { id: "board", label: "Board" },
  { id: "swipe", label: "Swipe" },
  { id: "watch", label: "Watch" },
] as const;
type Mode = (typeof MODES)[number]["id"];
const parseMode = (v: unknown): Mode => (MODES.some((m) => m.id === v) ? (v as Mode) : "board");

async function Board({ searchParams }: { searchParams: PageProps<"/explore">["searchParams"] }) {
  const params = await searchParams;
  const topic = one(params.topic);
  const source = one(params.source);
  const time = parseTimeChip(one(params.time));
  const mode = parseMode(one(params.mode));
  const [topics, sources, { items, more }, settings] = await Promise.all([
    getTopics(),
    getSources(),
    getExplore({ topic, source, time }),
    getSettings(),
  ]);
  const prefs = effectivePrefs(settings);
  const watchItems = mode === "watch" ? await getWatchItems({ topic, source }, prefs.captions) : [];

  const eager = eagerIndexes(items.map((i) => (i.image ? i.image.width / i.image.height : 4 / 3)));

  const href = (next: { topic?: string; source?: string; time?: TimeChip; mode?: Mode }) => {
    const q = new URLSearchParams();
    const m = next.mode ?? mode;
    if (m !== "board") q.set("mode", m);
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
      <nav aria-label="View" className="mt-(--s-3)">
        <ul className="flex gap-(--s-4)">
          {MODES.map((m) => (
            <li key={m.id}>
              <Link
                href={href({ topic, source, time, mode: m.id })}
                aria-current={mode === m.id ? "page" : undefined}
                className={`flex min-h-11 items-center decoration-1 underline-offset-[6px] hover:underline ${
                  mode === m.id ? "underline" : ""
                }`}
              >
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-y border-rule">
        <nav aria-label="Filter by topic or source">
          <ul className="dots t-label -mx-(--gutter) overflow-x-auto px-(--gutter)">
            {tabs.map((t) => (
              <li key={t.key}>
                <FilterLink href={t.href} active={t.active}>
                  {t.label}
                </FilterLink>
              </li>
            ))}
          </ul>
        </nav>
        {mode !== "watch" && (
          <nav aria-label="Filter by time" className="border-t border-rule">
            <ul className="dots t-label flex-wrap">
              {TIME_CHIPS.map((c) => (
                <li key={c.id}>
                  <FilterLink href={href({ topic, source, time: c.id })} active={time === c.id}>
                    {c.label}
                  </FilterLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {mode === "swipe" ? (
        <SwipeDeck items={items} more={more} />
      ) : mode === "watch" ? (
        <WatchStream items={watchItems} autoplay={prefs.autoplay} />
      ) : (
        <>
          <h2 className="sr-only">Posts</h2>
          <LeanBoard className="board mt-(--s-5)">
            {items.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                index={i}
                priority={eager.has(i)}
                morph
                sizes="(min-width: 1536px) 18vw, (min-width: 1024px) 21vw, (min-width: 640px) 30vw, 44vw"
              />
            ))}
          </LeanBoard>
          <CaughtUp
            shown={items.length}
            more={more}
            filtered={Boolean(topic || source || time !== "any")}
          />
        </>
      )}
    </>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center whitespace-nowrap decoration-1 underline-offset-4 hover:underline ${
        active ? "underline" : ""
      }`}
    >
      {children}
    </Link>
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
    <Finish title={title}>
      <p>{body}</p>
    </Finish>
  );
}

function BoardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mt-(--s-5) animate-pulse columns-2 gap-x-(--gutter) sm:columns-3 lg:columns-4"
    >
      {[220, 160, 260, 180, 240, 200, 170, 230].map((h, i) => (
        <div key={i} className="mb-(--s-5) bg-tint" style={{ height: h }} />
      ))}
    </div>
  );
}
