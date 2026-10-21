"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { keepItem, restoreItem, skipItem } from "@/app/actions/items";
import { costLabel } from "@/lib/feed/select";
import type { WatchItem } from "@/lib/data/feed";
import { useMotion } from "@/lib/motion/use-motion";
import { useToast } from "@/components/ui/toast";
import { Finish } from "@/components/ui/finish";

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
      <Finish title="No new videos right now.">
        <p>When your sources post videos they&apos;ll show up here, one at a time.</p>
      </Finish>
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
      className="watch-stream mt-(--s-4) -mx-(--gutter) snap-y snap-mandatory overflow-y-auto overscroll-contain bg-press text-paper antialiased"
    >
      {items.slice(0, WATCH_SESSION).map((item, i) => (
        <WatchSlide
          key={item.id}
          item={item}
          position={`${pad(i + 1)} / ${pad(Math.min(items.length, WATCH_SESSION))}`}
          autoplay={autoplay && visible === item.id}
        />
      ))}
      <section className="watch-slide flex snap-start flex-col justify-end gap-(--s-3) p-(--gutter) pb-(--s-5)">
        <p className="t-label">End</p>
        <h2 className="t-display max-w-[14ch]">
          Nice session. Time for a <em>breather</em>.
        </h2>
        <p className="max-w-[62ch]">
          That&apos;s {Math.min(items.length, WATCH_SESSION)} videos. Kept ones come back in Review.
        </p>
        <Link href="/today" className="link self-start">
          Back to Today →
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
      className="watch-slide flex snap-start flex-col"
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {playing ? (
          <iframe
            src={item.player!}
            title={item.title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            className="aspect-video max-h-full w-full lg:h-full lg:w-auto lg:max-w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setClicked(true)}
            className="group relative block aspect-video max-h-full w-full lg:h-full lg:w-auto lg:max-w-full"
            aria-label={`Play ${item.title} (starts muted)`}
          >
            {item.poster && (
              // eslint-disable-next-line @next/next/no-img-element -- proxied poster
              <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className="absolute inset-0 flex items-end bg-linear-to-b from-transparent to-black/50 p-(--gutter)">
              <span className="t-label text-paper underline-offset-4 group-hover:underline">
                ▶ Play, muted
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-(--s-1) px-(--gutter) pt-(--s-3) pb-(--s-2)">
        <p className="t-label">
          {position} · {item.sourceTitle}
          {cost ? ` · ${cost}` : ""}
        </p>
        <h2 id={`w-${item.id}`} className="t-lead line-clamp-2">
          {item.title}
        </h2>
        <div className="flex flex-wrap gap-x-(--s-4)">
          <button
            type="button"
            onClick={() => act("kept")}
            disabled={pending || state !== "none"}
            className="link"
          >
            {state === "kept" ? "Kept" : "Keep"}
          </button>
          <button
            type="button"
            onClick={() => act("skipped")}
            disabled={pending || state !== "none"}
            className="link"
          >
            {state === "skipped" ? "Skipped" : "Skip"}
          </button>
          <Link href={`/reader/${item.id}`} className="link">
            Details →
          </Link>
        </div>
      </div>
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
