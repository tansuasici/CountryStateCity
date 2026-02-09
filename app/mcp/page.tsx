'use client';

import { Card, CardBody, Code, Snippet, Chip } from '@heroui/react';
import {
  Terminal,
  Server,
  Cpu,
  Wrench,
  Database,
  Search,
  Globe,
  Building,
  MapPin,
  BarChart3,
  Clock,
  Coins,
} from 'lucide-react';

const tools = [
  {
    name: 'search_countries',
    desc: 'Search countries by name (supports partial matching and native names)',
    icon: Search,
    param: 'query',
  },
  {
    name: 'get_country',
    desc: 'Get a country by its numeric ID, ISO2 code, or ISO3 code',
    icon: Globe,
    param: 'id | iso2 | iso3',
  },
  {
    name: 'get_countries_by_region',
    desc: "Get all countries in a specific region (e.g. 'Europe', 'Asia')",
    icon: Globe,
    param: 'region',
  },
  {
    name: 'get_states',
    desc: 'Get all states/provinces for a country by country ID or ISO2 code',
    icon: Building,
    param: 'countryId | countryCode',
  },
  {
    name: 'search_states',
    desc: 'Search states/provinces by name, optionally filtered by country',
    icon: Search,
    param: 'query, countryId?',
  },
  {
    name: 'get_cities',
    desc: 'Get cities by state ID or country ID with pagination',
    icon: MapPin,
    param: 'stateId | countryId, limit?',
  },
  {
    name: 'search_cities',
    desc: 'Search cities by name, optionally filtered by state or country',
    icon: Search,
    param: 'query, stateId?, countryId?',
  },
  {
    name: 'get_stats',
    desc: 'Get database statistics (total counts of countries, states, cities)',
    icon: BarChart3,
    param: 'none',
  },
  {
    name: 'get_regions',
    desc: 'Get all world regions (Europe, Asia, Americas, Africa, Oceania)',
    icon: Globe,
    param: 'none',
  },
  {
    name: 'get_timezones',
    desc: 'Get all timezones from the database',
    icon: Clock,
    param: 'none',
  },
  {
    name: 'get_currencies',
    desc: 'Get all currencies with their codes, names, and symbols',
    icon: Coins,
    param: 'none',
  },
];

const resources = [
  { uri: 'country-state-city://countries', desc: 'All countries (summary)', name: 'all-countries' },
  {
    uri: 'country-state-city://countries/{iso2}',
    desc: 'Country detail by ISO2 code',
    name: 'country-by-iso2',
  },
  {
    uri: 'country-state-city://countries/{iso2}/states',
    desc: 'States for a country',
    name: 'states-by-country',
  },
  {
    uri: 'country-state-city://states/{id}/cities',
    desc: 'Cities for a state',
    name: 'cities-by-state',
  },
  { uri: 'country-state-city://stats', desc: 'Statistics (total counts)', name: 'stats' },
];

export default function MCPPage() {
  return (
    <div className="dot-grid min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <section className="hero-mesh rounded-3xl px-6 py-16 md:py-20 mb-16">
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 mb-6 fade-in-up">
              <Cpu size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Model Context Protocol
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 fade-in-up stagger-1">
              <span className="gradient-text">MCP Integration</span>
            </h1>
            <p className="text-lg md:text-xl text-default-600 mb-8 max-w-2xl mx-auto fade-in-up stagger-2">
              Connect location data directly to Claude Desktop and other MCP-compatible AI
              assistants. 11 tools and 5 resource endpoints at your fingertips.
            </p>
          </div>
        </section>

        {/* Setup */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
              <Terminal size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Quick Setup</h2>
              <p className="text-sm text-default-500">Add to your Claude Desktop configuration</p>
            </div>
          </div>

          <Card className="code-block-enhanced">
            <CardBody className="p-0">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-default-200 dark:border-default-100/10">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <span className="text-xs text-default-400 font-mono ml-2">
                  claude_desktop_config.json
                </span>
              </div>
              <div className="p-5">
                <Snippet className="w-full snippet-enhanced" symbol="" hideCopyButton={false}>
                  <span>{`{`}</span>
                  <span>{`  "mcpServers": {`}</span>
                  <span>{`    "country-state-city": {`}</span>
                  <span>{`      "command": "npx",`}</span>
                  <span>{`      "args": ["@tansuasici/country-state-city", "mcp"]`}</span>
                  <span>{`    }`}</span>
                  <span>{`  }`}</span>
                  <span>{`}`}</span>
                </Snippet>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Tools */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
              <Wrench size={20} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Available Tools</h2>
              <p className="text-sm text-default-500">11 tools for querying location data</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tools.map((tool, i) => (
              <Card key={tool.name} className="glow-card gradient-border">
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-default-100 dark:bg-default-50/10 flex items-center justify-center shrink-0 mt-0.5">
                      <tool.icon size={18} className="text-default-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Code size="sm" className="font-mono font-semibold">
                          {tool.name}
                        </Code>
                      </div>
                      <p className="text-sm text-default-500 mb-2">{tool.desc}</p>
                      <Chip size="sm" variant="flat" color="default" className="font-mono text-xs">
                        {tool.param}
                      </Chip>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <Database size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Resources</h2>
              <p className="text-sm text-default-500">5 resource URIs for direct data access</p>
            </div>
          </div>

          <div className="space-y-3">
            {resources.map((resource) => (
              <Card key={resource.name} className="glow-card">
                <CardBody className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Server size={16} className="text-emerald-500 shrink-0" />
                      <Code size="sm" className="font-mono truncate">
                        {resource.uri}
                      </Code>
                    </div>
                    <span className="text-sm text-default-500 sm:ml-auto shrink-0">
                      {resource.desc}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* Usage Example */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
              <Terminal size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Usage Example</h2>
              <p className="text-sm text-default-500">Ask Claude naturally after connecting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
              <CardBody className="p-5">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                  You ask:
                </p>
                <p className="text-default-700 dark:text-default-300 italic">{`"What are the top 5 largest countries in Europe by number of states?"`}</p>
              </CardBody>
            </Card>
            <Card className="bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30">
              <CardBody className="p-5">
                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-2">
                  Claude uses:
                </p>
                <div className="space-y-1">
                  <Code size="sm" className="font-mono">
                    get_countries_by_region("Europe")
                  </Code>
                  <p className="text-xs text-default-500">then for each country:</p>
                  <Code size="sm" className="font-mono">
                    get_states(countryId)
                  </Code>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
