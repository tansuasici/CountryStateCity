"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem
      disableTransitionOnChange
    >
      <HeroUIProvider navigate={router.push}>
        {children}
      </HeroUIProvider>
    </NextThemesProvider>
  );
}