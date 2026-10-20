"use client";

import { useState, useTransition } from "react";
import { savePrefs } from "@/app/actions/settings";
import { applyPrefsToDocument, REVIEW_CAPS, DAILY_GOALS, type Prefs } from "@/lib/prefs";

type Choice<T> = { value: T; label: string; hint?: string };

/** Every dial saves the moment it changes and applies straight away. */
export function PrefsForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [status, setStatus] = useState("");
  const [, start] = useTransition();

  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    applyPrefsToDocument(next);
    setStatus("Saving…");
    start(async () => {
      try {
        await savePrefs(next);
        setStatus("Saved.");
      } catch {
        setStatus("That didn't save. Try again in a moment.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <p role="status" aria-live="polite" className="min-h-6 text-muted">
        {status}
      </p>

      <Toggle
        id="calm"
        label="Calm mode"
        hint="Turns off motion and autoplay everywhere, whatever the settings below say."
        checked={prefs.calmMode}
        onChange={(v) => update("calmMode", v)}
      />

      <Segmented
        name="motion"
        legend="Motion"
        hint="Full adds the gentle lean while scrolling and the morph between views. Your device's “reduce motion” setting always wins."
        value={prefs.motion}
        disabled={prefs.calmMode}
        choices={[
          { value: "off", label: "Off" },
          { value: "reduced", label: "Reduced" },
          { value: "full", label: "Full" },
        ]}
        onChange={(v) => update("motion", v)}
      />

      <Segmented
        name="density"
        legend="Board density"
        hint="How many columns Explore shows."
        value={prefs.density}
        choices={[
          { value: "spacious", label: "Spacious" },
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ]}
        onChange={(v) => update("density", v)}
      />

      <Segmented
        name="textSize"
        legend="Text size"
        value={prefs.textSize}
        choices={[
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
          { value: "xl", label: "Extra large" },
        ]}
        onChange={(v) => update("textSize", v)}
      />

      <Toggle
        id="autoplay"
        label="Autoplay videos in Watch"
        hint="Always muted. Off in Calm mode."
        checked={prefs.autoplay && !prefs.calmMode}
        disabled={prefs.calmMode}
        onChange={(v) => update("autoplay", v)}
      />

      <Toggle
        id="captions"
        label="Captions on videos"
        hint="Turns captions on where YouTube or Vimeo has them."
        checked={prefs.captions}
        onChange={(v) => update("captions", v)}
      />

      <Segmented
        name="dailyGoal"
        legend="Today's set"
        hint="How many fresh posts Today offers."
        value={String(prefs.dailyGoal)}
        choices={DAILY_GOALS.map((n) => ({ value: String(n), label: `${n} a day` }))}
        onChange={(v) => update("dailyGoal", Number(v))}
      />

      <Segmented
        name="reviewCap"
        legend="Review cards per day"
        hint="Review never shows more than this, however many are due."
        value={String(prefs.reviewCap)}
        choices={REVIEW_CAPS.map((n) => ({ value: String(n), label: String(n) }))}
        onChange={(v) => update("reviewCap", Number(v))}
      />
    </div>
  );
}

function Segmented<T extends string>({
  name,
  legend,
  hint,
  value,
  choices,
  disabled,
  onChange,
}: {
  name: string;
  legend: string;
  hint?: string;
  value: T;
  choices: Choice<T>[];
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-60">
      <legend className="text-lg font-bold">{legend}</legend>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {choices.map((c) => (
          <label
            key={c.value}
            className="flex min-h-11 cursor-pointer items-center rounded-control border border-line bg-surface px-4 has-checked:border-accent has-checked:bg-accent-soft has-checked:font-bold has-checked:text-accent has-focus-visible:outline-3 has-focus-visible:outline-[var(--focus)]"
          >
            <input
              type="radio"
              name={name}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
              className="sr-only"
            />
            {c.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${disabled ? "opacity-60" : ""}`}>
      <div>
        <label htmlFor={id} className="text-lg font-bold">
          {label}
        </label>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition-colors before:block before:size-6 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-keep checked:before:translate-x-5.5"
      />
    </div>
  );
}
