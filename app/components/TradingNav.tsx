import Link from "next/link";
import { SignOutButton } from "@/app/components/SignOutButton";

export function TradingNav() {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-zinc-200 pb-4 text-sm font-medium sm:mb-8">
      <Link href="/mta/home-preview" className="font-medium text-violet-700 hover:text-violet-800">
        Dashboard
      </Link>
      <Link href="/mta/ai-bridge" className="hover:text-zinc-600">
        AI Bridge
      </Link>
      <Link href="/mta/ai-bridge" className="hover:text-zinc-600">
        Assistant
      </Link>
      <Link href="/mta/planning" className="hover:text-zinc-600">
        Scout
      </Link>
      <Link href="/mta/trades" className="hover:text-zinc-600">
        Trades
      </Link>
      <Link href="/mta/playbook" className="hover:text-zinc-600">
        Playbook
      </Link>
      <Link href="/mta/trades?tab=review" className="hover:text-zinc-600">
        Review
      </Link>
      <Link href="/mta/stats" className="hover:text-zinc-600">
        Statistics
      </Link>
      <Link href="/mta/stats?tab=journal" className="hover:text-zinc-600">
        Journal
      </Link>
      <Link href="/mta/stats?tab=mistakes" className="hover:text-zinc-600">
        Mistakes
      </Link>
      <Link href="/mta/inbox" className="hover:text-zinc-600">
        Inbox
      </Link>
      <Link href="/mta/system" className="hover:text-zinc-600">
        System
      </Link>
      <Link href="/mta/connect" className="hover:text-zinc-600">
        Connect
      </Link>
      <SignOutButton className="ml-auto text-sm font-medium text-zinc-500 hover:text-zinc-800" />
    </nav>
  );
}
