/**
 * F2 TRANSITIONAL ADAPTER — NOT production auth.
 * MTA 010 F2: compile-safe no-op so copied Forge layout can build on :3003.
 * Final Forge-origin auth is F3. Does not touch monolith auth or cookies.
 */
export async function requireArgusSession(_options?: { next?: string }): Promise<void> {
  // Intentionally empty for F2 packaging/copy stage.
}
