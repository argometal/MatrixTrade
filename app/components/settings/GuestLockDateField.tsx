"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string): string {
  const date = parseYmd(value);
  if (!date) return "Pick a date";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function buildMonthCells(year: number, monthIndex: number): Array<{ key: string; day: number | null; ymd: string | null }> {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{ key: string; day: number | null; ymd: string | null }> = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ key: `pad-${i}`, day: null, ymd: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const ymd = toYmd(new Date(year, monthIndex, day));
    cells.push({ key: ymd, day, ymd });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, day: null, ymd: null });
  }
  return cells;
}

export function GuestLockDateField({
  name,
  label,
  value,
  onChange,
  min,
  max,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const initial = selected ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

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
    const date = parseYmd(value) ?? new Date();
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  }, [open, value]);

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayYmd = toYmd(new Date());

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function pick(ymd: string) {
    if (min && ymd < min) return;
    if (max && ymd > max) return;
    onChange(ymd);
    setOpen(false);
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
          ▢
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute z-30 mt-2 w-[min(100%,19rem)] rounded-2xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl shadow-black/40"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="text-sm font-medium text-zinc-100">{monthLabel(viewYear, viewMonth)}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              if (!cell.ymd || cell.day == null) {
                return <span key={cell.key} className="h-9" />;
              }
              const disabled = Boolean((min && cell.ymd < min) || (max && cell.ymd > max));
              const isSelected = cell.ymd === value;
              const isToday = cell.ymd === todayYmd;
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(cell.ymd!)}
                  className={[
                    "h-9 rounded-lg text-sm transition",
                    disabled ? "cursor-not-allowed text-zinc-700" : "text-zinc-200 hover:bg-zinc-800",
                    isSelected ? "bg-violet-600 font-semibold text-white hover:bg-violet-500" : "",
                    !isSelected && isToday ? "ring-1 ring-zinc-500" : "",
                  ].join(" ")}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

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
              onClick={() => pick(todayYmd)}
              className="rounded-lg px-2 py-1 text-xs text-violet-300 hover:bg-zinc-800"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
