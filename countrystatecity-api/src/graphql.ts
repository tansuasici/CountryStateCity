import { buildSchema, graphql, type ExecutionResult } from 'graphql';

import { dataMetadata, dataStore, type DataStore } from './data-store';

const schema = buildSchema(`
  type SourceLicense {
    id: String!
    name: String!
    url: String!
  }

  type Source {
    name: String!
    license: SourceLicense!
    attribution: String!
  }

  type Metadata {
    apiVersion: String!
    dataVersion: String!
    packageVersion: String!
    generatedAt: String!
    source: Source!
  }

  type PageInfo {
    limit: Int!
    offset: Int!
    total: Int!
    hasMore: Boolean!
  }

  type Country {
    id: Int!
    name: String!
    iso2: String!
    iso3: String!
    numericCode: String!
    capital: String!
    region: String!
    subregion: String!
    latitude: String!
    longitude: String!
    emoji: String!
  }

  type Subdivision {
    id: Int!
    name: String!
    countryId: Int!
    countryCode: String!
    countryName: String!
    stateCode: String!
    type: String
    latitude: String!
    longitude: String!
  }

  type Place {
    id: Int!
    name: String!
    subdivisionId: Int!
    subdivisionCode: String!
    subdivisionName: String!
    countryId: Int!
    countryCode: String!
    countryName: String!
    latitude: Float!
    longitude: Float!
    wikiDataId: String
  }

  type CountryConnection { nodes: [Country!]!, pageInfo: PageInfo! }
  type SubdivisionConnection { nodes: [Subdivision!]!, pageInfo: PageInfo! }
  type PlaceConnection { nodes: [Place!]!, pageInfo: PageInfo! }

  type SearchResult {
    type: String!
    id: Int!
    name: String!
    countryCode: String
    countryName: String
    subdivisionCode: String
    subdivisionName: String
    latitude: Float
    longitude: Float
  }

  type SearchConnection { nodes: [SearchResult!]!, pageInfo: PageInfo! }

  type Query {
    metadata: Metadata!
    country(code: String!): Country
    countries(q: String, limit: Int = 25, offset: Int = 0): CountryConnection!
    subdivisions(country: String!, q: String, limit: Int = 25, offset: Int = 0): SubdivisionConnection!
    places(country: String!, subdivision: String, q: String, limit: Int = 25, offset: Int = 0): PlaceConnection!
    search(q: String!, country: String, types: [String!], limit: Int = 25, offset: Int = 0): SearchConnection!
  }
`);

function paginate<T>(records: T[], limit = 25, offset = 0) {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const safeOffset = Math.max(0, offset);
  return {
    nodes: records.slice(safeOffset, safeOffset + safeLimit),
    pageInfo: {
      limit: safeLimit,
      offset: safeOffset,
      total: records.length,
      hasMore: safeOffset + safeLimit < records.length,
    },
  };
}

export async function executeGraphql(
  query: string,
  variables?: Record<string, unknown>,
  store: DataStore = dataStore
): Promise<ExecutionResult> {
  const rootValue = {
    metadata: () => ({ apiVersion: 'v1', ...dataMetadata }),
    country: ({ code }: { code: string }) => store.country(code),
    countries: ({ q, limit, offset }: { q?: string; limit?: number; offset?: number }) =>
      paginate(store.countries(q), limit, offset),
    subdivisions: ({
      country,
      q,
      limit,
      offset,
    }: {
      country: string;
      q?: string;
      limit?: number;
      offset?: number;
    }) => paginate(store.subdivisions(country, q), limit, offset),
    places: ({
      country,
      subdivision,
      q,
      limit,
      offset,
    }: {
      country: string;
      subdivision?: string;
      q?: string;
      limit?: number;
      offset?: number;
    }) => paginate(store.places(country, subdivision, q), limit, offset),
    search: ({
      q,
      country,
      types,
      limit,
      offset,
    }: {
      q: string;
      country?: string;
      types?: string[];
      limit?: number;
      offset?: number;
    }) => paginate(store.search(q, { country, types }), limit, offset),
  };

  return graphql({ schema, source: query, rootValue, variableValues: variables });
}
