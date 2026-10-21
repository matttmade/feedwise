import type { ReactNode } from "react";

/** The end of every list or deck: a hairline, a label, one sentence, then where to go next. */
export function Finish({
  title,
  label = "End",
  children,
}: {
  title: string;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <section className="lg:grid-12 mt-(--s-5) border-t border-rule pt-(--s-3)">
      <p className="t-label lg:col-span-3">{label}</p>
      <div className="mt-(--s-2) flex max-w-[62ch] flex-col items-start gap-(--s-2) lg:col-span-9 lg:mt-0">
        <h2 className="t-lead">{title}</h2>
        {children}
      </div>
    </section>
  );
}
