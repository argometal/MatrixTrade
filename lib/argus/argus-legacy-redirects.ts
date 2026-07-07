import type { NextRequest } from "next/server";

/** Legacy ARGUS routes → v2 equivalents. Journal mode is disabled. */
export function argusLegacyRedirectUrl(request: NextRequest): URL | null {
  const { pathname } = request.nextUrl;

  if (pathname === "/argus" || pathname === "/argus/") {
    return new URL("/argus/v2", request.url);
  }

  if (pathname === "/argus/journal" || pathname.startsWith("/argus/journal/")) {
    const target = new URL("/argus/v2", request.url);
    const capture = request.nextUrl.searchParams.get("capture");
    const eventId = request.nextUrl.searchParams.get("eventId");
    const reference = request.nextUrl.searchParams.get("reference");
    if (capture) target.searchParams.set("capture", capture);
    if (eventId) target.searchParams.set("eventId", eventId);
    if (reference) target.searchParams.set("reference", reference);
    return target;
  }

  if (pathname === "/argus/new") {
    return new URL("/argus/v2?capture=1", request.url);
  }

  if (pathname === "/argus/inbox") {
    const target = new URL("/argus/v2/inbox", request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      target.searchParams.set(key, value);
    });
    return target;
  }

  const inboxDetail = pathname.match(/^\/argus\/inbox\/([^/]+)$/);
  if (inboxDetail) {
    const target = new URL("/argus/v2/inbox", request.url);
    target.searchParams.set("selected", inboxDetail[1]);
    return target;
  }

  if (pathname === "/argus/network" || pathname.startsWith("/argus/network/")) {
    const networkDetail = pathname.match(/^\/argus\/network\/([^/]+)$/);
    if (networkDetail) {
      return new URL(`/argus/v2/network/${networkDetail[1]}`, request.url);
    }
    return new URL("/argus/v2/browse/network", request.url);
  }

  return null;
}
