import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { buildV2EntityRows } from "@/lib/argus/v2/loaders";
import { V2BackLink, V2Card, V2SectionTitle } from "../../components/v2-ui";

export default async function V2BrowseOrganizationsPage() {
  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const rows = buildV2EntityRows(data, inboxItems, includePrivate, today, "organizations");

  return (
    <div className="px-4 py-6 lg:px-8">
      <V2BackLink href="/argus/v2">Back to Home</V2BackLink>
      <h1 className="mb-2 mt-4 text-2xl font-bold text-zinc-50">Organizations</h1>
      <p className="mb-6 text-sm text-zinc-500">Forever timeline · direct org evidence only</p>

      <V2Card className="p-5">
        <V2SectionTitle>{rows.length} organizations</V2SectionTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">Create an organization from + Add.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={row.href} className="font-medium text-zinc-200 hover:text-violet-300">
                    {row.name}
                  </Link>
                  <p className="text-xs text-zinc-600">{row.type}</p>
                </div>
                <span className="text-xs text-zinc-500">{row.last}</span>
              </li>
            ))}
          </ul>
        )}
      </V2Card>
    </div>
  );
}
