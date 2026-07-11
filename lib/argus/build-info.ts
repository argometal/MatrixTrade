/** Short git SHA baked in at build time (see next.config.ts). */
export function getArgusBuildSha(): string {
  return process.env.NEXT_PUBLIC_ARGUS_BUILD_SHA?.trim() || "dev";
}

export function argusBuildCommitUrl(sha: string): string | null {
  const short = sha.trim();
  if (!short || short === "dev" || short === "local") return null;
  return `https://github.com/argometal/MatrixTrade/commit/${short}`;
}
