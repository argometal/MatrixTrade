import Link from "next/link";
import { loginTradingAction } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center">
      <h1 className="text-2xl font-semibold">MatrixTrade</h1>
      <p className="mt-1 text-sm text-zinc-500">Acceso a trading</p>
      <form action={loginTradingAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? "/"} />
        <label className="block text-sm">
          <span className="font-medium">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600">Contraseña incorrecta.</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Entrar
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-zinc-400">
        Health Vault usa ruta separada —{" "}
        <Link href="/health/login" className="underline">
          /health/login
        </Link>
      </p>
    </div>
  );
}
