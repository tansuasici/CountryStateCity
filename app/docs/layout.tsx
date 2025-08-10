import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation - Country State City",
  description: "API documentation and testing interface",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}