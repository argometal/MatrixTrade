import { loginTradingAction } from "@/app/auth/actions";
import { getTradingConfigErrors } from "@/lib/auth/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; config?: string }>;
}) {
  const { error, next, config } = await searchParams;
  const configErrors = getTradingConfigErrors();
  const configInvalid = configErrors.length > 0 || config === "trading";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center">
      <h1 className="text-2xl font-semibold">MatrixTrade</h1>
      <p className="mt-1 text-sm text-zinc-500">Acceso a trading</p>

      {configInvalid && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
          <p className="font-medium">Configuration error</p>
          <p className="mt-1">{configErrors[0]?.message ?? "MATRIXTRADE_PASSWORD is required."}</p>
        </div>
      )}

      <form action={loginTradingAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? "/"} />
        <label className="block text-sm">
          <span className="font-medium">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            disabled={configInvalid}
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50"
          />
        </label>
        {error && !configInvalid && <p className="text-sm text-red-600">Contraseña incorrecta.</p>}
        <button
          type="submit"
          disabled={configInvalid}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
