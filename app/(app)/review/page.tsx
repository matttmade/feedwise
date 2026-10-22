import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDaysLearned, getReview } from "@/lib/data/review";
import { ReviewSession } from "@/components/review/review-session";
import { Finish } from "@/components/ui/finish";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <>
      <h1 className="t-display">Review</h1>
      <Suspense
        fallback={
          <div aria-hidden="true" className="mt-(--s-4) h-80 max-w-2xl animate-pulse bg-tint" />
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
    <Finish title={title}>
      <p>{body}</p>
      <p className="t-label">
        {daysLearned} {daysLearned === 1 ? "day" : "days"} learned so far
      </p>
      <Link href={review.hasCards ? "/today" : "/explore"} className="link">
        {review.hasCards ? "Back to Today" : "Find something to keep"} →
      </Link>
    </Finish>
  );
  return <ReviewSession cards={review.cards} daysLearned={daysLearned} empty={empty} />;
}
