import { Suspense } from "react";
import { BottomBar, MobileHeader, Rail } from "@/components/shell/nav";
import { ToastProvider } from "@/components/ui/toast";
import { getReview } from "@/lib/data/review";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const badge = (
    <Suspense fallback={null}>
      <DueBadge />
    </Suspense>
  );
  return (
    <ToastProvider>
      <Rail reviewBadge={badge} />
      <div className="lg:pl-[var(--rail)]">
        <MobileHeader />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] px-4 pb-[calc(var(--bar)+2rem)] sm:px-6 lg:px-10 lg:pt-8 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <BottomBar reviewBadge={badge} />
    </ToastProvider>
  );
}

/** Cards due today, never more than the daily cap (the queue is already capped). */
async function DueBadge() {
  const { cards } = await getReview();
  if (!cards.length) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs leading-none font-bold text-accent-ink">
      {cards.length}
      <span className="sr-only"> cards due</span>
    </span>
  );
}
