'use client';

import Link from 'next/link';
import { ArrowRight, Map } from 'lucide-react';
import * as m from 'motion/react-m';
import { InstallCommand } from './InstallCommand';

const container = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0.08, staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function HeroIntro() {
  return (
    <m.div className="atlas-copy" variants={container} initial="hidden" animate="visible">
      <m.div className="atlas-kicker" variants={item}>
        Open world location data
      </m.div>

      <m.h1 variants={item}>
        <span>Country.</span>
        <span>State.</span>
        <span>City.</span>
      </m.h1>

      <m.p className="atlas-promise" variants={item}>
        World location data with a visible source, a stable package, and no mystery between the map
        and your code.
      </m.p>

      <m.div className="atlas-actions" variants={item}>
        <Link href="/docs" className="atlas-button atlas-button-primary">
          Start building <ArrowRight aria-hidden="true" />
        </Link>
        <Link href="/map" className="atlas-button atlas-button-ghost">
          <Map aria-hidden="true" /> Explore the map
        </Link>
      </m.div>

      <m.div variants={item}>
        <InstallCommand />
      </m.div>
    </m.div>
  );
}
