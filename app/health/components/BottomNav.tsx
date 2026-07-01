"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/health", label: "Inicio", icon: "⌂" },
  { href: "/health/records", label: "Registros", icon: "▤" },
  { href: "/health/people", label: "Personas", icon: "◎" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {links.map((link) => {
          const active =
            link.href === "/health"
              ? pathname === "/health"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-medium transition ${active ? "text-teal-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
