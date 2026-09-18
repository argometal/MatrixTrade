import { solidColorPng } from "./mock-png";
import { newId, writeTrainingLabImage } from "./storage";
import type { TrainingLabData } from "./types";

export const MOCK_LOCI_DECK_NAME = "Mock loci";

export const MOCK_LOCI: Array<{
  caption: string;
  transliteration: string;
  gloss: string;
  rgb: [number, number, number];
}> = [
  { caption: "Palace", transliteration: "palacio", gloss: "memory palace entrance", rgb: [180, 60, 48] },
  { caption: "Door", transliteration: "puerta", gloss: "threshold / locus gate", rgb: [46, 92, 168] },
  { caption: "River", transliteration: "río", gloss: "path between loci", rgb: [20, 140, 130] },
  { caption: "Fire", transliteration: "fuego", gloss: "vivid image peg", rgb: [210, 110, 28] },
];

export async function seedMockLociInto(data: TrainingLabData): Promise<string> {
  let deck = data.decks.find((d) => d.name === MOCK_LOCI_DECK_NAME);
  if (!deck) {
    const empty = data.decks.find((d) => !data.pairs.some((p) => p.deckId === d.id));
    deck = empty ?? data.decks[0];
    if (!deck) {
      deck = {
        id: newId("deck"),
        name: MOCK_LOCI_DECK_NAME,
        createdAt: new Date().toISOString(),
      };
      data.decks.push(deck);
    } else if (deck.name === "Default") {
      deck.name = MOCK_LOCI_DECK_NAME;
    }
  }

  const existingCaptions = new Set(
    data.pairs.filter((p) => p.deckId === deck.id).map((p) => p.captionText),
  );

  for (const locus of MOCK_LOCI) {
    if (existingCaptions.has(locus.caption)) continue;
    const basename = `mock_${locus.caption.toLowerCase()}_${Date.now().toString(36)}.png`;
    await writeTrainingLabImage(basename, solidColorPng(96, 128, ...locus.rgb));
    data.pairs.push({
      id: newId("pair"),
      deckId: deck.id,
      captionText: locus.caption,
      transliteration: locus.transliteration,
      gloss: locus.gloss,
      imageBasename: basename,
      createdAt: new Date().toISOString(),
    });
  }

  return deck.id;
}
