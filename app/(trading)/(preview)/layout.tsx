import { PreviewShell } from "@/app/components/preview/PreviewShell";
import { loadPreviewNavContext } from "@/lib/load-preview-nav";

export default async function PreviewRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nav = await loadPreviewNavContext();

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-zinc-950">
      <div className="h-full w-full overflow-hidden">
        <PreviewShell nav={nav}>{children}</PreviewShell>
      </div>
    </div>
  );
}
