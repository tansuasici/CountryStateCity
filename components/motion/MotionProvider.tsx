'use client';

import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const loadMotionFeatures = () => import('./features').then((module) => module.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.8 }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
