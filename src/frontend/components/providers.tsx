"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingProvider } from "@/components/providers/loading-provider";

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
          <LoadingProvider>
            {children}
            <ThemeAwareToaster />
          </LoadingProvider>
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
