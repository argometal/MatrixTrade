"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ControlPanelButton } from "@/app/components/control-panel/ControlPanelButton";
import { SignOutButton } from "@/app/components/SignOutButton";
import { MobileMenuButton } from "@/app/components/preview/MobileMenuButton";
import { useMobileMenu } from "@/app/components/preview/MobileMenuContext";
import {
  isPreviewNavActive,
  PREVIEW_NAV_SECTIONS,
  type PreviewNavContext,
} from "@/lib/preview-nav";

export function PreviewMobileMenu({ nav }: { nav: PreviewNavContext }) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileMenu();

  const linkClass = (href: string) =>
    isPreviewNavActive(pathname, href)
      ? "bg-violet-600/20 font-medium text-violet-300"
      : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100";

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-[55] bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-[60] flex w-[min(100%,20rem)] flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-100">Menu</p>
          <MobileMenuButton open={open} onClick={() => setOpen(false)} />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-6">
            <ControlPanelButton onClick={() => setOpen(false)} />
          </div>

          {PREVIEW_NAV_SECTIONS.map((section) => (
            <nav key={section.id} className="mb-6">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${linkClass(item.href)}`}
                    >
                      {item.label}
                      {"badge" in item && item.badge === "inbox" && nav.pendingInboxCount > 0 && (
                        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white">
                          {nav.pendingInboxCount}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-500">
            <p className="font-medium text-zinc-400">{nav.cycleLabel}</p>
            <p className="mt-1">
              {nav.closedTrades} closed · {nav.monthlyLossRoomLabel} monthly room
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-800 p-4">
          <SignOutButton className="w-full text-left text-sm text-zinc-500 hover:text-zinc-300" />
        </div>
      </aside>
    </>
  );
}
