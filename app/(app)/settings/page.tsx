import type { Metadata } from "next";
import { Suspense } from "react";
import { getSettings } from "@/lib/data/feed";
import { PrefsForm } from "@/components/settings/prefs-form";

export const metadata: Metadata = { title: "Make it mine" };

export default function SettingsPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="t-display">
        Make it <em>mine</em>
      </h1>
      <p className="mt-(--s-2)">You hold the dials. Changes save and apply straight away.</p>
      <Suspense
        fallback={<div aria-hidden="true" className="mt-(--s-5) h-96 animate-pulse bg-tint" />}
      >
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  return <PrefsForm initial={await getSettings()} />;
}
