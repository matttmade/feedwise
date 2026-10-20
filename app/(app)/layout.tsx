import { BottomBar, MobileHeader, Rail } from "@/components/shell/nav";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      <Rail />
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
      <BottomBar />
    </ToastProvider>
  );
}
