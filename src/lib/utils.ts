// src/lib/utils.ts
// Helper `cn` padrão do shadcn: junta classes condicionais (clsx) e resolve
// conflitos de utilitários Tailwind (tailwind-merge). Todo componente do kit
// (table, badge, input, dropdown-menu, avatar) importa daqui via `@/lib/utils`.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}