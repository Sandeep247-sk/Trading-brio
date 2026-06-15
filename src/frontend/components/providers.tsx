"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delay={300}>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          theme="dark"
        />
      </TooltipProvider>
    </SessionProvider>
  );
}
