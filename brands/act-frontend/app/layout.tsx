import type { Metadata, Viewport } from "next";
import { Crimson_Text, DM_Sans, Roboto_Mono } from "next/font/google";
import { headers } from "next/headers";
import { getBrandConfig } from "../lib/brand";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export async function generateMetadata(): Promise<Metadata> {
  // We'll skip the headers approach due to async issues
  // Our brand detection will fall back to other methods
  const brandConfig = getBrandConfig();
  
  return {
    title: brandConfig.displayName,
    description: `${brandConfig.displayName} - Powered by OnBrand.ai`,
  };
}

export async function generateViewport(): Promise<Viewport> {
  const brandConfig = getBrandConfig();
  
  return {
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${crimsonText.variable} ${dmSans.variable} ${robotoMono.variable} antialiased`}
        style={{
          // Add brand colors as CSS variables
          '--brand-primary': brandConfig.colors.primary,
          '--brand-secondary': brandConfig.colors.secondary,
          '--brand-accent': brandConfig.colors.accent,
        } as React.CSSProperties}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
