import { appendLogAttachment, saveAttachment } from "./server-storage";

export async function attachFilesToLog(logId: string, files: File[]): Promise<number> {
  let count = 0;
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const bytes = Buffer.from(await file.arrayBuffer());
    const att = await saveAttachment(
      file.name,
      file.type || "application/octet-stream",
      bytes,
      "journal",
      logId
    );
    await appendLogAttachment(logId, att.id);
    count += 1;
  }
  return count;
}

export function filesFromFormData(formData: FormData, field = "attachments"): File[] {
  return formData
    .getAll(field)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export function attachmentSummaryNames(files: File[]): string {
  return files.map((f) => f.name).join(", ");
}
