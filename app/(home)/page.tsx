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
  Github,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import pkg from '../../package.json';

function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
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
            const eased = 1 - Math.pow(1 - progress, 3);
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
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Hero */}
        <section className="py-20 text-center">
          <Badge variant="secondary" className="mb-6">
            <Package className="mr-1.5 h-3 w-3" />v{pkg.version}
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Country State City
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Complete world location data. Simple, fast, reliable.
            <br />
            JSON, CSV, XML, YAML &mdash; your choice.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/docs" className={cn(buttonVariants({ size: 'lg' }))}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/docs/mcp"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              <Cpu className="mr-2 h-4 w-4" />
              MCP Integration
            </Link>
          </div>

          {/* Install command with tabs */}
          <div className="mx-auto mt-8 max-w-lg">
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
                  <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2.5 font-mono text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground overflow-x-auto">
                      <Terminal className="h-3.5 w-3.5 shrink-0" />
                      <span>{cmd}</span>
                    </div>
                    <CopyButton text={cmd} />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        <Separator />

        {/* Stats */}
        <section className="py-16">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { label: 'Countries', value: stats.countries, icon: Globe },
              { label: 'States', value: stats.states, icon: Building },
              { label: 'Cities', value: stats.cities, icon: MapPin },
            ].map((stat) => (
              <div key={stat.label}>
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                  <AnimatedCounter target={stat.value} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Features */}
        <section className="py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for Developers</h2>
            <p className="mt-2 text-muted-foreground">
              Everything you need to work with location data
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: FileText,
                title: 'Multiple Formats',
                description: 'Export as JSON, CSV, XML, or YAML with a single method call.',
              },
              {
                icon: Shield,
                title: 'ISO Standards',
                description: 'ISO 3166-1 compliant country codes trusted by enterprise apps.',
              },
              {
                icon: Globe,
                title: 'Global Coverage',
                description:
                  'Comprehensive data from 250+ countries with coordinates and metadata.',
              },
              {
                icon: Code2,
                title: 'Developer Ready',
                description:
                  'Full TypeScript support, tree-shakeable, works in Node.js and browsers.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="rounded-lg border bg-background p-2.5">
                    <feature.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
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

        {/* MCP Highlight */}
        <section className="py-16">
          <Card>
            <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:p-10">
              <div className="rounded-xl border bg-muted p-4">
                <Cpu className="h-8 w-8" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <h2 className="text-xl font-bold">MCP Integration</h2>
                  <Badge variant="secondary" className="text-xs">
                    New
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  Connect directly to Claude Desktop and other MCP-compatible AI assistants. Query
                  countries, states, and cities through natural language.
                </p>
              </div>
              <Link href="/docs/mcp" className={cn(buttonVariants())}>
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Quick Start */}
        <section className="py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Quick Start</h2>
            <p className="mt-2 text-muted-foreground">Up and running in seconds</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Install */}
            <Card>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Terminal</span>
              </div>
              <CardContent className="p-4">
                <pre className="font-mono text-sm">
                  <span className="text-muted-foreground">$ </span>
                  npm install @tansuasici/country-state-city
                </pre>
              </CardContent>
            </Card>

            {/* Usage */}
            <Card>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">app.ts</span>
              </div>
              <CardContent className="p-4">
                <pre className="font-mono text-sm leading-relaxed overflow-x-auto">
                  <span className="text-muted-foreground">{'import'}</span>
                  {' { CountryStateCity }\n  '}
                  <span className="text-muted-foreground">{'from'}</span>
                  {" '@tansuasici/country-state-city';\n\n"}
                  <span className="text-muted-foreground">{'const'}</span>
                  {' countries = CountryStateCity.getAllCountries();\n'}
                  <span className="text-muted-foreground">{'const'}</span>
                  {' states = CountryStateCity.getStatesByCountryId(225);'}
                </pre>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Footer */}
        <footer className="py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Country State City
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
