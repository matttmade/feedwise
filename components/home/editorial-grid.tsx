import type { CardItem } from "@/lib/data/feed";
import { ItemCard } from "@/components/cards/item-card";

/**
 * Items placed like a magazine spread on the 12-column grid: a repeating rhythm of wide,
 * narrow and offset placements so several items share one view. Each flies in as it
 * scrolls into view. Phones get one column with alternating insets.
 */
const PLACEMENTS = [
  { cls: "lg:col-span-7", sizes: "(min-width: 1024px) 58vw, 85vw", summary: true },
  { cls: "lg:col-span-4 lg:col-start-9 lg:mt-(--s-7)", sizes: "(min-width: 1024px) 33vw, 85vw" },
  { cls: "lg:col-span-5 lg:col-start-2", sizes: "(min-width: 1024px) 42vw, 85vw" },
  { cls: "lg:col-span-5 lg:col-start-8 lg:mt-(--s-6)", sizes: "(min-width: 1024px) 42vw, 85vw" },
  { cls: "lg:col-span-8 lg:col-start-3", sizes: "(min-width: 1024px) 66vw, 85vw", summary: true },
];
const INSETS = ["mr-[12%]", "ml-[12%]"];

export function EditorialGrid({ items, start = 0 }: { items: CardItem[]; start?: number }) {
  return (
    <div className="flex flex-col gap-(--s-6) lg:grid-12 lg:gap-y-(--s-6)">
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
            className={`fly-in ${INSETS[i % 2]} lg:mx-0 ${p.cls}`}
          />
        );
      })}
    </div>
  );
}
