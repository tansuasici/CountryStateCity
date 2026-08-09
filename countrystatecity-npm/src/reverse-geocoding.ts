import type {
  CoordinatePoint,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  NearestCenterMatch,
  NearestCenterOptions,
  NearestCenterResult,
  NearestEntityType,
  PolygonLookupResult,
  SpatialConfidence,
} from './types';

type CoordinateRecord = {
  latitude: string | number | null;
  longitude: string | number | null;
};

type IndexedPoint<T> = {
  record: T;
  vector: [number, number, number];
  latitude: number;
  longitude: number;
};

type KdNode<T> = {
  point: IndexedPoint<T>;
  axis: 0 | 1 | 2;
  left: KdNode<T> | null;
  right: KdNode<T> | null;
};

const EARTH_RADIUS_KM = 6371.0088;

function assertCoordinate(point: CoordinatePoint): void {
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90) {
    throw new RangeError('latitude must be a finite number between -90 and 90.');
  }
  if (!Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw new RangeError('longitude must be a finite number between -180 and 180.');
  }
}

function toVector(latitude: number, longitude: number): [number, number, number] {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeRadians = (longitude * Math.PI) / 180;
  const radius = Math.cos(latitudeRadians);
  return [
    radius * Math.cos(longitudeRadians),
    radius * Math.sin(longitudeRadians),
    Math.sin(latitudeRadians),
  ];
}

function chordDistanceSquared(a: [number, number, number], b: [number, number, number]): number {
  const x = a[0] - b[0];
  const y = a[1] - b[1];
  const z = a[2] - b[2];
  return x * x + y * y + z * z;
}

