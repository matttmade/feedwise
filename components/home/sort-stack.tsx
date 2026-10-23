"use client";

import Link from "next/link";
import { useState } from "react";
import { keepItem, restoreItem, skipItem } from "@/app/actions/items";
import type { CardItem } from "@/lib/data/feed";
import { costLabel } from "@/lib/feed/select";
import { CardImage } from "@/components/cards/card-image";
import { useSwipe } from "@/components/motion/use-swipe";
import { useToast } from "@/components/ui/toast";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Five items stacked like cards: decide each in a second. Swipe right or press Keep, swipe
 * left or press Skip. Every choice can be undone from the toast. Ends with a tally.
 */
export function SortStack({ items }: { items: CardItem[] }) {
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState(0);
  const toast = useToast();
  const card = items[index];

  const act = (action: "keep" | "skip" | "open") => {
    if (!card || action === "open") return;
    const id = card.id;
    setIndex((i) => i + 1);
    if (action === "keep") setKept((k) => k + 1);
    (action === "keep" ? keepItem(id) : skipItem(id))
      .then((snapshot) =>
        toast(action === "keep" ? "Kept." : "Skipped.", async () => {
          await restoreItem(id, snapshot);
          setIndex((i) => Math.max(0, i - 1));
          if (action === "keep") setKept((k) => Math.max(0, k - 1));
        }),
      )
      .catch(() => toast("That one didn't save. It'll be back later."));
  };

  const swipeRef = useSwipe<HTMLDivElement>({ onAction: act, enabled: Boolean(card) });

  if (!card) {
    return (
      <div className="flex flex-col items-start gap-(--s-2)">
        <p className="t-lead">
          Sorted. {kept ? `${kept} kept for Review.` : "Nothing kept this time."}
        </p>
        <Link href="/explore?mode=swipe" className="link">
          Sort ten more →
        </Link>
      </div>
    );
  }

  const behind = items.slice(index + 1, index + 3);
  const cost = costLabel(card);
  return (
    <div className="lg:grid-12">
      <div className="relative lg:col-span-5">
        {behind
          .map((b, i) => (
            <div
              key={b.id}
              aria-hidden="true"
              className="deck-behind absolute inset-x-0 top-0"
              style={{
                transform: `translate(${(i + 1) * 14}px, ${(i + 1) * -10}px) rotate(${(i + 1) * 2}deg)`,
                zIndex: 2 - i,
              }}
            >
              <CardImage item={b} ratio="wide" sizes="(min-width: 1024px) 40vw, 90vw" gl={false} />
            </div>
          ))
          .reverse()}
        <div key={card.id} ref={swipeRef} className="swipe-card relative z-10 bg-ground">
          <CardImage item={card} ratio="wide" sizes="(min-width: 1024px) 40vw, 90vw" gl={false} />
        </div>
      </div>
      <div className="mt-(--s-4) flex flex-col gap-(--s-3) lg:col-span-6 lg:col-start-7 lg:mt-0 lg:justify-between">
        <div>
          <p className="t-label">
            {pad(index + 1)} / {pad(items.length)} · {card.sourceTitle}
            {cost ? ` · ${cost}` : ""}
          </p>
          <h3 className="t-lead mt-(--s-2)">
            <Link
              href={`/reader/${card.id}`}
              className="decoration-1 underline-offset-4 hover:underline"
            >
              {card.title}
            </Link>
          </h3>
        </div>
        <div
          className="grid grid-cols-2 border-y border-rule"
          role="group"
          aria-label="Keep or skip"
        >
          <button type="button" onClick={() => act("skip")} className="deck-btn justify-start">
            <span aria-hidden="true">←</span>&nbsp;Skip
          </button>
          <button type="button" onClick={() => act("keep")} className="deck-btn justify-end">
            Keep&nbsp;<span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
