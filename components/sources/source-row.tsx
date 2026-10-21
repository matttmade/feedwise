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
  index,
}: {
  source: SourceRow;
  topics: TopicRow[];
  health: Health;
  index: number;
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

  return (
    <li
      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-(--s-3) border-b border-rule py-(--s-3) sm:grid-cols-[2.5rem_minmax(0,1fr)]"
      aria-busy={pending}
    >
      <span className="t-label pt-1.5">{String(index + 1).padStart(2, "0")}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-(--s-4) gap-y-(--s-1)">
          <div className="min-w-0">
            <h3 className={`t-lead ${source.muted ? "text-muted" : ""}`}>
              {source.title}
              {source.muted && <span className="t-label ml-(--s-2)">Muted</span>}
            </h3>
            <a
              href={source.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="t-label break-all underline-offset-4 hover:underline"
            >
              {source.siteUrl.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          </div>
          <p className="t-label flex items-center gap-(--s-2)">
            {health.tone === "warn" && <span aria-hidden="true" className="size-1.5 bg-accent" />}
            {health.label}
          </p>
        </div>
        {health.tone === "warn" && source.lastError && (
          <p className="mt-(--s-2) max-w-[62ch]">
            Last problem: {source.lastError}. We&apos;ll keep trying every couple of hours.
          </p>
        )}

        <div className="t-label mt-(--s-1) flex flex-wrap items-center gap-x-(--s-4)">
          <button type="button" onClick={toggleMute} aria-pressed={source.muted} className="link">
            {source.muted ? "Unmute" : "Mute"}
          </button>
          <RenameForm source={source} />
          <TopicPicker source={source} topics={topics} />
          {confirmRemove ? (
            <span className="flex flex-wrap items-center gap-x-(--s-3)">
              Remove {source.title} and its posts?
              <button
                type="button"
                onClick={() => start(() => removeSource(source.id))}
                className="link"
              >
                Yes, remove
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="link">
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className="link">
              Remove…
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function RenameForm({ source }: { source: SourceRow }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="link">
        Rename
      </button>
    );
  }
  return (
    <form
      className="flex w-full flex-wrap items-end gap-x-(--s-3) normal-case tracking-normal sm:w-auto"
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
        className="field t-body flex-1"
      />
      <button type="submit" disabled={pending} className="link">
        Save
      </button>
      <button type="button" onClick={() => setOpen(false)} className="link">
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
      <summary className="link cursor-pointer list-none">
        Topics{names.length ? `: ${names.join(", ")}` : ""}
      </summary>
      <fieldset className="t-body mt-(--s-2) border-t border-rule pt-(--s-2) normal-case" disabled={pending}>
        <legend className="sr-only">Topics for {source.title}</legend>
        {topics.length > 0 && (
          <ul className="flex flex-wrap gap-x-(--s-4)">
            {topics.map((t) => (
              <li key={t.id}>
                <label className="flex min-h-11 items-center gap-(--s-2)">
                  <input
                    type="checkbox"
                    checked={source.topicIds.includes(t.id)}
                    onChange={(e) => toggle(t.id, e.target.checked)}
                    className="size-4 accent-current"
                  />
                  {t.name}
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-(--s-2) flex items-end gap-(--s-3)">
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
            className="field flex-1"
          />
          <button type="button" onClick={add} className="link">
            Add
          </button>
        </div>
      </fieldset>
    </details>
  );
}
