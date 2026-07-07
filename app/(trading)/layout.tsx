import { PreviewMobileNav } from "@/app/components/preview/PreviewMobileNav";
import { requireTradingSession } from "@/lib/auth/require-session";
import { loadPreviewNavContext } from "@/lib/load-preview-nav";

export default async function TradingLayout({ children }: { children: React.ReactNode }) {
  await requireTradingSession();
  const nav = await loadPreviewNavContext();

  return (
    <>
      {children}
      <PreviewMobileNav nav={nav} />
    </>
  );
}
