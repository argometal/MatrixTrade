import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "./components/BottomNav";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Health Vault",
  description: "Registro de quejas, evidencias, correos y relaciones laborales",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Health Vault" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${geist.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
        <div className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Health Vault</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Eres tan bueno como lo que puedes comprobar con evidencias
            </p>
          </header>
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
