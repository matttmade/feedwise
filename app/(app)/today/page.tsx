import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";
import { getToday, getTopics } from "@/lib/data/feed";
import { getHome } from "@/lib/data/home";
import { getReview } from "@/lib/data/review";
import { dealHome, pickOfTheDay } from "@/lib/feed/home";
import { affinity, rank, varietySeed } from "@/lib/feed/rank";
import { ContinueRail } from "@/components/today/continue-rail";
import { EditorialGrid } from "@/components/home/editorial-grid";
import { IndexList } from "@/components/home/index-list";
import { LeadStory } from "@/components/home/lead-story";
import { Section } from "@/components/home/section";
import { SortStack } from "@/components/home/sort-stack";
import { SwipeRow } from "@/components/home/swipe-row";
import { TopicTabs } from "@/components/home/topic-tabs";
import { Finish } from "@/components/ui/finish";

export const metadata: Metadata = { title: "Today" };

const dateline = () =>
  new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: process.env.APP_TIMEZONE || "UTC",
  });

/** Request time, read once per render (kept out of the component body for the linter). */
const currentTime = () => Date.now();

/** How many ranked items go in the "For you" spread after the lead story. */
const FOR_YOU = 8;

export default function TodayPage({ searchParams }: PageProps<"/today">) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="load-out" default="none">
          <TodaySkeleton />
        </ViewTransition>
      }
    >
      <ViewTransition enter="load-in" default="none">
        <div>
          <TodayContent searchParams={searchParams} />
        </div>
      </ViewTransition>
    </Suspense>
  );
}

/**
 * The home: a feed that keeps refreshing, ranked by what you read and keep. A lead story,
 * then "For you" as a magazine spread, then sections that each engage differently. No
 * quotas, streaks or counts. Every section ends, and so does the page.
 */
