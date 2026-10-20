"use client";

import { useActionState, useEffect, useRef } from "react";
import { addSource, findFeeds, type AddState, type DiscoverState } from "@/app/actions/sources";
import { useToast } from "@/components/ui/toast";

const VIA: Record<string, string> = {
  self: "the address you pasted",
  link: "advertised by the site",
  "common-path": "found at a standard address",
  youtube: "YouTube channel",
};

/** Step 1: paste a URL and see the feeds we found. Step 2: confirm one. */
export function AddSource() {
  const [found, discover, finding] = useActionState<DiscoverState, FormData>(findFeeds, {
    status: "idle",
  });
  const [added, add, adding] = useActionState<AddState, FormData>(addSource, { status: "idle" });
  const toast = useToast();
  const urlRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (found.status !== "idle") resultRef.current?.focus();
  }, [found]);
  useEffect(() => {
    if (added.status === "added") {
      toast(added.message ?? "Added.");
      if (urlRef.current) urlRef.current.value = "";
      urlRef.current?.focus();
    }
  }, [added, toast]);

  const showChoices = found.status === "found" && added.status !== "added";

  return (
    <section
      aria-labelledby="add-heading"
      className="rounded-card border border-line bg-surface p-5 shadow-card lg:p-6"
    >
      <h2 id="add-heading" className="text-lg font-bold">
        Add a source
      </h2>
      <form action={discover} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="source-url" className="sr-only">
          Site or YouTube channel address
        </label>
        <input
          ref={urlRef}
          id="source-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="smashingmagazine.com or youtube.com/@channel"
          className="min-h-12 flex-1 rounded-control border border-line bg-bg px-4"
        />
        <button
          type="submit"
          disabled={finding}
          className="min-h-12 rounded-control bg-accent px-5 font-bold text-accent-ink disabled:opacity-60"
        >
          {finding ? "Looking…" : "Find feeds"}
        </button>
      </form>

      <div ref={resultRef} tabIndex={-1} aria-live="polite" className="outline-none">
        {found.status === "none" && (
          <p className="mt-4 rounded-control bg-warn-soft p-4">{found.message}</p>
        )}
        {showChoices && (
          <form action={add} className="mt-4">
            <fieldset>
              <legend className="font-bold">
                {found.feeds.length === 1
                  ? "We found this feed:"
                  : `We found ${found.feeds.length} feeds. Pick one:`}
              </legend>
              <ul className="mt-2 flex flex-col gap-2">
                {found.feeds.map((f, i) => (
                  <li key={f.url}>
                    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-control border border-line p-3 has-checked:border-accent has-checked:bg-accent-soft">
                      <input
                        type="radio"
                        name="feedUrl"
                        value={f.url}
                        defaultChecked={i === 0}
                        className="mt-1 size-5 accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block font-bold">{f.title || f.url}</span>
                        <span className="block text-sm break-all text-muted">
                          {f.format.toUpperCase()} · {VIA[f.via]} · {f.url}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            {/* The chosen radio decides the URL; format and title follow the first match server-side. */}
            {found.feeds.map((f) => (
              <input
                key={f.url}
                type="hidden"
                name={`meta:${f.url}`}
                value={JSON.stringify({ format: f.format, title: f.title ?? "" })}
              />
            ))}
            <input type="hidden" name="siteUrl" value={found.siteUrl} />
            {added.status === "error" && <p className="mt-3 text-warn">{added.message}</p>}
            <button
              type="submit"
              disabled={adding}
              className="mt-4 min-h-12 rounded-control bg-accent px-5 font-bold text-accent-ink disabled:opacity-60"
            >
              {adding ? "Adding and fetching the latest posts…" : "Follow this source"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
