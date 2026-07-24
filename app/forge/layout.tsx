import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ForgeShell } from "./components/ForgeShell";
import { ForgeSystemProvider } from "./components/ForgeSystemProvider";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ArgusForge",
  description: "Coordination environment — Engine / Create / View / Output shell",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
  viewportFit: "cover",
};

export default function ForgeRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${geist.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
      <ForgeSystemProvider>
        <ForgeShell>{children}</ForgeShell>
      </ForgeSystemProvider>
    </div>
  );
}
