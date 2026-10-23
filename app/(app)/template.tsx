import { ViewTransition } from "react";

/**
 * Every page in the app enters and exits through a view transition: the old page lifts
 * away, the new one rises in (see .page-in / .page-out in globals.css). Full motion only.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
