import Link from "next/link";
import { ConnectPageContent } from "@/app/components/ConnectPageContent";
import { BridgeConnectCard } from "@/app/components/BridgeConnectCard";

export default function ConnectPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Connect</h1>
        <p className="text-sm text-zinc-500">
          Two ways to reach your data from phone or ChatGPT.
        </p>
      </header>

      <BridgeConnectCard />

      <section className="space-y-4 border-t border-zinc-200 pt-8">
        <div>
          <h2 className="text-lg font-semibold">Local WiFi QR</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Opens MatrixTrade on your PC&apos;s LAN IP. Same WiFi required. Good for dashboard +
            copy handoff when you are at home.
          </p>
        </div>
        <ConnectPageContent />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <h3 className="font-semibold">Which QR should I use?</h3>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Cloud snapshot</strong> — read-only JSON anywhere (after Sync). Best for
            ChatGPT browsing and quick phone check.
          </li>
          <li>
            <strong>Local WiFi</strong> — full app UI on LAN. Best for reviewing trades in the
            browser on your phone at home.
          </li>
        </ul>
      </section>
    </div>
  );
}
