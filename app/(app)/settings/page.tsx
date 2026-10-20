import type { Metadata } from "next";
import { Suspense } from "react";
import { getSettings } from "@/lib/data/feed";
import { PrefsForm } from "@/components/settings/prefs-form";

export const metadata: Metadata = { title: "Make it mine" };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="pt-2 text-2xl font-bold lg:pt-0">Make it mine</h1>
      <p className="mt-1 text-muted">You hold the dials. Changes save and apply straight away.</p>
      <Suspense
        fallback={
          <div aria-hidden="true" className="mt-6 h-96 animate-pulse rounded-card bg-surface-2" />
        }
      >
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  return <PrefsForm initial={await getSettings()} />;
}
