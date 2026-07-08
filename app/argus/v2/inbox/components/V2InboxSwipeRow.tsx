"use client";

import { useRef, useState, type ReactNode } from "react";

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
  const offsetRef = useRef(0);
  const touchPressRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  function onTouchStart(event: React.TouchEvent) {
    if (disabled) return;
    startX.current = event.touches[0].clientX;
    startY.current = event.touches[0].clientY;
    offsetRef.current = 0;
    touchPressRef.current = false;
    setSwiping(true);
  }

  function onTouchMove(event: React.TouchEvent) {
    if (!swiping || disabled) return;
    const dx = event.touches[0].clientX - startX.current;
    const dy = event.touches[0].clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 12) return;
    if (dx > 0) {
      const next = Math.min(dx, 96);
      offsetRef.current = next;
      setOffset(next);
      if (next > 8) event.preventDefault();
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  }

  function onTouchEnd() {
    if (disabled) return;
    const finalOffset = offsetRef.current;
    if (finalOffset >= 64) {
      onSwipeLink();
    } else if (finalOffset < 8) {
      touchPressRef.current = true;
      onPress();
    }
    offsetRef.current = 0;
    setOffset(0);
    setSwiping(false);
  }

  function onClick() {
    if (disabled) return;
    if (touchPressRef.current) {
      touchPressRef.current = false;
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
        className="relative cursor-pointer touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 150ms ease-out",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
