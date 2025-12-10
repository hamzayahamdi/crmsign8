import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Signature8 CRM - Suivi des Leads",
  description: "CRM de suivi des leads pour Signature8 by Sketch",
  generator: "v0.app",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon-32x32.png",
    apple: "/favicon-32x32.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Signature8 CRM",
  },
  themeColor: "#667eea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark h-full">
      <body
        className={`${inter.variable} font-sans antialiased bg-[rgb(11,14,24)] text-white min-h-screen`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
