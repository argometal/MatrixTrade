import { loginArgusAction } from "@/app/auth/actions";

export default async function ArgusLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-zinc-950 px-4 text-zinc-100">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">ARGUS</p>
      <h1 className="mt-2 text-xl font-medium text-zinc-200">Professional journal</h1>
      <p className="mt-1 text-sm text-zinc-500">Private by default. Facts first.</p>
      <form action={loginArgusAction} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-zinc-400">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base"
          />
        </label>
        {error && <p className="text-sm text-red-400">Wrong password.</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-teal-700 px-4 py-3 text-base font-medium text-white hover:bg-teal-600"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
