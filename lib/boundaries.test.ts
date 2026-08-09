import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearBoundaryCache, getBoundaryLayer, getBoundaryManifest } from './boundaries';

const manifest = {
  schemaVersion: 1,
  datasetVersion: '2026-08-06.1',
  generatedAt: '2026-08-06T12:15:20Z',
  countries: {
    TR: {
      countryCode: 'TR',
      countryName: 'Türkiye',
      pilot: true,
      administrativeLevels: [1, 2],
      geometryModel: 'district-first-derived-coverage-v1',
      source: {
        name: 'OpenStreetMap',
        license: 'ODbL-1.0',
        attribution: '© OpenStreetMap contributors',
        licenseUrl: 'https://www.openstreetmap.org/copyright',
        snapshotDate: '2026-08-06T12:15:20Z',
      },
      usage: 'visualization',
      profiles: {
        overview: {
          filename: 'tr.topojson',
          format: 'topojson',
          mediaType: 'application/topo+json',
          zoom: [0, 4],
          toleranceMeters: 5000,
          bytes: 100,
          sha256: 'hash',
          url: '/data/boundaries/2026-08-06.1/tr/tr.topojson',
        },
      },
      downloads: {},
    },
  },
};

const topology = {
  type: 'Topology',
  objects: {
    provinces: {
      type: 'GeometryCollection',
      geometries: [{ type: 'Polygon', arcs: [[0]], properties: { id: 2212, name: 'Adana' } }],
    },
    districts: { type: 'GeometryCollection', geometries: [] },
  },
  arcs: [
    [
      [35, 37],
      [36, 37],
      [36, 38],
      [35, 37],
    ],
  ],
};

afterEach(() => {
  clearBoundaryCache();
  vi.unstubAllGlobals();
});

describe('country boundary loader', () => {
  it('loads the versioned manifest and requested country profile only', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(manifest)))
      .mockResolvedValueOnce(new Response(JSON.stringify(topology)));
    vi.stubGlobal('fetch', fetchMock);

    const layer = await getBoundaryLayer('tr', 'admin1', 'overview');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/data/boundaries/manifest.json',
      '/data/boundaries/2026-08-06.1/tr/tr.topojson',
    ]);
    expect(layer.data.features).toHaveLength(1);
    expect(layer.data.features[0].properties).toMatchObject({ id: 2212, name: 'Adana' });
  });

  it('caches successful manifest and layer responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(manifest)))
      .mockResolvedValueOnce(new Response(JSON.stringify(topology)));
    vi.stubGlobal('fetch', fetchMock);

    await getBoundaryLayer('TR', 'admin1', 'overview');
    await getBoundaryLayer('TR', 'admin1', 'overview');
    await getBoundaryManifest();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports unsupported countries without requesting a profile', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(manifest)));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getBoundaryLayer('US', 'admin1', 'overview')).rejects.toThrow(
      'Boundary coverage is unavailable for US'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
