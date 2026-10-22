import type { CardItem } from "@/lib/data/feed";
import { ItemCard } from "@/components/cards/item-card";

/** A row you swipe through sideways (its own scroller, snap per item). Ends on `end`. */
export function SwipeRow({
  items,
  label,
  end,
}: {
  items: CardItem[];
  label: string;
  end: React.ReactNode;
}) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="swipe-row">
      {items.map((item, i) => (
        <ItemCard
          key={item.id}
          item={item}
          layout="editorial"
          index={i}
          sizes="(min-width: 1024px) 22rem, 78vw"
        />
      ))}
      <div className="flex flex-col justify-end border-l border-rule pl-(--s-3)">{end}</div>
    </div>
  );
}
