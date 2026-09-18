import { promises as fs } from "fs";
import path from "path";
import { ensureArgusStorageReady, getArgusStoragePaths } from "../storage";
import { TRAINING_LAB_SCHEMA_VERSION, type TrainingLabData } from "./types";

function labFilePath(): string {
  return path.join(getArgusStoragePaths().metaDir, "training-lab.json");
}

export function trainingLabImagesDir(): string {
  return path.join(getArgusStoragePaths().filesDir, "training-lab");
}

function emptyLab(): TrainingLabData {
  const now = new Date().toISOString();
  const defaultDeckId = `deck-${Date.now()}`;
  return {
    version: TRAINING_LAB_SCHEMA_VERSION,
    decks: [{ id: defaultDeckId, name: "Default", createdAt: now }],
    pairs: [],
    pairStates: [],
    sequenceMetrics: [],
  };
}

export async function readTrainingLab(): Promise<TrainingLabData> {
  await ensureArgusStorageReady();
  const file = labFilePath();
  try {
    const raw = await fs.readFile(file, "utf-8");
    const data = JSON.parse(raw) as TrainingLabData;
    if (data.version !== TRAINING_LAB_SCHEMA_VERSION || !Array.isArray(data.decks)) {
      return emptyLab();
    }
    if (data.decks.length === 0) {
      const seeded = emptyLab();
      await writeTrainingLab(seeded);
      return seeded;
    }
    return data;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      const seeded = emptyLab();
      await writeTrainingLab(seeded);
      return seeded;
    }
    throw e;
  }
}

export async function writeTrainingLab(data: TrainingLabData): Promise<void> {
  await ensureArgusStorageReady();
  await fs.mkdir(getArgusStoragePaths().metaDir, { recursive: true });
  await fs.mkdir(trainingLabImagesDir(), { recursive: true });
  const file = labFilePath();
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

export async function writeTrainingLabImage(
  basename: string,
  bytes: Buffer,
): Promise<void> {
  await ensureArgusStorageReady();
  const dir = trainingLabImagesDir();
  await fs.mkdir(dir, { recursive: true });
  const safe = path.basename(basename);
  await fs.writeFile(path.join(dir, safe), bytes);
}

export async function readTrainingLabImageBytes(basename: string): Promise<Buffer | null> {
  const safe = path.basename(basename);
  const full = path.join(trainingLabImagesDir(), safe);
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

export function mimeFromBasename(basename: string): string {
  const low = basename.toLowerCase();
  if (low.endsWith(".png")) return "image/png";
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return "image/jpeg";
  if (low.endsWith(".webp")) return "image/webp";
  if (low.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
