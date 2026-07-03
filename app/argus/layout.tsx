import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { TradingCornerEntry } from "@/app/components/TradingCornerEntry";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

import { ARGUS_SUBTITLE } from "@/lib/argus/ux-copy";

export const metadata: Metadata = {
  title: "ARGUS",
  description: ARGUS_SUBTITLE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export default function ArgusRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${geist.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
      <TradingCornerEntry />
      {children}
    </div>
  );
}
