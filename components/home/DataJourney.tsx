'use client';

import {
  AnimatePresence,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';
import * as m from 'motion/react-m';
import { Braces, MapPinned, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CodeBlock } from '@/components/ui/code-block';
import { useTabList } from './useTabList';

const steps = [
  {
    index: '01',
    label: 'Search',
    title: 'Find the place people mean.',
    detail: 'Search local names, ISO codes, aliases, and parent regions from the same index.',
    icon: Search,
    eyebrow: 'Natural-language lookup',
    code: [
      ['const result = searchLocations(', '"Kadıköy"', ');'],
      ['', '', ''],
      ['// result[0].path → ', '"Türkiye / Istanbul / Kadıköy"', ''],
    ],
  },
  {
    index: '02',
    label: 'Resolve',
    title: 'Keep every parent attached.',
    detail: 'Move from country to administrative area to city without rebuilding relationships.',
    icon: MapPinned,
    eyebrow: 'Stable hierarchy',
    code: [
      ['const city = getCityById(', '107863', ');'],
      ['', '', ''],
      ['// city.countryCode → ', '"TR"', ''],
      ['// city.stateCode   → ', '"34"', ''],
    ],
  },
  {
    index: '03',
    label: 'Use',
    title: 'Ship one record everywhere.',
    detail: 'Use typed APIs or export the same canonical data as JSON, CSV, XML, and YAML.',
    icon: Braces,
    eyebrow: 'One canonical record',
    code: [
      ['exportLocation(city, ', '"json"', ');'],
      ['exportLocation(city, ', '"csv"', ');'],
      ['exportLocation(city, ', '"xml"', ');'],
      ['exportLocation(city, ', '"yaml"', ');'],
    ],
  },
] as const;

export function DataJourney() {
  const rootRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [compactViewport, setCompactViewport] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ['start start', 'end end'],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 28,
    restDelta: 0.001,
  });

  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const syncViewport = (matches: boolean) => {
      setCompactViewport(matches);
      if (matches) setActiveStep(0);
    };
    const handleChange = (event: MediaQueryListEvent) => syncViewport(event.matches);

    syncViewport(query.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (reduceMotion || compactViewport) return;
    const next = Math.min(steps.length - 1, Math.floor(value * steps.length));
    setActiveStep((current) => (current === next ? current : next));
  });

  const { tabListProps, getTabProps, getPanelProps } = useTabList({
    count: steps.length,
    active: activeStep,
    onChange: setActiveStep,
    orientation: compactViewport ? 'horizontal' : 'vertical',
  });

  const active = steps[activeStep];

  return (
    <section
      ref={rootRef}
      id="workflow"
      className="data-journey"
      aria-labelledby="data-journey-title"
    >
      <div className="data-journey-sticky">
        <m.div className="data-journey-progress" style={{ scaleX: progress }} />
        <div className="data-journey-copy">
          <p>One connected workflow</p>
          <h2 id="data-journey-title">From a name to usable data.</h2>
          <span>
            One location moves through search, hierarchy, code, and map without changing identity.
          </span>

          <div className="data-journey-steps" {...tabListProps} aria-label="Location data workflow">
            {steps.map((step, index) => (
              <button key={step.index} {...getTabProps(index)}>
                {activeStep === index ? (
                  <m.span className="data-journey-active" layoutId="data-journey-active" />
                ) : null}
                <code>{step.index}</code>
                <span>{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="data-journey-stage">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={active.index}
              className="data-journey-panel"
              {...getPanelProps(activeStep)}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <header>
                <active.icon aria-hidden="true" />
                <span>{active.eyebrow}</span>
                <code>{active.index} / 03</code>
              </header>
              <div className="data-journey-panel-copy">
                <h3>{active.title}</h3>
                <p>{active.detail}</p>
              </div>
              <CodeBlock
                aria-label={`${active.label} code example`}
                className="my-[clamp(1.2rem,3vw,2rem)]"
                title="search.ts"
                lines={active.code.map(([before, value, after]) => [
                  { text: before },
                  ...(value ? [{ text: value, tone: 'accent' as const }] : []),
                  { text: after },
                ])}
                copyText={active.code.map((line) => line.join('')).join('\n')}
              />
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
