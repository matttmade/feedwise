"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { rateCard, undoRating, type RatingUndo } from "@/app/actions/review";
import type { ReviewCard } from "@/lib/data/review";
import { RATING_LABELS, type ReviewRating } from "@/lib/srs/fsrs";
import { sessionMinutes } from "@/lib/srs/queue";
import { useToast } from "@/components/ui/toast";
import { CheckIcon } from "@/components/ui/icons";

/** Left to right, matching keys 1 / 2 / 3. */
const ORDER: ReviewRating[] = ["again", "hard", "good"];

const STYLE: Record<ReviewRating, string> = {
  again: "bg-surface-2 text-ink",
  hard: "bg-warn-soft text-warn",
  good: "bg-keep text-white",
};

type Done = { rating: ReviewRating; undo: RatingUndo };

/**
 * One card at a time: read the prompt, try to recall, then reveal and say how it went.
 * The queue is fixed when the session starts, so it always has a finish line.
 */
export function ReviewSession({
  cards,
  daysLearned,
  empty,
}: {
  cards: ReviewCard[];
  daysLearned: number;
  /** Shown when there was nothing to review on arrival. */
  empty: ReactNode;
}) {
  // Fixed on arrival. Ratings refresh the server data (for the nav badge), but the session
  // keeps its own queue so it ends on its own summary rather than jumping to an empty state.
  const [queue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<Done[]>([]);
  const [pending, start] = useTransition();
  // Feedback sits above the card, not in a toast, so it never covers the answer buttons.
  const [feedback, setFeedback] = useState<{ message: string; undo?: RatingUndo } | null>(null);
  const toast = useToast();
  const card = queue[index];

  const answer = useCallback(
    (rating: ReviewRating) => {
      if (!card || !revealed || pending) return;
      start(async () => {
        try {
          const { undo, backIn } = await rateCard(card.id, rating);
          setDone((d) => [...d, { rating, undo }]);
          setIndex((i) => i + 1);
          setRevealed(false);
          const message =
            rating === "again"
              ? `No problem — it'll come back ${backIn}.`
              : rating === "hard"
                ? `Getting there. Back ${backIn}.`
                : `Nice. Back ${backIn}.`;
          setFeedback({ message, undo });
        } catch {
          toast("That didn't save. Your connection may have dropped — try again.");
        }
      });
    },
    [card, revealed, pending, toast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        if ((e.target as HTMLElement).closest("a, button")) return;
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        answer(ORDER[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, answer]);

  const undoLast = () => {
    const last = feedback?.undo;
    if (!last) return;
    start(async () => {
      await undoRating(last);
      setDone((d) => d.slice(0, -1));
      setIndex((i) => Math.max(0, i - 1));
      setRevealed(true);
      setFeedback({ message: "Undone. Answer it again whenever you're ready." });
    });
  };

  if (!queue.length) return empty;
  if (!card) return <Finish done={done} daysLearned={daysLearned} />;

  return (
    <section aria-labelledby="card-prompt" className="mx-auto mt-2 max-w-2xl">
      <p className="mb-4 text-muted">
        {queue.length} {queue.length === 1 ? "card" : "cards"} · about{" "}
        {sessionMinutes(queue.length)} min. Recall first, then check.
      </p>
      <div className="flex items-center gap-3 text-sm text-muted">
        <progress
          value={index}
          max={queue.length}
          aria-label="Review progress"
          className="h-2 flex-1 overflow-hidden rounded-full [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:bg-accent"
        />
        <span>
          Card {index + 1} of {queue.length}
        </span>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-3 flex min-h-11 items-center gap-2 text-muted"
      >
        {feedback && (
          <>
            <span>{feedback.message}</span>
            {feedback.undo && (
              <button
                type="button"
                onClick={undoLast}
                disabled={pending}
                className="min-h-11 rounded-control px-2 font-bold text-accent underline underline-offset-4"
              >
                Undo
              </button>
            )}
          </>
        )}
      </p>

      <article className="card mt-1">
        {/* The lead image is a cue for recalling; once the answer shows, give the space to it. */}
        {card.image && (card.kind === "image" || !revealed) && (
          // eslint-disable-next-line @next/next/no-img-element -- proxied image
          <img
            src={card.image}
            alt={card.kind === "image" ? "The image you saved" : ""}
            className={
              card.kind === "image"
                ? "max-h-96 w-full bg-surface-2 object-contain"
                : "h-36 w-full object-cover"
            }
          />
        )}
        <div className="flex flex-col gap-4 p-5 sm:p-7">
          <p className="text-sm text-muted">
            From{" "}
            <Link href={`/reader/${card.itemId}`} className="underline underline-offset-2">
              {card.itemTitle}
            </Link>
            {card.sourceTitle ? ` · ${card.sourceTitle}` : ""}
          </p>
          <h2 id="card-prompt" className="text-xl leading-snug font-bold whitespace-pre-line">
            {card.prompt}
          </h2>

          {revealed ? (
            <div className="rounded-control bg-accent-soft p-4" aria-live="polite">
              <p className="text-sm font-bold text-accent uppercase">Answer</p>
              <p className="mt-1 text-lg whitespace-pre-line">{card.answer}</p>
            </div>
          ) : (
            <p className="text-muted">Take a moment to recall it, then check.</p>
          )}
        </div>
      </article>

      {revealed ? (
        <div className="mt-4" role="group" aria-label="How did that go?">
          <p className="mb-2 text-center text-muted">How did that go?</p>
          <div className="grid grid-cols-3 gap-2">
            {ORDER.map((r, i) => (
              <button
                key={r}
                type="button"
                onClick={() => answer(r)}
                disabled={pending}
                aria-keyshortcuts={String(i + 1)}
                className={`flex min-h-16 flex-col items-center justify-center rounded-control px-2 py-2 font-bold disabled:opacity-60 ${STYLE[r]}`}
              >
                {RATING_LABELS[r]}
                <span className="text-sm font-normal opacity-80">back {card.next[r]}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-muted">Keys: 1 Forgot · 2 Shaky · 3 Got it</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          aria-keyshortcuts="Space Enter"
          className="mt-4 min-h-14 w-full rounded-control bg-accent text-lg font-bold text-accent-ink"
        >
          Show answer
        </button>
      )}
    </section>
  );
}

function Finish({ done, daysLearned }: { done: Done[]; daysLearned: number }) {
  const strong = done.filter((d) => d.rating === "good").length;
  const sooner = done.length - strong;
  return (
    <section className="mx-auto mt-6 flex max-w-2xl flex-col items-start gap-3 rounded-card bg-keep-soft p-6 sm:p-8">
      <span className="grid size-12 place-items-center rounded-full bg-keep text-white">
        <CheckIcon />
      </span>
      <h2 className="text-2xl font-bold">That&apos;s today&apos;s review.</h2>
      <p className="text-lg">
        {done.length} {done.length === 1 ? "card" : "cards"} done
        {strong ? ` · ${strong} feeling solid` : ""}
        {sooner
          ? ` · ${sooner} coming back sooner to help ${sooner === 1 ? "it" : "them"} stick`
          : ""}
        .
      </p>
      <p className="text-muted">
        {daysLearned} {daysLearned === 1 ? "day" : "days"} learned so far.
      </p>
      <Link
        href="/today"
        className="mt-2 min-h-12 rounded-control bg-keep px-5 py-3 font-bold text-white"
      >
        Back to Today
      </Link>
    </section>
  );
}
