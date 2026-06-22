// src/components/ReferenceHistoriaCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Tela/componente de REFERÊNCIA da Fase 2. Não entra no app ainda — serve pra
// você validar a identidade "Grimório do dragão" em React/Tailwind real, com
// os tokens do index.css. Usa só utilities do Tailwind + as CSS vars da marca,
// então funciona assim que o index.css estiver no lugar (antes mesmo de instalar
// componentes shadcn). Na Fase 3, os cards reais derivam deste padrão.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  titulo?: string
  reino?: string
  protagonistas?: number
}

export default function ReferenceHistoriaCard({
  titulo = 'As Crônicas de Vael',
  reino = 'Reino de Aëth',
  protagonistas = 4,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-border bg-card p-[18px] text-foreground">
      <div
        className="absolute inset-x-0 bottom-0 h-[3px]"
        style={{ background: 'var(--grad-dragon)' }}
      />

      <span className="mb-[14px] inline-flex items-center gap-[7px] rounded-full border border-[#4A3578] bg-secondary px-3 py-[5px] text-xs text-[var(--gold)]">
        <i className="ti ti-flame" aria-hidden="true" /> Campanha ativa
      </span>

      <h3
        className="mb-[5px] text-[23px] leading-tight font-semibold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {titulo}
      </h3>
      <p className="mb-4 text-[13px] text-muted-foreground">
        {reino} · {protagonistas} protagonistas
      </p>

      <ul className="flex flex-col gap-[9px] text-[13px] text-[#D6CCE8]">
        <li className="flex items-center gap-[9px]">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#3A1C2A] text-[11px] text-[#F0907A]">
            <i className="ti ti-check" aria-hidden="true" />
          </span>
          12 sessões registradas
        </li>
        <li className="flex items-center gap-[9px]">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#3A2E12] text-[11px] text-[var(--gold)]">
            <i className="ti ti-check" aria-hidden="true" />
          </span>
          Bestiário com 38 criaturas
        </li>
        <li className="flex items-center gap-[9px]">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#241C42] text-[11px] text-[#7E9FE0]">
            <i className="ti ti-check" aria-hidden="true" />
          </span>
          Última batalha há 2 dias
        </li>
      </ul>
    </div>
  )
}
