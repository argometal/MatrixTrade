import { ArgusGraphView } from "../../components/ArgusGraphView";
import { Af03RepoDisclosure } from "../../components/Af03RepoDisclosure";
import Link from "next/link";

/**
 * Unit-level Argus Engine prototype (former /forge/argus default).
 * Primary Argus surface is now the Realm Treemap (24-17).
 */
export default function ForgeArgusUnitsPage() {
  return (
    <div className="space-y-4">
      <Af03RepoDisclosure />
      <p className="text-xs text-zinc-500">
        <Link href="/forge/argus" className="underline hover:text-zinc-300">
          ← Realm Treemap
        </Link>
        {" · "}
        Unit graph (2D + 3D) — Fragments as nodes, not Chaos Decks.
      </p>
      <ArgusGraphView />
    </div>
  );
}
