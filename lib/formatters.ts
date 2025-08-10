import { Country, State, City } from '@/types';

// CSV formatter
export function toCSV<T extends Record<string, any>>(data: T[], headers?: string[]): string {
  if (data.length === 0) return '';
  
  const keys = headers || Object.keys(data[0]);
  const csvHeaders = keys.join(',');
  
  const csvRows = data.map(item => 
    keys.map(key => {
      const value = item[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

// XML formatter
export function toXML<T extends Record<string, any>>(data: T[], rootElement: string = 'data', itemElement: string = 'item'): string {
  const xmlItems = data.map(item => {
    const xmlFields = Object.entries(item)
      .map(([key, value]) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
          return `<${key}>${JSON.stringify(value)}</${key}>`;
        }
        return `<${key}>${String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${key}>`;
      })
      .filter(Boolean)
      .join('');
    
    return `  <${itemElement}>${xmlFields}</${itemElement}>`;
  }).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n${xmlItems}\n</${rootElement}>`;
}

// YAML formatter
export function toYAML<T extends Record<string, any>>(data: T[]): string {
  const yamlItems = data.map(item => {
    const yamlFields = Object.entries(item)
      .map(([key, value]) => {
        if (value === null || value === undefined) return `  ${key}: null`;
        if (typeof value === 'object') {
          return `  ${key}: ${JSON.stringify(value)}`;
        }
        if (typeof value === 'string') {
          if (value.includes('\n') || value.includes(':') || value.includes('"')) {
            return `  ${key}: "${value.replace(/"/g, '\\"')}"`;
          }
          return `  ${key}: ${value}`;
        }
        return `  ${key}: ${value}`;
      })
      .join('\n');
    
    return `- \n${yamlFields}`;
  }).join('\n');
  
  return yamlItems;
}

// Export functions with specific data types
export const formatCountries = {
  csv: (countries: Country[]) => toCSV(countries),
  xml: (countries: Country[]) => toXML(countries, 'countries', 'country'),
  yaml: (countries: Country[]) => toYAML(countries),
  json: (countries: Country[]) => JSON.stringify(countries, null, 2)
};

export const formatStates = {
  csv: (states: State[]) => toCSV(states),
  xml: (states: State[]) => toXML(states, 'states', 'state'),
  yaml: (states: State[]) => toYAML(states),
  json: (states: State[]) => JSON.stringify(states, null, 2)
};

export const formatCities = {
  csv: (cities: City[]) => toCSV(cities),
  xml: (cities: City[]) => toXML(cities, 'cities', 'city'),
  yaml: (cities: City[]) => toYAML(cities),
  json: (cities: City[]) => JSON.stringify(cities, null, 2)
};