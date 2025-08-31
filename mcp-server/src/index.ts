#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import CountryStateCity from '@tansuasici/country-state-city';

const server = new Server(
  {
    name: 'country-state-city-mcp',
    version: '1.0.0',
    description: 'MCP server for comprehensive location data access'
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
  }
);

// ============= TOOL DEFINITIONS =============
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ========== COUNTRY METHODS ==========
    {
      name: 'getAllCountries',
      description: 'Get all countries with optional format (json, csv, xml, yaml)',
      inputSchema: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xml', 'yaml'],
            description: 'Output format (default: json)'
          }
        }
      }
    },
    {
      name: 'getCountryById',
      description: 'Get a country by its ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Country ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'getCountryByIso2',
      description: 'Get a country by its ISO2 code (e.g., US, TR)',
      inputSchema: {
        type: 'object',
        properties: {
          iso2: { type: 'string', description: 'ISO2 country code' }
        },
        required: ['iso2']
      }
    },
    {
      name: 'getCountryByIso3',
      description: 'Get a country by its ISO3 code (e.g., USA, TUR)',
      inputSchema: {
        type: 'object',
        properties: {
          iso3: { type: 'string', description: 'ISO3 country code' }
        },
        required: ['iso3']
      }
    },
    {
      name: 'searchCountries',
      description: 'Search countries by name or native name',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    },
    {
      name: 'getCountriesByRegion',
      description: 'Get all countries in a specific region',
      inputSchema: {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'Region name (e.g., Europe, Asia)' }
        },
        required: ['region']
      }
    },
    {
      name: 'getCountriesBySubregion',
      description: 'Get all countries in a specific subregion',
      inputSchema: {
        type: 'object',
        properties: {
          subregion: { type: 'string', description: 'Subregion name (e.g., Western Europe)' }
        },
        required: ['subregion']
      }
    },

    // ========== STATE METHODS ==========
    {
      name: 'getAllStates',
      description: 'Get all states/provinces with optional format',
      inputSchema: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xml', 'yaml'],
            description: 'Output format (default: json)'
          }
        }
      }
    },
    {
      name: 'getStateById',
      description: 'Get a state/province by its ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'State ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'getStatesByCountryId',
      description: 'Get all states/provinces for a specific country',
      inputSchema: {
        type: 'object',
        properties: {
          countryId: { type: 'number', description: 'Country ID' },
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xml', 'yaml'],
            description: 'Output format (default: json)'
          }
        },
        required: ['countryId']
      }
    },
    {
      name: 'getStatesByCountryCode',
      description: 'Get all states/provinces for a country by its ISO code',
      inputSchema: {
        type: 'object',
        properties: {
          countryCode: { type: 'string', description: 'Country ISO2 or ISO3 code' },
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xml', 'yaml'],
            description: 'Output format (default: json)'
          }
        },
        required: ['countryCode']
      }
    },
    {
      name: 'searchStates',
      description: 'Search states/provinces by name',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          countryId: { type: 'number', description: 'Optional: limit to specific country' }
        },
        required: ['query']
      }
    },

    // ========== CITY METHODS ==========
    {
      name: 'getAllCities',
      description: 'Get all cities (WARNING: Large dataset, will return first 1000)',
      inputSchema: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xml', 'yaml'],
            description: 'Output format (default: json)'
          },
          limit: {
            type: 'number',
            description: 'Limit number of cities (default: 1000, max: 10000)'
          }
        }
      }
    },
    {
      name: 'getCityById',
      description: 'Get a city by its ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'City ID' }
        },
        required: ['id']
      }
    },
    {
      name: 'getCitiesByStateId',
      description: 'Get all cities in a specific state/province',
      inputSchema: {
        type: 'object',
        properties: {
          stateId: { type: 'number', description: 'State ID' },
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xml', 'yaml'],
            description: 'Output format (default: json)'
          }
        },
        required: ['stateId']
      }
    },
    {
      name: 'getCitiesByCountryId',
      description: 'Get all cities in a specific country',
      inputSchema: {
        type: 'object',
        properties: {
          countryId: { type: 'number', description: 'Country ID' },
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xml', 'yaml'],
            description: 'Output format (default: json)'
          }
        },
        required: ['countryId']
      }
    },
    {
      name: 'searchCities',
      description: 'Search cities by name with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          stateId: { type: 'number', description: 'Optional: limit to specific state' },
          countryId: { type: 'number', description: 'Optional: limit to specific country' }
        },
        required: ['query']
      }
    },

    // ========== UTILITY METHODS ==========
    {
      name: 'getStats',
      description: 'Get statistics about the database',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'getAllRegions',
      description: 'Get all unique regions',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'getAllSubregions',
      description: 'Get all unique subregions',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'getAllTimezones',
      description: 'Get all unique timezones',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'getAllCurrencies',
      description: 'Get all unique currencies with their details',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'exportData',
      description: 'Export data in specific format',
      inputSchema: {
        type: 'object',
        properties: {
          dataType: { 
            type: 'string', 
            enum: ['countries', 'states', 'cities'],
            description: 'Type of data to export'
          },
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xml', 'yaml'],
            description: 'Export format'
          },
          countryId: {
            type: 'number',
            description: 'Optional: filter by country ID'
          },
          stateId: {
            type: 'number',
            description: 'Optional: filter by state ID (for cities)'
          }
        },
        required: ['dataType', 'format']
      }
    }
  ],
}));

