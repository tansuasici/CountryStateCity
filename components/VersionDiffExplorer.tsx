'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, LoaderCircle, Rss, Search, ShieldAlert } from 'lucide-react';

type Totals = {
  total: number;
  breakingIdentity: number;
  changeTypes: Record<string, number>;
};

type Release = {
  releaseId: string;
  fromVersion: string;
  toVersion: string;
  totals: Totals;
  summaryUrl: string;
};

type Summary = {
  releaseId: string;
  totals: Totals;
  identity: { breakingChanges: number; migratedChanges: number };
  countries: Array<{ countryCode: string } & Totals>;
  schemaChanges: Array<{ entityType: string; addedFields: string[]; removedFields: string[] }>;
  downloads: { csv: string };
};

type Change = {
  publicId: string;
  entityType: string;
  id: number;
  name: string;
  countryCode: string | null;
  stateCode: string | null;
  changeTypes: string[];
  changedFields: Array<{ field: string; before: unknown; after: unknown }>;
  breakingIdentity: boolean;
  migration: unknown;
};

export default function VersionDiffExplorer() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [releaseId, setReleaseId] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [countryCode, setCountryCode] = useState('TR');
  const [changes, setChanges] = useState<Change[]>([]);
  const [entityType, setEntityType] = useState('all');
  const [changeType, setChangeType] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/data/versions/index.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Release index returned ${response.status}.`);
        return response.json();
      })
      .then((value: { releases: Release[] }) => {
        setReleases(value.releases);
        setReleaseId(value.releases[0]?.releaseId || '');
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Release index failed.')
      );
  }, []);

  useEffect(() => {
    if (!releaseId) return;
    setLoading(true);
    setError('');
    void Promise.all([
      fetch(`/data/versions/${releaseId}/summary.json`).then((response) => response.json()),
      fetch(`/data/versions/${releaseId}/countries/${countryCode.toLowerCase()}.json`).then(
        (response) => {
          if (!response.ok) throw new Error(`${countryCode} has no changes in this release.`);
          return response.json();
        }
      ),
    ])
      .then(([nextSummary, country]) => {
        setSummary(nextSummary as Summary);
        setChanges((country as { changes: Change[] }).changes);
      })
      .catch((reason) => {
        setChanges([]);
        setError(reason instanceof Error ? reason.message : 'Diff could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [releaseId, countryCode]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return changes
      .filter((change) => entityType === 'all' || change.entityType === entityType)
      .filter((change) => changeType === 'all' || change.changeTypes.includes(changeType))
      .filter(
        (change) =>
          !needle ||
          change.name.toLocaleLowerCase().includes(needle) ||
          change.publicId.toLocaleLowerCase().includes(needle)
      );
  }, [changeType, changes, entityType, query]);

  const release = releases.find((item) => item.releaseId === releaseId);
  const countryDownload = releaseId
    ? `/data/versions/${releaseId}/countries/${countryCode.toLowerCase()}.json`
    : '#';
  const csvDownload = releaseId
    ? `/data/versions/${releaseId}/${summary?.downloads.csv || 'changes.csv'}`
    : '#';

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
            Release history
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            What changed between versions?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter real entity changes without losing identity migrations or source context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/changes/feed.xml"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted"
          >
            <Rss className="size-3.5" /> RSS
          </a>
          <a
            href={countryDownload}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted"
          >
            <Download className="size-3.5" /> Country JSON
          </a>
          <a
            href={csvDownload}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/85"
          >
            <Download className="size-3.5" /> Full CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border md:grid-cols-4">
        {[
          ['Total changes', summary?.totals.total ?? release?.totals.total ?? '—'],
          ['Added', summary?.totals.changeTypes.added ?? '—'],
          [
            'Moved / renamed',
            (summary?.totals.changeTypes.moved || 0) + (summary?.totals.changeTypes.renamed || 0) ||
              '—',
          ],
          ['Breaking IDs', summary?.identity.breakingChanges ?? '—'],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`min-w-0 p-4 sm:p-5 ${index % 2 === 0 ? 'border-r border-border' : ''} ${index < 2 ? 'border-b border-border md:border-b-0' : ''} md:border-r md:last:border-r-0`}
          >
            <div className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
            <div className="mt-1 text-[10px] tracking-wider text-muted-foreground uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-5">
        <label className="space-y-1 text-xs text-muted-foreground">
          Version
          <select
            value={releaseId}
            onChange={(event) => setReleaseId(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          >
            {releases.map((item) => (
              <option key={item.releaseId} value={item.releaseId}>
                {item.fromVersion} → {item.toVersion}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Country
          <select
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          >
            {(summary?.countries || [{ countryCode: 'TR' }]).map((country) => (
              <option key={country.countryCode} value={country.countryCode}>
                {country.countryCode}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Entity
          <select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          >
            <option value="all">All entities</option>
            <option value="country">Country</option>
            <option value="state">State</option>
            <option value="city">City</option>
            <option value="district">District</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Change
          <select
            value={changeType}
            onChange={(event) => setChangeType(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
          >
            <option value="all">All changes</option>
            {Object.keys(summary?.totals.changeTypes || {}).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Entity history
          <span className="relative block">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or public ID"
              className="h-9 w-full rounded-lg border border-input bg-background pr-2.5 pl-8 text-sm text-foreground outline-none focus:ring-3 focus:ring-ring/40"
            />
          </span>
        </label>
      </div>

      <div className="min-h-72">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Loading version diff…
          </div>
        ) : error ? (
          <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
              <span>{visible.length.toLocaleString()} matching changes</span>
              <span>Showing first 100</span>
            </div>
            <div className="divide-y divide-border">
              {visible.slice(0, 100).map((change) => (
                <details
                  key={`${change.publicId}:${change.changeTypes.join(',')}`}
                  className="group px-4 py-3 sm:px-5"
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <strong className="truncate text-sm">{change.name}</strong>
                        {change.breakingIdentity && (
                          <ShieldAlert className="size-3.5 text-destructive" />
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {change.publicId}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {change.changeTypes.map((type) => (
                        <span
                          key={type}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {type}
                        </span>
                      ))}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-2 border-l border-border pl-3">
                    {change.changedFields.length ? (
                      change.changedFields.map((field) => (
                        <div
                          key={field.field}
                          className="grid min-w-0 gap-1 text-xs sm:grid-cols-[8rem_minmax(0,1fr)]"
                        >
                          <span className="font-mono text-muted-foreground">{field.field}</span>
                          <span className="flex min-w-0 items-center gap-2">
                            <code className="truncate text-destructive">
                              {JSON.stringify(field.before)}
                            </code>
                            <ArrowRight className="size-3 shrink-0" />
                            <code className="truncate text-primary">
                              {JSON.stringify(field.after)}
                            </code>
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Entity {change.changeTypes[0]}.{' '}
                        {change.migration ? 'A versioned identity migration is attached.' : ''}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
