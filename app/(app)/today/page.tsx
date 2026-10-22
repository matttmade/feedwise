import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";
import { getToday, getTopics } from "@/lib/data/feed";
import { getHome } from "@/lib/data/home";
import { dealHome, pickOfTheDay } from "@/lib/feed/home";
import { getDaysLearned, getReview } from "@/lib/data/review";
import { sessionMinutes } from "@/lib/srs/queue";
import { ContinueRail } from "@/components/today/continue-rail";
import { EditorialGrid } from "@/components/home/editorial-grid";
import { LeadStory } from "@/components/home/lead-story";
import { Section } from "@/components/home/section";
import { SwipeRow } from "@/components/home/swipe-row";
import { CountUp } from "@/components/home/count-up";
import { IndexList } from "@/components/home/index-list";
import { SortStack } from "@/components/home/sort-stack";
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

export default function TodayPage() {
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
          <TodayContent />
        </div>
      </ViewTransition>
    </Suspense>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The home: a masthead, then sections that each engage differently. The lead story to read,
 * the rest of today's set as a magazine spread, a recall prompt, quick reads and videos to
 * swipe through, and what's in progress. Every section ends; the page ends on a finish.
 */
async function TodayContent() {
  const [today, review, daysLearned, home, topics] = await Promise.all([
    getToday(),
    getReview(),
    getDaysLearned(),
    getHome(),
    getTopics(),
  ]);
  const { sourceCount, goal, doneToday, batch, continueItems } = today;
  const reviewDue = review.cards.length;
  const done = Math.min(doneToday, goal);

  const masthead = (
    <header className="flex flex-col gap-(--s-3)">
      <p className="t-label intro flex flex-wrap items-center gap-x-(--s-3) gap-y-(--s-1)">
        <span>{dateline()}</span>
        {sourceCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <progress value={done} max={goal} aria-label="Today's set" className="meter w-16" />
            <span>
              {pad(done)} / {pad(goal)} done
            </span>
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
            Paste its address and Feedwise turns new posts into a short daily set.
          </p>
          <Link href="/sources" className="btn mt-(--s-4)">
            Add a source →
          </Link>
        </section>
      </>
    );
  }

  const [lead, ...rest] = batch;
  const resume = !lead ? continueItems[0] : undefined;
  const leadItem = lead ?? resume;
  const shown = new Set([...batch, ...continueItems].map((i) => i.id));
  const deal = dealHome(home.pool, shown);
  const quote = pickOfTheDay(home.quotes, new Date().toISOString().slice(0, 10));
  const topicTabs = topics.filter((t) => (deal.byTopic[t.id]?.length ?? 0) > 0);
  const railItems = continueItems.filter((i) => i.id !== resume?.id);
  const stats: [string, number][] = [
    ["Days learned", daysLearned],
    ["Kept", home.stats.kept],
    ["Highlights", home.stats.highlights],
    ["Sources", home.stats.sources],
  ];
  let n = 0;

  return (
    <>
      {masthead}

      <dl className="intro mt-(--s-5) grid grid-cols-2 gap-y-(--s-4) border-t border-rule pt-(--s-3) lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse gap-(--s-1)">
            <dt className="t-label">{label}</dt>
            <dd className="t-headline">
              <CountUp value={value} />
            </dd>
          </div>
        ))}
      </dl>

      {reviewDue > 0 && (
        <Section id="recall" number={++n} label="Recall" aside={<span>{pad(reviewDue)} due</span>}>
          <div className="lg:grid-12">
            <p className="t-lead max-w-[30ch] italic lg:col-span-8">
              “{review.cards[0].prompt.replace(/\s+/g, " ").slice(0, 160)}”
            </p>
            <div className="mt-(--s-4) flex flex-col items-start gap-(--s-2) lg:col-span-4 lg:mt-0 lg:items-end lg:justify-end">
              <span className="t-label">About {sessionMinutes(reviewDue)} min</span>
              <Link href="/review" className="btn">
                Recall it →
              </Link>
            </div>
          </div>
        </Section>
      )}

      {leadItem && (
        <div className="mt-(--s-5)">
          <LeadStory item={leadItem} resuming={!lead} primary={reviewDue === 0} />
        </div>
      )}

      {rest.length > 0 && (
        <Section
          id="set"
          number={++n}
          label="The rest of today's set"
          aside={<span>{pad(rest.length)}</span>}
        >
          <EditorialGrid items={rest} start={1} />
        </Section>
      )}

      {!leadItem && <FinishCard reachedGoal={doneToday >= goal} goal={goal} />}

      {deal.sort.length > 0 && (
        <Section id="sort" number={++n} label="Keep or skip" aside={<span>Swipe or tap</span>}>
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
        <Section
          id="topics"
          number={++n}
          label="By topic"
          aside={<span>{pad(topicTabs.length)} topics</span>}
        >
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
        <Section
          id="watch"
          number={++n}
          label="Watch"
          aside={<span>{pad(deal.videos.length)} videos</span>}
        >
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

      {deal.long.length > 0 && (
        <Section id="long" number={++n} label="Long reads for later" aside={<span>15+ min</span>}>
          <IndexList items={deal.long} lead="title" />
        </Section>
      )}

      {railItems.length > 0 && (
        <Section id="continue" number={++n} label="Continue">
          <ContinueRail items={railItems} />
        </Section>
      )}

      {leadItem && (
        <Finish title="That's today. You're caught up.">
          <p>New posts arrive through the day. There&apos;s nothing you need to do.</p>
          <Link href="/explore" className="link">
            Browse Explore anyway →
          </Link>
        </Finish>
      )}
    </>
  );
}

function FinishCard({ reachedGoal, goal }: { reachedGoal: boolean; goal: number }) {
  return (
    <Finish
      title={
        reachedGoal
          ? `That's today's ${goal}. You're caught up.`
          : "Nothing new right now. You're caught up."
      }
    >
      <p>New posts arrive through the day. There&apos;s nothing you need to do.</p>
      <Link href="/explore" className="link">
        Browse Explore anyway →
      </Link>
    </Finish>
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
