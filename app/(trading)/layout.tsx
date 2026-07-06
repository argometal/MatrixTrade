import { requireTradingSession } from "@/lib/auth/require-session";
import { TradingNav } from "@/app/components/TradingNav";

export default async function TradingLayout({ children }: { children: React.ReactNode }) {
  await requireTradingSession();

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:py-8">
      <TradingNav />
      {children}
    </div>
  );
}
