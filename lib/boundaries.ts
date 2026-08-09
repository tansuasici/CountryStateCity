import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

export type BoundaryLevel = 'points' | 'admin1' | 'admin2';
export type BoundaryProfileKey = 'overview' | 'regional' | 'detailed';

interface BoundaryFile {
  filename: string;
  format: 'topojson' | 'geojson';
  mediaType: string;
  bytes: number;
  sha256: string;
  url: string;
}

export interface BoundaryProfile extends BoundaryFile {
  zoom: [number, number];
  toleranceMeters: number;
  npmExport?: string;
}

export interface BoundaryDownload extends BoundaryFile {
  administrativeLevel: 1 | 2;
  features: number;
}

export interface BoundaryCountryManifest {
  countryCode: string;
  countryName: string;
  pilot: boolean;
  administrativeLevels: number[];
  geometryModel: string;
  source: {
    name: string;
    license: string;
    attribution: string;
    licenseUrl: string;
    snapshotDate: string;
  };
  usage: string;
  profiles: Record<BoundaryProfileKey, BoundaryProfile>;
  downloads: Record<'admin1' | 'admin2', BoundaryDownload>;
}

export interface BoundaryManifest {
  schemaVersion: number;
  datasetVersion: string;
  generatedAt: string;
  countries: Record<string, BoundaryCountryManifest>;
}

export interface LoadedBoundaryLayer {
  country: BoundaryCountryManifest;
  datasetVersion: string;
  level: Exclude<BoundaryLevel, 'points'>;
  profile: BoundaryProfileKey;
  data: FeatureCollection<Geometry>;
}

let manifestCache: BoundaryManifest | null = null;
const layerCache = new Map<string, LoadedBoundaryLayer>();

export async function getBoundaryManifest(signal?: AbortSignal): Promise<BoundaryManifest> {
  if (manifestCache) return manifestCache;
  const response = await fetch('/data/boundaries/manifest.json', {
    signal,
    cache: 'force-cache',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Boundary manifest request failed: HTTP ${response.status}`);
  const manifest = (await response.json()) as BoundaryManifest;
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported boundary manifest schema: ${manifest.schemaVersion}`);
  }
  manifestCache = manifest;
  return manifest;
}

export async function getBoundaryLayer(
  countryCode: string,
  level: Exclude<BoundaryLevel, 'points'>,
  profile: BoundaryProfileKey,
  signal?: AbortSignal
): Promise<LoadedBoundaryLayer> {
  const code = countryCode.toUpperCase();
  const cacheKey = `${code}:${level}:${profile}`;
  const cached = layerCache.get(cacheKey);
  if (cached) return cached;
  const manifest = await getBoundaryManifest(signal);
  const country = manifest.countries[code];
  if (!country) throw new Error(`Boundary coverage is unavailable for ${code}`);
  const profileEntry = country.profiles[profile];
  const response = await fetch(profileEntry.url, {
    signal,
    cache: 'force-cache',
    headers: { Accept: profileEntry.mediaType },
  });
  if (!response.ok) {
    throw new Error(`Boundary layer request failed for ${code}: HTTP ${response.status}`);
  }
  const topology = (await response.json()) as Topology;
  const objectName = level === 'admin1' ? 'provinces' : 'districts';
  const topologyObject = topology.objects[objectName] as GeometryCollection;
  if (!topologyObject) throw new Error(`Boundary layer ${objectName} is missing for ${code}`);
  const data = feature(topology, topologyObject) as unknown as FeatureCollection<Geometry>;
  const loaded = { country, datasetVersion: manifest.datasetVersion, level, profile, data };
  layerCache.set(cacheKey, loaded);
  return loaded;
}

export function clearBoundaryCache(): void {
  manifestCache = null;
  layerCache.clear();
}
