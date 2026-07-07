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
      <div className="min-w-0 flex-1 overflow-hidden pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
        {children}
      </div>
    </div>
  );
}
