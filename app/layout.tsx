import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import Head from "next/head";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <Head>
          {/* Primary meta tags */}
          <title>MusicGPT</title>
          <meta name="title" content="MusicGPT" key="title" />
          <meta
            name="description"
            content="piano music that never ends and never repeats"
            key="description"
          />

          {/* OpenGraph meta tags */}
          <meta property="og:type" content="website" key="og:type" />
          <meta property="og:title" content="MusicGPT" key="og:title" />
          <meta property="og:site_name" content="MusicGPT" />
          <meta
            property="og:description"
            content="piano music that never ends and never repeats"
            key="og:description"
          />
          <meta
            property="og:image"
            content="https://musicgpt.dev/og.png"
            key="og:image"
          />

          {/* Twitter meta tags */}
          <meta
            property="twitter:card"
            content="summary_large_image"
            key="twitter:card"
          />
          <meta
            property="twitter:title"
            content="MusicGPT"
            key="twitter:title"
          />
          <meta
            property="twitter:description"
            content="piano music that never ends and never repeats"
            key="twitter:description"
          />
          <meta
            property="twitter:image"
            content="https://musicgpt.dev/og.png"
            key="twitter:image"
          />

          <link rel="shortcut icon" href="/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable
          )}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
