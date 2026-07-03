import { BottomNav } from "@/app/argus/components/BottomNav";
import { SignOutButton } from "@/app/components/SignOutButton";
import { requireArgusSession } from "@/lib/auth/require-session";

export default async function ArgusAppLayout({ children }: { children: React.ReactNode }) {
  await requireArgusSession();

  return (
    <div className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-2 md:max-w-4xl">
      <div className="mb-2 flex justify-start pt-14">
        <SignOutButton className="text-xs font-medium text-zinc-500 hover:text-zinc-300" />
      </div>
      {children}
      <BottomNav />
    </div>
  );
}
