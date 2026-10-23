import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter_Tight, Newsreader } from "next/font/google";
import { PREFS_SCRIPT } from "@/lib/prefs";
import { PRESS_SCRIPT } from "@/lib/press";
import { PressOverlay } from "@/components/press/press-overlay";
import "./globals.css";

// Free stand-ins for Flecha M, GT Standard and GT Standard Mono (DESIGN.md §3).
const display = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});
const text = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Feedwise", template: "%s · Feedwise" },
  description: "Your sites, as a visual learning feed.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121110",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Full motion until the prefs script (or the OS setting) says otherwise.
      data-motion="full"
      className={`${display.variable} ${text.variable} ${mono.variable} h-full`}
      // The prefs script below sets data-* attributes before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PRESS_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-ground focus:px-4 focus:py-3 focus:underline"
        >
          Skip to content
        </a>
        {children}
        <PressOverlay />
      </body>
    </html>
  );
}
