import Link from "next/link";

export function MobileAccessBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <p className="font-medium text-blue-900">Connect from phone</p>
        <p className="mt-1 text-xs text-blue-600">
          Open Connect and scan the QR on the same WiFi.
        </p>
      </div>
      <Link
        href="/connect"
        className="rounded-md bg-blue-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-600"
      >
        Show QR codes
      </Link>
    </div>
  );
}
