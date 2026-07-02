import { BottomNav } from "@/app/argus/components/BottomNav";
import { requireArgusSession } from "@/lib/auth/require-session";

export default async function ArgusAppLayout({ children }: { children: React.ReactNode }) {
  await requireArgusSession();

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
      {children}
      <BottomNav />
    </div>
  );
}
