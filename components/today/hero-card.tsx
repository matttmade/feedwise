import Link from "next/link";
import type { CardItem } from "@/lib/data/feed";
import { costLabel } from "@/lib/feed/select";
import { CardFrame, KeepButton, SkipButton } from "@/components/cards/card-frame";
import { CardImage } from "@/components/cards/card-image";

/** The one next thing. Its Read/Watch button is the only primary action on the screen. */
export function HeroCard({ item, resuming }: { item: CardItem; resuming: boolean }) {
  const cost = costLabel(item);
  const verb = item.type === "video" ? "Watch" : "Read";

  return (
    <CardFrame
      itemId={item.id}
      title={item.title}
      labelledBy="hero-title"
      className="card lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <Link
        href={`/reader/${item.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block lg:min-h-80"
      >
        <CardImage
          item={item}
          ratio="wide"
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority
          fillOnLarge
        />
      </Link>
      <div className="flex flex-col gap-3 p-5 lg:justify-center lg:p-8">
        <p className="text-sm font-bold tracking-wide text-accent uppercase">
          {resuming ? "Pick up where you left off" : "Your next one"}
        </p>
        <h2 id="hero-title" className="text-xl leading-tight font-bold">
          {item.title}
        </h2>
        <p className="text-muted">
          {item.sourceTitle}
          {cost ? ` · ${cost}` : ""}
          {resuming && item.resumePosition > 0
            ? ` · ${Math.round(item.resumePosition * 100)}% done`
            : ""}
        </p>
        {item.summary && !resuming && <p className="line-clamp-3">{item.summary}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={`/reader/${item.id}`}
            className="flex min-h-12 items-center justify-center rounded-control bg-accent px-6 font-bold text-accent-ink hover:brightness-110"
          >
            {resuming ? `Continue ${verb.toLowerCase()}ing` : verb}
          </Link>
          {!resuming && (
            <>
              <KeepButton
                label="Keep for later"
                className="flex min-h-12 items-center gap-1.5 rounded-control px-4 font-bold text-keep hover:bg-keep-soft"
              />
              <SkipButton
                label="Not today"
                className="flex min-h-12 items-center gap-1.5 rounded-control px-4 text-muted hover:bg-surface-2 hover:text-ink"
              />
            </>
          )}
        </div>
      </div>
    </CardFrame>
  );
}
