"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { restoreKept, unkeepItem } from "@/app/actions/items";
import { removeHighlight, restoreHighlight } from "@/app/actions/highlights";
import type { CardItem } from "@/lib/data/feed";
import type { LibraryHighlight } from "@/lib/data/library";
import { costLabel } from "@/lib/feed/select";
import { useToast } from "@/components/ui/toast";

/** One row of the index: number, thumbnail, title, source and cost, then Open / Remove. */
export function KeptRow({ item, index }: { item: CardItem; index: number }) {
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  if (hidden) return null;
  const cost = costLabel(item);

  const remove = () =>
    start(async () => {
      setHidden(true);
      const snapshot = await unkeepItem(item.id);
      toast("Removed from your Library.", async () => {
        await restoreKept(item.id, snapshot);
        setHidden(false);
      });
    });

  return (
    <li
      className="grid grid-cols-[2rem_4rem_minmax(0,1fr)] items-start gap-x-(--s-3) border-b border-rule py-(--s-3) sm:grid-cols-[2.5rem_6rem_minmax(0,1fr)_auto]"
      aria-busy={pending}
    >
      <span className="t-label pt-1">{String(index + 1).padStart(2, "0")}</span>
      <div className="relative aspect-4/3 bg-tint">
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element -- proxied thumbnail
          <img
            src={item.image.src}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-(--s-1)">
        <h3 className="font-display text-(length:--t-lead) leading-(--lh-snug) font-light">
          <Link
            href={`/reader/${item.id}`}
            className="decoration-1 underline-offset-4 hover:underline"
          >
            {item.title}
          </Link>
        </h3>
        <p className="t-label">
          {item.sourceTitle}
          {cost ? ` · ${cost}` : ""}
        </p>
      </div>
      <div className="t-label col-start-3 flex gap-(--s-3) sm:col-start-auto">
        <Link href={`/reader/${item.id}`} className="link">
          Open
        </Link>
        <button type="button" onClick={remove} className="link">
          Remove
        </button>
      </div>
    </li>
  );
}

export function HighlightRow({ highlight }: { highlight: LibraryHighlight }) {
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  if (hidden) return null;

  const remove = () =>
    start(async () => {
      setHidden(true);
      const snapshot = await removeHighlight(highlight.id);
      toast(
        "Highlight removed.",
        snapshot
          ? async () => {
              await restoreHighlight(snapshot);
              setHidden(false);
            }
          : undefined,
      );
    });

  return (
    <li className="flex flex-col gap-(--s-2) border-b border-rule py-(--s-3)" aria-busy={pending}>
      {highlight.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied thumbnail
        <img
          src={highlight.image}
          alt="Saved image"
          loading="lazy"
          className="max-h-48 self-start object-contain"
        />
      ) : (
        <blockquote className="t-lead border-l border-rule pl-(--s-3)">{highlight.text}</blockquote>
      )}
      {highlight.note && (
        <p>
          <span className="t-label mr-(--s-2)">Note</span>
          {highlight.note}
        </p>
      )}
      <p className="t-label">
        From{" "}
        <Link href={`/reader/${highlight.itemId}`} className="underline underline-offset-4">
          {highlight.itemTitle}
        </Link>
        {highlight.sourceTitle ? ` · ${highlight.sourceTitle}` : ""}
      </p>
      <button type="button" onClick={remove} className="t-label link self-start">
        Remove
      </button>
    </li>
  );
}
