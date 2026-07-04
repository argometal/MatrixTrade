import { ArgusAddProvider } from "@/app/argus/components/ArgusAddProvider";
import { BottomNav } from "@/app/argus/components/BottomNav";
import { SignOutButton } from "@/app/components/SignOutButton";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { requireArgusSession } from "@/lib/auth/require-session";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import { readArgus } from "@/lib/argus/server-storage";

export default async function ArgusAppLayout({ children }: { children: React.ReactNode }) {
  await requireArgusSession();
  const includePrivate = await hasArgusPrivateUnlock();
  const data = await readArgus();
  const buckets = buildEntityPickerBuckets(data, includePrivate);
  const tagBuckets = buildTagBuckets(data, includePrivate);

  return (
    <ArgusAddProvider buckets={buckets} tagBuckets={tagBuckets}>
      <div className="mx-auto min-h-screen max-w-lg px-5 pb-24 pt-4 md:max-w-4xl">
        <div className="mb-3 flex justify-end">
          <SignOutButton className="text-xs font-medium text-zinc-500 hover:text-zinc-300" />
        </div>
        {children}
        <BottomNav />
      </div>
    </ArgusAddProvider>
  );
}
