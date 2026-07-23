import { SystemScopedSection } from "../../../components/SystemScopedSection";
import { RepositoryView } from "../../../components/RepositoryView";

type Props = {
  params: Promise<{ folderId: string }>;
};

export default async function ForgeActiveFolderPage({ params }: Props) {
  const { folderId } = await params;
  return (
    <SystemScopedSection section="active">
      <RepositoryView view="active" folderId={folderId} />
    </SystemScopedSection>
  );
}
