// src/components/ui-bridge.ts
// Ponte do kit shadcn → fases em modo "window".
// Expõe os componentes no objeto global `UI` (ex.: UI.Table), do mesmo jeito que o projeto
// já usa React / Icon / COPY como globais. Carregar no main.tsx DEPOIS do bootstrap-globals
// e ANTES das fases.

import {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const UI = {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption,
  Badge,
  Input,
};

type UIType = typeof UI;

// Disponibiliza como global. Em .jsx (fases) usa-se direto: const { Table, Badge } = UI;
Object.assign(window, { UI });

// Opcional: tipa o global pra quem for usar em .tsx. Não afeta os .jsx das fases.
declare global {
  // eslint-disable-next-line no-var
  var UI: UIType;
}

export {};