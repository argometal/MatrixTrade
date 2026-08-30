/**
 * Display-only MXT product mark (Prompt #4 branding experiment).
 * Does not rename packages, routes, APIs, MTAE, or historical identifiers.
 */

type MxtBrandMarkProps = {
  /** Compact mark for sidebar / mobile chrome. */
  size?: "sm" | "md";
  /** Dark trading shell vs light public/login chrome. */
  tone?: "dark" | "light";
  className?: string;
};

export function MxtBrandMark({
  size = "sm",
  tone = "dark",
  className = "",
}: MxtBrandMarkProps) {
  const text = tone === "dark" ? "text-zinc-100" : "text-zinc-900";
  const mute = tone === "dark" ? "text-zinc-400" : "text-zinc-500";
  const xScale = size === "md" ? "text-2xl leading-none" : "text-lg leading-none";
  const side = size === "md" ? "text-base leading-none" : "text-sm leading-none";

  return (
    <span
      className={`inline-flex items-baseline gap-0.5 font-semibold tracking-tight ${text} ${className}`}
      aria-label="MXT"
      title="MXT"
    >
      <span className={`${side} ${mute}`}>M</span>
      <span className={`${xScale} font-bold text-violet-500`}>X</span>
      <span className={`${side} ${mute}`}>T</span>
    </span>
  );
}

/** Violet tile + MXT wordmark — trading shell header/sidebar. */
export function MxtBrandLockup({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
        <span aria-hidden className="leading-none">
          <span className="text-[10px] opacity-80">M</span>
          <span className="text-sm">X</span>
          <span className="text-[10px] opacity-80">T</span>
        </span>
      </span>
      <MxtBrandMark size="sm" tone="dark" />
    </span>
  );
}
