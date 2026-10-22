import type { ReactNode } from "react";
import "./globals.css";
import AskBar from "@/components/ask/AskBar";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ReadingProgress from "@/components/layout/ReadingProgress/ReadingProgress";
import JsonLd from "@/components/seo/JsonLd";
import { LANGUAGE } from "@/content/person";
import { siteMetadata, siteViewport } from "@/lib/seo/site-metadata";
import { themeScript } from "@/lib/theme/theme-script";

export const metadata = siteMetadata;
export const viewport = siteViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={LANGUAGE.tag} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd />
      </head>
      <body>
        <ReadingProgress />
        <Header />
        {children}
        <Footer />
        <AskBar />
      </body>
    </html>
  );
}
