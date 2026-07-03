import { lockArgusPrivateAction, unlockArgusPrivateAction } from "@/app/auth/actions";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { PRIVATE } from "@/lib/argus/ux-copy";

export async function PrivatePanel({ privateError }: { privateError?: boolean }) {
  if (!argusPrivateConfigured()) return null;

  const unlocked = await hasArgusPrivateUnlock();

  if (unlocked) {
    return (
      <form action={lockArgusPrivateAction} className="mb-4 rounded-xl border border-violet-800/50 bg-violet-950/30 p-3">
        <p className="text-xs text-violet-300">{PRIVATE.visible}</p>
        <button type="submit" className="mt-2 text-xs font-medium text-violet-400 underline">
          {PRIVATE.hide}
        </button>
      </form>
    );
  }

  return (
    <form action={unlockArgusPrivateAction} className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs text-zinc-400">{PRIVATE.unlock}</p>
      <p className="mt-0.5 text-[11px] text-zinc-600">{PRIVATE.unlockHint}</p>
      <div className="mt-2 flex gap-2">
        <input
          name="pin"
          type="password"
          placeholder="Private PIN"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-medium text-white">
          Unlock
        </button>
      </div>
      {privateError && <p className="mt-1 text-xs text-red-400">Wrong PIN</p>}
    </form>
  );
}
