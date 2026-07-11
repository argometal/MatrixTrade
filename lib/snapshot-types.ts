export type SnapshotMenuItem = {
  id: string;
  label: string;
  description: string;
  text: string;
};

export type SnapshotButtonProps = {
  title: string;
  description: string;
  items: SnapshotMenuItem[];
};
