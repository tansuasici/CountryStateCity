import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { baseOptions } from '@/lib/layout.shared';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <HomeLayout {...baseOptions()}>{children}</HomeLayout>
    </MotionProvider>
  );
}
