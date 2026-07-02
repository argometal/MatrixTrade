import { loginHealthAction } from "@/app/auth/actions";

export default async function HealthLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-zinc-950 px-4 text-zinc-100">
      <h1 className="text-xl font-medium text-zinc-300">Private access</h1>
      <form action={loginHealthAction} className="mt-8 space-y-4">
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
          className="w-full rounded-xl bg-zinc-700 px-4 py-3 text-base font-medium text-zinc-100 hover:bg-zinc-600"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
