import Link from "next/link";
import { SignOutButton } from "@/app/components/SignOutButton";

export function TradingNav() {
  return (
    <nav id="trading-top-nav" className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-zinc-200 pb-4 text-sm font-medium sm:mb-8">
      <Link href="/" className="hover:text-zinc-600">
        Dashboard
      </Link>
      <Link href="/trades" className="hover:text-zinc-600">
        Trades
      </Link>
      <Link href="/playbook" className="hover:text-zinc-600">
        Playbook
      </Link>
      <Link href="/review" className="hover:text-zinc-600">
        Review
      </Link>
      <Link href="/stats" className="hover:text-zinc-600">
        Statistics
      </Link>
      <Link href="/journal" className="hover:text-zinc-600">
        Journal
      </Link>
      <Link href="/ai-bridge" className="hover:text-zinc-600">
        AI Bridge
      </Link>
      <Link href="/system" className="hover:text-zinc-600">
        System
      </Link>
      <Link
        href="/trades/new"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800"
      >
        New trade
      </Link>
      <SignOutButton className="ml-auto text-sm font-medium text-zinc-500 hover:text-zinc-800" />
    </nav>
  );
}
