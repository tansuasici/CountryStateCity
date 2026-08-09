'use client';

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Download,
  FileJson,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Metric = {
  id: string;
  label: string;
  numerator: number;
  denominator: number;
  value: number | null;
  definition: string;
  source: string;
};

type Country = {
  id: number;
  code: string;
  name: string;
  states: number;
  cities: number;
  coverageGaps: number;
  sourceStatus: {
    states: string;
    stateReasonCode: string | null;
    cities: string;
    cityReasonCode: string | null;
    coordinate: string;
  };
  metadata: {
    filled: number;
    denominator: number;
    completeness: number;
    gaps: Array<{ field: string; status: string; reasonCode: string }>;
  };
  cityCoordinateCoverage: number | null;
  cityQidCoverage: number | null;
  stateCoordinateExceptions: number;
  lowConfidenceQids: number;
};

type StateRecord = {
  id: number;
  publicId: string;
  name: string;
  countryCode: string;
  stateCode: string;
  type: string | null;
  typeStatus: string;
  entityType: string;
  lifecycleStatus: string;
  coordinateStatus: string;
  coordinateType: string | null;
  coordinateSource: string | null;
  latitude: string | null;
  longitude: string | null;
  cities: number;
  cityCoordinateCoverage: number | null;
  cityQidCoverage: number | null;
  knownIssueIds: string[];
};

type QualityCheck = {
  id: string;
  title: string;
  severity: 'critical' | 'high';
  entity: string;
  status: string;
  observed: number;
  excepted: number;
  unresolved: number;
};

type KnownIssue = {
  id: string;
  checkId: string;
  severity: string;
  expectedCount: number;
  owner: string;
  rationale: string;
  expiresAt: string;
  sourceRefs: string[];
};

type Dashboard = {
  generatedAt: string;
  dataVersion: string;
  packageVersion: string;
  release: {
    sourceRelease: string;
    sourceRevision: string;
    sourcePublishedAt: string;
    sourceAgeDays: number;
    license: { id: string; url: string };
  };
  gate: {
    passed: boolean;
    checksPassed: number;
    checksTotal: number;
    unresolvedBlockingFindings: number;
    policyVersion: string;
    deploymentBlocked: boolean;
  };
  totals: { countries: number; states: number; cities: number; districts: number };
  metrics: Metric[];
  countries: Country[];
  states: StateRecord[];
  checks: QualityCheck[];
  knownIssues: KnownIssue[];
  trend: Array<{
    packageVersion: string;
    generatedAt: string;
    checksPassed: number;
    checksTotal: number;
    unresolvedBlockingFindings: number;
    releaseChanges: number | null;
    breakingIdentityChanges: number | null;
  }>;
  operations: {
    publicScope: string;
    maintainerPanelPublished: boolean;
    maintainerScope: string;
  };
  exports: { json: string; csv: string };
};

