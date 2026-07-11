/** Normalize common AI paste issues before JSON.parse. */
export function normalizeAiBlockJson(raw: string): string {
  let text = raw.trim();

  const fenced = text.match(/```(?:json|ai-block)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) text = fenced[1].trim();

  // Strip BOM / zero-width chars
  text = text.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Curly / typographic quotes → ASCII (common in AI / Word / mobile paste)
  text = text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

  // Trailing commas before } or ] (common in AI output)
  text = text.replace(/,\s*([}\]])/g, "$1");

  return text.trim();
}
