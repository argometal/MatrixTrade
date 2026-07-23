import { SystemScopedSection } from "../components/SystemScopedSection";
import { RepositoryView } from "../components/RepositoryView";

/** Library — organizational repository browse (AF). MTA uses scoped links. */
export default function ForgeLibraryPage() {
  return (
    <SystemScopedSection section="library">
      <RepositoryView view="active" folderId={null} />
    </SystemScopedSection>
  );
}
