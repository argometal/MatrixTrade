"use client";

import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function buildMonthGrid(year: number, month: number): Array<number | null> {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) cells.push(day);
  return cells;
}

export function V2DayPicker({
  value,
  onChange,
  onSelectDay,
  disabled = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  /** When set, clicking a day calls this (e.g. save immediately). */
  onSelectDay?: (iso: string) => void;
  disabled?: boolean;
}) {
  const parsed = parseIso(value);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  useEffect(() => {
    const next = parseIso(value);
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [value]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = new Date().toISOString().slice(0, 10);

  function shiftMonth(delta: number) {
    let month = viewMonth + delta;
    let year = viewYear;
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    setViewMonth(month);
    setViewYear(year);
  }

  function pickDay(day: number) {
    const iso = toIsoDate(viewYear, viewMonth, day);
    onChange(iso);
    onSelectDay?.(iso);
  }

  const navBtn =
    "flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40";

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between gap-1">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setViewYear((y) => y - 1)}
            className={navBtn}
            aria-label="Previous year"
            title="Previous year"
          >
            «
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => shiftMonth(-1)}
            className={navBtn}
            aria-label="Previous month"
            title="Previous month"
          >
            ‹
          </button>
        </div>
        <p className="min-w-0 truncate px-1 text-center text-xs font-semibold text-zinc-200">
          {MONTHS[viewMonth - 1]} {viewYear}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => shiftMonth(1)}
            className={navBtn}
            aria-label="Next month"
            title="Next month"
          >
            ›
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setViewYear((y) => y + 1)}
            className={navBtn}
            aria-label="Next year"
            title="Next year"
          >
            »
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((label) => (
          <div key={label} className="py-1 text-center text-[9px] font-medium uppercase text-zinc-600">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-8" />;
          }
          const iso = toIsoDate(viewYear, viewMonth, day);
          const selected = iso === value;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => pickDay(day)}
              className={`flex h-8 items-center justify-center rounded-md text-xs font-medium transition ${
                selected
                  ? "bg-violet-600 text-white"
                  : isToday
                    ? "bg-zinc-800 text-violet-300 ring-1 ring-violet-500/40"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
