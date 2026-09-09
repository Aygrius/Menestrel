# Velocidade em Batalha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Magias que alteram velocidade passam a valer mecanicamente em batalha — reordenando a iniciativa, mudando o passo no tabuleiro e concedendo ação extra acima de 30.

**Architecture:** Todo o cálculo novo entra como funções PURAS em `src/12-batalha/batalha.jsx`, exportadas em `window.MotorBatalha`, testáveis sem rede. Elas leem o texto que já existe no catálogo (`nivel_N`, `duracao`, `descricao`) — nenhuma coluna nova. O efeito vira uma entrada de `status_temp` no formato que `somaEfeitosStatus`/`vbEfetivo` já consomem, então a reordenação de iniciativa funciona sem nenhuma mudança. As telas do Mestre e do Jogador consomem as mesmas funções puras, como `montarNovaRodada` já estabeleceu.

**Tech Stack:** React 19 (JSX runtime clássico, sem imports — os arquivos de fase leem globais do `window`), Vitest + @testing-library/react, jsdom. Supabase Postgres para o catálogo.

**Spec:** `docs/superpowers/specs/2026-09-01-efeitos-batalha-velocidade-design.md`

## Global Constraints

- **Arquivos de fase não são ES modules.** `src/12-batalha/batalha.jsx` usa `React`, `useState`, `useMemo`, `supabaseClient`, `COPY` etc. como globais, populados por `src/bootstrap-globals.ts`. NÃO adicione `import` no topo desse arquivo.
- **Encoding e quebras de linha:** o repositório usa CRLF e UTF-8. Ferramentas de edição devem preservar isso.
- **`MotorBatalha` é contrato de funções PURAS.** Nada que toque rede entra lá. Componentes (como `AcaoPanel`) são expostos à parte, com comentário justificando.
- **Testes puros em `.test.js`, testes de render em `.test.jsx`.** Setup em `src/test/setup-fases.ts`; `supabaseClient` é um Proxy que EXPLODE se tocado — teste unitário não faz rede.
- **Ordem de import nos testes:** `../01-core/copy.jsx`, `../01-core/helpers.jsx`, `../01-core/inventario-helpers.jsx`, `../01-core/game-data.jsx`, `./batalha.jsx`, `./tabuleiro.jsx` — nessa ordem. `tabuleiro.jsx` DEPOIS de `batalha.jsx` (define `alcanceDaAcao`/`movimentoBase`, usados pelo painel).
- **i18n:** strings de batalha vivem em `COPY.pt.batalha` / `COPY.en.batalha` (`src/01-core/copy.jsx`) e são lidas via `tBat(lang)`. Toda string nova entra nos DOIS idiomas.
- **Comandos:** `npm test` (suíte inteira), `npx vitest run <arquivo>` (um arquivo), `npm run build` (tsc + vite).
- **Baseline:** 231 testes em 12 arquivos passando antes da Task 1.

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `scripts/sql/magias-velocidade-fix.sql` | Corrige Tensão e Ruído Extenuante no catálogo | Criar |
| `src/12-batalha/velocidade-magia.test.js` | Testes puros: leitura do catálogo, efeito, concentração, virada | Criar |
| `src/12-batalha/apoio-tab.test.jsx` | Testes de render da aba Apoio | Criar |
| `src/12-batalha/batalha.jsx` | Funções puras novas + aba Apoio + handlers nas duas telas | Modificar |
| `src/01-core/copy.jsx` | Strings PT/EN da aba Apoio | Modificar |

Tudo em `batalha.jsx` porque é onde vivem `vbEfetivo`, `montarNovaRodada`, `AcaoPanel` e as duas telas. O arquivo é grande (4.7k linhas), mas dividi-lo não está no escopo deste projeto e quebraria o contrato de globais entre fases.

---

### Task 1: Corrigir os dados do catálogo

Os textos de duas magias impedem a leitura. Isto é correção de DADO, não de código, e precisa vir antes para que o leitor da Task 2 tenha alvo consistente.

**Files:**
- Create: `scripts/sql/magias-velocidade-fix.sql`

**Interfaces:**
- Consumes: nada
- Produces: catálogo com `Tensão` nos cinco níveis no padrão `"N de velocidade"` e `Ruído Extenuante` sem o typo `Reduza5`

- [ ] **Step 1: Escrever o script**

```sql
-- scripts/sql/magias-velocidade-fix.sql
-- Corrige dois textos que impedem a leitura automática do modificador de
-- velocidade (ver docs/superpowers/specs/2026-09-01-efeitos-batalha-velocidade-design.md §3.2).
--
-- 1) Tensão: "Aumente N de defesa, velocidade e coluna(s) de ataque."
--    Um número servindo a três coisas, e nenhum número junto de "velocidade".
--    Vira "Aumente N de defesa, N de velocidade e N coluna(s) de ataque."
-- 2) Ruído Extenuante: "Reduza5"/"Reduza9" sem espaço depois do verbo.

BEGIN;

UPDATE public.magias SET
  nivel_1 = 'Aumente 1 de defesa, 1 de velocidade e 1 coluna de ataque.',
  nivel_3 = 'Aumente 2 de defesa, 2 de velocidade e 2 colunas de ataque.',
  nivel_5 = 'Aumente 3 de defesa, 3 de velocidade e 3 colunas de ataque.',
  nivel_7 = 'Aumente 4 de defesa, 4 de velocidade e 4 colunas de ataque.',
  nivel_9 = 'Aumente 5 de defesa, 5 de velocidade e 5 colunas de ataque.'
WHERE nome = 'Tensão';

UPDATE public.magias SET
  nivel_1 = regexp_replace(nivel_1, '(Aumente|Reduza)(\d)', '\1 \2', 'g'),
  nivel_3 = regexp_replace(nivel_3, '(Aumente|Reduza)(\d)', '\1 \2', 'g'),
  nivel_5 = regexp_replace(nivel_5, '(Aumente|Reduza)(\d)', '\1 \2', 'g'),
  nivel_7 = regexp_replace(nivel_7, '(Aumente|Reduza)(\d)', '\1 \2', 'g'),
  nivel_9 = regexp_replace(nivel_9, '(Aumente|Reduza)(\d)', '\1 \2', 'g')
WHERE nome = 'Ruído Extenuante';

COMMIT;
```

- [ ] **Step 2: Conferir o resultado ANTES de aplicar**

Rodar em modo leitura primeiro, para ver o antes:

```sql
select nome, nivel_1, nivel_5, nivel_9 from public.magias
where nome in ('Tensão', 'Ruído Extenuante') order by nome;
```

Esperado ANTES: Tensão com `"Aumente 1 de defesa, velocidade e coluna de ataque."`; Ruído Extenuante nível 5 com `"Reduza5 colunas..."`.

- [ ] **Step 3: PARAR e pedir autorização ao usuário**

> Este passo escreve no banco de PRODUÇÃO (`kaxbdpdutentlrobuqyu`). NÃO aplique sozinho. Mostre o script e o resultado do SELECT ao usuário e espere um "pode aplicar" explícito.

- [ ] **Step 4: Aplicar e verificar**

Depois do OK, aplicar o script e repetir o SELECT do Step 2.
Esperado DEPOIS: Tensão nível 5 = `"Aumente 3 de defesa, 3 de velocidade e 3 colunas de ataque."`; Ruído Extenuante nível 5 = `"Reduza 5 colunas de ataque e 16 de velocidade."`

- [ ] **Step 5: Commit**

```bash
git add scripts/sql/magias-velocidade-fix.sql
git commit -m "fix(magias): normaliza texto de velocidade em Tensão e Ruído Extenuante"
```

---

### Task 2: Ler o modificador de velocidade do texto do nível

**Files:**
- Modify: `src/12-batalha/batalha.jsx` (nova função perto de `danoMagiaNoNivel`, linha ~516; export em `MotorBatalha`, ~linha 4770)
- Test: `src/12-batalha/velocidade-magia.test.js` (criar)

