import { BottomNav } from "@/app/argus/components/BottomNav";

export default function ArgusAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
      {children}
      <BottomNav />
    </div>
  );
}
