import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HeyJournal - Your Trading Friend",
  description: "A smart trading journal for Indian stock markets. Track trades, analyze performance, and improve your trading discipline.",
  keywords: ["HeyJournal", "Trading Journal", "Indian Stock Market", "NSE", "BSE", "Trading", "Stock Market", "Performance Analytics"],
  authors: [{ name: "Sandip Guchait" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "HeyJournal - Your Trading Friend",
    description: "A smart trading journal for Indian stock markets",
    url: "https://heyjournal.vercel.app",
    siteName: "HeyJournal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HeyJournal - Your Trading Friend",
    description: "A smart trading journal for Indian stock markets",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
