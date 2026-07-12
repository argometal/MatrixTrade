import { PreviewShell } from "@/app/components/preview/PreviewShell";
import { loadPreviewNavContext } from "@/lib/load-preview-nav";

/** Shared full-viewport shell for all MatrixTrade workspace routes (replaces classic TradingNav layout). */
export default async function PreviewRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nav = await loadPreviewNavContext();

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] top-14 z-20 overflow-hidden bg-zinc-950 lg:inset-0 lg:bottom-0 lg:top-0 lg:z-30">
      <div className="h-full min-h-0 w-full overflow-hidden">
        <PreviewShell nav={nav}>{children}</PreviewShell>
      </div>
    </div>
  );
}
