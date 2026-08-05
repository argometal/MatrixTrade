import { GuestWorkstationLockPanel } from "@/app/components/settings/GuestWorkstationLockPanel";
import { readGuestLockPolicy } from "@/lib/auth/cookies";
import { argusAuthRequired, tradingAuthRequired } from "@/lib/auth/passwords";
import Link from "next/link";

export default async function SecuritySettingsPage() {
  const policy = await readGuestLockPolicy();
  const passwordsConfigured = tradingAuthRequired() || argusAuthRequired();

  return (
    <div className="h-full overflow-y-auto bg-zinc-950">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <nav className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/settings/capital"
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          >
            Capital
          </Link>
          <Link
            href="/settings/security"
            className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-violet-200"
          >
            Security
          </Link>
          <Link
            href="/argus/v2/settings/security"
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
          >
            Open in Argus →
          </Link>
        </nav>
      </div>
      <GuestWorkstationLockPanel
        initialPolicy={policy}
        passwordsConfigured={passwordsConfigured}
        returnTo="/settings/security"
      />
    </div>
  );
}
