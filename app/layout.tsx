import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ArgusCornerEntry } from "@/app/components/ArgusCornerEntry";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MatrixTrade",
  description: "Trading lab — conductual journal and risk control",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/** Read data/*.json at request time (required for Vercel serverless). */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 text-zinc-900 antialiased`}>
        <ArgusCornerEntry />
        {children}
      </body>
    </html>
  );
}
