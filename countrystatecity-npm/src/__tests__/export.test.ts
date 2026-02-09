import { describe, it, expect, afterAll } from 'vitest';
import { CountryStateCity } from '../index';
import { DataExporter } from '../streaming';
import { Readable, Transform } from 'stream';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

// Helper: collect a readable stream into a string
function streamToString(stream: Readable | Transform): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

// Helper: collect a readable/transform stream into a buffer
function streamToBuffer(stream: Readable | Transform): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Track temp files for cleanup
const tempFiles: string[] = [];

afterAll(() => {
  for (const f of tempFiles) {
    try {
      if (existsSync(f)) unlinkSync(f);
    } catch {
      // best effort cleanup
    }
  }
});

function tempFilePath(ext: string): string {
  const p = join(tmpdir(), `csc-test-${randomUUID()}.${ext}`);
  tempFiles.push(p);
  return p;
}

describe('Export and Filtered Export', () => {
  // ----------------------------------------------------------------
  // exportFiltered - countries
  // ----------------------------------------------------------------
  describe('exportFiltered - countries', () => {
    it('should filter countries by region', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        region: 'Europe',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThan(30);
      for (const c of parsed) {
        expect(c.region.toLowerCase()).toBe('europe');
      }
    });

    it('should filter countries by countryCode', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        countryCode: 'TR',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(1);
      expect(parsed[0].iso2).toBe('TR');
      expect(parsed[0].name).toBe('Turkey');
    });

    it('should filter countries by countryId', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        countryId: 1,
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(1);
      expect(parsed[0].name).toBe('Afghanistan');
    });

    it('should filter countries by countryIds', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        countryIds: [1, 233],
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(2);
      const names = parsed.map((c: any) => c.name);
      expect(names).toContain('Afghanistan');
      expect(names).toContain('United States');
    });

    it('should filter countries by subregion', () => {
      const result = CountryStateCity.exportFiltered('countries', 'json', {
        subregion: 'Northern America',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThanOrEqual(2);
      for (const c of parsed) {
        expect(c.subregion.toLowerCase()).toBe('northern america');
      }
    });
  });

  // ----------------------------------------------------------------
  // exportFiltered - states
  // ----------------------------------------------------------------
  describe('exportFiltered - states', () => {
    it('should filter states by countryId', () => {
      const result = CountryStateCity.exportFiltered('states', 'json', {
        countryId: 233,
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThanOrEqual(50);
      for (const s of parsed) {
        expect(s.countryId).toBe(233);
      }
    });

    it('should filter states by countryCode', () => {
      const result = CountryStateCity.exportFiltered('states', 'json', {
        countryCode: 'TR',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThan(50);
      for (const s of parsed) {
        expect(s.countryCode).toBe('TR');
      }
    });

    it('should filter states by stateId', () => {
      // Get a known state first
      const allStates = CountryStateCity.getAllStates() as any[];
      const targetState = allStates[0];
      const result = CountryStateCity.exportFiltered('states', 'json', {
        stateId: targetState.id,
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(1);
      expect(parsed[0].id).toBe(targetState.id);
    });

    it('should filter states by region', () => {
      const result = CountryStateCity.exportFiltered('states', 'json', {
        region: 'Europe',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThan(100);
      // Verify all states belong to European countries
      const europeanCountries = CountryStateCity.getCountriesByRegion('Europe');
      const europeanCountryIds = new Set(europeanCountries.map((c) => c.id));
      for (const s of parsed) {
        expect(europeanCountryIds.has(s.countryId)).toBe(true);
      }
    });

    it('should return states in CSV format', () => {
      const result = CountryStateCity.exportFiltered('states', 'csv', {
        countryCode: 'US',
      });
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(50);
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
    });
  });

  // ----------------------------------------------------------------
  // exportFiltered - cities
  // ----------------------------------------------------------------
  describe('exportFiltered - cities', () => {
    it('should filter cities by countryId', () => {
      const result = CountryStateCity.exportFiltered('cities', 'json', {
        countryId: 225,
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThan(100);
      for (const c of parsed.slice(0, 50)) {
        expect(c.countryId).toBe(225);
      }
    });

    it('should filter cities by countryCode', () => {
      const result = CountryStateCity.exportFiltered('cities', 'json', {
        countryCode: 'DE',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThan(100);
      for (const c of parsed.slice(0, 50)) {
        expect(c.countryCode).toBe('DE');
      }
    });

    it('should filter cities by stateId', () => {
      // Get a state with cities
      const usCities = CountryStateCity.getCitiesByCountryId(233) as any[];
      const stateId = usCities[0].stateId;
      const result = CountryStateCity.exportFiltered('cities', 'json', {
        stateId,
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThan(0);
      for (const c of parsed) {
        expect(c.stateId).toBe(stateId);
      }
    });

    it('should filter cities by region', () => {
      const result = CountryStateCity.exportFiltered('cities', 'json', {
        region: 'Oceania',
      });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBeGreaterThan(0);
      // Verify all cities belong to Oceanian countries
      const oceanianCountries = CountryStateCity.getCountriesByRegion('Oceania');
      const countryIds = new Set(oceanianCountries.map((c) => c.id));
      for (const c of parsed.slice(0, 50)) {
        expect(countryIds.has(c.countryId)).toBe(true);
      }
    });
  });
});

describe('DataExporter Streaming', () => {
  // ----------------------------------------------------------------
  // streamJsonLines
  // ----------------------------------------------------------------
  describe('streamJsonLines', () => {
    it('should return a readable stream', () => {
      const stream = DataExporter.streamJsonLines('countries');
      expect(stream).toBeInstanceOf(Readable);
      stream.destroy();
    });

    it('should output valid JSON lines for countries', async () => {
      const stream = DataExporter.streamJsonLines('countries');
      const content = await streamToString(stream);
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(200);

      // Each line should be valid JSON
      for (const line of lines.slice(0, 10)) {
        const obj = JSON.parse(line);
        expect(obj).toHaveProperty('id');
        expect(obj).toHaveProperty('name');
      }
    });

    it('should output valid JSON lines for states', async () => {
      const stream = DataExporter.streamJsonLines('states');
      const content = await streamToString(stream);
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(4000);

      const first = JSON.parse(lines[0]);
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('countryId');
    });

    it('should support filter parameter', async () => {
      const stream = DataExporter.streamJsonLines('countries', {
        region: 'Europe',
      });
      const content = await streamToString(stream);
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(30);
      expect(lines.length).toBeLessThan(200);

      for (const line of lines.slice(0, 10)) {
        const obj = JSON.parse(line);
        expect(obj.region.toLowerCase()).toBe('europe');
      }
    });
  });

  // ----------------------------------------------------------------
  // streamCSV
  // ----------------------------------------------------------------
  describe('streamCSV', () => {
    it('should return a readable stream', () => {
      const stream = DataExporter.streamCSV('countries');
      expect(stream).toBeInstanceOf(Readable);
      stream.destroy();
    });

    it('should output CSV data with headers for countries', async () => {
      const stream = DataExporter.streamCSV('countries');
      const content = await streamToString(stream);
      const lines = content.trim().split('\n');

      // First line should be headers
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
      // Data rows
      expect(lines.length).toBeGreaterThan(200);
    });

    it('should support filter parameter', async () => {
      const stream = DataExporter.streamCSV('states', {
        countryCode: 'US',
      });
      const content = await streamToString(stream);
      const lines = content.trim().split('\n');
      // Header + US states
      expect(lines.length).toBeGreaterThan(50);
    });

    it('should support custom delimiter', async () => {
      const stream = DataExporter.streamCSV('countries', undefined, {
        delimiter: ';',
      });
      const content = await streamToString(stream);
      const firstLine = content.split('\n')[0];
      expect(firstLine).toContain(';');
    });

    it('should support disabling headers', async () => {
      const withHeaders = DataExporter.streamCSV('countries', undefined, {
        headers: true,
      });
      const withoutHeaders = DataExporter.streamCSV('countries', undefined, {
        headers: false,
      });

      const contentWith = await streamToString(withHeaders);
      const contentWithout = await streamToString(withoutHeaders);

      const linesWith = contentWith.trim().split('\n');
      const linesWithout = contentWithout.trim().split('\n');
      // Without headers should have one fewer line
      expect(linesWithout.length).toBe(linesWith.length - 1);
    });
  });

  // ----------------------------------------------------------------
  // compress
  // ----------------------------------------------------------------
  describe('compress', () => {
    it('should return a Transform stream (gzip)', () => {
      const source = DataExporter.streamJsonLines('countries', {
        countryCode: 'US',
      });
      const compressed = DataExporter.compress(source);
      expect(compressed).toBeInstanceOf(Transform);
      compressed.destroy();
      source.destroy();
    });

    it('should produce gzip data that is smaller than the original', async () => {
      // Use a small filtered set for speed
      const sourceForOriginal = DataExporter.streamJsonLines('countries', {
        region: 'Europe',
      });
      const original = await streamToString(sourceForOriginal);

      const sourceForCompressed = DataExporter.streamJsonLines('countries', {
        region: 'Europe',
      });
      const compressed = DataExporter.compress(sourceForCompressed);
      const compressedBuf = await streamToBuffer(compressed);

      expect(compressedBuf.length).toBeLessThan(Buffer.byteLength(original, 'utf-8'));
    });

    it('compressed data should start with gzip magic bytes', async () => {
      const source = DataExporter.streamJsonLines('countries', {
        countryCode: 'US',
      });
      const compressed = DataExporter.compress(source);
      const buf = await streamToBuffer(compressed);

      // Gzip magic bytes: 0x1f 0x8b
      expect(buf[0]).toBe(0x1f);
      expect(buf[1]).toBe(0x8b);
    });
  });

  // ----------------------------------------------------------------
  // exportToFile
  // ----------------------------------------------------------------
  describe('exportToFile', () => {
    it('should write a JSON file', async () => {
      const filePath = tempFilePath('json');
      await DataExporter.exportToFile('countries', 'json', filePath, {
        filter: { region: 'Europe' },
      });
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(30);
    });

    it('should write a JSON Lines file', async () => {
      const filePath = tempFilePath('jsonl');
      await DataExporter.exportToFile('countries', 'jsonl', filePath, {
        filter: { region: 'Asia' },
      });
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(30);
      // Each line should be valid JSON
      const first = JSON.parse(lines[0]);
      expect(first).toHaveProperty('name');
    });

    it('should write a CSV file', async () => {
      const filePath = tempFilePath('csv');
      await DataExporter.exportToFile('states', 'csv', filePath, {
        filter: { countryCode: 'US' },
      });
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(50);
      expect(lines[0]).toContain('id');
    });

    it('should write an XML file', async () => {
      const filePath = tempFilePath('xml');
      await DataExporter.exportToFile('countries', 'xml', filePath, {
        filter: { countryCode: 'DE' },
      });
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('<countries>');
      expect(content).toContain('Germany');
    });

    it('should write a YAML file', async () => {
      const filePath = tempFilePath('yaml');
      await DataExporter.exportToFile('countries', 'yaml', filePath, {
        filter: { countryCode: 'TR' },
      });
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('name:');
      expect(content).toContain('Turkey');
    });

    it('should write a gzip-compressed file', async () => {
      const filePath = tempFilePath('json.gz');
      await DataExporter.exportToFile('countries', 'json', filePath, {
        filter: { region: 'Europe' },
        gzip: true,
      });
      expect(existsSync(filePath)).toBe(true);
      const buf = readFileSync(filePath);
      // Gzip magic bytes
      expect(buf[0]).toBe(0x1f);
      expect(buf[1]).toBe(0x8b);
      // Compressed should be smaller than uncompressed
      const uncompressed = CountryStateCity.exportFiltered('countries', 'json', {
        region: 'Europe',
      });
      expect(buf.length).toBeLessThan(Buffer.byteLength(uncompressed, 'utf-8'));
    });

    it('should write all countries without filter', async () => {
      const filePath = tempFilePath('json');
      await DataExporter.exportToFile('countries', 'json', filePath);
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.length).toBeGreaterThan(200);
    });

    it('should support formatOptions for CSV', async () => {
      const filePath = tempFilePath('csv');
      await DataExporter.exportToFile('countries', 'csv', filePath, {
        filter: { region: 'Europe' },
        formatOptions: { delimiter: '|', headers: true },
      });
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      const firstLine = content.split('\n')[0];
      expect(firstLine).toContain('|');
    });
  });
});