**Interfaces:**
- Consumes: nada
- Produces: `modVelocidadeNoNivel(magia, nivelEfetivo) → number` — inteiro com sinal; `0` significa "esta magia não modifica velocidade neste nível"

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/12-batalha/velocidade-magia.test.js`:

```js
/* ============================================================
   velocidade-magia.test.js — velocidade lida do catálogo
   ============================================================
   Os textos abaixo são CÓPIAS LITERAIS do banco de produção
   (levantamento de 01/09/2026), não invenções. Se o catálogo mudar de
   redação, este teste é o lugar onde a mudança aparece primeiro.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M).toBeDefined(); });

const mag = (nivel1, extra) => ({ key: 'x', nome: 'X', nivel_1: nivel1, ...extra });

describe('modVelocidadeNoNivel — os nove modificadores reais', () => {
  it('Aumente N de velocidade (Forçar Disputa, Velocidade)', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 2 de velocidade.'), 1)).toBe(2);
  });

  it('Reduza N de velocidade (Região Inviolável)', () => {
    expect(M.modVelocidadeNoNivel(mag('Reduza 12 de velocidade.'), 1)).toBe(-12);
  });

  it('Reduza N PONTOS de velocidade (Distração)', () => {
    expect(M.modVelocidadeNoNivel(mag('Reduza 4 pontos de velocidade.'), 1)).toBe(-4);
  });

  it('velocidade no meio de outros efeitos (Coordenação)', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 1 coluna de ataque e 2 de velocidade.'), 1)).toBe(2);
  });

  it('velocidade em primeiro, outros depois (Canção do Ânimo)', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 1 de velocidade e 5 de energia heroica.'), 1)).toBe(1);
  });

  it('lista de três (Perspicácia)', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 1 de velocidade, 1 de defesa e 1 coluna de ataque.'), 1)).toBe(1);
  });

  it('Tensão, já corrigida pela Task 1', () => {
    expect(M.modVelocidadeNoNivel(mag('Aumente 3 de defesa, 3 de velocidade e 3 colunas de ataque.'), 1)).toBe(3);
  });

  it('tolera o typo Reduza5 sem espaço (Ruído Extenuante)', () => {
    expect(M.modVelocidadeNoNivel(mag('Reduza5 colunas de ataque e 16 de velocidade.'), 1)).toBe(-16);
  });
});

describe('modVelocidadeNoNivel — rejeita quem só DESCREVE velocidade', () => {
  it('Telecinese: número DEPOIS da palavra', () => {
    expect(M.modVelocidadeNoNivel(
      mag('Mova 5 kg, arraste 10 kg ou derrube 15 kg em uma velocidade de 5 metros por rodada.'), 1)).toBe(0);
  });

  it('Unidade Natural: "com velocidade 20"', () => {
    expect(M.modVelocidadeNoNivel(mag('Se move por 25 metros com velocidade 20.'), 1)).toBe(0);
  });

  it('Olhar de Predador: sem número nenhum', () => {
    expect(M.modVelocidadeNoNivel(
      mag('O alvo perde a iniciativa, além disso, revele sua velocidade e seus tipos de ataque.'), 1)).toBe(0);
  });

  it('sem verbo Aumente/Reduza o sinal é ambíguo → 0', () => {
    expect(M.modVelocidadeNoNivel(mag('O alvo fica com 5 de velocidade.'), 1)).toBe(0);
  });
});

describe('modVelocidadeNoNivel — o nível certo', () => {
  const velocidade = {
    key: 'velocidade', nome: 'Velocidade',
    nivel_1: 'Aumente 2 de velocidade.',
    nivel_5: 'Aumente 6 de velocidade.',
    nivel_9: 'Aumente 10 de velocidade.',
  };

  it('lê o texto do nível efetivo pedido', () => {
    expect(M.modVelocidadeNoNivel(velocidade, 1)).toBe(2);
    expect(M.modVelocidadeNoNivel(velocidade, 5)).toBe(6);
    expect(M.modVelocidadeNoNivel(velocidade, 9)).toBe(10);
  });

  it('nível sem texto devolve 0', () => {
    expect(M.modVelocidadeNoNivel(velocidade, 3)).toBe(0);
  });

  it('magia ausente devolve 0', () => {
    expect(M.modVelocidadeNoNivel(null, 1)).toBe(0);
    expect(M.modVelocidadeNoNivel(undefined, 5)).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: FAIL — `M.modVelocidadeNoNivel is not a function`

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, logo DEPOIS de `danoMagiaNoNivel` (que termina na linha ~525):

```js
/* ── Modificador de VELOCIDADE lido do texto do nível ──────────────
   Mesmo molde de danoMagiaNoNivel acima: o catálogo descreve o efeito em
   prosa, e a gente pesca o número. Levantamento de 01/09/2026 mostrou que
   as nove magias que modificam velocidade seguem um padrão único:

     "Aumente 2 de velocidade."                        → +2
     "Reduza 4 pontos de velocidade."                  → -4
     "Aumente 1 coluna de ataque e 2 de velocidade."   → +2

   O DISCRIMINADOR é a posição do número: modificador é sempre
   `número + "de velocidade"`. Quem só descreve velocidade põe o número
   depois ("velocidade de 5 metros por rodada", "com velocidade 20") ou não
   põe número nenhum ("revele sua velocidade") — e esses NÃO podem entrar,
   senão Telecinese viraria um buff de +5.

   Sem verbo Aumente/Reduza abrindo a frase o sinal é ambíguo: devolve 0 em
   vez de chutar. RE_VERBO aceita "Reduza5" grudado (typo real do catálogo). */
const RE_MOD_VEL = /(\d+)\s*(?:pontos?\s+)?de\s+velocidade/i;
const RE_VERBO_MOD = /^\s*(aumente|reduza)/i;

function modVelocidadeNoNivel(magia, nivelEfetivo) {
  if (!magia) return 0;
  const txt = magia['nivel_' + nivelEfetivo];
  if (!txt) return 0;
  const mv = RE_MOD_VEL.exec(txt);
  if (!mv) return 0;
  const verbo = RE_VERBO_MOD.exec(txt);
  if (!verbo) return 0;
  const valor = parseInt(mv[1], 10);
  if (!Number.isFinite(valor)) return 0;
  return /reduza/i.test(verbo[1]) ? -valor : valor;
}
```

E no `Object.assign(window, { ... MotorBatalha: { ... } })` do fim do arquivo, junto de `danoNoTier`:

```js
    // Leitura de velocidade do catálogo (01/09/2026): o texto do nível é a
    // fonte, como já acontece com o dano.
    modVelocidadeNoNivel,
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: PASS (16 testes)

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/velocidade-magia.test.js
git commit -m "feat(batalha): lê modificador de velocidade do texto do nível da magia"
```

---

### Task 3: Ler duração e exigência de resistência

**Files:**
- Modify: `src/12-batalha/batalha.jsx` (junto de `modVelocidadeNoNivel`; export em `MotorBatalha`)
- Test: `src/12-batalha/velocidade-magia.test.js` (adicionar blocos)

**Interfaces:**
- Consumes: nada
- Produces:
  - `duracaoEmRodadas(magia) → { rodadas: number|null, concentracao: boolean }` — `rodadas: null` + `concentracao: false` significa "até o fim da batalha"
  - `exigeResistencia(magia) → 'rm' | 'rf' | null`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao fim de `src/12-batalha/velocidade-magia.test.js`:

```js
describe('duracaoEmRodadas — a coluna duracao é texto livre', () => {
  it('"2 rodadas" vira 2', () => {
    expect(M.duracaoEmRodadas({ duracao: '2 rodadas' }))
      .toEqual({ rodadas: 2, concentracao: false });
  });

  it('"10 rodadas" vira 10', () => {
    expect(M.duracaoEmRodadas({ duracao: '10 rodadas' }))
      .toEqual({ rodadas: 10, concentracao: false });
  });

  it('"Variável" é CONCENTRAÇÃO, não duração', () => {
    expect(M.duracaoEmRodadas({ duracao: 'Variável' }))
      .toEqual({ rodadas: null, concentracao: true });
  });

  it('tempos mais longos que uma batalha duram até o fim dela', () => {
    for (const d of ['30 minutos', '1 hora', '6 horas', '1 ano e 1 dia']) {
      expect(M.duracaoEmRodadas({ duracao: d }))
        .toEqual({ rodadas: null, concentracao: false });
    }
  });

  it('duração ausente dura até o fim da batalha', () => {
    expect(M.duracaoEmRodadas({})).toEqual({ rodadas: null, concentracao: false });
    expect(M.duracaoEmRodadas(null)).toEqual({ rodadas: null, concentracao: false });
  });
});

