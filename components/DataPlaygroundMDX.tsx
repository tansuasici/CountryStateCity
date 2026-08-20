'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Copy, Download, Check, Search } from 'lucide-react';
import { formatCountries, formatStates, formatCities } from '@/lib/formatters';
import { Country, State } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DataPlaygroundMDX() {
  const [selectedAction, setSelectedAction] = useState('getCountries');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [result, setResult] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void import('@/lib/countries').then(({ getCountries }) => setCountries(getCountries()));
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      void import('@/lib/countries').then(({ getStatesByCountryId }) => {
        setStates(getStatesByCountryId(Number(selectedCountry)));
        setSelectedState('');
      });
    } else {
      setStates([]);
      setSelectedState('');
    }
  }, [selectedCountry]);

  const executeAction = async () => {
    setLoading(true);
    try {
      const api = await import('@/lib/countries');
      let data: any;
      switch (selectedAction) {
        case 'getCountries':
          data = api.getCountries(10);
          break;
        case 'getCountryById':
          if (selectedCountry) data = api.getCountryById(Number(selectedCountry));
          break;
        case 'getStatesByCountryId':
          if (selectedCountry)
            data = api.getStatesByCountryId(Number(selectedCountry)).slice(0, 20);
          break;
        case 'getCitiesByStateId':
          if (selectedState)
            data = (await api.getCitiesByStateId(Number(selectedState))).slice(0, 20);
          break;
        case 'searchCountries':
          if (searchQuery) data = api.searchCountries(searchQuery);
          break;
        case 'searchStates':
          if (searchQuery)
            data = api.searchStates(
              searchQuery,
              selectedCountry ? Number(selectedCountry) : undefined
            );
          break;
        default:
          data = { message: 'Select an action to execute' };
      }

      if (!data) {
        setResult('No results found. Make sure you filled in the required fields.');
        setLoading(false);
        return;
      }

      const dataArray = Array.isArray(data) ? data : [data];
      let formatted: string;

      if (selectedFormat === 'json') {
        formatted = JSON.stringify(data, null, 2);
      } else if (selectedFormat === 'csv') {
        if (selectedAction.includes('Countries') || selectedAction.includes('Country'))
          formatted = formatCountries.csv(dataArray);
        else if (selectedAction.includes('States') || selectedAction.includes('State'))
          formatted = formatStates.csv(dataArray);
        else formatted = formatCities.csv(dataArray);
      } else if (selectedFormat === 'xml') {
        if (selectedAction.includes('Countries') || selectedAction.includes('Country'))
          formatted = formatCountries.xml(dataArray);
        else if (selectedAction.includes('States') || selectedAction.includes('State'))
          formatted = formatStates.xml(dataArray);
        else formatted = formatCities.xml(dataArray);
      } else {
        if (selectedAction.includes('Countries') || selectedAction.includes('Country'))
          formatted = formatCountries.yaml(dataArray);
        else if (selectedAction.includes('States') || selectedAction.includes('State'))
          formatted = formatStates.yaml(dataArray);
        else formatted = formatCities.yaml(dataArray);
      }

      setResult(formatted);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = useCallback(() => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const downloadResult = useCallback(() => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.${selectedFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, selectedFormat]);

  const needsCountry =
    selectedAction === 'getCountryById' ||
    selectedAction === 'getStatesByCountryId' ||
    selectedAction === 'getCitiesByStateId' ||
    selectedAction === 'searchStates';

  const needsSearch = selectedAction === 'searchCountries' || selectedAction === 'searchStates';

  return (
    <div className="min-w-0 space-y-5 p-3 sm:space-y-6 sm:p-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Interactive Playground</h2>
        <p className="text-sm text-muted-foreground">Test the API and explore available data</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <optgroup label="Get Data">
              <option value="getCountries">Get Countries (First 10)</option>
              <option value="getCountryById">Get Country by ID</option>
              <option value="getStatesByCountryId">Get States by Country</option>
              <option value="getCitiesByStateId">Get Cities by State</option>
            </optgroup>
            <optgroup label="Search">
              <option value="searchCountries">Search Countries</option>
              <option value="searchStates">Search States</option>
            </optgroup>
          </select>
        </div>

        {needsCountry && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select country...</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedAction === 'getCitiesByStateId' && states.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select state...</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsSearch && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Search Query
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. Türkiye, California..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="xml">XML</option>
            <option value="yaml">YAML</option>
          </select>
        </div>
      </div>

      {/* Execute */}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <Button onClick={executeAction} disabled={loading} className="w-full sm:w-auto">
          <Play className="mr-1.5 h-4 w-4" />
          {loading ? 'Loading...' : 'Execute'}
        </Button>
        {result && (
          <>
            <Button variant="outline" onClick={copyResult} className="w-full sm:w-auto">
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="outline" onClick={downloadResult} className="w-full sm:w-auto">
              <Download className="mr-1.5 h-4 w-4" />
              Download
            </Button>
          </>
        )}
      </div>
      {result && (
        <p className="text-xs text-muted-foreground">
          Downloaded data is derived from{' '}
          <a
            href="https://github.com/dr5hn/countries-states-cities-database"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Countries States Cities Database
          </a>{' '}
          and is available under{' '}
          <Link
            href="/docs/data-license"
            className="underline underline-offset-2 hover:text-foreground"
          >
            ODbL 1.0
          </Link>
          .
        </p>
      )}

      {/* Result */}
      {result && (
        <Card className="min-w-0 overflow-hidden">
          <div className="border-b px-4 py-2">
            <span className="text-sm font-medium">Result</span>
          </div>
          <CardContent className="p-0">
            <pre className="p-4 text-sm font-mono overflow-auto max-h-[400px]">{result}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