// ============= TOOL IMPLEMENTATIONS =============
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as any;

  try {
    switch (name) {
      // ========== COUNTRY METHODS ==========
      case 'getAllCountries': {
        const result = args.format 
          ? CountryStateCity.getAllCountries(args.format)
          : CountryStateCity.getAllCountries();
        
        return {
          content: [{
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'getCountryById': {
        const country = CountryStateCity.getCountryById(args.id);
        if (!country) {
          return {
            content: [{
              type: 'text',
              text: `No country found with ID: ${args.id}`
            }]
          };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(country, null, 2)
          }]
        };
      }

      case 'getCountryByIso2': {
        const country = CountryStateCity.getCountryByIso2(args.iso2);
        if (!country) {
          return {
            content: [{
              type: 'text',
              text: `No country found with ISO2 code: ${args.iso2}`
            }]
          };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(country, null, 2)
          }]
        };
      }

      case 'getCountryByIso3': {
        const country = CountryStateCity.getCountryByIso3(args.iso3);
        if (!country) {
          return {
            content: [{
              type: 'text',
              text: `No country found with ISO3 code: ${args.iso3}`
            }]
          };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(country, null, 2)
          }]
        };
      }

      case 'searchCountries': {
        const countries = CountryStateCity.searchCountries(args.query);
        return {
          content: [{
            type: 'text',
            text: `Found ${countries.length} countries matching "${args.query}":\n${JSON.stringify(countries, null, 2)}`
          }]
        };
      }

      case 'getCountriesByRegion': {
        const countries = CountryStateCity.getCountriesByRegion(args.region);
        return {
          content: [{
            type: 'text',
            text: `Found ${countries.length} countries in ${args.region}:\n${JSON.stringify(countries, null, 2)}`
          }]
        };
      }

      case 'getCountriesBySubregion': {
        const countries = CountryStateCity.getCountriesBySubregion(args.subregion);
        return {
          content: [{
            type: 'text',
            text: `Found ${countries.length} countries in ${args.subregion}:\n${JSON.stringify(countries, null, 2)}`
          }]
        };
      }

      // ========== STATE METHODS ==========
      case 'getAllStates': {
        const result = args.format 
          ? CountryStateCity.getAllStates(args.format)
          : CountryStateCity.getAllStates();
        
        return {
          content: [{
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'getStateById': {
        const state = CountryStateCity.getStateById(args.id);
        if (!state) {
          return {
            content: [{
              type: 'text',
              text: `No state found with ID: ${args.id}`
            }]
          };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(state, null, 2)
          }]
        };
      }

      case 'getStatesByCountryId': {
        const result = args.format
          ? CountryStateCity.getStatesByCountryId(args.countryId, args.format)
          : CountryStateCity.getStatesByCountryId(args.countryId);
        
        if (typeof result === 'string') {
          return {
            content: [{
              type: 'text',
              text: result
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Found ${result.length} states/provinces:\n${JSON.stringify(result, null, 2)}`
          }]
        };
      }

      case 'getStatesByCountryCode': {
        const result = args.format
          ? CountryStateCity.getStatesByCountryCode(args.countryCode, args.format)
          : CountryStateCity.getStatesByCountryCode(args.countryCode);
        
        if (typeof result === 'string') {
          return {
            content: [{
              type: 'text',
              text: result
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Found ${result.length} states/provinces for ${args.countryCode}:\n${JSON.stringify(result, null, 2)}`
          }]
        };
      }

      case 'searchStates': {
        const states = CountryStateCity.searchStates(args.query, args.countryId);
        return {
          content: [{
            type: 'text',
            text: `Found ${states.length} states matching "${args.query}":\n${JSON.stringify(states, null, 2)}`
          }]
        };
      }

      // ========== CITY METHODS ==========
      case 'getAllCities': {
        const limit = Math.min(args.limit || 1000, 10000);
        const allCities = CountryStateCity.getAllCities();
        
        let result;
        if (args.format && args.format !== 'json') {
          // For non-JSON formats, let the library handle the conversion
          result = CountryStateCity.getAllCities(args.format);
          if (typeof result === 'string') {
            // Truncate string formats
            const lines = result.split('\n');
            result = lines.slice(0, limit).join('\n');
          }
        } else {
          // For JSON, manually limit
          result = allCities.slice(0, limit);
        }
        
        return {
          content: [{
            type: 'text',
            text: typeof result === 'string' 
              ? result 
              : `Showing first ${limit} of ${allCities.length} cities:\n${JSON.stringify(result, null, 2)}`
          }]
        };
      }

      case 'getCityById': {
        const city = CountryStateCity.getCityById(args.id);
        if (!city) {
          return {
            content: [{
              type: 'text',
              text: `No city found with ID: ${args.id}`
            }]
          };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(city, null, 2)
          }]
        };
      }

      case 'getCitiesByStateId': {
        const result = args.format
          ? CountryStateCity.getCitiesByStateId(args.stateId, args.format)
          : CountryStateCity.getCitiesByStateId(args.stateId);
        
        if (typeof result === 'string') {
          return {
            content: [{
              type: 'text',
              text: result
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Found ${result.length} cities in state ${args.stateId}:\n${JSON.stringify(result, null, 2)}`
          }]
        };
      }

      case 'getCitiesByCountryId': {
        const result = args.format
          ? CountryStateCity.getCitiesByCountryId(args.countryId, args.format)
          : CountryStateCity.getCitiesByCountryId(args.countryId);
        
        if (typeof result === 'string') {
          return {
            content: [{
              type: 'text',
              text: result
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `Found ${result.length} cities in country ${args.countryId}:\n${JSON.stringify(result.slice(0, 100), null, 2)}\n... and ${result.length - 100} more`
          }]
        };
      }

      case 'searchCities': {
        const cities = CountryStateCity.searchCities(args.query, args.stateId, args.countryId);
        const displayLimit = 50;
        const displayCities = cities.slice(0, displayLimit);
        
        let message = `Found ${cities.length} cities matching "${args.query}"`;
        if (args.stateId) message += ` in state ${args.stateId}`;
        if (args.countryId) message += ` in country ${args.countryId}`;
        
        if (cities.length > displayLimit) {
          message += `\n(Showing first ${displayLimit} results)`;
        }
        
        return {
          content: [{
            type: 'text',
            text: `${message}:\n${JSON.stringify(displayCities, null, 2)}`
          }]
        };
      }

      // ========== UTILITY METHODS ==========
      case 'getStats': {
        const stats = CountryStateCity.getStats();
        return {
          content: [{
            type: 'text',
            text: `Database Statistics:\n${JSON.stringify(stats, null, 2)}`
          }]
        };
      }

      case 'getAllRegions': {
        const regions = CountryStateCity.getAllRegions();
        return {
          content: [{
            type: 'text',
            text: `All Regions (${regions.length}):\n${JSON.stringify(regions, null, 2)}`
          }]
        };
      }

      case 'getAllSubregions': {
        const subregions = CountryStateCity.getAllSubregions();
        return {
          content: [{
            type: 'text',
            text: `All Subregions (${subregions.length}):\n${JSON.stringify(subregions, null, 2)}`
          }]
        };
      }

      case 'getAllTimezones': {
        const timezones = CountryStateCity.getAllTimezones();
        return {
          content: [{
            type: 'text',
            text: `All Timezones (${timezones.length}):\n${JSON.stringify(timezones, null, 2)}`
          }]
        };
      }

      case 'getAllCurrencies': {
        const currencies = CountryStateCity.getAllCurrencies();
        return {
          content: [{
            type: 'text',
            text: `All Currencies (${currencies.length}):\n${JSON.stringify(currencies, null, 2)}`
          }]
        };
      }

      case 'exportData': {
        let data;
        
        // Get filtered data based on parameters
        if (args.dataType === 'cities' && args.stateId) {
          data = CountryStateCity.getCitiesByStateId(args.stateId, args.format);
        } else if (args.dataType === 'cities' && args.countryId) {
          data = CountryStateCity.getCitiesByCountryId(args.countryId, args.format);
        } else if (args.dataType === 'states' && args.countryId) {
          data = CountryStateCity.getStatesByCountryId(args.countryId, args.format);
        } else {
          data = CountryStateCity.exportData(args.dataType, args.format);
        }
        
        return {
          content: [{
            type: 'text',
            text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error executing ${name}: ${(error as Error).message}`
      }]
    };
  }
});

