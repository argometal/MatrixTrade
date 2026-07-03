import Link from "next/link";
import { CopyUrlButton } from "@/app/components/CopyUrlButton";
import { createQrDataUrl } from "@/lib/qr";
import { getSnapshotReadUrl } from "@/lib/bridge";

export async function BridgeConnectCard() {
  const snapshotUrl = getSnapshotReadUrl();

  if (!snapshotUrl) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
        <h2 className="font-semibold text-zinc-800">Cloud snapshot QR (future-ready)</h2>
        <p className="mt-2">
          When <code className="rounded bg-white px-1">BRIDGE_READ_TOKEN</code> is set, this page
          will show a QR that opens your live cycle JSON from anywhere — no WiFi required. ChatGPT
          can use the same URL.
        </p>
      </section>
    );
  }

  const qrDataUrl = await createQrDataUrl(snapshotUrl);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Cloud snapshot QR</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Works on any network. Scan to open the latest published snapshot JSON (read-only). Sync
          from the dashboard first.
        </p>
      </div>
      <div className="flex flex-col items-center rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 sm:max-w-sm">
        <div className="rounded-md border border-zinc-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR for cloud snapshot"
            width={220}
            height={220}
            className="block h-[220px] w-[220px]"
          />
        </div>
        <p className="mt-4 break-all text-center font-mono text-xs text-emerald-900">{snapshotUrl}</p>
        <CopyUrlButton url={snapshotUrl} />
        <p className="mt-3 text-center text-xs text-zinc-500">
          READ token only — safe to scan. Does not allow writes.
        </p>
      </div>
    </section>
  );
}
