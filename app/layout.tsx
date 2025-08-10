import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Country State City Data",
  description: "Complete world location data in JSON, CSV, XML, and YAML formats. 250+ countries, 5,000+ states, and 150,000+ cities.",
  keywords: ["json", "csv", "xml", "yaml", "country", "state", "city", "location", "geography", "data", "npm package"],
  authors: [{ name: "Tansu Asici", url: "https://tansuasici.com" }],
  openGraph: {
    title: "Country State City Data",
    description: "Complete world location data in multiple formats",
    type: "website",
    locale: "en_US",
    siteName: "Country State City Data"
  },
  twitter: {
    card: "summary_large_image",
    title: "Country State City Data",
    description: "Complete world location data in multiple formats"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navigation />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}