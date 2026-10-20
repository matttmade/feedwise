import type { Metadata } from "next";
import { Suspense } from "react";
import { getSources, getTopics, type SourceRow } from "@/lib/data/feed";
import { AddSource } from "@/components/sources/add-source";
import { SourceItem } from "@/components/sources/source-row";

export const metadata: Metadata = { title: "Sources" };

export default function SourcesPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="pt-2 text-2xl font-bold lg:pt-0">Sources</h1>
      <p className="mt-1 text-muted">
        The sites and channels you follow. We check them every couple of hours.
      </p>
      <div className="mt-6">
        <AddSource />
      </div>
      <Suspense
        fallback={
          <div aria-hidden="true" className="mt-8 h-40 animate-pulse rounded-card bg-surface-2" />
        }
      >
        <SourceList />
      </Suspense>
    </div>
  );
}

async function SourceList() {
  const [sources, topics] = await Promise.all([getSources(), getTopics()]);
  if (!sources.length) {
    return <p className="mt-8 text-muted">No sources yet. Your first one goes in the box above.</p>;
  }
  return (
    <section aria-labelledby="following-heading" className="mt-10">
      <h2 id="following-heading" className="text-lg font-bold">
        Following ({sources.length})
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {sources.map((s) => (
          <SourceItem key={s.id} source={s} topics={topics} health={health(s)} />
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
