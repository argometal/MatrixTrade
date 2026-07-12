import type { PreviewNavContext } from "@/lib/preview-nav";
import { MatrixDesktopChrome } from "./MatrixDesktopChrome";
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
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute right-4 top-4 z-40 hidden items-center lg:flex xl:right-6">
          <div className="pointer-events-auto">
            <MatrixDesktopChrome pendingInboxCount={nav.pendingInboxCount} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
