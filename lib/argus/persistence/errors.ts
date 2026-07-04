export type ArgusErrorLayer =
  | "ui"
  | "api"
  | "validation"
  | "database"
  | "permission"
  | "supabase"
  | "constraint"
  | "unknown";

export class ArgusPersistenceError extends Error {
  readonly layer: ArgusErrorLayer;

  constructor(layer: ArgusErrorLayer, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ArgusPersistenceError";
    this.layer = layer;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export function formatArgusError(err: unknown): { layer: ArgusErrorLayer; message: string } {
  if (err instanceof ArgusPersistenceError) {
    return { layer: err.layer, message: err.message };
  }
  if (err instanceof Error && err.name === "ArgusWriteBlockedError") {
    return {
      layer: "supabase",
      message:
        "Journal writes blocked on ephemeral storage. Configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Vercel (ARGUS_JOURNAL_STORE=supabase).",
    };
  }
  if (err instanceof Error && err.name === "ArgusDataSafetyError") {
    return { layer: "database", message: err.message };
  }
  if (err instanceof Error && err.message.includes("Supabase journal")) {
    return { layer: "supabase", message: err.message };
  }
  if (err instanceof Error && err.message.includes("SUPABASE_URL")) {
    return { layer: "supabase", message: err.message };
  }
  if (err instanceof Error) {
    return { layer: "unknown", message: err.message };
  }
  return { layer: "unknown", message: "An unexpected error occurred." };
}

export function argusErrorQueryParams(err: unknown): { errorLayer: string; errorMsg: string } {
  const { layer, message } = formatArgusError(err);
  return { errorLayer: layer, errorMsg: message };
}