export function distanceKilometers(a: CoordinatePoint, b: CoordinatePoint): number {
  assertCoordinate(a);
  assertCoordinate(b);
  const latitudeDelta = ((b.latitude - a.latitude) * Math.PI) / 180;
  const longitudeDelta = ((b.longitude - a.longitude) * Math.PI) / 180;
  const latitudeA = (a.latitude * Math.PI) / 180;
  const latitudeB = (b.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function buildTree<T>(points: IndexedPoint<T>[], depth = 0): KdNode<T> | null {
  if (!points.length) return null;
  const axis = (depth % 3) as 0 | 1 | 2;
  points.sort((a, b) => a.vector[axis] - b.vector[axis]);
  const middle = Math.floor(points.length / 2);
  return {
    point: points[middle],
    axis,
    left: buildTree(points.slice(0, middle), depth + 1),
    right: buildTree(points.slice(middle + 1), depth + 1),
  };
}

function confidence(entityType: NearestEntityType, distanceKm: number): SpatialConfidence {
  const thresholds: Record<NearestEntityType, [number, number]> = {
    city: [5, 25],
    district: [10, 40],
    state: [50, 150],
    country: [250, 750],
  };
  const [high, medium] = thresholds[entityType];
  return distanceKm <= high ? 'high' : distanceKm <= medium ? 'medium' : 'low';
}

export class NearestCenterIndex<T extends CoordinateRecord> {
  private readonly root: KdNode<T> | null;

  constructor(
    records: readonly T[],
    public readonly entityType: NearestEntityType
  ) {
    const points = records.flatMap((record): IndexedPoint<T>[] => {
      const latitude = Number(record.latitude);
      const longitude = Number(record.longitude);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return [];
      }
      return [{ record, latitude, longitude, vector: toVector(latitude, longitude) }];
    });
    this.root = buildTree(points);
  }

  nearest(
    point: CoordinatePoint,
    limit = 1,
    maxDistanceKm = Number.POSITIVE_INFINITY
  ): NearestCenterMatch<T>[] {
    assertCoordinate(point);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError('limit must be an integer between 1 and 100.');
    }
    if (!(maxDistanceKm > 0)) throw new RangeError('maxDistanceKm must be greater than zero.');

    const target = toVector(point.latitude, point.longitude);
    const candidates: Array<{ point: IndexedPoint<T>; chordSquared: number }> = [];

    const visit = (node: KdNode<T> | null) => {
      if (!node) return;
      const chordSquared = chordDistanceSquared(target, node.point.vector);
      if (candidates.length < limit || chordSquared < candidates[0].chordSquared) {
        candidates.push({ point: node.point, chordSquared });
        candidates.sort((a, b) => b.chordSquared - a.chordSquared);
        if (candidates.length > limit) candidates.shift();
      }

      const delta = target[node.axis] - node.point.vector[node.axis];
      const near = delta <= 0 ? node.left : node.right;
      const far = delta <= 0 ? node.right : node.left;
      visit(near);
      const worst =
        candidates.length < limit ? Number.POSITIVE_INFINITY : candidates[0].chordSquared;
      if (delta * delta <= worst) visit(far);
    };

    visit(this.root);
    return candidates
      .map(({ point: candidate }) => {
        const distanceKm = distanceKilometers(point, candidate);
        return {
          entityType: this.entityType,
          entity: candidate.record,
          distanceKm: Number(distanceKm.toFixed(3)),
          confidence: confidence(this.entityType, distanceKm),
          confidenceBasis: 'center-distance' as const,
        };
      })
      .filter((match) => match.distanceKm <= maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

type SpatialRecord = CoordinateRecord & {
  iso2?: string;
  countryCode?: string;
};

type SpatialSources = Record<
  NearestEntityType,
  readonly SpatialRecord[] | (() => readonly SpatialRecord[])
>;

export class CenterReverseGeocoder {
  private readonly indexes = new Map<string, NearestCenterIndex<SpatialRecord>>();

  constructor(
    private readonly sources: SpatialSources,
    private readonly dataVersion: string
  ) {}

  private records(entityType: NearestEntityType, countryCode?: string): readonly SpatialRecord[] {
    const source = this.sources[entityType];
    const records = typeof source === 'function' ? source() : source;
    if (!countryCode) return records;
    const normalizedCode = countryCode.toUpperCase();
    return records.filter(
      (record) =>
        record.iso2?.toUpperCase() === normalizedCode ||
        record.countryCode?.toUpperCase() === normalizedCode
    );
  }

  nearest(point: CoordinatePoint, options: NearestCenterOptions = {}): NearestCenterResult {
    assertCoordinate(point);
    const entityTypes = [
      ...new Set(options.entityTypes || (['country', 'state', 'city'] as NearestEntityType[])),
    ];
    const limitPerType = options.limitPerType ?? 1;
    const maxDistanceKm = options.maxDistanceKm ?? Number.POSITIVE_INFINITY;
    const countryCode = options.countryCode?.toUpperCase();
    const results = entityTypes.flatMap((entityType) => {
      const key = `${entityType}:${countryCode || '*'}`;
      let index = this.indexes.get(key);
      if (!index) {
        index = new NearestCenterIndex(this.records(entityType, countryCode), entityType);
        this.indexes.set(key, index);
      }
      return index.nearest(point, limitPerType, maxDistanceKm);
    });
    return {
      query: point,
      dataVersion: this.dataVersion,
      results: results.sort((a, b) => a.distanceKm - b.distanceKm) as NearestCenterMatch[],
    };
  }

  nearestBatch(points: readonly CoordinatePoint[], options: NearestCenterOptions = {}) {
    if (points.length > 10_000) throw new RangeError('A batch may contain at most 10,000 points.');
    return points.map((point) => this.nearest(point, options));
  }
}

function pointOnSegment(point: [number, number], start: number[], end: number[], epsilon = 1e-10) {
  const cross =
    (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > epsilon) return false;
  const dot =
    (point[0] - start[0]) * (end[0] - start[0]) + (point[1] - start[1]) * (end[1] - start[1]);
  if (dot < -epsilon) return false;
  const squaredLength = (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2;
  if (squaredLength <= epsilon) {
    return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2 <= epsilon;
  }
  return dot <= squaredLength + epsilon;
}

function pointInRing(
  point: [number, number],
  ring: number[][]
): { inside: boolean; boundary: boolean } {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (pointOnSegment(point, previousPoint, currentPoint)) return { inside: true, boundary: true };
    const intersects =
      currentPoint[1] > point[1] !== previousPoint[1] > point[1] &&
      point[0] <
        ((previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0];
    if (intersects) inside = !inside;
  }
  return { inside, boundary: false };
}

function pointInPolygon(
  point: [number, number],
  polygon: number[][][]
): { inside: boolean; boundary: boolean } {
  const outer = pointInRing(point, polygon[0] || []);
  if (!outer.inside) return outer;
  if (outer.boundary) return outer;
  for (const hole of polygon.slice(1)) {
    const result = pointInRing(point, hole);
    if (result.boundary) return { inside: true, boundary: true };
    if (result.inside) return { inside: false, boundary: false };
  }
  return { inside: true, boundary: false };
}

function pointInFeature(point: [number, number], feature: GeoJsonFeature) {
  if (!feature.geometry) return { inside: false, boundary: false };
  const polygons =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][]);
  let boundary = false;
  for (const polygon of polygons) {
    const result = pointInPolygon(point, polygon);
    if (result.inside) return result;
    boundary ||= result.boundary;
  }
  return { inside: false, boundary };
}

function geometryBounds(feature: GeoJsonFeature): [number, number, number, number] | null {
  if (!feature.geometry) return null;
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      west = Math.min(west, value[0]);
      south = Math.min(south, value[1]);
      east = Math.max(east, value[0]);
      north = Math.max(north, value[1]);
      return;
    }
    value.forEach(visit);
  };
  visit(feature.geometry.coordinates);
  return Number.isFinite(west) ? [west, south, east, north] : null;
}

export class PolygonLookupIndex<Properties extends Record<string, unknown>> {
  private readonly entries: Array<{
    feature: GeoJsonFeature<Properties>;
    bounds: [number, number, number, number];
  }>;

  constructor(collection: GeoJsonFeatureCollection<Properties>) {
    this.entries = collection.features.flatMap((feature) => {
      const bounds = geometryBounds(feature);
      return bounds ? [{ feature, bounds }] : [];
    });
  }

  locate(point: CoordinatePoint): PolygonLookupResult<Properties> {
    assertCoordinate(point);
    const coordinate: [number, number] = [point.longitude, point.latitude];
    const matches = this.entries.flatMap(({ feature, bounds }) => {
      if (
        coordinate[0] < bounds[0] ||
        coordinate[0] > bounds[2] ||
        coordinate[1] < bounds[1] ||
        coordinate[1] > bounds[3]
      ) {
        return [];
      }
      const result = pointInFeature(coordinate, feature);
      return result.inside ? [{ properties: feature.properties, boundary: result.boundary }] : [];
    });
    return {
      query: point,
      matches,
      confidence:
        matches.length === 1 && !matches[0].boundary
          ? 'exact'
          : matches.length
            ? 'boundary-or-overlap'
            : 'none',
      method: 'point-in-polygon',
    };
  }
}

export function locatePointInPolygons<Properties extends Record<string, unknown>>(
  point: CoordinatePoint,
  collection: GeoJsonFeatureCollection<Properties>
): PolygonLookupResult<Properties> {
  return new PolygonLookupIndex(collection).locate(point);
}
