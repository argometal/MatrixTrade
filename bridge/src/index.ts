export interface Env {
  SNAPSHOT: KVNamespace;
  WRITE_TOKEN: string;
  READ_TOKEN: string;
}

const SNAPSHOT_KEY = "snapshot:latest";
const INBOX_INDEX_KEY = "inbox:index";

export interface InboxItem {
  id: string;
  receivedAt: string;
  status: "pending" | "applied" | "rejected";
  payload: Record<string, unknown>;
}

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

function readReadToken(request: Request): string | null {
  return new URL(request.url).searchParams.get("token");
}

function unauthorized(): Response {
  return jsonResponse({ error: "Unauthorized" }, 401);
}

function normalizeUpdatedAt(value: unknown): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

async function parseJsonObject(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const parsed = await request.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ error: "Body must be a JSON object" }, 400);
    }
    return parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
}

function inboxItemKey(id: string): string {
  return `inbox:item:${id}`;
}

async function readInboxIndex(env: Env): Promise<string[]> {
  const raw = await env.SNAPSHOT.get(INBOX_INDEX_KEY);
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function writeInboxIndex(env: Env, ids: string[]): Promise<void> {
  await env.SNAPSHOT.put(INBOX_INDEX_KEY, JSON.stringify(ids));
}

// --- /snapshot ---

async function handlePostSnapshot(request: Request, env: Env): Promise<Response> {
  const token = readBearerToken(request);
  if (!token || token !== env.WRITE_TOKEN) {
    return unauthorized();
  }

  const body = await parseJsonObject(request);
  if (body instanceof Response) return body;

  body.updatedAt = normalizeUpdatedAt(body.updatedAt);
  await env.SNAPSHOT.put(SNAPSHOT_KEY, JSON.stringify(body));

  return jsonResponse({ ok: true, updatedAt: body.updatedAt }, 200);
}

async function handleGetSnapshot(request: Request, env: Env): Promise<Response> {
  const token = readReadToken(request);
  if (!token || token !== env.READ_TOKEN) {
    return unauthorized();
  }

  const snapshot = await env.SNAPSHOT.get(SNAPSHOT_KEY);
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

// --- /inbox ---

async function handlePostInbox(request: Request, env: Env): Promise<Response> {
  const token = readBearerToken(request);
  if (!token || token !== env.WRITE_TOKEN) {
    return unauthorized();
  }

  const body = await parseJsonObject(request);
  if (body instanceof Response) return body;

  const item: InboxItem = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    status: "pending",
    payload: body,
  };

  await env.SNAPSHOT.put(inboxItemKey(item.id), JSON.stringify(item));

  const index = await readInboxIndex(env);
  index.push(item.id);
  await writeInboxIndex(env, index);

  return jsonResponse({ ok: true, id: item.id, receivedAt: item.receivedAt, status: item.status }, 201);
}

async function handleGetInbox(request: Request, env: Env): Promise<Response> {
  const token = readReadToken(request);
  if (!token || token !== env.READ_TOKEN) {
    return unauthorized();
  }

  const index = await readInboxIndex(env);
  const items: InboxItem[] = [];

  for (const id of index) {
    const raw = await env.SNAPSHOT.get(inboxItemKey(id));
    if (!raw) continue;
    try {
      const item = JSON.parse(raw) as InboxItem;
      if (item.status === "pending") {
        items.push(item);
      }
    } catch {
      // skip corrupt entries
    }
  }

  return jsonResponse({ count: items.length, items }, 200);
}

async function handlePostInboxAck(request: Request, env: Env, id: string): Promise<Response> {
  const token = readBearerToken(request);
  if (!token || token !== env.WRITE_TOKEN) {
    return unauthorized();
  }

  const body = await parseJsonObject(request);
  if (body instanceof Response) return body;

  const nextStatus = body.status === "rejected" ? "rejected" : "applied";

  const raw = await env.SNAPSHOT.get(inboxItemKey(id));
  if (!raw) {
    return jsonResponse({ error: "Inbox item not found" }, 404);
  }

  let item: InboxItem;
  try {
    item = JSON.parse(raw) as InboxItem;
  } catch {
    return jsonResponse({ error: "Corrupt inbox item" }, 500);
  }

  item.status = nextStatus;
  await env.SNAPSHOT.put(inboxItemKey(id), JSON.stringify(item));

  return jsonResponse({ ok: true, id, status: item.status }, 200);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    const inboxAckMatch = pathname.match(/^\/inbox\/([^/]+)\/ack$/);
    if (inboxAckMatch && request.method === "POST") {
      return handlePostInboxAck(request, env, inboxAckMatch[1]);
    }

    if (pathname === "/snapshot") {
      if (request.method === "POST") return handlePostSnapshot(request, env);
      if (request.method === "GET") return handleGetSnapshot(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (pathname === "/inbox") {
      if (request.method === "POST") return handlePostInbox(request, env);
      if (request.method === "GET") return handleGetInbox(request, env);
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
