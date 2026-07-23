import { SystemScopedSection } from "../../../components/SystemScopedSection";
import { RepositoryView } from "../../../components/RepositoryView";

type Props = {
  params: Promise<{ folderId: string }>;
};

export default async function ForgeArchiveFolderPage({ params }: Props) {
  const { folderId } = await params;
  return (
    <SystemScopedSection section="archive">
      <RepositoryView view="archive" folderId={folderId} />
    </SystemScopedSection>
  );
}
