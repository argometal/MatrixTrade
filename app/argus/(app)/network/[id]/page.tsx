import { redirect } from "next/navigation";
import { getEntity } from "@/lib/argus/server-storage";
import { referenceKindFromNotes } from "@/lib/argus/reference-types";

export default async function LegacyNetworkEntityRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntity(id);

  if (!entity) {
    redirect("/argus/v2/browse/network");
  }

  if (entity.type === "project") {
    redirect(`/argus/projects/${id}`);
  }

  if (entity.type === "company") {
    redirect(`/argus/v2/organizations/${id}`);
  }

  const kind = referenceKindFromNotes(entity.notes ?? "");
  if (kind === "event") {
    redirect(`/argus/v2/browse/events?selected=${id}`);
  }
  if (kind === "topic") {
    redirect(`/argus/v2/browse/topics?selected=${id}`);
  }

  redirect(`/argus/v2/network/${id}`);
}
