import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive World Map",
  description: "Explore 250+ countries, 5,000+ states, and 150,000+ cities on an interactive world map. Search locations, view capitals, and discover geographic data.",
  keywords: [
    "world map",
    "interactive map",
    "country map",
    "city finder",
    "location explorer",
    "world capitals map",
    "leaflet map",
  ],
  openGraph: {
    title: "Interactive World Map - Country State City",
    description: "Explore 250+ countries, 5,000+ states, and 150,000+ cities on an interactive world map.",
    type: "website",
  },
  alternates: {
    canonical: "https://countrystatecity.xyz/map",
  },
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
