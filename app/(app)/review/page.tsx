import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDaysLearned, getReview } from "@/lib/data/review";
import { ReviewSession } from "@/components/review/review-session";
import { CheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <>
      <h1 className="pt-2 text-2xl font-bold lg:pt-0">Review</h1>
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="mx-auto mt-6 h-80 max-w-2xl animate-pulse rounded-card bg-surface-2"
          />
        }
      >
        <ReviewContent />
      </Suspense>
    </>
  );
}

async function ReviewContent() {
  const [review, daysLearned] = await Promise.all([getReview(), getDaysLearned()]);

  const title = !review.hasCards
    ? "Nothing to review yet."
    : review.reviewedToday > 0
      ? "That's today's review."
      : "You're all caught up.";
  const body = !review.hasCards
    ? "Keep something you like, or highlight a passage while reading. It shows up here the next day."
    : review.nextDue
      ? `The next cards come back ${review.nextDue}. Nothing to do until then.`
      : "Nothing to do right now.";

  const empty = (
    <section className="mx-auto mt-6 flex max-w-2xl flex-col items-start gap-3 rounded-card bg-keep-soft p-6 sm:p-8">
      <span className="grid size-12 place-items-center rounded-full bg-keep text-white">
        <CheckIcon />
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      <p>{body}</p>
      <p className="text-muted">
        {daysLearned} {daysLearned === 1 ? "day" : "days"} learned so far.
      </p>
      <Link
        href={review.hasCards ? "/today" : "/explore"}
        className="min-h-11 py-2 font-bold text-keep underline underline-offset-4"
      >
        {review.hasCards ? "Back to Today" : "Find something to keep"}
      </Link>
    </section>
  );
  return <ReviewSession cards={review.cards} daysLearned={daysLearned} empty={empty} />;
}
