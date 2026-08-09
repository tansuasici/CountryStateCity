'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import * as m from 'motion/react-m';

interface HeroCoverageProps {
  rows: Array<{ index: string; label: string; value: number }>;
}

export function HeroCoverage({ rows }: HeroCoverageProps) {
  return (
    <m.div
      className="atlas-stats"
      aria-label="Dataset coverage"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {rows.map((stat) => (
        <div key={stat.label}>
          <span className="atlas-stat-index">{stat.index}</span>
          <strong>{stat.value.toLocaleString('en-US')}</strong>
          <span className="atlas-stat-label">{stat.label}</span>
        </div>
      ))}
      <Link href="/map" className="atlas-stat-action">
        <span>
          Explore dataset
          <strong>Open the interactive map</strong>
        </span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </m.div>
  );
}
