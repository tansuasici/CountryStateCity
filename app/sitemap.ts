import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

function getLastModified(filePath: string): Date {
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime;
  } catch {
    return new Date();
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://countrystatecity.tansuasici.com';
  const contentDir = path.join(process.cwd(), 'content/docs');

  const docSlugs = [
    'installation',
    'api-reference',
    'data-structures',
    'formats',
    'mcp',
    'playground',
    'contributing',
  ];

  const docEntries: MetadataRoute.Sitemap = docSlugs.map((slug) => ({
    url: `${baseUrl}/docs/${slug}`,
    lastModified: getLastModified(path.join(contentDir, `${slug}.mdx`)),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: getLastModified(path.join(process.cwd(), 'app/(home)/page.tsx')),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: getLastModified(path.join(contentDir, 'index.mdx')),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: getLastModified(path.join(process.cwd(), 'app/(home)/map/page.tsx')),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...docEntries,
  ];
}
