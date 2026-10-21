"use client";

import { useState } from "react";

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
      <div className="aspect-video overflow-hidden bg-press">
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
      className="group relative block aspect-video w-full overflow-hidden bg-tint"
    >
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element -- proxied and sized by /api/img
        <img src={poster} alt="" className="h-full w-full object-cover" fetchPriority="high" />
      )}
      <span className="absolute inset-0 flex items-end bg-linear-to-b from-transparent to-black/50 p-(--s-3)">
        <span className="t-label text-paper underline-offset-4 group-hover:underline">
          ▶ Play video
        </span>
      </span>
    </button>
  );
}
