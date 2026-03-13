import { RootProvider } from 'fumadocs-ui/provider/next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const siteUrl = 'https://countrystatecity.tansuasici.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Country State City - World Location Database | JSON, CSV, XML, YAML',
    template: '%s | Country State City',
  },
  description:
    'Free comprehensive world location database with 250+ countries, 5,000+ states, and 150,000+ cities. Available in JSON, CSV, XML, and YAML formats. ISO 3166-1 compliant NPM package for developers.',
  keywords: [
    'country data',
    'state data',
    'city data',
    'location database',
    'world countries json',
    'countries api',
    'iso 3166',
    'npm package',
    'typescript',
    'react',
    'nextjs',
    'json',
    'csv',
    'xml',
    'yaml',
  ],
  authors: [{ name: 'Tansu Asici', url: 'https://tansuasici.com' }],
  creator: 'Tansu Asici',
  publisher: 'Tansu Asici',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'Country State City - World Location Database',
    description:
      'Free comprehensive world location database with 250+ countries, 5,000+ states, and 150,000+ cities.',
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Country State City',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Country State City' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Country State City - World Location Database',
    description:
      'Free comprehensive world location database with 250+ countries, 5,000+ states, and 150,000+ cities.',
    images: ['/og-image.png'],
    creator: '@tansuasici',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Country State City',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  description:
    'Free comprehensive world location database with 250+ countries, 5,000+ states, and 150,000+ cities.',
  url: siteUrl,
  author: { '@type': 'Person', name: 'Tansu Asici', url: 'https://tansuasici.com' },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  softwareVersion: '2.0.13',
  downloadUrl: 'https://www.npmjs.com/package/@tansuasici/country-state-city',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
