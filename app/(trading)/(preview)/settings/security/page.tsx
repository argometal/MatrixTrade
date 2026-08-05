import { GuestWorkstationLockPanel } from "@/app/components/settings/GuestWorkstationLockPanel";
import { readGuestLockPolicy } from "@/lib/auth/cookies";
import { argusAuthRequired, tradingAuthRequired } from "@/lib/auth/passwords";

export default async function SecuritySettingsPage() {
  const policy = await readGuestLockPolicy();
  const passwordsConfigured = tradingAuthRequired() || argusAuthRequired();

  return (
    <div className="h-full overflow-y-auto bg-zinc-950">
      <GuestWorkstationLockPanel initialPolicy={policy} passwordsConfigured={passwordsConfigured} />
    </div>
  );
}
