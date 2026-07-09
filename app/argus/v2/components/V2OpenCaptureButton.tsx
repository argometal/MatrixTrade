"use client";

import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";

export function V2OpenCaptureButton({
  entityIds,
  entryType = "note",
  className,
  children,
}: {
  entityIds?: string[];
  entryType?: "log" | "note";
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
          entryType,
        })
      }
      className={className}
    >
      {children}
    </button>
  );
}
