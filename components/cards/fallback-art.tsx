import type { CardItem } from "@/lib/data/feed";
import { ArticleIcon, ImageIcon, VideoIcon } from "@/components/ui/icons";

const PALETTE = [
  ["#2f55c9", "#7a95e8"],
  ["#1d7348", "#6fbf94"],
  ["#8a4fbf", "#c3a1e6"],
  ["#b5562a", "#e8a37f"],
  ["#2a7a8c", "#7cc3d1"],
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** When an item has no usable image: a calm gradient per source with the type and source name. */
export function FallbackArt({
  item,
}: {
  item: Pick<CardItem, "type" | "sourceTitle" | "sourceId">;
}) {
  const [from, to] = PALETTE[hash(item.sourceId) % PALETTE.length];
  const Icon =
    item.type === "video" ? VideoIcon : item.type === "image_set" ? ImageIcon : ArticleIcon;
  return (
    <div
      aria-hidden="true"
      className="art"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <Icon width={28} height={28} />
      <span className="line-clamp-2 text-lg font-bold drop-shadow-sm">{item.sourceTitle}</span>
    </div>
  );
}
