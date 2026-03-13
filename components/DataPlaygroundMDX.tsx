'use client';

import { useState, useEffect } from 'react';
import { Play, Copy, Download, Globe, Building, MapPin } from 'lucide-react';
import { CountryStateCity as CSC } from '../countrystatecity-npm/src/index.browser';
import { formatCountries, formatStates, formatCities } from '@/lib/formatters';
import { Country, State, City } from '@/types';

export default function DataPlaygroundMDX() {
  const [selectedAction, setSelectedAction] = useState('getCountries');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [result, setResult] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCountries(CSC.getAllCountries() as Country[]);
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      setStates(CSC.getStatesByCountryId(Number(selectedCountry)) as State[]);
      setSelectedState('');
    } else {
      setStates([]);
      setSelectedState('');
    }
  }, [selectedCountry]);

  const executeAction = async () => {
    setLoading(true);
    try {
      let data: any;
      switch (selectedAction) {
        case 'getCountries':
          data = (CSC.getAllCountries() as Country[]).slice(0, 10);
          break;
        case 'getCountryById':
          if (selectedCountry) data = CSC.getCountryById(Number(selectedCountry));
          break;
        case 'getStatesByCountryId':
          if (selectedCountry)
            data = (CSC.getStatesByCountryId(Number(selectedCountry)) as State[]).slice(0, 20);
          break;
        case 'getCitiesByStateId':
          if (selectedState)
            data = (CSC.getCitiesByStateId(Number(selectedState)) as City[]).slice(0, 20);
          break;
        default:
          data = { message: 'Select an action to execute' };
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

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.${selectedFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Interactive Playground</h2>
        <p className="text-fd-muted-foreground">Test the API and explore available data</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Action</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-fd-border bg-fd-background text-sm focus:outline-none focus:ring-2 focus:ring-fd-ring"
          >
            <option value="getCountries">Get Countries (First 10)</option>
            <option value="getCountryById">Get Country by ID</option>
            <option value="getStatesByCountryId">Get States by Country</option>
            <option value="getCitiesByStateId">Get Cities by State</option>
          </select>
        </div>

        {(selectedAction === 'getCountryById' ||
          selectedAction === 'getStatesByCountryId' ||
          selectedAction === 'getCitiesByStateId') && (
          <div>
            <label className="text-sm font-medium mb-1 block">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-fd-border bg-fd-background text-sm focus:outline-none focus:ring-2 focus:ring-fd-ring"
            >
              <option value="">Select country...</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedAction === 'getCitiesByStateId' && states.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-1 block">State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-fd-border bg-fd-background text-sm focus:outline-none focus:ring-2 focus:ring-fd-ring"
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

        <div>
          <label className="text-sm font-medium mb-1 block">Format</label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-fd-border bg-fd-background text-sm focus:outline-none focus:ring-2 focus:ring-fd-ring"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="xml">XML</option>
            <option value="yaml">YAML</option>
          </select>
        </div>
      </div>

      {/* Execute */}
      <div className="flex gap-2">
        <button
          onClick={executeAction}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Play size={16} />
          {loading ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <>
            <button
              onClick={copyResult}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-fd-border text-sm hover:bg-fd-accent"
            >
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={downloadResult}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-fd-border text-sm hover:bg-fd-accent"
            >
              <Download size={16} />
              Download
            </button>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-fd-border overflow-hidden">
          <div className="px-4 py-2 border-b border-fd-border bg-fd-muted/50">
            <span className="text-sm font-medium">Result</span>
          </div>
          <pre className="p-4 text-sm font-mono overflow-auto max-h-[400px] bg-fd-card">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
