import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">We can&apos;t find that one.</h1>
      <p className="text-muted">
        It may have been removed with its source. Nothing else is affected.
      </p>
      <Link
        href="/today"
        className="min-h-12 self-start rounded-control bg-accent px-5 py-3 font-bold text-accent-ink"
      >
        Go to Today
      </Link>
    </main>
  );
}
