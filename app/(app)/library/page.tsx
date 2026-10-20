import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTopics } from "@/lib/data/feed";
import { getLibrary } from "@/lib/data/library";
import { HighlightRow, KeptRow } from "@/components/library/library-rows";
import { CheckIcon, SearchIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <div className="max-w-4xl">
      <h1 className="pt-2 text-2xl font-bold lg:pt-0">Library</h1>
      <p className="mt-1 text-muted">Everything you&apos;ve kept and highlighted.</p>
      <Suspense
        fallback={
          <div aria-hidden="true" className="mt-6 h-64 animate-pulse rounded-card bg-surface-2" />
        }
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
      <form action="/library" method="get" role="search" className="mt-5 flex gap-2">
        {topic && <input type="hidden" name="topic" value={topic} />}
        <label htmlFor="library-q" className="sr-only">
          Search your library
        </label>
        <input
          id="library-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search titles, highlights and notes"
          className="min-h-12 flex-1 rounded-control border border-line bg-surface px-4"
        />
        <button
          type="submit"
          className="flex min-h-12 items-center gap-2 rounded-control bg-accent px-4 font-bold text-accent-ink"
        >
          <SearchIcon width={18} height={18} />
          Search
        </button>
      </form>

      {topics.length > 0 && (
        <nav aria-label="Filter by topic" className="mt-3">
          <ul className="flex gap-2 overflow-x-auto pb-2">
            {[{ id: "", name: "All topics" }, ...topics].map((t) => {
              const active = (topic ?? "") === t.id;
              return (
                <li key={t.id || "all"} className="shrink-0">
                  <Link
                    href={href({ topic: t.id || undefined })}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-full border px-4 whitespace-nowrap ${
                      active
                        ? "border-ink bg-ink font-bold text-bg"
                        : "border-line bg-surface hover:border-ink"
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
        <p className="mt-3 text-muted" role="status">
          {empty ? `Nothing matches “${q}”.` : `Results for “${q}”.`}{" "}
          <Link href={href({ topic })} className="font-bold text-accent underline">
            Clear search
          </Link>
        </p>
      )}

      {kept.length > 0 && (
        <section aria-labelledby="kept-heading" className="mt-8">
          <h2 id="kept-heading" className="text-lg font-bold">
            Kept ({kept.length})
          </h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {kept.map((item) => (
              <KeptRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {highlights.length > 0 && (
        <section aria-labelledby="highlights-heading" className="mt-10">
          <h2 id="highlights-heading" className="text-lg font-bold">
            Highlights ({highlights.length})
          </h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {highlights.map((h) => (
              <HighlightRow key={h.id} highlight={h} />
            ))}
          </ul>
        </section>
      )}

      {empty && !q ? (
        <section className="mt-8 rounded-card border border-line bg-surface p-6">
          <h2 className="text-lg font-bold">Your Library starts with one Keep.</h2>
          <p className="mt-1 text-muted">
            Tap Keep on anything worth remembering, or highlight a passage while reading.
          </p>
          <Link
            href="/today"
            className="mt-3 inline-flex min-h-11 items-center font-bold text-accent underline"
          >
            Go to Today
          </Link>
        </section>
      ) : !empty ? (
        <section className="mt-8 flex items-start gap-4 rounded-card bg-keep-soft p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-keep text-white">
            <CheckIcon />
          </span>
          <p className="self-center">
            {limited
              ? "That's the most recent 60. Search to find older ones."
              : q || topic
                ? "That's everything that matches."
                : "That's everything you've kept."}
          </p>
        </section>
      ) : null}
    </>
  );
}
