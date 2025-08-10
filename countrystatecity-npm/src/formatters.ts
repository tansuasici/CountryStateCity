import * as yaml from 'js-yaml';
import * as convert from 'xml-js';
import { Country, State, City, DataFormat, FormatOptions } from './types';

export class DataFormatter {
  static toCSV<T extends Record<string, any>>(
    data: T[],
    options: FormatOptions = {}
  ): string {
    const { delimiter = ',', headers = true } = options;
    
    if (!data || data.length === 0) return '';
    
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (typeof item[key] !== 'object' || item[key] === null) {
          allKeys.add(key);
        }
      });
    });
    
    const keys = Array.from(allKeys);
    const lines: string[] = [];
    
    if (headers) {
      lines.push(keys.join(delimiter));
    }
    
    data.forEach(item => {
      const values = keys.map(key => {
        const value = item[key];
        
        if (value === null || value === undefined) return '';
        
        if (typeof value === 'string') {
          if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        
        return String(value);
      });
      
      lines.push(values.join(delimiter));
    });
    
    return lines.join('\n');
  }
  
  static toXML<T extends Record<string, any>>(
    data: T[],
    rootName: string,
    itemName: string,
    options: FormatOptions = {}
  ): string {
    const { pretty = true } = options;
    
    const xmlObject = {
      [rootName]: {
        [itemName]: data.map(item => {
          const xmlItem: Record<string, any> = {};
          
          Object.keys(item).forEach(key => {
            const value = item[key];
            if (value !== null && value !== undefined) {
              if (typeof value === 'object') {
                xmlItem[key] = JSON.stringify(value);
              } else {
                xmlItem[key] = value;
              }
            }
          });
          
          return xmlItem;
        })
      }
    };
    
    const options2: convert.Options.JS2XML = {
      compact: true,
      ignoreComment: true,
      spaces: pretty ? 2 : 0
    };
    
    return convert.js2xml(xmlObject, options2);
  }
  
  static toYAML<T>(data: T[], options: FormatOptions = {}): string {
    const { pretty = true } = options;
    
    return yaml.dump(data, {
      indent: pretty ? 2 : 1,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
  }
  
  static format<T extends Record<string, any>>(
    data: T[],
    format: DataFormat,
    metadata?: {
      rootName?: string;
      itemName?: string;
    },
    options: FormatOptions = {}
  ): string {
    switch (format) {
      case 'json':
        return options.pretty 
          ? JSON.stringify(data, null, 2)
          : JSON.stringify(data);
          
      case 'csv':
        return this.toCSV(data, options);
        
      case 'xml':
        return this.toXML(
          data,
          metadata?.rootName || 'data',
          metadata?.itemName || 'item',
          options
        );
        
      case 'yaml':
        return this.toYAML(data, options);
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}