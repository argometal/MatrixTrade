import { loginArgusAction } from "@/app/auth/actions";
import { GuestLocalTimeZoneField, GuestLocalTimeZoneSync } from "@/app/components/GuestLocalTimeZone";
import { ARGUS_PRODUCT_NAME } from "@/lib/argus/ux-copy";

export default async function ArgusLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; guest_expired?: string }>;
}) {
  const { error, next } = await searchParams;
  const defaultNext = "/argus/v2";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-zinc-950 px-4 text-zinc-100">
      <GuestLocalTimeZoneSync />
      <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{ARGUS_PRODUCT_NAME}</h1>
      <form action={loginArgusAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? defaultNext} />
        <GuestLocalTimeZoneField />
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
