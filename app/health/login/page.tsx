import Link from "next/link";
import { loginHealthAction } from "@/app/auth/actions";
import { getHealthConfigErrors } from "@/lib/auth/env";

export default async function HealthLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; config?: string }>;
}) {
  const { error, config } = await searchParams;
  const configErrors = getHealthConfigErrors();
  const configInvalid = configErrors.length > 0 || config === "health";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-zinc-950 px-4 text-zinc-100">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Health Vault</p>
      <h1 className="mt-2 text-2xl font-bold">Acceso privado</h1>
      <p className="mt-1 text-sm text-zinc-400">Bitácora laboral con evidencias</p>

      {configInvalid && (
        <div className="mt-6 rounded-xl border border-red-800 bg-red-950/50 px-3 py-3 text-sm text-red-300" role="alert">
          <p className="font-medium">Configuration error</p>
          <p className="mt-1">{configErrors[0]?.message ?? "HEALTH_VAULT_PASSWORD is required."}</p>
        </div>
      )}

      <form action={loginHealthAction} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-zinc-300">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            disabled={configInvalid}
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base disabled:opacity-50"
          />
        </label>
        {error && !configInvalid && <p className="text-sm text-red-400">Contraseña incorrecta.</p>}
        <button
          type="submit"
          disabled={configInvalid}
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
