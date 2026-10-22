import { Suspense } from "react";
import { BottomBar, TopBar } from "@/components/shell/nav";
import { GlStage } from "@/components/gl/gl-stage";
import { DepthStage } from "@/components/motion/depth-stage";
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
      <GlStage />
      <DepthStage />
      <TopBar reviewBadge={badge} />
      <main
        id="main"
        tabIndex={-1}
        className="w-full px-(--gutter) pt-(--s-4) pb-[calc(var(--bar)+var(--s-5))] lg:pt-(--s-5) lg:pb-(--s-6)"
      >
        {children}
      </main>
      <BottomBar reviewBadge={badge} />
    </ToastProvider>
  );
}

/** Cards due today, never more than the daily cap (the queue is already capped). The accent
    square is live state, the accent's one job. */
async function DueBadge() {
  const { cards } = await getReview();
  if (!cards.length) return null;
  return (
    <span className="t-label flex items-center gap-1 tracking-normal">
      <span aria-hidden="true" className="size-1.5 bg-accent" />
      {String(cards.length).padStart(2, "0")}
      <span className="sr-only"> cards due</span>
    </span>
  );
}
