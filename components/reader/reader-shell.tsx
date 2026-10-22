"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { markOpened, saveProgress } from "@/app/actions/items";

type KeptState = {
  kept: boolean;
  setKept: (k: boolean) => void;
  keepRequest: number;
  requestKeep: () => void;
};
const KeptContext = createContext<KeptState | null>(null);
export const useKept = () => useContext(KeptContext)!;

const SAVE_DELAY_MS = 1200;

/**
 * Reader chrome: reading-progress bar, resume prompt, debounced position saving and
 * keyboard shortcuts (K keep, Esc close). Never moves the page on its own.
 */
export function ReaderShell({
  itemId,
  initialPosition,
  initiallyKept,
  children,
}: {
  itemId: string;
  initialPosition: number;
  initiallyKept: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const articleRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [kept, setKept] = useState(initiallyKept);
  const [keepRequest, setKeepRequest] = useState(0);
  const [offerResume, setOfferResume] = useState(initialPosition > 0.05 && initialPosition < 0.9);

  const fraction = useCallback(() => {
    const el = articleRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return 1;
    return Math.min(1, Math.max(0, -rect.top / total));
  }, []);

  useEffect(() => {
    markOpened(itemId).catch(() => {});
  }, [itemId]);

  useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = false;
    const flush = () => {
      if (!dirty) return;
      dirty = false;
      saveProgress(itemId, fraction()).catch(() => {});
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (barRef.current) barRef.current.style.transform = `scaleX(${fraction()})`;
      });
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(flush, SAVE_DELAY_MS);
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    onScroll();
    dirty = false; // the initial paint isn't the reader moving
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [itemId, fraction]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (window.history.length > 1) router.back();
        else router.push("/today");
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        setKeepRequest((n) => n + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const resume = () => {
    const el = articleRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + initialPosition * (el.offsetHeight - window.innerHeight) });
    setOfferResume(false);
  };

  return (
    <KeptContext
      value={{ kept, setKept, keepRequest, requestKeep: () => setKeepRequest((n) => n + 1) }}
    >
      <div className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent" aria-hidden="true">
        <div
          ref={barRef}
          className="h-full origin-left bg-accent"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
      {offerResume && (
        <div className="sticky top-(--s-2) z-30 mt-(--s-2) flex justify-center px-(--gutter)">
          <div className="flex max-w-md flex-1 items-center gap-(--s-3) bg-ink py-1 pr-1 pl-(--s-3) text-ground">
            <span className="flex-1">You were {Math.round(initialPosition * 100)}% through.</span>
            <button type="button" onClick={resume} className="link px-2">
              Jump back
            </button>
            <button
              type="button"
              onClick={() => setOfferResume(false)}
              aria-label="Start from the top"
              className="grid size-11 place-items-center opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div ref={articleRef}>{children}</div>
    </KeptContext>
  );
}
