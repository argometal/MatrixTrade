import { BottomNav } from "@/app/components/network-vault/BottomNav";

export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
          Network Vault
        </p>
      </header>
      {children}
      <BottomNav />
    </div>
  );
}
