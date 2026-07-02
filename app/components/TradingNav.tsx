import Link from "next/link";

export function TradingNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-200 pb-4 text-sm font-medium sm:mb-8">
      <Link href="/" className="hover:text-zinc-600">
        Dashboard
      </Link>
      <Link href="/trades" className="hover:text-zinc-600">
        Trades
      </Link>
      <Link href="/connect" className="hover:text-zinc-600">
        Connect
      </Link>
      <Link href="/trades/new" className="hover:text-zinc-600">
        New trade
      </Link>
    </nav>
  );
}
