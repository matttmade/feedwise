"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { rateCard, undoRating, type RatingUndo } from "@/app/actions/review";
import type { ReviewCard } from "@/lib/data/review";
import { RATING_LABELS, type ReviewRating } from "@/lib/srs/fsrs";
import { sessionMinutes } from "@/lib/srs/queue";
import { useToast } from "@/components/ui/toast";
import { Finish } from "@/components/ui/finish";

/** Left to right, matching keys 1 / 2 / 3. */
const ORDER: ReviewRating[] = ["again", "hard", "good"];

type Done = { rating: ReviewRating; undo: RatingUndo };

/**
 * One card at a time: read the prompt, try to recall, then reveal and say how it went.
 * The queue is fixed when the session starts, so it always has a finish line.
 */
export function ReviewSession({
  cards,
  empty,
}: {
  cards: ReviewCard[];
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
  if (!card) return <Summary done={done} />;

  return (
    <section aria-labelledby="card-prompt" className="mt-(--s-3) max-w-2xl lg:mt-(--s-4)">
      <div className="t-label flex items-center gap-(--s-3)">
        <span>
          Card {pad(index + 1)} / {pad(queue.length)}
        </span>
        <progress
          value={index}
          max={queue.length}
          aria-label="Review progress"
          className="meter flex-1"
        />
        <span>About {sessionMinutes(queue.length)} min</span>
      </div>

      <p role="status" aria-live="polite" className="flex min-h-11 items-center gap-(--s-3)">
        {feedback ? (
          <>
            <span>{feedback.message}</span>
            {feedback.undo && (
              <button type="button" onClick={undoLast} disabled={pending} className="link">
                Undo
              </button>
            )}
          </>
        ) : (
          <span className="text-muted">Recall first, then check.</span>
        )}
      </p>

      <article className="mt-(--s-1)">
        {/* The lead image is a cue for recalling; once the answer shows, give the space to it. */}
        {card.image && (card.kind === "image" || !revealed) && (
          // eslint-disable-next-line @next/next/no-img-element -- proxied image
          <img
            src={card.image}
            alt={card.kind === "image" ? "The image you saved" : ""}
            className={
              card.kind === "image"
                ? "max-h-96 w-full bg-tint object-contain"
                : "h-36 w-full object-cover"
            }
          />
        )}
        <div className="flex flex-col gap-(--s-3) pt-(--s-3)">
          <p className="t-label">
            From{" "}
            <Link href={`/reader/${card.itemId}`} className="underline underline-offset-4">
              {card.itemTitle}
            </Link>
            {card.sourceTitle ? ` · ${card.sourceTitle}` : ""}
          </p>
          <h2 id="card-prompt" className="t-lead whitespace-pre-line">
            {card.prompt}
          </h2>

          {revealed ? (
            <div className="border-t border-rule pt-(--s-3)" aria-live="polite">
              <p className="t-label">Answer</p>
              <p className="mt-(--s-2) font-display text-(length:--t-lead) leading-(--lh-snug) font-light whitespace-pre-line italic">
                {card.answer}
              </p>
            </div>
          ) : (
            <p className="text-muted">Take a moment to recall it, then check.</p>
          )}
        </div>
      </article>

      {revealed ? (
        <div className="mt-(--s-4)" role="group" aria-label="How did that go?">
          <p className="t-label mb-(--s-2)">How did that go?</p>
          <div className="grid grid-cols-3 gap-(--s-2)">
            {ORDER.map((r, i) => (
              <button
                key={r}
                type="button"
                onClick={() => answer(r)}
                disabled={pending}
                aria-keyshortcuts={String(i + 1)}
                className="btn min-h-16 flex-col items-start gap-0 px-(--s-2) py-(--s-2)"
              >
                <span>
                  <span className="t-label mr-1">{i + 1}</span>
                  {RATING_LABELS[r]}
                </span>
                <span className="t-label">Back {card.next[r]}</span>
              </button>
            ))}
          </div>
          <p className="t-label mt-(--s-2) text-muted">Keys: 1 Forgot · 2 Shaky · 3 Got it</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          aria-keyshortcuts="Space Enter"
          className="btn mt-(--s-4) min-h-14 w-full"
        >
          Show answer
        </button>
      )}
    </section>
  );
}

function Summary({ done }: { done: Done[] }) {
  const strong = done.filter((d) => d.rating === "good").length;
  const sooner = done.length - strong;
  return (
    <Finish title="That's today's review.">
      <p>
        {done.length} {done.length === 1 ? "card" : "cards"} done
        {strong ? ` · ${strong} feeling solid` : ""}
        {sooner
          ? ` · ${sooner} coming back sooner to help ${sooner === 1 ? "it" : "them"} stick`
          : ""}
        .
      </p>
      <Link href="/today" className="link">
        Back to Today →
      </Link>
    </Finish>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
