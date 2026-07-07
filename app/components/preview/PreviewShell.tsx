import type { PreviewNavContext } from "@/lib/preview-nav";
import { PreviewSidebar } from "./PreviewSidebar";

export function PreviewShell({
  nav,
  children,
}: {
  nav: PreviewNavContext;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <PreviewSidebar nav={nav} />
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
