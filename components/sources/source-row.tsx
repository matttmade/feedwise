"use client";

import { useState, useTransition } from "react";
import {
  createTopic,
  removeSource,
  renameSource,
  setMuted,
  setSourceTopics,
} from "@/app/actions/sources";
import type { SourceRow, TopicRow } from "@/lib/data/feed";
import { useToast } from "@/components/ui/toast";

type Health = { tone: "ok" | "warn" | "idle"; label: string };

export function SourceItem({
  source,
  topics,
  health,
}: {
  source: SourceRow;
  topics: TopicRow[];
  health: Health;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const toggleMute = () =>
    start(async () => {
      await setMuted(source.id, !source.muted);
      toast(source.muted ? `${source.title} is back in your feed.` : `Muted ${source.title}.`, () =>
        setMuted(source.id, source.muted),
      );
    });

  const toneClass =
    health.tone === "ok"
      ? "bg-keep-soft text-keep"
      : health.tone === "warn"
        ? "bg-warn-soft text-warn"
        : "bg-surface-2 text-muted";

  return (
    <li
      className={`rounded-card border border-line bg-surface p-4 ${source.muted ? "opacity-75" : ""}`}
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">
            {source.title}
            {source.muted && <span className="ml-2 text-sm font-normal text-muted">(muted)</span>}
          </h3>
          <a
            href={source.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm break-all text-muted underline underline-offset-2"
          >
            {source.siteUrl}
          </a>
        </div>
        <p className={`rounded-full px-3 py-1 text-sm ${toneClass}`}>{health.label}</p>
      </div>
      {health.tone === "warn" && source.lastError && (
        <p className="mt-2 text-sm text-muted">
          Last problem: {source.lastError}. We&apos;ll keep trying every couple of hours.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={source.muted}
          className="min-h-11 rounded-control border border-line px-4 hover:border-ink"
        >
          {source.muted ? "Unmute" : "Mute"}
        </button>
        <RenameForm source={source} />
        <TopicPicker source={source} topics={topics} />
        {confirmRemove ? (
          <span className="flex flex-wrap items-center gap-2 rounded-control bg-warn-soft px-3 py-1">
            Remove {source.title} and its posts?
            <button
              type="button"
              onClick={() => start(() => removeSource(source.id))}
              className="min-h-11 rounded-control px-3 font-bold text-warn underline"
            >
              Yes, remove
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="min-h-11 rounded-control px-3"
            >
              Keep it
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="min-h-11 rounded-control px-4 text-muted hover:text-ink"
          >
            Remove…
          </button>
        )}
      </div>
    </li>
  );
}

function RenameForm({ source }: { source: SourceRow }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-control border border-line px-4 hover:border-ink"
      >
        Rename
      </button>
    );
  }
  return (
    <form
      className="flex w-full flex-wrap gap-2 sm:w-auto"
      action={(form) =>
        start(async () => {
          await renameSource(source.id, String(form.get("title") ?? ""));
          setOpen(false);
        })
      }
    >
      <label htmlFor={`rename-${source.id}`} className="sr-only">
        New name for {source.title}
      </label>
      <input
        id={`rename-${source.id}`}
        name="title"
        defaultValue={source.title}
        autoFocus
        className="min-h-11 flex-1 rounded-control border border-line bg-bg px-3"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-control bg-accent px-4 font-bold text-accent-ink"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="min-h-11 rounded-control px-3"
      >
        Cancel
      </button>
    </form>
  );
}

function TopicPicker({ source, topics }: { source: SourceRow; topics: TopicRow[] }) {
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState("");
  const toggle = (id: string, on: boolean) =>
    start(() =>
      setSourceTopics(
        source.id,
        on ? [...source.topicIds, id] : source.topicIds.filter((t) => t !== id),
      ),
    );
  const add = () =>
    start(async () => {
      const created = await createTopic(newName);
      if (created) await setSourceTopics(source.id, [...source.topicIds, created.id]);
      setNewName("");
    });
  const names = topics.filter((t) => source.topicIds.includes(t.id)).map((t) => t.name);

  return (
    <details className="group w-full sm:w-auto">
      <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-control border border-line px-4 hover:border-ink">
        Topics{names.length ? `: ${names.join(", ")}` : ""}
      </summary>
      <fieldset className="mt-2 rounded-control border border-line p-3" disabled={pending}>
        <legend className="sr-only">Topics for {source.title}</legend>
        {topics.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.id}>
                <label className="flex min-h-11 items-center gap-2 rounded-control px-2">
                  <input
                    type="checkbox"
                    checked={source.topicIds.includes(t.id)}
                    onChange={(e) => toggle(t.id, e.target.checked)}
                    className="size-5 accent-[var(--accent)]"
                  />
                  {t.name}
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <label htmlFor={`topic-${source.id}`} className="sr-only">
            New topic
          </label>
          <input
            id={`topic-${source.id}`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="New topic, e.g. Motion"
            className="min-h-11 flex-1 rounded-control border border-line bg-bg px-3"
          />
          <button
            type="button"
            onClick={add}
            className="min-h-11 rounded-control border border-line px-4 hover:border-ink"
          >
            Add
          </button>
        </div>
      </fieldset>
    </details>
  );
}
