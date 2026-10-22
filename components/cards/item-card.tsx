import Link from "next/link";
import { ViewTransition } from "react";
import type { CardItem } from "@/lib/data/feed";
import { costLabel } from "@/lib/feed/select";
import { CardFrame, KeepButton, SkipButton } from "./card-frame";
import { CardImage } from "./card-image";

type Props = {
  item: CardItem;
  sizes: string;
  /** board: masonry column · row: compact · editorial: placed on the home grid by `className`. */
  layout?: "board" | "row" | "editorial";
  /** Extra classes for the card itself (grid placement, fly-in). */
  className?: string;
  /** Show the summary under the title (wide editorial placements). */
  withSummary?: boolean;
  /** Above-the-fold cards load eagerly so the largest image isn't held back by lazy loading. */
  priority?: boolean;
  /** Name the image so it morphs into the same card in Swipe or the Reader. Unique per page. */
  morph?: boolean;
  /** Position in the set, shown zero-padded like a catalogue number. */
  index?: number;
};

/** A feed item: image first, then a caption: number, source and cost, title, Keep / Skip. */
export function ItemCard({
  item,
  sizes,
  layout = "board",
  priority = false,
  morph = false,
  index,
  className = "",
  withSummary = false,
}: Props) {
  const href = `/reader/${item.id}`;
  const cost = costLabel(item);
  const meta = item.type === "video" && cost && cost !== "Video" ? `Video ${cost}` : cost;
  const titleId = `t-${item.id}`;

  return (
    <CardFrame
      itemId={item.id}
      title={item.title}
      labelledBy={titleId}
      className={`${
        layout === "board"
          ? "card relative mb-(--s-5) break-inside-avoid"
          : layout === "editorial"
            ? "card relative"
            : "card relative grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-(--s-3) sm:block"
      } ${className}`}
    >
      <div className="relative">
        {morph ? (
          <ViewTransition name={`card-${item.id}`} share="morph" default="none">
            <div>
              <CardImage item={item} sizes={sizes} ratio="native" priority={priority} />
            </div>
          </ViewTransition>
        ) : (
          <CardImage
            item={item}
            sizes={sizes}
            ratio={layout === "row" ? "wide" : "native"}
            priority={priority}
          />
        )}
      </div>
      <div className="flex flex-col pt-(--s-2) sm:pt-(--s-3)">
        <p className="t-label">
          {index !== undefined && (
            <span className="mr-(--s-2)">{String(index + 1).padStart(2, "0")}</span>
          )}
          {item.sourceTitle}
          {meta ? ` · ${meta}` : ""}
        </p>
        <h3 id={titleId} className="t-lead mt-(--s-1) line-clamp-3">
          {/* One link per card, stretched over the whole card; the buttons sit above it. */}
          <Link
            href={href}
            className="decoration-1 underline-offset-4 after:absolute after:inset-0 hover:underline"
          >
            {item.title}
          </Link>
        </h3>
        {withSummary && item.summary && (
          <p className="mt-(--s-2) line-clamp-3 max-w-[52ch] text-muted">{item.summary}</p>
        )}
        <div className="relative z-10 flex">
          <KeepButton className="card-btn" />
          <SkipButton className="card-btn" />
        </div>
      </div>
    </CardFrame>
  );
}
