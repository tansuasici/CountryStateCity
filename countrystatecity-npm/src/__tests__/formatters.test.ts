import { describe, it, expect } from 'vitest';
import { DataFormatter } from '../formatters';

// Small sample dataset for formatter tests
const sampleData = [
  {
    id: 1,
    name: 'United States',
    iso2: 'US',
    iso3: 'USA',
    region: 'Americas',
    capital: 'Washington',
    population: 331000000,
  },
  {
    id: 2,
    name: 'Germany',
    iso2: 'DE',
    iso3: 'DEU',
    region: 'Europe',
    capital: 'Berlin',
    population: 83000000,
  },
  {
    id: 3,
    name: 'Turkey',
    iso2: 'TR',
    iso3: 'TUR',
    region: 'Asia',
    capital: 'Ankara',
    population: 84000000,
  },
];

describe('DataFormatter', () => {
  // ----------------------------------------------------------------
  // JSON format
  // ----------------------------------------------------------------
  describe('format - json', () => {
    it('should return valid JSON output', () => {
      const result = DataFormatter.format(sampleData, 'json');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
    });

    it('should return minified JSON by default', () => {
      const result = DataFormatter.format(sampleData, 'json');
      expect(result).not.toContain('\n');
    });

    it('should return pretty-printed JSON with pretty option', () => {
      const result = DataFormatter.format(sampleData, 'json', undefined, {
        pretty: true,
      });
      expect(result).toContain('\n');
      expect(result).toContain('  ');
      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(3);
    });

    it('should preserve all data fields', () => {
      const result = DataFormatter.format(sampleData, 'json');
      const parsed = JSON.parse(result);
      expect(parsed[0].name).toBe('United States');
      expect(parsed[1].iso2).toBe('DE');
      expect(parsed[2].capital).toBe('Ankara');
    });

    it('should handle empty array', () => {
      const result = DataFormatter.format([], 'json');
      expect(JSON.parse(result)).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // CSV format
  // ----------------------------------------------------------------
  describe('format - csv', () => {
    it('should return a string with header row', () => {
      const result = DataFormatter.format(sampleData, 'csv');
      const lines = result.split('\n');
      expect(lines.length).toBe(4); // 1 header + 3 data rows
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
    });

    it('should use comma as default delimiter', () => {
      const result = DataFormatter.format(sampleData, 'csv');
      const headerLine = result.split('\n')[0];
      expect(headerLine.split(',').length).toBeGreaterThan(1);
    });

    it('should support custom delimiter', () => {
      const result = DataFormatter.format(sampleData, 'csv', undefined, {
        delimiter: ';',
      });
      const headerLine = result.split('\n')[0];
      expect(headerLine).toContain(';');
      expect(headerLine.split(';').length).toBeGreaterThan(1);
    });

    it('should support disabling headers', () => {
      const result = DataFormatter.format(sampleData, 'csv', undefined, {
        headers: false,
      });
      const lines = result.split('\n');
      // Without headers, first line should be data (starts with a number)
      expect(lines.length).toBe(3); // 3 data rows only
    });

    it('should handle values containing the delimiter', () => {
      const dataWithComma = [{ id: 1, name: 'City, State', code: 'CS' }];
      const result = DataFormatter.format(dataWithComma, 'csv');
      // The value with comma should be quoted
      expect(result).toContain('"City, State"');
    });

    it('should handle values containing quotes', () => {
      const dataWithQuotes = [{ id: 1, name: 'He said "hello"', code: 'HS' }];
      const result = DataFormatter.format(dataWithQuotes, 'csv');
      // Quotes should be escaped as double quotes
      expect(result).toContain('""hello""');
    });

    it('should return empty string for empty array', () => {
      const result = DataFormatter.format([], 'csv');
      expect(result).toBe('');
    });
  });

  // ----------------------------------------------------------------
  // XML format
  // ----------------------------------------------------------------
  describe('format - xml', () => {
    it('should return valid XML structure', () => {
      const result = DataFormatter.format(sampleData, 'xml', {
        rootName: 'countries',
        itemName: 'country',
      });
      expect(result).toContain('<countries>');
      expect(result).toContain('</countries>');
      expect(result).toContain('<country>');
      expect(result).toContain('</country>');
    });

    it('should contain data values', () => {
      const result = DataFormatter.format(sampleData, 'xml', {
        rootName: 'countries',
        itemName: 'country',
      });
      expect(result).toContain('<name>United States</name>');
      expect(result).toContain('<iso2>DE</iso2>');
      expect(result).toContain('<capital>Ankara</capital>');
    });

    it('should use default root and item names when metadata not provided', () => {
      const result = DataFormatter.format(sampleData, 'xml');
      expect(result).toContain('<data>');
      expect(result).toContain('<item>');
    });

    it('should support pretty option (indentation)', () => {
      const pretty = DataFormatter.format(
        sampleData,
        'xml',
        {
          rootName: 'countries',
          itemName: 'country',
        },
        { pretty: true }
      );
      // Pretty XML should have line breaks and indentation
      expect(pretty).toContain('\n');

      const compact = DataFormatter.format(
        sampleData,
        'xml',
        {
          rootName: 'countries',
          itemName: 'country',
        },
        { pretty: false }
      );
      // Compact should not have indentation
      expect(compact.split('\n').length).toBeLessThan(pretty.split('\n').length);
    });

    it('should handle objects with nested data by stringifying them', () => {
      const dataWithNested = [{ id: 1, name: 'Test', details: { a: 1, b: 2 } }];
      const result = DataFormatter.format(dataWithNested, 'xml', {
        rootName: 'items',
        itemName: 'item',
      });
      // Nested objects should be stringified
      expect(result).toContain('<details>');
    });
  });

  // ----------------------------------------------------------------
  // YAML format
  // ----------------------------------------------------------------
  describe('format - yaml', () => {
    it('should return valid YAML output', () => {
      const result = DataFormatter.format(sampleData, 'yaml');
      expect(typeof result).toBe('string');
      expect(result).toContain('name:');
      expect(result).toContain('iso2:');
    });

    it('should contain all data values', () => {
      const result = DataFormatter.format(sampleData, 'yaml');
      expect(result).toContain('United States');
      expect(result).toContain('Germany');
      expect(result).toContain('Turkey');
    });

    it('should use list format (entries start with -)', () => {
      const result = DataFormatter.format(sampleData, 'yaml');
      expect(result).toContain('- id:');
    });

    it('should support pretty option', () => {
      const pretty = DataFormatter.format(sampleData, 'yaml', undefined, {
        pretty: true,
      });
      expect(pretty).toContain('  ');
    });

    it('should handle empty array', () => {
      const result = DataFormatter.format([], 'yaml');
      expect(result.trim()).toBe('[]\n'.trim());
    });
  });

  // ----------------------------------------------------------------
  // Unsupported format
  // ----------------------------------------------------------------
  describe('format - unsupported', () => {
    it('should throw for an unsupported format', () => {
      expect(() => {
        DataFormatter.format(sampleData, 'tsv' as any);
      }).toThrow('Unsupported format');
    });
  });

  // ----------------------------------------------------------------
  // Static method direct access
  // ----------------------------------------------------------------
  describe('toCSV static method', () => {
    it('should produce CSV output directly', () => {
      const result = DataFormatter.toCSV(sampleData);
      expect(result.split('\n').length).toBe(4);
    });
  });

  describe('toXML static method', () => {
    it('should produce XML output directly', () => {
      const result = DataFormatter.toXML(sampleData, 'items', 'item');
      expect(result).toContain('<items>');
      expect(result).toContain('<item>');
    });
  });

  describe('toYAML static method', () => {
    it('should produce YAML output directly', () => {
      const result = DataFormatter.toYAML(sampleData);
      expect(result).toContain('- id:');
    });
  });
});
