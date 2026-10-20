"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { restoreKept, unkeepItem } from "@/app/actions/items";
import { removeHighlight, restoreHighlight } from "@/app/actions/highlights";
import type { CardItem } from "@/lib/data/feed";
import type { LibraryHighlight } from "@/lib/data/library";
import { costLabel } from "@/lib/feed/select";
import { useToast } from "@/components/ui/toast";

export function KeptRow({ item }: { item: CardItem }) {
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
    <li className="card flex items-stretch" aria-busy={pending}>
      <div className="relative w-28 shrink-0 sm:w-40">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- proxied thumbnail
          <img
            src={item.image.src}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-accent-soft" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-sm text-muted">
          {item.sourceTitle}
          {cost ? ` · ${cost}` : ""}
        </p>
        <h3 className="line-clamp-2 font-bold">
          <Link href={`/reader/${item.id}`} className="hover:underline">
            {item.title}
          </Link>
        </h3>
        <div className="mt-auto flex gap-2 pt-1">
          <Link
            href={`/reader/${item.id}`}
            className="flex min-h-11 items-center rounded-control px-3 font-bold text-accent"
          >
            Open
          </Link>
          <button
            type="button"
            onClick={remove}
            className="min-h-11 rounded-control px-3 text-muted hover:text-ink"
          >
            Remove
          </button>
        </div>
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
    <li className="card flex flex-col gap-2 p-4" aria-busy={pending}>
      {highlight.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied thumbnail
        <img
          src={highlight.image}
          alt="Saved image"
          loading="lazy"
          className="max-h-48 self-start rounded-control object-contain"
        />
      ) : (
        <blockquote className="border-l-4 border-accent pl-3">{highlight.text}</blockquote>
      )}
      {highlight.note && <p className="text-muted">Note: {highlight.note}</p>}
      <p className="text-sm text-muted">
        From{" "}
        <Link href={`/reader/${highlight.itemId}`} className="underline underline-offset-2">
          {highlight.itemTitle}
        </Link>
        {highlight.sourceTitle ? ` · ${highlight.sourceTitle}` : ""}
      </p>
      <button
        type="button"
        onClick={remove}
        className="min-h-11 self-start rounded-control px-3 text-muted hover:text-ink"
      >
        Remove
      </button>
    </li>
  );
}
