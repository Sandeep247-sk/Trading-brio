"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        storageKey="trader-brio-theme"
      >
        <TooltipProvider delay={300}>
          {children}
          <ThemeAwareToaster />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

/** Renders Toaster with the current resolved theme */
function ThemeAwareToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      theme="system"
    />
  );
}
