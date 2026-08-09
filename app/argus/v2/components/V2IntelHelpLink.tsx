import Link from "next/link";

/** Compact deep-link into Help (topic filter). Keeps legends off the Intelligence canvases. */
export function V2IntelHelpLink({
  topic,
  label = "Help",
  className = "",
}: {
  topic: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/argus/v2/help?topic=${encodeURIComponent(topic)}`}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 ring-1 ring-zinc-800/80 transition hover:bg-zinc-900 hover:text-violet-200 hover:ring-violet-500/35 ${className}`}
      title={`Open Help · ${label}`}
    >
      <span aria-hidden>?</span>
      <span>{label}</span>
    </Link>
  );
}
