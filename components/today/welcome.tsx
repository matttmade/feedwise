"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startWith, type StartState } from "@/app/actions/sources";
import { DEFAULT_STARTERS, STARTERS } from "@/lib/starters";

/** First visit: a short hello and a few starter feeds to pick, so the first Today has something in it. */
export function Welcome() {
  const [state, action, pending] = useActionState<StartState, FormData>(startWith, {
    status: "idle",
  });

  return (
    <section className="intro mt-(--s-5) lg:grid-12" aria-labelledby="welcome-title">
      <div className="lg:col-span-5">
        <h2 id="welcome-title" className="t-lead">
          Welcome. Pick a few to start.
        </h2>
        <p className="mt-(--s-2) max-w-[44ch]">
          The Me Times turns sites you like into one visual feed, ranked by what you open, keep and
          skip. Start with some of these; add your own any time.
        </p>
      </div>
      <form action={action} className="mt-(--s-4) lg:col-span-6 lg:col-start-7 lg:mt-0">
        <fieldset disabled={pending}>
          <legend className="t-label text-muted">Starter sources</legend>
          <ul className="mt-(--s-2) border-t border-rule">
            {STARTERS.map((s, i) => (
              <li key={s.id} className="border-b border-rule">
                <label className="flex min-h-11 cursor-pointer items-center gap-(--s-3) py-(--s-2)">
                  <input
                    type="checkbox"
                    name="starter"
                    value={s.id}
                    defaultChecked={DEFAULT_STARTERS.includes(s.id)}
                    className="size-4 shrink-0 accent-current"
                  />
                  <span className="t-label tabular-nums text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{s.title}</span>
                  <span className="t-label text-muted">{s.about}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {state.status === "error" && (
          <p role="alert" className="mt-(--s-3)">
            {state.message}
          </p>
        )}
        <div className="mt-(--s-4) flex flex-wrap items-center gap-(--s-4)">
          <button type="submit" disabled={pending} className="btn">
            {pending ? "Setting up your first edition…" : "Start reading →"}
          </button>
          <Link href="/sources" className="link">
            Or add your own site
          </Link>
        </div>
        <p role="status" className="sr-only">
          {pending ? "Fetching the latest posts. This takes a few seconds." : ""}
        </p>
      </form>
    </section>
  );
}
