import { MobileMenuProvider } from "@/app/components/preview/MobileMenuContext";
import { PreviewMobileHeader } from "@/app/components/preview/PreviewMobileHeader";
import { PreviewMobileMenu } from "@/app/components/preview/PreviewMobileMenu";
import { PreviewMobileNav } from "@/app/components/preview/PreviewMobileNav";
import { MatrixConnectProvider } from "@/app/components/matrix-connect/MatrixConnectProvider";
import { MatrixControlPanelProvider } from "@/app/components/control-panel/MatrixControlPanelProvider";
import { requireTradingSession } from "@/lib/auth/require-session";
import { loadControlPanelData } from "@/lib/load-control-panel-data";
import { loadPreviewNavContext } from "@/lib/load-preview-nav";

export default async function TradingLayout({ children }: { children: React.ReactNode }) {
  await requireTradingSession();
  const [nav, controlPanel] = await Promise.all([
    loadPreviewNavContext(),
    loadControlPanelData(),
  ]);

  return (
    <MatrixConnectProvider>
      <MatrixControlPanelProvider data={controlPanel}>
        <MobileMenuProvider>
        <PreviewMobileHeader pendingInboxCount={nav.pendingInboxCount} />
        <PreviewMobileMenu nav={nav} />
        <div className="pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
          {children}
        </div>
        <PreviewMobileNav nav={nav} />
      </MobileMenuProvider>
      </MatrixControlPanelProvider>
    </MatrixConnectProvider>
  );
}
