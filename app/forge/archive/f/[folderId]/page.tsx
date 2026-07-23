import { RepositoryView } from "../../../components/RepositoryView";

export default async function ForgeArchiveFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <RepositoryView view="archive" folderId={folderId} />;
}
