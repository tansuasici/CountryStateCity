'use client';

import { Card, CardBody, CardHeader, Code, Link, Button, Chip, Tabs, Tab, Snippet } from '@heroui/react';
import { Terminal, Download, Settings, Cpu, FileJson, Globe, Sparkles, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function MCPPage() {
  const [selectedTab, setSelectedTab] = useState('installation');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <Cpu className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">MCP Integration</h1>
        <p className="text-xl text-default-600 mb-6">
          Model Context Protocol server for AI assistants and LLM applications
        </p>
      </div>

      {/* Main Content Tabs */}
      <Tabs 
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key.toString())}
        className="mb-8"
      >
        <Tab key="installation" title="Installation">
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">1. Install the MCP Server</h3>
              </CardHeader>
              <CardBody>
                <p className="mb-4 text-default-600">
                  Install the MCP server globally using npm:
                </p>
                <Snippet symbol="" variant="bordered">
                  npm install -g @tansuasici/country-state-city-mcp
                </Snippet>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">2. Configuration</h3>
              </CardHeader>
              <CardBody>
                <p className="mb-4 text-default-600">
                  Add the server to your MCP configuration file:
                </p>
                
                <Snippet symbol="" variant="bordered" className="text-sm">
                  {`{
  "mcpServers": {
    "country-state-city": {
      "command": "npx",
      "args": ["@tansuasici/country-state-city-mcp"]
    }
  }
}`}
                </Snippet>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">3. Start Using</h3>
              </CardHeader>
              <CardBody>
                <p className="text-default-600">
                  Restart your application after updating the configuration.
                </p>
                <div className="flex items-center gap-2 mt-4 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span>The location data tools will be available immediately!</span>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="tools" title="Available Tools">
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Country Tools</h3>
                </div>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Code size="sm">getAllCountries</Code>
                    <span className="text-sm text-default-600">Get all countries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getCountryById</Code>
                    <span className="text-sm text-default-600">Get by ID</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getCountryByIso2</Code>
                    <span className="text-sm text-default-600">Get by ISO2</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getCountryByIso3</Code>
                    <span className="text-sm text-default-600">Get by ISO3</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">searchCountries</Code>
                    <span className="text-sm text-default-600">Search by name</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getCountriesByRegion</Code>
                    <span className="text-sm text-default-600">Filter by region</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getCountriesBySubregion</Code>
                    <span className="text-sm text-default-600">Filter by subregion</span>
                  </li>
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-secondary" />
                  <h3 className="text-lg font-semibold">State/Province Tools</h3>
                </div>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Code size="sm">getAllStates</Code>
                    <span className="text-sm text-default-600">Get all states</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getStateById</Code>
                    <span className="text-sm text-default-600">Get by ID</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getStatesByCountryId</Code>
                    <span className="text-sm text-default-600">Get by country</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getStatesByCountryCode</Code>
                    <span className="text-sm text-default-600">Get by ISO code</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">searchStates</Code>
                    <span className="text-sm text-default-600">Search by name</span>
                  </li>
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-warning" />
                  <h3 className="text-lg font-semibold">City Tools</h3>
                </div>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Code size="sm">getAllCities</Code>
                    <span className="text-sm text-default-600">Get all cities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getCityById</Code>
                    <span className="text-sm text-default-600">Get by ID</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getCitiesByStateId</Code>
                    <span className="text-sm text-default-600">Get by state</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getCitiesByCountryId</Code>
                    <span className="text-sm text-default-600">Get by country</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">searchCities</Code>
                    <span className="text-sm text-default-600">Search by name</span>
                  </li>
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-success" />
                  <h3 className="text-lg font-semibold">Utility Tools</h3>
                </div>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Code size="sm">getStats</Code>
                    <span className="text-sm text-default-600">Database statistics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getAllRegions</Code>
                    <span className="text-sm text-default-600">List all regions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getAllSubregions</Code>
                    <span className="text-sm text-default-600">List subregions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getAllTimezones</Code>
                    <span className="text-sm text-default-600">List timezones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">getAllCurrencies</Code>
                    <span className="text-sm text-default-600">List currencies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Code size="sm">exportData</Code>
                    <span className="text-sm text-default-600">Export data</span>
                  </li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="examples" title="Usage Examples">
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Example Queries</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="p-4 bg-default-100 rounded-lg">
                  <p className="font-semibold mb-2">Finding Countries:</p>
                  <p className="text-default-600 italic">"Show me all countries in Europe"</p>
                  <p className="text-default-600 italic">"Get the country with ISO code TR"</p>
                  <p className="text-default-600 italic">"Find countries that use EUR currency"</p>
                </div>

                <div className="p-4 bg-default-100 rounded-lg">
                  <p className="font-semibold mb-2">Working with States:</p>
                  <p className="text-default-600 italic">"List all states in Turkey"</p>
                  <p className="text-default-600 italic">"Show me provinces in Canada"</p>
                  <p className="text-default-600 italic">"Find states that contain 'California'"</p>
                </div>

                <div className="p-4 bg-default-100 rounded-lg">
                  <p className="font-semibold mb-2">City Searches:</p>
                  <p className="text-default-600 italic">"Find all cities named Istanbul"</p>
                  <p className="text-default-600 italic">"Show cities in California"</p>
                  <p className="text-default-600 italic">"List the largest cities in Germany"</p>
                </div>

                <div className="p-4 bg-default-100 rounded-lg">
                  <p className="font-semibold mb-2">Data Export:</p>
                  <p className="text-default-600 italic">"Export all European countries as CSV"</p>
                  <p className="text-default-600 italic">"Give me country data in YAML format"</p>
                  <p className="text-default-600 italic">"Create an XML file with Asian countries"</p>
                </div>

                <div className="p-4 bg-default-100 rounded-lg">
                  <p className="font-semibold mb-2">Statistics & Analysis:</p>
                  <p className="text-default-600 italic">"Show me database statistics"</p>
                  <p className="text-default-600 italic">"How many countries are in each region?"</p>
                  <p className="text-default-600 italic">"List all available timezones"</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Advanced Use Cases</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Travel Planning:</h4>
                  <p className="text-default-600">
                    Use the MCP server to help plan trips by getting comprehensive location data,
                    including coordinates, timezones, and currency information.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Data Analysis:</h4>
                  <p className="text-default-600">
                    Export location data in various formats for analysis in other tools,
                    or analyze patterns in global geographic distribution.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Application Development:</h4>
                  <p className="text-default-600">
                    Quickly prototype location-based features by generating
                    code that uses the location data directly.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="resources" title="Resources">
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Direct Data Access</h3>
              </CardHeader>
              <CardBody>
                <p className="mb-4 text-default-600">
                  The MCP server provides direct access to raw data through resources:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Code>countries</Code>
                    <span className="text-default-600">- Complete country dataset</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Code>states</Code>
                    <span className="text-default-600">- All states/provinces data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Code>cities</Code>
                    <span className="text-default-600">- Full cities database</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Pre-configured Prompts</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">travel_planner</h4>
                    <p className="text-default-600">
                      Interactive travel planning assistant that uses location data
                      to help plan trips with detailed information about destinations.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">location_comparison</h4>
                    <p className="text-default-600">
                      Compare different locations based on various criteria like
                      timezone differences, currencies, and geographic regions.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">data_export</h4>
                    <p className="text-default-600">
                      Guided data export wizard that helps format and filter
                      location data for specific use cases.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Links & Documentation</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Link 
                  href="https://www.npmjs.com/package/@tansuasici/country-state-city-mcp"
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  NPM Package
                </Link>
                <Link 
                  href="https://github.com/tansuasici/CountryStateCity"
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <FileJson className="w-4 h-4" />
                  GitHub Repository
                </Link>
                <Link 
                  href="https://modelcontextprotocol.io"
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  MCP Documentation
                </Link>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* CTA Section */}
      <Card className="mt-8 bg-gradient-to-r from-primary-500 to-secondary-500 text-white">
        <CardBody className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="mb-6">
            Install the MCP server and enhance your applications with comprehensive location data
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              as={Link}
              href="https://www.npmjs.com/package/@tansuasici/country-state-city-mcp"
              target="_blank"
              color="default"
              size="lg"
              startContent={<Download />}
            >
              Install Package
            </Button>
            <Button
              as={Link}
              href="https://github.com/tansuasici/CountryStateCity"
              target="_blank"
              variant="bordered"
              size="lg"
              className="border-white text-white"
            >
              View on GitHub
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}