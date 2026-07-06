import { requireTradingSession } from "@/lib/auth/require-session";

export default async function TradingLayout({ children }: { children: React.ReactNode }) {
  await requireTradingSession();
  return children;
}
