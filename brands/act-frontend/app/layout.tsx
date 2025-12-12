import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { getBrandConfig } from "../lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  // We'll skip the headers approach due to async issues
  // Our brand detection will fall back to other methods
  const brandConfig = getBrandConfig();
  
  return {
    title: brandConfig.displayName,
    description: `${brandConfig.displayName} - Powered by OnBrand.ai`,
    // You could add more metadata like icons, theme colors, etc. based on brand
    themeColor: brandConfig.colors.primary,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get brand config for CSS variables
  const brandConfig = getBrandConfig();
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          // Add brand colors as CSS variables
          '--brand-primary': brandConfig.colors.primary,
          '--brand-secondary': brandConfig.colors.secondary,
          '--brand-accent': brandConfig.colors.accent,
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
