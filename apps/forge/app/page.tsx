/**
 * F1 packaging proof only — not product UI.
 * Domain extraction (Chaos / Explorer / Vault) is a later stage.
 */
export default function ForgeSkeletonPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "40rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Argus Forge</h1>
      <p style={{ color: "#52525b", lineHeight: 1.5 }}>
        Independent Next.js application skeleton (MTA 010 · F1). Packaging proof only —
        no product domain yet.
      </p>
      <p style={{ color: "#71717a", fontSize: "0.875rem" }}>Local port: 3003</p>
    </main>
  );
}
