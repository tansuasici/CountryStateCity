'use client';

import { Check, Copy, Terminal } from 'lucide-react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useCallback, useState } from 'react';
import { useTabList } from './useTabList';

const commands = {
  npm: 'npm install @tansuasici/country-state-city',
  pnpm: 'pnpm add @tansuasici/country-state-city',
  yarn: 'yarn add @tansuasici/country-state-city',
  bun: 'bun add @tansuasici/country-state-city',
} as const;

type PackageManager = keyof typeof commands;

const managers = Object.keys(commands) as PackageManager[];

export function InstallCommand() {
  const [manager, setManager] = useState<PackageManager>('npm');
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();
  const command = commands[manager];
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [command]);

  const activeIndex = managers.indexOf(manager);
  const { tabListProps, getTabProps, getPanelProps } = useTabList({
    count: managers.length,
    active: activeIndex,
    onChange: (index) => setManager(managers[index]),
    orientation: 'horizontal',
  });

  return (
    <div className="install-command" aria-label="Package installation command">
      <div className="install-tabs" {...tabListProps} aria-label="Package manager">
        {managers.map((item, index) => (
          <button key={item} {...getTabProps(index)}>
            <span>{item}</span>
            {manager === item ? (
              <m.i className="install-tab-active" layoutId="install-tab-active" />
            ) : null}
          </button>
        ))}
      </div>
      <div className="install-line" {...getPanelProps(activeIndex, { focusable: false })}>
        <Terminal aria-hidden="true" />
        <AnimatePresence mode="wait" initial={false}>
          <m.code
            key={manager}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: 0.16 }}
          >
            {command}
          </m.code>
        </AnimatePresence>
        <button type="button" onClick={copy} aria-label={copied ? 'Copied' : 'Copy command'}>
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={copied ? 'copied' : 'copy'}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.14 }}
            >
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </m.span>
          </AnimatePresence>
        </button>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? `Copied ${manager} install command to clipboard` : ''}
      </span>
    </div>
  );
}
