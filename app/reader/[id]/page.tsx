import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getReaderItem } from "@/lib/data/feed";
import { costLabel } from "@/lib/feed/select";
import { proxyBodyImages } from "@/lib/images";
import { sanitizeBody } from "@/lib/ingest/sanitize";
import { chunkHtml } from "@/lib/reader/chunk";
import { playerSrc } from "@/lib/reader/video";
import { CardImage } from "@/components/cards/card-image";
import { HighlightList } from "@/components/reader/highlight-list";
import { Highlighter, READER_BODY_ID } from "@/components/reader/highlighter";
import { KeepPanel } from "@/components/reader/keep-panel";
import { ReaderShell } from "@/components/reader/reader-shell";
import { VideoPlayer } from "@/components/reader/video-player";
import { ArrowLeftIcon, ExternalIcon } from "@/components/ui/icons";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = { title: "Reader" };

export default function ReaderPage({ params }: PageProps<"/reader/[id]">) {
  return (
    <ToastProvider>
      <Suspense fallback={<ReaderSkeleton />}>
        <Reader params={params} />
      </Suspense>
    </ToastProvider>
  );
}

async function Reader({ params }: { params: PageProps<"/reader/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const item = await getReaderItem(id);
  if (!item) notFound();

  const cost = costLabel(item);
  const chunks =
    item.type === "video" ? [] : chunkHtml(proxyBodyImages(sanitizeBody(item.bodyHtml ?? "")));
  const video = item.type === "video" ? playerSrc(item.url, item.embedHtml) : null;
  const published = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ReaderShell
      itemId={item.id}
      initialPosition={item.resumePosition}
      initiallyKept={item.state === "kept"}
    >
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[960px] items-center gap-2 px-3 py-2">
          <Link
            href="/today"
            aria-keyshortcuts="Escape"
            className="flex min-h-11 items-center gap-1.5 rounded-control px-3 hover:bg-surface-2"
          >
            <ArrowLeftIcon width={20} height={20} />
            Back
          </Link>
          <span className="flex-1" />
          <KeepPanel itemId={item.id} variant="bar" />
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-1.5 rounded-control px-3 hover:bg-surface-2"
          >
            Original
            <ExternalIcon width={18} height={18} />
            <span className="sr-only">(opens {item.sourceTitle} in a new tab)</span>
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-[680px] px-4 pt-6 pb-24 sm:px-6">
        {video ? (
          <VideoPlayer src={video} poster={item.image?.src ?? null} title={item.title} />
        ) : item.image ? (
          <div className="overflow-hidden rounded-card">
            <CardImage
              item={item}
              ratio="native"
              sizes="(min-width: 720px) 680px, 100vw"
              priority
            />
          </div>
        ) : null}

        <p className="mt-6 text-sm text-muted">
          {item.sourceTitle}
          {published ? ` · ${published}` : ""}
          {cost ? ` · ${cost}` : ""}
        </p>
        <h1 className="mt-2 text-2xl leading-tight font-bold">{item.title}</h1>

        <div id={READER_BODY_ID}>
          {chunks.length > 0 ? (
            chunks.map((html, i) => (
              <section key={i} aria-label={`Part ${i + 1} of ${chunks.length}`} className="mt-8">
                {chunks.length > 1 && (
                  <p
                    aria-hidden="true"
                    className="mb-3 text-sm font-bold tracking-wide text-muted uppercase"
                  >
                    Part {i + 1} of {chunks.length}
                  </p>
                )}
                <div className="prose-reader" dangerouslySetInnerHTML={{ __html: html }} />
              </section>
            ))
          ) : item.summary ? (
            <p className="prose-reader mt-6 whitespace-pre-line">{item.summary}</p>
          ) : null}
        </div>
        <Highlighter itemId={item.id} />

        {item.type !== "video" && chunks.length === 0 && (
          <p className="mt-6 rounded-card bg-surface-2 p-4">
            Only a preview came through for this one.{" "}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-accent underline"
            >
              Read it on {item.sourceTitle}
            </a>
            .
          </p>
        )}

        <HighlightList highlights={item.highlights} />

        <KeepPanel itemId={item.id} variant="end" />

        <nav aria-label="After reading" className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/today"
            className="min-h-11 rounded-control border border-line px-4 py-2.5 hover:border-ink"
          >
            Back to Today
          </Link>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 rounded-control border border-line px-4 py-2.5 hover:border-ink"
          >
            Read on {item.sourceTitle} ↗
          </a>
        </nav>
      </main>
    </ReaderShell>
  );
}

function ReaderSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[680px] animate-pulse px-4 pt-20">
      <div className="aspect-video rounded-card bg-surface-2" />
      <div className="mt-6 h-4 w-40 rounded-full bg-surface-2" />
      <div className="mt-4 h-8 w-3/4 rounded-full bg-surface-2" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="mt-4 h-4 rounded-full bg-surface-2" />
      ))}
    </div>
  );
}
