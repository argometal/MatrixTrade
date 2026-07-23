import { RepositoryView } from "../../../components/RepositoryView";

export default async function ForgeActiveFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <RepositoryView view="active" folderId={folderId} />;
}
