import Link from "next/link";
import { SignOutButton } from "@/app/components/SignOutButton";

export function TradingNav() {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-zinc-200 pb-4 text-sm font-medium sm:mb-8">
      <Link href="/mxt/home-preview" className="font-medium text-violet-700 hover:text-violet-800">
        Dashboard
      </Link>
      <Link href="/mxt/ai-bridge" className="hover:text-zinc-600">
        AI Bridge
      </Link>
      <Link href="/mxt/ai-bridge" className="hover:text-zinc-600">
        Assistant
      </Link>
      <Link href="/mxt/scout" className="hover:text-zinc-600">
        Scout
      </Link>
      <Link href="/mxt/trades" className="hover:text-zinc-600">
        Trades
      </Link>
      <Link href="/mxt/playbook" className="hover:text-zinc-600">
        Playbook
      </Link>
      <Link href="/mxt/trades?tab=review" className="hover:text-zinc-600">
        Review
      </Link>
      <Link href="/mxt/stats" className="hover:text-zinc-600">
        Statistics
      </Link>
      <Link href="/mxt/stats?tab=journal" className="hover:text-zinc-600">
        Journal
      </Link>
      <Link href="/mxt/stats?tab=mistakes" className="hover:text-zinc-600">
        Mistakes
      </Link>
      <Link href="/mxt/inbox" className="hover:text-zinc-600">
        Inbox
      </Link>
      <Link href="/mxt/system" className="hover:text-zinc-600">
        System
      </Link>
      <Link href="/mxt/connect" className="hover:text-zinc-600">
        Connect
      </Link>
      <SignOutButton className="ml-auto text-sm font-medium text-zinc-500 hover:text-zinc-800" />
    </nav>
  );
}
