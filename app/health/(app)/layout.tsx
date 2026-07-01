import { BottomNav } from "@/app/health/components/BottomNav";

export default function HealthAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Health Vault</p>
        <p className="mt-0.5 text-xs text-zinc-500">Inbox privado — registra y guarda</p>
      </header>
      {children}
      <BottomNav />
    </div>
  );
}
