import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Braces, Database, GitFork, Sparkles } from 'lucide-react';
import { DataFlowVisual } from '@/components/home/DataFlowVisual';
import { DataJourney } from '@/components/home/DataJourney';
import { HeroCoverage } from '@/components/home/HeroCoverage';
import { HeroIntro } from '@/components/home/HeroIntro';
import { MotionSection } from '@/components/home/MotionSection';
import { CodeBlock, type CodeLine } from '@/components/ui/code-block';
import { STATS } from '@/lib/stats';

const quickStartLines: CodeLine[] = [
  [{ text: 'import ' }, { text: '{ CountryStateCity }', tone: 'muted' }],
  [{ text: '  from ' }, { text: "'@tansuasici/country-state-city'", tone: 'accent' }, { text: ';' }],
  [{ text: '' }],
  [{ text: 'const turkey = CountryStateCity' }],
  [{ text: '  .getCountryByIso2(' }, { text: "'TR'", tone: 'accent' }, { text: ');' }],
  [{ text: '' }],
  [{ text: 'const states = CountryStateCity' }],
  [{ text: '  .getStatesByCountryId(turkey.id);' }],
];

const quickStartSource = quickStartLines
  .map((line) => line.map((token) => token.text).join(''))
  .join('\n');

const statRows = [
  { index: '01', label: 'Countries', value: STATS.countries },
  { index: '02', label: 'States', value: STATS.states },
  { index: '03', label: 'Cities', value: STATS.cities },
];

const capabilityRows = [
  {
    index: '01',
    title: 'One typed API',
    description:
      'Country, state, and city lookups with TypeScript definitions for browser and Node.',
    icon: Braces,
  },
  {
    index: '02',
    title: 'Four export formats',
    description: 'Move the same records through JSON, CSV, XML, or YAML without a second dataset.',
    icon: Database,
  },
  {
    index: '03',
    title: 'Natural-language access',
    description: 'Use the included MCP server from compatible AI assistants and developer tools.',
    icon: Sparkles,
  },
];

export default function HomePage() {
  return (
    <div className="home-atlas overflow-x-clip">
      <section className="atlas-hero">
        <div className="atlas-hero-noise" aria-hidden="true" />
        <div className="atlas-hero-inner">
          <HeroIntro />

          <DataFlowVisual />

          <HeroCoverage rows={statRows} />
        </div>
      </section>

      <main>
        <MotionSection className="home-section home-proof">
          <div className="section-heading">
            <p>Trust the record</p>
            <h2>Open data, without the black box.</h2>
          </div>
          <div className="proof-ledger">
            <div>
              <span>Sources</span>
              <strong>Documented</strong>
              <p>Every published layer keeps its license, attribution, and provenance visible.</p>
            </div>
            <div>
              <span>Quality</span>
              <strong>Automated</strong>
              <p>
                Schema, identity, parent relationships, coordinates, and artifacts pass release
                gates.
              </p>
            </div>
            <div>
              <span>Boundaries</span>
              <strong>Türkiye pilot</strong>
              <p>
                Verified province and district polygons ship separately from global center points.
              </p>
            </div>
            <Link href="/docs/data-quality" className="text-link">
              Inspect quality and provenance <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </MotionSection>

        <DataJourney />

        <MotionSection className="home-section home-capabilities">
          <div className="section-heading">
            <p>Built for developers</p>
            <h2 className="capabilities-title">
              <span>One dataset.</span>
              <span>Every surface.</span>
            </h2>
            <span>
              Search it in an application, load it in Node, explore it on a map, or query it through
              MCP.
            </span>
          </div>
          <div className="capability-ledger">
            {capabilityRows.map((item) => (
              <div className="capability-row" key={item.index}>
                <span>{item.index}</span>
                <item.icon aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </MotionSection>

        <MotionSection className="code-stage">
          <div className="code-stage-copy">
            <p>Quick start</p>
            <h2>From install to first lookup in three lines.</h2>
            <span>The same dataset powers typed APIs, raw JSON exports, and country shards.</span>
            <Link href="/docs/api-reference" className="text-link text-link-light">
              Read the API reference <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <CodeBlock
            className="self-center"
            aria-label="TypeScript quick start example"
            title="location.ts"
            meta="TypeScript"
            lines={quickStartLines}
            copyText={quickStartSource}
          />
        </MotionSection>

        <MotionSection className="home-final">
          <div>
            <p>Open data. Clear provenance.</p>
            <h2>Put the world in your next build.</h2>
          </div>
          <div className="home-final-actions">
            <Link href="/docs" className="atlas-button atlas-button-primary">
              Read the docs <ArrowRight aria-hidden="true" />
            </Link>
            <a
              href="https://github.com/tansuasici/CountryStateCity"
              target="_blank"
              rel="noreferrer"
              className="atlas-button atlas-button-light"
            >
              <GitFork aria-hidden="true" /> View source
            </a>
          </div>
        </MotionSection>
      </main>

      <footer className="atlas-footer">
        <Link href="/" className="atlas-footer-brand">
          <Image src="/logo.png" alt="" width={24} height={24} />
          Country State City
        </Link>
        <p>
          © {new Date().getFullYear()} · Code MIT · Data{' '}
          <Link href="/docs/data-license">ODbL 1.0</Link>
        </p>
        <div>
          <Link href="/map">Map</Link>
          <Link href="/docs">Docs</Link>
        </div>
      </footer>
    </div>
  );
}
