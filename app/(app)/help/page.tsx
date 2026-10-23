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
  ["T", "Open or close Tune (layout and effects)"],
  ["Tab / Shift+Tab", "Move between cards and buttons"],
];

export default function HelpPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="t-display">Help</h1>

      <section aria-labelledby="how" className="mt-(--s-5) lg:grid-12">
        <h2 id="how" className="t-label lg:col-span-3 lg:pt-1">
          How The Me Times works
        </h2>
        <ul className="mt-(--s-2) flex max-w-[62ch] flex-col gap-(--s-2) lg:col-span-9 lg:mt-0">
          <li>
            <em>Sources</em> are sites and YouTube channels you follow. We check them every couple
            of hours.
          </li>
          <li>
            <em>Today</em> is a feed that keeps refreshing, ranked by what you read and keep. Open,
            read, Keep and Skip all teach it. It ends too, and Shuffle mixes it up.
          </li>
          <li>
            <em>Explore</em> shows the rest as a board. It ends too — nothing scrolls forever.
          </li>
          <li>
            <em>Keep</em> saves something worth remembering. Skip just moves it out of the way. Both
            can be undone.
          </li>
          <li>
            The Reader remembers where you stopped, and offers to take you back. It never jumps on
            its own.
          </li>
          <li>
            <em>Review</em> brings back what you kept and highlighted, starting the next day. Say
            how it went and it comes back sooner or later. Never more than your daily cap (10 unless
            you change it in Settings).
          </li>
          <li>
            <em>Gestures:</em> swipe a card right to keep it or left to hide it, or press and hold
            to keep. In Swipe, swipe up to open. Every gesture also has a button and a key.
          </li>
          <li>
            <em>Explore has three views:</em> Board (a wall of cards), Swipe (one at a time, ten per
            set) and Watch (videos, one per screen, eight per session).
          </li>
          <li>
            <em>Settings</em> holds the dials: motion, density, text size, autoplay, captions, how
            many reviews a day, and Calm mode.
          </li>
          <li>
            <em>Library</em> holds everything you&apos;ve kept and highlighted, with search.
          </li>
        </ul>
      </section>

      <section aria-labelledby="keys" className="mt-(--s-6) lg:grid-12">
        <h2 id="keys" className="t-label lg:col-span-3 lg:pt-1">
          Keyboard shortcuts
        </h2>
        <table className="mt-(--s-2) w-full border-collapse text-left lg:col-span-9 lg:mt-0">
          <thead className="t-label">
            <tr className="border-b border-rule">
              <th scope="col" className="py-(--s-2) pr-(--s-4) font-normal">
                Key
              </th>
              <th scope="col" className="py-(--s-2) font-normal">
                What it does
              </th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(([key, what]) => (
              <tr key={key} className="border-b border-rule">
                <td className="py-(--s-2) pr-(--s-4) align-baseline whitespace-nowrap">
                  <kbd className="font-mono text-(length:--t-label) tracking-(--tr-label)">
                    {key}
                  </kbd>
                </td>
                <td className="py-(--s-2)">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="account" className="mt-(--s-6) lg:grid-12">
        <h2 id="account" className="t-label lg:col-span-3 lg:pt-1">
          Account
        </h2>
        <form action="/auth/signout" method="post" className="mt-(--s-1) lg:col-span-9 lg:mt-0">
          <button type="submit" className="link">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
