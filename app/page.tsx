'use client';

import { Card, CardBody, Button, Chip, Link, Code, Snippet } from '@heroui/react';
import CountryStateCity from '@/components/CountryStateCity';
import {
  Globe,
  Building,
  Home,
  Code2,
  FileText,
  ArrowRight,
  Shield,
  Cpu,
  MapPin,
  Package,
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [stats, setStats] = useState({ countries: 0, states: 0, cities: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const { getStats } = await import('@/lib/countries');
      setStats(getStats());
    };
    loadStats();
  }, []);

  const features = [
    {
      icon: FileText,
      title: 'Multiple Formats',
      description: 'Export as JSON, CSV, XML, or YAML with a single method call',
      gradient: 'from-amber-500 to-orange-600',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
    },
    {
      icon: Shield,
      title: 'ISO Standards',
      description: 'ISO 3166-1 compliant country codes trusted by enterprise apps',
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      icon: Globe,
      title: 'Global Coverage',
      description: 'Comprehensive data from 250+ countries with coordinates and metadata',
      gradient: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      icon: Code2,
      title: 'Developer Ready',
      description: 'Full TypeScript support, tree-shakeable, works in Node.js and browsers',
      gradient: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50 dark:bg-violet-950/20',
    },
  ];

  return (
    <div className="dot-grid min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <section className="hero-mesh rounded-3xl px-6 py-20 md:py-28 mb-20">
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 mb-6 fade-in-up floating-badge">
              <Package size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 tracking-wide uppercase">
                v2.0.11
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight fade-in-up stagger-1">
              <span className="gradient-text">Country State City</span>
            </h1>

            <p className="text-lg md:text-xl text-default-500 mb-10 max-w-xl mx-auto leading-relaxed fade-in-up stagger-2">
              Complete world location data. Simple, fast, reliable.
              <br className="hidden md:block" />
              JSON, CSV, XML, YAML &mdash; your choice.
            </p>

            <div className="flex gap-3 justify-center flex-wrap fade-in-up stagger-3">
              <Button
                color="primary"
                size="lg"
                as={Link}
                href="/docs"
                endContent={<ArrowRight size={18} />}
                className="font-semibold px-8"
              >
                Get Started
              </Button>
              <Button
                variant="flat"
                size="lg"
                as={Link}
                href="/mcp"
                startContent={<Cpu size={18} />}
                className="font-semibold px-8"
              >
                MCP Integration
              </Button>
            </div>

            <div className="mt-8 fade-in-up stagger-4">
              <Snippet size="sm" symbol="$" className="snippet-enhanced">
                npm install @tansuasici/country-state-city
              </Snippet>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="mb-20 fade-in-up stagger-3">
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: 'Countries', value: stats.countries, icon: Globe, color: 'text-indigo-500' },
              { label: 'States', value: stats.states, icon: Building, color: 'text-emerald-500' },
              { label: 'Cities', value: stats.cities, icon: MapPin, color: 'text-amber-500' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className={`mx-auto mb-2 ${stat.color}`} size={28} />
                <p className="text-3xl md:text-4xl font-bold number-ticker">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-sm text-default-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="section-divider" />

        {/* Country State City Selector */}
        <section className="mb-20">
          <CountryStateCity />
        </section>

        <div className="section-divider" />

        {/* Features Grid */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Built for Developers</h2>
            <p className="text-default-500 text-lg">
              Everything you need to work with location data
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className={`glow-card gradient-border p-1 ${feature.bg}`}>
                <CardBody className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0`}
                    >
                      <feature.icon size={22} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1">{feature.title}</h3>
                      <p className="text-sm text-default-500 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        <div className="section-divider" />

        {/* MCP Highlight */}
        <section className="mb-20">
          <Card className="hero-mesh overflow-hidden border border-indigo-200/50 dark:border-indigo-800/30">
            <CardBody className="p-8 md:p-12">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0 pulse-glow">
                  <Cpu size={36} className="text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <Chip size="sm" variant="flat" color="primary" className="mb-3">
                    New
                  </Chip>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">MCP Integration</h2>
                  <p className="text-default-500 max-w-lg">
                    Connect directly to Claude Desktop and other MCP-compatible AI assistants. Query
                    countries, states, and cities through natural language.
                  </p>
                </div>
                <Button
                  color="primary"
                  size="lg"
                  as={Link}
                  href="/mcp"
                  endContent={<ArrowRight size={18} />}
                  className="shrink-0 font-semibold px-8"
                >
                  Learn More
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Quick Start */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Quick Start</h2>
            <p className="text-default-500 text-lg">Up and running in seconds</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="code-block-enhanced">
              <CardBody className="p-0">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-default-200 dark:border-default-100/10">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <span className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-xs text-default-400 font-mono ml-2">install.sh</span>
                </div>
                <div className="p-5">
                  <Snippet className="w-full snippet-enhanced" symbol="$">
                    npm install @tansuasici/country-state-city
                  </Snippet>
                </div>
              </CardBody>
            </Card>

            <Card className="code-block-enhanced overflow-hidden">
              <CardBody className="p-0">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-default-200 dark:border-default-100/10">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <span className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-xs text-default-400 font-mono ml-2">app.ts</span>
                </div>
                <pre className="p-5 text-sm font-mono overflow-x-auto bg-[#1e1b4b] dark:bg-[#0f0d1e] text-indigo-100">
                  {`import { CountryStateCity }
  from '@tansuasici/country-state-city';

const countries = CountryStateCity.getAllCountries();
const states = CountryStateCity.getStatesByCountryId(225);`}
                </pre>
              </CardBody>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
