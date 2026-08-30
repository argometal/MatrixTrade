import { ContentViewer } from "../../../../../components/ContentViewer";

type Props = {
  params: Promise<{ deckId: string; itemId: string }>;
};

export default async function ForgeDeckItemViewPage({ params }: Props) {
  const { deckId, itemId } = await params;
  return <ContentViewer deckId={deckId} itemId={itemId} />;
}
