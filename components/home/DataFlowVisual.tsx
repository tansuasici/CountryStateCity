'use client';

import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { FileJson2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CodeBlock } from '@/components/ui/code-block';
import { useTabList } from './useTabList';

const stages = [
  {
    index: '01',
    type: 'Country',
    name: 'Türkiye',
    code: 'TR',
    path: 'Türkiye',
    fields: [
      ['name', 'Türkiye'],
      ['iso2', 'TR'],
      ['region', 'Asia'],
    ],
  },
  {
    index: '02',
    type: 'State',
    name: 'Istanbul',
    code: '34',
    path: 'Türkiye / Istanbul',
    fields: [
      ['name', 'Istanbul'],
      ['stateCode', '34'],
      ['countryCode', 'TR'],
    ],
  },
  {
    index: '03',
    type: 'City',
    name: 'Kadıköy',
    code: '107863',
    path: 'Türkiye / Istanbul / Kadıköy',
    fields: [
      ['name', 'Kadıköy'],
      ['stateCode', '34'],
      ['countryCode', 'TR'],
      ['latitude', '40.98229'],
      ['longitude', '29.09032'],
    ],
  },
] as const;

export function DataFlowVisual() {
  const [activeStage, setActiveStage] = useState(0);
  // Once someone picks a stage themselves, stop yanking it away from them.
  const [autoplay, setAutoplay] = useState(true);
  // Reading the JSON shouldn't be a race against the next rotation.
  const [inspecting, setInspecting] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || !autoplay || inspecting) return;
    const interval = window.setInterval(
      () => setActiveStage((current) => (current + 1) % stages.length),
      2200
    );
    return () => window.clearInterval(interval);
  }, [autoplay, inspecting, reduceMotion]);

  const selectStage = (index: number) => {
    setAutoplay(false);
    setActiveStage(index);
  };

  const { tabListProps, getTabProps, getPanelProps } = useTabList({
    count: stages.length,
    active: activeStage,
    onChange: selectStage,
    orientation: 'vertical',
  });

  const active = stages[activeStage];

  return (
    <m.div
      className="data-flow-visual"
      aria-label="Interactive location data lookup example"
      onPointerEnter={() => setInspecting(true)}
      onPointerLeave={() => setInspecting(false)}
      onFocusCapture={() => setInspecting(true)}
      onBlurCapture={() => setInspecting(false)}
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="data-flow-toolbar">
        <span className="data-flow-endpoint">
          <FileJson2 aria-hidden="true" />
          <strong>location.resolve</strong>
        </span>
        <span className="data-flow-format">JSON</span>
      </div>

      <div className="data-flow-body">
        <div className="data-flow-stages" {...tabListProps} aria-label="Location hierarchy">
          {stages.map((stage, index) => (
            <button className="data-flow-stage" key={stage.type} {...getTabProps(index)}>
              {activeStage === index ? (
                <m.i className="data-flow-stage-active" layoutId="data-flow-stage-active" />
              ) : null}
              <span>{stage.index}</span>
              <div>
                <small>{stage.type}</small>
                <strong>{stage.name}</strong>
              </div>
              <code>{stage.code}</code>
            </button>
          ))}
        </div>

        <div className="data-flow-record">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={active.index}
              className="data-flow-record-content"
              {...getPanelProps(activeStage)}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <CodeBlock
                aria-label={`${active.type} record as JSON`}
                lines={[
                  [{ text: '{' }],
                  ...active.fields.map(([key, value], index) => [
                    { text: `  "${key}": `, tone: 'muted' as const },
                    { text: `"${value}"`, tone: 'accent' as const },
                    { text: index < active.fields.length - 1 ? ',' : '' },
                  ]),
                  [{ text: '}' }],
                ]}
              />
            </m.div>
          </AnimatePresence>
        </div>
      </div>

    </m.div>
  );
}
