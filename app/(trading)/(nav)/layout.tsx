import { TradingNav } from "@/app/components/TradingNav";

export default function TradingNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:py-8 lg:pb-8">
      <div className="hidden lg:block">
        <TradingNav />
      </div>
      {children}
    </div>
  );
}
