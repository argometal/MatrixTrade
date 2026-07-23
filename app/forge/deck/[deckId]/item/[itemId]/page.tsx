import { ContentEditor } from "../../../../components/ContentEditor";

type Props = {
  params: Promise<{ deckId: string; itemId: string }>;
};

export default async function ForgeDeckItemPage({ params }: Props) {
  const { deckId, itemId } = await params;
  return <ContentEditor deckId={deckId} itemId={itemId} />;
}
