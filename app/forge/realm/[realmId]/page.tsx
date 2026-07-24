import { RealmDeckGraph } from "../../components/RealmDeckGraph";

type Props = {
  params: Promise<{ realmId: string }>;
};

/**
 * CHANGE 24-17 — Open Realm → molecular Chaos Deck graph.
 */
export default async function ForgeRealmPage({ params }: Props) {
  const { realmId } = await params;
  return <RealmDeckGraph realmId={decodeURIComponent(realmId)} />;
}
