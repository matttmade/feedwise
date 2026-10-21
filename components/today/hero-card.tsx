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
      className="card lg:grid-12 gap-y-(--s-3)"
    >
      <Link
        href={`/reader/${item.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="-mx-(--gutter) block sm:mx-0 lg:col-span-7 lg:min-h-96"
      >
        <CardImage
          item={item}
          ratio="wide"
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority
          fillOnLarge
        />
      </Link>
      <div className="mt-(--s-3) flex flex-col gap-(--s-3) lg:col-span-5 lg:mt-0 lg:justify-end">
        <p className="t-label">{resuming ? "Pick up where you left off" : "Your next one"}</p>
        <h2 id="hero-title" className="t-lead">
          {item.title}
        </h2>
        <p className="t-label">
          {item.sourceTitle}
          {cost ? ` · ${cost}` : ""}
          {resuming && item.resumePosition > 0
            ? ` · ${Math.round(item.resumePosition * 100)}% done`
            : ""}
        </p>
        {item.summary && !resuming && (
          <p className="line-clamp-3 max-w-[62ch] text-muted">{item.summary}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-(--s-4) gap-y-(--s-2)">
          <Link href={`/reader/${item.id}`} className="btn">
            {resuming ? `Continue ${verb.toLowerCase()}ing` : verb} →
          </Link>
          {!resuming && (
            <>
              <KeepButton label="Keep for later" className="link" />
              <SkipButton label="Not today" className="link" />
            </>
          )}
        </div>
      </div>
    </CardFrame>
  );
}
