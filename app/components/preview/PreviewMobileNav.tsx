"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileMenuButton } from "@/app/components/preview/MobileMenuButton";
import { useMobileMenu } from "@/app/components/preview/MobileMenuContext";
import {
  isPreviewNavActive,
  PREVIEW_MOBILE_TABS,
  type PreviewNavContext,
} from "@/lib/preview-nav";

export function PreviewMobileNav({ nav }: { nav: PreviewNavContext }) {
  const pathname = usePathname();
  const { open, toggle } = useMobileMenu();

  const tabClass = (href: string) =>
    isPreviewNavActive(pathname, href)
      ? "text-violet-300"
      : "text-zinc-500 hover:text-zinc-300";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 gap-1 border-t border-zinc-800 bg-zinc-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
      aria-label="Mobile dashboard"
    >
      {PREVIEW_MOBILE_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium ${tabClass(tab.href)}`}
        >
          {tab.label}
          {tab.href === "/inbox" && nav.pendingInboxCount > 0 && (
            <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] text-white">
              {nav.pendingInboxCount}
            </span>
          )}
        </Link>
      ))}
      <div className="flex flex-col items-center">
        <MobileMenuButton
          open={open}
          onClick={toggle}
          className="h-9 w-9 border-zinc-700"
        />
        <span className={`mt-0.5 text-[10px] font-medium ${open ? "text-violet-300" : "text-zinc-500"}`}>
          Menu
        </span>
      </div>
    </nav>
  );
}
