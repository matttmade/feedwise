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
    <section aria-labelledby="add-heading">
      <h2 id="add-heading" className="t-lead">
        Add a source
      </h2>
      <form action={discover} className="mt-(--s-3)">
        <label htmlFor="source-url" className="t-label">
          Site or YouTube channel address
        </label>
        <div className="flex items-end gap-(--s-3)">
          <input
            ref={urlRef}
            id="source-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="smashingmagazine.com or youtube.com/@channel"
            className="field flex-1"
          />
          <button type="submit" disabled={finding} className="link shrink-0">
            {finding ? "Looking…" : "Find feeds →"}
          </button>
        </div>
      </form>

      <div ref={resultRef} tabIndex={-1} aria-live="polite" className="outline-none">
        {found.status === "none" && <p className="mt-(--s-3) max-w-[62ch]">{found.message}</p>}
        {showChoices && (
          <form action={add} className="mt-(--s-4)">
            <fieldset>
              <legend className="t-label">
                {found.feeds.length === 1
                  ? "We found this feed:"
                  : `We found ${found.feeds.length} feeds. Pick one:`}
              </legend>
              <ul className="mt-(--s-2) border-t border-rule">
                {found.feeds.map((f, i) => (
                  <li key={f.url} className="border-b border-rule">
                    <label className="flex min-h-12 cursor-pointer items-start gap-(--s-3) py-(--s-3)">
                      <input
                        type="radio"
                        name="feedUrl"
                        value={f.url}
                        defaultChecked={i === 0}
                        className="mt-1 size-4 accent-current"
                      />
                      <span>
                        <span className="block">{f.title || f.url}</span>
                        <span className="t-label block break-all">
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
            {added.status === "error" && <p className="mt-(--s-3)">{added.message}</p>}
            <button type="submit" disabled={adding} className="btn mt-(--s-4)">
              {adding ? "Adding and fetching the latest posts…" : "Follow this source →"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
