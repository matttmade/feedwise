import type { Metadata } from "next";
import { Suspense } from "react";
import { getSources, getTopics, type SourceRow } from "@/lib/data/feed";
import { AddSource } from "@/components/sources/add-source";
import { SourceItem } from "@/components/sources/source-row";

export const metadata: Metadata = { title: "Sources" };

export default function SourcesPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="t-display">Sources</h1>
      <p className="mt-(--s-2)">
        The sites and channels you follow. We check them every couple of hours.
      </p>
      <div className="mt-(--s-5)">
        <AddSource />
      </div>
      <Suspense
        fallback={<div aria-hidden="true" className="mt-(--s-5) h-40 animate-pulse bg-tint" />}
      >
        <SourceList />
      </Suspense>
    </div>
  );
}

async function SourceList() {
  const [sources, topics] = await Promise.all([getSources(), getTopics()]);
  if (!sources.length) {
    return <p className="mt-(--s-5)">No sources yet. Your first one goes in the field above.</p>;
  }
  return (
    <section aria-labelledby="following-heading" className="mt-(--s-6)">
      <h2 id="following-heading" className="t-label">
        Following · {String(sources.length).padStart(2, "0")}
      </h2>
      <ul className="mt-(--s-2) border-t border-rule">
        {sources.map((s, i) => (
          <SourceItem key={s.id} source={s} topics={topics} health={health(s)} index={i} />
        ))}
      </ul>
    </section>
  );
}

function health(s: SourceRow) {
  if (s.checkedMinutesAgo === null) return { tone: "idle" as const, label: "Not checked yet" };
  const ago = minutesAgo(s.checkedMinutesAgo);
  if (s.lastStatus === "error")
    return { tone: "warn" as const, label: `Couldn't reach it · ${ago}` };
  return { tone: "ok" as const, label: `Healthy · checked ${ago}` };
}

function minutesAgo(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