const percent = (value: number | null) =>
  value === null
    ? 'N/A'
    : `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

const count = (value: number) => value.toLocaleString('en-US');

const statusLabel = (value: string) =>
  value === 'notApplicable' ? 'Not applicable' : value.replaceAll('-', ' ');

export default function QualityDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [countryCode, setCountryCode] = useState('TR');
  const [stateQuery, setStateQuery] = useState('');
  const [stateId, setStateId] = useState<number | null>(null);
  const [checkFilter, setCheckFilter] = useState<'all' | 'critical' | 'high'>('all');

  useEffect(() => {
    void fetch('/data/quality/dashboard.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Quality dashboard returned ${response.status}.`);
        return response.json();
      })
      .then((value: Dashboard) => setDashboard(value))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Quality evidence could not be loaded.')
      );
  }, []);

  const selectedCountry = useMemo(
    () => dashboard?.countries.find((country) => country.code === countryCode) ?? null,
    [countryCode, dashboard]
  );
  const countryStates = useMemo(() => {
    const needle = stateQuery.trim().toLocaleLowerCase();
    return (dashboard?.states ?? [])
      .filter((state) => state.countryCode === countryCode)
      .filter(
        (state) =>
          !needle ||
          state.name.toLocaleLowerCase().includes(needle) ||
          state.stateCode.toLocaleLowerCase().includes(needle) ||
          state.publicId.toLocaleLowerCase().includes(needle)
      );
  }, [countryCode, dashboard, stateQuery]);
  const selectedState = useMemo(
    () =>
      countryStates.find((state) => state.id === stateId) ??
      (dashboard?.states ?? []).find(
        (state) => state.countryCode === countryCode && state.id === stateId
      ) ??
      null,
    [countryCode, countryStates, dashboard, stateId]
  );
  const visibleChecks = useMemo(
    () =>
      dashboard?.checks.filter(
        (check) => checkFilter === 'all' || check.severity === checkFilter
      ) ?? [],
    [checkFilter, dashboard]
  );

  useEffect(() => {
    if (!dashboard) return;
    const first = dashboard.states.find((state) => state.countryCode === countryCode);
    setStateId(first?.id ?? null);
    setStateQuery('');
  }, [countryCode, dashboard]);

  if (error) {
    return (
      <div className="my-8 border border-destructive/30 bg-destructive/5 px-5 py-8 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div
        className="my-8 min-h-80 animate-pulse border border-border bg-muted/30"
        aria-label="Loading quality dashboard"
      />
    );
  }

  return (
    <section className="my-8 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <header className="border-b border-border px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
              <span className="text-primary">Release evidence</span>
              <span className="text-muted-foreground">v{dashboard.packageVersion}</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Quality you can inspect, not just trust.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Every value below is generated from the same release artifacts that block publishing
              when a critical or high regression is unresolved.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={dashboard.exports.json}
              download
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"
            >
              <FileJson className="size-3.5" /> JSON
            </a>
            <a
              href={dashboard.exports.csv}
              download
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/85"
            >
              <Download className="size-3.5" /> Country CSV
            </a>
          </div>
        </div>

        <div className="mt-6 grid border-y border-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex min-w-0 items-center gap-3 border-b border-border py-3 sm:border-r lg:border-b-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {dashboard.gate.passed ? (
                <ShieldCheck className="size-4" />
              ) : (
                <AlertTriangle className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {dashboard.gate.passed ? 'Deploy-safe' : 'Blocked'}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {dashboard.gate.checksPassed}/{dashboard.gate.checksTotal} checks passed
              </p>
            </div>
          </div>
          <div className="min-w-0 border-b border-border py-3 sm:pl-4 lg:border-r lg:border-b-0">
            <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Data version
            </p>
            <p className="mt-1 truncate font-mono text-xs" title={dashboard.dataVersion}>
              {dashboard.dataVersion.replace('sha256:', '').slice(0, 12)}
            </p>
          </div>
          <div className="min-w-0 border-b border-border py-3 sm:border-r sm:pl-4 lg:border-b-0">
            <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Pinned source
            </p>
            <p className="mt-1 truncate text-xs font-medium">{dashboard.release.sourceRelease}</p>
          </div>
          <div className="min-w-0 py-3 sm:pl-4">
            <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Source age at QA
            </p>
            <p className="mt-1 text-xs font-medium">{dashboard.release.sourceAgeDays} days</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        {[
          ['Countries', dashboard.totals.countries],
          ['Administrative areas', dashboard.totals.states],
          ['Places', dashboard.totals.cities],
          ['Türkiye districts', dashboard.totals.districts],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`min-w-0 px-4 py-4 sm:px-6 ${index % 2 === 0 ? 'border-r border-border' : ''} ${index < 2 ? 'border-b border-border lg:border-b-0' : ''} lg:border-r lg:last:border-r-0`}
          >
            <div className="text-xl font-semibold tabular-nums sm:text-2xl">
              {count(Number(value))}
            </div>
            <div className="mt-1 text-[10px] tracking-wider text-muted-foreground uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="border-b border-border px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
              Scorecard
            </p>
            <h3 className="mt-1 text-lg font-semibold">Coverage and completeness</h3>
          </div>
          <p className="text-xs text-muted-foreground">Numerator / denominator · release source</p>
        </div>
        <div className="mt-4 grid border-t border-l border-border sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.metrics.map((metric) => (
            <article key={metric.id} className="min-w-0 border-r border-b border-border p-4">
              <div className="flex items-baseline justify-between gap-2">
                <strong className="text-xl font-semibold tabular-nums">
                  {percent(metric.value)}
                </strong>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {count(metric.numerator)} / {count(metric.denominator)}
                </span>
              </div>
              <h4 className="mt-2 text-xs font-semibold">{metric.label}</h4>
              <p
                className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground"
                title={metric.definition}
              >
                {metric.definition}
              </p>
              <code
                className="mt-3 block truncate text-[9px] text-primary/80"
                title={metric.source}
              >
                {metric.source}
              </code>
            </article>
          ))}
        </div>
      </div>

      <div className="border-b border-border">
        <div className="grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <div className="border-b border-border p-4 sm:p-6 lg:border-r lg:border-b-0 lg:p-8">
            <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
              Drill down
            </p>
            <h3 className="mt-1 text-lg font-semibold">Country → state → record</h3>
            <label className="mt-5 block text-xs text-muted-foreground">
              Country
              <select
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-3 focus:ring-ring/35"
              >
                {dashboard.countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} · {country.code}
                  </option>
                ))}
              </select>
            </label>

            {selectedCountry && (
              <div className="mt-5 divide-y divide-border border-y border-border text-xs">
                {[
                  [
                    'Administrative areas',
                    count(selectedCountry.states),
                    selectedCountry.sourceStatus.states,
                  ],
                  ['Places', count(selectedCountry.cities), selectedCountry.sourceStatus.cities],
                  [
                    'Metadata completeness',
                    percent(selectedCountry.metadata.completeness),
                    `${selectedCountry.metadata.filled}/${selectedCountry.metadata.denominator}`,
                  ],
                  [
                    'City coordinates',
                    percent(selectedCountry.cityCoordinateCoverage),
                    'paired lat/lon',
                  ],
                  [
                    'Verified city QIDs',
                    percent(selectedCountry.cityQidCoverage),
                    'retained after audit',
                  ],
                  ['Known coverage gaps', count(selectedCountry.coverageGaps), 'classified'],
                ].map(([label, value, context]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto] gap-4 py-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium">
                      {value}
                      <small className="ml-2 font-normal text-muted-foreground">
                        {statusLabel(context)}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold">State records</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {countryStates.length} matching records in {selectedCountry?.name}
                </p>
              </div>
              <label className="relative block sm:w-64">
                <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={stateQuery}
                  onChange={(event) => setStateQuery(event.target.value)}
                  placeholder="Name, code, or public ID"
                  className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-xs outline-none focus:ring-3 focus:ring-ring/35"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(12rem,0.75fr)_minmax(0,1.25fr)]">
              <div className="max-h-80 overflow-y-auto border-y border-border">
                {countryStates.length > 0 ? (
                  countryStates.map((state) => (
                    <button
                      key={state.id}
                      type="button"
                      onClick={() => setStateId(state.id)}
                      className={`flex w-full items-center gap-3 border-b border-border px-1 py-3 text-left last:border-b-0 hover:bg-muted/60 ${selectedState?.id === state.id ? 'bg-primary/8' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{state.name}</span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                          {state.countryCode}-{state.stateCode} · {count(state.cities)} places
                        </span>
                      </span>
                      {state.knownIssueIds.length > 0 && (
                        <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  ))
                ) : (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No state records match this filter.
                  </p>
                )}
              </div>

              <div className="min-w-0 border border-border bg-muted/20 p-4">
                {selectedState ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{selectedState.name}</p>
                        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                          {selectedState.publicId}
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-2 py-1 font-mono text-[10px]">
                        {selectedState.countryCode}-{selectedState.stateCode}
                      </span>
                    </div>
                    <dl className="mt-3 divide-y divide-border text-xs">
                      {[
                        ['Entity', selectedState.entityType],
                        ['Type', selectedState.type ?? selectedState.typeStatus],
                        ['Lifecycle', selectedState.lifecycleStatus],
                        ['Coordinates', selectedState.coordinateStatus],
                        ['Coordinate method', selectedState.coordinateType ?? 'unavailable'],
                        [
                          'Coordinate source',
                          selectedState.coordinateSource ?? 'documented exception',
                        ],
                        ['Latitude', selectedState.latitude ?? 'null'],
                        ['Longitude', selectedState.longitude ?? 'null'],
                        ['Child places', count(selectedState.cities)],
                        [
                          'Child coordinate coverage',
                          percent(selectedState.cityCoordinateCoverage),
                        ],
                        ['Child QID coverage', percent(selectedState.cityQidCoverage)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-3 py-2.5"
                        >
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="break-words text-right font-medium">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {selectedState.knownIssueIds.length > 0 && (
                      <div className="mt-4 border-l-2 border-amber-500 bg-amber-500/8 px-3 py-2 text-[11px] leading-4">
                        Reviewed exception: {selectedState.knownIssueIds.join(', ')}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="flex min-h-72 items-center justify-center text-center text-xs text-muted-foreground">
                    This country has no published state record. Its coverage status and reason code
                    remain visible in the country summary.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid border-b border-border xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div className="min-w-0 border-b border-border p-4 sm:p-6 xl:border-r xl:border-b-0 xl:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
                Release gate
              </p>
              <h3 className="mt-1 text-lg font-semibold">Blocking checks</h3>
            </div>
            <div className="flex gap-1" aria-label="Filter quality checks">
              {(['all', 'critical', 'high'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setCheckFilter(filter)}
                  className={`h-8 rounded-lg px-3 text-[11px] capitalize ${checkFilter === filter ? 'bg-foreground text-background' : 'border border-border hover:bg-muted'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left text-xs">
              <thead className="border-y border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th className="py-2.5 pr-4 font-medium">Check</th>
                  <th className="px-3 py-2.5 font-medium">Severity</th>
                  <th className="px-3 py-2.5 text-right font-medium">Observed</th>
                  <th className="px-3 py-2.5 text-right font-medium">Excepted</th>
                  <th className="py-2.5 pl-3 text-right font-medium">Unresolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleChecks.map((check) => (
                  <tr key={check.id}>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2 font-medium">
                        <Check className="size-3.5 shrink-0 text-primary" /> {check.title}
                      </span>
                      <code className="mt-1 block pl-5 text-[9px] text-muted-foreground">
                        {check.id}
                      </code>
                    </td>
                    <td className="px-3 py-3 capitalize">{check.severity}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{count(check.observed)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{count(check.excepted)}</td>
                    <td className="py-3 pl-3 text-right font-semibold tabular-nums">
                      {count(check.unresolved)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="p-4 sm:p-6 xl:p-8">
          <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
            Release trend
          </p>
          <h3 className="mt-1 text-lg font-semibold">Baseline established</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            The current release is the first dashboard history point. Deltas will append from the
            next release; no earlier values are invented.
          </p>
          {dashboard.trend.map((release) => (
            <div key={release.packageVersion} className="mt-5 border-y border-border py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs">v{release.packageVersion}</span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  <Check className="size-3.5" /> {release.checksPassed}/{release.checksTotal}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(release.checksPassed / release.checksTotal) * 100}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase">
                    Release changes
                  </span>
                  <strong className="mt-1 block tabular-nums">
                    {release.releaseChanges === null ? 'N/A' : count(release.releaseChanges)}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase">
                    Breaking IDs
                  </span>
                  <strong className="mt-1 block tabular-nums">
                    {release.breakingIdentityChanges ?? 'N/A'}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </aside>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="border-b border-border p-4 sm:p-6 lg:border-r lg:border-b-0 lg:p-8">
          <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
            Known issues
          </p>
          <h3 className="mt-1 text-lg font-semibold">Reviewed, scoped, and expiring</h3>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {dashboard.knownIssues.map((issue) => (
              <article key={issue.id} className="py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="break-words text-xs font-semibold">{issue.id}</h4>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {issue.rationale}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-1 font-mono text-[9px] uppercase">
                    {count(issue.expectedCount)} reviewed
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] text-muted-foreground">
                  <span>check: {issue.checkId}</span>
                  <span>owner: {issue.owner}</span>
                  <span>expires: {issue.expiresAt}</span>
                  {issue.sourceRefs.map((source) => (
                    <span key={source}>source: {source}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="p-4 sm:p-6 lg:p-8">
          <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
            Visibility boundary
          </p>
          <h3 className="mt-1 text-lg font-semibold">Public evidence only</h3>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {dashboard.operations.publicScope}
          </p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {dashboard.operations.maintainerScope}
          </p>
          <div className="mt-5 border-t border-border pt-4 text-[11px] text-muted-foreground">
            Generated{' '}
            {new Date(dashboard.generatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            {' · '}
            <a
              href={dashboard.release.license.url}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {dashboard.release.license.id}
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
