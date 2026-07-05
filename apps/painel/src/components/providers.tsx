"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

// TooltipProvider vem do @radix-ui hoisted na raiz do monorepo, que ainda
// resolve @types/react 18 (o dashboard legado usa React 18). O painel usa
// React 19, cujo ReactNode inclui `bigint` e não é atribuível ao ReactNode 18.
// Até o dashboard antigo ser aposentado, o cast pontual aqui evita bumpar os
// tipos globais e quebrar o build do dashboard em produção.
const Tooltip = TooltipProvider as unknown as (props: {
  children: ReactNode;
  delayDuration?: number;
}) => ReactNode;

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <Tooltip>{children}</Tooltip>
    </ThemeProvider>
  );
}
