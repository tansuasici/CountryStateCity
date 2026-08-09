export type LocationEntity = 'country' | 'state' | 'city' | 'district';

export interface ParsedPublicId {
  entity: LocationEntity;
  legacyNumericId: number;
}

const PUBLIC_ID_PATTERN = /^csc:(country|state|city|district):(0|[1-9]\d*)$/;

export function toPublicId(entity: LocationEntity, legacyNumericId: number): string {
  if (!Number.isSafeInteger(legacyNumericId) || legacyNumericId < 0) {
    throw new TypeError(`Invalid legacy numeric ID: ${legacyNumericId}`);
  }
  return `csc:${entity}:${legacyNumericId}`;
}

export function parsePublicId(publicId: string): ParsedPublicId | null {
  const match = PUBLIC_ID_PATTERN.exec(publicId);
  if (!match) return null;
  const legacyNumericId = Number(match[2]);
  if (!Number.isSafeInteger(legacyNumericId)) return null;
  return { entity: match[1] as LocationEntity, legacyNumericId };
}
