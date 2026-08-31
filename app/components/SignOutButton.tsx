import { logoutAction } from "@/app/auth/actions";

/**
 * Global sign-out — clears MatrixTrade + Argus + Forge sessions (and unlocks).
 * Pass `loginPath` so Argus/Forge land on `/argus/login` instead of trading `/login`.
 */
export function SignOutButton({
  className = "text-sm text-zinc-500 hover:text-zinc-700",
  loginPath = "/login",
  label = "Sign out",
}: {
  className?: string;
  /** Prefer `/login` (MatrixTrade) or `/argus/login` (Argus / Forge). */
  loginPath?: "/login" | "/argus/login";
  label?: string;
}) {
  return (
    <form action={logoutAction}>
      <input type="hidden" name="next" value={loginPath} />
      <button
        type="submit"
        className={className}
        title="Sign out of MatrixTrade, Argus, and Forge"
      >
        {label}
      </button>
    </form>
  );
}
