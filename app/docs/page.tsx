'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Code, Snippet } from '@heroui/react';
import { Globe, Building, MapPin, FileText, Package, Terminal, Server, Cpu } from 'lucide-react';
import DataPlayground from '@/components/DataPlayground';

export default function DataPackageDocumentation() {
  const [stats, setStats] = useState({ countries: 0, states: 0, cities: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const { getStats } = await import('@/lib/countries');
      const data = getStats();
      setStats(data);
    };
    loadStats();
  }, []);

  return (
    <div className="dot-grid min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-6xl space-y-6">
        {/* Header */}
        <section className="mb-16">
          <div className="hero-mesh rounded-3xl px-6 py-16 mb-8">
            <div className="relative z-10 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 fade-in-up">
                <span className="gradient-text">Documentation</span>
              </h1>
              <p className="text-lg text-default-500 max-w-2xl mx-auto fade-in-up stagger-1">
                Complete world location data in JSON, CSV, XML, and YAML formats.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glow-card bg-blue-50 dark:bg-blue-950/20">
              <CardBody className="text-center py-6">
                <Globe className="mx-auto mb-2 text-blue-500" size={28} />
                <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {stats.countries.toLocaleString()}
                </h3>
                <p className="text-sm text-default-500">Countries</p>
              </CardBody>
            </Card>
            <Card className="glow-card bg-emerald-50 dark:bg-emerald-950/20">
              <CardBody className="text-center py-6">
                <Building className="mx-auto mb-2 text-emerald-500" size={28} />
                <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {stats.states.toLocaleString()}
                </h3>
                <p className="text-sm text-default-500">States</p>
              </CardBody>
            </Card>
            <Card className="glow-card bg-violet-50 dark:bg-violet-950/20">
              <CardBody className="text-center py-6">
                <MapPin className="mx-auto mb-2 text-violet-500" size={28} />
                <h3 className="text-lg font-bold text-violet-700 dark:text-violet-300">
                  {stats.cities.toLocaleString()}
                </h3>
                <p className="text-sm text-default-500">Cities</p>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* NPM Package */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
              <Package size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">NPM Package</h2>
              <p className="text-sm text-default-500">
                Install and use the library in your projects
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="code-block-enhanced">
              <CardBody className="p-0">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-default-200 dark:border-default-100/10">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <span className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-xs text-default-400 font-mono ml-2">terminal</span>
                </div>
                <div className="p-5">
                  <Snippet className="w-full snippet-enhanced" symbol="$">
                    npm install @tansuasici/country-state-city
                  </Snippet>
                </div>
              </CardBody>
            </Card>
            <Card className="code-block-enhanced">
              <CardBody className="p-0">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-default-200 dark:border-default-100/10">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <span className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-xs text-default-400 font-mono ml-2">app.ts</span>
                </div>
                <div className="p-5">
                  <Snippet className="w-full snippet-enhanced" symbol="">
                    {`const countries = CountryStateCity.getAllCountries();`}
                  </Snippet>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Library Methods */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
              <FileText size={20} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Library Methods</h2>
              <p className="text-sm text-default-500">Available methods with format support</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Countries',
                color: 'indigo',
                methods: [
                  { name: 'getAllCountries()', desc: 'Get all countries' },
                  { name: 'getCountryById(id)', desc: 'Get country by ID' },
                  { name: 'getStatesByCountryId(id)', desc: 'Get states by country' },
                  { name: 'getCitiesByCountryId(id)', desc: 'Get cities by country' },
                ],
              },
              {
                title: 'States',
                color: 'emerald',
                methods: [
                  { name: 'getAllStates()', desc: 'Get all states' },
                  { name: 'getStateById(id)', desc: 'Get state by ID' },
                  { name: 'getCitiesByStateId(id)', desc: 'Get cities by state' },
                ],
              },
              {
                title: 'Cities',
                color: 'amber',
                methods: [
                  { name: 'getAllCities()', desc: 'Get all cities' },
                  { name: 'getCityById(id)', desc: 'Get city by ID' },
                ],
              },
              {
                title: 'Utilities',
                color: 'violet',
                methods: [
                  { name: 'searchCountries(query)', desc: 'Search countries' },
                  { name: 'searchStates(query)', desc: 'Search states' },
                  { name: 'searchCities(query)', desc: 'Search cities' },
                  { name: 'format: json|csv|xml|yaml', desc: 'Output format option' },
                ],
              },
            ].map((group) => (
              <Card key={group.title} className="glow-card gradient-border">
                <CardBody className="p-5">
                  <h3 className="font-bold mb-3">{group.title}</h3>
                  <div className="space-y-2">
                    {group.methods.map((method) => (
                      <div key={method.name} className="flex items-center gap-2">
                        <Code size="sm" className="font-mono shrink-0">
                          {method.name}
                        </Code>
                        <span className="text-xs text-default-400">{method.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* Interactive Playground */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <Globe size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Interactive Playground</h2>
              <p className="text-sm text-default-500">
                Test the API and explore available endpoints
              </p>
            </div>
          </div>

          <Card>
            <CardBody>
              <DataPlayground stats={stats} />
            </CardBody>
          </Card>
        </section>

        {/* MCP Integration */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
              <Cpu size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">MCP Integration</h2>
              <p className="text-sm text-default-500">
                Connect location data to Claude Desktop and AI assistants
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Claude Desktop Config */}
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

            {/* Tools & Resources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glow-card gradient-border">
                <CardBody className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal size={16} className="text-cyan-500" />
                    <h3 className="font-bold">Available Tools</h3>
                    <span className="text-xs text-default-400 ml-auto">11 tools</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['search_countries', 'Search by name'],
                      ['get_country', 'By ID, ISO2, or ISO3'],
                      ['get_countries_by_region', 'Filter by region'],
                      ['get_states', 'By country ID or code'],
                      ['search_states', 'Search by name'],
                      ['get_cities', 'By state or country'],
                      ['search_cities', 'Search by name'],
                      ['get_stats', 'Database statistics'],
                      ['get_regions', 'All world regions'],
                      ['get_timezones', 'All timezones'],
                      ['get_currencies', 'All currencies'],
                    ].map(([name, desc]) => (
                      <div key={name} className="flex items-center gap-2">
                        <Code size="sm" className="font-mono shrink-0">
                          {name}
                        </Code>
                        <span className="text-xs text-default-400">{desc}</span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card className="glow-card gradient-border">
                <CardBody className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Server size={16} className="text-emerald-500" />
                    <h3 className="font-bold">Resources</h3>
                    <span className="text-xs text-default-400 ml-auto">5 URIs</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['://countries', 'All countries (summary)'],
                      ['://countries/{iso2}', 'Country detail'],
                      ['://countries/{iso2}/states', 'States for a country'],
                      ['://states/{id}/cities', 'Cities for a state'],
                      ['://stats', 'Database statistics'],
                    ].map(([uri, desc]) => (
                      <div key={uri} className="flex items-center gap-2">
                        <Code size="sm" className="font-mono shrink-0 text-xs">
                          {uri}
                        </Code>
                        <span className="text-xs text-default-400">{desc}</span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        {/* Data Structure */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
              <FileText size={20} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Data Structure</h2>
              <p className="text-sm text-default-500">
                Complete model structures with all available fields
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Country',
                fields: [
                  ['id', 'number'],
                  ['name', 'string'],
                  ['iso2', 'string'],
                  ['iso3', 'string'],
                  ['numericCode', 'string'],
                  ['phoneCode', 'string'],
                  ['capital', 'string'],
                  ['currency', 'string'],
                  ['currencyName', 'string'],
                  ['currencySymbol', 'string'],
                  ['tld', 'string'],
                  ['native', 'string'],
                  ['region', 'string'],
                  ['regionId', 'number?'],
                  ['subregion', 'string'],
                  ['subregionId', 'number?'],
                  ['nationality', 'string?'],
                  ['timezones', 'Timezone[]'],
                  ['translations', 'Object'],
                  ['latitude', 'string'],
                  ['longitude', 'string'],
                  ['emoji', 'string'],
                  ['emojiU', 'string'],
                ],
              },
              {
                title: 'State',
                fields: [
                  ['id', 'number'],
                  ['name', 'string'],
                  ['countryId', 'number'],
                  ['countryCode', 'string'],
                  ['countryName', 'string'],
                  ['stateCode', 'string'],
                  ['type', 'string | null'],
                  ['latitude', 'string'],
                  ['longitude', 'string'],
                ],
              },
              {
                title: 'City',
                fields: [
                  ['id', 'number'],
                  ['name', 'string'],
                  ['stateId', 'number'],
                  ['stateCode', 'string'],
                  ['stateName', 'string'],
                  ['countryId', 'number'],
                  ['countryCode', 'string'],
                  ['countryName', 'string'],
                  ['latitude', 'string'],
                  ['longitude', 'string'],
                  ['wikiDataId', 'string'],
                ],
              },
            ].map((model) => (
              <Card key={model.title} className="glow-card">
                <CardHeader className="pb-0 pt-4 px-5">
                  <h3 className="font-bold">{model.title}</h3>
                </CardHeader>
                <CardBody className="px-5 pb-5">
                  <div className="text-sm space-y-1.5 max-h-96 overflow-y-auto">
                    {model.fields.map(([field, type]) => (
                      <div key={field} className="flex justify-between items-center">
                        <Code size="sm" className="font-mono">
                          {field}
                        </Code>
                        <span className="text-xs text-default-400">{type}</span>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
