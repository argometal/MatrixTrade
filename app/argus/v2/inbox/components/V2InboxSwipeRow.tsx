"use client";

import type { KeyboardEvent, ReactNode } from "react";

/** Inbox list row — tap opens detail. No touch handlers (they block list scroll on iOS). */
export function V2InboxSwipeRow({
  children,
  onPress,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onPress: () => void;
  onSwipeLink?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  function onKeyDown(event: KeyboardEvent) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress();
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onPress}
      onKeyDown={onKeyDown}
      className={`min-w-0 touch-manipulation cursor-pointer text-left ${className}`}
    >
      {children}
    </div>
  );
}
