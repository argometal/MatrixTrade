"use server";

import { revalidatePath } from "next/cache";
import { requireArgusSession } from "@/lib/auth/require-session";
import { getPairState, recordMatchOutcome } from "@/lib/argus/lab/match-logic";
import { seedMockLociInto } from "@/lib/argus/lab/mock-seed";
import {
  mimeFromBasename,
  newId,
  readTrainingLab,
  writeTrainingLab,
  writeTrainingLabImage,
} from "@/lib/argus/lab/storage";
import type { TrainingLabData, TrainingLabSequenceMetric } from "@/lib/argus/lab/types";

const LAB_PATH = "/forge/lab";

function revalidateLab() {
  revalidatePath(LAB_PATH);
}

async function mutate(mutator: (data: TrainingLabData) => void): Promise<TrainingLabData> {
  await requireArgusSession();
  const data = await readTrainingLab();
  mutator(data);
  await writeTrainingLab(data);
  revalidateLab();
  return data;
}

export async function getTrainingLabDataAction(): Promise<TrainingLabData> {
  await requireArgusSession();
  const data = await readTrainingLab();
  if (data.pairs.length === 0) {
    await seedMockLociInto(data);
    await writeTrainingLab(data);
  }
  return data;
}

export async function seedMockTrainingDeckAction() {
  await requireArgusSession();
  const data = await readTrainingLab();
  await seedMockLociInto(data);
  await writeTrainingLab(data);
  revalidateLab();
  return data;
}

export async function createTrainingDeckAction(name: string) {
  const n = name.trim();
  if (!n) return { ok: false as const, error: "Name required" };
  await mutate((data) => {
    data.decks.push({
      id: newId("deck"),
      name: n,
      createdAt: new Date().toISOString(),
    });
  });
  return { ok: true as const };
}

export async function renameTrainingDeckAction(deckId: string, name: string) {
  const n = name.trim();
  if (!n) return { ok: false as const, error: "Name required" };
  await mutate((data) => {
    const d = data.decks.find((x) => x.id === deckId);
    if (d) d.name = n;
  });
  return { ok: true as const };
}

export async function deleteTrainingDeckAction(deckId: string) {
  await mutate((data) => {
    if (data.decks.length <= 1) return;
    const other = data.decks.find((d) => d.id !== deckId);
    if (!other) return;
    for (const p of data.pairs) {
      if (p.deckId === deckId) p.deckId = other.id;
    }
    data.decks = data.decks.filter((d) => d.id !== deckId);
  });
  return { ok: true as const };
}

export async function addTrainingPairAction(formData: FormData) {
  await requireArgusSession();
  const deckId = String(formData.get("deckId") ?? "").trim();
  const captionText = String(formData.get("captionText") ?? "").trim();
  const transliteration = String(formData.get("transliteration") ?? "").trim() || undefined;
  const gloss = String(formData.get("gloss") ?? "").trim() || undefined;
  const file = formData.get("image");
  if (!deckId || !captionText) {
    return { ok: false as const, error: "Deck and caption required" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Image required" };
  }
  const ext = pathExt(file.name) || "png";
  const basename = `mc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeTrainingLabImage(basename, bytes);

  await mutate((data) => {
    if (!data.decks.some((d) => d.id === deckId)) throw new Error("Deck not found");
    const id = newId("pair");
    data.pairs.push({
      id,
      deckId,
      captionText,
      transliteration,
      gloss,
      imageBasename: basename,
      createdAt: new Date().toISOString(),
    });
  });
  return { ok: true as const };
}

function pathExt(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
}

export async function deleteTrainingPairAction(pairId: string) {
  await mutate((data) => {
    data.pairs = data.pairs.filter((p) => p.id !== pairId);
    data.pairStates = data.pairStates.filter((s) => s.pairId !== pairId);
  });
  return { ok: true as const };
}

export async function recordTrainingMatchOutcomeAction(pairId: string, pass: boolean) {
  await mutate((data) => {
    const pair = data.pairs.find((p) => p.id === pairId);
    if (!pair) return;
    const prev = getPairState(data.pairStates, pairId);
    const next = recordMatchOutcome(prev, pass);
    const idx = data.pairStates.findIndex((s) => s.pairId === pairId);
    if (idx >= 0) data.pairStates[idx] = next;
    else data.pairStates.push(next);
  });
  return { ok: true as const };
}

export async function saveSequenceMetricAction(
  metric: Omit<TrainingLabSequenceMetric, "id" | "dateUtc">,
) {
  await mutate((data) => {
    data.sequenceMetrics.push({
      ...metric,
      id: newId("seq"),
      dateUtc: new Date().toISOString().slice(0, 10),
    });
    if (data.sequenceMetrics.length > 500) {
      data.sequenceMetrics = data.sequenceMetrics.slice(-500);
    }
  });
  return { ok: true as const };
}

export async function getTrainingLabImageMetaAction(pairId: string) {
  await requireArgusSession();
  const data = await readTrainingLab();
  const pair = data.pairs.find((p) => p.id === pairId);
  if (!pair) return null;
  return {
    basename: pair.imageBasename,
    mime: mimeFromBasename(pair.imageBasename),
  };
}
