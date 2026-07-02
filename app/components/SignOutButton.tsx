import { logoutAction } from "@/app/auth/actions";

export function SignOutButton({
  className = "text-sm text-zinc-500 hover:text-zinc-700",
}: {
  className?: string;
}) {
  return (
    <form action={logoutAction}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
