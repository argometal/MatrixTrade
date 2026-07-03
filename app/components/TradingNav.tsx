import Link from "next/link";
import { SignOutButton } from "@/app/components/SignOutButton";

export function TradingNav() {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-200 pb-4 text-sm font-medium sm:mb-8">
      <Link href="/" className="hover:text-zinc-600">
        Dashboard
      </Link>
      <Link href="/trades" className="hover:text-zinc-600">
        Trades
      </Link>
      <Link href="/stats" className="hover:text-zinc-600">
        Stats
      </Link>
      <Link href="/mistakes" className="hover:text-zinc-600">
        Mistakes
      </Link>
      <Link href="/connect" className="hover:text-zinc-600">
        Connect
      </Link>
      <Link href="/trades/new" className="hover:text-zinc-600">
        New trade
      </Link>
      <SignOutButton className="ml-auto text-sm font-medium text-zinc-500 hover:text-zinc-800" />
    </nav>
  );
}
