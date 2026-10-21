import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh max-w-3xl flex-col justify-center gap-(--s-3) px-(--gutter)"
    >
      <h1 className="t-display">We can&apos;t find that one.</h1>
      <p className="max-w-[62ch]">
        It may have been removed with its source. Nothing else is affected.
      </p>
      <Link href="/today" className="link self-start">
        Go to Today →
      </Link>
    </main>
  );
}
