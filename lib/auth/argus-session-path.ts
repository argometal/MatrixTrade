/** Paths that use the Argus password session (`argus-auth`), not MTA `mt-auth`. */
export function isArgusSessionPath(pathname: string): boolean {
  if (pathname === "/argus/login") return false;
  if (pathname.startsWith("/argus")) return true;
  return pathname === "/forge" || pathname.startsWith("/forge/");
}
