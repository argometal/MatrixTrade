import { loginTradingAction } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const defaultNext = "/home-preview";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">MatrixTrade</h1>
      <p className="mt-1 text-sm text-zinc-500">Trading access</p>
      <form action={loginTradingAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? defaultNext} />
        <label className="block text-sm">
          <span className="font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600">Wrong password.</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
