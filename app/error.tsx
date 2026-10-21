"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      id="main"
      className="flex min-h-dvh max-w-3xl flex-col justify-center gap-(--s-3) px-(--gutter)"
    >
      <h1 className="t-display">Something hiccuped.</h1>
      <p className="max-w-[62ch]">
        Your saved items are safe. Try again, and if it keeps happening, come back in a bit.
      </p>
      <button type="button" onClick={reset} className="link self-start">
        Try again →
      </button>
    </main>
  );
}
