import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CountryStateCity } from '../../countrystatecity-npm/src/index';
import { z } from 'zod';

export function registerTools(server: McpServer) {
  // search_countries
  server.tool(
    'search_countries',
    'Search countries by name (supports partial matching and native names)',
    { query: z.string().describe('Search term to match against country names') },
    async ({ query }) => {
      try {
        const results = CountryStateCity.searchCountries(query);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error searching countries: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // get_country
  server.tool(
    'get_country',
    'Get a country by its numeric ID, ISO2 code, or ISO3 code',
    {
      id: z.number().optional().describe('Country numeric ID'),
      iso2: z.string().optional().describe("ISO 3166-1 alpha-2 code (e.g. 'US', 'TR')"),
      iso3: z.string().optional().describe("ISO 3166-1 alpha-3 code (e.g. 'USA', 'TUR')"),
    },
    async ({ id, iso2, iso3 }) => {
      try {
        let country;
        if (id != null) {
          country = CountryStateCity.getCountryById(id);
        } else if (iso2) {
          country = CountryStateCity.getCountryByIso2(iso2);
        } else if (iso3) {
          country = CountryStateCity.getCountryByIso3(iso3);
        } else {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide at least one of: id, iso2, or iso3',
              },
            ],
          };
        }

        if (!country) {
          return {
            content: [{ type: 'text' as const, text: 'Country not found' }],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(country, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting country: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // get_countries_by_region
  server.tool(
    'get_countries_by_region',
    "Get all countries in a specific region (e.g. 'Europe', 'Asia', 'Africa')",
    {
      region: z
        .string()
        .describe("Region name (e.g. 'Europe', 'Asia', 'Americas', 'Africa', 'Oceania')"),
    },
    async ({ region }) => {
      try {
        const results = CountryStateCity.getCountriesByRegion(region);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                results.map((c) => ({
                  id: c.id,
                  name: c.name,
                  iso2: c.iso2,
                  iso3: c.iso3,
                  capital: c.capital,
                  region: c.region,
                  subregion: c.subregion,
                })),
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting countries by region: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // get_states
  server.tool(
    'get_states',
    'Get all states/provinces for a country by country ID or ISO2 code',
    {
      countryId: z.number().optional().describe('Country numeric ID'),
      countryCode: z.string().optional().describe("Country ISO2 code (e.g. 'US', 'TR')"),
    },
    async ({ countryId, countryCode }) => {
      try {
        let states;
        if (countryId != null) {
          states = CountryStateCity.getStatesByCountryId(countryId);
        } else if (countryCode) {
          states = CountryStateCity.getStatesByCountryCode(countryCode);
        } else {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide either countryId or countryCode',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(states, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting states: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // search_states
  server.tool(
    'search_states',
    'Search states/provinces by name, optionally filtered by country',
    {
      query: z.string().describe('Search term to match against state names'),
      countryId: z.number().optional().describe('Optional country ID to filter results'),
    },
    async ({ query, countryId }) => {
      try {
        const results = CountryStateCity.searchStates(query, countryId);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error searching states: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // get_cities
  server.tool(
    'get_cities',
    'Get cities by state ID or country ID (limited to prevent large responses)',
    {
      stateId: z.number().optional().describe('State ID to get cities for'),
      countryId: z.number().optional().describe('Country ID to get cities for'),
      limit: z.number().optional().describe('Maximum number of cities to return (default: 100)'),
    },
    async ({ stateId, countryId, limit }) => {
      try {
        const maxResults = limit ?? 100;
        let cities;

        if (stateId != null) {
          cities = CountryStateCity.getCitiesByStateId(stateId) as any[];
        } else if (countryId != null) {
          cities = CountryStateCity.getCitiesByCountryId(countryId) as any[];
        } else {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Please provide either stateId or countryId',
              },
            ],
          };
        }

        const total = cities.length;
        const limited = cities.slice(0, maxResults);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  total,
                  returned: limited.length,
                  limit: maxResults,
                  cities: limited,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting cities: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // search_cities
  server.tool(
    'search_cities',
    'Search cities by name, optionally filtered by state or country (limited to prevent large responses)',
    {
      query: z.string().describe('Search term to match against city names'),
      stateId: z.number().optional().describe('Optional state ID to filter results'),
      countryId: z.number().optional().describe('Optional country ID to filter results'),
      limit: z.number().optional().describe('Maximum number of cities to return (default: 100)'),
    },
    async ({ query, stateId, countryId, limit }) => {
      try {
        const maxResults = limit ?? 100;
        const results = CountryStateCity.searchCities(query, stateId, countryId);
        const total = results.length;
        const limited = results.slice(0, maxResults);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  total,
                  returned: limited.length,
                  limit: maxResults,
                  cities: limited,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error searching cities: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // get_stats
  server.tool(
    'get_stats',
    'Get database statistics (total counts of countries, states, and cities)',
    {},
    async () => {
      try {
        const stats = CountryStateCity.getStats();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting stats: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // get_regions
  server.tool(
    'get_regions',
    'Get all world regions (e.g. Europe, Asia, Americas, Africa, Oceania)',
    {},
    async () => {
      try {
        const regions = CountryStateCity.getAllRegions();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(regions, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting regions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // get_timezones
  server.tool('get_timezones', 'Get all timezones from the database', {}, async () => {
    try {
      const timezones = CountryStateCity.getAllTimezones();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(timezones, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error getting timezones: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });

  // get_currencies
  server.tool(
    'get_currencies',
    'Get all currencies with their codes, names, and symbols',
    {},
    async () => {
      try {
        const currencies = CountryStateCity.getAllCurrencies();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(currencies, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting currencies: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