async function TodayContent({
  searchParams,
}: {
  searchParams: PageProps<"/today">["searchParams"];
}) {
  const [{ mix }, today, review, home, topics] = await Promise.all([
    searchParams,
    getToday(),
    getReview(),
    getHome(),
    getTopics(),
  ]);
  const { sourceCount, continueItems } = today;
  const shuffle = String(Number(Array.isArray(mix) ? mix[0] : (mix ?? 0)) + 1);

  const masthead = (
    <header className="flex flex-col gap-(--s-3)">
      <p className="t-label intro flex flex-wrap items-center gap-x-(--s-3) gap-y-(--s-1)">
        <span>{dateline()}</span>
        {sourceCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>Ranked by what you read</span>
            <span aria-hidden="true">·</span>
            <Link href={`/today?mix=${shuffle}`} className="underline underline-offset-4">
              Shuffle
            </Link>
          </>
        )}
      </p>
      <h1 className="t-display intro-mask">
        <span>Today</span>
      </h1>
    </header>
  );

  if (sourceCount === 0) {
    return (
      <>
        {masthead}
        <section className="intro mt-(--s-5) max-w-[62ch]">
          <h2 className="t-lead">Let&apos;s start with one site you already like.</h2>
          <p className="mt-(--s-2)">
            Paste its address and Feedwise turns new posts into a feed that learns what you like.
          </p>
          <Link href="/sources" className="btn mt-(--s-4)">
            Add a source →
          </Link>
        </section>
      </>
    );
  }

  const now = currentTime();
  const continuing = new Set(continueItems.map((i) => i.id));
  const ranked = rank(
    home.pool.filter((i) => !continuing.has(i.id)),
    affinity(home.signals),
    now,
    varietySeed(now, 10, String(mix ?? "")),
  );
  const [lead, ...rest] = ranked;
  const leadItem = lead ?? continueItems[0];
  const forYou = rest.slice(0, FOR_YOU);
  const shown = new Set([...continuing, ...(lead ? [lead.id] : []), ...forYou.map((i) => i.id)]);
  const deal = dealHome(rest.slice(FOR_YOU), shown);
  const quote = pickOfTheDay(home.quotes, new Date(now).toISOString().slice(0, 10));
  const topicTabs = topics.filter((t) => (deal.byTopic[t.id]?.length ?? 0) > 0);
  const railItems = continueItems.filter((i) => i.id !== leadItem?.id);
  let n = 0;

  return (
    <>
      {masthead}

      {leadItem && (
        <div className="mt-(--s-5)">
          <LeadStory item={leadItem} resuming={!lead} primary />
        </div>
      )}

      {forYou.length > 0 && (
        <Section
          id="for-you"
          number={++n}
          label="For you"
          aside={<span>From what you read and keep</span>}
        >
          <EditorialGrid items={forYou} start={1} />
        </Section>
      )}

      {railItems.length > 0 && (
        <Section id="continue" number={++n} label="Still reading">
          <ContinueRail items={railItems} />
        </Section>
      )}

      {deal.sort.length > 0 && (
        <Section id="sort" number={++n} label="Keep or skip" aside={<span>Teaches the feed</span>}>
          <SortStack items={deal.sort} />
        </Section>
      )}

      {deal.quick.length > 0 && (
        <Section
          id="quick"
          number={++n}
          label="Quick reads · swipe"
          aside={<span>Under 5 min</span>}
        >
          <SwipeRow
            items={deal.quick}
            label="Quick reads"
            end={
              <Link href="/explore?time=quick" className="link">
                All quick reads →
              </Link>
            }
          />
        </Section>
      )}

      {deal.bySource.length > 1 && (
        <Section
          id="sources"
          number={++n}
          label="From your sources"
          aside={<span>Newest from each</span>}
        >
          <IndexList items={deal.bySource} lead="source" />
        </Section>
      )}

      {quote && (
        <Section
          id="quote"
          number={++n}
          label="Resurfaced"
          aside={<span>From your highlights</span>}
        >
          <figure className="fly-in lg:grid-12">
            <blockquote className="t-headline max-w-[22ch] italic lg:col-span-10">
              “{quote.text.length > 180 ? `${quote.text.slice(0, 178)}…` : quote.text}”
            </blockquote>
            <figcaption className="t-label mt-(--s-4) flex flex-wrap gap-x-(--s-3) lg:col-span-12">
              <span>
                {quote.sourceTitle} · {quote.itemTitle}
              </span>
              <Link href={`/reader/${quote.itemId}`} className="underline underline-offset-4">
                Open
              </Link>
            </figcaption>
          </figure>
        </Section>
      )}

      {topicTabs.length > 0 && (
        <Section id="topics" number={++n} label="By topic">
          <TopicTabs
            tabs={topicTabs.map((t) => ({
              id: t.id,
              name: t.name,
              panel: (
                <SwipeRow
                  items={deal.byTopic[t.id]}
                  label={t.name}
                  end={
                    <Link href={`/explore?topic=${t.id}`} className="link">
                      All {t.name} →
                    </Link>
                  }
                />
              ),
            }))}
          />
        </Section>
      )}

      {deal.videos.length > 0 && (
        <Section id="watch" number={++n} label="Watch">
          <SwipeRow
            items={deal.videos}
            label="Videos"
            end={
              <Link href="/explore?mode=watch" className="link">
                Watch them in a row →
              </Link>
            }
          />
        </Section>
      )}

      {review.cards.length > 0 && (
        <Section id="recall" number={++n} label="Recall">
          <div className="lg:grid-12">
            <p className="t-lead max-w-[30ch] italic lg:col-span-8">
              “{review.cards[0].prompt.replace(/\s+/g, " ").slice(0, 160)}”
            </p>
            <div className="mt-(--s-4) lg:col-span-4 lg:mt-0 lg:self-end lg:justify-self-end">
              <Link href="/review" className="link">
                Try a few →
              </Link>
            </div>
          </div>
        </Section>
      )}

      {deal.long.length > 0 && (
        <Section id="long" number={++n} label="Long reads for later" aside={<span>15+ min</span>}>
          <IndexList items={deal.long} lead="title" />
        </Section>
      )}

      <Finish title={leadItem ? "That's the latest." : "Nothing new right now."}>
        <p>New posts land through the day and the order keeps up with what you read.</p>
        <div className="flex flex-wrap gap-x-(--s-4)">
          <Link href={`/today?mix=${shuffle}`} className="link">
            Shuffle the mix ↻
          </Link>
          <Link href="/explore" className="link">
            Browse Explore →
          </Link>
        </div>
      </Finish>
    </>
  );
}

function TodaySkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-3 w-56 bg-tint" />
      <p className="t-display mt-(--s-3) text-ghost">Today</p>
      <div className="mt-(--s-5) aspect-video bg-tint lg:aspect-[3/1]" />
      <div className="mt-(--s-6) grid gap-(--gutter) sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 bg-tint" />
        ))}
      </div>
    </div>
  );
}
