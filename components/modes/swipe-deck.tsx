"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition, ViewTransition } from "react";
import { keepItem, restoreItem, skipItem, type Snapshot } from "@/app/actions/items";
import type { CardItem } from "@/lib/data/feed";
import { costLabel } from "@/lib/feed/select";
import { CardImage } from "@/components/cards/card-image";
import { useSwipe } from "@/components/motion/use-swipe";
import { Finish } from "@/components/ui/finish";

export const DECK_SIZE = 10;

type Outcome = "keep" | "skip" | "open";
type Done = { item: CardItem; outcome: Outcome; snapshot?: Snapshot };

/**
 * Swipe mode: one card in focus, the next two waiting (grey until they're up). Right keeps,
 * left skips, up opens; every gesture also has a button and a key. Ten cards, then a summary.
 */
export function SwipeDeck({ items, more }: { items: CardItem[]; more: number }) {
  const router = useRouter();
  const [queue, setQueue] = useState(() => items.slice(0, DECK_SIZE));
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Done[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  // Each swipe saves on its own, so fast swiping never waits on the previous card.
  const [undoing, startUndo] = useTransition();
  // Keep/Skip refresh the server data; the deck ignores that until you ask for another set.
  const [seen, setSeen] = useState(items);
  const [wantNext, setWantNext] = useState(false);
  if (items !== seen) {
    setSeen(items);
    if (wantNext) {
      setQueue(items.slice(0, DECK_SIZE));
      setIndex(0);
      setDone([]);
      setMessage(null);
      setWantNext(false);
    }
  }

  const card = queue[index];

  const act = useCallback(
    (outcome: Outcome) => {
      if (!card || undoing) return;
      setIndex((i) => i + 1);
      if (outcome === "open") {
        setDone((d) => [...d, { item: card, outcome }]);
        router.push(`/reader/${card.id}`);
        return;
      }
      setMessage(outcome === "keep" ? `Kept “${short(card.title)}”.` : "Skipped.");
      // Count it now (the summary is exact); attach Undo's snapshot once the save lands.
      setDone((d) => [...d, { item: card, outcome }]);
      (outcome === "keep" ? keepItem(card.id) : skipItem(card.id))
        .then((snapshot) =>
          setDone((d) => d.map((x) => (x.item.id === card.id ? { ...x, snapshot } : x))),
        )
        .catch(() => setMessage("That one didn't save. It'll be back in Explore."));
    },
    [card, undoing, router],
  );

  const undo = () => {
    const last = done.at(-1);
    if (!last?.snapshot) return;
    startUndo(async () => {
      await restoreItem(last.item.id, last.snapshot!);
      setDone((d) => d.slice(0, -1));
      setIndex((i) => i - 1);
      setMessage("Undone. It's back on top.");
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      const key = e.key.toLowerCase();
      const map: Record<string, Outcome> = {
        arrowright: "keep",
        k: "keep",
        arrowleft: "skip",
        x: "skip",
        arrowup: "open",
      };
      if (key === "enter" && (e.target as HTMLElement).closest("a, button")) return;
      const outcome = map[key] ?? (key === "enter" ? "open" : undefined);
      if (!outcome) return;
      e.preventDefault();
      act(outcome);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  const swipeRef = useSwipe<HTMLDivElement>({
    onAction: (a) => act(a),
    allowUp: true,
    enabled: Boolean(card) && !undoing,
  });

  if (!queue.length) {
    return (
      <Summary title="Nothing new to swipe. You're caught up." done={[]}>
        <Link href="/today" className="link">
          Back to Today →
        </Link>
      </Summary>
    );
  }

  if (!card) {
    const left = Math.max(0, more + items.length - DECK_SIZE);
    return (
      <Summary title={`That's ${queue.length}.`} done={done}>
        {left > 0 && (
          <button
            type="button"
            onClick={() => {
              setWantNext(true);
              router.refresh();
            }}
            className="btn"
          >
            Another set →
          </button>
        )}
        <Link href="/today" className="link">
          Back to Today
        </Link>
      </Summary>
    );
  }

  const behind = queue.slice(index + 1, index + 3);
  const cost = costLabel(card);

  return (
    <section aria-labelledby="deck-title" className="mx-auto mt-(--s-4) flex max-w-md flex-col">
      <div className="t-label flex items-center gap-(--s-3)">
        <span>
          {pad(index + 1)} / {pad(queue.length)}
        </span>
        <progress
          value={index}
          max={queue.length}
          aria-label="Set progress"
          className="meter flex-1"
        />
        <span className="sm:hidden">Swipe, hold or tap</span>
      </div>
      <p role="status" aria-live="polite" className="flex min-h-11 items-center gap-(--s-3)">
        {message}
        {message && done.at(-1)?.snapshot && message !== "Undone. It's back on top." && (
          <button type="button" onClick={undo} disabled={undoing} className="link">
            Undo
          </button>
        )}
      </p>

      <div className="relative">
        {behind
          .map((b, i) => (
            <div
              key={b.id}
              aria-hidden="true"
              className="deck-behind absolute inset-x-0 top-0"
              style={{
                transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.04})`,
                zIndex: 2 - i,
              }}
            >
              <CardImage item={b} ratio="wide" sizes="400px" gl={false} />
            </div>
          ))
          .reverse()}
        <div key={card.id} ref={swipeRef} className="swipe-card relative z-10 bg-ground">
          <ViewTransition name={`card-${card.id}`} share="morph" default="none">
            <div>
              <CardImage
                item={card}
                ratio="wide"
                sizes="(min-width: 480px) 448px, 100vw"
                priority
                gl={false}
              />
            </div>
          </ViewTransition>
          <div className="flex flex-col gap-(--s-2) pt-(--s-3) pb-(--s-2)">
            <p className="t-label">
              {card.sourceTitle}
              {cost ? ` · ${cost}` : ""}
            </p>
            <h2 id="deck-title" className="t-lead line-clamp-3">
              {card.title}
            </h2>
            {card.summary && (
              <p className="line-clamp-2 text-muted max-sm:hidden">{card.summary}</p>
            )}
          </div>
        </div>
      </div>

      {/* On phones the buttons stay just above the tab bar, in thumb reach, whatever the card's height. */}
      <div
        className="sticky bottom-[calc(var(--bar)+env(safe-area-inset-bottom))] z-20 grid grid-cols-3 border-y border-rule bg-ground lg:static"
        role="group"
        aria-label="What to do with this card"
      >
        <button
          type="button"
          onClick={() => act("skip")}
          disabled={undoing}
          aria-keyshortcuts="ArrowLeft X"
          className="deck-btn justify-start"
        >
          <span aria-hidden="true">←</span> Skip
        </button>
        <button
          type="button"
          onClick={() => act("open")}
          aria-keyshortcuts="ArrowUp Enter"
          className="deck-btn justify-center"
        >
          <span aria-hidden="true">↑</span> Open
        </button>
        <button
          type="button"
          onClick={() => act("keep")}
          disabled={undoing}
          aria-keyshortcuts="ArrowRight K"
          className="deck-btn justify-end"
        >
          Keep <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="t-label mt-(--s-3) text-muted max-sm:hidden">
        Swipe right to keep, left to skip, up to open — or hold to keep. Keys: ← → ↑
      </p>
    </section>
  );
}

function Summary({
  title,
  done,
  children,
}: {
  title: string;
  done: Done[];
  children: React.ReactNode;
}) {
  const count = (o: Outcome) => done.filter((d) => d.outcome === o).length;
  const parts = [
    count("keep") && `${count("keep")} kept`,
    count("skip") && `${count("skip")} skipped`,
    count("open") && `${count("open")} opened`,
  ].filter(Boolean);
  return (
    <Finish title={title}>
      {parts.length > 0 && <p>{parts.join(" · ")}. Kept ones will come back in Review.</p>}
      <div className="flex flex-wrap items-center gap-x-(--s-4)">{children}</div>
    </Finish>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const short = (t: string) => (t.length > 40 ? `${t.slice(0, 38)}…` : t);
