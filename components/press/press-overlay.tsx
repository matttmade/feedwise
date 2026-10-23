/**
 * Printer's furniture for the Press edition: registration marks and crop lines bleeding off
 * the corners of the screen, a small colour bar, and a faint paper grain. Decorative only:
 * hidden from assistive tech, never takes pointer events, invisible unless Press is on.
 */
const Mark = () => (
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    <circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" strokeWidth="0.75" />
    <circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="0.75" />
    <path d="M20 4v32M4 20h32" stroke="currentColor" strokeWidth="0.75" />
  </svg>
);

export function PressOverlay() {
  return (
    <div className="press-furniture" aria-hidden="true">
      <div className="press-grain" />
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <div key={c} className={`press-mark press-${c}`}>
          <Mark />
          <span className="press-crop" />
        </div>
      ))}
      <div className="press-colorbar">
        <i style={{ background: "#00a6d6" }} />
        <i style={{ background: "#d6006f" }} />
        <i style={{ background: "#f2cf00" }} />
        <i style={{ background: "#1c1a16" }} />
        <i style={{ background: "#1c1a16", opacity: 0.5 }} />
        <i style={{ background: "#1c1a16", opacity: 0.25 }} />
      </div>
    </div>
  );
}
