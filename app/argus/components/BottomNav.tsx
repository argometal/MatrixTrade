"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV } from "@/lib/argus/ux-copy";
import { AddMenuButton } from "./ArgusAddLauncher";

const leftLinks = [
  {
    href: "/argus/v2",
    label: BOTTOM_NAV.home,
    icon: "▤",
    match: (path: string) =>
      path === "/argus/v2" ||
      path.startsWith("/argus/v2/") ||
      path.startsWith("/argus/projects") ||
      path.startsWith("/argus/logs") ||
      path.startsWith("/argus/diagnostics"),
  },
  {
    href: "/argus/v2/browse/network",
    label: BOTTOM_NAV.network,
    icon: "◎",
    match: (path: string) =>
      path.startsWith("/argus/network") ||
      path.startsWith("/argus/v2/browse/network") ||
      path.startsWith("/argus/v2/network/"),
  },
] as const;

const rightLinks = [
  {
    href: "/argus/v2/inbox",
    label: BOTTOM_NAV.inbox,
    icon: "📥",
    match: (path: string) => path.startsWith("/argus/inbox") || path.startsWith("/argus/v2/inbox"),
  },
  {
    href: "/argus/search",
    label: BOTTOM_NAV.search,
    icon: "⌕",
    match: (path: string) => path.startsWith("/argus/search"),
  },
] as const;

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex w-[3.25rem] flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium tracking-wide transition ${
        active
          ? "bg-zinc-800/90 text-teal-400"
          : "text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-300"
      }`}
    >
      <span className="text-[17px] leading-none">{icon}</span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(0.65rem,env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-zinc-800/90 bg-zinc-950/95 p-1 shadow-lg shadow-black/40 backdrop-blur-xl">
        {leftLinks.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            active={link.match(pathname)}
          />
        ))}

        <AddMenuButton variant="nav" align="center" className="mx-0.5" />

        {rightLinks.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            active={link.match(pathname)}
          />
        ))}
      </div>
    </nav>
  );
}
