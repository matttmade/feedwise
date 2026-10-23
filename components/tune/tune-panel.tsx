"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_TUNE,
  DIALS,
  TUNE_GROUPS,
  changedTune,
  initTune,
  setTune,
  type TuneValues,
} from "@/lib/tune";

const fmt = (v: number, step: number) => v.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0);

/**
 * The Tune panel: every layout and effect dial, applied live as you drag. Opens from the top
 * bar (or the T key), sits over the right edge without blocking the page, so you can scroll
 * and see each change. "Copy settings" hands over the changed dials as JSON.
 */
export function TuneButton() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TuneValues>(DEFAULT_TUNE);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Sync from localStorage once mounted (the pre-paint script already applied the CSS).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage
    setValues(initTune());
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "Escape") setOpen(false);
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        t.closest("input, textarea, select, [contenteditable]")
      )
        return;
      if (e.key === "t" || e.key === "T") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  const update = (key: string, v: number | string) => {
    const next = { ...values, [key]: v };
    setValues(next);
    setTune(next);
    setCopied(false);
  };

  const copy = async () => {
    const text = JSON.stringify(changedTune(values), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.prompt("Copy these settings", text);
    }
  };

  const changed = Object.keys(changedTune(values)).length;

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="tune-panel"
        aria-keyshortcuts="T"
        onClick={() => setOpen((o) => !o)}
        className={`t-label flex min-h-11 items-center decoration-1 underline-offset-[6px] hover:underline ${
          open ? "underline" : ""
        }`}
      >
        Tune
      </button>
      {open &&
        // Portalled to <body>: the sticky header would otherwise trap it under the tab bar.
        createPortal(
          <div
            ref={panel}
            id="tune-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Tune layout and effects"
            tabIndex={-1}
            className="tune-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col border-t border-rule bg-ground text-ink outline-none lg:inset-x-auto lg:top-(--top) lg:right-0 lg:bottom-0 lg:max-h-none lg:w-[360px] lg:border-t-0 lg:border-l"
          >
            <div className="flex items-center justify-between gap-(--s-3) border-b border-rule px-(--s-3)">
              <p className="t-label">
                Tune{" "}
                <span className="text-muted tabular-nums">
                  · {String(changed).padStart(2, "0")} changed
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  button.current?.focus();
                }}
                className="t-label flex min-h-11 items-center hover:underline"
              >
                Close
              </button>
            </div>
            <div
              data-scroll-native
              className="flex-1 overflow-y-auto overscroll-contain px-(--s-3) pb-(--s-4)"
            >
              {TUNE_GROUPS.map((group) => (
                <fieldset key={group} className="mt-(--s-4)">
                  <legend className="t-label text-muted">{group}</legend>
                  {DIALS.filter((d) => d.group === group).map((d) => {
                    const id = `tune-${d.key}`;
                    const v = values[d.key];
                    return (
                      <div key={d.key} className="mt-(--s-2)">
                        <div className="flex items-baseline justify-between gap-(--s-2)">
                          <label htmlFor={id}>{d.label}</label>
                          {d.kind === "range" && (
                            <span className="t-label tabular-nums">
                              {fmt(Number(v), d.step)}
                              {d.unit ?? ""}
                            </span>
                          )}
                        </div>
                        {d.kind === "range" ? (
                          <input
                            id={id}
                            type="range"
                            min={d.min}
                            max={d.max}
                            step={d.step}
                            value={Number(v)}
                            onChange={(e) => update(d.key, Number(e.target.value))}
                            className="tune-range"
                          />
                        ) : (
                          <div role="radiogroup" aria-labelledby={id} className="flex gap-(--s-3)">
                            <span id={id} className="sr-only">
                              {d.label}
                            </span>
                            {d.options.map((o) => (
                              <button
                                key={o}
                                type="button"
                                role="radio"
                                aria-checked={v === o}
                                onClick={() => update(d.key, o)}
                                className={`flex min-h-11 items-center capitalize decoration-1 underline-offset-4 hover:underline ${
                                  v === o ? "underline" : "text-muted"
                                }`}
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              ))}
              <p className="mt-(--s-4) text-muted">
                Press dials show with Press on. Motion dials need motion on (Settings).
              </p>
            </div>
            <div className="flex items-center justify-between gap-(--s-3) border-t border-rule px-(--s-3)">
              <button type="button" onClick={copy} className="link">
                {copied ? "Copied" : "Copy settings →"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setValues(DEFAULT_TUNE);
                  setTune(DEFAULT_TUNE);
                }}
                disabled={!changed}
                className="t-label flex min-h-11 items-center hover:underline disabled:opacity-40"
              >
                Reset
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
