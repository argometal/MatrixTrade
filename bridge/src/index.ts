export interface Env {
  SNAPSHOT: KVNamespace;
  WRITE_TOKEN: string;
  READ_TOKEN: string;
}

const KV_KEY = "snapshot:latest";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function readBearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

function normalizeUpdatedAt(value: unknown): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

async function handlePost(request: Request, env: Env): Promise<Response> {
  const token = readBearerToken(request);
  if (!token || token !== env.WRITE_TOKEN) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ error: "Body must be a JSON object" }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  body.updatedAt = normalizeUpdatedAt(body.updatedAt);

  await env.SNAPSHOT.put(KV_KEY, JSON.stringify(body));

  return jsonResponse({ ok: true, updatedAt: body.updatedAt }, 200);
}

async function handleGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token || token !== env.READ_TOKEN) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const snapshot = await env.SNAPSHOT.get(KV_KEY);
  if (!snapshot) {
    return jsonResponse({ error: "No snapshot published yet" }, 404);
  }

  return new Response(snapshot, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/snapshot") {
      return jsonResponse({ error: "Not found" }, 404);
    }

    if (request.method === "POST") {
      return handlePost(request, env);
    }

    if (request.method === "GET") {
      return handleGet(request, env);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  },
};
