"use client";

import { useEffect, useState, useTransition } from "react";
import { addHighlight, removeHighlight } from "@/app/actions/highlights";
import { useToast } from "@/components/ui/toast";

const MIN_CHARS = 12;
const MAX_CHARS = 2000;
export const READER_BODY_ID = "reader-body";

/**
 * Turns a text selection inside the article into a highlight (button or H), and adds a
 * visible "Save image" button under every article image. Both become recall cards.
 */
export function Highlighter({ itemId }: { itemId: string }) {
  const [selection, setSelection] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  const save = (input: { text?: string; imageUrl?: string }, label: string) =>
    start(async () => {
      try {
        const { highlightId } = await addHighlight(itemId, input);
        window.getSelection()?.removeAllRanges();
        setSelection("");
        toast(`${label} It'll come back in Review.`, () => removeHighlight(highlightId));
      } catch {
        toast("That didn't save. Try selecting it again.");
      }
    });

  // Track the current selection when it sits inside the article body.
  useEffect(() => {
    const onChange = () => {
      const sel = window.getSelection();
      const body = document.getElementById(READER_BODY_ID);
      if (!sel || sel.isCollapsed || !body) return setSelection("");
      const inside = body.contains(sel.anchorNode) && body.contains(sel.focusNode);
      const text = sel.toString().replace(/\s+/g, " ").trim();
      setSelection(inside && text.length >= MIN_CHARS ? text.slice(0, MAX_CHARS) : "");
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  // H highlights the selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== "h") return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      if (!selection) return;
      e.preventDefault();
      save({ text: selection }, "Highlighted.");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save is stable enough per render
  }, [selection]);

  // A "Save image" button under each article image (the body is server HTML, so add them here).
  useEffect(() => {
    const body = document.getElementById(READER_BODY_ID);
    if (!body) return;
    const added: HTMLElement[] = [];
    body.querySelectorAll("img").forEach((img) => {
      const original = originalImageUrl(img.getAttribute("src") ?? "");
      if (!original || img.width < 120) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "save-image";
      button.textContent = "Save this image";
      button.addEventListener("click", () => save({ imageUrl: original }, "Image saved."));
      img.insertAdjacentElement("afterend", button);
      added.push(button);
    });
    return () => added.forEach((b) => b.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- attach once per item
  }, [itemId]);

  if (!selection) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="flex max-w-md items-center gap-2 rounded-card bg-ink py-1.5 pr-1.5 pl-4 text-bg shadow-card">
        <span className="line-clamp-1 flex-1 text-sm opacity-80">“{selection}”</span>
        <button
          type="button"
          onClick={() => save({ text: selection }, "Highlighted.")}
          disabled={pending}
          aria-keyshortcuts="H"
          className="min-h-11 shrink-0 rounded-control bg-bg px-4 font-bold text-ink"
        >
          Highlight this
        </button>
      </div>
    </div>
  );
}

/** Body images point at our proxy; the highlight stores the original address. */
function originalImageUrl(src: string): string | null {
  try {
    const u = new URL(src, window.location.origin);
    if (u.pathname === "/api/img") return u.searchParams.get("u");
    return /^https?:$/.test(u.protocol) && u.origin !== window.location.origin
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}
