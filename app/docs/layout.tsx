import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation & API Reference",
  description: "Complete API documentation for Country State City NPM package. Learn how to use getAllCountries(), getStatesByCountryId(), getCitiesByStateId() methods with JSON, CSV, XML, YAML formats.",
  keywords: [
    "country state city api",
    "npm package documentation",
    "getAllCountries",
    "getStatesByCountryId",
    "getCitiesByStateId",
    "typescript api",
    "react location picker",
  ],
  openGraph: {
    title: "Documentation & API Reference - Country State City",
    description: "Complete API documentation for Country State City NPM package with interactive playground.",
    type: "article",
  },
  alternates: {
    canonical: "https://countrystatecity.xyz/docs",
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}