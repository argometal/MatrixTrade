"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppCornerDock } from "@/app/components/AppCornerDock";
import { TradingMark } from "@/app/components/TradingMark";

export function TradingCornerEntry() {
  const pathname = usePathname();
  if (!pathname.startsWith("/argus")) return null;

  return (
    <AppCornerDock bellHref="/argus/v2/inbox" bellLabel="Argus inbox" placement="argus" showBell={false}>
      <Link
        href="/home-preview"
        title="MtA"
        aria-label="Back to MtA"
        className="group relative shrink-0 rounded-xl shadow-lg shadow-black/30 transition hover:scale-105 hover:shadow-zinc-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <TradingMark />
        <span className="pointer-events-none absolute -bottom-7 right-0 whitespace-nowrap rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-800 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Trading
        </span>
      </Link>
    </AppCornerDock>
  );
}
