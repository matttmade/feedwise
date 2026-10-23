import type { CardItem } from "@/lib/data/feed";
import { ItemCard } from "@/components/cards/item-card";

/**
 * Items placed like a magazine spread on the 12-column grid: a repeating rhythm of wide,
 * narrow and offset placements so several items share one view. Each flies in as it
 * scrolls into view. Phones get one column with alternating insets.
 */
const PLACEMENTS = [
  {
    cls: "lg:col-span-7",
    sizes: "(min-width: 1024px) 58vw, 85vw",
    summary: true,
    speed: 1,
    lag: 0.08,
  },
  {
    cls: "lg:col-span-4 lg:col-start-9 lg:mt-[calc(var(--s-7)*var(--k-stagger,1))]",
    sizes: "(min-width: 1024px) 33vw, 85vw",
    speed: 1.14,
    lag: 0.38,
  },
  {
    cls: "lg:col-span-5 lg:col-start-2",
    sizes: "(min-width: 1024px) 42vw, 85vw",
    speed: 0.93,
    lag: 0.22,
  },
  {
    cls: "lg:col-span-5 lg:col-start-8 lg:mt-[calc(var(--s-6)*var(--k-stagger,1))]",
    sizes: "(min-width: 1024px) 42vw, 85vw",
    speed: 1.08,
    lag: 0.45,
  },
  {
    cls: "lg:col-span-8 lg:col-start-3",
    sizes: "(min-width: 1024px) 66vw, 85vw",
    summary: true,
    speed: 0.97,
    lag: 0.15,
  },
];
const INSETS = ["mr-[12%]", "ml-[12%]"];

export function EditorialGrid({ items, start = 0 }: { items: CardItem[]; start?: number }) {
  return (
    <div className="editorial-grid flex flex-col gap-[calc(var(--s-6)*var(--k-gap,1))] lg:grid-12 lg:gap-y-[calc(var(--s-6)*var(--k-gap,1))]">
      {items.map((item, i) => {
        const p = PLACEMENTS[i % PLACEMENTS.length];
        return (
          <ItemCard
            key={item.id}
            item={item}
            layout="editorial"
            index={start + i}
            morph
            priority={i < 2}
            sizes={p.sizes}
            withSummary={p.summary}
            depth={{ speed: p.speed, lag: p.lag }}
            className={`fly-in ${INSETS[i % 2]} lg:mx-0 ${p.cls}`}
          />
        );
      })}
    </div>
  );
}
