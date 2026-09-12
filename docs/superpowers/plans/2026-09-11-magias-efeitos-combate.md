# Magias — efeitos mecânicos em combate (Fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As 25 magias que os PJs da campanha conhecem passam a produzir efeito mecânico nas rodadas de batalha, pelas quatro dimensões do sistema — nível, alvo, rodadas de evocação e rodadas de duração.

**Architecture:** Mesmo modelo das técnicas — a magia grava `status_temp` e os consumidores leem —, com duas diferenças. **(a)** O registro é híbrido: `MAGIA_EFEITO_MAP` guarda só a semântica (alvo, nº de alvos, sinal, unidades) e um parser novo lê o número do texto `nivel_N`, porque a magia tem cinco textos por nível e digitá-los à mão sairia de sincronia no primeiro UPDATE do editor de admin. **(b)** Entra um mecanismo novo, a evocação canalizada: o conjurador fica preso por N rodadas antes de a magia resolver, e qualquer outra ação derruba — reusando inteiras as três funções de quebra da concentração.

**Tech Stack:** React 19 sem bundler de módulo (`.jsx` carregados por `main.tsx`, símbolos por `Object.assign(window, {...})`), Vitest, Supabase.

**Spec:** `docs/superpowers/specs/2026-09-11-magias-efeitos-combate-design.md`

## Global Constraints

- **Padrão de módulo:** nada de `export`. Funções puras do motor saem por `window.MotorBatalha`; o registro e o parser saem por `Object.assign(window, {...})` no fim do arquivo. Arquivo novo precisa de `import` em `src/main.tsx`, **depois** de `game-data.jsx` e **antes** de `12-batalha/batalha.jsx`.
- **Padrão de teste:** `import './arquivo.jsx'` pelo efeito colateral, ler `window.X` em `beforeAll`. Rodar um arquivo: `npx vitest run <caminho>`. Suíte inteira: `npm test`.
- **Idioma:** código e comentários em português. Comentário explica POR QUÊ, não O QUÊ.
- **i18n:** texto de INTERFACE passa pelo objeto de tradução. **Exceção documentada:** mensagens da Central de Mensagens (`registrar_evento_mesa`) são PT literal — são gravadas num log compartilhado que vários jogadores com idiomas diferentes leem, e as chamadas existentes fazem assim. Siga o padrão existente.
- **Commits:** `git add` com caminhos EXPLÍCITOS. NUNCA `git add -A`, `git add .`, `git commit -a`. Mensagem em português: `feat(batalha):` / `fix(batalha):` / `test(batalha):` / `feat(magias):`.
- **SEM DELETE, SEM REAÇÃO.** Nenhuma magia interrompe o turno alheio.
- **`motor-batalha.test.js` é intocável.** Congela as regras de cascata confirmadas em 06/07/2026. Se uma expectativa dele mudar, é regressão — pare e reporte.
- **`aplicarDanoCascata` não muda de assinatura.** `reducao_dano` entra ANTES dela, reduzindo o número de entrada.
- **BASELINE:** `npm test` = **1001 testes em 55 arquivos**, verdes (medido em 11/09/2026).

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/01-core/magias-efeito.jsx` **(criar)** | O parser `efeitosNoNivel` + `elementoDoNivel` + o `MAGIA_EFEITO_MAP` com as 25 entradas + `magiaEfeitoDe` |
| `src/01-core/magias-efeito.test.js` **(criar)** | O registro contra o banco e o acordo mapa↔parser |
| `src/12-batalha/batalha.jsx` **(modificar)** | `danoMagiaNoNivel` (verbo), `aplicarEfeitoMagia`, as primitivas novas, o estado `evocando`, as três funções de quebra, `magiasDeApoioDoAtor`, a UI das abas Magia e Apoio |
| `src/12-batalha/tabuleiro.jsx` **(modificar)** | `parseAlcance` — `Pessoal` deixa de ser `Toque` |
| `src/12-batalha/magia-evocacao.test.js` **(criar)** | O ciclo canalizado inteiro |
| `src/12-batalha/magia-efeitos.test.js` **(criar)** | As primitivas, multi-alvo, restrição de alvo |
| `src/12-batalha/dano-cascata-modificadores.test.js` **(modificar)** | Os casos de `reducao_dano` |
| `src/12-batalha/velocidade-magia.test.js` **(modificar)** | Velocidade migra para o registro sem mudar de comportamento |
| `scripts/sql/magias-curas-fisicas-fix.sql` **(criar)** | O UPDATE do typo do nível 9 |
| `src/main.tsx` **(modificar)** | `import './01-core/magias-efeito.jsx'` |

---

## Task 1: O parser lê o verbo (e conserta o bug vivo)

Primeira e mais urgente: **três magias de proteção aparecem hoje na aba Magia como ofensivas**, porque `danoMagiaNoNivel` casa `"N de dano"` sem olhar o verbo e `"Reduz 16 de dano elemental de ar"` devolve 16.

**Files:**
- Create: `src/01-core/magias-efeito.jsx`
- Create: `src/01-core/magias-efeito.test.js`
- Modify: `src/12-batalha/batalha.jsx` — `danoMagiaNoNivel` (`:516`)
- Modify: `src/main.tsx` — o import

**Interfaces:**
- Consumes: nada
- Produces:
  - `efeitosNoNivel(magia, nivel) -> { coluna?, eh?, ef?, rf?, rm?, vb?, defesa?, dano?, reducao_dano?, cura_eh?, cura_ef? }` — só as unidades encontradas; nunca lança; `{}` quando não acha nada
  - `elementoDoNivel(magia, nivel) -> 'fogo'|'agua'|'ar'|'terra'|'luz'|'celestial'|null`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/01-core/magias-efeito.test.js`:

```js
/* ============================================================
   magias-efeito.test.js — o parser contra o texto do banco
   ============================================================
   O catálogo descreve o efeito em prosa, em cinco textos por nível. Este
   arquivo trava a leitura desses textos.

   As frases abaixo são CÓPIAS LITERAIS do banco de produção (levantamento
   de 11/09/2026), não invenções. Se o catálogo mudar de redação, a mudança
   aparece aqui primeiro.

   O describe do VERBO é o mais importante do arquivo: é regressão de um bug
   que estava VIVO em produção — "Reduz 16 de dano" era lido como 16 de dano
   causado, e as três magias de proteção dos PJs apareciam na aba Magia como
   ataques. Ver spec §7.1.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './magias-efeito.jsx';

let efeitosNoNivel, elementoDoNivel;
beforeAll(() => {
  efeitosNoNivel = window.efeitosNoNivel;
  elementoDoNivel = window.elementoDoNivel;
  expect(efeitosNoNivel).toBeTypeOf('function');
  expect(elementoDoNivel).toBeTypeOf('function');
});

const mag = (nivel1) => ({ key: 'x', nome: 'X', nivel_1: nivel1 });

describe('o verbo decide o sinal — regressão do bug de produção', () => {
  it('Aeroproteção: "Reduz 16 de dano" NÃO é dano causado', () => {
    const r = efeitosNoNivel(mag('Reduz 16 de dano elemental de ar.'), 1);
    expect(r.dano).toBeUndefined();
    expect(r.reducao_dano).toBe(16);
  });

  it('Piroproteção: idem', () => {
    const r = efeitosNoNivel(mag('Reduz 16 de dano elemental de fogo.'), 1);
    expect(r.dano).toBeUndefined();
    expect(r.reducao_dano).toBe(16);
  });

  it('Armadura Elemental: idem, sem elemento específico', () => {
    const r = efeitosNoNivel(mag('Reduz 8 de dano elemental.'), 1);
    expect(r.dano).toBeUndefined();
    expect(r.reducao_dano).toBe(8);
  });

  it('Bola de Fogo: "Causa 12 de dano" É dano causado', () => {
    const r = efeitosNoNivel(mag('Causa 12 de dano elemental de fogo.'), 1);
    expect(r.dano).toBe(12);
    expect(r.reducao_dano).toBeUndefined();
  });

  it('Hidromanipulação usa "Cause", não "Causa" — typo real do catálogo', () => {
    expect(efeitosNoNivel(mag('Cause 4 de dano elemental de água.'), 1).dano).toBe(4);
  });
});

describe('as unidades de buff', () => {
  it('Bênção: coluna e energia heroica na mesma frase', () => {
    const r = efeitosNoNivel(mag('Aumenta 1 coluna de ataque e 5 de energia heroica.'), 1);
    expect(r).toMatchObject({ coluna: 1, eh: 5 });
  });

  it('Bravura: resistência mágica e energia heroica', () => {
    const r = efeitosNoNivel(mag('Aumenta 1 de resistência mágica e 5 de energia heroica.'), 1);
    expect(r).toMatchObject({ rm: 1, eh: 5 });
  });

  it('Super Resistência: as duas resistências, valores iguais', () => {
    const r = efeitosNoNivel(mag('Aumenta 1 de resistência física e 1 de resistência mágica.'), 1);
    expect(r).toMatchObject({ rf: 1, rm: 1 });
  });

  it('Arqueirismo: plural "colunas"', () => {
    expect(efeitosNoNivel(mag('Aumenta 4 colunas de ataque para arco.'), 1).coluna).toBe(4);
  });

  it('Aura Divina: "A área reduz" é redução, sinal negativo fica com o registro', () => {
    expect(efeitosNoNivel(mag('A área reduz 1 coluna de ataque.'), 1).coluna).toBe(1);
  });

  it('Velocidade: continua lendo como antes', () => {
    expect(efeitosNoNivel(mag('Aumenta 2 de velocidade.'), 1).vb).toBe(2);
  });
});

describe('as curas — verbo Restaura, unidade própria', () => {
  it('Curas Espirituais restaura EH, não é buff de EH', () => {
    const r = efeitosNoNivel(mag('Restaura 20 de energia heroica.'), 1);
    expect(r.cura_eh).toBe(20);
    expect(r.eh).toBeUndefined();
  });

  it('Curas Físicas restaura EF', () => {
    expect(efeitosNoNivel(mag('Restaura 4 de energia física.'), 1).cura_ef).toBe(4);
  });
});

describe('o elemento do dano', () => {
  it.each([
    ['Causa 12 de dano elemental de fogo.', 'fogo'],
    ['Cada dardo causa 4 de dano elemental água.', 'agua'],
    ['Causa 4 de dano elemental de ar.', 'ar'],
    ['Cada fragmento causa 12 de dano elemental da terra.', 'terra'],
    ['Causa 4 de dano elemental de luz.', 'luz'],
    ['Cada dardo causa 8 de dano celestial.', 'celestial'],
  ])('%s → %s', (txt, esperado) => {
    expect(elementoDoNivel(mag(txt), 1)).toBe(esperado);
  });

  it('"dano base" não tem elemento (Toque Gélido)', () => {
    expect(elementoDoNivel(mag('Cause 12 de dano base.'), 1)).toBeNull();
  });

  it('"dano elemental" sem qualificador não tem elemento (Armadura Elemental)', () => {
    expect(elementoDoNivel(mag('Reduz 8 de dano elemental.'), 1)).toBeNull();
  });
});

describe('não inventa efeito onde não há', () => {
  it('texto narrativo devolve objeto vazio', () => {
    expect(efeitosNoNivel(mag('Permite fazer uma pergunta ao morto.'), 1)).toEqual({});
  });

  it('nível inexistente devolve objeto vazio, sem lançar', () => {
    expect(efeitosNoNivel(mag('Causa 12 de dano.'), 7)).toEqual({});
  });

  it('magia nula devolve objeto vazio, sem lançar', () => {
    expect(efeitosNoNivel(null, 1)).toEqual({});
  });

  it('REGRESSÃO: número DEPOIS da unidade não conta (Telecinese)', () => {
    // O mesmo erro que velocidade-magia.test.js já trava: "velocidade de 5
    // metros por rodada" descreve, não modifica.
    const r = efeitosNoNivel(mag('Move 5 kg em uma velocidade de 5 metros por rodada.'), 1);
    expect(r.vb).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/01-core/magias-efeito.test.js`
Expected: FAIL — "Cannot find module './magias-efeito.jsx'"

- [ ] **Step 3: Escrever o parser**

Crie `src/01-core/magias-efeito.jsx`:

