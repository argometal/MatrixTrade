import { Suspense } from "react";
import { ItemEditorGate } from "../../../../components/ItemEditorGate";

type Props = {
  params: Promise<{ deckId: string; itemId: string }>;
};

export default async function ForgeDeckItemPage({ params }: Props) {
  const { deckId, itemId } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading editor…</p>}>
      <ItemEditorGate deckId={deckId} itemId={itemId} />
    </Suspense>
  );
}
