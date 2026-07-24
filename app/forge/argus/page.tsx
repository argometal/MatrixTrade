import { ArgusGraphView } from "../components/ArgusGraphView";
import { Af03RepoDisclosure } from "../components/Af03RepoDisclosure";

/**
 * Argus graph prototype — operable units/relations over Chaos source.
 * Not Alexandria. Not definitive Argus Engine schema.
 */
export default function ForgeArgusPage() {
  return (
    <div className="space-y-4">
      <Af03RepoDisclosure />
      <ArgusGraphView />
    </div>
  );
}
