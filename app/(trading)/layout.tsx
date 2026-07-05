import { requireTradingSession } from "@/lib/auth/require-session";
import { TradingNav } from "@/app/components/TradingNav";

export default async function TradingLayout({ children }: { children: React.ReactNode }) {
  await requireTradingSession();

  return (
    <div id="trading-layout-container" className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <TradingNav />
      {children}
    </div>
  );
}
