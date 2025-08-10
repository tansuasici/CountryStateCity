import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Country State City API",
  description: "Modern RESTful API for accessing comprehensive location data worldwide. 250+ countries, 5,000+ states, and 150,000+ cities.",
  keywords: ["api", "country", "state", "city", "location", "geography", "rest api"],
  authors: [{ name: "Country State City" }],
  openGraph: {
    title: "Country State City API",
    description: "Modern RESTful API for location data",
    type: "website",
    locale: "en_US",
    siteName: "Country State City API"
  },
  twitter: {
    card: "summary_large_image",
    title: "Country State City API",
    description: "Modern RESTful API for location data"
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