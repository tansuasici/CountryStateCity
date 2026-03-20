'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  Building,
  MapPin,
  Code2,
  FileText,
  ArrowRight,
  Shield,
  Cpu,
  Package,
  Check,
  Copy,
  Terminal,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import pkg from '../../package.json';

/* ---- Animated Counter ---- */
function AnimatedCounter({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current || started.current || target === 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}
    </span>
  );
}

/* ---- Copy Button ---- */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={copy}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

const installCommands: Record<string, string> = {
  npm: 'npm install @tansuasici/country-state-city',
  yarn: 'yarn add @tansuasici/country-state-city',
  pnpm: 'pnpm add @tansuasici/country-state-city',
  bun: 'bun add @tansuasici/country-state-city',
};

export default function HomePage() {
  const [stats, setStats] = useState({ countries: 0, states: 0, cities: 0 });
  const [activeTab, setActiveTab] = useState('npm');

  useEffect(() => {
    const loadStats = async () => {
      const { getStats } = await import('@/lib/countries');
      setStats(getStats());
    };
    loadStats();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="grid-bg relative overflow-hidden border-b">
        <div className="mx-auto max-w-5xl px-6 pb-24 pt-28 md:pb-32 md:pt-36">
          <div className="animate-fade-up">
            <Badge variant="outline" className="mb-8 border-primary/30 text-primary">
              <Package className="mr-1.5 h-3 w-3" />v{pkg.version}
            </Badge>
          </div>

          <h1 className="animate-fade-up delay-100 font-[family-name:var(--font-display)] text-5xl leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
            World location data,
            <br />
            <span className="text-primary">beautifully structured.</span>
          </h1>

          <p className="animate-fade-up delay-200 mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed">
            250+ countries, 5,000+ states, 150,000+ cities. All with coordinates, ISO codes, and
            metadata &mdash; in JSON, CSV, XML, or YAML.
          </p>

          <div className="animate-fade-up delay-300 mt-10 flex items-center gap-3">
            <Link href="/docs" className={cn(buttonVariants({ size: 'lg' }))}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/map" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              <Globe className="mr-2 h-4 w-4" />
              Explore Map
            </Link>
          </div>

          {/* Install command */}
          <div className="animate-fade-up delay-400 mt-10 max-w-lg">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-2 h-8">
                {Object.keys(installCommands).map((pm) => (
                  <TabsTrigger key={pm} value={pm} className="text-xs px-3 h-6">
                    {pm}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(installCommands).map(([pm, cmd]) => (
                <TabsContent key={pm} value={pm} className="mt-0">
                  <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 font-mono text-sm shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground overflow-x-auto">
                      <Terminal className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                      <span>{cmd}</span>
                    </div>
                    <CopyButton text={cmd} />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-chart-2/5 blur-3xl" />
      </section>

      <div className="mx-auto max-w-5xl px-6">
        {/* Stats */}
        <section className="py-20">
          <div className="grid grid-cols-3 gap-8">
            {[
              { label: 'Countries', value: stats.countries, icon: Globe },
              { label: 'States', value: stats.states, icon: Building },
              { label: 'Cities', value: stats.cities, icon: MapPin },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-3 h-5 w-5 text-primary/70" />
                <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
                  <AnimatedCounter target={stat.value} />
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground tracking-wide uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Features */}
        <section className="py-20">
          <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
            Capabilities
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl mb-4">
            Built for developers
          </h2>
          <p className="text-muted-foreground max-w-md mb-10">
            Everything you need to work with location data, from quick lookups to bulk exports.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: FileText,
                title: 'Multiple Formats',
                description: 'Export as JSON, CSV, XML, or YAML with a single method call.',
              },
              {
                icon: Shield,
                title: 'ISO 3166-1 Compliant',
                description:
                  'Country codes, subdivisions, and metadata that enterprise apps trust.',
              },
              {
                icon: Globe,
                title: 'Global Coverage',
                description:
                  '250+ countries with coordinates, timezones, currencies, and translations.',
              },
              {
                icon: Code2,
                title: 'TypeScript Native',
                description:
                  'Full type definitions, tree-shakeable, works in Node.js and browsers.',
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="group transition-colors hover:border-primary/20 hover:bg-primary/[0.02]"
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="rounded-md border bg-muted p-2 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="pt-0.5">
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* MCP */}
        <section className="py-20">
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center">
            <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.03] p-5">
              <Cpu className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
                  MCP Integration
                </h2>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  New
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Connect directly to Claude Desktop and other MCP-compatible AI assistants. Query
                countries, states, and cities through natural language.
              </p>
            </div>
            <Link href="/docs/mcp" className={cn(buttonVariants({ variant: 'outline' }))}>
              Learn More
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <Separator />

        {/* Quick Start */}
        <section className="py-20">
          <p className="text-sm font-medium text-primary tracking-wide uppercase mb-3">
            Quick Start
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl mb-10">
            Up and running in seconds
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b px-4 py-2.5 bg-muted/50">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Terminal</span>
              </div>
              <div className="p-5">
                <pre className="font-mono text-sm">
                  <span className="text-primary/50">$ </span>
                  npm install @tansuasici/country-state-city
                </pre>
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b px-4 py-2.5 bg-muted/50">
                <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">app.ts</span>
              </div>
              <div className="p-5">
                <pre className="font-mono text-sm leading-relaxed overflow-x-auto">
                  <span className="text-primary/60">import</span>
                  {' { CountryStateCity }\n  '}
                  <span className="text-primary/60">from</span>
                  {" '@tansuasici/country-state-city';\n\n"}
                  <span className="text-primary/60">const</span>
                  {' countries = CountryStateCity\n  .getAllCountries();\n'}
                  <span className="text-primary/60">const</span>
                  {' states = CountryStateCity\n  .getStatesByCountryId(225);'}
                </pre>
              </div>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Footer */}
        <footer className="py-10">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Country State City &middot; MIT License
            </p>
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <a
                href="https://tansuasici.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                tansuasici
              </a>
              <a
                href="https://github.com/tansuasici/CountryStateCity"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/@tansuasici/country-state-city"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                NPM
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
