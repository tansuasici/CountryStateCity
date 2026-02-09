import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CountryStateCity } from '../../countrystatecity-npm/src/index';

export function registerResources(server: McpServer) {
  // All countries (summary)
  server.resource('all-countries', 'country-state-city://countries', async (uri) => {
    const countries = CountryStateCity.getAllCountries() as any[];
    const summary = countries.map((c) => ({
      id: c.id,
      name: c.name,
      iso2: c.iso2,
      iso3: c.iso3,
      region: c.region,
    }));

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(summary, null, 2),
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Single country detail by ISO2 code
  server.resource(
    'country-by-iso2',
    new ResourceTemplate('country-state-city://countries/{iso2}', 'Country detail by ISO2 code'),
    async (uri, params) => {
      const iso2 = params.iso2 as string;
      const country = CountryStateCity.getCountryByIso2(iso2);

      if (!country) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ error: `Country not found: ${iso2}` }),
              mimeType: 'application/json',
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(country, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    }
  );

  // States for a country by ISO2 code
  server.resource(
    'states-by-country',
    new ResourceTemplate('country-state-city://countries/{iso2}/states', 'States for a country'),
    async (uri, params) => {
      const iso2 = params.iso2 as string;
      const states = CountryStateCity.getStatesByCountryCode(iso2);

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(states, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    }
  );

  // Cities for a state by state ID
  server.resource(
    'cities-by-state',
    new ResourceTemplate('country-state-city://states/{id}/cities', 'Cities for a state'),
    async (uri, params) => {
      const stateId = Number(params.id);
      const cities = CountryStateCity.getCitiesByStateId(stateId) as any[];
      const limited = cities.slice(0, 500);

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(
              {
                total: cities.length,
                returned: limited.length,
                cities: limited,
              },
              null,
              2
            ),
            mimeType: 'application/json',
          },
        ],
      };
    }
  );

  // Statistics
  server.resource('stats', 'country-state-city://stats', async (uri) => {
    const stats = CountryStateCity.getStats();

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(stats, null, 2),
          mimeType: 'application/json',
        },
      ],
    };
  });
}
