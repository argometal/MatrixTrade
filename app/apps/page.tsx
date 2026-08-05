import Link from "next/link";
import { ArgusMark } from "@/app/components/ArgusMark";
import { TradingMark } from "@/app/components/TradingMark";

export const metadata = {
  title: "Apps — MatrixTrade",
  description: "Choose MTA, ARGUS, or ArgusForge",
};

const cardClass =
  "flex min-h-[5.5rem] items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-5 py-4 text-left transition hover:border-zinc-600 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";

export default function AppsHubPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">MatrixTrade</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">Apps</h1>
      <p className="mt-1 text-sm text-zinc-500">Choose where to work. Each app keeps its own sign-in.</p>

      <nav aria-label="Product apps" className="mt-8 flex flex-col gap-3">
        <Link href="/home-preview" className={cardClass}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
            <TradingMark size={36} />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-zinc-50">MTA</span>
            <span className="mt-0.5 block text-sm text-zinc-500">Trading · Scout · Capital</span>
          </span>
        </Link>

        <Link href="/argus/v2" className={cardClass}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            <ArgusMark size={40} className="block h-full w-full" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-zinc-50">ARGUS</span>
            <span className="mt-0.5 block text-sm text-zinc-500">Evidence · Network · Runbooks</span>
          </span>
        </Link>

        <Link href="/forge" className={cardClass}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm font-bold tracking-wide text-zinc-200">
            AF
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-zinc-50">ArgusForge</span>
            <span className="mt-0.5 block text-sm text-zinc-500">Capture · Explorer · Chaos</span>
          </span>
        </Link>
      </nav>
    </div>
  );
}
