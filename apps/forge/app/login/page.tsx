export default async function ForgeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const defaultNext = "/forge";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-zinc-100">Argus Forge</h1>
      <p className="mt-1 text-sm text-zinc-500">Sign in to continue</p>
      <form action="/api/auth/login" method="post" className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? defaultNext} />
        <label className="block text-sm text-zinc-300">
          <span className="font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        {error ? <p className="text-sm text-red-500">Wrong password.</p> : null}
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-zinc-600">
        Transitional credential: ARGUS_PASSWORD · cookie: forge-auth
      </p>
    </div>
  );
}
