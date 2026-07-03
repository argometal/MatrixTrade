import { ARGUS_PRODUCT_NAME } from "@/lib/argus/ux-copy";
import { PrivateLockMenu } from "./PrivateLockMenu";

export function ArgusAppHeader({
  privateConfigured,
  privateUnlocked,
  privateError,
}: {
  privateConfigured: boolean;
  privateUnlocked: boolean;
  privateError?: boolean;
}) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <h1 className="text-[28px] font-semibold tracking-tight text-zinc-50">{ARGUS_PRODUCT_NAME}</h1>
      <PrivateLockMenu
        configured={privateConfigured}
        unlocked={privateUnlocked}
        privateError={privateError}
      />
    </header>
  );
}
