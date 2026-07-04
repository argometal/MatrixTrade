"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV } from "@/lib/argus/ux-copy";
import { AddMenuButton } from "./ArgusAddLauncher";

const sideLinks = [
  { href: "/argus/journal", label: BOTTOM_NAV.home, icon: "▤", match: (path: string) =>
      path.startsWith("/argus/journal") ||
      path.startsWith("/argus/projects") ||
      path.startsWith("/argus/logs") ||
      path.startsWith("/argus/diagnostics"),
  },
  { href: "/argus/network", label: BOTTOM_NAV.network, icon: "◎", match: (path: string) =>
      path.startsWith("/argus/network"),
  },
] as const;

const rightLinks = [
  { href: "/argus/inbox", label: BOTTOM_NAV.inbox, icon: "📥", match: (path: string) =>
      path.startsWith("/argus/inbox"),
  },
  { href: "/argus/search", label: BOTTOM_NAV.search, icon: "⌕", match: (path: string) =>
      path.startsWith("/argus/search"),
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
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium tracking-wide transition ${
        active ? "text-teal-400" : "text-zinc-600 hover:text-zinc-400"
      }`}
    >
      <span className="text-[18px] leading-none opacity-90">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-end justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 md:max-w-4xl">
        {sideLinks.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            active={link.match(pathname)}
          />
        ))}

        <div className="flex flex-1 justify-center px-1">
          <AddMenuButton variant="nav" />
        </div>

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
