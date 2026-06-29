import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  description: "Experiment control H001–H030",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 text-zinc-900 antialiased`}>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <nav className="mb-8 flex gap-6 border-b border-zinc-200 pb-4 text-sm font-medium">
            <Link href="/" className="hover:text-zinc-600">
              Dashboard
            </Link>
            <Link href="/trades" className="hover:text-zinc-600">
              Trades
            </Link>
            <Link href="/trades/new" className="hover:text-zinc-600">
              New trade
            </Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
