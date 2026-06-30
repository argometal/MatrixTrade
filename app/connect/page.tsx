import Link from "next/link";
import { ConnectPageContent } from "@/app/components/ConnectPageContent";

export default function ConnectPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Connect from phone</h1>
        <p className="text-sm text-zinc-500">Same WiFi as this PC. Scan a QR — no typing required.</p>
      </header>

      <ConnectPageContent />
    </div>
  );
}
