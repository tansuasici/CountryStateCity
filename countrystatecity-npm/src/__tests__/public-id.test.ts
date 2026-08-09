import { describe, expect, it } from 'vitest';
import { parsePublicId, toPublicId } from '../public-id';

describe('immutable public IDs', () => {
  it('creates and parses namespaced IDs without treating them as source IDs', () => {
    expect(toPublicId('city', 11)).toBe('csc:city:11');
    expect(parsePublicId('csc:city:11')).toEqual({ entity: 'city', legacyNumericId: 11 });
    expect(toPublicId('district', 107956)).toBe('csc:district:107956');
    expect(parsePublicId('csc:district:107956')).toEqual({
      entity: 'district',
      legacyNumericId: 107956,
    });
  });

  it('rejects malformed and unsafe IDs', () => {
    expect(parsePublicId('city:11')).toBeNull();
    expect(parsePublicId('csc:city:01')).toBeNull();
    expect(() => toPublicId('state', -1)).toThrow(TypeError);
  });
});