```jsx
/* ============================================================
   MAGIAS — leitura do efeito e registro mecânico (Fase 1)
   ============================================================
   A tabela `magias` descreve o efeito em prosa, em cinco textos por nível
   (nivel_1/3/5/7/9). Este arquivo faz duas coisas:

     1. efeitosNoNivel() — LÊ o número de cada unidade do texto do nível;
     2. MAGIA_EFEITO_MAP — diz a SEMÂNTICA que a prosa não consegue dizer
        (alvo, nº de alvos, sinal, quais unidades valem).

   A divisão é deliberada (spec §5): a magia tem cinco textos por nível, e
   digitar ~125 números no mapa sairia de sincronia no primeiro UPDATE pelo
   editor de catálogo do admin. Já a prosa sozinha não distingue "A barreira
   reduz 1 coluna de ataque" (defesa própria) de "A área reduz 1 coluna de
   ataque" (penalidade no inimigo), nem diz que Dardos de Gelo pega 3 alvos.

   Spec: docs/superpowers/specs/2026-09-11-magias-efeitos-combate-design.md
   ============================================================ */

/* ── ANCORAR NO VERBO NÃO É OPCIONAL ───────────────────────────────
   danoMagiaNoNivel casava /(\d+)\s*de\s*dano/i sem olhar o verbo, e oito
   magias do catálogo dizem "Reduz N de dano". Três delas (Aeroproteção,
   Piroproteção, Armadura Elemental) os PJs têm, e apareciam na aba Magia
   como ATAQUES — uma proteção de 16 virava um golpe de 16.

   É o mesmo erro que modVelocidadeNoNivel já tinha corrigido ancorando em
   RE_VERBO_MOD; aqui a âncora nunca foi posta. Ver spec §7.1. */
const MAGIA_VERBOS = {
  aumenta:  'mais',
  aumente:  'mais',
  reduz:    'menos',
  reduza:   'menos',
  restaura: 'cura',
  causa:    'dano',
  cause:    'dano',
};

/* Unidade = a frase que vem DEPOIS do número. A ordem importa: 'de energia
   heroica' precisa ser testada antes de qualquer padrão mais curto que
   também case. Cada entrada aponta pro nome do campo de saída. */
const MAGIA_UNIDADES = [
  { re: /colunas?(?:\s+de\s+ataque)?/i,       campo: 'coluna'  },
  { re: /de\s+energia\s+heroica/i,            campo: 'eh'      },
  { re: /de\s+energia\s+f[íi]sica/i,          campo: 'ef'      },
  { re: /de\s+resist[êe]ncia\s+f[íi]sica/i,   campo: 'rf'      },
  { re: /de\s+resist[êe]ncia\s+m[áa]gica/i,   campo: 'rm'      },
  { re: /(?:pontos?\s+)?de\s+velocidade/i,    campo: 'vb'      },
  { re: /de\s+defesa/i,                       campo: 'defesa'  },
  { re: /de\s+dano/i,                         campo: 'dano'    },
];

/* Verbo + número + unidade, nesta ordem e nesta frase.

   O DISCRIMINADOR é a POSIÇÃO do número: modificador é sempre
   `número + unidade`. Quem só DESCREVE põe o número depois ("velocidade de 5
   metros por rodada", na Telecinese) — e esses não podem entrar, senão
   Telecinese viraria um buff de +5. Erro cometido de verdade na investigação
   de 01/09/2026; há teste de regressão pra ele.

   O verbo pode estar a até ~20 caracteres do número porque o catálogo
   escreve "A área reduz 1 coluna" e "Cada dardo causa 4 de dano". */
const RE_VERBO = /\b(aumenta|aumente|reduz|reduza|restaura|causa|cause)\b/gi;

function efeitosNoNivel(magia, nivel) {
  const out = {};
  const txt = (magia && magia['nivel_' + nivel]) || '';
  if (!txt) return out;

  // Cada ocorrência de verbo abre um TRECHO, que vai até o próximo verbo.
  // Assim "Aumenta 1 coluna e 5 de energia heroica" mantém os dois números
  // sob o mesmo verbo, e um texto com dois verbos não mistura os sinais.
  const verbos = [...txt.matchAll(RE_VERBO)];
  if (!verbos.length) return out;

  verbos.forEach((v, i) => {
    const acao = MAGIA_VERBOS[v[1].toLowerCase()];
    if (!acao) return;
    const ini = v.index + v[0].length;
    const fim = (i + 1 < verbos.length) ? verbos[i + 1].index : txt.length;
    const trecho = txt.slice(ini, fim);

    // Todos os pares `número + unidade` deste trecho.
    for (const m of trecho.matchAll(/(\d+)\s*([^,.;]*)/g)) {
      const valor = parseInt(m[1], 10);
      if (!Number.isFinite(valor)) continue;
      const resto = m[2] || '';
      const u = MAGIA_UNIDADES.find((x) => x.re.test(resto));
      if (!u) continue;
      // 'dano' é a única unidade cujo verbo muda o CAMPO, não só o sinal:
      // causar dano e reduzir dano recebido são coisas diferentes, e a
      // segunda é uma primitiva própria (reducao_dano).
      if (u.campo === 'dano') {
        if (acao === 'dano')  { out.dano = valor; }
        if (acao === 'menos') { out.reducao_dano = valor; }
        continue;
      }
      // Restaurar preenche o pool; aumentar levanta o teto. São primitivas
      // distintas (spec §8), então o campo é distinto.
      if (acao === 'cura') {
        if (u.campo === 'eh') out.cura_eh = valor;
        if (u.campo === 'ef') out.cura_ef = valor;
        continue;
      }
      if (acao === 'mais' || acao === 'menos') out[u.campo] = valor;
    }
  });
  return out;
}

/* ── Elemento do dano ──────────────────────────────────────────────
   Não é efeito: é o rótulo que reducao_dano precisa pra casar. Piroproteção
   corta dano de fogo e não corta dano de água.

   "dano elemental" sem qualificador (Armadura Elemental) devolve null, que
   no registro significa "casa qualquer elemento" — é a proteção genérica.
   "dano base" (Toque Gélido) também é null, mas do outro lado: dano sem
   elemento nenhum, que proteção elemental nenhuma corta. Quem distingue os
   dois é o registro, não este leitor. */
const MAGIA_ELEMENTOS = [
  { re: /\bfogo\b/i,                campo: 'fogo'      },
  { re: /\b[áa]gua\b/i,             campo: 'agua'      },
  { re: /\bar\b/i,                  campo: 'ar'        },
  { re: /\bterra\b/i,               campo: 'terra'     },
  { re: /\bluz\b/i,                 campo: 'luz'       },
  { re: /\bcelestial\b/i,           campo: 'celestial' },
];

function elementoDoNivel(magia, nivel) {
  const txt = (magia && magia['nivel_' + nivel]) || '';
  if (!txt) return null;
  // Só olha DEPOIS de "dano": "Reduz 8 de dano elemental" não tem elemento,
  // e uma magia chamada "Bola de Fogo" não pode tirar o elemento do nome.
  const i = txt.toLowerCase().indexOf('dano');
  if (i < 0) return null;
  const cauda = txt.slice(i);
  const achado = MAGIA_ELEMENTOS.find((e) => e.re.test(cauda));
  return achado ? achado.campo : null;
}

Object.assign(window, { efeitosNoNivel, elementoDoNivel });
```

- [ ] **Step 4: Registrar o arquivo no entry**

Em `src/main.tsx`, logo depois da linha `import './01-core/tecnicas-efeito.jsx'`:

```ts
import './01-core/magias-efeito.jsx'
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx vitest run src/01-core/magias-efeito.test.js`
Expected: PASS, todos os describes.

- [ ] **Step 6: Consertar `danoMagiaNoNivel` para usar o parser**

Em `src/12-batalha/batalha.jsx:516`, substitua o corpo:

```js
/* ── Dano de uma magia no nível efetivo do conjurador ───────────────
   Delegado a efeitosNoNivel (01-core/magias-efeito.jsx) desde 11/09/2026.

   A versão anterior casava /(\d+)\s*de\s*dano/i SEM olhar o verbo, e oito
   magias do catálogo dizem "Reduz N de dano". Aeroproteção, Piroproteção e
   Armadura Elemental — as três que os PJs têm — apareciam na aba Magia como
   ofensivas, porque magiasOfensivasDoAtor só filtra por dano > 0.

   Fallback: campo `dano` da tabela (que costuma ser o do nível 9). */
function danoMagiaNoNivel(magia, nivelEfetivo) {
  if (!magia) return 0;
  const ef = (typeof efeitosNoNivel === 'function')
    ? efeitosNoNivel(magia, nivelEfetivo) : {};
  if (ef.dano != null) return ef.dano;
  // Texto de nível que NÃO causa dano não deve cair no fallback: uma
  // proteção com `dano` preenchido na tabela voltaria a virar ataque.
  if (ef.reducao_dano != null) return 0;
  return magia.dano || 0;
}
```

- [ ] **Step 7: Rodar a suíte inteira**

Run: `npm test`
Expected: 1001 passando + os novos do Step 1. **Nenhum teste anterior pode quebrar.** Se `velocidade-magia.test.js` quebrar, pare: ele congela a leitura de velocidade, e o parser novo tem que concordar com ele.

- [ ] **Step 8: Commit**

```bash
git add src/01-core/magias-efeito.jsx src/01-core/magias-efeito.test.js src/12-batalha/batalha.jsx src/main.tsx
git commit -m "fix(magias): danoMagiaNoNivel ancora no verbo; parser unico de efeito

Tres magias de protecao dos PJs (Aeroprotecao, Pirotecao, Armadura
Elemental) apareciam na aba Magia como ofensivas: o leitor casava
'N de dano' sem olhar o verbo, e 'Reduz 16 de dano' devolvia 16.

efeitosNoNivel generaliza a leitura das oito unidades do catalogo e
distingue causar de reduzir. elementoDoNivel le o elemento, que a
reducao de dano precisa pra casar.

Spec secao 7.1."
```

---

## Task 2: Os dois defeitos de dado

Independentes da feature. Ficam numa task só porque são duas linhas cada.

