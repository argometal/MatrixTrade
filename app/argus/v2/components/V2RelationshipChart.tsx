/** Decorative sparkline from monthly activity counts (mockup-style relationship chart). */
export function V2RelationshipChart({
  points,
  startYear,
  endYear,
}: {
  points: number[];
  startYear?: number;
  endYear?: number;
}) {
  if (points.length < 2) {
    return (
      <div className="mb-4 flex h-16 items-center justify-center rounded-xl bg-zinc-950/60 text-xs text-zinc-600">
        Not enough history yet
      </div>
    );
  }

  const max = Math.max(...points, 1);
  const width = 280;
  const height = 64;
  const pad = 4;
  const step = (width - pad * 2) / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = height - pad - (v / max) * (height - pad * 2);
    return `${x},${y}`;
  });

  const area = `${pad},${height - pad} ${coords.join(" ")} ${pad + (points.length - 1) * step},${height - pad}`;

  return (
    <svg viewBox={`0 0 ${width} ${height + 16}`} className="mb-2 h-[4.5rem] w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="orgSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#orgSparkFill)" />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="rgb(52, 211, 153)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {startYear && endYear ? (
        <>
          <text x={pad} y={height + 12} fill="rgb(113, 113, 122)" fontSize="9">
            {startYear}
          </text>
          <text x={width - pad - 24} y={height + 12} fill="rgb(113, 113, 122)" fontSize="9">
            {endYear}
          </text>
        </>
      ) : null}
    </svg>
  );
}
