import { MobileMenuProvider } from "@/app/components/preview/MobileMenuContext";
import { PreviewMobileHeader } from "@/app/components/preview/PreviewMobileHeader";
import { PreviewMobileMenu } from "@/app/components/preview/PreviewMobileMenu";
import { PreviewMobileNav } from "@/app/components/preview/PreviewMobileNav";
import { UiWindowIdBadge } from "@/app/components/preview/UiWindowIdBadge";
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
        {/*
          Preview routes use a fixed shell sized between header + tab bar.
          Do not add pt/pb here — double chrome made the phone viewport feel “off.”
        */}
        <div className="min-h-dvh max-w-[100vw] overflow-x-hidden lg:min-h-0">
          {children}
        </div>
        <PreviewMobileNav nav={nav} />
        <UiWindowIdBadge />
      </MobileMenuProvider>
      </MatrixControlPanelProvider>
    </MatrixConnectProvider>
  );
}
