import { argusBuildCommitUrl, getArgusBuildSha } from "@/lib/argus/build-info";

/** Deployed build id — short git SHA, shown near top-bar actions. */
export function V2BuildBadge({ className = "" }: { className?: string }) {
  const sha = getArgusBuildSha();
  const href = argusBuildCommitUrl(sha);
  const label = `Build ${sha}`;

  const classNames = `shrink-0 rounded-md border border-zinc-800/80 bg-zinc-900/50 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-600 ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${classNames} transition hover:border-zinc-700 hover:text-zinc-400`}
        title={label}
        aria-label={label}
      >
        {sha}
      </a>
    );
  }

  return (
    <span className={classNames} title={label} aria-label={label}>
      {sha}
    </span>
  );
}
