"use client";

import { useRef, useState, type ReactNode } from "react";

const TAP_SLOP_PX = 12;
const SWIPE_LINK_PX = 64;

export function V2InboxSwipeRow({
  children,
  onPress,
  onSwipeLink,
  disabled,
}: {
  children: ReactNode;
  onPress: () => void;
  onSwipeLink: () => void;
  disabled?: boolean;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const maxDx = useRef(0);
  const maxDy = useRef(0);
  const offsetRef = useRef(0);
  /** True when finger moved enough to count as scroll or swipe — suppresses synthetic click. */
  const suppressPressRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  function onTouchStart(event: React.TouchEvent) {
    if (disabled) return;
    startX.current = event.touches[0].clientX;
    startY.current = event.touches[0].clientY;
    maxDx.current = 0;
    maxDy.current = 0;
    offsetRef.current = 0;
    suppressPressRef.current = false;
    setSwiping(true);
  }

  function onTouchMove(event: React.TouchEvent) {
    if (!swiping || disabled) return;
    const dx = event.touches[0].clientX - startX.current;
    const dy = event.touches[0].clientY - startY.current;
    maxDx.current = Math.max(maxDx.current, Math.abs(dx));
    maxDy.current = Math.max(maxDy.current, Math.abs(dy));

    if (maxDx.current > TAP_SLOP_PX || maxDy.current > TAP_SLOP_PX) {
      suppressPressRef.current = true;
    }

    // Vertical scroll — do not capture; let the list scroll.
    if (maxDy.current > TAP_SLOP_PX && maxDy.current >= maxDx.current) {
      offsetRef.current = 0;
      setOffset(0);
      return;
    }

    if (dx > 0 && maxDx.current > maxDy.current) {
      const next = Math.min(dx, 96);
      offsetRef.current = next;
      setOffset(next);
    } else if (dx <= 0) {
      offsetRef.current = 0;
      setOffset(0);
    }
  }

  function onTouchEnd() {
    if (disabled) return;
    const finalOffset = offsetRef.current;
    const wasScroll = maxDy.current > TAP_SLOP_PX && maxDy.current >= maxDx.current;

    if (finalOffset >= SWIPE_LINK_PX && !wasScroll) {
      suppressPressRef.current = true;
      onSwipeLink();
    }

    offsetRef.current = 0;
    setOffset(0);
    setSwiping(false);
  }

  function onClick() {
    if (disabled) return;
    if (suppressPressRef.current) {
      suppressPressRef.current = false;
      return;
    }
    onPress();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 flex w-24 items-center justify-center rounded-xl bg-emerald-600/90 text-xs font-bold text-white transition-opacity"
        style={{ opacity: offset > 16 ? 1 : 0 }}
        aria-hidden
      >
        Link →
      </div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className="relative cursor-pointer"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 150ms ease-out",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