// ============= RESOURCE HANDLERS =============
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'csc://countries/all',
      mimeType: 'application/json',
      name: 'All Countries Data',
      description: '250+ countries with complete information'
    },
    {
      uri: 'csc://states/all',
      mimeType: 'application/json',
      name: 'All States Data',
      description: '5,000+ states/provinces worldwide'
    },
    {
      uri: 'csc://cities/sample',
      mimeType: 'application/json',
      name: 'Sample Cities Data',
      description: 'First 1000 cities (full dataset is 150,000+)'
    },
    {
      uri: 'csc://statistics',
      mimeType: 'application/json',
      name: 'Database Statistics',
      description: 'Overview of available data'
    },
    {
      uri: 'csc://regions',
      mimeType: 'application/json',
      name: 'All Regions',
      description: 'List of all geographic regions'
    },
    {
      uri: 'csc://currencies',
      mimeType: 'application/json',
      name: 'All Currencies',
      description: 'Complete list of world currencies'
    },
    {
      uri: 'csc://timezones',
      mimeType: 'application/json',
      name: 'All Timezones',
      description: 'Complete list of timezones'
    }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params as any;
  
  try {
    switch (uri) {
      case 'csc://countries/all':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CountryStateCity.getAllCountries(), null, 2)
          }]
        };
      
      case 'csc://states/all':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CountryStateCity.getAllStates(), null, 2)
          }]
        };
      
      case 'csc://cities/sample':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CountryStateCity.getAllCities().slice(0, 1000), null, 2)
          }]
        };
      
      case 'csc://statistics':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CountryStateCity.getStats(), null, 2)
          }]
        };
      
      case 'csc://regions':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              regions: CountryStateCity.getAllRegions(),
              subregions: CountryStateCity.getAllSubregions()
            }, null, 2)
          }]
        };
      
      case 'csc://currencies':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CountryStateCity.getAllCurrencies(), null, 2)
          }]
        };
      
      case 'csc://timezones':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CountryStateCity.getAllTimezones(), null, 2)
          }]
        };
      
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    throw new Error(`Error reading resource ${uri}: ${(error as Error).message}`);
  }
});

