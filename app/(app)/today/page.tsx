import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getToday } from "@/lib/data/feed";
import { getDaysLearned, getReview } from "@/lib/data/review";
import { sessionMinutes } from "@/lib/srs/queue";
import { ItemCard } from "@/components/cards/item-card";
import { ContinueRail } from "@/components/today/continue-rail";
import { HeroCard } from "@/components/today/hero-card";
import { Finish } from "@/components/ui/finish";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <>
      <h1 className="t-display">Today</h1>
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
      <section className="mt-(--s-5) max-w-[62ch]">
        <h2 className="t-lead">Let&apos;s start with one site you already like.</h2>
        <p className="mt-(--s-2)">
          Paste its address and Feedwise turns new posts into a short daily set.
        </p>
        <Link href="/sources" className="btn mt-(--s-4)">
          Add a source →
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
      <div className="t-label mt-(--s-3) flex items-center gap-(--s-3)">
        <progress value={done} max={goal} aria-label="Today's set" className="meter w-24" />
        <span>
          {String(done).padStart(2, "0")} of {String(goal).padStart(2, "0")} done today
          {daysLearned > 0 && ` · ${daysLearned} ${daysLearned === 1 ? "day" : "days"} learned`}
        </span>
      </div>

      <div className="mt-(--s-5)">
        {reviewDue ? (
          <ReviewHero count={reviewDue} />
        ) : hero ? (
          <HeroCard item={hero} resuming={false} />
        ) : resume ? (
          <HeroCard item={resume} resuming />
        ) : null}
      </div>

      {rest.length > 0 && (
        <section aria-labelledby="batch-heading" className="mt-(--s-6)">
          <h2 id="batch-heading" className="t-label">
            Also in today&apos;s set
          </h2>
          <div className="mt-(--s-3) grid gap-x-(--gutter) gap-y-(--s-5) sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((item, i) => (
              <ItemCard
                priority={i < 2}
                key={item.id}
                item={item}
                index={i + (hero ? 1 : 0)}
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
    <section aria-labelledby="review-hero" className="lg:grid-12">
      <div className="flex flex-col gap-(--s-3) lg:col-span-7">
        <p className="t-label">Your next one</p>
        <h2 id="review-hero" className="t-lead">
          Time to review: {count} {count === 1 ? "card" : "cards"}, about {sessionMinutes(count)}{" "}
          min.
        </h2>
        <div>
          <Link href="/review" className="btn">
            Start review →
          </Link>
        </div>
      </div>
    </section>
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
    <div aria-hidden="true" className="mt-(--s-3) animate-pulse">
      <div className="h-3 w-40 bg-tint" />
      <div className="mt-(--s-5) aspect-video bg-tint lg:aspect-[3/1]" />
      <div className="mt-(--s-6) grid gap-(--gutter) sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 bg-tint" />
        ))}
      </div>
    </div>
  );
}
