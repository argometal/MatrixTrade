import { SystemScopedSection } from "../components/SystemScopedSection";
import { RepositoryView } from "../components/RepositoryView";

export default function ForgeActiveRootPage() {
  return (
    <SystemScopedSection section="active">
      <RepositoryView view="active" folderId={null} />
    </SystemScopedSection>
  );
}
