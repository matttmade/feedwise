import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getToday } from "@/lib/data/feed";
import { getDaysLearned, getReview } from "@/lib/data/review";
import { sessionMinutes } from "@/lib/srs/queue";
import { ItemCard } from "@/components/cards/item-card";
import { ContinueRail } from "@/components/today/continue-rail";
import { HeroCard } from "@/components/today/hero-card";
import { CardsIcon, CheckIcon, PlusIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <>
      <h1 className="pt-2 text-2xl font-bold lg:pt-0">Today</h1>
      <Suspense fallback={<TodaySkeleton />}>
        <TodayContent />
      </Suspense>
    </>
  );
}

async function TodayContent() {
  const [{ sourceCount, goal, doneToday, batch, continueItems }, review, daysLearned] =
    await Promise.all([getToday(), getReview(), getDaysLearned()]);
  const reviewDue = review.cards.length;

  if (sourceCount === 0) {
    return (
      <section className="mt-6 rounded-card border border-line bg-surface p-6 shadow-card lg:p-10">
        <h2 className="text-xl font-bold">Let&apos;s start with one site you already like.</h2>
        <p className="mt-2 max-w-prose text-muted">
          Paste its address and Feedwise turns new posts into a short daily set.
        </p>
        <Link
          href="/sources"
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-control bg-accent px-6 font-bold text-accent-ink"
        >
          <PlusIcon width={20} height={20} />
          Add a source
        </Link>
      </section>
    );
  }

  // One next thing: due reviews first, then something fresh, then what's already in progress.
  // When reviews lead, the fresh picks all move into the set below.
  const [first, ...others] = batch;
  const hero = reviewDue ? undefined : first;
  const rest = reviewDue ? batch : others;
  const resume = !reviewDue && !hero ? continueItems[0] : undefined;
  const railItems = continueItems.filter((i) => i.id !== resume?.id);
  const done = Math.min(doneToday, goal);

  return (
    <>
      <div className="mt-1 flex items-center gap-3 text-muted">
        <progress
          value={done}
          max={goal}
          aria-label="Today's set"
          className="h-2 w-28 overflow-hidden rounded-full [&::-moz-progress-bar]:bg-keep [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:bg-keep"
        />
        <span>
          {done} of {goal} done today
        </span>
        {daysLearned > 0 && (
          <span>
            · {daysLearned} {daysLearned === 1 ? "day" : "days"} learned
          </span>
        )}
      </div>

      <div className="mt-6">
        {reviewDue ? (
          <ReviewHero count={reviewDue} />
        ) : hero ? (
          <HeroCard item={hero} resuming={false} />
        ) : resume ? (
          <HeroCard item={resume} resuming />
        ) : null}
      </div>

      {rest.length > 0 && (
        <section aria-labelledby="batch-heading" className="mt-10">
          <h2 id="batch-heading" className="text-lg font-bold">
            Also in today&apos;s set
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((item, i) => (
              <ItemCard
                priority={i < 2}
                key={item.id}
                item={item}
                layout="row"
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 40vw"
              />
            ))}
          </div>
        </section>
      )}

      {!hero && !reviewDue && batch.length === 0 && (
        <FinishCard reachedGoal={doneToday >= goal} goal={goal} />
      )}

      <ContinueRail items={railItems} />
    </>
  );
}

function ReviewHero({ count }: { count: number }) {
  return (
    <section
      aria-labelledby="review-hero"
      className="card flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8"
    >
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-card bg-accent-soft text-accent">
          <CardsIcon width={28} height={28} />
        </span>
        <div>
          <p className="text-sm font-bold tracking-wide text-accent uppercase">Your next one</p>
          <h2 id="review-hero" className="text-xl font-bold">
            Time to review
          </h2>
          <p className="text-muted">
            {count} {count === 1 ? "card" : "cards"} · about {sessionMinutes(count)} min
          </p>
        </div>
      </div>
      <Link
        href="/review"
        className="flex min-h-12 items-center rounded-control bg-accent px-6 font-bold text-accent-ink hover:brightness-110"
      >
        Start review
      </Link>
    </section>
  );
}

function FinishCard({ reachedGoal, goal }: { reachedGoal: boolean; goal: number }) {
  return (
    <section className="mt-6 flex flex-col items-start gap-3 rounded-card bg-keep-soft p-6">
      <span className="grid size-11 place-items-center rounded-full bg-keep text-white">
        <CheckIcon />
      </span>
      <h2 className="text-xl font-bold">
        {reachedGoal
          ? `That's today's ${goal}. You're caught up.`
          : "Nothing new right now. You're caught up."}
      </h2>
      <p className="max-w-prose">
        New posts arrive through the day. There&apos;s nothing you need to do.
      </p>
      <Link
        href="/explore"
        className="min-h-11 rounded-control px-1 py-2 font-bold text-keep underline underline-offset-4"
      >
        Browse Explore anyway
      </Link>
    </section>
  );
}

function TodaySkeleton() {
  return (
    <div aria-hidden="true" className="mt-6 animate-pulse">
      <div className="h-3 w-40 rounded-full bg-surface-2" />
      <div className="mt-6 aspect-video rounded-card bg-surface-2 lg:aspect-[3/1]" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-card bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
