import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { resolveBubblePositions } from "../lib/argus/v2/intelligence-viz";

const tags = [
  { name: "handover", x: 0.55, y: 0.72, count: 18, focus: false },
  { name: "latency", x: 0.72, y: 0.55, count: 12, focus: true },
  { name: "wells", x: 0.35, y: 0.48, count: 22, focus: false },
  { name: "supply", x: 0.48, y: 0.35, count: 8, focus: false },
  { name: "kickoff", x: 0.62, y: 0.28, count: 5, focus: false },
  { name: "sync", x: 0.28, y: 0.65, count: 9, focus: false },
];
const maxE = Math.max(...tags.map((t) => t.count));

function layout(mode: "bubble" | "dot") {
  const raw = tags.map((t) => ({
    id: t.name,
    x: 10 + t.x * 86,
    y: 88 - t.y * 76,
    r:
      mode === "bubble"
        ? 1.6 + Math.sqrt(t.count / maxE) * 3.2
        : 1.05 + Math.sqrt(t.count / maxE) * 0.5,
  }));
  return resolveBubblePositions(
    raw,
    { minX: 10, maxX: 96, minY: 12, maxY: 86 },
    mode === "bubble"
      ? { iterations: 10, padding: 0.35, jitter: 1.2 }
      : { iterations: 12, padding: 1.8, jitter: 0.9 }
  ).map((p) => ({ ...p, meta: tags.find((t) => t.name === p.id)! }));
}

function svg(mode: "bubble" | "dot", title: string) {
  const pts = layout(mode);
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="900" height="900">'
  );
  parts.push('<rect width="100" height="100" fill="#09090b"/>');
  parts.push(`<text x="50" y="5" text-anchor="middle" fill="#a1a1aa" font-size="3">${title}</text>`);
  for (const pct of [0.25, 0.5, 0.75]) {
    const y = 88 - pct * 76;
    const x = 10 + pct * 86;
    parts.push(
      `<line x1="10" y1="${y}" x2="96" y2="${y}" stroke="rgba(63,63,70,0.35)" stroke-width="0.25"/>`
    );
    parts.push(
      `<line x1="${x}" y1="10" x2="${x}" y2="88" stroke="rgba(63,63,70,0.35)" stroke-width="0.25"/>`
    );
  }
  for (const p of pts) {
    const selected = p.meta.name === "handover";
    const r =
      mode === "bubble" ? (selected ? p.r + 0.9 : p.r) : selected ? p.r + 0.35 : p.r;
    if (p.meta.focus) {
      const halo = mode === "bubble" ? r + 1.35 : r + 0.55;
      parts.push(
        `<circle cx="${p.x}" cy="${p.y}" r="${halo}" fill="none" stroke="rgb(251,191,36)" stroke-width="0.4" stroke-dasharray="0.7 0.55"/>`
      );
    }
    const fill = p.meta.focus ? "rgb(244,63,94)" : "rgb(167,139,250)";
    const opacity = selected ? 0.98 : mode === "bubble" ? 0.72 : 0.88;
    const stroke = selected ? "#fff" : "#27272a";
    parts.push(
      `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="0.35"/>`
    );
    const show = mode === "dot" || r >= 2.4 || p.meta.focus || selected;
    if (show) {
      const label = p.meta.focus ? `⚑ ${p.meta.name}` : p.meta.name;
      const labelFill = selected ? "#f4f4f5" : "#d4d4d8";
      parts.push(
        `<text x="${p.x}" y="${p.y + r + 2.35}" text-anchor="middle" fill="${labelFill}" font-size="2.2">${label}</text>`
      );
    }
  }
  parts.push("</svg>");
  return parts.join("\n");
}

async function main() {
  const out = "/opt/cursor/artifacts/screenshots";
  mkdirSync(out, { recursive: true });
  mkdirSync("artifacts/tag-intel-dots", { recursive: true });

  const jobs: Array<["bubble" | "dot", string, string]> = [
    ["bubble", "Before · large bubbles (labels often hidden)", "tag-intel-before-bubbles"],
    ["dot", "After · small dots (labels always on)", "tag-intel-after-dots"],
  ];
  for (const [mode, title, name] of jobs) {
    const s = svg(mode, title);
    writeFileSync(join("artifacts/tag-intel-dots", `${name}.svg`), s);
    const png = await sharp(Buffer.from(s)).png().toBuffer();
    writeFileSync(join("artifacts/tag-intel-dots", `${name}.png`), png);
    writeFileSync(join(out, `${name}.png`), png);
    console.log(name, png.length);
  }
}

main();
