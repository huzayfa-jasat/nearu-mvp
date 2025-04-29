import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWARegister } from "./PWARegister";
import Script from "next/script";

// Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata
export const metadata: Metadata = {
  title: "NearU – Waterloo Social Discovery",
  description: "Connect with people you cross paths with.",
  manifest: "/manifest.json",
  themeColor: "#4f46e5",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NearU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-gradient-to-b from-[#e0f2f1] to-[#f3e5f5] min-h-screen`}>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
