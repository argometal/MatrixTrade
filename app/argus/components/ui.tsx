import Link from "next/link";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-4 ${className}`}>{children}</div>;
}

export function Button({
  children,
  href,
  variant = "primary",
  fullWidth = false,
  className = "",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-base font-semibold transition";
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-500",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700",
  };
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}>
      {children}
    </Link>
  );
}

export function PageHeader({ title, subtitle, backHref }: { title: string; subtitle?: string; backHref?: string }) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link href={backHref} className="mb-2 inline-block text-sm text-zinc-400 hover:text-zinc-200">
          ← Back
        </Link>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="py-8 text-center">
      <p className="text-zinc-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

export const textareaClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[120px] resize-y";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      {children}
    </div>
  );
}
