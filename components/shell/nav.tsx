"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { GridIcon, HelpIcon, RssIcon, SunIcon } from "@/components/ui/icons";

type Tab = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

// Review and Library join in Phase 2.
export const TABS: Tab[] = [
  { href: "/today", label: "Today", icon: SunIcon },
  { href: "/explore", label: "Explore", icon: GridIcon },
  { href: "/sources", label: "Sources", icon: RssIcon },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** Left rail ≥ 1024px. */
export function Rail() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-30 hidden w-[var(--rail)] flex-col items-center border-r border-line bg-surface py-4 lg:flex"
    >
      <Link
        href="/today"
        className="mb-6 grid size-11 place-items-center rounded-control bg-accent text-lg font-bold text-accent-ink"
        aria-label="Feedwise home"
      >
        F
      </Link>
      <ul className="flex flex-1 flex-col gap-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex w-18 flex-col items-center gap-1 rounded-control px-1 py-2 text-sm ${
                  active
                    ? "bg-accent-soft font-bold text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/help"
        aria-current={isActive(path, "/help") ? "page" : undefined}
        className="flex w-18 flex-col items-center gap-1 rounded-control px-1 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink"
      >
        <HelpIcon />
        Help
      </Link>
    </nav>
  );
}

/** Bottom tab bar < 1024px. */
export function BottomBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden"
    >
      <ul className="mx-auto grid h-[var(--bar)] max-w-md grid-cols-3">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-sm ${
                  active ? "font-bold text-accent" : "text-muted"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Help sits top-right on small screens and bottom of the rail on large ones: same place every page. */
export function MobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between px-4 lg:hidden">
      <Link href="/today" className="text-lg font-bold">
        Feedwise
      </Link>
      <Link
        href="/help"
        className="flex min-h-11 items-center gap-1.5 rounded-control px-3 text-muted hover:text-ink"
      >
        <HelpIcon width={20} height={20} />
        Help
      </Link>
    </header>
  );
}
