import type { CardItem } from "@/lib/data/feed";

const TYPE_LABEL = { video: "Video", image_set: "Images", article: "Article" } as const;

/** When an item has no usable image: the source's name set as type on a faint tint. */
export function FallbackArt({
  item,
}: {
  item: Pick<CardItem, "type" | "sourceTitle" | "sourceId">;
}) {
  return (
    <div aria-hidden="true" className="art text-ink">
      <span className="t-label">{TYPE_LABEL[item.type] ?? "Post"}</span>
      <span className="t-lead line-clamp-3 italic">{item.sourceTitle}</span>
    </div>
  );
}
