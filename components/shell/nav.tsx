"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PressToggle } from "@/components/press/press-toggle";

type Tab = { href: string; label: string };

export const TABS: Tab[] = [
  { href: "/today", label: "Today" },
  { href: "/explore", label: "Explore" },
  { href: "/review", label: "Review" },
  { href: "/library", label: "Library" },
  { href: "/sources", label: "Sources" },
];

/** Settings and Help sit top-right on every screen size: same place every page. */
const UTILITY: Tab[] = [
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

const tabClass = (active: boolean) =>
  `flex min-h-11 items-center gap-1.5 underline-offset-[6px] decoration-1 transition-[text-underline-offset] duration-(--dur-1) ease-calm hover:underline ${
    active ? "underline" : ""
  }`;

/** Wordmark left, the main tabs (≥ 1024px), Sources, Settings and Help as small labels right. */
export function TopBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-ground">
      <div className="flex h-(--top) items-center gap-(--s-4) px-(--gutter)">
        <Link href="/today" className="wordmark flex min-h-11 items-center">
          Feedwise
        </Link>
        <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
          <ul className="flex gap-(--s-4)">
            {TABS.slice(0, 4).map(({ href, label }) => {
              const active = isActive(path, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={tabClass(active)}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <span className="flex-1 lg:hidden" />
        <ul className="flex gap-(--s-3)">
          <li>
            <PressToggle />
          </li>
          {[TABS[4], ...UTILITY].map(({ href, label }) => {
            const active = isActive(path, href);
            return (
              <li key={href} className={href === "/sources" ? "hidden lg:block" : undefined}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`t-label ${tabClass(active)}`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}

/** Bottom tab bar < 1024px: five words, the current one underlined. */
export function BottomBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-ground lg:hidden"
    >
      <ul className="mx-auto grid h-(--bar) max-w-lg grid-cols-5 px-2">
        {TABS.map(({ href, label }) => {
          const active = isActive(path, href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`${tabClass(active)} flex-1 justify-center`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
