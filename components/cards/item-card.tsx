import Link from "next/link";
import type { CardItem } from "@/lib/data/feed";
import { costLabel } from "@/lib/feed/select";
import { PlayIcon } from "@/components/ui/icons";
import { CardFrame, KeepButton, SkipButton } from "./card-frame";
import { CardImage } from "./card-image";

type Props = {
  item: CardItem;
  sizes: string;
  layout?: "board" | "row";
  /** Above-the-fold cards load eagerly so the largest image isn't held back by lazy loading. */
  priority?: boolean;
};

/** A feed item: image first, a short label, the cost, and Keep / Skip. */
export function ItemCard({ item, sizes, layout = "board", priority = false }: Props) {
  const href = `/reader/${item.id}`;
  const cost = costLabel(item);
  const titleId = `t-${item.id}`;

  return (
    <CardFrame
      itemId={item.id}
      title={item.title}
      labelledBy={titleId}
      className={
        layout === "board"
          ? "card relative mb-4 break-inside-avoid"
          : "card relative grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:block"
      }
    >
      <div className="relative">
        <CardImage
          item={item}
          sizes={sizes}
          ratio={layout === "row" ? "wide" : "native"}
          priority={priority}
        />
        {item.type === "video" && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-sm text-white">
            <PlayIcon width={14} height={14} />
            {cost ?? "Video"}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <p className="text-sm text-muted">
          {item.sourceTitle}
          {cost && item.type !== "video" ? ` · ${cost}` : ""}
        </p>
        <h3 id={titleId} className="line-clamp-3 text-base leading-snug font-bold">
          {/* One link per card, stretched over the whole card; the buttons sit above it. */}
          <Link href={href} className="after:absolute after:inset-0 hover:underline">
            {item.title}
          </Link>
        </h3>
        <div className="relative z-10 mt-1 flex gap-2">
          <KeepButton className="card-btn bg-keep-soft font-bold text-keep" />
          <SkipButton className="card-btn bg-surface-2 text-muted hover:text-ink" />
        </div>
      </div>
    </CardFrame>
  );
}
