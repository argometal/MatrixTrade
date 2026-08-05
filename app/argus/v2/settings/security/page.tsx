import { GuestWorkstationLockPanel } from "@/app/components/settings/GuestWorkstationLockPanel";
import { readGuestLockPolicy } from "@/lib/auth/cookies";
import { argusAuthRequired, tradingAuthRequired } from "@/lib/auth/passwords";

export default async function ArgusSecuritySettingsPage() {
  const policy = await readGuestLockPolicy();
  const passwordsConfigured = tradingAuthRequired() || argusAuthRequired();

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-zinc-950">
        <div className="px-4 py-4 lg:px-8">
          <p className="mb-2 text-xs text-zinc-600">
            <a href="/argus/v2" className="hover:text-zinc-400">
              Argus
            </a>
            <span className="mx-2">›</span>
            <span className="text-zinc-400">Settings</span>
            <span className="mx-2">›</span>
            <span className="text-zinc-300">Security</span>
          </p>
        </div>
        <GuestWorkstationLockPanel
          initialPolicy={policy}
          passwordsConfigured={passwordsConfigured}
          returnTo="/argus/v2/settings/security"
        />
      </div>
    </div>
  );
}
