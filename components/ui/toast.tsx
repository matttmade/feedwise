"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";

type Toast = { id: number; message: string; undo?: () => Promise<unknown> | void };
type Show = (message: string, undo?: Toast["undo"]) => void;

const ToastContext = createContext<Show>(() => {});

export const useToast = () => useContext(ToastContext);

/**
 * One toast at a time. It stays until dismissed or replaced — no countdown to beat —
 * and always offers Undo when the action can be reversed.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, startTransition] = useTransition();

  const show = useCallback<Show>((message, undo) => {
    setToast({ id: Date.now(), message, undo });
  }, []);

  const undo = () => {
    const current = toast;
    if (!current?.undo) return;
    startTransition(async () => {
      await current.undo?.();
      setToast({ id: Date.now(), message: "Undone." });
    });
  };

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bar)+env(safe-area-inset-bottom)+12px)] z-40 flex justify-center px-4 lg:bottom-6 lg:pl-[var(--rail)]"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex min-h-12 max-w-md items-center gap-2 rounded-card bg-ink py-1.5 pr-1.5 pl-4 text-bg shadow-card"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={undo}
                disabled={pending}
                className="min-h-11 rounded-control px-3 font-bold underline underline-offset-4 hover:bg-white/10"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
              className="grid size-11 place-items-center rounded-control text-xl hover:bg-white/10"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext>
  );
}
