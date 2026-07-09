import Link from "next/link";

export type V2TagCloudItem = {
  name: string;
  count: number;
  color: string;
  weight: number;
};

const TAG_COLORS: Record<string, string> = {
  violet: "text-violet-300 hover:text-violet-200",
  emerald: "text-emerald-300 hover:text-emerald-200",
  amber: "text-amber-300 hover:text-amber-200",
  sky: "text-sky-300 hover:text-sky-200",
  orange: "text-orange-300 hover:text-orange-200",
};

/** Font size scales with recurrence — horizontal tag cloud (WCAG-friendly rem units). */
function tagFontSize(weight: number): string {
  const min = 0.75;
  const max = 1.35;
  return `${(min + weight * (max - min)).toFixed(3)}rem`;
}

export function V2TagCloud({ tags }: { tags: V2TagCloudItem[] }) {
  if (tags.length === 0) {
    return <p className="text-sm text-zinc-500">Tags appear on journal entries and inbox items.</p>;
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 leading-snug" role="list" aria-label="Tag cloud">
      {tags.map((tag) => (
        <Link
          key={tag.name}
          href={`/argus/v2/inbox?tag=${encodeURIComponent(tag.name)}`}
          role="listitem"
          className={`font-medium transition hover:underline ${TAG_COLORS[tag.color] ?? "text-zinc-300 hover:text-zinc-100"}`}
          style={{ fontSize: tagFontSize(tag.weight) }}
          title={`${tag.name} — ${tag.count} ${tag.count === 1 ? "use" : "uses"}`}
          aria-label={`${tag.name}, used ${tag.count} times`}
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
