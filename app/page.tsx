export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Feedwise</h1>
      <p className="max-w-md text-balance opacity-80">
        Your sites, as a visual learning feed. Phase 0: ingestion spike — run{" "}
        <code>pnpm spike &lt;url…&gt;</code>.
      </p>
    </main>
  );
}
