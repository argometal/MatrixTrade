import { SystemScopedSection } from "../components/SystemScopedSection";
import { RepositoryView } from "../components/RepositoryView";

export default function ForgeArchiveRootPage() {
  return (
    <SystemScopedSection section="archive">
      <RepositoryView view="archive" folderId={null} />
    </SystemScopedSection>
  );
}
