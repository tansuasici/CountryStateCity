'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, KeyRound, LoaderCircle, Play, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const endpoints = [
  { label: 'Countries', value: '/api/v1/countries?limit=3&fields=id,name,iso2,capital' },
  { label: 'Türkiye provinces', value: '/api/v1/subdivisions?country=TR&limit=5' },
  {
    label: 'Smart search',
    value: '/api/v1/search?q=Istanbull&country=TR&types=subdivision&limit=5',
  },
  {
    label: 'Reverse lookup',
    value:
      '/api/v1/reverse?latitude=40.981096&longitude=29.06514473&types=city,state,country&country=TR&polygon=true',
  },
  { label: 'Health', value: '/api/v1/health' },
] as const;

export default function HostedApiPlayground() {
  const [path, setPath] = useState<string>(endpoints[0].value);
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState(
    JSON.stringify(
      {
        data: [{ id: 225, name: 'Türkiye', iso2: 'TR', capital: 'Ankara' }],
        meta: { apiVersion: 'v1', dataVersion: 'sha256:…', pagination: { total: 250 } },
      },
      null,
      2
    )
  );
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const curl = useMemo(() => {
    const authentication = path.includes('/health') ? '' : " -H 'x-api-key: YOUR_API_KEY'";
    return `curl 'https://countrystatecity.tansuasici.com${path}'${authentication}`;
  }, [path]);

  async function runRequest() {
    setLoading(true);
    setStatus(null);
    try {
      const headers = new Headers();
      if (apiKey) headers.set('x-api-key', apiKey);
      const response = await fetch(path, { headers });
      setStatus(response.status);
      const body = await response.json();
      setResult(JSON.stringify(body, null, 2));
    } catch (error) {
      setResult(
        JSON.stringify(
          { error: error instanceof Error ? error.message : 'Request failed' },
          null,
          2
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyCurl() {
    await navigator.clipboard.writeText(curl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Play className="size-3.5" />
            </span>
            Hosted API playground
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Requests run in your browser; the key is never persisted.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          v1 · ODbL metadata included
        </div>
      </div>

      <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-5 border-b border-border p-4 sm:p-5 lg:border-r lg:border-b-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {endpoints.map((endpoint) => (
              <button
                key={endpoint.value}
                type="button"
                onClick={() => setPath(endpoint.value)}
                className={`min-w-0 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  path === endpoint.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted'
                }`}
              >
                <span className="block truncate">{endpoint.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="hosted-api-path" className="text-xs font-medium text-muted-foreground">
              Endpoint
            </label>
            <div className="flex min-w-0 overflow-hidden rounded-lg border border-input bg-background focus-within:ring-3 focus-within:ring-ring/40">
              <span className="flex shrink-0 items-center border-r border-border px-2.5 font-mono text-[11px] font-semibold text-primary">
                GET
              </span>
              <Input
                id="hosted-api-path"
                value={path}
                onChange={(event) => setPath(event.target.value)}
                className="h-10 min-w-0 rounded-none border-0 font-mono text-xs focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="hosted-api-key" className="text-xs font-medium text-muted-foreground">
              API key
            </label>
            <div className="relative">
              <KeyRound className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="hosted-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  path.includes('/health')
                    ? 'Not required for health'
                    : 'Required for data endpoints'
                }
                className="h-10 pl-9 font-mono text-xs"
                autoComplete="off"
              />
            </div>
          </div>

          <Button
            onClick={runRequest}
            disabled={loading || (!apiKey && !path.includes('/health'))}
            className="h-10 w-full"
          >
            {loading ? <LoaderCircle className="animate-spin" /> : <Play />}
            {loading ? 'Running…' : 'Run request'}
          </Button>

          <div className="min-w-0 rounded-xl border border-border bg-muted/35">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                cURL
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={copyCurl}
                aria-label="Copy cURL example"
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <pre className="overflow-x-auto p-3 text-[11px] leading-5 whitespace-pre-wrap text-foreground">
              {curl}
            </pre>
          </div>
        </div>

        <div className="min-w-0 bg-muted/35">
          <div className="flex h-12 items-center justify-between border-b border-border px-4 sm:px-5">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Response
            </span>
            {status !== null && (
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${status < 400 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}
              >
                {status}
              </span>
            )}
          </div>
          <pre className="max-h-[520px] min-h-72 overflow-auto p-4 font-mono text-[11px] leading-5 whitespace-pre sm:min-h-[430px] sm:p-5">
            {result}
          </pre>
        </div>
      </div>
    </div>
  );
}
