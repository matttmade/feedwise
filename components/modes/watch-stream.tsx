"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { keepItem, restoreItem, skipItem } from "@/app/actions/items";
import { costLabel } from "@/lib/feed/select";
import type { WatchItem } from "@/lib/data/feed";
import { useMotion } from "@/lib/motion/use-motion";
import { useToast } from "@/components/ui/toast";
import { BookmarkIcon, CheckIcon, PlayIcon, SkipIcon } from "@/components/ui/icons";

export const WATCH_SESSION = 8;

/**
 * Watch mode: one video per screen in a scroll-snap stream (its own scroll area, never the
 * page). Poster first; players start muted. Autoplay only if switched on in Settings.
 * Eight videos, then a break card.
 */
export function WatchStream({ items, autoplay }: { items: WatchItem[]; autoplay: boolean }) {
  const streamRef = useRef<HTMLDivElement>(null);
  const motion = useMotion();
  const [visible, setVisible] = useState<string | null>(null);

  useEffect(() => {
    const root = streamRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setVisible((e.target as HTMLElement).dataset.id ?? null);
      },
      { root, threshold: 0.7 },
    );
    root.querySelectorAll("[data-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const go = (dir: 1 | -1) => {
    const root = streamRef.current;
    if (!root) return;
    root.scrollBy({
      top: dir * root.clientHeight,
      behavior: motion === "full" ? "smooth" : "auto",
    });
  };

  if (!items.length) {
    return (
      <section className="mt-6 flex max-w-xl flex-col items-start gap-3 rounded-card bg-keep-soft p-6">
        <h2 className="text-xl font-bold">No new videos right now.</h2>
        <p>When your sources post videos they&apos;ll show up here, one at a time.</p>
      </section>
    );
  }

  return (
    <div
      ref={streamRef}
      tabIndex={0}
      role="region"
      aria-label="Video stream. Use the up and down arrows to move between videos."
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "PageDown") {
          e.preventDefault();
          go(1);
        } else if (e.key === "ArrowUp" || e.key === "PageUp") {
          e.preventDefault();
          go(-1);
        }
      }}
      className="watch-stream mt-4 -mx-4 snap-y snap-mandatory overflow-y-auto overscroll-contain sm:mx-0 sm:rounded-card"
    >
      {items.slice(0, WATCH_SESSION).map((item, i) => (
        <WatchSlide
          key={item.id}
          item={item}
          position={`${i + 1} of ${Math.min(items.length, WATCH_SESSION)}`}
          autoplay={autoplay && visible === item.id}
        />
      ))}
      <section className="watch-slide flex snap-start flex-col items-center justify-center gap-3 bg-keep-soft p-6 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-keep text-white">
          <CheckIcon />
        </span>
        <h2 className="text-2xl font-bold">Nice session. Time for a breather.</h2>
        <p className="max-w-sm">
          That&apos;s {Math.min(items.length, WATCH_SESSION)} videos. Kept ones come back in Review.
        </p>
        <Link
          href="/today"
          className="min-h-12 rounded-control bg-keep px-5 py-3 font-bold text-white"
        >
          Back to Today
        </Link>
      </section>
    </div>
  );
}

function WatchSlide({
  item,
  position,
  autoplay,
}: {
  item: WatchItem;
  position: string;
  autoplay: boolean;
}) {
  const [clicked, setClicked] = useState(false);
  const [state, setState] = useState<"none" | "kept" | "skipped">("none");
  const [pending, start] = useTransition();
  const toast = useToast();
  const playing = (clicked || autoplay) && item.player;
  const cost = costLabel(item);

  const act = (kind: "kept" | "skipped") =>
    start(async () => {
      const before = await (kind === "kept" ? keepItem(item.id) : skipItem(item.id));
      setState(kind);
      toast(kind === "kept" ? "Kept." : "Skipped.", async () => {
        await restoreItem(item.id, before);
        setState("none");
      });
    });

  return (
    <section
      data-id={item.id}
      aria-labelledby={`w-${item.id}`}
      className="watch-slide flex snap-start flex-col bg-black text-white"
    >
      <div className="relative flex flex-1 items-center justify-center">
        {playing ? (
          <iframe
            src={item.player!}
            title={item.title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            className="aspect-video w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setClicked(true)}
            className="group relative block aspect-video w-full"
            aria-label={`Play ${item.title} (starts muted)`}
          >
            {item.poster && (
              // eslint-disable-next-line @next/next/no-img-element -- proxied poster
              <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/30">
              <span className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black">
                <PlayIcon width={20} height={20} />
                Play
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 bg-black/90 p-4">
        <p className="text-sm text-white/70">
          {position} · {item.sourceTitle}
          {cost ? ` · ${cost}` : ""}
        </p>
        <h2 id={`w-${item.id}`} className="line-clamp-2 text-lg font-bold">
          {item.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => act("kept")}
            disabled={pending || state !== "none"}
            className="flex min-h-11 items-center gap-1.5 rounded-control bg-white px-4 font-bold text-black disabled:opacity-60"
          >
            <BookmarkIcon width={18} height={18} />
            {state === "kept" ? "Kept" : "Keep"}
          </button>
          <button
            type="button"
            onClick={() => act("skipped")}
            disabled={pending || state !== "none"}
            className="flex min-h-11 items-center gap-1.5 rounded-control px-4 text-white/80 ring-1 ring-white/30 disabled:opacity-60"
          >
            <SkipIcon width={18} height={18} />
            {state === "skipped" ? "Skipped" : "Skip"}
          </button>
          <Link
            href={`/reader/${item.id}`}
            className="flex min-h-11 items-center rounded-control px-4 text-white/80 underline underline-offset-4"
          >
            Details
          </Link>
        </div>
      </div>
    </section>
  );
}
