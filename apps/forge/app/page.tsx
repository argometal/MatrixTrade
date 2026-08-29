import Link from "next/link";

/**
 * F2 packaging index — product UI lives under /forge (parity with monolith).
 */
export default function ForgeIndexPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "40rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Argus Forge</h1>
      <p style={{ color: "#a1a1aa", lineHeight: 1.5 }}>
        Independent Next.js app — F2 domain copy under{" "}
        <Link href="/forge" style={{ color: "#e4e4e7", textDecoration: "underline" }}>
          /forge
        </Link>
        . Compare with monolith localhost:3002/forge. Auth/shell finalization is F3.
      </p>
      <p style={{ color: "#71717a", fontSize: "0.875rem" }}>Local port: 3003</p>
    </main>
  );
}
