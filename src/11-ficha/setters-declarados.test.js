/* ============================================================
   setters-declarados.test.js — todo setX chamado existe
   ============================================================
   30/10/2026: o leque da ficha chamava `setAcaoFicha` sem o useState dele
   (a edição que o criava se perdeu). Nada quebrava ao carregar — só no
   clique em Detalhes, que derrubava a janela da região sem abrir nada:
   "Quando eu clico em 'detalhes' o modal fecha e não vejo as informações."
   (usuário). Nenhum teste passava por ali.

   A trava é barata: todo `setAlgo(` chamado no arquivo precisa ter um
   `[algo, setAlgo]` (useState), uma função/const com esse nome, ou chegar
   como parâmetro/prop.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARQUIVOS = ['../11-ficha/ficha.jsx', '../07-inventario/inventario.jsx', '../07-inventario/loja.jsx', '../06-historias/estoque-mestre.jsx'];

describe('todo setter chamado foi declarado', () => {
  for (const rel of ARQUIVOS) {
    it(rel.replace('../', ''), () => {
      const s = readFileSync(resolve(__dirname, rel), 'utf8');
      // Fora: métodos (`el.setProperty(`, `x?.setPointerCapture(`) e os globais do navegador.
      const GLOBAIS = new Set(['setTimeout', 'setInterval']);
      const usados = new Set([...s.matchAll(/(?<![.\w])(set[A-Z]\w*)\(/g)].map((m) => m[1]).filter((n) => !GLOBAIS.has(n)));
      const semChamadas = (n) => s.replace(new RegExp('\\b' + n + '\\(', 'g'), '');
      const falta = [...usados].filter((n) =>
        !new RegExp('\\[\\s*\\w+\\s*,\\s*' + n + '\\s*\\]').test(s)
        && !new RegExp('(function|const|let)\\s+' + n + '\\b').test(s)
        && !new RegExp('\\b' + n + '\\s*[,}=:)]').test(semChamadas(n)));
      expect(falta, 'chamados sem declaração').toEqual([]);
    });
  }
});
