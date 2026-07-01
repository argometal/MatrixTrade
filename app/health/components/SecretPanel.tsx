import { lockHealthSecretAction, unlockHealthSecretAction } from "@/app/auth/actions";
import { healthSecretConfigured } from "@/lib/auth/passwords";
import { hasHealthSecretUnlock } from "@/lib/auth/cookies";

export async function SecretPanel({ secretError }: { secretError?: boolean }) {
  if (!healthSecretConfigured()) return null;

  const unlocked = await hasHealthSecretUnlock();

  if (unlocked) {
    return (
      <form action={lockHealthSecretAction} className="mb-4 rounded-xl border border-violet-800/50 bg-violet-950/30 p-3">
        <p className="text-xs text-violet-300">Registros secretos visibles</p>
        <button type="submit" className="mt-2 text-xs font-medium text-violet-400 underline">
          Ocultar secretos
        </button>
      </form>
    );
  }

  return (
    <form action={unlockHealthSecretAction} className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs text-zinc-400">Desbloquear registros secretos (solo tú)</p>
      <div className="mt-2 flex gap-2">
        <input
          name="pin"
          type="password"
          placeholder="PIN secreto"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-medium text-white">
          Desbloquear
        </button>
      </div>
      {secretError && <p className="mt-1 text-xs text-red-400">PIN incorrecto</p>}
    </form>
  );
}
