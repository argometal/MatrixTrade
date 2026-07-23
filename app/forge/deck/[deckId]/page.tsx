import { DeckInternalView } from "../../components/DeckInternalView";

type Props = {
  params: Promise<{ deckId: string }>;
};

export default async function ForgeDeckPage({ params }: Props) {
  const { deckId } = await params;
  return <DeckInternalView deckId={deckId} />;
}
