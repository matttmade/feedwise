import type { Metadata } from "next";

export const metadata: Metadata = { title: "Help" };

const SHORTCUTS = [
  ["K", "Keep the focused card, or the item you're reading"],
  ["X", "Skip the focused card"],
  ["Enter", "Open the focused card"],
  ["Esc", "Close the Reader"],
  ["H", "Highlight the text you've selected in the Reader"],
  ["Space / Enter", "Show the answer in Review"],
  ["1 / 2 / 3", "Forgot / Shaky / Got it in Review"],
  ["→ / ← / ↑", "Keep / Skip / Open the top card in Swipe"],
  ["↓ / ↑", "Next / previous video in Watch"],
  ["Tab / Shift+Tab", "Move between cards and buttons"],
];

export default function HelpPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="pt-2 text-2xl font-bold lg:pt-0">Help</h1>

      <section aria-labelledby="how" className="mt-6">
        <h2 id="how" className="text-lg font-bold">
          How Feedwise works
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Sources</strong> are sites and YouTube channels you follow. We check them every
            couple of hours.
          </li>
          <li>
            <strong>Today</strong> gives you a short set (3–5) of fresh posts. When it&apos;s done,
            you&apos;re done.
          </li>
          <li>
            <strong>Explore</strong> shows the rest as a board. It ends too — nothing scrolls
            forever.
          </li>
          <li>
            <strong>Keep</strong> saves something worth remembering. Skip just moves it out of the
            way. Both can be undone.
          </li>
          <li>
            The Reader remembers where you stopped, and offers to take you back. It never jumps on
            its own.
          </li>
          <li>
            <strong>Review</strong> brings back what you kept and highlighted, starting the next
            day. Say how it went and it comes back sooner or later. Never more than your daily cap
            (10 unless you change it in Settings).
          </li>
          <li>
            <strong>Gestures:</strong> swipe a card right to keep it or left to hide it, or press
            and hold to keep. In Swipe, swipe up to open. Every gesture also has a button and a key.
          </li>
          <li>
            <strong>Explore has three views:</strong> Board (a wall of cards), Swipe (one at a time,
            ten per set) and Watch (videos, one per screen, eight per session).
          </li>
          <li>
            <strong>Settings</strong> holds the dials: motion, density, text size, autoplay,
            captions, how many posts and reviews a day, and Calm mode.
          </li>
          <li>
            <strong>Library</strong> holds everything you&apos;ve kept and highlighted, with search.
          </li>
        </ul>
      </section>

      <section aria-labelledby="keys" className="mt-8">
        <h2 id="keys" className="text-lg font-bold">
          Keyboard shortcuts
        </h2>
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-2 pr-4">
                Key
              </th>
              <th scope="col" className="py-2">
                What it does
              </th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(([key, what]) => (
              <tr key={key} className="border-b border-line">
                <td className="py-2 pr-4">
                  <kbd className="rounded border border-line bg-surface-2 px-2 py-0.5">{key}</kbd>
                </td>
                <td className="py-2">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="account" className="mt-8">
        <h2 id="account" className="text-lg font-bold">
          Account
        </h2>
        <form action="/auth/signout" method="post" className="mt-2">
          <button
            type="submit"
            className="min-h-11 rounded-control border border-line px-4 hover:border-ink"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
