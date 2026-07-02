import { BottomNav } from "@/app/argus/components/BottomNav";
import { SignOutButton } from "@/app/components/SignOutButton";
import { requireArgusSession } from "@/lib/auth/require-session";

export default async function ArgusAppLayout({ children }: { children: React.ReactNode }) {
  await requireArgusSession();

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
      <div className="mb-4 flex justify-end">
        <SignOutButton className="text-xs font-medium text-zinc-500 hover:text-zinc-300" />
      </div>
      {children}
      <BottomNav />
    </div>
  );
}
