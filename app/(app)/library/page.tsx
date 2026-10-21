import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTopics } from "@/lib/data/feed";
import { getLibrary } from "@/lib/data/library";
import { HighlightRow, KeptRow } from "@/components/library/library-rows";
import { Finish } from "@/components/ui/finish";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <div className="max-w-5xl">
      <h1 className="t-display">Library</h1>
      <p className="mt-(--s-2)">Everything you&apos;ve kept and highlighted.</p>
      <Suspense
        fallback={<div aria-hidden="true" className="mt-(--s-5) h-64 animate-pulse bg-tint" />}
      >
        <LibraryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Search = Awaited<PageProps<"/library">["searchParams"]>;
const one = (v: Search[string]) => (Array.isArray(v) ? v[0] : v);

async function LibraryContent({
  searchParams,
}: {
  searchParams: PageProps<"/library">["searchParams"];
}) {
  const params = await searchParams;
  const q = one(params.q)?.trim() || undefined;
  const topic = one(params.topic) || undefined;
  const [topics, { kept, highlights, limited }] = await Promise.all([
    getTopics(),
    getLibrary({ q, topic }),
  ]);

  const href = (next: { topic?: string }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (next.topic) p.set("topic", next.topic);
    const s = p.toString();
    return s ? `/library?${s}` : "/library";
  };
  const empty = !kept.length && !highlights.length;

  return (
    <>
      <form action="/library" method="get" role="search" className="mt-(--s-4)">
        {topic && <input type="hidden" name="topic" value={topic} />}
        <label htmlFor="library-q" className="t-label">
          Search your library
        </label>
        <div className="flex items-end gap-(--s-3)">
          <input
            id="library-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Titles, highlights and notes"
            className="field flex-1"
          />
          <button type="submit" className="link">
            Search →
          </button>
        </div>
      </form>

      {topics.length > 0 && (
        <nav aria-label="Filter by topic" className="mt-(--s-2)">
          <ul className="dots t-label overflow-x-auto">
            {[{ id: "", name: "All topics" }, ...topics].map((t) => {
              const active = (topic ?? "") === t.id;
              return (
                <li key={t.id || "all"}>
                  <Link
                    href={href({ topic: t.id || undefined })}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center whitespace-nowrap decoration-1 underline-offset-4 hover:underline ${
                      active ? "underline" : ""
                    }`}
                  >
                    {t.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {q && (
        <p className="mt-(--s-2) flex flex-wrap items-center gap-x-(--s-3)" role="status">
          {empty ? `Nothing matches “${q}”.` : `Results for “${q}”.`}{" "}
          <Link href={href({ topic })} className="link">
            Clear search
          </Link>
        </p>
      )}

      {kept.length > 0 && (
        <section aria-labelledby="kept-heading" className="mt-(--s-5)">
          <h2 id="kept-heading" className="t-label">
            Kept · {String(kept.length).padStart(2, "0")}
          </h2>
          <ul className="mt-(--s-2) border-t border-rule">
            {kept.map((item, i) => (
              <KeptRow key={item.id} item={item} index={i} />
            ))}
          </ul>
        </section>
      )}

      {highlights.length > 0 && (
        <section aria-labelledby="highlights-heading" className="mt-(--s-6)">
          <h2 id="highlights-heading" className="t-label">
            Highlights · {String(highlights.length).padStart(2, "0")}
          </h2>
          <ul className="mt-(--s-2) border-t border-rule md:columns-2 md:gap-x-(--gutter) [&>li]:break-inside-avoid">
            {highlights.map((h) => (
              <HighlightRow key={h.id} highlight={h} />
            ))}
          </ul>
        </section>
      )}

      {empty && !q ? (
        <Finish label="Start" title="Your Library starts with one Keep.">
          <p>Tap Keep on anything worth remembering, or highlight a passage while reading.</p>
          <Link href="/today" className="link">
            Go to Today →
          </Link>
        </Finish>
      ) : !empty ? (
        <Finish
          title={
            limited
              ? "That's the most recent 60. Search to find older ones."
              : q || topic
                ? "That's everything that matches."
                : "That's everything you've kept."
          }
        />
      ) : null}
    </>
  );
}