// ============= PROMPTS =============
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'travel_planner',
      description: 'Plan a multi-country travel itinerary',
      arguments: [
        {
          name: 'countries',
          description: 'Comma-separated list of countries to visit',
          required: true
        },
        {
          name: 'interests',
          description: 'Travel interests (e.g., history, nature, food)',
          required: false
        }
      ]
    },
    {
      name: 'location_comparison',
      description: 'Compare multiple locations',
      arguments: [
        {
          name: 'locations',
          description: 'Comma-separated list of cities or countries',
          required: true
        },
        {
          name: 'criteria',
          description: 'Comparison criteria (e.g., size, timezone, region)',
          required: false
        }
      ]
    },
    {
      name: 'geography_quiz',
      description: 'Generate a geography quiz',
      arguments: [
        {
          name: 'difficulty',
          description: 'Quiz difficulty (easy, medium, hard)',
          required: false
        },
        {
          name: 'region',
          description: 'Specific region to focus on',
          required: false
        }
      ]
    },
    {
      name: 'data_export',
      description: 'Export location data in specific format',
      arguments: [
        {
          name: 'type',
          description: 'Data type (countries, states, cities)',
          required: true
        },
        {
          name: 'format',
          description: 'Export format (json, csv, xml, yaml)',
          required: true
        },
        {
          name: 'filter',
          description: 'Optional filter (e.g., region=Europe)',
          required: false
        }
      ]
    }
  ]
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as any;
  
  switch (name) {
    case 'travel_planner':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to plan a trip visiting these countries: ${args.countries}. ${args.interests ? `My interests include: ${args.interests}.` : ''} Please help me create an itinerary including major cities, suggested duration in each location, and key attractions.`
            }
          }
        ]
      };
    
    case 'location_comparison':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please compare these locations: ${args.locations}. ${args.criteria ? `Focus on these criteria: ${args.criteria}.` : 'Include general information like size, population, timezone, and geographic features.'}`
            }
          }
        ]
      };
    
    case 'geography_quiz':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate a geography quiz with ${args.difficulty || 'medium'} difficulty${args.region ? ` focusing on ${args.region}` : ''}. Include questions about capitals, flags, locations, and interesting facts.`
            }
          }
        ]
      };
    
    case 'data_export':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Export ${args.type} data in ${args.format} format${args.filter ? ` with filter: ${args.filter}` : ''}. Provide the exported data and instructions on how to use it.`
            }
          }
        ]
      };
    
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// ============= START SERVER =============
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Country-State-City MCP Server running with full API support...');
}

main().catch(console.error);