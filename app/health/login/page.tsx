import Link from "next/link";
import { getHealthLockRemainingMinutes, loginHealthAction } from "@/app/auth/actions";
import { getHealthConfigErrors, getHealthRecoveryEmails } from "@/lib/auth/env";
import { isHealthLoginLocked } from "@/lib/auth/health-login-lock";

export default async function HealthLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; config?: string; locked?: string }>;
}) {
  const { error, config, locked } = await searchParams;
  const configErrors = getHealthConfigErrors();
  const configInvalid = configErrors.length > 0 || config === "health";
  const loginLocked = !configInvalid && (locked === "1" || (await isHealthLoginLocked()));
  const lockMinutes = loginLocked ? await getHealthLockRemainingMinutes() : 0;
  const recovery = getHealthRecoveryEmails();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-zinc-950 px-4 text-zinc-100">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Health Vault</p>
      <h1 className="mt-2 text-2xl font-bold">Acceso privado</h1>
      <p className="mt-1 text-sm text-zinc-400">Bitácora laboral con evidencias</p>

      {configInvalid && (
        <div className="mt-6 rounded-xl border border-red-800 bg-red-950/50 px-3 py-3 text-sm text-red-300" role="alert">
          <p className="font-medium">Configuration error</p>
          <p className="mt-1">{configErrors[0]?.message ?? "HEALTH_VAULT_TOTP_SECRET is required."}</p>
        </div>
      )}

      {loginLocked && (
        <div className="mt-6 rounded-xl border border-amber-800 bg-amber-950/40 px-3 py-3 text-sm text-amber-200" role="alert">
          <p className="font-medium">Login locked</p>
          <p className="mt-1">
            Too many failed attempts. Try again in {lockMinutes} minute{lockMinutes !== 1 ? "s" : ""}.
          </p>
          <p className="mt-3 text-xs text-amber-300/80">
            Recovery (email not implemented yet): {recovery.primary}, {recovery.secondary}
          </p>
        </div>
      )}

      {!configInvalid && !loginLocked && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Usuario</p>
          <p className="mt-1 font-medium text-zinc-100">Vic</p>
        </div>
      )}

      <form action={loginHealthAction} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-zinc-300">Código Authenticator (6 dígitos)</span>
          <input
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            disabled={configInvalid || loginLocked}
            autoComplete="one-time-code"
            placeholder="000000"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-center font-mono text-lg tracking-widest disabled:opacity-50"
          />
        </label>
        {error && !configInvalid && !loginLocked && (
          <p className="text-sm text-red-400">Código incorrecto.</p>
        )}
        <button
          type="submit"
          disabled={configInvalid || loginLocked}
          className="w-full rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Entrar
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-zinc-500">
        <Link href="/login" className="underline">
          MatrixTrade (trading)
        </Link>
      </p>
    </div>
  );
}
