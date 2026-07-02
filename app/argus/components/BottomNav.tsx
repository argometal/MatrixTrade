"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/argus/journal", label: "Journal", icon: "▤" },
  { href: "/argus/network", label: "Network", icon: "◎" },
  { href: "/argus/inbox", label: "Inbox", icon: "📥" },
  { href: "/argus/search", label: "Search", icon: "⌕" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium tracking-wide transition ${
                active ? "text-teal-400" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <span className="text-[18px] leading-none opacity-90">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
