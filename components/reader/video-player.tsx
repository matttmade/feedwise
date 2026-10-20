"use client";

import { useState } from "react";
import { PlayIcon } from "@/components/ui/icons";

/** Poster first. Nothing loads from YouTube/Vimeo, and nothing plays, until the user presses Play. */
export function VideoPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string | null;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-card bg-black">
        <iframe
          src={src}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-card bg-surface-2"
    >
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element -- proxied and sized by /api/img
        <img src={poster} alt="" className="h-full w-full object-cover" fetchPriority="high" />
      )}
      <span className="absolute inset-0 grid place-items-center bg-black/25">
        <span className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black shadow-card group-hover:scale-105">
          <PlayIcon width={20} height={20} />
          Play video
        </span>
      </span>
    </button>
  );
}
