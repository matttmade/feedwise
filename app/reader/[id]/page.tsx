import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
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
      <header className="sticky top-0 z-20 border-b border-rule bg-ground">
        <div className="flex h-(--top) items-center gap-(--s-4) px-(--gutter)">
          <Link
            href="/today"
            aria-keyshortcuts="Escape"
            className="flex min-h-11 items-center decoration-1 underline-offset-4 hover:underline"
          >
            ← Back
          </Link>
          <span className="flex-1" />
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center decoration-1 underline-offset-4 hover:underline"
          >
            Original ↗<span className="sr-only">(opens {item.sourceTitle} in a new tab)</span>
          </a>
          <KeepPanel itemId={item.id} variant="bar" />
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="px-(--gutter) pt-(--s-4) pb-(--s-6) lg:grid-12 lg:pt-(--s-5)"
      >
        <div className="lg:col-span-8 lg:col-start-3">
          {video ? (
            <VideoPlayer src={video} poster={item.image?.src ?? null} title={item.title} />
          ) : item.image ? (
            <ViewTransition name={`card-${item.id}`} share="morph" default="none">
              <div className="-mx-(--gutter) sm:mx-0">
                <CardImage
                  item={item}
                  ratio="native"
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  priority
                />
              </div>
            </ViewTransition>
          ) : null}

          <p className="t-label mt-(--s-4)">
            {item.sourceTitle}
            {published ? ` · ${published}` : ""}
            {cost ? ` · ${cost}` : ""}
          </p>
          <h1 className="t-display mt-(--s-3)">{item.title}</h1>

          <div id={READER_BODY_ID}>
            {chunks.length > 0 ? (
              chunks.map((html, i) => (
                <section
                  key={i}
                  aria-label={`Part ${i + 1} of ${chunks.length}`}
                  className="mt-(--s-5)"
                >
                  {chunks.length > 1 && (
                    <p
                      aria-hidden="true"
                      className="t-label mb-(--s-3) border-t border-rule pt-(--s-2)"
                    >
                      Part {String(i + 1).padStart(2, "0")} /{" "}
                      {String(chunks.length).padStart(2, "0")}
                    </p>
                  )}
                  <div className="prose-reader" dangerouslySetInnerHTML={{ __html: html }} />
                </section>
              ))
            ) : item.summary ? (
              <p className="prose-reader mt-(--s-5) whitespace-pre-line">{item.summary}</p>
            ) : null}
          </div>
          <Highlighter itemId={item.id} />

          {item.type !== "video" && chunks.length === 0 && (
            <p className="mt-(--s-4) max-w-[62ch] border-t border-rule pt-(--s-3)">
              Only a preview came through for this one.{" "}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-1 underline-offset-4"
              >
                Read it on {item.sourceTitle}
              </a>
              .
            </p>
          )}

          <HighlightList highlights={item.highlights} />

          <KeepPanel itemId={item.id} variant="end" />

          <nav aria-label="After reading" className="mt-(--s-5) flex flex-wrap gap-x-(--s-4)">
            <Link href="/today" className="link">
              ← Back to Today
            </Link>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="link">
              Read on {item.sourceTitle} ↗
            </a>
          </nav>
        </div>
      </main>
    </ReaderShell>
  );
}

function ReaderSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse px-(--gutter) pt-20 lg:grid-12">
      <div className="lg:col-span-8 lg:col-start-3">
        <div className="aspect-video bg-tint" />
        <div className="mt-(--s-4) h-3 w-40 bg-tint" />
        <div className="mt-(--s-3) h-12 w-3/4 bg-tint" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mt-(--s-3) h-4 bg-tint" />
        ))}
      </div>
    </div>
  );
}
