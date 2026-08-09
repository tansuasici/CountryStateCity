'use client';

import * as m from 'motion/react-m';
import type { ReactNode } from 'react';

export function MotionSection({ children, className }: { children: ReactNode; className: string }) {
  return (
    <m.section
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.section>
  );
}
