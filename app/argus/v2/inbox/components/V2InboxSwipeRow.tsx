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
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  function onTouchStart(event: React.TouchEvent) {
    if (disabled) return;
    startX.current = event.touches[0].clientX;
    startY.current = event.touches[0].clientY;
    setSwiping(true);
  }

  function onTouchMove(event: React.TouchEvent) {
    if (!swiping || disabled) return;
    const dx = event.touches[0].clientX - startX.current;
    const dy = event.touches[0].clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) setOffset(Math.min(dx, 96));
    else setOffset(0);
  }

  function onTouchEnd() {
    if (disabled) return;
    if (offset >= 72) {
      onSwipeLink();
    } else if (offset < 8) {
      onPress();
    }
    setOffset(0);
    setSwiping(false);
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 left-0 flex w-24 items-center justify-center rounded-xl bg-emerald-600/90 text-xs font-bold text-white"
        style={{ opacity: offset > 20 ? 1 : 0 }}
        aria-hidden
      >
        Link →
      </div>
      <div
        className="relative transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
