import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { getPeople, getRecordsForPerson } from "@/lib/health-vault/server-storage";
import { PersonCard } from "@/app/health/components/Cards";
import { Button, EmptyState, PageHeader } from "@/app/health/components/ui";

export default async function PeoplePage() {
  const includeSecret = await hasHealthSecretUnlock();
  const people = await getPeople();

  return (
    <>
      <PageHeader title="People" subtitle="Managers, HR, witnesses, colleagues" />
      <Button href="/health/people/new" fullWidth className="mb-6">
        + New person
      </Button>
      {people.length === 0 ? (
        <EmptyState message="No people yet." />
      ) : (
        <div className="space-y-3">
          {await Promise.all(
            people.map(async (p) => {
              const recs = await getRecordsForPerson(p.id, includeSecret);
              return <PersonCard key={p.id} person={p} recordCount={recs.length} />;
            })
          )}
        </div>
      )}
    </>
  );
}
