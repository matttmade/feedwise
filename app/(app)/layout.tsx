import { BottomBar, TopBar } from "@/components/shell/nav";
import { GlStage } from "@/components/gl/gl-stage";
import { DepthStage } from "@/components/motion/depth-stage";
import { PressMotion } from "@/components/press/press-motion";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      <GlStage />
      <DepthStage />
      <PressMotion />
      <TopBar />
      <main
        id="main"
        tabIndex={-1}
        className="w-full px-(--gutter) pt-(--s-4) pb-[calc(var(--bar)+var(--s-5))] lg:pt-(--s-5) lg:pb-(--s-6)"
      >
        {children}
      </main>
      <BottomBar />
    </ToastProvider>
  );
}
