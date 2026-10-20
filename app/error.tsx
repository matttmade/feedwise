"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">Something hiccuped.</h1>
      <p className="text-muted">
        Your saved items are safe. Try again, and if it keeps happening, come back in a bit.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 self-start rounded-control bg-accent px-5 font-bold text-accent-ink"
      >
        Try again
      </button>
    </main>
  );
}
