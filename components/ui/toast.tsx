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
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bar)+env(safe-area-inset-bottom)+12px)] z-40 flex justify-center px-4 lg:bottom-(--s-4)"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex min-h-12 max-w-md items-center gap-(--s-3) bg-ink py-1 pr-1 pl-(--s-3) text-ground motion-safe:animate-[enter_var(--dur-2)_var(--ease)]"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={undo}
                disabled={pending}
                className="min-h-11 px-2 underline underline-offset-4"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
              className="grid size-11 place-items-center opacity-60 transition-opacity duration-(--dur-1) ease-calm hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext>
  );
}