describe('exigeResistencia — a frase é literal e idêntica nas quatro', () => {
  it('Distração', () => {
    expect(M.exigeResistencia({ descricao:
      'Você emite um som à sua escolha que é capaz de chamar rapidamente a atenção de todos que não passarem em um teste de resistência mágica.' })).toBe('rm');
  });

  it('Forçar Disputa', () => {
    expect(M.exigeResistencia({ descricao:
      'Esta magia é utilizada de forma estratégica para atrair a atenção de um determinado adversário e forçá-lo ao combate, caso falhe em um teste de resistência mágica.' })).toBe('rm');
  });

  it('Região Inviolável', () => {
    expect(M.exigeResistencia({ descricao:
      'Com esta magia, você é capaz de controlar o ambiente através de um toque no chão, fazendo com que todos se locomovam com muita dificuldade, caso falhem em um teste de resistência mágica.' })).toBe('rm');
  });

  it('Tensão', () => {
    expect(M.exigeResistencia({ descricao:
      'Dentro da área de efeito, todos devem fazer um teste de resistência mágica.' })).toBe('rm');
  });

  it('resistência FÍSICA também é reconhecida', () => {
    expect(M.exigeResistencia({ descricao: 'O alvo faz um teste de resistência física.' })).toBe('rf');
  });

  // REGRESSÃO: um padrão largo (teste|resist|falh|passar) casava o "passar"
  // dentro de "ultraPASSAR 30" e marcava a magia Velocidade como se pedisse
  // rolagem. Ela NÃO pede.
  it('não confunde "ultrapassar" com "passar em um teste"', () => {
    expect(M.exigeResistencia({ descricao:
      'Uma descarga cinética envolve seu corpo, aumentando sua velocidade e sua iniciativa. Se sua velocidade ultrapassar 30, você terá uma segunda ação na mesma rodada.' })).toBeNull();
  });

  it('buffs sem teste devolvem null', () => {
    expect(M.exigeResistencia({ descricao: 'Aumenta a disposição dos ouvintes.' })).toBeNull();
    expect(M.exigeResistencia({})).toBeNull();
    expect(M.exigeResistencia(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: FAIL — `M.duracaoEmRodadas is not a function`

- [ ] **Step 3: Implementar**

Logo depois de `modVelocidadeNoNivel`:

```js
/* ── Duração da magia, traduzida para rodadas de batalha ───────────
   A coluna `duracao` é texto livre e heterogêneo. Três casos:
     "2 rodadas", "10 rodadas"  → contagem direta
     "Variável"                 → CONCENTRAÇÃO (ver quebrarConcentracao):
                                  o conjurador sustenta a magia e não pode
                                  fazer mais nada. Não é uma duração.
     "30 minutos", "1 hora", "6 horas", "1 ano e 1 dia"
                                → mais longo que qualquer batalha; dentro do
                                  combate equivale a "até o fim". */
const RE_RODADAS = /(\d+)\s*rodadas?/i;

function duracaoEmRodadas(magia) {
  const txt = (magia && magia.duracao) || '';
  if (/vari[áa]vel/i.test(txt)) return { rodadas: null, concentracao: true };
  const m = RE_RODADAS.exec(txt);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) return { rodadas: n, concentracao: false };
  }
  return { rodadas: null, concentracao: false };
}

/* ── A magia exige teste de resistência do alvo? ───────────────────
   Levantamento de 01/09/2026: as quatro magias que exigem rolagem dizem,
   todas, literalmente "teste de resistência mágica" na descrição.

   ANCORAR NA FRASE INTEIRA, nunca em palavras soltas: um padrão largo
   (teste|resist|falh|passar) casa o "passar" dentro de "ultrapassar 30" na
   descrição da magia Velocidade — que NÃO pede teste nenhum. Há teste de
   regressão pra isso. */
const RE_RESIST = /teste\s+de\s+resist[êe]ncia\s+(m[áa]gica|f[íi]sica)/i;

function exigeResistencia(magia) {
  const txt = (magia && magia.descricao) || '';
  const m = RE_RESIST.exec(txt);
  if (!m) return null;
  return /m[áa]gica/i.test(m[1]) ? 'rm' : 'rf';
}
```

Exports, junto de `modVelocidadeNoNivel`:

```js
    modVelocidadeNoNivel, duracaoEmRodadas, exigeResistencia,
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/velocidade-magia.test.js
git commit -m "feat(batalha): lê duração e exigência de resistência do catálogo de magias"
```

---

### Task 4: Listar as magias de apoio do ator

**Files:**
- Modify: `src/12-batalha/batalha.jsx` (nova função depois de `magiasOfensivasDoAtor`, ~linha 555; export)
- Test: `src/12-batalha/velocidade-magia.test.js`

**Interfaces:**
- Consumes: `modVelocidadeNoNivel`, `duracaoEmRodadas`, `exigeResistencia` (Tasks 2 e 3)
- Produces: `magiasDeApoioDoAtor(ator, catalogos) → Array<{ fonte:'magia', key, nome, passos, nivel, custo_karma, mod_vb, rodadas, concentracao, resistencia, descricao }>`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar a `velocidade-magia.test.js`:

```js
describe('magiasDeApoioDoAtor', () => {
  const CATALOGOS = {
    pjById: { 7: { id: 7, magias: { velocidade: 3, distracao: 1, bola_fogo: 2 } } },
    magiasByKey: {
      // passos 3 → nível efetivo 5 (p*2-1)
      velocidade: { key: 'velocidade', nome: 'Velocidade', duracao: '30 minutos',
                    descricao: 'Uma descarga cinética. Se sua velocidade ultrapassar 30, você terá uma segunda ação.',
                    nivel_5: 'Aumente 6 de velocidade.' },
      // passos 1 → nível efetivo 1
      distracao:  { key: 'distracao', nome: 'Distração', duracao: '2 rodadas',
                    descricao: 'Chama a atenção de todos que não passarem em um teste de resistência mágica.',
                    nivel_1: 'Reduza 4 pontos de velocidade.' },
      // passos 2 → nível efetivo 3; não mexe em velocidade
      bola_fogo:  { key: 'bola_fogo', nome: 'Bola de Fogo', duracao: 'Instantânea',
                    descricao: 'Fogo.', nivel_3: 'Causa 12 de dano.' },
    },
    catalogoBySlug: {},
  };
  const ATOR = { tipo: 'pj', ref_id: 7, inst_id: 'pj:7', nome: 'Mago' };

  it('lista só as magias que modificam velocidade', () => {
    const lista = M.magiasDeApoioDoAtor(ATOR, CATALOGOS);
    expect(lista.map((m) => m.key).sort()).toEqual(['distracao', 'velocidade']);
  });

  it('traz o valor do nível efetivo, não do nível 1', () => {
    const v = M.magiasDeApoioDoAtor(ATOR, CATALOGOS).find((m) => m.key === 'velocidade');
    expect(v.nivel).toBe(5);        // 3 passos → 5
    expect(v.mod_vb).toBe(6);
    expect(v.custo_karma).toBe(5);  // karma = nível efetivo
  });

  it('traz duração, concentração e resistência resolvidas', () => {
    const lista = M.magiasDeApoioDoAtor(ATOR, CATALOGOS);
    const v = lista.find((m) => m.key === 'velocidade');
    const d = lista.find((m) => m.key === 'distracao');
    expect(v.rodadas).toBeNull();
    expect(v.concentracao).toBe(false);
    expect(v.resistencia).toBeNull();
    expect(d.rodadas).toBe(2);
    expect(d.mod_vb).toBe(-4);
    expect(d.resistencia).toBe('rm');
  });

  it('criatura não tem magia de apoio (só PJ conjura)', () => {
    expect(M.magiasDeApoioDoAtor({ tipo: 'criatura', ref_id: 1 }, CATALOGOS)).toEqual([]);
  });

  it('ator ou catálogo ausente devolve lista vazia', () => {
    expect(M.magiasDeApoioDoAtor(null, CATALOGOS)).toEqual([]);
    expect(M.magiasDeApoioDoAtor(ATOR, null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: FAIL — `M.magiasDeApoioDoAtor is not a function`

- [ ] **Step 3: Implementar**

Depois de `magiasOfensivasDoAtor` (que termina ~linha 555):

```js
/* ── Magias de APOIO conhecidas pelo PJ ────────────────────────────
   Espelha magiasOfensivasDoAtor logo acima, trocando o critério: em vez de
   "entrega dano > 0 no nível efetivo", é "modifica velocidade no nível
   efetivo". Mesma regra de karma (custo = nível efetivo). */
function magiasDeApoioDoAtor(ator, catalogos) {
  if (!ator || ator.tipo !== 'pj' || !catalogos) return [];
  const pj = catalogos.pjById[ator.ref_id];
  if (!pj || !pj.magias) return [];
  const out = [];
  Object.entries(pj.magias).forEach(([key, passos]) => {
    const p = passos || 0;
    if (p <= 0) return;
    const m = catalogos.magiasByKey[key];
    if (!m) return;
    const nivel = (typeof nivelMagiaEfetivo === 'function') ? nivelMagiaEfetivo(p) : (p * 2 - 1);
    const mod_vb = modVelocidadeNoNivel(m, nivel);
    if (mod_vb === 0) return;   // não é magia de apoio de velocidade
    const dur = duracaoEmRodadas(m);
    out.push({
      fonte: 'magia',
      key, nome: m.nome,
      passos: p, nivel,
      custo_karma: nivel,
      mod_vb,
      rodadas: dur.rodadas,
      concentracao: dur.concentracao,
      resistencia: exigeResistencia(m),
      descricao: m['nivel_' + nivel] || null,
    });
  });
  return out;
}
```

Export, junto das outras:

```js
    magiasDeApoioDoAtor,
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/velocidade-magia.test.js
git commit -m "feat(batalha): magiasDeApoioDoAtor lista magias que alteram velocidade"
```

---

### Task 5: Aplicar o efeito e quebrar concentração

**Files:**
- Modify: `src/12-batalha/batalha.jsx` (funções novas depois de `aplicarFalhaCritica`, ~linha 1500; export)
- Test: `src/12-batalha/velocidade-magia.test.js`

**Interfaces:**
- Consumes: `somaEfeitosStatus`, `vbEfetivo`, `mesmoParticipante` (já existem)
- Produces:
  - `aplicarEfeitoApoio(participante, magiaApoio, atorInstId) → participante` — devolve cópia com um `status_temp` novo
  - `quebrarConcentracao(participantes, atorInstId) → participantes` — remove de TODOS os participantes os efeitos sustentados por esse ator; devolve o MESMO array se nada mudou

- [ ] **Step 1: Escrever o teste que falha**

Adicionar a `velocidade-magia.test.js`:

```js
describe('aplicarEfeitoApoio', () => {
  const alvo = { tipo: 'pj', ref_id: 1, inst_id: 'pj:1', nome: 'Alvo', vb: 20, status_temp: [] };
  const apoio = { key: 'velocidade', nome: 'Velocidade', mod_vb: 6, rodadas: null, concentracao: false };

  it('cria um status_temp com o efeito mod_vb', () => {
    const p = M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    expect(p.status_temp).toHaveLength(1);
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'mod_vb', valor: 6 });
  });

  it('NÃO altera o vb real do snapshot', () => {
    const p = M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    expect(p.vb).toBe(20);
    expect(M.vbEfetivo(p)).toBe(26);
  });

  it('não muta o participante original', () => {
    M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    expect(alvo.status_temp).toHaveLength(0);
  });

  it('duração em rodadas vira rodadas_rest; sem duração vira null', () => {
    expect(M.aplicarEfeitoApoio(alvo, { ...apoio, rodadas: 2 }, 'pj:7').status_temp[0].rodadas_rest).toBe(2);
    expect(M.aplicarEfeitoApoio(alvo, apoio, 'pj:7').status_temp[0].rodadas_rest).toBeNull();
  });

  it('só marca concentracao quando a magia é de concentração', () => {
    expect(M.aplicarEfeitoApoio(alvo, apoio, 'pj:7').status_temp[0].concentracao).toBeUndefined();
    const c = M.aplicarEfeitoApoio(alvo, { ...apoio, concentracao: true }, 'pj:7');
    expect(c.status_temp[0].concentracao).toEqual({ ator: 'pj:7', magia_key: 'velocidade' });
  });

  it('duas aplicações empilham e somam', () => {
    const um = M.aplicarEfeitoApoio(alvo, apoio, 'pj:7');
    const dois = M.aplicarEfeitoApoio(um, apoio, 'pj:7');
    expect(dois.status_temp).toHaveLength(2);
    expect(M.vbEfetivo(dois)).toBe(32);
  });
});

describe('quebrarConcentracao', () => {
  const comEfeito = (nome, instId, sustentadoPor) => ({
    tipo: 'pj', ref_id: nome, inst_id: instId, nome, vb: 20,
    status_temp: [{ id: 'mag:x:1', nome: 'Velocidade', rodadas_rest: null,
                    concentracao: { ator: sustentadoPor, magia_key: 'velocidade' },
                    efeito: { tipo: 'mod_vb', valor: 6 } }],
  });

  it('remove o efeito sustentado pelo ator que quebrou', () => {
    const arr = [comEfeito('A', 'pj:1', 'pj:7')];
    const next = M.quebrarConcentracao(arr, 'pj:7');
    expect(next[0].status_temp).toHaveLength(0);
    expect(M.vbEfetivo(next[0])).toBe(20);
  });

  it('remove em TODOS os alvos do mesmo conjurador', () => {
    const arr = [comEfeito('A', 'pj:1', 'pj:7'), comEfeito('B', 'pj:2', 'pj:7')];
    const next = M.quebrarConcentracao(arr, 'pj:7');
    expect(next[0].status_temp).toHaveLength(0);
    expect(next[1].status_temp).toHaveLength(0);
  });

  it('NÃO toca no efeito de outro conjurador', () => {
    const arr = [comEfeito('A', 'pj:1', 'pj:9')];
    const next = M.quebrarConcentracao(arr, 'pj:7');
    expect(next[0].status_temp).toHaveLength(1);
  });

  it('NÃO toca em efeito sem concentração (duração fixa)', () => {
    const arr = [{ tipo: 'pj', ref_id: 'A', inst_id: 'pj:1', nome: 'A', vb: 20,
      status_temp: [{ id: 'mag:y:1', nome: 'Distração', rodadas_rest: 2,
                      efeito: { tipo: 'mod_vb', valor: -4 } }] }];
    expect(M.quebrarConcentracao(arr, 'pj:7')[0].status_temp).toHaveLength(1);
  });

  it('devolve o MESMO array quando nada muda (evita re-render à toa)', () => {
    const arr = [comEfeito('A', 'pj:1', 'pj:9')];
    expect(M.quebrarConcentracao(arr, 'pj:7')).toBe(arr);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: FAIL — `M.aplicarEfeitoApoio is not a function`

- [ ] **Step 3: Implementar**

Depois de `aplicarFalhaCritica` (termina ~linha 1500):

```js
/* ── Aplica um efeito de apoio (magia) num participante ────────────
   Só mexe em status_temp — o `vb` do snapshot fica intacto, exatamente como
   aplicarFalhaCritica faz. vbEfetivo soma os mod_vb na hora de ordenar. */
function aplicarEfeitoApoio(participante, magiaApoio, atorInstId) {
  const atual = Array.isArray(participante.status_temp) ? participante.status_temp : [];
  const novo = {
    id: 'mag:' + magiaApoio.key + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    nome: magiaApoio.nome,
    icone: '🌀',
    rodadas_rest: magiaApoio.rodadas != null ? magiaApoio.rodadas : null,
    efeito: { tipo: 'mod_vb', valor: magiaApoio.mod_vb },
  };
  // Concentração: o efeito fica amarrado a quem o sustenta, pra que
  // quebrarConcentracao saiba o que derrubar quando esse alguém agir.
  if (magiaApoio.concentracao) {
    novo.concentracao = { ator: atorInstId, magia_key: magiaApoio.key };
  }
  return { ...participante, status_temp: [...atual, novo] };
}

/* ── Quebra a concentração de um conjurador ────────────────────────
   Regra confirmada em 01/09/2026: duração "Variável" significa que o
   conjurador sustenta a magia e não pode fazer mais nada. Se atacar, lançar
   outra magia, usar item, ANDAR, levar dano que chegue na EF, desmaiar,
   morrer ou desistir, a magia cai — em TODOS os alvos de uma vez.

   NÃO quebra: passar a vez sem agir (é assim que se sustenta), nem dano
   inteiramente absorvido por EH ou AR (a cascata é EH → AR → EF, e a regra
   é "dano na EF").

   Devolve o MESMO array quando não há nada a remover: os chamadores usam
   isso pra decidir se vale persistir. */
function quebrarConcentracao(participantes, atorInstId) {
  if (!atorInstId || !Array.isArray(participantes)) return participantes;
  let mudou = false;
  const next = participantes.map((p) => {
    const st = Array.isArray(p.status_temp) ? p.status_temp : null;
    if (!st || st.length === 0) return p;
    const filtrado = st.filter((s) => !(s.concentracao && s.concentracao.ator === atorInstId));
    if (filtrado.length === st.length) return p;
    mudou = true;
    return { ...p, status_temp: filtrado };
  });
  return mudou ? next : participantes;
}
```

Exports:

```js
    aplicarEfeitoApoio, quebrarConcentracao,
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/velocidade-magia.test.js
git commit -m "feat(batalha): aplica efeito de apoio e quebra concentração"
```

---

### Task 6: Movimento e ação extra pela velocidade efetiva

**Files:**
- Modify: `src/12-batalha/batalha.jsx:1437` (`processarViradaDeRodada`)
- Test: `src/12-batalha/velocidade-magia.test.js`

**Interfaces:**
- Consumes: `vbEfetivo`, `movimentoBase` (de `tabuleiro.jsx`, disponível em runtime)
- Produces: `montarNovaRodada` passa a devolver `mov_rest` e `pa_rest` calculados pela VB EFETIVA

- [ ] **Step 1: Escrever o teste que falha**

Adicionar a `velocidade-magia.test.js`:

```js
describe('virada de rodada — iniciativa, movimento e ação extra andam juntos', () => {
  const base = (nome, vb, extra) => ({
    tipo: 'pj', ref_id: nome, inst_id: 'pj:' + nome, nome, vb,
    status: 'ativo', atual: false, ordem: 1,
    pa_max: 2, pa_rest: 0, mov_rest: 0, moveu_na_rodada: true,
    ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0, karma: 9, karma_max: 9,
    status_temp: [], ...extra,
  });
  const acelerar = (n) => ([{ id: 'mag:v:1', nome: 'Velocidade', rodadas_rest: null,
                              efeito: { tipo: 'mod_vb', valor: n } }]);

  it('acelerado passa na frente na rodada seguinte', () => {
    const arr = [base('Lento', 20), base('Rapido', 12, { status_temp: acelerar(15) })];
    const { participantes } = M.montarNovaRodada(arr);
    const rapido = participantes.find((p) => p.nome === 'Rapido');
    const lento  = participantes.find((p) => p.nome === 'Lento');
    expect(rapido.ordem).toBeLessThan(lento.ordem);
    expect(rapido.vb).toBe(12);   // o vb REAL não muda
  });

  it('movimento segue a velocidade efetiva, não o vb cru', () => {
    // movimentoBase = max(5, floor(VB * 5/20)). VB 20 → 5; VB 40 → 10.
    const { participantes } = M.montarNovaRodada([base('A', 20, { status_temp: acelerar(20) })]);
    expect(participantes[0].mov_rest).toBe(10);
  });

  it('debuff grande não derruba o movimento abaixo do piso de 5', () => {
    const { participantes } = M.montarNovaRodada([base('A', 20, { status_temp: acelerar(-18) })]);
    expect(participantes[0].mov_rest).toBe(5);
  });

  it('velocidade efetiva ACIMA de 30 dá uma ação extra', () => {
    const { participantes } = M.montarNovaRodada([base('A', 20, { status_temp: acelerar(15) })]);
    expect(participantes[0].pa_rest).toBe(3);   // pa_max 2 + 1
  });

  it('exatamente 30 NÃO dá ação extra (a regra é "ultrapassar")', () => {
    const { participantes } = M.montarNovaRodada([base('A', 20, { status_temp: acelerar(10) })]);
    expect(participantes[0].pa_rest).toBe(2);
  });

  it('quem já nasce acima de 30 também ganha a ação extra', () => {
    const { participantes } = M.montarNovaRodada([base('A', 35)]);
    expect(participantes[0].pa_rest).toBe(3);
  });

  it('quem não está ativo não recupera nada', () => {
    const { participantes } = M.montarNovaRodada([base('A', 35, { status: 'desmaiado' })]);
    expect(participantes[0].pa_rest).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: FAIL nos casos de `mov_rest` (10 esperado, 5 recebido) e `pa_rest` (3 esperado, 2 recebido)

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, dentro de `processarViradaDeRodada` (linha ~1436):

```js
  // Rodada nova devolve PA, movimento cheio E o direito de mover de novo
  // (moveu_na_rodada). Quem não está ativo não recupera nada.
  //
  // Movimento e PA saem da VB EFETIVA (01/09/2026), não do vb cru:
  //   • movimento — "velocidade" governa o passo, não só a ordem. Isso muda
  //     também o alcance da Velocidade -5 da Falha Crítica, que antes só
  //     atrasava a iniciativa. Intencional.
  //   • ação extra — regra do sistema, lida da descrição da magia Velocidade:
  //     "Se sua velocidade ultrapassar 30, você terá uma segunda ação na
  //     mesma rodada". Vale pra QUALQUER combatente acima de 30, venha o
  //     bônus de onde vier (ou de vb nenhum: quem já nasce rápido também
  //     ganha). "Ultrapassar" é estrito: 30 exatos não ganham.
  const vbEf = vbEfetivo(p);
  let next = (p.status === 'ativo')
    ? { ...p, pa_rest: p.pa_max + (vbEf > 30 ? 1 : 0),
              mov_rest: movimentoBase(vbEf), moveu_na_rodada: false }
    : { ...p };
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira — esta task mexe em código de combate compartilhado**

Run: `npm test`
Expected: PASS, 231 + os novos. Se `motor-batalha.test.js` ou `virada-rodada.test.js` quebrarem, é regressão real: PARE e investigue antes de commitar.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/velocidade-magia.test.js
git commit -m "feat(batalha): movimento e ação extra seguem a velocidade efetiva"
```

---

### Task 7: Strings PT/EN da aba Apoio

**Files:**
- Modify: `src/01-core/copy.jsx` (blocos `pt.batalha` e `en.batalha`)

**Interfaces:**
- Consumes: nada
- Produces: chaves `tb.apoio`, `tb.magiaDeApoio`, `tb.efeito`, `tb.nivel`, `tb.velocidade`, `tb.porRodadas`, `tb.ateOFim`, `tb.concentracao`, `tb.avisoConcentracao`, `tb.usar1Pa`, `tb.semMagiasDeApoio`, `tb.alvoResistiu`

> **Conferido em 01/09/2026:** `tb.nivel` e `tb.velocidade` NÃO existem hoje em `COPY.*.batalha` — a Task 8 depende dos dois. `tb.alvo`, `tb.magia`, `tb.item` e `tb.arma` já existem e são reaproveitados. `interpolate` já é global (`01-core/helpers.jsx`).

- [ ] **Step 1: Adicionar as chaves em PT**

Em `src/01-core/copy.jsx`, dentro de `pt.batalha` (mantendo a ordem alfabética que o bloco já usa):

```js
      apoio: 'Apoio',
      alvoResistiu: 'O alvo resistiu — o efeito não pegou.',
      ateOFim: 'até o fim da batalha',
      avisoConcentracao: 'Enquanto sustenta esta magia, você não pode fazer mais nada. Atacar, usar item, andar ou levar dano na Energia Física quebra a concentração.',
      concentracao: 'Concentração',
      efeito: 'Efeito',
      magiaDeApoio: 'Magia',
      nivel: 'nível',
      porRodadas: 'por {n} rodadas',
      semMagiasDeApoio: 'Este combatente não conhece magias de apoio.',
      usar1Pa: 'Usar (1 PA)',
      velocidade: 'de velocidade',
```

- [ ] **Step 2: Adicionar as mesmas chaves em EN**

Dentro de `en.batalha`:

```js
      apoio: 'Support',
      alvoResistiu: 'The target resisted — the effect did not land.',
      ateOFim: 'until the battle ends',
      avisoConcentracao: 'While sustaining this spell you cannot do anything else. Attacking, using an item, moving or taking Physical Energy damage breaks concentration.',
      concentracao: 'Concentration',
      efeito: 'Effect',
      magiaDeApoio: 'Spell',
      nivel: 'level',
      porRodadas: 'for {n} rounds',
      semMagiasDeApoio: 'This combatant knows no support spells.',
      usar1Pa: 'Use (1 AP)',
      velocidade: 'speed',
```

- [ ] **Step 3: Verificar que os dois blocos parseiam**

Run: `node -e "const s=require('fs').readFileSync('src/01-core/copy.jsx','utf8').replace('const COPY','var COPY');const c=new Function('window',s+'; return COPY;')({});for(const k of ['apoio','nivel','velocidade','porRodadas'])console.log(k, JSON.stringify(c.pt.batalha[k]), JSON.stringify(c.en.batalha[k]));"`
Expected: as quatro chaves preenchidas nos DOIS idiomas, nenhuma `undefined`

- [ ] **Step 4: Commit**

```bash
git add src/01-core/copy.jsx
git commit -m "i18n(batalha): strings PT/EN da aba Apoio"
```

---

### Task 8: Aba "Apoio" no AcaoPanel

**Files:**
- Modify: `src/12-batalha/batalha.jsx` (`AcaoPanel`, ~linhas 3231-4060)
- Test: `src/12-batalha/apoio-tab.test.jsx` (criar)

**Interfaces:**
- Consumes: `magiasDeApoioDoAtor` (Task 4), `resolverResistencia` (global de `game-data.jsx`)
- Produces: `onAplicarApoio({ ator, alvo, magia, custo_karma, resistencia, d20, resistiu })` — prop nova do `AcaoPanel`, consumida pelas Tasks 9 e 10

**Regra de resistência (decisão de implementação):** quando `magia.resistencia` é `'rm'` ou `'rf'`, a força de ATAQUE é o nível efetivo da magia e a força de DEFESA é o `rm`/`rf` do alvo, ambas presas em 1..20 — que é o intervalo que `resolverResistencia` aceita. O alvo rola d20: `> alvo` resistiu (efeito não pega), `< alvo` falhou (efeito pega), `=` empate e rola de novo, exatamente como a aba Resistência já faz.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/12-batalha/apoio-tab.test.jsx`:

```jsx
/* ============================================================
   apoio-tab.test.jsx — a aba Apoio do painel de Ação
   ============================================================
   Cobre o que a aba promete: só aparece pra quem tem magia de apoio,
   lista o efeito no nível efetivo, e só oferece rolagem quando a magia
   exige teste de resistência.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel;
beforeAll(() => { AcaoPanel = window.AcaoPanel; expect(AcaoPanel).toBeDefined(); });
afterEach(cleanup);

const CATALOGO = { machado_pesado: {
  slug: 'machado_pesado', nome: 'Machado Pesado', dano: 20,
  dano_l: -3, dano_m: -1, dano_p: 2, ajuste_atributo: 'FOR',
  grupo_armas: 'CM', alcance: 0 } };

const pjBase = {
  id: 64, nome: 'Yuldrous', raca: 'Anão', reino: 'Verrogar',
  profissao: 'Sacerdote', especializacao: 'Ordem de Crezir', deus: 'Crezir',
  intelecto_base: 2, aura_base: 2, carisma_base: 0,
  forca_base: 2, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 42, habilidades: {}, habilidades_bonus: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: { CM: 1 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ slug: 'machado_pesado', slot: 'mao_d', equipado: true }] },
};

const MAGIAS = {
  velocidade: { key: 'velocidade', nome: 'Velocidade', duracao: '30 minutos',
    descricao: 'Descarga cinética. Se sua velocidade ultrapassar 30, você terá uma segunda ação.',
    nivel_1: 'Aumente 2 de velocidade.' },
  distracao: { key: 'distracao', nome: 'Distração', duracao: '2 rodadas',
    descricao: 'Chama a atenção de todos que não passarem em um teste de resistência mágica.',
    nivel_1: 'Reduza 4 pontos de velocidade.' },
};

const ATOR = {
  tipo: 'pj', ref_id: 64, inst_id: 'pj:64', nome: 'Yuldrous', ordem: 1,
  status: 'ativo', atual: true, vb: 20, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false,
  ef: 10, ef_max: 10, eh: 5, eh_max: 5, ar: 0, ar_max: 0,
  karma: 9, karma_max: 9, status_temp: [], condicoes: {},
};

const INIMIGO = {
  tipo: 'criatura', ref_id: 'lobo', inst_id: 'criatura:lobo', nome: 'Lobisomem',
  ordem: 2, status: 'ativo', atual: false, vb: 18, pa_max: 2, pa_rest: 2,
  mov_rest: 5, moveu_na_rodada: false,
  ef: 30, ef_max: 30, eh: 12, eh_max: 12, ar: 0, ar_max: 0,
  karma: 0, karma_max: 0, rf: 10, rm: 8, status_temp: [],
};

function montar(magiasDoPj, extraProps) {
  const pj = { ...pjBase, magias: magiasDoPj };
  return render(
    <div className="menestrel-ui">
      <AcaoPanel
        ator={ATOR}
        participantes={[ATOR, INIMIGO]}
        catalogos={{ pjById: { 64: pj }, catalogoBySlug: CATALOGO, magiasByKey: MAGIAS }}
        lang="pt"
        onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}}
        onAplicarApoio={() => {}} onCancel={() => {}}
        onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}}
        {...extraProps}
      />
    </div>
  );
}

const abaApoio = () => screen.getAllByRole('button').find((b) => /^Apoio$/.test(b.textContent));

describe('aba Apoio — quando aparece', () => {
  it('não aparece pra quem não tem magia de apoio', () => {
    montar({});
    expect(abaApoio()).toBeFalsy();
  });

  it('aparece quando o PJ tem magia que mexe em velocidade', () => {
    montar({ velocidade: 1 });
    expect(abaApoio()).toBeTruthy();
  });

  it('não aparece se a magia conhecida não mexe em velocidade', () => {
    montar({ bola: 1 });   // key inexistente no catálogo
    expect(abaApoio()).toBeFalsy();
  });
});

describe('aba Apoio — conteúdo', () => {
  it('mostra o efeito e a duração da magia escolhida', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    expect(screen.getByText(/\+2/)).toBeTruthy();
    expect(screen.getByText(/até o fim da batalha/i)).toBeTruthy();
  });

  it('magia SEM teste não oferece rolagem de dado', () => {
    montar({ velocidade: 1 });
    fireEvent.click(abaApoio());
    const rolar = screen.getAllByRole('button').find((b) => /Rolar d20/i.test(b.textContent));
    expect(rolar).toBeFalsy();
  });

  it('magia COM teste de resistência oferece a rolagem', () => {
    montar({ distracao: 1 });
    fireEvent.click(abaApoio());
    const rolar = screen.getAllByRole('button').find((b) => /Rolar d20/i.test(b.textContent));
    expect(rolar).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/12-batalha/apoio-tab.test.jsx`
Expected: FAIL — a aba Apoio não existe

- [ ] **Step 3: Implementar a aba**

Em `AcaoPanel`:

**(a)** Depois de `const alvos = useMemo(...)` (~linha 3255), adicionar a lista e o estado:

```js
  const magiasApoio = useMemo(() => magiasDeApoioDoAtor(ator, catalogos), [ator, catalogos]);
  const temApoio = magiasApoio.length > 0;
```

**(b)** Junto dos outros `useState` de seleção (~linha 3337):

```js
  const [apoioIdx, setApoioIdx] = useState(0);
  const apoioSel = magiasApoio[apoioIdx] || null;
```

**(c)** No cálculo de `alvoResist` (~linha 3460), acrescentar o ramo da aba:

```js
  } else if (tab === 'apoio' && apoioSel && apoioSel.resistencia && alvo) {
    // Força de ataque = nível efetivo da magia; força de defesa = RF/RM do
    // alvo. Ambas presas em 1..20, que é o intervalo de resolverResistencia.
    const fAtk = Math.max(1, Math.min(20, apoioSel.nivel));
    const fDef = Math.max(1, Math.min(20, Number(alvo[apoioSel.resistencia]) || 1));
    alvoResist = (typeof resolverResistencia === 'function')
      ? resolverResistencia(fAtk, fDef) : null;
  }
```

**(d)** Em `resResist` (~linha 3466), trocar a guarda `tab === 'resistencia'` por `(tab === 'resistencia' || tab === 'apoio')`.

**(e)** Em `podeAplicar` (~linha 3510), acrescentar o ramo ANTES do `: false` final:

```js
    : (tab === 'apoio')
      ? (!semPA && !!apoioSel && !!alvo && (ator.karma || 0) >= apoioSel.custo_karma
         && (!apoioSel.resistencia || (d20 != null && resResist !== 'empate')))
```

**(f)** Em `temRolagemPendente` (~linha 3540), a aba Apoio só tranca quando REALMENTE rolou — magia sem teste não rola:

```js
  const semAlvoPossivel = (tab === 'arma' || tab === 'magia') && alvos.length === 0;
  const apoioSemDado = tab === 'apoio' && !(apoioSel && apoioSel.resistencia);
  const temRolagemPendente = tab !== 'item' && !apoioSemDado && d20 != null && !semAlvoPossivel;
```

**(g)** Botão da aba, depois do botão de Magia (~linha 3676):

```jsx
        {temApoio && (
          <button className={'acao-tab' + (tab === 'apoio' ? ' on' : '')}
            onClick={() => trocaTab('apoio')} disabled={temRolagemPendente}>
            <i className="ti ti-wand" aria-hidden="true" />{tb.apoio}
          </button>
        )}
```

**(h)** Corpo da aba, junto dos outros blocos `{tab === '...' && (...)}`:

```jsx
      {tab === 'apoio' && (
        magiasApoio.length === 0 ? (
          <p className="atacar-aviso-vazio">{tb.semMagiasDeApoio}</p>
        ) : (
          <>
            <div className="atacar-row2">
              <SelectPill
                label={tb.magiaDeApoio}
                value={apoioIdx}
                disabled={temRolagemPendente}
                onChange={(v) => { setApoioIdx(parseInt(v, 10)); setD20(null); }}
                options={magiasApoio.map((m, i) => ({ value: i, label: `${m.nome} · ${tb.nivel} ${m.nivel}` }))}
              />
              <SelectPill
                label={tb.alvo}
                value={alvoIdx}
                disabled={temRolagemPendente}
                onChange={(v) => { setAlvoIdx(parseInt(v, 10)); setD20(null); }}
                options={alvos.map((p, i) => ({ value: i, label: p.nome }))}
              />
            </div>
            {apoioSel && (
              <div className="acao-item-efeito">
                <strong>{tb.efeito}:</strong>{' '}
                {apoioSel.mod_vb > 0 ? `+${apoioSel.mod_vb}` : apoioSel.mod_vb} {tb.velocidade}
                {' · '}
                {apoioSel.concentracao
                  ? tb.concentracao
                  : apoioSel.rodadas != null
                    ? interpolate(tb.porRodadas, { n: apoioSel.rodadas })
                    : tb.ateOFim}
              </div>
            )}
            {apoioSel && apoioSel.concentracao && (
              <p className="acao-karma-line">{tb.avisoConcentracao}</p>
            )}
            {apoioSel && apoioSel.resistencia && resResist === 'resistiu' && (
              <div className="err-msg">{tb.alvoResistiu}</div>
            )}
          </>
        )
      )}
```

**(i)** No rodapé, o gatilho de "Rolar dado" (~linha 4005) hoje só aparece quando `colunaClamped != null` ou `alvoResist != null`. A condição já cobre a aba Apoio com resistência, porque `alvoResist` passa a ser calculado em (c). Confirme que a guarda externa é `(tab === 'resistencia' ? alvoResist != null : colunaClamped != null)` e troque por:

```jsx
        {((tab === 'resistencia' || tab === 'apoio') ? alvoResist != null : colunaClamped != null) && (
```

E no `disabled` do botão, acrescentar o ramo:

```js
                : tab === 'apoio' ? alvoResist == null
```

**(j)** No botão de confirmar (~linha 4065), o rótulo e o handler:

```jsx
        <button className="btn-primary btn-sm" disabled={!podeAplicar} onClick={aplicar}>
```

`aplicar` ganha o ramo, ANTES do `else` que trata arma:

```js
    } else if (tab === 'apoio' && apoioSel && alvo) {
      onAplicarApoio && onAplicarApoio({
        ator, alvo, magia: apoioSel,
        custo_karma: apoioSel.custo_karma,
        resistencia: apoioSel.resistencia || null,
        d20: apoioSel.resistencia ? d20 : null,
        resistiu: apoioSel.resistencia ? (resResist === 'resistiu') : false,
      });
```

E no rótulo, `v` passa a considerar a aba:

```js
            const v = tab === 'arma' || tab === 'magia' ? tb.verboAtacar
                    : tab === 'resistencia' ? tb.verboResistir
                    : tb.verboUsar;
```

(já cai em `verboUsar` para `apoio` — nenhuma mudança necessária aqui).

**(k)** Adicionar `onAplicarApoio` à assinatura do componente:

```js
function AcaoPanel({ ator, participantes, catalogos, lang, onAplicar, onAplicarTeste, onAplicarItem, onAplicarApoio, onCancel, onRolagemPendenteChange, rolagemSalva, onRolagemSalvaChange }) {
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/12-batalha/apoio-tab.test.jsx`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS. `softlock-acao.test.jsx` e `alvos-validos.test.jsx` mexem no mesmo painel — se quebrarem, é regressão real.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/apoio-tab.test.jsx
git commit -m "feat(batalha): aba Apoio no painel de Ação"
```

---

### Task 9: Handler do Mestre + ganchos de concentração

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `ConduzirBatalhaView`: novo `aplicarApoio`, ganchos em `aplicarAcao` (~1905), `aplicarTeste` (~2014), `aplicarItem` (~2110), `moverNoTabuleiro` (~1692); prop no `<AcaoPanel/>` (~2530)

**Interfaces:**
- Consumes: `aplicarEfeitoApoio`, `quebrarConcentracao` (Task 5); payload de `onAplicarApoio` (Task 8)
- Produces: nada para tasks seguintes

- [ ] **Step 1: Escrever o handler**

Em `ConduzirBatalhaView`, depois de `aplicarItem`:

```js
  // Fase 5e — aplica uma magia de APOIO (buff/debuff de velocidade).
  // Debita 1 PA e o karma do conjurador, aplica o efeito no alvo (se ele não
  // resistiu) e loga. Diferente de aplicarAcao: não há dano nem cascata.
  const aplicarApoio = (payload) => {
    const { ator, alvo, magia, custo_karma, resistencia, d20, resistiu } = payload;
    const atorIdx = participantes.findIndex((p) => mesmoParticipante(p, ator));
    const alvoIdx = participantes.findIndex((p) => mesmoParticipante(p, alvo));
    if (atorIdx < 0 || alvoIdx < 0) return;

    // Lançar uma magia É uma ação: derruba qualquer concentração anterior
    // DESTE conjurador antes de aplicar a nova.
    let next = [...quebrarConcentracao(participantes, participantes[atorIdx].inst_id)];

    next[atorIdx] = {
      ...next[atorIdx],
      pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1),
      karma:   Math.max(0, (next[atorIdx].karma   || 0) - Math.max(0, custo_karma || 0)),
    };
    if (!resistiu) {
      next[alvoIdx] = aplicarEfeitoApoio(next[alvoIdx], magia, next[atorIdx].inst_id);
    }

    const entry = {
      rodada, ts: Date.now(),
      autor_tipo: ator.tipo, autor_ref_id: ator.ref_id, autor_nome: participantes[atorIdx].nome,
      acao: 'apoio',
      alvo_tipo: alvo.tipo, alvo_ref_id: alvo.ref_id, alvo_nome: alvo.nome,
      magia_key: magia.key, magia_nivel: magia.nivel, arma_nome: magia.nome,
      mod_vb: magia.mod_vb, rodadas: magia.rodadas,
      concentracao: !!magia.concentracao,
      custo_karma: Math.max(0, custo_karma || 0),
      ...(resistencia ? { resistencia, d20, resistiu: !!resistiu } : {}),
    };
    const novoLog = [...log, entry];

    if (historia && historia.id) {
      const sinal = magia.mod_vb > 0 ? '+' : '';
      const texto = resistiu
        ? `${participantes[atorIdx].nome} lançou ${magia.nome} em ${alvo.nome} — resistiu`
        : `${participantes[atorIdx].nome} lançou ${magia.nome} em ${alvo.nome} (${sinal}${magia.mod_vb} de velocidade)`;
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historia.id,
        p_tipo: 'magia',
        p_texto: texto,
        p_meta: { batalha_id: batalha.id, rodada, ...entry },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha] registrar_evento_mesa (apoio) falhou:', rpcErr);
      });
    }

    // Mesma regra de fim de turno das outras ações.
    let viraRodada = false;
    const a = next[atorIdx];
    if ((a.pa_rest === 0 || a.status !== 'ativo' || statusTemEfeito(a, 'sem_acoes')) && a.atual) {
      const prox = proximoAtivo(next, a.ordem);
      if (prox) next = next.map((p) => ({ ...p, atual: mesmoParticipante(p, prox) }));
      else viraRodada = true;
    }
    if (viraRodada) { setRolagemSalva(null); novaRodada(next, novoLog, true); return; }
    setRolagemSalva(null);
    persistir({ participantes: next, log: novoLog, rolagem_pendente: null }, () => {
      setParticipantes(next); setLog(novoLog); setAcaoOpen(false);
    });
  };
```

- [ ] **Step 2: Ligar os ganchos de quebra de concentração**

**(a)** Em `aplicarAcao`, logo depois de `let next = [...participantes];` (~linha 1814):

```js
    // Atacar quebra a concentração de quem ataca. E se o dano chegar na EF do
    // ALVO, quebra a dele também (regra: só dano que fura EH e AR conta).
    next = [...quebrarConcentracao(next, next[atorIdx].inst_id)];
```

e, depois da linha `next[alvoIdx] = aplicarDanoCascata(dano, next[alvoIdx], critico);`:

```js
      if (next[alvoIdx].ef < participantes[alvoIdx].ef) {
        next = [...quebrarConcentracao(next, next[alvoIdx].inst_id)];
      }
```

**(b)** Em `aplicarTeste` e `aplicarItem`, logo depois de montarem o `next`, a mesma linha do ator:

```js
    next = [...quebrarConcentracao(next, next[idx].inst_id)];
```

(use o índice do ator que cada função já calculou — `atorIdx` em `aplicarTeste`, `idx` em `aplicarItem`.)

**(c)** Em `moverNoTabuleiro` (~linha 1700), trocar o cálculo de `next`:

```js
    // Andar quebra a concentração (regra confirmada em 01/09/2026).
    const movido = participantes.map((q, i) => (i === idx ? r.participante : q));
    const next = [...quebrarConcentracao(movido, p.inst_id)];
```

**(d)** Em `mudarStatus` (~linha 1708), onde o status deixa de ser `'ativo'`, acrescentar depois do array atualizado:

```js
    // Desmaiar, morrer ou desistir derruba a magia que a pessoa sustentava.
    const comQuebra = (atualizado.status !== 'ativo')
      ? [...quebrarConcentracao(next, atualizado.inst_id)] : next;
```

e persistir `comQuebra` em vez de `next`.

- [ ] **Step 3: Passar a prop pro painel**

No `<AcaoPanel/>` de `menuDe` (~linha 2530), junto de `onAplicarItem`:

```jsx
                onAplicarApoio={aplicarApoio}
```

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ built in ...`, sem erro de TypeScript

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx
git commit -m "feat(batalha): Mestre aplica magia de apoio e quebra concentração"
```

---

### Task 10: Espelho no lado do Jogador

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `BatalhaJogadorView`: novo `handleApoio`, ganchos em `handleAcao`, `handleTeste`, `handleItem`, `moverNoTabuleiroJogador` (~4466); prop no `<AcaoPanel/>` (~4612)

**Interfaces:**
- Consumes: os mesmos de Task 9
- Produces: nada

- [ ] **Step 1: Escrever o handler espelhado**

Em `BatalhaJogadorView`, depois de `handleItem`:

```js
  // ── Apoio — espelha aplicarApoio do Mestre ──
  const handleApoio = (payload) => {
    if (!ehMinhaVez || !meuParticipante) return;
    const { ator, alvo, magia, custo_karma, resistencia, d20, resistiu } = payload;
    const atorIdx = participantes.findIndex((p) => mesmoParticipante(p, ator));
    const alvoIdx = participantes.findIndex((p) => mesmoParticipante(p, alvo));
    if (atorIdx < 0 || alvoIdx < 0) return;

    let next = [...quebrarConcentracao(participantes, participantes[atorIdx].inst_id)];
    next[atorIdx] = {
      ...next[atorIdx],
      pa_rest: Math.max(0, (next[atorIdx].pa_rest || 0) - 1),
      karma:   Math.max(0, (next[atorIdx].karma   || 0) - Math.max(0, custo_karma || 0)),
    };
    if (!resistiu) {
      next[alvoIdx] = aplicarEfeitoApoio(next[alvoIdx], magia, next[atorIdx].inst_id);
    }

    const entry = {
      rodada, ts: Date.now(),
      autor_tipo: ator.tipo, autor_ref_id: ator.ref_id, autor_nome: participantes[atorIdx].nome,
      acao: 'apoio',
      alvo_tipo: alvo.tipo, alvo_ref_id: alvo.ref_id, alvo_nome: alvo.nome,
      magia_key: magia.key, magia_nivel: magia.nivel, arma_nome: magia.nome,
      mod_vb: magia.mod_vb, rodadas: magia.rodadas,
      concentracao: !!magia.concentracao,
      custo_karma: Math.max(0, custo_karma || 0),
      ...(resistencia ? { resistencia, d20, resistiu: !!resistiu } : {}),
    };

    if (historia && historia.id) {
      const sinal = magia.mod_vb > 0 ? '+' : '';
      const texto = resistiu
        ? `${participantes[atorIdx].nome} lançou ${magia.nome} em ${alvo.nome} — resistiu`
        : `${participantes[atorIdx].nome} lançou ${magia.nome} em ${alvo.nome} (${sinal}${magia.mod_vb} de velocidade)`;
      supabaseClient.rpc('registrar_evento_mesa', {
        p_historia_id: historia.id, p_tipo: 'magia', p_texto: texto,
        p_meta: { batalha_id: batalha.id, rodada, ...entry },
      }).then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[batalha-jogador] registrar_evento_mesa (apoio) falhou:', rpcErr);
      });
    }

    const r = autoPassarSeNecessario(next, next[atorIdx]);
    setRolagemSalva(null);
    persistJogador({ participantes: r.participantes, log: [...log, entry], rolagem_pendente: null,
      ...(r.rodadaNova != null ? { rodada: r.rodadaNova } : {}) });
  };
```

- [ ] **Step 2: Ligar os ganchos no lado do Jogador**

Mesma lógica da Task 9, nas funções espelhadas:

- `handleAcao`: quebra do ator depois de montar `next`, e quebra do alvo quando `next[alvoIdx].ef < participantes[alvoIdx].ef`;
- `handleTeste` e `handleItem`: quebra do ator;
- `moverNoTabuleiroJogador` (~4466): quebra do próprio jogador, no mesmo molde do `moverNoTabuleiro` do Mestre.

- [ ] **Step 3: Passar a prop pro painel**

No `<AcaoPanel/>` do Jogador (~linha 4612):

```jsx
                      onAplicarApoio={handleApoio}
```

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ built in ...`

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx
git commit -m "feat(batalha): Jogador aplica magia de apoio, espelhando o Mestre"
```

---

## Verificação final

Depois da Task 10, antes de considerar pronto:

- [ ] `npm test` — suíte inteira verde
- [ ] `npm run build` — sem erro
- [ ] `npm run lint` — 9 erros e 1 aviso PRÉ-EXISTENTES (em `src/data/bridge.ts`, `src/components/ui/*`, `src/test/setup-fases.ts`, `vitest.config.ts`). Nenhum erro novo em `src/12-batalha/` ou `src/01-core/`.
- [ ] Rodar o app (`npx vite`) e conferir na tela: com um PJ conjurador na batalha, a aba Apoio aparece, lista a magia, aplica o efeito, e o combatente muda de posição na ordem na rodada seguinte.
