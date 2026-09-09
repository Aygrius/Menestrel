/* ============================================================
   tooltip-orfao.test.js — tooltip que fica pendurado na tela
   ============================================================
   Defeito recorrente do card de batalha, achado três vezes em 02/09/2026 —
   sempre ao vivo, nunca por teste, porque não quebra nada: só suja a tela.

   O padrão é sempre o mesmo. O tooltip do card é um PORTAL controlado por
   estado (abrirTip no mouseenter, fecharTip no mouseleave). Quando o botão
   que abriu o balão SOME no próprio clique — porque fechou o card, trocou a
   fileira por um painel ou fechou o menu de estados — o mouseleave nunca
   chega nele, o estado do tooltip nunca é limpo, e o balão fica flutuando
   por cima do que veio depois. Foi visto assim:

     "Ação"       preso sobre o painel de ação (a fileira inteira sai)
     "EF — editar" preso sobre o modal de pool (o card fecha)
     "Envenenado"  preso sobre o modal de veneno (menu + card fecham)

   A regra: todo controle que se remove no clique fecha o tooltip ANTES de
   agir. Este teste enumera os que já mordem hoje — a lista cresce junto com
   os controles, e é de propósito que ela seja explícita: não dá pra deduzir
   da fonte quais somem e quais ficam.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';

let fonte;
beforeAll(async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  fonte = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'batalha.jsx'), 'utf8');
});

/* Cada caso é [nome legível, âncora única no onClick do controle]. O trecho
   examinado é curto de propósito: o fecharTip tem que estar no PRÓPRIO
   handler, não em algum lugar vago do arquivo. */
const CONTROLES = [
  ['botão de ação do card (Mover/Ação/Passar/Estado)',
   'onClick={(e) => { if (typeof fecharTip === \'function\') fecharTip(); if (onClick) onClick(e); }}'],
  ['barra de pool clicável (abre o modal de editar)',
   'onClick={(e) => { fecharTip(); onEditar(e); }}'],
  ['item do menu de estados',
   'onClick={() => { fecharTip(); onMudar(k); setAberto(false); }}'],
  ['item Envenenado do menu de estados',
   'onClick={() => { fecharTip(); onEnvenenar(); setAberto(false); }}'],
];

describe('controles que somem no clique fecham o tooltip antes', () => {
  for (const [nome, ancora] of CONTROLES) {
    it(nome, () => {
      expect(fonte, `${nome}: o onClick tem que chamar fecharTip antes de agir`)
        .toContain(ancora);
    });
  }
});
