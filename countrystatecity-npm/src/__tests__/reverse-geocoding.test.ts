import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import CountryStateCity from '../index';
import {
  distanceKilometers,
  locatePointInPolygons,
  NearestCenterIndex,
  PolygonLookupIndex,
} from '../reverse-geocoding';
import type { GeoJsonFeatureCollection } from '../types';

const root = process.cwd();
const benchmark = JSON.parse(
  readFileSync(path.join(root, 'data/geography/reverse-geocoding-benchmark.json'), 'utf8')
);

describe('reverse geocoding', () => {
  it('uses great-circle distance across the antimeridian', () => {
    expect(
      distanceKilometers({ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 })
    ).toBeCloseTo(22.239, 2);
  });

  it('meets labeled nearest-city precision and recall gates', () => {
    let truePositive = 0;
    for (const testCase of benchmark.nearestCityCases) {
      const result = CountryStateCity.nearestCenters(
        { latitude: testCase.latitude, longitude: testCase.longitude },
        { entityTypes: ['city'] }
      );
      expect(result.dataVersion).toMatch(/^sha256:/);
      expect(result.results[0]).toMatchObject({
        entityType: 'city',
        confidenceBasis: 'center-distance',
        entity: { id: testCase.expectedId },
      });
      if ((result.results[0]?.entity as { id?: number })?.id === testCase.expectedId)
        truePositive += 1;
    }
    const precision = truePositive / benchmark.nearestCityCases.length;
    const recall = truePositive / benchmark.nearestCityCases.length;
    expect(precision).toBe(1);
    expect(recall).toBe(1);
  }, 15_000);

  it('supports bounded offline batch lookup', () => {
    const results = CountryStateCity.nearestCentersBatch(
      [
        { latitude: 40.981096, longitude: 29.06514473 },
        { latitude: 35.6895, longitude: 139.69171 },
      ],
      { entityTypes: ['city'], limitPerType: 1 }
    );
    expect(results.map((result) => (result.results[0].entity as { id: number }).id)).toEqual([
      107863, 64500,
    ]);
    expect(() =>
      CountryStateCity.nearestCentersBatch(
        Array.from({ length: 10_001 }, () => ({ latitude: 0, longitude: 0 }))
      )
    ).toThrow(/10,000/);
  });

  it('stays inside the KD-tree build and warm query performance budgets', () => {
    const compact = JSON.parse(
      readFileSync(path.join(root, 'data/city-optimized.json'), 'utf8')
    ).map((record: { i: number; la: number; lo: number }) => ({
      id: record.i,
      latitude: record.la,
      longitude: record.lo,
    }));
    const buildStarted = performance.now();
    const index = new NearestCenterIndex(compact, 'city');
    const buildDuration = performance.now() - buildStarted;
    expect(buildDuration).toBeLessThan(5_000);

    index.nearest({ latitude: 41.01, longitude: 29.02 });
    const durations = Array.from({ length: 100 }, (_, offset) => {
      const started = performance.now();
      index.nearest({ latitude: 40.9 + offset / 1000, longitude: 29.0 });
      return performance.now() - started;
    }).sort((a, b) => a - b);
    expect(durations[Math.floor(durations.length * 0.95)]).toBeLessThan(10);
  });

  it('handles polygon holes, boundaries, and overlaps without inventing jurisdiction', () => {
    const collection: GeoJsonFeatureCollection<{ name: string }> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'outer' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
              [
                [4, 4],
                [6, 4],
                [6, 6],
                [4, 6],
                [4, 4],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { name: 'overlap' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [8, 8],
                [12, 8],
                [12, 12],
                [8, 12],
                [8, 8],
              ],
            ],
          },
        },
      ],
    };
    expect(locatePointInPolygons({ latitude: 5, longitude: 5 }, collection).confidence).toBe(
      'none'
    );
    expect(locatePointInPolygons({ latitude: 0, longitude: 5 }, collection)).toMatchObject({
      confidence: 'boundary-or-overlap',
      matches: [{ boundary: true }],
    });
    expect(locatePointInPolygons({ latitude: 9, longitude: 9 }, collection)).toMatchObject({
      confidence: 'boundary-or-overlap',
      matches: [{ properties: { name: 'outer' } }, { properties: { name: 'overlap' } }],
    });
  });

  it('matches labeled Türkiye admin-1 and admin-2 polygons', () => {
    const provinces = new PolygonLookupIndex(
      JSON.parse(
        readFileSync(path.join(root, 'data/boundaries/tr/turkey-provinces.geojson'), 'utf8')
      )
    );
    const districts = new PolygonLookupIndex(
      JSON.parse(
        readFileSync(path.join(root, 'data/boundaries/tr/turkey-districts.geojson'), 'utf8')
      )
    );
    for (const testCase of benchmark.turkeyPolygonCases) {
      const point = { latitude: testCase.latitude, longitude: testCase.longitude };
      expect(provinces.locate(point).matches[0]?.properties).toMatchObject({
        stateCode: testCase.expectedProvinceCode,
      });
      expect(districts.locate(point).matches[0]?.properties).toMatchObject({
        name: testCase.expectedDistrict,
      });
    }
  });
});