**Files:**
- Create: `scripts/sql/magias-curas-fisicas-fix.sql`
- Modify: `src/12-batalha/tabuleiro.jsx` — `parseAlcance`
- Modify: `src/12-batalha/tabuleiro.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `parseAlcance('Pessoal') -> 0` (era 1)

- [ ] **Step 1: Escrever o teste que falha**

Em `src/12-batalha/tabuleiro.test.js`, acrescente:

```js
describe('parseAlcance — Pessoal não é Toque', () => {
  // 62 magias têm alcance Pessoal e 65 têm Toque; tratá-las igual deixava uma
  // magia "só em si mesmo" aceitar alvo adjacente. A aba Apoio já tratava
  // pessoal à parte (batalha.jsx:663); o tabuleiro não. Spec §7.3.
  it('Pessoal é 0 — só o próprio conjurador', () => {
    expect(window.parseAlcance('Pessoal')).toBe(0);
  });

  it('Toque continua 1 — adjacente', () => {
    expect(window.parseAlcance('Toque')).toBe(1);
  });

  it('Corpo a corpo continua 1', () => {
    expect(window.parseAlcance('Corpo a corpo')).toBe(1);
  });

  it('distância em metros não muda', () => {
    expect(window.parseAlcance('20 metros')).toBe(20);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/tabuleiro.test.js`
Expected: FAIL — `expected 1 to be 0`

- [ ] **Step 3: Separar Pessoal de Toque**

Em `src/12-batalha/tabuleiro.jsx`, dentro de `parseAlcance`, troque a linha
`if (/toque|pessoal|corpo/.test(s)) return 1;` por:

```js
  // Pessoal = SÓ em si mesmo (alcance 0); Toque e corpo a corpo = adjacente.
  // Eram o mesmo valor até 11/09/2026, e por isso uma magia Pessoal aceitava
  // alvo adjacente no tabuleiro. Spec §7.3.
  if (/pessoal/.test(s)) return 0;
  if (/toque|corpo/.test(s)) return 1;
```

E em `alcanceDaAcao`, o `|| 1` de magia precisa virar tolerante a zero — hoje
`parseAlcance(...) || 1` transformaria o 0 de volta em 1:

```js
function alcanceDaAcao({ arma, magia, tecnica } = {}) {
  if (magia) {
    // ?? e não ||: alcance 0 (Pessoal) é válido e não pode virar 1.
    const a = parseAlcance(magia.alcance);
    return a != null ? a : 1;
  }
  if (!arma) return 1;
  return ((tecnica ? parseAlcance(tecnica.alcance) : null) || parseAlcance(arma.alcance)) || 1;
}
```

E `dentroDoAlcance` precisa parar de forçar o piso 1:

```js
function dentroDoAlcance(posA, posB, alcance) {
  // Piso 0, não 1: alcance 0 (magia Pessoal) só casa a própria célula.
  const a = Math.max(0, Math.floor(Number(alcance) || 0));
  return distanciaBordas(posA, posB) <= a;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/12-batalha/tabuleiro.test.js`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: tudo verde. `alvos-validos.test.jsx` e `globais-tabuleiro.test.js` tocam esta área — se algum quebrar, leia a expectativa antes de mudar nada: pode ser que ela codifique o comportamento antigo de propósito.

- [ ] **Step 6: Escrever o script SQL do typo**

Crie `scripts/sql/magias-curas-fisicas-fix.sql`:

```sql
-- scripts/sql/magias-curas-fisicas-fix.sql
-- ============================================================
-- Curas Físicas, nível 9:
--   "Restaura 20 de energia física e e restaura 50 de saúde"
--
-- Dois problemas numa linha só:
--   1) "e e" duplicado — erro de digitação;
--   2) "saúde" é uma unidade que NÃO EXISTE em lugar nenhum do motor. Os
--      pools do sistema são EH → AR → EF (a cascata de aplicarDanoCascata).
--      Não há campo, teto nem regra de "saúde" — o parser não tem como
--      aplicar e ignora em silêncio.
--
-- A segunda metade some. Se "saúde" for para virar regra algum dia, entra
-- como primitiva própria, com o nome de um pool que existe.
--
-- Rodar o SELECT de conferência antes e depois.
-- Ver docs/superpowers/specs/2026-09-11-magias-efeitos-combate-design.md §7.2
-- ============================================================

-- CONFERÊNCIA (antes):
-- SELECT key, nome, nivel_9 FROM public.magias WHERE key = 'curas_fisicas';

BEGIN;

UPDATE public.magias
   SET nivel_9 = 'Restaura 20 de energia física.'
 WHERE key = 'curas_fisicas'
   AND nivel_9 LIKE '%de saúde%';

COMMIT;

-- CONFERÊNCIA (depois): o SELECT acima deve devolver a frase sem "saúde".
```

- [ ] **Step 7: Commit**

```bash
git add scripts/sql/magias-curas-fisicas-fix.sql src/12-batalha/tabuleiro.jsx src/12-batalha/tabuleiro.test.js
git commit -m "fix(batalha): Pessoal deixa de ser Toque; script do typo de Curas Fisicas

parseAlcance devolvia 1 para Pessoal e para Toque, entao as 62 magias de
alcance Pessoal aceitavam alvo adjacente no tabuleiro. Pessoal passa a ser
0, e alcanceDaAcao/dentroDoAlcance param de forcar o piso 1.

O script SQL tira 'e e restaura 50 de saude' do nivel 9 de Curas Fisicas:
saude nao e um pool do sistema (sao EH, AR e EF).

Spec secoes 7.2 e 7.3."
```

> **NÃO rode o SQL automaticamente.** Entregue o arquivo e avise o usuário que
> ele precisa rodar contra produção. O script é idempotente (o `LIKE` no WHERE).

---

## Task 3: O registro das 25 magias

**Files:**
- Modify: `src/01-core/magias-efeito.jsx` — o `MAGIA_EFEITO_MAP` e `magiaEfeitoDe`
- Modify: `src/01-core/magias-efeito.test.js`

**Interfaces:**
- Consumes: `efeitosNoNivel`, `elementoDoNivel` (Task 1)
- Produces:
  - `MAGIA_EFEITO_MAP` — objeto `key -> registro`
  - `magiaEfeitoDe(key) -> registro | null` (nunca lança; `null` = magia narrativa)
  - Forma do registro: `{ alvo, alvos, icone, efeitos[], so_racas?, inverte_em?, grupo_armas?, parcial? }`
  - Forma de um efeito: `{ tipo, unidade, sinal?, elemento?, pool? }`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/01-core/magias-efeito.test.js`:

```js
describe('MAGIA_EFEITO_MAP — a forma das 25 entradas', () => {
  let MAP, magiaEfeitoDe;
  beforeAll(() => {
    MAP = window.MAGIA_EFEITO_MAP;
    magiaEfeitoDe = window.magiaEfeitoDe;
    expect(MAP).toBeDefined();
    expect(magiaEfeitoDe).toBeTypeOf('function');
  });

  const ALVOS_VALIDOS  = ['self', 'aliado', 'inimigo'];
  const RACAS_VALIDAS  = ['Animal', 'Civilizado', 'Místico', 'Dragão',
                          'Elemental', 'Morto', 'Demônio', 'Construído', 'Celestial'];
  const TIPOS_VALIDOS  = ['dano', 'reducao_dano', 'cura_pool', 'dreno_eh',
                          'mod_ataque', 'mod_defesa', 'mod_vb',
                          'mod_rf', 'mod_rm', 'mod_eh_temp'];

  it('tem exatamente 25 entradas', () => {
    expect(Object.keys(MAP)).toHaveLength(25);
  });

  it.each(Object.entries(MAP))('%s tem alvo, alvos e ao menos um efeito', (key, reg) => {
    expect(ALVOS_VALIDOS).toContain(reg.alvo);
    expect(reg.alvos === 'escolha' || Number.isInteger(reg.alvos)).toBe(true);
    expect(Array.isArray(reg.efeitos)).toBe(true);
    expect(reg.efeitos.length).toBeGreaterThan(0);
    expect(reg.icone).toBeTruthy();
  });

  it.each(Object.entries(MAP))('%s só declara tipos que o motor conhece', (key, reg) => {
    reg.efeitos.forEach((ef) => {
      expect(TIPOS_VALIDOS).toContain(ef.tipo);
      expect(ef.unidade).toBeTruthy();
    });
  });

  it.each(Object.entries(MAP).filter(([, r]) => r.so_racas || r.inverte_em))(
    '%s só cita raças que existem em criaturas.tipo', (key, reg) => {
      [...(reg.so_racas || []), ...(reg.inverte_em || [])].forEach((r) => {
        expect(RACAS_VALIDAS).toContain(r);
      });
    });

  it('magia sem entrada devolve null, sem lançar', () => {
    expect(magiaEfeitoDe('ressurreicao')).toBeNull();
    expect(magiaEfeitoDe('')).toBeNull();
    expect(magiaEfeitoDe(null)).toBeNull();
    expect(magiaEfeitoDe(undefined)).toBeNull();
  });

  it('as duas magias adiadas para a Fase 2 NÃO estão no mapa', () => {
    // Licantropia mexe em atributo (atravessa calcularFicha inteira) e
    // Oferenda modifica a PRÓXIMA magia — nenhuma das duas é status_temp.
    // Spec §2.3. Se alguém as acrescentar sem a primitiva, este teste avisa.
    expect(MAP.licantropia_lupina).toBeUndefined();
    expect(MAP.oferenda).toBeUndefined();
  });
});

describe('o acordo entre o mapa e o texto do banco', () => {
  /* ESTE É O TESTE QUE SEGURA A FASE INTEIRA.

     O mapa declara QUAIS unidades a magia usa; o parser lê o NÚMERO do texto.
     Se o Mestre editar o catálogo pelo editor de admin e quebrar o padrão
     "verbo + número + unidade", o mapa passa a prometer uma unidade que o
     parser não acha mais — e a magia vira um buff de zero, em silêncio.

     Aqui isso vira erro de CI em vez de surpresa na mesa. Spec §5.3.

     As frases são cópias literais do banco em 11/09/2026, um nível por
     magia (o padrão é idêntico nos cinco). */
  const NIVEL_1_NO_BANCO = {
    arqueirismo:       'Aumenta 4 colunas de ataque para arco.',
    aura_divina:       'A área reduz 1 coluna de ataque.',
    barreira_mistica:  'A barreira reduz 1 coluna de ataque.',
    bencao:            'Aumenta 1 coluna de ataque e 5 de energia heroica.',
    bravura:           'Aumenta 1 de resistência mágica e 5 de energia heroica.',
    bola_de_fogo:      'Causa 12 de dano elemental de fogo.',
    curas_espirituais: 'Restaura 20 de energia heroica.',
    curas_fisicas:     'Restaura 4 de energia física.',
    dardos_de_gelo:    'Cada dardo causa 4 de dano elemental água.',
    forca_mutua:       'Aumenta 1 coluna de ataque.',
    piroprotecao:      'Reduz 16 de dano elemental de fogo.',
    super_resistencia: 'Aumenta 1 de resistência física e 1 de resistência mágica.',
    toque_gelido:      'Cause 12 de dano base.',
    velocidade:        'Aumenta 2 de velocidade.',
  };

  it.each(Object.entries(NIVEL_1_NO_BANCO))(
    '%s: toda unidade declarada é encontrada pelo parser', (key, texto) => {
      const reg = window.MAGIA_EFEITO_MAP[key];
      expect(reg, `${key} não está no mapa`).toBeDefined();
      const lido = window.efeitosNoNivel({ key, nivel_1: texto }, 1);
      reg.efeitos.forEach((ef) => {
        expect(lido[ef.unidade], `${key}: unidade "${ef.unidade}" não achada em "${texto}"`)
          .toBeGreaterThan(0);
      });
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/01-core/magias-efeito.test.js`
Expected: FAIL — `MAP` é `undefined`

- [ ] **Step 3: Escrever o registro**

Acrescente a `src/01-core/magias-efeito.jsx`, antes do `Object.assign` final:

```jsx
/* ============================================================
   O REGISTRO — a semântica que a prosa não diz
   ============================================================
   Campos da entrada:
     alvo        'self' | 'aliado' | 'inimigo'
     alvos       número (teto de alvos) | 'escolha' (sem teto, só em área)
     icone       o chip na mesa
     efeitos[]   { tipo, unidade, sinal?, elemento?, pool? }
                   tipo     — a primitiva que o motor aplica
                   unidade  — a chave que efeitosNoNivel devolve
                   sinal    — +1 buff, -1 debuff (o texto não diz o sinal:
                              "A área reduz 1 coluna" e "Aumenta 1 coluna"
                              produzem o mesmo número)
                   elemento — só em reducao_dano; null = qualquer elemento
                   pool     — só em cura_pool: 'eh' ou 'ef'
     so_racas?   restrição de alvo por criaturas.tipo (regra, não sugestão)
     inverte_em? raças em que o efeito INVERTE de sinal
     grupo_armas? restrição de arma, no molde das técnicas
     parcial?    a metade que a Fase 1 não automatiza — vai pro log

   NÃO guarda evocacao, duracao nem alcance: os três já estão corretos no
   banco, e é lá que o editor de admin os edita.

   Magia sem entrada aqui continua narrativa. É o fallback, não um erro.
   ============================================================ */
const MAGIA_EFEITO_MAP = {
  /* ── Dano (12) ─────────────────────────────────────────────────── */
  bola_de_fogo:      { alvo: 'inimigo', alvos: 1, icone: '🔥', parcial: 'area',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // "25% do dano é convertido em energia heroica para você, podendo
  // ultrapassar seu limite" — o dreno é o único efeito que passa do teto.
  toque_gelido:      { alvo: 'inimigo', alvos: 1, icone: '🧊',
                       efeitos: [{ tipo: 'dano',     unidade: 'dano' },
                                 { tipo: 'dreno_eh', unidade: 'dano' }] },
  // Covardia morde a EH direto, não a cascata: "8 de dano na energia heroica".
  covardia:          { alvo: 'inimigo', alvos: 1, icone: '😰',
                       efeitos: [{ tipo: 'dano', unidade: 'dano', pool: 'eh' }] },
  aeromanipulacao:   { alvo: 'inimigo', alvos: 1, icone: '🌪️',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  piromanipulacao:   { alvo: 'inimigo', alvos: 1, icone: '🔥',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  geomanipulacao:    { alvo: 'inimigo', alvos: 1, icone: '🪨',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  hidromanipulacao:  { alvo: 'inimigo', alvos: 1, icone: '💧',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  manipulacao_de_luz:{ alvo: 'inimigo', alvos: 1, icone: '✨',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // Multi-alvo: o número vem da DESCRIÇÃO, não do texto do nível.
  // "três dardos ... em até três alvos escolhidos".
  dardos_de_gelo:    { alvo: 'inimigo', alvos: 3, icone: '🧊',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // "três dardos de luz ... em até dois alvos". Três dardos, dois alvos: o
  // teto que vale é o de ALVOS.
  dardos_de_luz:     { alvo: 'inimigo', alvos: 2, icone: '🌟',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  raio_eletrico:     { alvo: 'inimigo', alvos: 2, icone: '⚡',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },
  // Teto de 5 fragmentos E área. Vale o teto: o número está no texto, o raio
  // não. Ver spec §6.3 — quando a coluna `raio` existir, o ramo automático
  // liga sozinho.
  meteoros:          { alvo: 'inimigo', alvos: 5, icone: '☄️', parcial: 'area',
                       efeitos: [{ tipo: 'dano', unidade: 'dano' }] },

  /* ── Redução de dano (3) ───────────────────────────────────────── */
  // `protecao_animal` é a KEY de Aeroproteção no banco — o nome e a chave
  // divergem desde algum import antigo. Não renomeie: quebra pj.magias.
  protecao_animal:   { alvo: 'self', alvos: 1, icone: '🌬️',
                       efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                   elemento: 'ar' }] },
  piroprotecao:      { alvo: 'self', alvos: 1, icone: '🛡️',
                       efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                   elemento: 'fogo' }] },
  // elemento null = casa QUALQUER dano elemental. É a proteção genérica.
  armadura_elemental:{ alvo: 'self', alvos: 1, icone: '🔰',
                       efeitos: [{ tipo: 'reducao_dano', unidade: 'reducao_dano',
                                   elemento: null }] },

  /* ── Buff / debuff (8) ─────────────────────────────────────────── */
  // "para arco": restrição de arma, mesmo mecanismo das técnicas.
  arqueirismo:       { alvo: 'self', alvos: 1, icone: '🏹', grupo_armas: 'AR',
                       efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: 1 }] },
  bencao:            { alvo: 'aliado', alvos: 1, icone: '✨',
                       efeitos: [{ tipo: 'mod_ataque',  unidade: 'coluna', sinal: 1 },
                                 { tipo: 'mod_eh_temp', unidade: 'eh',     sinal: 1 }] },
  bravura:           { alvo: 'aliado', alvos: 1, icone: '🦁',
                       efeitos: [{ tipo: 'mod_rm',      unidade: 'rm', sinal: 1 },
                                 { tipo: 'mod_eh_temp', unidade: 'eh', sinal: 1 }] },
  super_resistencia: { alvo: 'aliado', alvos: 1, icone: '💪',
                       efeitos: [{ tipo: 'mod_rf', unidade: 'rf', sinal: 1 },
                                 { tipo: 'mod_rm', unidade: 'rm', sinal: 1 }] },
  // O texto diz "a barreira reduz 1 coluna de ataque" — é penalidade em quem
  // ataca. O motor não tem primitiva de "penalizar quem me ataca", e o
  // resultado no golpe é o mesmo: vira mod_defesa POSITIVO no conjurador.
  // Explicitar isto aqui é exatamente o que o mapa existe para fazer.
  barreira_mistica:  { alvo: 'self', alvos: 1, icone: '🔮',
                       efeitos: [{ tipo: 'mod_defesa', unidade: 'coluna', sinal: 1 }] },
  // Área por natureza e só morde demônios/mortos-vivos. 'escolha' = o Mestre
  // seleciona quantos alvos válidos quiser no alcance (spec §6.3).
  aura_divina:       { alvo: 'inimigo', alvos: 'escolha', icone: '🕊️',
                       so_racas: ['Demônio', 'Morto'], parcial: 'area',
                       efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: -1 }] },
  // PARCIAL de propósito: a raça é verificável, "sob Elo Animal" não é —
  // Elo Animal é narrativa nesta fase e não grava status nenhum. A metade
  // que falta vai pro log, pro Mestre não supor que foi conferida.
  forca_mutua:       { alvo: 'aliado', alvos: 1, icone: '🐾',
                       so_racas: ['Animal'], parcial: 'elo_animal',
                       efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: 1 }] },
  velocidade:        { alvo: 'self', alvos: 1, icone: '💨',
                       efeitos: [{ tipo: 'mod_vb', unidade: 'vb', sinal: 1 }] },

  /* ── Cura (2) ──────────────────────────────────────────────────── */
  // "efeito inverso em mortos-vivos": a cura de EH vira dano na EH.
  curas_espirituais: { alvo: 'aliado', alvos: 1, icone: '💚',
                       inverte_em: ['Morto'],
                       efeitos: [{ tipo: 'cura_pool', unidade: 'cura_eh', pool: 'eh' }] },
  curas_fisicas:     { alvo: 'aliado', alvos: 1, icone: '❤️‍🩹',
                       efeitos: [{ tipo: 'cura_pool', unidade: 'cura_ef', pool: 'ef' }] },
};

// Lookup tolerante: magia sem entrada devolve null, e o chamador mantém o
// comportamento narrativo de antes da Fase 1. Nunca lança.
function magiaEfeitoDe(key) {
  if (!key || typeof key !== 'string') return null;
  return MAGIA_EFEITO_MAP[key] || null;
}
```

E troque o `Object.assign` final por:

```jsx
Object.assign(window, {
  efeitosNoNivel, elementoDoNivel, MAGIA_EFEITO_MAP, magiaEfeitoDe,
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/01-core/magias-efeito.test.js`
Expected: PASS. Se o acordo mapa↔parser falhar em alguma magia, **não mexa no teste** — o teste está certo por construção (as frases são do banco). Conserte o parser ou a `unidade` declarada no mapa.

- [ ] **Step 5: Commit**

```bash
git add src/01-core/magias-efeito.jsx src/01-core/magias-efeito.test.js
git commit -m "feat(magias): registro das 25 magias da Fase 1

O mapa guarda a semantica que a prosa nao diz — alvo, numero de alvos,
sinal, restricao de raca e de arma — e aponta para a unidade que o parser
le do texto do nivel. Sem numeros: eles continuam vindo do banco, entao a
escala pelos 5 niveis vem de graca e sobrevive a edicoes no catalogo.

O teste do acordo mapa-parser e o que segura a fase: toda unidade
declarada tem que ser encontrada no texto, senao a magia viraria um buff
de zero em silencio.

Spec secao 5."
```

---

## Task 4: `aplicarEfeitoMagia` — a função pura

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — a função e o export em `MotorBatalha`
- Create: `src/12-batalha/magia-efeitos.test.js`

**Interfaces:**
- Consumes: `magiaEfeitoDe`, `efeitosNoNivel` (Tasks 1 e 3); `gruposDeArma` (`batalha.jsx`)
- Produces: `aplicarEfeitoMagia(participante, magia, nivel, opcoes) -> participante`
  - `magia` = `{ key, nome, duracao }` (o objeto do catálogo)
  - `nivel` = nível efetivo (1/3/5/7/9)
  - `opcoes` = `{ fonteInstId?, alvoInstId? }`
  - Grava `status_temp` com `id === 'mag_' + key`; reaplicar **substitui**

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/12-batalha/magia-efeitos.test.js`:

```js
/* ============================================================
   magia-efeitos.test.js — a aplicação do efeito de magia
   ============================================================
   Espelha tecnica-efeitos.test.js: o registro diz a forma, esta suíte
   verifica o que chega no participante.

   A regra de NÃO ACUMULAR é a mesma decisão 7 do spec das técnicas, pelo
   mesmo motivo: sem ela, lançar Bênção cinco vezes empilha cinco bônus de
   coluna no mesmo alvo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => {
  M = window.MotorBatalha;
  expect(M.aplicarEfeitoMagia).toBeTypeOf('function');
});

const alvo = (over = {}) => ({
  inst_id: 'a1', nome: 'Alvo', tipo: 'pj', raca: 'Humano',
  eh: 10, eh_max: 10, ar: 5, ar_max: 5, ef: 20, ef_max: 20,
  rf: 2, rm: 2, vb: 10, status: 'ativo', status_temp: [], ...over,
});

// Objetos de catálogo montados à mão, com os textos literais do banco.
const BENCAO = { key: 'bencao', nome: 'Bênção', duracao: '10 rodadas',
                 nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.',
                 nivel_5: 'Aumenta 3 colunas de ataque e 15 de energia heroica.' };
const VELOCIDADE = { key: 'velocidade', nome: 'Velocidade', duracao: '5 rodadas',
                     nivel_1: 'Aumenta 2 de velocidade.' };
const AURA = { key: 'aura_divina', nome: 'Aura Divina', duracao: '1 hora',
               nivel_1: 'A área reduz 1 coluna de ataque.' };
const ARQUEIRISMO = { key: 'arqueirismo', nome: 'Arqueirismo', duracao: '2 rodadas',
                      nivel_1: 'Aumenta 4 colunas de ataque para arco.' };

describe('aplicarEfeitoMagia — o básico', () => {
  it('Bênção grava os DOIS efeitos num status só', () => {
    const r = M.aplicarEfeitoMagia(alvo(), BENCAO, 1);
    const meus = r.status_temp.filter((s) => s.id === 'mag_bencao');
    expect(meus).toHaveLength(2);
    expect(meus.map((s) => s.efeito.tipo).sort())
      .toEqual(['mod_ataque', 'mod_eh_temp']);
  });

  it('o valor vem do NÍVEL, não de um número fixo', () => {
    const n1 = M.aplicarEfeitoMagia(alvo(), BENCAO, 1);
    const n5 = M.aplicarEfeitoMagia(alvo(), BENCAO, 5);
    const col = (p) => p.status_temp.find((s) => s.efeito.tipo === 'mod_ataque').efeito.valor;
    expect(col(n1)).toBe(1);
    expect(col(n5)).toBe(3);
  });

  it('a duração vem do banco, não do registro', () => {
    const r = M.aplicarEfeitoMagia(alvo(), VELOCIDADE, 1);
    expect(r.status_temp[0].rodadas_rest).toBe(5);
  });

  it('duração mais longa que a batalha persiste até o fim (rodadas_rest null)', () => {
    // "1 hora" é mais longo que qualquer batalha: decrementarStatusTemp
    // mantém rodadas_rest null para sempre.
    const r = M.aplicarEfeitoMagia(alvo(), AURA, 1);
    expect(r.status_temp[0].rodadas_rest).toBeNull();
  });

  it('o sinal do registro vira o sinal do valor — Aura Divina é debuff', () => {
    const r = M.aplicarEfeitoMagia(alvo(), AURA, 1);
    expect(r.status_temp[0].efeito.valor).toBe(-1);
  });

  it('a restrição de arma viaja NO efeito, não no registro', () => {
    // Ativar Arqueirismo e trocar o arco por uma espada não pode manter o
    // bônus — somaModAtaque consulta ef.grupos a cada golpe. Mesma regra
    // que aplicarEfeitoTecnica já aplica.
    const r = M.aplicarEfeitoMagia(alvo(), ARQUEIRISMO, 1);
    expect(r.status_temp[0].efeito.grupos).toEqual(['AR']);
  });

  it('magia sem entrada no registro não muda nada', () => {
    const p = alvo();
    const r = M.aplicarEfeitoMagia(p, { key: 'ressurreicao', nome: 'Ressurreição' }, 1);
    expect(r).toBe(p);
  });
});

describe('reaplicar RENOVA, não acumula', () => {
  it('a segunda Bênção substitui a primeira', () => {
    let p = M.aplicarEfeitoMagia(alvo(), BENCAO, 1);
    p = { ...p, status_temp: p.status_temp.map((s) => ({ ...s, rodadas_rest: 2 })) };
    const r = M.aplicarEfeitoMagia(p, BENCAO, 1);
    const meus = r.status_temp.filter((s) => s.id === 'mag_bencao');
    expect(meus).toHaveLength(2);              // não viraram 4
    expect(meus[0].rodadas_rest).toBe(10);     // renovou
  });

  it('magia diferente no mesmo alvo CONVIVE', () => {
    let p = M.aplicarEfeitoMagia(alvo(), BENCAO, 1);
    p = M.aplicarEfeitoMagia(p, VELOCIDADE, 1);
    expect(p.status_temp.filter((s) => s.id === 'mag_bencao')).toHaveLength(2);
    expect(p.status_temp.filter((s) => s.id === 'mag_velocidade')).toHaveLength(1);
  });

  it('não mexe em status de TÉCNICA no mesmo alvo', () => {
    const p = alvo({ status_temp: [{ id: 'tec_mira', nome: 'Mira', rodadas_rest: 1,
                                     efeito: { tipo: 'mod_ataque', valor: 3 } }] });
    const r = M.aplicarEfeitoMagia(p, BENCAO, 1);
    expect(r.status_temp.find((s) => s.id === 'tec_mira')).toBeDefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/magia-efeitos.test.js`
Expected: FAIL — `aplicarEfeitoMagia` não é função

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, logo depois de `aplicarEfeitoTecnica`:

```js
/* ── Aplica o efeito de uma magia num participante (puro) ──────────
   Irmã de aplicarEfeitoTecnica, com uma diferença que é a decisão central da
   Fase 1 (spec §5): o VALOR não vem do chamador nem do registro — vem do
   texto do nível, lido por efeitosNoNivel. O registro só diz qual unidade
   ler e com que sinal.

   Por que uma função pura: aplicarTeste/aplicarAcao existem em duas cópias,
   Mestre e Jogador. Essa duplicação já mordeu antes — a cópia do Jogador
   passou meses sem decrementar status_temp. A regra mora aqui; a duplicação
   fica no call site.

   Dona única da regra de não-acumular: reativar a mesma magia no mesmo alvo
   RENOVA rodadas_rest e mantém um único conjunto de status, em vez de somar
   um segundo modificador. */
function aplicarEfeitoMagia(participante, magia, nivel, opcoes) {
  const key = magia && magia.key;
  const reg = (typeof magiaEfeitoDe === 'function') ? magiaEfeitoDe(key) : null;
  if (!reg) return participante;   // narrativa ou Fase 2 — segue como antes

  const lido = (typeof efeitosNoNivel === 'function') ? efeitosNoNivel(magia, nivel) : {};
  const id = 'mag_' + key;
  const anteriores = Array.isArray(participante.status_temp) ? participante.status_temp : [];
  const semEsta = anteriores.filter((s) => s.id !== id);

  // A duração vem do BANCO (duracaoEmRodadas), não do registro: o catálogo já
  // a tem certa e é lá que o editor de admin a edita. rodadas null = persiste
  // até o fim da batalha, que é o que decrementarStatusTemp já faz.
  const dur = duracaoEmRodadas(magia);

  const novos = [];
  reg.efeitos.forEach((ef) => {
    // Efeito instantâneo (dano, cura, dreno) NÃO vira status_temp: ele
    // acontece na resolução e acabou. Quem o aplica é a cascata de dano e
    // aplicarCuraPool, não esta função.
    if (ef.tipo === 'dano' || ef.tipo === 'cura_pool' || ef.tipo === 'dreno_eh') return;

    const bruto = lido[ef.unidade];
    // Unidade declarada que o texto não tem: o teste de acordo (§5.3) existe
    // pra isso não chegar aqui. Chegando, não inventa zero — pula.
    if (bruto == null) return;

    const efeito = { tipo: ef.tipo, valor: (ef.sinal || 1) * bruto };
    if (ef.elemento !== undefined) efeito.elemento = ef.elemento;

    // Restrição de arma: mesma mecânica das técnicas. Ativar Arqueirismo com
    // arco e trocar para espada não pode manter o bônus — somaModAtaque
    // consulta ef.grupos a cada golpe.
    if (ef.tipo === 'mod_ataque' && reg.grupo_armas) {
      const grupos = gruposDeArma(reg.grupo_armas);
      if (grupos) efeito.grupos = grupos;
    }

    novos.push({
      id,
      nome: magia.nome || key,
      icone: reg.icone,
      rodadas_rest: dur.rodadas,
      ...(opcoes && opcoes.fonteInstId ? { fonte_inst_id: opcoes.fonteInstId } : {}),
      efeito,
    });
  });

  if (!novos.length) return participante;
  let resultado = { ...participante, status_temp: [...semEsta, ...novos] };

  // mod_eh_temp é o único que MUDA o snapshot em vez de ser lido on-the-fly:
  // levanta o teto e enche junto. A devolução na expiração já é feita por
  // expirarEhTemp, que roda em processarViradaDeRodada.
  const ehTemp = novos.find((s) => s.efeito.tipo === 'mod_eh_temp');
  if (ehTemp) {
    const v = ehTemp.efeito.valor;
    resultado = { ...resultado,
      eh_max: Math.max(0, (resultado.eh_max || 0) + v),
      eh:     Math.max(0, (resultado.eh || 0) + v) };
  }
  return resultado;
}
```

- [ ] **Step 4: Exportar em `MotorBatalha`**

No bloco `MotorBatalha: { ... }` (`batalha.jsx:6978`), depois de `aplicarEfeitoTecnica, gruposDeArma,`:

```js
    // Fase 1 das magias (11/09/2026): o registro diz a forma, efeitosNoNivel
    // lê o número do texto do nível. Reaplicar substitui a leva anterior.
    aplicarEfeitoMagia,
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/12-batalha/magia-efeitos.test.js`
Expected: PASS

- [ ] **Step 6: Rodar a suíte inteira e commitar**

Run: `npm test` — tudo verde.

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/magia-efeitos.test.js
git commit -m "feat(batalha): aplicarEfeitoMagia grava o efeito da magia no status_temp

O valor vem do texto do nivel (efeitosNoNivel), o sinal e a unidade vem do
registro, e a duracao vem do banco. Reaplicar renova rodadas_rest em vez de
empilhar um segundo modificador.

Funcao pura no MotorBatalha porque aplicarTeste existe em duas copias,
Mestre e Jogador — a regra fica aqui, a duplicacao fica no call site.

Spec secao 9."
```

---

## Task 5: As primitivas de pool — `cura_pool` e `dreno_eh`

**Files:**
- Modify: `src/12-batalha/batalha.jsx`
- Modify: `src/12-batalha/magia-efeitos.test.js`

**Interfaces:**
- Consumes: `statusPorPools` (`batalha.jsx`)
- Produces:
  - `aplicarCuraPool(p, pool, valor, opcoes) -> participante` — `opcoes.inverter` troca cura por dano
  - `aplicarDrenoEh(conjurador, danoNaEf) -> conjurador`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/12-batalha/magia-efeitos.test.js`:

```js
describe('cura_pool — preenche o pool, respeitando o teto', () => {
  it('Curas Espirituais enche a EH até o máximo', () => {
    const r = M.aplicarCuraPool(alvo({ eh: 2, eh_max: 10 }), 'eh', 20);
    expect(r.eh).toBe(10);
  });

  it('Curas Físicas enche a EF até o máximo', () => {
    const r = M.aplicarCuraPool(alvo({ ef: 5, ef_max: 20 }), 'ef', 4);
    expect(r.ef).toBe(9);
  });

  it('NÃO ultrapassa o máximo — é a diferença para mod_eh_temp', () => {
    // mod_eh_temp LEVANTA o teto; cura só PREENCHE até ele.
    const r = M.aplicarCuraPool(alvo({ eh: 9, eh_max: 10 }), 'eh', 50);
    expect(r.eh).toBe(10);
    expect(r.eh_max).toBe(10);
  });

  it('inverter transforma a cura em dano no mesmo pool', () => {
    // "Esta magia possui o efeito inverso em mortos-vivos" — Curas
    // Espirituais numa criatura tipo Morto queima EH em vez de restaurar.
    const r = M.aplicarCuraPool(alvo({ eh: 10, eh_max: 10 }), 'eh', 4, { inverter: true });
    expect(r.eh).toBe(6);
  });

  it('invertida não deixa o pool negativo', () => {
    const r = M.aplicarCuraPool(alvo({ eh: 2, eh_max: 10 }), 'eh', 20, { inverter: true });
    expect(r.eh).toBe(0);
  });

  it('curar quem está desmaiado pode reativar — statusPorPools decide', () => {
    const r = M.aplicarCuraPool(
      alvo({ eh: 0, eh_max: 10, ef: 1, ef_max: 20, status: 'desmaiado' }), 'eh', 5);
    expect(r.eh).toBe(5);
    expect(r.status).toBe('ativo');
  });
});

describe('dreno_eh — Toque Gélido ultrapassa o máximo de propósito', () => {
  it('25% do dano que chegou na EF vira EH no conjurador', () => {
    const c = alvo({ inst_id: 'c1', eh: 10, eh_max: 10 });
    expect(M.aplicarDrenoEh(c, 12).eh).toBe(13);  // 10 + floor(12*0.25)
  });

  it('PASSA do máximo — o texto da magia é explícito', () => {
    const c = alvo({ inst_id: 'c1', eh: 10, eh_max: 10 });
    expect(M.aplicarDrenoEh(c, 100).eh).toBeGreaterThan(c.eh_max);
  });

  it('dano zero na EF não drena nada', () => {
    const c = alvo({ inst_id: 'c1', eh: 10, eh_max: 10 });
    expect(M.aplicarDrenoEh(c, 0).eh).toBe(10);
  });

  it('arredonda para baixo', () => {
    const c = alvo({ inst_id: 'c1', eh: 0, eh_max: 10 });
    expect(M.aplicarDrenoEh(c, 7).eh).toBe(1);    // floor(1.75)
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/magia-efeitos.test.js -t "cura_pool"`
Expected: FAIL — `aplicarCuraPool` não é função

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, depois de `aplicarEfeitoMagia`:

```js
/* ── Cura de pool (puro) ───────────────────────────────────────────
   DISTINTA de mod_eh_temp, e a distinção é a regra: cura PREENCHE o pool até
   o teto; mod_eh_temp LEVANTA o teto e enche junto. Curas Espirituais num
   alvo com a EH cheia não faz nada; Bênção no mesmo alvo dá +5 acima.

   opcoes.inverter — "esta magia possui o efeito inverso em mortos-vivos":
   a mesma cura queima o pool em vez de enchê-lo. Piso 0.

   statusPorPools roda no fim porque encher a EH de quem desmaiou reativa, e
   esvaziá-la derruba. */
function aplicarCuraPool(p, pool, valor, opcoes) {
  if (!p || (pool !== 'eh' && pool !== 'ef')) return p;
  const v = Math.max(0, Math.floor(Number(valor) || 0));
  if (!v) return p;
  const atual = Number(p[pool]) || 0;
  const teto  = Number(p[pool + '_max']) || 0;
  const novo = (opcoes && opcoes.inverter)
    ? Math.max(0, atual - v)
    : Math.min(teto, atual + v);
  return statusPorPools({ ...p, [pool]: novo });
}

/* ── Dreno de EH do Toque Gélido (puro) ────────────────────────────
   "Se for um ataque na energia física do alvo, 25% do dano é convertido em
   energia heroica para você, PODENDO ULTRAPASSAR SEU LIMITE — o excesso…".

   É o único efeito da Fase 1 que passa do eh_max de propósito, e por isso
   NÃO usa aplicarCuraPool: o teto é justamente o que ele ignora. Recebe o
   dano que CHEGOU NA EF, não o dano bruto — a conversão é sobre o que
   atravessou a cascata. */
function aplicarDrenoEh(conjurador, danoNaEf) {
  if (!conjurador) return conjurador;
  const ganho = Math.floor((Math.max(0, Number(danoNaEf) || 0)) * 0.25);
  if (!ganho) return conjurador;
  return { ...conjurador, eh: (Number(conjurador.eh) || 0) + ganho };
}
```

Exporte as duas em `MotorBatalha`, junto de `aplicarEfeitoMagia`:

```js
    aplicarEfeitoMagia, aplicarCuraPool, aplicarDrenoEh,
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/12-batalha/magia-efeitos.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/magia-efeitos.test.js
git commit -m "feat(batalha): cura_pool e dreno_eh

Cura preenche o pool ate o teto; mod_eh_temp levanta o teto. Sao coisas
diferentes e por isso sao primitivas diferentes. A inversao cobre o efeito
inverso de Curas Espirituais em mortos-vivos.

O dreno do Toque Gelido e o unico efeito que passa do eh_max de proposito —
o texto da magia diz isso com todas as letras.

Spec secao 8."
```

---

## Task 6: `reducao_dano` antes da cascata

A task mais arriscada da fase: encosta na área com mais correções do projeto.
Por isso `aplicarDanoCascata` **não muda** — a redução acontece antes dela.

**Files:**
- Modify: `src/12-batalha/batalha.jsx`
- Modify: `src/12-batalha/dano-cascata-modificadores.test.js`

**Interfaces:**
- Consumes: `somaEfeitosStatus` (`batalha.jsx:1609`)
- Produces: `danoAposReducao(dano, alvo, elemento) -> number` — piso 0

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/12-batalha/dano-cascata-modificadores.test.js`:

```js
describe('reducao_dano — a proteção elemental corta ANTES da cascata', () => {
  const comProtecao = (elemento, valor) => ({
    ...alvo(),
    status_temp: [{ id: 'mag_x', nome: 'Proteção', rodadas_rest: 3,
                    efeito: { tipo: 'reducao_dano', valor, elemento } }],
  });

  it('Piroproteção corta dano de fogo', () => {
    expect(M.danoAposReducao(20, comProtecao('fogo', 16), 'fogo')).toBe(4);
  });

  it('Piroproteção NÃO corta dano de água', () => {
    expect(M.danoAposReducao(20, comProtecao('fogo', 16), 'agua')).toBe(20);
  });

  it('Aeroproteção corta dano de ar', () => {
    expect(M.danoAposReducao(20, comProtecao('ar', 16), 'ar')).toBe(4);
  });

  it('Armadura Elemental (elemento null) corta QUALQUER dano elemental', () => {
    const p = comProtecao(null, 8);
    expect(M.danoAposReducao(20, p, 'fogo')).toBe(12);
    expect(M.danoAposReducao(20, p, 'terra')).toBe(12);
  });

  it('proteção elemental NÃO corta dano SEM elemento (dano base)', () => {
    // Toque Gélido causa "dano base": não é elemental, e proteção elemental
    // nenhuma o alcança — nem a genérica.
    expect(M.danoAposReducao(20, comProtecao(null, 8), null)).toBe(20);
  });

  it('piso 0 — redução maior que o dano não vira cura', () => {
    expect(M.danoAposReducao(4, comProtecao('fogo', 16), 'fogo')).toBe(0);
  });

  it('duas proteções do mesmo elemento SOMAM', () => {
    const p = { ...alvo(), status_temp: [
      { id: 'mag_a', efeito: { tipo: 'reducao_dano', valor: 8,  elemento: 'fogo' } },
      { id: 'mag_b', efeito: { tipo: 'reducao_dano', valor: 16, elemento: null  } },
    ] };
    expect(M.danoAposReducao(30, p, 'fogo')).toBe(6);
  });

  it('sem proteção nenhuma, o dano passa inteiro', () => {
    expect(M.danoAposReducao(20, alvo(), 'fogo')).toBe(20);
  });
});

describe('REGRESSÃO: aplicarDanoCascata continua idêntica', () => {
  // A redução entra ANTES da cascata, de propósito: aplicarDanoCascata não
  // muda de assinatura nem de comportamento, e motor-batalha.test.js segue
  // congelando as regras dela.
  it('a cascata não conhece reducao_dano', () => {
    const p = { ...alvo(), status_temp: [
      { id: 'mag_x', efeito: { tipo: 'reducao_dano', valor: 100, elemento: null } },
    ] };
    const r = M.aplicarDanoCascata(12, p, false);
    expect({ eh: r.eh, ar: r.ar }).toEqual({ eh: 0, ar: 5 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/dano-cascata-modificadores.test.js`
Expected: FAIL — `danoAposReducao` não é função

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, logo ANTES de `aplicarDanoCascata`:

```js
/* ── Redução de dano elemental (puro) ──────────────────────────────
   Roda ANTES de aplicarDanoCascata, reduzindo o NÚMERO DE ENTRADA. É
   deliberado: a cascata é a área com mais correções do projeto (bc1fa6a…
   c0eb189) e motor-batalha.test.js congela as regras dela. Mexer aqui em vez
   de lá é o que mantém aquela suíte intocada.

   Casamento por elemento:
     • elemento da proteção IGUAL ao do golpe → corta;
     • elemento da proteção NULL              → corta qualquer golpe
                                                ELEMENTAL (Armadura Elemental);
     • golpe SEM elemento ("dano base")       → nada corta, nem a genérica.

   A última regra é a que separa Toque Gélido das manipulações: dano base não
   é elemental, então proteção elemental não o alcança.

   Piso 0 — redução maior que o golpe não vira cura. */
function danoAposReducao(dano, alvoP, elemento) {
  const d = Math.max(0, Math.floor(Number(dano) || 0));
  if (!d || !alvoP || !Array.isArray(alvoP.status_temp)) return d;
  if (!elemento) return d;   // dano base: proteção elemental não alcança
  const corte = alvoP.status_temp.reduce((s, st) => {
    const ef = st.efeito;
    if (!ef || ef.tipo !== 'reducao_dano') return s;
    // undefined ≠ null: undefined é entrada malformada, null é "qualquer".
    if (ef.elemento != null && ef.elemento !== elemento) return s;
    return s + (Number(ef.valor) || 0);
  }, 0);
  return Math.max(0, d - corte);
}
```

Exporte em `MotorBatalha`, junto das outras:

```js
    aplicarEfeitoMagia, aplicarCuraPool, aplicarDrenoEh, danoAposReducao,
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/12-batalha/dano-cascata-modificadores.test.js`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira — atenção especial aqui**

Run: `npm test`
Expected: 1001+ verdes. **Se `motor-batalha.test.js` mudar uma expectativa que seja, pare e reporte** — é a trava desta área e a task foi desenhada pra não tocá-la.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/dano-cascata-modificadores.test.js
git commit -m "feat(batalha): reducao_dano elemental, antes da cascata

Piroprotecao corta fogo, Aeroprotecao corta ar, Armadura Elemental corta
qualquer dano elemental. Dano base (Toque Gelido) nao e elemental e nenhuma
delas o alcanca.

Entra ANTES de aplicarDanoCascata, reduzindo o numero de entrada: a cascata
nao muda de assinatura nem de comportamento, e motor-batalha.test.js segue
congelando as regras dela.

Spec secao 8."
```

---

## Task 7: O estado `evocando` — largada, contagem e resolução

O mecanismo novo da fase.

**Files:**
- Modify: `src/12-batalha/batalha.jsx`
- Create: `src/12-batalha/magia-evocacao.test.js`

**Interfaces:**
- Consumes: `duracaoEmRodadas`, `processarViradaDeRodada`
- Produces:
  - `evocacaoEmRodadas(magia) -> { rodadas: number|null, bloqueada: boolean }` — `rodadas: 0` = instantânea; `bloqueada: true` = Ritual e afins
  - `iniciarEvocacao(p, magia, nivel, alvosIds, custoKarma) -> participante`
  - `decrementarEvocacao(p) -> participante` (chamada por `processarViradaDeRodada`)
  - `evocacaoPronta(p) -> boolean`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/12-batalha/magia-evocacao.test.js`:

```js
/* ============================================================
   magia-evocacao.test.js — a evocação canalizada
   ============================================================
   O mecanismo novo da Fase 1: uma magia de "N rodadas" de evocação prende o
   conjurador por N rodadas antes de resolver, e qualquer outra ação derruba.

   As regras de QUEBRA são as mesmas da concentração, que já existiam — a
   Task 8 cobre isso. Este arquivo cobre a contagem e a resolução.

   Spec §4.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => {
  M = window.MotorBatalha;
  expect(M.evocacaoEmRodadas).toBeTypeOf('function');
  expect(M.iniciarEvocacao).toBeTypeOf('function');
});

const conj = (over = {}) => ({
  inst_id: 'c1', nome: 'Conjurador', tipo: 'pj',
  eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20,
  karma: 9, karma_max: 9, pa_max: 1, pa_rest: 1, vb: 10,
  status: 'ativo', status_temp: [], ...over,
});

describe('evocacaoEmRodadas — o que cada valor do banco significa', () => {
  it.each([
    ['Instantânea', 0, false],
    ['1 rodada',    1, false],
    ['2 rodadas',   2, false],
    ['5 rodadas',   5, false],
    ['10 rodadas', 10, false],
  ])('%s → %i rodadas, não bloqueada', (txt, n) => {
    expect(M.evocacaoEmRodadas({ evocacao: txt })).toEqual({ rodadas: n, bloqueada: false });
  });

  it.each(['Ritual', 'Variável', '12 horas', '8 horas', '1 dia', '30 minutos'])(
    '%s é bloqueada em batalha', (txt) => {
      expect(M.evocacaoEmRodadas({ evocacao: txt }).bloqueada).toBe(true);
    });

  it('evocação ausente é tratada como instantânea, não como bloqueio', () => {
    expect(M.evocacaoEmRodadas({})).toEqual({ rodadas: 0, bloqueada: false });
  });
});

describe('iniciarEvocacao — a largada', () => {
  const METEOROS = { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' };

  it('grava o estado com as rodadas do banco', () => {
    const r = M.iniciarEvocacao(conj(), METEOROS, 5, ['a1'], 5);
    expect(r.evocando).toMatchObject({
      magia_key: 'meteoros', nivel: 5, alvos: ['a1'], rodadas_rest: 5, karma_pago: 5,
    });
  });

  it('debita o karma NA LARGADA, não na resolução', () => {
    expect(M.iniciarEvocacao(conj({ karma: 9 }), METEOROS, 5, ['a1'], 5).karma).toBe(4);
  });

  it('debita 1 PA na largada', () => {
    expect(M.iniciarEvocacao(conj({ pa_rest: 1 }), METEOROS, 5, ['a1'], 5).pa_rest).toBe(0);
  });

  it('karma nunca fica negativo', () => {
    expect(M.iniciarEvocacao(conj({ karma: 2 }), METEOROS, 5, ['a1'], 5).karma).toBe(0);
  });

  it('magia instantânea NÃO cria estado de evocação', () => {
    const r = M.iniciarEvocacao(conj(), { key: 'bola_de_fogo', nome: 'Bola de Fogo',
                                          evocacao: 'Instantânea' }, 1, ['a1'], 1);
    expect(r.evocando).toBeUndefined();
  });

  it('magia bloqueada não cria estado nem cobra karma', () => {
    const p = conj();
    const r = M.iniciarEvocacao(p, { key: 'sagracao', evocacao: 'Ritual' }, 1, ['a1'], 1);
    expect(r).toBe(p);
  });
});

describe('a contagem até a resolução', () => {
  const CURAS = { key: 'curas_fisicas', nome: 'Curas Físicas', evocacao: '3 rodadas' };

  it('cada virada tira uma rodada', () => {
    let p = M.iniciarEvocacao(conj(), CURAS, 1, ['a1'], 1);
    expect(p.evocando.rodadas_rest).toBe(3);
    p = M.decrementarEvocacao(p);
    expect(p.evocando.rodadas_rest).toBe(2);
    p = M.decrementarEvocacao(p);
    expect(p.evocando.rodadas_rest).toBe(1);
  });

  it('evocacaoPronta só em zero', () => {
    let p = M.iniciarEvocacao(conj(), CURAS, 1, ['a1'], 1);
    expect(M.evocacaoPronta(p)).toBe(false);
    p = M.decrementarEvocacao(M.decrementarEvocacao(M.decrementarEvocacao(p)));
    expect(p.evocando.rodadas_rest).toBe(0);
    expect(M.evocacaoPronta(p)).toBe(true);
  });

  it('não decrementa abaixo de zero', () => {
    let p = M.iniciarEvocacao(conj(), CURAS, 1, ['a1'], 1);
    for (let i = 0; i < 10; i++) p = M.decrementarEvocacao(p);
    expect(p.evocando.rodadas_rest).toBe(0);
  });

  it('quem não está evocando atravessa a virada sem mudar', () => {
    const p = conj();
    expect(M.decrementarEvocacao(p)).toBe(p);
    expect(M.evocacaoPronta(p)).toBe(false);
  });

  it('processarViradaDeRodada decrementa a evocação junto de tudo o mais', () => {
    // A integração importa: a contagem tem que andar na virada REAL, não só
    // quando alguém chama decrementarEvocacao à mão.
    const p = M.iniciarEvocacao(conj(), CURAS, 1, ['a1'], 1);
    const r = M.processarViradaDeRodada(p);
    const depois = r.participante || r;
    expect(depois.evocando.rodadas_rest).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/magia-evocacao.test.js`
Expected: FAIL — `evocacaoEmRodadas` não é função

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, logo depois de `duracaoEmRodadas` (`:583`):

```js
/* ── Evocação da magia, traduzida para rodadas de batalha ──────────
   Irmã de duracaoEmRodadas, e a simetria é proposital: duração é quanto o
   efeito DURA, evocação é quanto ele DEMORA a existir. A coluna `evocacao` é
   texto livre, com quatro casos:

     "Instantânea"              → 0 rodadas, resolve na hora (80 magias)
     "1 rodada" … "10 rodadas"  → canalização (132 magias)
     "Ritual"                   → fora de combate (39 magias)
     "Variável", horas, dias    → idem (7 magias)

   Ausente é tratado como instantânea, NÃO como bloqueio: uma linha de
   catálogo incompleta não pode tirar a magia da mesa. */
function evocacaoEmRodadas(magia) {
  const txt = (magia && magia.evocacao) || '';
  if (!txt) return { rodadas: 0, bloqueada: false };
  if (/instant[âa]nea/i.test(txt)) return { rodadas: 0, bloqueada: false };
  const m = RE_RODADAS.exec(txt);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) return { rodadas: n, bloqueada: false };
  }
  // Ritual, Variável, horas, dias: mais longo que qualquer batalha.
  return { rodadas: null, bloqueada: true };
}

/* ── Largada da evocação canalizada (puro) ─────────────────────────
   O karma sai AQUI, não na resolução, e não volta se a evocação quebrar
   (decisão 3 do spec). É o custo do risco: quem começa a evocar Meteoros e
   leva um golpe na EF perdeu 5 de karma e cinco rodadas.

   Os alvos são escolhidos na largada e REVALIDADOS na resolução — quem
   morreu ou saiu do alcance no meio é descartado lá (§4.3). */
function iniciarEvocacao(p, magia, nivel, alvosIds, custoKarma) {
  if (!p || !magia) return p;
  const ev = evocacaoEmRodadas(magia);
  if (ev.bloqueada) return p;          // Ritual: nem cobra, nem cria estado
  const karma = Math.max(0, (Number(p.karma) || 0) - (Number(custoKarma) || 0));
  const pa    = Math.max(0, (Number(p.pa_rest) || 0) - 1);
  // Instantânea não cria estado: resolve no mesmo call site que já resolvia.
  if (!ev.rodadas) return { ...p, karma, pa_rest: pa };
  return {
    ...p, karma, pa_rest: pa,
    evocando: {
      magia_key: magia.key, nivel,
      alvos: Array.isArray(alvosIds) ? [...alvosIds] : [],
      rodadas_rest: ev.rodadas,
      karma_pago: Number(custoKarma) || 0,
    },
  };
}

/* Uma rodada a menos na canalização. Devolve o MESMO objeto quando não há
   evocação em curso — os chamadores usam isso pra decidir se vale persistir. */
function decrementarEvocacao(p) {
  if (!p || !p.evocando) return p;
  const r = Math.max(0, (Number(p.evocando.rodadas_rest) || 0) - 1);
  if (r === p.evocando.rodadas_rest) return p;
  return { ...p, evocando: { ...p.evocando, rodadas_rest: r } };
}

function evocacaoPronta(p) {
  return !!(p && p.evocando && (Number(p.evocando.rodadas_rest) || 0) <= 0);
}
```

- [ ] **Step 4: Ligar na virada de rodada**

Em `processarViradaDeRodada` (`batalha.jsx:1667`), depois do bloco de
`status_temp` e antes do `return`:

```js
  // A canalização anda na virada, junto do decremento dos status. Sem isto a
  // contagem só andaria quando alguém chamasse decrementarEvocacao à mão, e
  // a magia nunca resolveria sozinha.
  next = decrementarEvocacao(next);
```

- [ ] **Step 5: Exportar e rodar**

Em `MotorBatalha`:

```js
    // Fase 1 das magias: a evocação canalizada. Irmã de duracaoEmRodadas —
    // duração é quanto dura, evocação é quanto demora a existir.
    evocacaoEmRodadas, iniciarEvocacao, decrementarEvocacao, evocacaoPronta,
```

Run: `npx vitest run src/12-batalha/magia-evocacao.test.js`
Expected: PASS

> Se o teste de `processarViradaDeRodada` falhar porque a função devolve um
> participante direto em vez de `{ participante }`, ajuste **o teste** para a
> forma real — leia a assinatura em `batalha.jsx:1667` antes.

- [ ] **Step 6: Rodar a suíte inteira e commitar**

Run: `npm test` — `virada-rodada.test.js` é o vizinho mais próximo; tem que continuar verde.

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/magia-evocacao.test.js
git commit -m "feat(batalha): evocacao canalizada — largada, contagem e resolucao

Magia de N rodadas de evocacao prende o conjurador por N rodadas antes de
resolver. O karma sai na largada e nao volta. Instantanea resolve na hora
sem criar estado; Ritual nem cobra.

evocacaoEmRodadas e irma de duracaoEmRodadas de proposito: duracao e quanto
o efeito dura, evocacao e quanto ele demora a existir.

Spec secao 4."
```

---

## Task 8: A quebra da evocação

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — as três funções de quebra
- Modify: `src/12-batalha/magia-evocacao.test.js`

**Interfaces:**
- Consumes: `quebrarConcentracao` (`:2619`), `quebrarConcentracaoPorDano` (`:2664`), `saidaDeCombate` (`:2726`)
- Produces: `quebrarEvocacao(participantes, atorInstId, motivo) -> participantes` — devolve o MESMO array quando não há nada a quebrar

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/12-batalha/magia-evocacao.test.js`:

```js
describe('a quebra — as mesmas regras da concentração', () => {
  const METEOROS = { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' };
  const evocando = () => [M.iniciarEvocacao(conj(), METEOROS, 5, ['a1'], 5)];

  it('quebrar remove o estado', () => {
    const r = M.quebrarEvocacao(evocando(), 'c1', 'atacou');
    expect(r[0].evocando).toBeUndefined();
  });

  it('o karma NÃO volta', () => {
    const antes = evocando();
    const r = M.quebrarEvocacao(antes, 'c1', 'atacou');
    expect(r[0].karma).toBe(antes[0].karma);   // continua 4, não volta pra 9
  });

  it('quebra só a evocação do ator citado', () => {
    const outro = M.iniciarEvocacao(conj({ inst_id: 'c2' }), METEOROS, 5, ['a1'], 5);
    const r = M.quebrarEvocacao([...evocando(), outro], 'c1', 'andou');
    expect(r[0].evocando).toBeUndefined();
    expect(r[1].evocando).toBeDefined();
  });

  it('sem nada a quebrar devolve o MESMO array', () => {
    const ps = [conj()];
    expect(M.quebrarEvocacao(ps, 'c1', 'atacou')).toBe(ps);
  });

  it('quebra a concentração E a evocação do mesmo ator', () => {
    // As duas coisas são "o conjurador está preso a uma magia". Uma ação que
    // derruba uma tem que derrubar a outra.
    const p = { ...M.iniciarEvocacao(conj(), METEOROS, 5, ['a1'], 5),
                status_temp: [{ id: 'mag_y', rodadas_rest: null,
                                concentracao: { ator: 'c1', magia_key: 'sono' },
                                efeito: { tipo: 'mod_vb', valor: -2 } }] };
    const r = M.quebrarConcentracao([p], 'c1');
    expect(r[0].status_temp).toHaveLength(0);
    expect(r[0].evocando).toBeUndefined();
  });
});

describe('dano: o que quebra e o que não quebra', () => {
  const METEOROS = { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' };
  const ev = (over = {}) => M.iniciarEvocacao(conj(over), METEOROS, 5, ['a1'], 5);

  it('dano que CHEGA NA EF quebra', () => {
    const antes = ev({ ef: 20 });
    const depois = { ...antes, ef: 15 };
    const r = M.quebrarConcentracaoPorDano([depois], antes, depois);
    expect(r[0].evocando).toBeUndefined();
  });

  it('dano contido pela EH NÃO quebra', () => {
    const antes = ev({ eh: 10, ef: 20 });
    const depois = { ...antes, eh: 4 };
    const r = M.quebrarConcentracaoPorDano([depois], antes, depois);
    expect(r[0].evocando).toBeDefined();
  });

  it('dano contido pela AR NÃO quebra', () => {
    const antes = ev({ ar: 8, ef: 20 });
    const depois = { ...antes, ar: 8, res: 3 };
    const r = M.quebrarConcentracaoPorDano([depois], antes, depois);
    expect(r[0].evocando).toBeDefined();
  });

  it('desmaiar quebra, mesmo sem a EF ser tocada', () => {
    // Zerar a EH desmaia sem a EF mudar — o caso que escapava nos call sites
    // antes do fix de concentracao-dano.test.js.
    const antes = ev({ eh: 3, ef: 20, status: 'ativo' });
    const depois = { ...antes, eh: 0, status: 'desmaiado' };
    const r = M.quebrarConcentracaoPorDano([depois], antes, depois);
    expect(r[0].evocando).toBeUndefined();
  });
});

describe('sair de combate quebra a evocação', () => {
  const METEOROS = { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' };

  it.each(['desmaiado', 'morto', 'desistiu'])('%s derruba a canalização', (st) => {
    const p = M.iniciarEvocacao(conj({ atual: false }), METEOROS, 5, ['a1'], 5);
    const r = M.saidaDeCombate([p], { tipo: 'pj', ref_id: p.ref_id, inst_id: 'c1' }, st);
    expect(r.participantes[0].evocando).toBeUndefined();
  });
});

describe('passar a vez NÃO quebra — é assim que se evoca', () => {
  it('a virada de rodada mantém a canalização', () => {
    const p = M.iniciarEvocacao(conj(), { key: 'meteoros', evocacao: '5 rodadas' },
                                5, ['a1'], 5);
    const r = M.processarViradaDeRodada(p);
    const depois = r.participante || r;
    expect(depois.evocando).toBeDefined();
    expect(depois.evocando.rodadas_rest).toBe(4);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/magia-evocacao.test.js -t "quebra"`
Expected: FAIL — `quebrarEvocacao` não é função

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, logo depois de `quebrarConcentracao`:

```js
/* ── Quebra a evocação canalizada de um conjurador ─────────────────
   Gêmea de quebrarConcentracao, e chamada pelos mesmos gatilhos. As duas
   coisas são "o conjurador está preso a uma magia e qualquer outra coisa a
   derruba"; a diferença é só o payload — concentração sustenta um efeito JÁ
   aplicado, evocação sustenta um ainda NÃO aplicado.

   O karma NÃO volta (decisão 3 do spec): quem começou a evocar pagou.

   Devolve o MESMO array quando não há nada a remover — os chamadores usam
   isso pra decidir se vale persistir. */
function quebrarEvocacao(participantes, atorInstId, motivo) {
  if (!atorInstId || !Array.isArray(participantes)) return participantes;
  let mudou = false;
  const next = participantes.map((p) => {
    if (!p.evocando || p.inst_id !== atorInstId) return p;
    mudou = true;
    const { evocando, ...resto } = p;
    // O motivo desce pro log (magia_evocacao_quebrada): sem ele o jogador vê
    // a magia sumir e não sabe o que a derrubou.
    return { ...resto, evocacao_quebrada: { magia_key: evocando.magia_key, motivo } };
  });
  return mudou ? next : participantes;
}
```

E em `quebrarConcentracao`, no fim, encadeie a evocação — assim TODO gatilho
que já derrubava concentração passa a derrubar canalização, sem tocar em
nenhum dos call sites:

```js
function quebrarConcentracao(participantes, atorInstId) {
  if (!atorInstId || !Array.isArray(participantes)) return participantes;
  let mudou = false;
  const next = participantes.map((p) => {
    const st = Array.isArray(p.status_temp) ? p.status_temp : null;
    if (!st || st.length === 0) return p;
    const filtrado = st.filter((x) => !(x.concentracao && x.concentracao.ator === atorInstId));
    if (filtrado.length === st.length) return p;
    mudou = true;
    return { ...p, status_temp: filtrado };
  });
  // A evocação cai pelos MESMOS gatilhos da concentração (spec §4.5).
  // Encadear aqui, e não em cada call site, é o que evita o segundo caminho
  // paralelo — o erro que deixou a cópia do Jogador meses sem decrementar
  // status_temp.
  const comEvocacao = quebrarEvocacao(mudou ? next : participantes, atorInstId, 'acao');
  return comEvocacao;
}
```

> **Atenção:** `quebrarConcentracaoPorDano` e `saidaDeCombate` já chamam
> `quebrarConcentracao`, então os dois passam a quebrar evocação de graça.
> Confirme lendo `batalha.jsx:2664` e `:2726` antes de dar a task por pronta.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/12-batalha/magia-evocacao.test.js`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira e commitar**

Run: `npm test` — `concentracao-dano.test.js` e `saida-de-combate.test.js` cobrem os mesmos caminhos; têm que continuar verdes.

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/magia-evocacao.test.js
git commit -m "feat(batalha): a evocacao cai pelos mesmos gatilhos da concentracao

quebrarEvocacao e gemea de quebrarConcentracao e fica encadeada nela, entao
todo gatilho que ja derrubava concentracao — atacar, andar, usar item, dano
na EF, desmaiar, morrer, desistir — passa a derrubar canalizacao sem tocar
em nenhum call site. Passar a vez continua sem quebrar: e assim que se evoca.

O karma nao volta. Quem comecou a evocar pagou.

Spec secoes 4.2 e 4.5."
```

---

## Task 9: Restrição de alvo

**Files:**
- Modify: `src/12-batalha/batalha.jsx`
- Modify: `src/12-batalha/magia-efeitos.test.js`

**Interfaces:**
- Consumes: `magiaEfeitoDe` (Task 3)
- Produces: `alvoPermitidoParaMagia(alvoP, magiaKey) -> { pode, motivo }` — `motivo` é `null` quando pode, ou `'raca'`
- Produces: `efeitoInverteNoAlvo(alvoP, magiaKey) -> boolean`

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/12-batalha/magia-efeitos.test.js`:

```js
describe('restrição de alvo por raça — regra, não sugestão', () => {
  const cri = (raca) => ({ inst_id: 'x', tipo: 'criatura', raca, status: 'ativo' });
  const pj  = () => ({ inst_id: 'p', tipo: 'pj', raca: 'Humano', status: 'ativo' });

  it('Aura Divina aceita Demônio', () => {
    expect(M.alvoPermitidoParaMagia(cri('Demônio'), 'aura_divina').pode).toBe(true);
  });

  it('Aura Divina aceita Morto', () => {
    expect(M.alvoPermitidoParaMagia(cri('Morto'), 'aura_divina').pode).toBe(true);
  });

  it('Aura Divina RECUSA Animal, com motivo', () => {
    const r = M.alvoPermitidoParaMagia(cri('Animal'), 'aura_divina');
    expect(r.pode).toBe(false);
    expect(r.motivo).toBe('raca');
  });

  it('Aura Divina nunca acerta um PJ', () => {
    // Um PJ tem raça de personagem (Humano, Elfo…), nunca Demônio ou Morto.
    // A restrição simplesmente não dispara sobre personagens — e está certo.
    expect(M.alvoPermitidoParaMagia(pj(), 'aura_divina').pode).toBe(false);
  });

  it('Força Mútua só aceita Animal', () => {
    expect(M.alvoPermitidoParaMagia(cri('Animal'), 'forca_mutua').pode).toBe(true);
    expect(M.alvoPermitidoParaMagia(cri('Dragão'), 'forca_mutua').pode).toBe(false);
  });

  it('magia sem so_racas aceita qualquer alvo', () => {
    expect(M.alvoPermitidoParaMagia(cri('Dragão'), 'bencao').pode).toBe(true);
    expect(M.alvoPermitidoParaMagia(pj(), 'bencao').pode).toBe(true);
  });

  it('magia sem entrada no registro aceita qualquer alvo', () => {
    expect(M.alvoPermitidoParaMagia(cri('Animal'), 'ressurreicao').pode).toBe(true);
  });

  it('alvo sem raça não é bloqueado por engano', () => {
    expect(M.alvoPermitidoParaMagia({ inst_id: 'x' }, 'bencao').pode).toBe(true);
  });
});

describe('inverte_em — Curas Espirituais em morto-vivo', () => {
  const cri = (raca) => ({ inst_id: 'x', tipo: 'criatura', raca, status: 'ativo' });

  it('inverte em Morto', () => {
    expect(M.efeitoInverteNoAlvo(cri('Morto'), 'curas_espirituais')).toBe(true);
  });

  it('não inverte em Animal', () => {
    expect(M.efeitoInverteNoAlvo(cri('Animal'), 'curas_espirituais')).toBe(false);
  });

  it('Curas Físicas não tem inversão', () => {
    expect(M.efeitoInverteNoAlvo(cri('Morto'), 'curas_fisicas')).toBe(false);
  });

  it('a cura invertida queima EH em vez de restaurar', () => {
    // A integração com aplicarCuraPool: é o mesmo caminho, com opcoes.inverter.
    const morto = { ...alvo(), raca: 'Morto', eh: 10, eh_max: 10 };
    const inverte = M.efeitoInverteNoAlvo(morto, 'curas_espirituais');
    const r = M.aplicarCuraPool(morto, 'eh', 4, { inverter: inverte });
    expect(r.eh).toBe(6);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/magia-efeitos.test.js -t "restrição"`
Expected: FAIL — `alvoPermitidoParaMagia` não é função

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, depois de `aplicarEfeitoMagia`:

```js
/* ── O alvo é válido para esta magia? (puro) ───────────────────────
   Três magias da Fase 1 restringem o alvo no próprio texto do catálogo, e a
   decisão 7 do spec é que isso vale como REGRA: alvo inválido nem fica
   selecionável.

   O dado já estava no snapshot: criatura carrega `raca: c.tipo`
   (montarSnapshots), e criaturas.tipo tem exatamente os valores que as
   magias pedem — Animal, Morto, Demônio. Nenhuma mudança de schema.

   Um PJ nunca tem raça Demônio, Morto ou Animal, então a restrição nunca
   dispara sobre personagens — que é o resultado correto, não um furo.

   Molde de tecnicaPermitida: devolve { pode, motivo } pra UI pôr o motivo
   no tooltip em vez de só desabilitar sem explicação. */
function alvoPermitidoParaMagia(alvoP, magiaKey) {
  const reg = (typeof magiaEfeitoDe === 'function') ? magiaEfeitoDe(magiaKey) : null;
  if (!reg || !reg.so_racas) return { pode: true, motivo: null };
  const raca = alvoP && alvoP.raca;
  if (!raca) return { pode: false, motivo: 'raca' };
  return reg.so_racas.includes(raca)
    ? { pode: true, motivo: null }
    : { pode: false, motivo: 'raca' };
}

/* O efeito INVERTE neste alvo? "Esta magia possui o efeito inverso em
   mortos-vivos" — Curas Espirituais numa criatura tipo Morto queima a EH em
   vez de restaurá-la. Quem aplica a inversão é aplicarCuraPool, via
   opcoes.inverter; esta função só responde a pergunta. */
function efeitoInverteNoAlvo(alvoP, magiaKey) {
  const reg = (typeof magiaEfeitoDe === 'function') ? magiaEfeitoDe(magiaKey) : null;
  if (!reg || !reg.inverte_em) return false;
  const raca = alvoP && alvoP.raca;
  return !!raca && reg.inverte_em.includes(raca);
}
```

Exporte em `MotorBatalha`:

```js
    alvoPermitidoParaMagia, efeitoInverteNoAlvo,
```

- [ ] **Step 4: Rodar, rodar a suíte e commitar**

Run: `npx vitest run src/12-batalha/magia-efeitos.test.js` → PASS
Run: `npm test` → verde

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/magia-efeitos.test.js
git commit -m "feat(batalha): restricao de alvo por raca nas magias

Aura Divina so morde Demonio e Morto, Forca Mutua so Animal, e Curas
Espirituais inverte em Morto. O dado ja estava no snapshot (criatura carrega
raca = criaturas.tipo), entao a regra sai sem tocar no schema.

Forca Mutua fica pela metade de proposito: a raca e verificavel, 'sob Elo
Animal' nao e — Elo Animal e narrativa nesta fase e nao grava status.

Spec secao 6.2."
```

---

## Task 10: Multi-alvo e o raio que vem depois

**Files:**
- Modify: `src/12-batalha/batalha.jsx`
- Modify: `src/12-batalha/magia-efeitos.test.js`

**Interfaces:**
- Consumes: `magiaEfeitoDe`, `alvoPermitidoParaMagia`, `dentroDoAlcance` (tabuleiro)
- Produces:
  - `tetoDeAlvos(magiaKey) -> number | null` (`null` = sem teto, 'escolha')
  - `alvosDeArea(magia, celula, participantes) -> participantes[] | null` (`null` = sem raio no catálogo → seleção manual)

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `src/12-batalha/magia-efeitos.test.js`:

```js
describe('teto de alvos', () => {
  it.each([
    ['dardos_de_gelo', 3],
    ['dardos_de_luz',  2],
    ['raio_eletrico',  2],
    ['meteoros',       5],
    ['bola_de_fogo',   1],
    ['bencao',         1],
  ])('%s → %s', (key, n) => {
    expect(M.tetoDeAlvos(key)).toBe(n);
  });

  it('Aura Divina não tem teto', () => {
    expect(M.tetoDeAlvos('aura_divina')).toBeNull();
  });

  it('magia fora do registro cai em alvo único', () => {
    expect(M.tetoDeAlvos('ressurreicao')).toBe(1);
  });
});

describe('área: o raio vem depois, e o código já espera por ele', () => {
  /* O usuário informou em 11/09/2026 que vai acrescentar raio de efeito a
     Bola de Fogo e Meteoros. Para que isso seja PREENCHIMENTO DE BANCO e não
     mudança de código, a seleção lê um campo `raio` que ainda não existe na
     tabela. Os dois ramos são testados agora. Spec §6.3. */
  const noTabuleiro = (pos, over = {}) => ({
    inst_id: 'p' + pos.x, tipo: 'criatura', raca: 'Animal',
    status: 'ativo', pos, ...over,
  });
  const parts = [
    noTabuleiro({ x: 1, y: 1 }),
    noTabuleiro({ x: 2, y: 1 }),
    noTabuleiro({ x: 9, y: 9 }),
  ];

  it('SEM raio no catálogo devolve null — a seleção fica manual', () => {
    const magia = { key: 'bola_de_fogo', alcance: '20 metros' };
    expect(M.alvosDeArea(magia, { x: 1, y: 1 }, parts)).toBeNull();
  });

  it('raio 0 também é seleção manual', () => {
    const magia = { key: 'bola_de_fogo', alcance: '20 metros', raio: 0 };
    expect(M.alvosDeArea(magia, { x: 1, y: 1 }, parts)).toBeNull();
  });

  it('COM raio pega todo mundo dentro dele', () => {
    const magia = { key: 'bola_de_fogo', alcance: '20 metros', raio: 1 };
    const r = M.alvosDeArea(magia, { x: 1, y: 1 }, parts);
    expect(r.map((p) => p.inst_id).sort()).toEqual(['p1', 'p2']);
  });

  it('COM raio ignora quem está fora', () => {
    const magia = { key: 'bola_de_fogo', alcance: '20 metros', raio: 1 };
    const r = M.alvosDeArea(magia, { x: 1, y: 1 }, parts);
    expect(r.find((p) => p.inst_id === 'p9')).toBeUndefined();
  });

  it('COM raio ignora morto, desistiu e ausente', () => {
    const magia = { key: 'bola_de_fogo', raio: 5 };
    const mistos = [
      noTabuleiro({ x: 1, y: 1 }, { status: 'morto' }),
      noTabuleiro({ x: 2, y: 1 }, { status: 'desistiu' }),
      noTabuleiro({ x: 3, y: 1 }, { ausente: true }),
      noTabuleiro({ x: 4, y: 1 }),
    ];
    const r = M.alvosDeArea(magia, { x: 1, y: 1 }, mistos);
    expect(r.map((p) => p.inst_id)).toEqual(['p4']);
  });

  it('a área RESPEITA a restrição de raça', () => {
    // Aura Divina com raio não pode pegar o aliado Animal que está no meio.
    const magia = { key: 'aura_divina', raio: 5 };
    const mistos = [
      noTabuleiro({ x: 1, y: 1 }, { raca: 'Demônio' }),
      noTabuleiro({ x: 2, y: 1 }, { raca: 'Animal' }),
    ];
    const r = M.alvosDeArea(magia, { x: 1, y: 1 }, mistos);
    expect(r.map((p) => p.raca)).toEqual(['Demônio']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/magia-efeitos.test.js -t "teto de alvos"`
Expected: FAIL — `tetoDeAlvos` não é função

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, depois de `alvoPermitidoParaMagia`:

```js
/* ── Quantos alvos esta magia pega ─────────────────────────────────
   'escolha' vira null = sem teto, e a UI deixa o Mestre selecionar quantos
   alvos válidos quiser. Só as magias de área usam isso (spec §6.3).
   Magia fora do registro cai em alvo único, como o ataque de arma. */
function tetoDeAlvos(magiaKey) {
  const reg = (typeof magiaEfeitoDe === 'function') ? magiaEfeitoDe(magiaKey) : null;
  if (!reg) return 1;
  return reg.alvos === 'escolha' ? null : (Number(reg.alvos) || 1);
}

/* ── Alvos de uma magia de ÁREA ────────────────────────────────────
   O catálogo NÃO tem raio hoje, e por isso a Fase 1 deixa a seleção com o
   Mestre (parcial: 'area' no log). O usuário informou em 11/09/2026 que vai
   acrescentar raio a Bola de Fogo e Meteoros — então esta função já lê o
   campo, e o dia em que a coluna existir o ramo automático liga sozinho, sem
   tocar em código.

     raio ausente ou 0 → devolve null: seleção manual, como hoje;
     raio > 0          → devolve todos os participantes válidos no raio.

   "Válido" exclui morto, desistiu e ausente — e respeita a restrição de raça,
   senão uma Aura Divina com raio pegaria o companheiro animal do grupo. */
function alvosDeArea(magia, celula, participantes) {
  const raio = Number(magia && magia.raio) || 0;
  if (raio <= 0) return null;
  if (!celula || !Array.isArray(participantes)) return null;
  return participantes.filter((p) => {
    if (!p || p.ausente) return false;
    const st = p.status || 'ativo';
    if (st === 'morto' || st === 'desistiu') return false;
    if (!posValida(p.pos)) return false;
    if (!dentroDoAlcance(celula, p.pos, raio)) return false;
    return alvoPermitidoParaMagia(p, magia.key).pode;
  });
}
```

Exporte em `MotorBatalha`:

```js
    tetoDeAlvos, alvosDeArea,
```

- [ ] **Step 4: Rodar, rodar a suíte e commitar**

Run: `npx vitest run src/12-batalha/magia-efeitos.test.js` → PASS
Run: `npm test` → verde

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/magia-efeitos.test.js
git commit -m "feat(batalha): multi-alvo e area preparada para o raio

Dardos de Gelo pega 3, Raio Eletrico e Dardos de Luz 2, Meteoros 5. Aura
Divina nao tem teto: o Mestre escolhe quantos alvos validos quiser.

alvosDeArea ja le um campo raio que a tabela ainda nao tem. Sem raio, a
selecao fica manual como hoje; com raio, pega todo mundo dentro dele. Quando
a coluna chegar, e preencher o banco — nao mexer em codigo.

Spec secao 6.3."
```

---

## Task 11: A UI — abas Magia e Apoio, evocação e log

Última task, e a única que mexe em componente. Todas as regras já existem e
estão testadas; aqui elas só ganham tela.

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `magiasDeApoioDoAtor` (`:639`), `AcaoPanel` (`:4807` em diante), os dois `aplicarAcao`/`handleAcao`
- Modify: `src/01-core/copy.jsx` — os rótulos novos
- Create: `src/12-batalha/magia-aba.test.jsx`

**Interfaces:**
- Consumes: tudo das Tasks 3–10
- Produces: nenhuma função nova de motor; só tela e log

- [ ] **Step 1: Generalizar `magiasDeApoioDoAtor`**

Em `batalha.jsx:639`, troque o critério. Hoje a função só devolve magias com
`mod_vb !== 0`; passa a devolver toda magia com entrada no registro cujo
`alvo` não seja `'inimigo'`:

```js
/* ── Magias de APOIO conhecidas pelo PJ ────────────────────────────
   Até 11/09/2026 o critério era "modifica velocidade", porque velocidade era
   o único efeito de apoio que o motor sabia aplicar. Com o registro da Fase 1
   o critério vira "tem entrada no registro e não é magia de ataque" — as oito
   de velocidade continuam na lista, agora acompanhadas.

   Uma magia pode causar dano E dar buff; nesse caso aparece nas duas listas,
   e é o Mestre que escolhe por qual aba usá-la. */
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
    const reg = (typeof magiaEfeitoDe === 'function') ? magiaEfeitoDe(key) : null;
    if (!reg || reg.alvo === 'inimigo') return;
    const nivel = (typeof nivelMagiaEfetivo === 'function') ? nivelMagiaEfetivo(p) : (p * 2 - 1);
    const dur = duracaoEmRodadas(m);
    const ev  = evocacaoEmRodadas(m);
    out.push({
      fonte: 'magia',
      key, nome: m.nome,
      passos: p, nivel,
      custo_karma: nivel,
      mod_vb: modVelocidadeNoNivel(m, nivel),   // mantido: a UI ainda o exibe
      rodadas: dur.rodadas,
      concentracao: dur.concentracao,
      evocacao_rodadas: ev.rodadas,
      evocacao_bloqueada: ev.bloqueada,
      resistencia: exigeResistencia(m),
      pessoal: /pessoal/i.test(m.alcance || ''),
      alcance: m.alcance || null,
      alvo: reg.alvo,
      max_alvos: tetoDeAlvos(key),
      parcial: reg.parcial || null,
      descricao: m['nivel_' + nivel] || null,
      // O objeto do catálogo viaja inteiro: aplicarEfeitoMagia lê o texto do
      // nível dele, não de campos pré-mastigados.
      catalogo: m,
    });
  });
  return out;
}
```

- [ ] **Step 2: Rodar `velocidade-magia.test.js` e `apoio-tab.test.jsx`**

Run: `npx vitest run src/12-batalha/velocidade-magia.test.js src/12-batalha/apoio-tab.test.jsx`
Expected: as expectativas de velocidade têm que continuar valendo — a
Velocidade agora chega pelo registro, mas o comportamento é o mesmo. Se
`apoio-tab.test.jsx` quebrar porque a lista ficou maior, **ajuste o teste**:
a lista maior é o objetivo da task, não regressão.

- [ ] **Step 3: Escrever o teste de render da aba**

Crie `src/12-batalha/magia-aba.test.jsx`:

```jsx
/* ============================================================
   magia-aba.test.jsx — a aba Magia com evocação e multi-alvo
   ============================================================
   Espelha tecnica-aba.test.jsx. Cobre o que o motor não alcança: o que o
   Mestre VÊ e o que ele consegue clicar.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel;
beforeAll(() => {
  AcaoPanel = window.AcaoPanel;
  expect(AcaoPanel).toBeDefined();
});

describe('Ritual em batalha', () => {
  it('magia de evocação Ritual aparece desabilitada, com o motivo', () => {
    // O Mestre precisa VER que a magia existe e por que não dá pra usá-la —
    // esconder a opção faria ele procurar um bug que não existe.
    const ev = window.MotorBatalha.evocacaoEmRodadas({ evocacao: 'Ritual' });
    expect(ev.bloqueada).toBe(true);
  });
});

describe('o contador de evocação', () => {
  it('o card mostra as rodadas restantes enquanto canaliza', () => {
    const p = window.MotorBatalha.iniciarEvocacao(
      { inst_id: 'c1', nome: 'Mago', tipo: 'pj', karma: 9, pa_rest: 1,
        eh: 10, eh_max: 10, ef: 20, ef_max: 20, status: 'ativo', status_temp: [] },
      { key: 'meteoros', nome: 'Meteoros', evocacao: '5 rodadas' }, 5, ['a1'], 5);
    expect(p.evocando.rodadas_rest).toBe(5);
  });
});
```

> Este arquivo é deliberadamente magro: a lógica toda já tem cobertura nas
> Tasks 4–10, e teste de render é caro e frágil. Ele existe pra travar as duas
> coisas que só aparecem na tela.

- [ ] **Step 4: A UI do `AcaoPanel`**

Quatro mudanças, todas dentro do componente (`batalha.jsx:4807` em diante):

1. **Seletor de N alvos.** Onde hoje há um alvo só, quando `magia.max_alvos > 1` (ou `null`), permitir selecionar até o teto. Cada alvo selecionado rola o próprio d20.
2. **Aviso de evocação.** Ao escolher magia com `evocacao_rodadas > 0`, mostrar abaixo do select: quantas rodadas e o que quebra.
3. **Opção bloqueada.** `evocacao_bloqueada` → `disabled` no item, com o motivo no tooltip (mesmo padrão de `tecUso`/`tecEquip`).
4. **Alvo inválido.** `alvoPermitidoParaMagia(alvo, magia.key).pode === false` → alvo não selecionável, motivo no tooltip.

Os rótulos novos vão em `src/01-core/copy.jsx`, nos dois idiomas, dentro de
`batalha`:

```js
      magiaEvocando:       'Evocando {nome} — {n} rodada(s)',
      magiaEvocacaoAviso:  'Evocação de {n} rodada(s). Atacar, andar, usar item ou levar dano na energia física derruba a magia, e o karma não volta.',
      magiaRitual:         'Ritual — não pode ser evocada em batalha.',
      magiaAlvoRaca:       'Esta magia só afeta {racas}.',
      magiaParcialArea:    'Magia de área: escolha os alvos atingidos.',
      magiaParcialElo:     'Só afeta animais sob Elo Animal — confira o vínculo.',
```

(E os equivalentes em `en`, no mesmo bloco.)

- [ ] **Step 5: O log**

Nos dois call sites de ação (Mestre `aplicarAcao` `:3040`, Jogador `handleAcao`
`:6304`), acrescentar os três eventos. Seguindo o padrão existente, as
mensagens da Central de Mensagens vão em **PT literal**:

```js
// magia_evocacao_iniciada
`${nomeAtor} começou a evocar ${magia.nome} — ${ev.rodadas} rodada(s)`
// magia_evocacao_quebrada
`A evocação de ${nome} por ${nomeAtor} caiu (${motivo})`
// magia_efeito_aplicado
`${nomeAtor} lançou ${magia.nome} em ${nomesAlvos} — ${deltas}`
```

Quando a magia tiver `parcial`, acrescentar a marca ao final da mensagem, do
mesmo jeito que a Fase 1 das técnicas fez com Explorar Fraqueza — para o
Mestre não supor que a regra foi aplicada inteira.

- [ ] **Step 6: Rodar tudo**

Run: `npm test`
Expected: verde. Os vizinhos a vigiar: `apoio-tab.test.jsx`, `alvos-validos.test.jsx`, `softlock-acao.test.jsx`, `tooltip-orfao.test.js`.

- [ ] **Step 7: Commit**

```bash
git add src/12-batalha/batalha.jsx src/01-core/copy.jsx src/12-batalha/magia-aba.test.jsx src/12-batalha/apoio-tab.test.jsx
git commit -m "feat(batalha): aba Magia com multi-alvo, evocacao e restricao de alvo

A aba Apoio deixa de ser so velocidade: passa a listar toda magia com
entrada no registro. A aba Magia aceita N alvos. Magia de evocacao longa
avisa quantas rodadas e o que quebra antes de o jogador se comprometer;
Ritual aparece desabilitada com o motivo, em vez de sumir.

O log ganha evocacao iniciada, evocacao quebrada e efeito aplicado, e marca
o que ficou parcial — area sem raio e o vinculo de Forca Mutua.

Spec secao 10."
```

---

## Encerramento

- [ ] **Rodar a suíte inteira uma última vez**

Run: `npm test`
Expected: 1001 testes originais + ~90 novos, todos verdes.

- [ ] **Entregar o script SQL ao usuário**

`scripts/sql/magias-curas-fisicas-fix.sql` **não foi executado**. Avise que
precisa rodar contra produção, e que o script é idempotente.

- [ ] **Avisar sobre a mudança de comportamento**

Aeroproteção, Piroproteção e Armadura Elemental **saem da aba Magia** (onde
apareciam como ataques, por causa do bug da Task 1) e **entram na aba Apoio**
como proteções. Se algum jogador vinha usando uma delas como ataque, o
comportamento muda na próxima sessão.

- [ ] **O que ficou registrado para a Fase 2**

As sete magias de controle que os PJs já têm (Sono, Medo, Invisibilidade,
Ordens, Possessão, Esconjuração, Alucinação), mais Licantropia Lupina
(`mod_atributo`) e Oferenda (`mod_nivel_magia`). E, como pré-requisito da fase
em que criaturas conjurarem, a normalização de `criaturas.magia` de texto
livre para `key` → nível.
