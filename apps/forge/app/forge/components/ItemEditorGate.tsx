"use client";

import { useSearchParams } from "next/navigation";
import { ContentEditor } from "./ContentEditor";
import { FragmentBuilder } from "./FragmentBuilder";

type Props = {
  deckId: string;
  itemId: string;
};

/** CHANGE 24-1C — default to Fragment builder; `?legacy=1` keeps classic editor. */
export function ItemEditorGate({ deckId, itemId }: Props) {
  const search = useSearchParams();
  if (search.get("legacy") === "1") {
    return <ContentEditor deckId={deckId} itemId={itemId} />;
  }
  return <FragmentBuilder deckId={deckId} itemId={itemId} />;
}
