import { CopyUrlButton } from "@/app/components/CopyUrlButton";
import {
  getAllLocalAddresses,
  getConnectAddresses,
  getIpconfigDiagnostics,
  mergeAddresses,
  parseIpconfigAddresses,
} from "@/lib/network";
import { createQrDataUrl } from "@/lib/qr";

type ConnectItem = {
  name: string;
  address: string;
  url: string;
  qrDataUrl: string;
};

function QrCard({ item }: { item: ConnectItem }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="mb-1 text-center text-sm font-semibold text-zinc-200">{item.name}</p>
      <p className="mb-4 text-center font-mono text-xs text-zinc-500">{item.address}</p>
      <div className="rounded-md border border-zinc-700 bg-zinc-950 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.qrDataUrl}
          alt={`QR for ${item.url}`}
          width={220}
          height={220}
          className="block h-[220px] w-[220px]"
        />
      </div>
      <p className="mt-4 break-all text-center font-mono text-xs text-violet-400">{item.url}</p>
      <CopyUrlButton url={item.url} variant="dark" />
    </div>
  );
}

async function loadConnectAddresses(): Promise<ConnectItem[]> {
  const fromNode = getAllLocalAddresses();
  const ipconfigText = await getIpconfigDiagnostics();
  const fromIpconfig = ipconfigText ? parseIpconfigAddresses(ipconfigText) : [];
  const addresses =
    fromNode.length > 0 ? mergeAddresses(fromNode, fromIpconfig) : await getConnectAddresses();

  return Promise.all(
    addresses.map(async (item) => ({
      name: item.name,
      address: item.address,
      url: item.url,
      qrDataUrl: await createQrDataUrl(item.url),
    }))
  );
}

export async function ConnectPageContent() {
  const addresses = await loadConnectAddresses();

  return (
    <div className="space-y-8">
      {addresses.length === 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          No network addresses found. Connect this PC to WiFi or Ethernet, then refresh.
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            Scan any QR with your phone. If one fails, try the next — IPs change depending on
            WiFi, Ethernet, or VPN.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {addresses.map((item) => (
              <QrCard key={`${item.name}-${item.address}`} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
