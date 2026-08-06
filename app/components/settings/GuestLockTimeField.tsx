"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type ClockMode = "hour" | "minute";

function parseHm(value: string): { hour: number; minute: number } | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hour: h, minute: m };
}

function formatHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDisplay(value: string): string {
  const parsed = parseHm(value);
  if (!parsed) return "Pick a time";
  const d = new Date();
  d.setHours(parsed.hour, parsed.minute, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function angleForHour(hour: number): number {
  // 24h face: 0 at top, clockwise
  return (hour % 24) * 15 - 90;
}

function angleForMinute(minute: number): number {
  return (minute % 60) * 6 - 90;
}

function pointOnCircle(angleDeg: number, radius: number, cx = 100, cy = 100) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function snapFromPointer(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
  mode: ClockMode
): number {
  const rect = svg.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  if (mode === "hour") {
    return Math.round(deg / 15) % 24;
  }
  // 5-minute steps
  return (Math.round(deg / 30) * 5) % 60;
}

export function GuestLockTimeField({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ClockMode>("hour");
  const parsed = parseHm(value) ?? { hour: 9, minute: 0 };
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const dragging = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const next = parseHm(value) ?? { hour: 9, minute: 0 };
    setHour(next.hour);
    setMinute(next.minute);
    setMode("hour");
  }, [open, value]);

  const handAngle = mode === "hour" ? angleForHour(hour) : angleForMinute(minute);
  const handEnd = pointOnCircle(handAngle, mode === "hour" ? 58 : 70);
  const hourMarks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => {
        const outer = pointOnCircle(angleForHour(h), h % 6 === 0 ? 82 : 78);
        const label = h % 3 === 0 ? pointOnCircle(angleForHour(h), 64) : null;
        return { h, outer, label };
      }),
    []
  );
  const minuteMarks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const m = i * 5;
        const outer = pointOnCircle(angleForMinute(m), 82);
        const label = pointOnCircle(angleForMinute(m), 64);
        return { m, outer, label };
      }),
    []
  );

  function commit(nextHour: number, nextMinute: number) {
    onChange(formatHm(nextHour, nextMinute));
  }

  function applyFromEvent(event: React.PointerEvent | PointerEvent, advanceAfterHour = false) {
    const svg = svgRef.current;
    if (!svg) return;
    const next = snapFromPointer(event.clientX, event.clientY, svg, mode);
    if (mode === "hour") {
      setHour(next);
      if (advanceAfterHour) setMode("minute");
      commit(next, minute);
    } else {
      setMinute(next);
      commit(hour, next);
    }
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    applyFromEvent(event, true);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    applyFromEvent(event);
  }

  function onPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    dragging.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  return (
    <div ref={rootRef} className="relative block">
      <input type="hidden" name={name} value={value} />
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-left text-sm text-zinc-100 hover:border-zinc-500"
      >
        <span className={value ? "text-zinc-100" : "text-zinc-500"}>{formatDisplay(value)}</span>
        <span className="text-zinc-500" aria-hidden>
          ◌
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`${label} clock`}
          className="absolute z-30 mt-2 w-[min(100%,19rem)] rounded-2xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl shadow-black/40"
        >
          <div className="mb-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setMode("hour")}
              className={[
                "rounded-lg px-3 py-1.5 font-mono text-2xl tabular-nums",
                mode === "hour" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300",
              ].join(" ")}
            >
              {String(hour).padStart(2, "0")}
            </button>
            <span className="text-2xl text-zinc-500">:</span>
            <button
              type="button"
              onClick={() => setMode("minute")}
              className={[
                "rounded-lg px-3 py-1.5 font-mono text-2xl tabular-nums",
                mode === "minute" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300",
              ].join(" ")}
            >
              {String(minute).padStart(2, "0")}
            </button>
          </div>

          <p className="mb-2 text-center text-[11px] text-zinc-500">
            {mode === "hour" ? "Drag or tap the clock to set the hour (24h)" : "Drag or tap to set minutes (5-min steps)"}
          </p>

          <svg
            ref={svgRef}
            viewBox="0 0 200 200"
            className="mx-auto block h-52 w-52 touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <circle cx="100" cy="100" r="92" fill="#09090b" stroke="#3f3f46" strokeWidth="2" />
            <circle cx="100" cy="100" r="3" fill="#a78bfa" />

            {mode === "hour"
              ? hourMarks.map(({ h, outer, label }) => (
                  <g key={h}>
                    <circle cx={outer.x} cy={outer.y} r={h === hour ? 2.5 : 1.2} fill={h === hour ? "#a78bfa" : "#52525b"} />
                    {label ? (
                      <text
                        x={label.x}
                        y={label.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-zinc-400"
                        style={{ fontSize: 10, fontWeight: h === hour ? 700 : 500 }}
                        fill={h === hour ? "#ddd6fe" : "#a1a1aa"}
                      >
                        {h}
                      </text>
                    ) : null}
                  </g>
                ))
              : minuteMarks.map(({ m, outer, label }) => (
                  <g key={m}>
                    <circle cx={outer.x} cy={outer.y} r={m === minute ? 2.5 : 1.2} fill={m === minute ? "#a78bfa" : "#52525b"} />
                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: 10, fontWeight: m === minute ? 700 : 500 }}
                      fill={m === minute ? "#ddd6fe" : "#a1a1aa"}
                    >
                      {String(m).padStart(2, "0")}
                    </text>
                  </g>
                ))}

            <line
              x1="100"
              y1="100"
              x2={handEnd.x}
              y2={handEnd.y}
              stroke="#8b5cf6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={handEnd.x} cy={handEnd.y} r="8" fill="#7c3aed" />
          </svg>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                commit(hour, minute);
                setOpen(false);
              }}
              className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
