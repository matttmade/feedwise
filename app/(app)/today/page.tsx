import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getExplore, getToday } from "@/lib/data/feed";
import { getDaysLearned, getReview } from "@/lib/data/review";
import { sessionMinutes } from "@/lib/srs/queue";
import { ContinueRail } from "@/components/today/continue-rail";
import { EditorialGrid } from "@/components/home/editorial-grid";
import { LeadStory } from "@/components/home/lead-story";
import { Section } from "@/components/home/section";
import { SwipeRow } from "@/components/home/swipe-row";
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
    <Suspense fallback={<TodaySkeleton />}>
      <TodayContent />
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
  const [today, review, daysLearned, quick, videos] = await Promise.all([
    getToday(),
    getReview(),
    getDaysLearned(),
    getExplore({ time: "quick" }),
    getExplore({ time: "video" }),
  ]);
  const { sourceCount, goal, doneToday, batch, continueItems } = today;
  const reviewDue = review.cards.length;
  const done = Math.min(doneToday, goal);

  const masthead = (
    <header className="flex flex-col gap-(--s-3)">
      <p className="t-label flex flex-wrap items-center gap-x-(--s-3) gap-y-(--s-1)">
        <span>{dateline()}</span>
        {sourceCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <progress value={done} max={goal} aria-label="Today's set" className="meter w-16" />
            <span>
              {pad(done)} / {pad(goal)} done
              {daysLearned > 0 && ` · ${daysLearned} ${daysLearned === 1 ? "day" : "days"} learned`}
            </span>
          </>
        )}
      </p>
      <h1 className="t-display">Today</h1>
    </header>
  );

  if (sourceCount === 0) {
    return (
      <>
        {masthead}
        <section className="mt-(--s-5) max-w-[62ch]">
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
  const quickItems = quick.items.filter((i) => !shown.has(i.id)).slice(0, 10);
  quickItems.forEach((i) => shown.add(i.id));
  const videoItems = videos.items.filter((i) => !shown.has(i.id)).slice(0, 8);
  const railItems = continueItems.filter((i) => i.id !== resume?.id);
  let n = 0;

  return (
    <>
      {masthead}

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

      {quickItems.length > 0 && (
        <Section
          id="quick"
          number={++n}
          label="Quick reads · swipe"
          aside={<span>Under 5 min</span>}
        >
          <SwipeRow
            items={quickItems}
            label="Quick reads"
            end={
              <Link href="/explore?time=quick" className="link">
                All quick reads →
              </Link>
            }
          />
        </Section>
      )}

      {videoItems.length > 0 && (
        <Section
          id="watch"
          number={++n}
          label="Watch"
          aside={<span>{pad(videoItems.length)} videos</span>}
        >
          <SwipeRow
            items={videoItems}
            label="Videos"
            end={
              <Link href="/explore?mode=watch" className="link">
                Watch them in a row →
              </Link>
            }
          />
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
