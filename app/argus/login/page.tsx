import { loginArgusAction } from "@/app/auth/actions";
import { ARGUS_PRODUCT_NAME, ARGUS_SUBTITLE, ARGUS_TAGLINE } from "@/lib/argus/ux-copy";

export default async function ArgusLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; guest_expired?: string }>;
}) {
  const { error, next, guest_expired } = await searchParams;
  const defaultNext = "/argus/v2";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-zinc-950 px-4 text-zinc-100">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">{ARGUS_PRODUCT_NAME}</p>
      <h1 className="mt-2 text-xl font-medium text-zinc-200">{ARGUS_TAGLINE}</h1>
      <p className="mt-1 text-sm text-zinc-500">{ARGUS_SUBTITLE}</p>
      {guest_expired === "1" ? (
        <p className="mt-4 rounded-xl border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          Guest lock closed this session (outside schedule or time expired). Enter the password for a
          30-minute unlock to change settings or finish work — then it locks again.
        </p>
      ) : null}
      <form action={loginArgusAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? defaultNext} />
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
      <p className="mt-6 text-center text-sm text-zinc-500">
        <a href="/apps" className="underline-offset-2 hover:text-zinc-300 hover:underline">
          All apps
        </a>
      </p>
    </div>
  );
}
