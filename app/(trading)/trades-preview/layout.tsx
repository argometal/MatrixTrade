export default function TradesPreviewShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-zinc-950">
      <div className="h-full w-full overflow-hidden">{children}</div>
    </div>
  );
}
