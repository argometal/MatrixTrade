"use client";

import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";

export function V2OpenCaptureButton({
  entityIds,
  eventDate,
  className,
  children,
}: {
  entityIds?: string[];
  /** Pre-fill date when registering on an event anchor */
  eventDate?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { openCapture } = useArgusAdd();

  return (
    <button
      type="button"
      onClick={() =>
        openCapture({
          entityIds,
          eventDate,
        })
      }
      className={className}
    >
      {children}
    </button>
  );
}
