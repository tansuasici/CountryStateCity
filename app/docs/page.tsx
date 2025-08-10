'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Code, Accordion, AccordionItem, Snippet } from '@heroui/react';
import { ChevronLeft, ChevronDown, Globe, Building, MapPin, FileText, Package, Download } from 'lucide-react';
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
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4">Country State City</h1>
          <p className="text-xl text-default-600 max-w-2xl mx-auto">Complete world location data in JSON, CSV, XML, and YAML formats.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-950/20">
            <CardBody className="text-center">
              <Globe className="mx-auto mb-2 text-blue-600" size={24} />
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Countries</h3>
              <Code size="lg">{stats.countries.toLocaleString()}</Code>
            </CardBody>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20">
            <CardBody className="text-center">
              <Building className="mx-auto mb-2 text-green-600" size={24} />
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">States</h3>
              <Code size="lg">{stats.states.toLocaleString()}</Code>
            </CardBody>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950/20">
            <CardBody className="text-center">
              <MapPin className="mx-auto mb-2 text-purple-600" size={24} />
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">Cities</h3>
              <Code size="lg">{stats.cities.toLocaleString()}</Code>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* API Access */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">API Access</h2>
          <p className="text-default-600">Access location data through our RESTful API</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <Snippet>
                https://country-state-city-api.web.app/api
              </Snippet>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-2">Example Request</h3>
              <Snippet>
                GET /api/countries?format=json
              </Snippet>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">API Endpoints</h2>
          <p className="text-default-600">Available endpoints with format support</p>
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3">Countries</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/countries</span>
                  <span className="text-xs text-gray-500">- Get all countries</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/countries/:id</span>
                  <span className="text-xs text-gray-500">- Get country by ID</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/countries/:id/states</span>
                  <span className="text-xs text-gray-500">- Get states by country</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/countries/:id/cities</span>
                  <span className="text-xs text-gray-500">- Get cities by country</span>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3">States</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/states</span>
                  <span className="text-xs text-gray-500">- Get all states</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/states/:id</span>
                  <span className="text-xs text-gray-500">- Get state by ID</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/states/:id/cities</span>
                  <span className="text-xs text-gray-500">- Get cities by state</span>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3">Cities</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/cities</span>
                  <span className="text-xs text-gray-500">- Get all cities</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">GET</Code>
                  <span className="text-sm">/api/cities/:id</span>
                  <span className="text-xs text-gray-500">- Get city by ID</span>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3">Query Parameters</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code size="sm">format</Code>
                  <span className="text-sm">json | csv | xml | yaml</span>
                  <span className="text-xs text-gray-500">- Response format</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">search</Code>
                  <span className="text-sm">string</span>
                  <span className="text-xs text-gray-500">- Search by name</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">limit</Code>
                  <span className="text-sm">number</span>
                  <span className="text-xs text-gray-500">- Limit results</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code size="sm">page</Code>
                  <span className="text-sm">number</span>
                  <span className="text-xs text-gray-500">- Page number</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Interactive Playground */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Interactive Playground</h2>
          <p className="text-default-600">Test the API and explore available endpoints</p>
        </div>
        
        <Card>
          <CardBody>
            <DataPlayground stats={stats} />
          </CardBody>
        </Card>
      </section>

      {/* Data Structure */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Data Structure</h2>
          <p className="text-default-600">Complete model structures with all available fields</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Country</h3>
            </CardHeader>
            <CardBody>
                <div className="text-sm space-y-1 max-h-96 overflow-y-auto">
                  <div className="flex justify-between">
                    <Code size="sm">id</Code>
                    <span className="text-gray-500">number</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">name</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">iso2</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">iso3</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">numericCode</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">phoneCode</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">capital</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">currency</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">currencyName</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">currencySymbol</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">tld</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">native</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">region</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">regionId</Code>
                    <span className="text-gray-500">number?</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">subregion</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">subregionId</Code>
                    <span className="text-gray-500">number?</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">nationality</Code>
                    <span className="text-gray-500">string?</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">timezones</Code>
                    <span className="text-gray-500">Timezone[]</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">translations</Code>
                    <span className="text-gray-500">Object</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">latitude</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">longitude</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">emoji</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">emojiU</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold">State</h3>
              </CardHeader>
              <CardBody>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <Code size="sm">id</Code>
                    <span className="text-gray-500">number</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">name</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">countryId</Code>
                    <span className="text-gray-500">number</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">countryCode</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">countryName</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">stateCode</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">type</Code>
                    <span className="text-gray-500">string | null</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">latitude</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">longitude</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold">City</h3>
              </CardHeader>
              <CardBody>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <Code size="sm">id</Code>
                    <span className="text-gray-500">number</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">name</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">stateId</Code>
                    <span className="text-gray-500">number</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">stateCode</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">stateName</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">countryId</Code>
                    <span className="text-gray-500">number</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">countryCode</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">countryName</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">latitude</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">longitude</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                  <div className="flex justify-between">
                    <Code size="sm">wikiDataId</Code>
                    <span className="text-gray-500">string</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
      </section>
    </div>
  );
}