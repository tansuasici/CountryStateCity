import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://countrystatecity.xyz';

  return [
    {
      url: baseUrl,
      lastModified: new Date('2025-01-10'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date('2025-01-10'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date('2025-01-10'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
