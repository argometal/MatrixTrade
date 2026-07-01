import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Health Vault",
  description: "Bitácora laboral privada con evidencias",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export default function HealthRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${geist.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>{children}</div>
  );
}
