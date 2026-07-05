"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN_LINKS = [
  { href: "/ai-bridge", label: "AI Bridge", icon: "✦", activePrefix: "/ai-bridge" },
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/trades", label: "Trades", icon: "↗" },
  { href: "/playbook", label: "Playbook", icon: "☰" },
  { href: "/review", label: "Review", icon: "◎" },
  { href: "/stats", label: "Statistics", icon: "📊" },
  { href: "/journal", label: "Journal", icon: "📝" },
] as const;

const SYSTEM_LINKS: {
  href: string;
  label: string;
  badge?: boolean;
}[] = [
  { href: "/inbox", label: "Inbox", badge: true },
  { href: "/inbox", label: "Apply" },
  { href: "/system", label: "Settings" },
];

export function AiBridgeV2Sidebar({
  pendingInboxCount,
  closedCount,
  maxTrades,
  viewToggle,
}: {
  pendingInboxCount: number;
  closedCount: number;
  maxTrades: number;
  viewToggle: React.ReactNode;
}) {
  const pathname = usePathname();
  const cyclePct = maxTrades > 0 ? Math.min(100, Math.round((closedCount / maxTrades) * 100)) : 0;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          M
        </span>
        <span className="font-semibold text-zinc-900">MatrixTrade</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Main</p>
        <ul className="mt-2 space-y-0.5">
          {MAIN_LINKS.map((link) => {
            const active =
              link.href === "/ai-bridge"
                ? pathname.startsWith("/ai-bridge")
                : pathname === link.href;
            return (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-violet-50 text-violet-800"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <span className="w-4 text-center text-xs">{link.icon}</span>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          System
        </p>
        <ul className="mt-2 space-y-0.5">
          {SYSTEM_LINKS.map((link, index) => {
            const active = pathname.startsWith(link.href) && link.label === "Inbox";
            return (
              <li key={`${link.label}-${index}`}>
                <Link
                  href={link.href}
                  className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && pendingInboxCount > 0 && (
                    <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingInboxCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-zinc-100 p-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-semibold text-zinc-800">Current Cycle</p>
          <p className="mt-1 text-xs text-zinc-500">Cycle 1</p>
          <p className="mt-1 text-sm font-medium tabular-nums text-zinc-800">
            {closedCount} / {maxTrades} trades
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-violet-600 transition-all"
              style={{ width: `${cyclePct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-800">
            A
          </span>
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium text-zinc-800">Account</p>
            <p className="text-zinc-500">Pro Plan</p>
          </div>
        </div>

        <div className="pt-1">{viewToggle}</div>
      </div>
    </aside>
  );
}
