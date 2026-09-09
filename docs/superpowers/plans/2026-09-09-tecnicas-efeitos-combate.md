# Técnicas de combate — efeitos mecânicos (Fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As 24 técnicas de combate cujo efeito é "um número somado a um stat por N rodadas" passam a produzir efeito mecânico real nas rodadas de batalha; Guerreiro/Ladino passam a ter 2 pontos de ação só depois da especialização.

**Architecture:** Um registro em código (`TECNICA_EFEITO_MAP`) traduz cada `tecnicas.key` em uma lista de primitivas. Uma função pura (`aplicarEfeitoTecnica`) grava essas primitivas no `status_temp` do participante — o mesmo array que a Falha Crítica e as magias de apoio já usam, e que `processarViradaDeRodada` já decrementa. Os consumidores (coluna de ataque, resistência, dano, EH) leem o `status_temp` na hora de calcular.

**Tech Stack:** React 19 sem JSX transform de módulo (arquivos `.jsx` carregados por `main.tsx` e exportados via `Object.assign(window, {...})`), Vitest (`npm test`), Supabase.

**Spec:** `docs/superpowers/specs/2026-09-09-tecnicas-efeitos-combate-design.md`

## Global Constraints

- **Padrão de módulo:** nada de `export`. Cada arquivo `.jsx` de `src/01-core/` termina em `Object.assign(window, { ... })`. Arquivos novos precisam de um `import` em `src/main.tsx`, na ordem certa (dependências antes).
- **Padrão de teste:** `import './arquivo.jsx'` pelo efeito colateral, depois ler `window.X` dentro de `beforeAll`. Ver `src/12-batalha/motor-batalha.test.js:19-28`.
- **Comando de teste:** `npm test` roda tudo; `npx vitest run <caminho>` roda um arquivo.
- **Funções puras vão em `window.MotorBatalha`** (`batalha.jsx:5813`). Componentes React não entram lá — `AcaoPanel` e `PreviaPool` são exportados soltos, com comentário explicando por quê.
- **Idioma do código e dos comentários:** português, como o resto do repositório. Comentário explica *por quê*, não *o quê*.
- **Duração conta a rodada da ativação.** `rodadas_rest: N` significa "vale nesta rodada e em mais N−1".
- **Reaplicar não acumula:** renova `rodadas_rest`, mantém um único `status_temp` por técnica por participante.
- **Commits:** um por task, mensagem em português no padrão `feat(batalha):` / `fix(batalha):`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/01-core/tecnicas-efeito.jsx` **(criar)** | O registro `TECNICA_EFEITO_MAP` e o lookup `tecnicaEfeitoDe(key)`. Dado puro, sem dependência de batalha |
| `src/01-core/tecnicas-efeito.test.js` **(criar)** | Trava o registro contra o texto do banco |
| `src/12-batalha/batalha.jsx` **(modificar)** | `pontosAcaoPJ`, `gruposDeArma`, `somaModAtaque`, `aplicarEfeitoTecnica`, `tecnicaPermitida`, correção de `tecnicasCompativeisComArma`, expiração de `mod_eh_temp`, consumo em `AcaoPanel`, os dois `aplicarTeste` |
| `scripts/sql/tecnicas-grupo-armas-fix.sql` **(criar)** | Corrige `resistencia_extrema.grupo_armas`, que está com o valor de `uso` |
| `src/12-batalha/tecnica-efeitos.test.js` **(criar)** | Aplicação, não-acúmulo, expiração, alvo, `Único` |
| `src/12-batalha/motor-batalha.test.js` **(modificar)** | Pontos de ação |
| `src/main.tsx` **(modificar)** | Um `import` do arquivo novo |

---

## Task 1: Pontos de ação de Guerreiro/Ladino

Independente do resto do plano. Vai primeiro porque é a menor e não bloqueia nada.

**Files:**
- Modify: `src/12-batalha/batalha.jsx:721-726`
- Test: `src/12-batalha/motor-batalha.test.js:29-43`

**Interfaces:**
- Consumes: nada
- Produces: `pontosAcaoPJ(pj) -> number` (assinatura inalterada; só os números mudam)

- [ ] **Step 1: Reescrever os testes existentes para a regra nova**

Substitua o bloco `describe('pontosAcaoPJ', ...)` inteiro em `src/12-batalha/motor-batalha.test.js` por:

```js
/* ────────────────────────── pontosAcaoPJ ────────────────────────── */
// Regra de 09/09/2026: só a ESPECIALIZAÇÃO dá o 2º ponto de ação.
// Antes da especialização, Guerreiro e Ladino agem como qualquer outra
// profissão. Números anteriores (4 especializado / 2 base) ficaram para trás
// DE PROPÓSITO — se este teste quebrar, foi mudança de regra, não acidente.
describe('pontosAcaoPJ', () => {
  it('Guerreiro e Ladino SEM especialização têm 1 PA, como as demais profissões', () => {
    expect(M.pontosAcaoPJ({ profissao: 'Guerreiro' })).toBe(1);
    expect(M.pontosAcaoPJ({ profissao: 'Ladino' })).toBe(1);
  });

  it('Guerreiro e Ladino especializados têm 2 PA', () => {
    expect(M.pontosAcaoPJ({ profissao: 'Guerreiro', especializacao: 'Cavaleiro' })).toBe(2);
    expect(M.pontosAcaoPJ({ profissao: 'Ladino', especializacao: 'Assassino' })).toBe(2);
  });

  it('as demais profissões têm 1 PA, especializadas ou não', () => {
    expect(M.pontosAcaoPJ({ profissao: 'Mago' })).toBe(1);
    expect(M.pontosAcaoPJ({ profissao: 'Sacerdote' })).toBe(1);
    expect(M.pontosAcaoPJ({ profissao: 'Bardo', especializacao: 'Menestrel' })).toBe(1);
    expect(M.pontosAcaoPJ({ profissao: 'Rastreador', especializacao: 'Batedor' })).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/12-batalha/motor-batalha.test.js -t pontosAcaoPJ`
Expected: FAIL — `expected 2 to be 1` no primeiro caso e `expected 4 to be 2` no segundo.

- [ ] **Step 3: Aplicar a regra nova**

Em `src/12-batalha/batalha.jsx`, substitua o corpo de `pontosAcaoPJ`:

```js
/* ── Pontos de ação por classe (spec do sistema) ──────────────── */
// 09/09/2026: o 2º ponto de ação passou a ser prêmio da ESPECIALIZAÇÃO.
// Antes, Guerreiro/Ladino já nasciam com 2 e subiam para 4 especializados —
// saíam na frente das demais profissões desde o estágio 1. Agora todo mundo
// começa com 1.
// O +1 por velocidade > 30 (processarViradaDeRodada) continua por cima disto:
// um especializado veloz age 3 vezes, não 2.
function pontosAcaoPJ(pj) {
  const prof = pj.profissao;
  const guerreiroOuLadino = prof === 'Guerreiro' || prof === 'Ladino';
  return (guerreiroOuLadino && pj.especializacao) ? 2 : 1;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/12-batalha/motor-batalha.test.js`
Expected: PASS — o arquivo inteiro, não só o bloco, para pegar quebra colateral.

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/motor-batalha.test.js
git commit -m "fix(batalha): 2o ponto de acao vira premio da especializacao"
```

---

## Task 2: O registro `TECNICA_EFEITO_MAP`

Dado puro. Nenhuma dependência de batalha, por isso vive em `01-core`.

**Files:**
- Create: `src/01-core/tecnicas-efeito.jsx`
- Create: `src/01-core/tecnicas-efeito.test.js`
- Modify: `src/main.tsx:25` (adicionar import depois de `game-data.jsx`)

**Interfaces:**
- Consumes: nada
- Produces:
  - `TECNICA_EFEITO_MAP` — objeto `{ [key: string]: EntradaTecnica }`
  - `EntradaTecnica = { modo: 'total'|'teste', alvo: 'self'|'inimigo'|'aliados', rodadas: number, icone: string, efeitos: Efeito[], dificuldade?: string, maxAlvos?: number, grupo?: string }`
  - `Efeito = { tipo: string, sinal?: 1|-1, valor?: number }`
  - `tecnicaEfeitoDe(key) -> EntradaTecnica | null`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/01-core/tecnicas-efeito.test.js`:

```js
/* ============================================================
   tecnicas-efeito.test.js — o registro contra o texto do banco
   ============================================================
   O campo `efeito` da tabela `tecnicas` é a fonte human-readable
   exibida na UI; TECNICA_EFEITO_MAP é a mecânica. Os dois PRECISAM
   dizer o mesmo número de rodadas, senão a tela promete uma coisa e
   o motor faz outra. Este arquivo trava esse acordo.

   As frases abaixo são cópias literais do banco em 09/09/2026.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './tecnicas-efeito.jsx';

let MAP, tecnicaEfeitoDe;
beforeAll(() => {
  MAP = window.TECNICA_EFEITO_MAP;
  tecnicaEfeitoDe = window.tecnicaEfeitoDe;
  expect(MAP).toBeDefined();
  expect(tecnicaEfeitoDe).toBeTypeOf('function');
});

// Cópia literal do campo `efeito` das 24 técnicas da Fase 1.
const EFEITO_NO_BANCO = {
  ajustar_disparo:     'Seu total de Ajustar Disparo é adicionado à sua coluna de ataque por 2 rodadas.',
  animosidade:         'Seu total de Animosidade é adicionado à sua energia heroica por 2 rodadas.',
  atirar_em_movimento: 'Seu total de Atirar em Movimento é adicionado à sua velocidade por 2 rodadas.',
  centaurizar:         'Seu total de Centaurizar é adiciona à coluna de ataque e a velocidade por 2 rodadas.',
  defletir_ataque:     'Seu total de Defletir Ataque é adicionado à sua defesa por 3 rodadas.',
  disparo_rapido:      'Seu total de Disparo Rápido é adicionado à sua velocidade por 5 rodadas.',
  expectativa:         'Seu total de Expectativa é subtraído da velocidade de seu adversário por 3 rodadas.',
  explorar_fraqueza:   'Seu total de Explorar Fraqueza é adicionado à sua coluna de ataque e ignora a armadura do adversário.',
  furia:               'Seu total de Fúria é adicionado à sua coluna de ataque, a sua energia heroica, a sua resistência física e a sua resistência mágica por 5 rodadas.',
  heroismo:            'Seu total de Heroísmo é adicionado à sua energia heroica por 5 rodadas.',
  imprevisibilidade:   'Seu total de Imprevisilibidade é adicionado à sua defesa por 3 rodadas.',
  mira:                'Seu total de Mira é adicionado à sua coluna de ataque por 1 rodada.',
  posicionamento:      'Seu total de Posicionamento é subtraído do dano máximo do adversário por 3 rodadas.',
  postura_defensiva:   'Seu total de Postura Defensiva é adicionado à sua defesa, e subtraído da sua coluna de ataque por 3 rodadas.',
  postura_ofensiva:    'Seu total de Postura Ofensiva é adicionado à sua coluna de ataque, e subtraído da sua defesa por 3 rodadas.',
  pressionar_oponente: 'Seu total de Pressionar Oponente é subtraído da defesa de 1 alvo por 3 rodadas.',
  pugilato:            'Seu total de Pugilato é adicionado ao seu grupo de armas CD por 1 rodada.',
  resguardar:          'Seu total de Resguardar é subtraído da coluna de ataque do adversário por 2 rodadas.',
  resistencia_a_dor:   'Seu total de Resistência à Dor é adicionado à sua resistência física por 5 rodadas.',
  resistencia_extrema: 'Seu total de Resistência Extrema é adicionado à sua resistência mágica por 5 rodadas.',
  ricochetear:         'Seu total de Ricochetear é adicionado à sua coluna de ataque por 1 rodada.',
  sangramento:         'Um teste de Sangramento (Difícil) causa 1 de dano na energia física em 1 alvo por 5 rodadas.',
  segundo_folego:      'Seu total de Segundo Fôlego é adicionado à sua energia heroica por 10 rodadas.',
  voz_de_comando:      'Seu total de Voz de Comando é adicionado à iniciativa de 4 alvos por 10 rodadas.',
};

const TIPOS_VALIDOS = [
  'mod_ataque', 'mod_defesa', 'mod_vb', 'mod_eh_temp',
  'mod_rf', 'mod_rm', 'mod_dano_max', 'dano_por_rodada',
];
const DIFICULDADES_VALIDAS = ['facil', 'medio', 'dificil', 'muito_dificil', 'absurdo'];

describe('TECNICA_EFEITO_MAP', () => {
  it('cobre exatamente as 24 técnicas da Fase 1', () => {
    expect(Object.keys(MAP).sort()).toEqual(Object.keys(EFEITO_NO_BANCO).sort());
  });

  it('toda entrada tem modo, alvo, rodadas, ícone e ao menos um efeito', () => {
    for (const [key, e] of Object.entries(MAP)) {
      expect(['total', 'teste'], key).toContain(e.modo);
      expect(['self', 'inimigo', 'aliados'], key).toContain(e.alvo);
      expect(Number.isInteger(e.rodadas) && e.rodadas > 0, key).toBe(true);
      expect(typeof e.icone === 'string' && e.icone.length > 0, key).toBe(true);
      expect(Array.isArray(e.efeitos) && e.efeitos.length > 0, key).toBe(true);
    }
  });

  it('todo efeito usa um tipo conhecido e traz sinal (modo total) ou valor (modo teste)', () => {
    for (const [key, e] of Object.entries(MAP)) {
      for (const ef of e.efeitos) {
        expect(TIPOS_VALIDOS, `${key}/${ef.tipo}`).toContain(ef.tipo);
        if (e.modo === 'total') expect([1, -1], key).toContain(ef.sinal);
        else expect(Number.isFinite(ef.valor), key).toBe(true);
      }
    }
  });

  it('modo teste sempre traz uma dificuldade válida', () => {
    for (const [key, e] of Object.entries(MAP)) {
      if (e.modo !== 'teste') continue;
      expect(DIFICULDADES_VALIDAS, key).toContain(e.dificuldade);
    }
  });

  // O teste que realmente importa: mecânica e texto exibido não podem divergir.
  it('a duração do registro bate com o número de rodadas escrito no banco', () => {
    for (const [key, texto] of Object.entries(EFEITO_NO_BANCO)) {
      const m = texto.match(/(\d+)\s*rodadas?/i);
      if (!m) continue;   // Explorar Fraqueza não declara duração — ver abaixo
      expect(MAP[key].rodadas, `${key}: "${texto}"`).toBe(Number(m[1]));
    }
  });

  // Explorar Fraqueza é a única sem duração no texto. Fica 1 rodada por
  // decisão, e o teste trava isso pra não virar 3 sem ninguém perceber.
  it('Explorar Fraqueza, sem duração no texto, vale 1 rodada', () => {
    expect(EFEITO_NO_BANCO.explorar_fraqueza).not.toMatch(/rodadas?/i);
    expect(MAP.explorar_fraqueza.rodadas).toBe(1);
  });

  it('as técnicas de dois destinos criam os dois (ou quatro) efeitos', () => {
    expect(MAP.centaurizar.efeitos.map((e) => e.tipo).sort())
      .toEqual(['mod_ataque', 'mod_vb']);
    expect(MAP.furia.efeitos.map((e) => e.tipo).sort())
      .toEqual(['mod_ataque', 'mod_eh_temp', 'mod_rf', 'mod_rm'].sort());
  });

  it('as posturas somam num stat e subtraem no outro', () => {
    const def = MAP.postura_defensiva.efeitos;
    expect(def.find((e) => e.tipo === 'mod_defesa').sinal).toBe(1);
    expect(def.find((e) => e.tipo === 'mod_ataque').sinal).toBe(-1);
    const ofe = MAP.postura_ofensiva.efeitos;
    expect(ofe.find((e) => e.tipo === 'mod_ataque').sinal).toBe(1);
    expect(ofe.find((e) => e.tipo === 'mod_defesa').sinal).toBe(-1);
  });

  it('os debuffs de adversário são negativos e miram inimigo', () => {
    for (const key of ['expectativa', 'resguardar', 'pressionar_oponente', 'posicionamento']) {
      expect(MAP[key].alvo, key).toBe('inimigo');
      expect(MAP[key].efeitos.every((e) => e.sinal === -1), key).toBe(true);
    }
  });

  // A restrição de arma vem do banco (tecnicas.grupo_armas), não do registro —
  // este teste trava que ninguém voltou a hardcodar por técnica.
  it('nenhuma entrada declara restrição de arma no registro', () => {
    for (const [key, e] of Object.entries(MAP)) {
      expect(e.grupo, `${key} não deve declarar grupo — usa tecnicas.grupo_armas`).toBeUndefined();
    }
  });

  it('Voz de Comando atinge até 4 aliados', () => {
    expect(MAP.voz_de_comando.alvo).toBe('aliados');
    expect(MAP.voz_de_comando.maxAlvos).toBe(4);
  });
});

describe('tecnicaEfeitoDe', () => {
  it('devolve a entrada da técnica mapeada', () => {
    expect(tecnicaEfeitoDe('mira').efeitos[0].tipo).toBe('mod_ataque');
  });

  // Fallback é o comportamento narrativo de hoje, não erro: as 34 técnicas
  // de Fase 2 e as 4 puramente narrativas continuam só no log.
  it('devolve null para técnica sem entrada, sem lançar', () => {
    expect(tecnicaEfeitoDe('golpe_duplo')).toBeNull();
    expect(tecnicaEfeitoDe('nao_existe')).toBeNull();
    expect(tecnicaEfeitoDe(null)).toBeNull();
    expect(tecnicaEfeitoDe(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/01-core/tecnicas-efeito.test.js`
Expected: FAIL — `Failed to resolve import "./tecnicas-efeito.jsx"`.

- [ ] **Step 3: Criar o registro**

Crie `src/01-core/tecnicas-efeito.jsx`:

```jsx
/* ============================================================
   TÉCNICAS DE COMBATE — registro de efeito mecânico (Fase 1)
   ============================================================
   Traduz o campo `efeito` da tabela `tecnicas` (prosa, exibida na
   UI) para primitivas que o motor de batalha sabe aplicar. O texto
   do banco continua sendo a fonte para o jogador LER; este mapa é o
   que a rodada EXECUTA. tecnicas-efeito.test.js trava o acordo entre
   os dois — em especial o número de rodadas.

   Fase 1 = as 24 técnicas cujo efeito é "um número somado a um stat
   por N rodadas". As ~21 que reescrevem a resolução do golpe
   (ignora_eh, dano %, ataque duplo, impedir ataque…) são Fase 2 e
   NÃO têm entrada aqui — técnica sem entrada segue narrativa, que é
   exatamente o comportamento de antes desta fase.

   Campos:
     modo        'total' → valor = totalTecnica() × sinal, sem dado.
                 'teste' → rola d20 na `dificuldade`; aplica `valor`
                           fixo só no sucesso.
     alvo        'self' | 'inimigo' | 'aliados'
     rodadas     duração CONTANDO a rodada da ativação.
     efeitos[]   { tipo, sinal }  no modo total
                 { tipo, valor }  no modo teste
     maxAlvos?   teto de alvos quando alvo === 'aliados'.
     parcial?    metade do efeito que a Fase 1 não automatiza (só aviso na UI).

   A restrição por arma/armadura NÃO mora aqui: vem das colunas
   `grupo_armas` e `grupo_armaduras` da própria tabela `tecnicas`.

   Spec: docs/superpowers/specs/2026-09-09-tecnicas-efeitos-combate-design.md
   ============================================================ */

const TECNICA_EFEITO_MAP = {
  /* ── Coluna de ataque ───────────────────────────────────────── */
  mira:              { modo: 'total', alvo: 'self',    rodadas: 1,  icone: '🎯',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  ricochetear:       { modo: 'total', alvo: 'self',    rodadas: 1,  icone: '🏹',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  ajustar_disparo:   { modo: 'total', alvo: 'self',    rodadas: 2,  icone: '📐',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  // "adicionado ao seu grupo de armas CD": é bônus de ataque, mas só com arma
  // desarmada. A restrição NÃO é declarada aqui — vem de tecnicas.grupo_armas
  // ('CD' no banco), que aplicarEfeitoTecnica copia para o efeito.
  pugilato:          { modo: 'total', alvo: 'self',    rodadas: 1,  icone: '👊',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  // Sem duração no texto do banco; `uso` é Único. 1 rodada por decisão —
  // ver o teste que trava isso em tecnicas-efeito.test.js.
  // METADE PENDENTE: o "ignora a armadura do adversário" é Fase 2.
  explorar_fraqueza: { modo: 'total', alvo: 'self',    rodadas: 1,  icone: '🔍',
                       parcial: 'ignora_armadura',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 }] },
  // Debuff: sai da coluna de ataque do adversário.
  resguardar:        { modo: 'total', alvo: 'inimigo', rodadas: 2,  icone: '🛡️',
                       efeitos: [{ tipo: 'mod_ataque', sinal: -1 }] },

  /* ── Defesa ─────────────────────────────────────────────────── */
  defletir_ataque:   { modo: 'total', alvo: 'self',    rodadas: 3,  icone: '↩️',
                       efeitos: [{ tipo: 'mod_defesa', sinal: 1 }] },
  imprevisibilidade: { modo: 'total', alvo: 'self',    rodadas: 3,  icone: '🎲',
                       efeitos: [{ tipo: 'mod_defesa', sinal: 1 }] },
  pressionar_oponente: { modo: 'total', alvo: 'inimigo', rodadas: 3, icone: '⬇️',
                       efeitos: [{ tipo: 'mod_defesa', sinal: -1 }] },

  /* ── Posturas: trade-off entre ataque e defesa ──────────────── */
  postura_defensiva: { modo: 'total', alvo: 'self',    rodadas: 3,  icone: '🐢',
                       efeitos: [{ tipo: 'mod_defesa', sinal: 1 },
                                 { tipo: 'mod_ataque', sinal: -1 }] },
  postura_ofensiva:  { modo: 'total', alvo: 'self',    rodadas: 3,  icone: '⚔️',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 },
                                 { tipo: 'mod_defesa', sinal: -1 }] },

  /* ── Velocidade ─────────────────────────────────────────────────
     mod_vb governa iniciativa, passo do tabuleiro E a ação extra acima
     de 30 (processarViradaDeRodada). Um buff de velocidade portanto faz
     as três coisas — é a mesma regra que as magias de aceleração já
     seguem, e é intencional. */
  atirar_em_movimento: { modo: 'total', alvo: 'self',  rodadas: 2,  icone: '🏃',
                       efeitos: [{ tipo: 'mod_vb', sinal: 1 }] },
  disparo_rapido:    { modo: 'total', alvo: 'self',    rodadas: 5,  icone: '💨',
                       efeitos: [{ tipo: 'mod_vb', sinal: 1 }] },
  expectativa:       { modo: 'total', alvo: 'inimigo', rodadas: 3,  icone: '👁️',
                       efeitos: [{ tipo: 'mod_vb', sinal: -1 }] },
  // "adicionado à iniciativa de 4 alvos" — iniciativa é ordenada por vb.
  voz_de_comando:    { modo: 'total', alvo: 'aliados', rodadas: 10, icone: '📣',
                       maxAlvos: 4,
                       efeitos: [{ tipo: 'mod_vb', sinal: 1 }] },

  /* ── Energia heroica temporária ─────────────────────────────── */
  animosidade:       { modo: 'total', alvo: 'self',    rodadas: 2,  icone: '😠',
                       efeitos: [{ tipo: 'mod_eh_temp', sinal: 1 }] },
  heroismo:          { modo: 'total', alvo: 'self',    rodadas: 5,  icone: '✨',
                       efeitos: [{ tipo: 'mod_eh_temp', sinal: 1 }] },
  segundo_folego:    { modo: 'total', alvo: 'self',    rodadas: 10, icone: '🌬️',
                       efeitos: [{ tipo: 'mod_eh_temp', sinal: 1 }] },

  /* ── Resistências ───────────────────────────────────────────── */
  resistencia_a_dor:   { modo: 'total', alvo: 'self',  rodadas: 5,  icone: '🦾',
                       efeitos: [{ tipo: 'mod_rf', sinal: 1 }] },
  resistencia_extrema: { modo: 'total', alvo: 'self',  rodadas: 5,  icone: '🔮',
                       efeitos: [{ tipo: 'mod_rm', sinal: 1 }] },

  /* ── Dano ───────────────────────────────────────────────────── */
  posicionamento:    { modo: 'total', alvo: 'inimigo', rodadas: 3,  icone: '📍',
                       efeitos: [{ tipo: 'mod_dano_max', sinal: -1 }] },

  /* ── Combinadas ─────────────────────────────────────────────── */
  centaurizar:       { modo: 'total', alvo: 'self',    rodadas: 2,  icone: '🐎',
                       efeitos: [{ tipo: 'mod_ataque', sinal: 1 },
                                 { tipo: 'mod_vb',     sinal: 1 }] },
  furia:             { modo: 'total', alvo: 'self',    rodadas: 5,  icone: '😤',
                       efeitos: [{ tipo: 'mod_ataque',  sinal: 1 },
                                 { tipo: 'mod_eh_temp', sinal: 1 },
                                 { tipo: 'mod_rf',      sinal: 1 },
                                 { tipo: 'mod_rm',      sinal: 1 }] },

  /* ── Única de Família B na Fase 1 ───────────────────────────────
     Entra porque dano_por_rodada já existe pronto (Fase 1.2, veneno).
     Valor FIXO 1, não o total da técnica — o texto diz "1 de dano". */
  sangramento:       { modo: 'teste', alvo: 'inimigo', rodadas: 5,  icone: '🩸',
                       dificuldade: 'dificil',
                       efeitos: [{ tipo: 'dano_por_rodada', valor: 1 }] },
};

// Lookup tolerante: técnica sem entrada devolve null, e o chamador mantém o
// comportamento narrativo de antes da Fase 1. Nunca lança.
function tecnicaEfeitoDe(key) {
  if (!key || typeof key !== 'string') return null;
  return TECNICA_EFEITO_MAP[key] || null;
}

Object.assign(window, { TECNICA_EFEITO_MAP, tecnicaEfeitoDe });
```

- [ ] **Step 4: Registrar o arquivo no bundle**

Em `src/main.tsx`, adicione a linha logo depois de `import './01-core/game-data.jsx'` (linha 25):

```ts
import './01-core/tecnicas-efeito.jsx'
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx vitest run src/01-core/tecnicas-efeito.test.js`
Expected: PASS — 13 testes.

- [ ] **Step 6: Commit**

```bash
git add src/01-core/tecnicas-efeito.jsx src/01-core/tecnicas-efeito.test.js src/main.tsx
git commit -m "feat(batalha): registro de efeito mecanico das tecnicas (Fase 1)"
```

---

## Task 3: `aplicarEfeitoTecnica` — a função que grava o status

O coração da fase. Escrita antes dos consumidores porque os testes deles constroem `status_temp` chamando esta função.

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — inserir depois de `aplicarEfeitoApoio` (que termina em `:1868`); adicionar ao export `MotorBatalha` (`:5813`)
- Create: `src/12-batalha/tecnica-efeitos.test.js`

**Interfaces:**
- Consumes: `tecnicaEfeitoDe(key)` da Task 2
- Produces:
  - `aplicarEfeitoTecnica(participante, tecnica, valorTotal) -> participante` — `tecnica` é `{ key, nome }`; `valorTotal` é o `totalTecnica()` já calculado pelo chamador (a função é pura, não busca atributos). Devolve NOVO objeto; nunca muta.
  - O `status_temp` gerado tem `id: 'tec_' + key` e um item por efeito do registro, todos com o mesmo `id`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/12-batalha/tecnica-efeitos.test.js`:

```js
/* ============================================================
   tecnica-efeitos.test.js — aplicação dos efeitos de técnica
   ============================================================
   Cobre a Task 3 (gravação) e as Tasks 4-7 (consumo e expiração).
   As tasks seguintes ACRESCENTAM describes aqui; não recriar o arquivo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';   // processarViradaDeRodada usa movimentoBase

let M;
beforeAll(() => {
  M = window.MotorBatalha;
  expect(M.aplicarEfeitoTecnica).toBeTypeOf('function');
});

// Participante mínimo no shape que montarSnapshots produz.
function lutador(over = {}) {
  return {
    inst_id: 'i1', tipo: 'pj', ref_id: 1, nome: 'Teste', ordem: 1,
    vb: 10, pa_max: 1, pa_rest: 1,
    eh: 20, eh_max: 20, ar: 5, ar_max: 5, ef: 30, ef_max: 30,
    defesa_valor: 12, rf: 8, rm: 6,
    status: 'ativo', status_temp: [], tecnicas_usadas: [],
    ...over,
  };
}

describe('aplicarEfeitoTecnica — gravação', () => {
  it('modo total grava um status_temp com o valor recebido', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 7);
    expect(p.status_temp).toHaveLength(1);
    const st = p.status_temp[0];
    expect(st.id).toBe('tec_mira');
    expect(st.nome).toBe('Mira');
    expect(st.icone).toBe('🎯');
    expect(st.rodadas_rest).toBe(1);
    expect(st.efeito).toEqual({ tipo: 'mod_ataque', valor: 7 });
  });

  it('não muta o participante recebido', () => {
    const orig = lutador();
    const p = M.aplicarEfeitoTecnica(orig, { key: 'mira', nome: 'Mira' }, 7);
    expect(orig.status_temp).toHaveLength(0);
    expect(p).not.toBe(orig);
  });

  it('sinal negativo vira valor negativo (debuff no adversário)', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'expectativa', nome: 'Expectativa' }, 6);
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'mod_vb', valor: -6 });
  });

  it('Fúria grava os quatro efeitos de uma vez, sob o mesmo id', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.status_temp).toHaveLength(4);
    expect(p.status_temp.every((s) => s.id === 'tec_furia')).toBe(true);
    expect(p.status_temp.map((s) => s.efeito.tipo).sort())
      .toEqual(['mod_ataque', 'mod_eh_temp', 'mod_rf', 'mod_rm'].sort());
    expect(p.status_temp.every((s) => s.efeito.valor === 5)).toBe(true);
  });

  it('Postura Defensiva grava +defesa e −ataque com o mesmo total', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'postura_defensiva', nome: 'Postura Defensiva' }, 4);
    const porTipo = Object.fromEntries(p.status_temp.map((s) => [s.efeito.tipo, s.efeito.valor]));
    expect(porTipo).toEqual({ mod_defesa: 4, mod_ataque: -4 });
  });

  it('modo teste usa o valor FIXO do registro, não o total da técnica', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'sangramento', nome: 'Sangramento' }, 99);
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'dano_por_rodada', valor: 1 });
    expect(p.status_temp[0].rodadas_rest).toBe(5);
  });

  it('copia a restrição de arma do banco para o efeito', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'pugilato', nome: 'Pugilato', grupo_armas: 'CD' }, 3);
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'mod_ataque', valor: 3, grupos: ['CD'] });
  });

  it('quebra a lista CSV do banco em grupos', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'mira', nome: 'Mira', grupo_armas: 'PL, PM, PP' }, 5);
    expect(p.status_temp[0].efeito.grupos).toEqual(['PL', 'PM', 'PP']);
  });

  it('"Livre" e vazio não viram restrição', () => {
    const livre = M.aplicarEfeitoTecnica(
      lutador(), { key: 'furia', nome: 'Fúria', grupo_armas: 'Livre' }, 5);
    expect(livre.status_temp.find((s) => s.efeito.tipo === 'mod_ataque').efeito.grupos)
      .toBeUndefined();
    const vazio = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 5);
    expect(vazio.status_temp[0].efeito.grupos).toBeUndefined();
  });

  it('técnica sem entrada no mapa devolve o participante intacto', () => {
    const orig = lutador();
    expect(M.aplicarEfeitoTecnica(orig, { key: 'golpe_duplo', nome: 'Golpe Duplo' }, 5)).toBe(orig);
  });
});

describe('aplicarEfeitoTecnica — reaplicar NÃO acumula', () => {
  it('a segunda aplicação renova a duração e mantém um único status', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'ajustar_disparo', nome: 'Ajustar Disparo' }, 6);
    p = { ...p, status_temp: p.status_temp.map((s) => ({ ...s, rodadas_rest: 1 })) }; // uma rodada já passou
    p = M.aplicarEfeitoTecnica(p, { key: 'ajustar_disparo', nome: 'Ajustar Disparo' }, 6);
    expect(p.status_temp).toHaveLength(1);
    expect(p.status_temp[0].rodadas_rest).toBe(2);
    expect(p.status_temp[0].efeito.valor).toBe(6);   // 6, não 12
  });

  it('reaplicar com total diferente usa o total NOVO', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 4);
    p = M.aplicarEfeitoTecnica(p, { key: 'mira', nome: 'Mira' }, 9);
    expect(p.status_temp).toHaveLength(1);
    expect(p.status_temp[0].efeito.valor).toBe(9);
  });

  it('reaplicar uma combinada troca os quatro, não vira oito', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    p = M.aplicarEfeitoTecnica(p, { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.status_temp).toHaveLength(4);
  });

  it('técnicas diferentes convivem', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 4);
    p = M.aplicarEfeitoTecnica(p, { key: 'defletir_ataque', nome: 'Defletir Ataque' }, 3);
    expect(p.status_temp).toHaveLength(2);
    expect(p.status_temp.map((s) => s.id).sort()).toEqual(['tec_defletir_ataque', 'tec_mira']);
  });

  // A Falha Crítica e as magias de apoio escrevem no MESMO array.
  it('não pisa em status de outra origem', () => {
    const comFC = lutador({ status_temp: [
      { id: 'fc_defesa', nome: 'Defesa −5', icone: '🛡️', rodadas_rest: null, efeito: { tipo: 'mod_defesa', valor: -5 } },
    ] });
    const p = M.aplicarEfeitoTecnica(comFC, { key: 'mira', nome: 'Mira' }, 4);
    expect(p.status_temp).toHaveLength(2);
    expect(p.status_temp[0].id).toBe('fc_defesa');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-efeitos.test.js`
Expected: FAIL — `expected undefined to be type 'function'` no `beforeAll`.

- [ ] **Step 3: Implementar a função**

Em `src/12-batalha/batalha.jsx`, insira logo depois do fim de `aplicarEfeitoApoio` (linha ~1869, antes do próximo bloco de comentário):

```js
/* ── Efeito de TÉCNICA no status_temp (Fase 1, 09/09/2026) ─────────
   Espelha aplicarEfeitoApoio: só mexe em status_temp, devolve objeto
   novo, não busca nada no banco. O valorTotal chega PRONTO do chamador
   (totalTecnica), pra função continuar pura e testável sem catálogo.

   Uma técnica pode gerar VÁRIOS status (Fúria gera 4). Todos levam o
   mesmo id 'tec_<key>' — é assim que a regra de não-acumular encontra
   e substitui a leva anterior inteira.

   REAPLICAR NÃO ACUMULA (decisão de 09/09/2026): a segunda ativação
   remove a leva antiga e grava outra com a duração cheia. Sem isso,
   ativar Mira cinco vezes somaria 5× o total na mesma coluna. */

/* Lê `grupo_armas`/`grupo_armaduras` do banco (CSV: "PL, PM, PP").
   Devolve null quando não há restrição — 'Livre' e vazio são o mesmo caso.
   Existe porque as duas colunas usam o MESMO formato, e porque o teste
   ingênuo `!col` não pega o 'Livre' (é truthy) — exatamente o bug que a
   Task 7 corrige em tecnicasCompativeisComArma. */
function gruposDeArma(csv) {
  if (!csv) return null;
  const txt = String(csv).trim();
  if (!txt || txt.toLowerCase() === 'livre') return null;
  const lista = txt.split(',').map((s) => s.trim()).filter(Boolean);
  return lista.length ? lista : null;
}

function aplicarEfeitoTecnica(participante, tecnica, valorTotal) {
  const key = tecnica && tecnica.key;
  const reg = (typeof tecnicaEfeitoDe === 'function') ? tecnicaEfeitoDe(key) : null;
  if (!reg) return participante;   // Fase 2 ou narrativa — segue como antes

  const id = 'tec_' + key;
  const anteriores = Array.isArray(participante.status_temp) ? participante.status_temp : [];
  // Tira a leva anterior DESTA técnica (e só dela) antes de gravar a nova.
  const semEsta = anteriores.filter((s) => s.id !== id);

  const novos = reg.efeitos.map((ef) => {
    const efeito = (reg.modo === 'teste')
      ? { tipo: ef.tipo, valor: ef.valor }
      : { tipo: ef.tipo, valor: (ef.sinal || 1) * (Number(valorTotal) || 0) };
    // Restrição de arma: vem de tecnicas.grupo_armas, não do registro.
    // Ativar Mira (PL,PM,PP) com um arco e trocar para espada não deve manter
    // o bônus — por isso a lista viaja NO EFEITO, e somaModAtaque a consulta
    // a cada golpe. 'Livre' e vazio significam "qualquer arma": grupos = null.
    if (ef.tipo === 'mod_ataque') {
      const grupos = gruposDeArma(tecnica.grupo_armas);
      if (grupos) efeito.grupos = grupos;
    }
    return {
      id,
      nome: tecnica.nome || key,
      icone: reg.icone,
      rodadas_rest: reg.rodadas,
      efeito,
    };
  });

  return { ...participante, status_temp: [...semEsta, ...novos] };
}
```

- [ ] **Step 4: Exportar em `MotorBatalha`**

Em `src/12-batalha/batalha.jsx`, no objeto `MotorBatalha` (`:5813`), acrescente na lista, logo depois de `aplicarEfeitoApoio`:

```js
    // Fase 1 das técnicas (09/09/2026): grava o efeito da técnica no
    // status_temp. Reaplicar substitui a leva anterior em vez de somar.
    // gruposDeArma é o parser das colunas grupo_armas/grupo_armaduras.
    aplicarEfeitoTecnica, gruposDeArma,
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx vitest run src/12-batalha/tecnica-efeitos.test.js`
Expected: PASS — 12 testes.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-efeitos.test.js
git commit -m "feat(batalha): aplicarEfeitoTecnica grava efeito de tecnica no status_temp"
```

---

## Task 4: `mod_ataque` na coluna de ataque

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — helper novo perto de `somaEfeitosStatus` (`:1609`); consumo em `AcaoPanel` (`:4186-4200`); export em `MotorBatalha`
- Test: `src/12-batalha/tecnica-efeitos.test.js` (acrescentar describe)

**Interfaces:**
- Consumes: `aplicarEfeitoTecnica` (Task 3), `somaEfeitosStatus` (já existe)
- Produces: `somaModAtaque(participante, grupoArma) -> number`

- [ ] **Step 1: Acrescentar o teste**

Adicione ao fim de `src/12-batalha/tecnica-efeitos.test.js`:

```js
describe('somaModAtaque', () => {
  it('soma o mod_ataque sem grupo para qualquer arma', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 7);
    expect(M.somaModAtaque(p, 'CM')).toBe(7);
    expect(M.somaModAtaque(p, 'PL')).toBe(7);
    expect(M.somaModAtaque(p, null)).toBe(7);
  });

  it('mod_ataque COM restrição só vale para os grupos daquela técnica', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'pugilato', nome: 'Pugilato', grupo_armas: 'CD' }, 3);
    expect(M.somaModAtaque(p, 'CD')).toBe(3);
    expect(M.somaModAtaque(p, 'CM')).toBe(0);
    expect(M.somaModAtaque(p, null)).toBe(0);
  });

  it('vale para qualquer grupo da lista', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'mira', nome: 'Mira', grupo_armas: 'PL, PM, PP' }, 5);
    expect(M.somaModAtaque(p, 'PL')).toBe(5);
    expect(M.somaModAtaque(p, 'PP')).toBe(5);
    expect(M.somaModAtaque(p, 'CM')).toBe(0);
  });

  // O caso que motiva a lista viajar no efeito: ativar com arco, trocar de arma.
  it('trocar para arma fora da lista derruba o bônus sem apagar o status', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'mira', nome: 'Mira', grupo_armas: 'PL, PM, PP' }, 5);
    expect(M.somaModAtaque(p, 'CM')).toBe(0);
    expect(p.status_temp).toHaveLength(1);   // o buff continua correndo
  });

  it('acumula técnicas diferentes na mesma coluna', () => {
    let p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'furia', nome: 'Fúria', grupo_armas: 'Livre' }, 7);
    p = M.aplicarEfeitoTecnica(p, { key: 'pugilato', nome: 'Pugilato', grupo_armas: 'CD' }, 3);
    expect(M.somaModAtaque(p, 'CD')).toBe(10);
    expect(M.somaModAtaque(p, 'CM')).toBe(7);
  });

  it('debuff de Resguardar entra negativo', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'resguardar', nome: 'Resguardar' }, 5);
    expect(M.somaModAtaque(p, 'CM')).toBe(-5);
  });

  it('participante sem status_temp devolve 0', () => {
    expect(M.somaModAtaque(lutador(), 'CM')).toBe(0);
    expect(M.somaModAtaque({}, 'CM')).toBe(0);
  });

  // A separação que justifica a primitiva existir: o −7 da Falha Crítica
  // (mod_coluna) pune TODA ação; o bônus da técnica é só de ataque.
  it('não confunde mod_ataque com o mod_coluna da Falha Crítica', () => {
    const comFC = lutador({ status_temp: [
      { id: 'fc_acoes', nome: 'Ações −7', icone: '🤕', rodadas_rest: null, efeito: { tipo: 'mod_coluna', valor: -7 } },
    ] });
    expect(M.somaModAtaque(comFC, 'CM')).toBe(0);
    expect(M.somaEfeitosStatus(comFC, 'mod_coluna')).toBe(-7);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-efeitos.test.js -t somaModAtaque`
Expected: FAIL — `M.somaModAtaque is not a function`.

- [ ] **Step 3: Implementar o helper**

Em `src/12-batalha/batalha.jsx`, logo depois de `statusTemEfeito` (`:1616`):

```js
/* Soma os mod_ataque válidos para a arma em uso.
   Por que não é só somaEfeitosStatus(p, 'mod_ataque'): a técnica pode estar
   restrita a grupos de arma (Mira só em PL/PM/PP, Pugilato só em CD), e a
   lista viaja no efeito. Ativar com arco e trocar para espada não mantém o
   bônus — o status continua correndo, mas não entra nesta soma. Efeito sem
   `grupos` vale para qualquer arma.

   mod_ataque é DELIBERADAMENTE separado do mod_coluna: o −7 da Falha
   Crítica pune toda ação (arma, magia, habilidade, técnica), enquanto
   "coluna de ataque" das técnicas só toca arma e magia. */
function somaModAtaque(p, grupoArma) {
  if (!p || !Array.isArray(p.status_temp)) return 0;
  return p.status_temp.reduce((s, st) => {
    const ef = st.efeito;
    if (!ef || ef.tipo !== 'mod_ataque') return s;
    if (ef.grupos && !ef.grupos.includes(grupoArma)) return s;
    return s + (ef.valor || 0);
  }, 0);
}
```

Acrescente `somaModAtaque,` ao objeto `MotorBatalha`. Verifique se `somaEfeitosStatus` e `statusTemEfeito` já estão exportados lá; se não estiverem, acrescente também — o teste do Step 1 usa `M.somaEfeitosStatus`.

- [ ] **Step 4: Consumir na coluna**

Em `src/12-batalha/batalha.jsx`, no bloco de cálculo de coluna do `AcaoPanel` (`:4186-4200`), substitua os ramos `arma` e `magia`:

```js
  const modColunaAtor = somaEfeitosStatus(ator, 'mod_coluna');
  let coluna = null, colunaClamped = null, alvoResist = null;
  if (tab === 'arma' && arma && alvo) {
    const alvoEfetivo = { ...alvo, defesa_valor: (alvo.defesa_valor || 0) + somaEfeitosStatus(alvo, 'mod_defesa') };
    // mod_ataque (técnicas, Fase 1) entra SÓ aqui e na magia — teste de
    // habilidade e de técnica não recebem bônus de "coluna de ataque".
    coluna = colunaAtaque(arma, alvoEfetivo)
           + modColunaAtor
           + somaModAtaque(ator, arma.grupo_sigla || arma.grupo || null);
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'magia' && magia) {
    // Magia não tem grupo de arma: só os mod_ataque irrestritos valem.
    coluna = magia.nivel + modColunaAtor + somaModAtaque(ator, null);
    colunaClamped = Math.max(-7, Math.min(50, coluna));
  } else if (tab === 'habilidade' && habilidadeSel && habilidadeSel.total != null) {
```

O restante do `if/else if` fica exatamente como está.

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `npx vitest run src/12-batalha/`
Expected: PASS — inclusive `motor-batalha.test.js` e `card-jogador.test.jsx`, que exercitam a coluna.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-efeitos.test.js
git commit -m "feat(batalha): mod_ataque das tecnicas entra na coluna de arma e magia"
```

---

## Task 5: `mod_rf` / `mod_rm` na resistência e `mod_dano_max` no dano

Duas primitivas de uma vez: as duas são uma soma em um número já calculado, e nenhuma tem lógica própria que justifique task separada.

**Files:**
- Modify: `src/12-batalha/batalha.jsx:4201-4212` (resistência) e `:4219` (dano)
- Test: `src/12-batalha/tecnica-efeitos.test.js`

**Interfaces:**
- Consumes: `somaEfeitosStatus` (já existe), `aplicarEfeitoTecnica` (Task 3)
- Produces: `rfEfetivo(p) -> number`, `rmEfetivo(p) -> number`, `danoComModMax(dano, alvo) -> number`

- [ ] **Step 1: Acrescentar o teste**

Adicione ao fim de `src/12-batalha/tecnica-efeitos.test.js`:

```js
describe('resistências efetivas', () => {
  it('Resistência à Dor sobe a RF e não toca a RM', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'resistencia_a_dor', nome: 'Resistência à Dor' }, 4);
    expect(M.rfEfetivo(p)).toBe(12);   // 8 + 4
    expect(M.rmEfetivo(p)).toBe(6);
  });

  it('Resistência Extrema sobe a RM e não toca a RF', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'resistencia_extrema', nome: 'Resistência Extrema' }, 3);
    expect(M.rmEfetivo(p)).toBe(9);    // 6 + 3
    expect(M.rfEfetivo(p)).toBe(8);
  });

  it('Fúria sobe as duas de uma vez', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(M.rfEfetivo(p)).toBe(13);
    expect(M.rmEfetivo(p)).toBe(11);
  });

  it('sem status, devolve o valor cru do snapshot', () => {
    expect(M.rfEfetivo(lutador())).toBe(8);
    expect(M.rmEfetivo(lutador())).toBe(6);
  });

  // resolverResistencia só aceita 1..20; a efetiva não pode furar o piso.
  it('nunca desce abaixo de 1', () => {
    const p = lutador({ rf: 2, status_temp: [
      { id: 'x', nome: 'x', icone: '🔻', rodadas_rest: 1, efeito: { tipo: 'mod_rf', valor: -10 } },
    ] });
    expect(M.rfEfetivo(p)).toBe(1);
  });
});

describe('danoComModMax', () => {
  it('Posicionamento subtrai o total do dano sofrido pelo alvo', () => {
    const alvo = M.aplicarEfeitoTecnica(lutador(), { key: 'posicionamento', nome: 'Posicionamento' }, 6);
    expect(M.danoComModMax(20, alvo)).toBe(14);
  });

  it('nunca vira cura: piso 0', () => {
    const alvo = M.aplicarEfeitoTecnica(lutador(), { key: 'posicionamento', nome: 'Posicionamento' }, 30);
    expect(M.danoComModMax(5, alvo)).toBe(0);
  });

  it('alvo sem o status recebe o dano cheio', () => {
    expect(M.danoComModMax(20, lutador())).toBe(20);
  });

  it('dano 0 continua 0', () => {
    expect(M.danoComModMax(0, lutador())).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-efeitos.test.js -t "resistências efetivas"`
Expected: FAIL — `M.rfEfetivo is not a function`.

- [ ] **Step 3: Implementar os helpers**

Em `src/12-batalha/batalha.jsx`, logo depois de `vbEfetivo` (`:1620`):

```js
/* RF/RM efetivas: o valor do snapshot mais os mod_rf/mod_rm de técnica.
   Piso 1 porque resolverResistencia só aceita 1..20 — deixar cair a 0
   estouraria o índice da tabela. Não persiste: o rf/rm cru do snapshot
   fica intacto, mesma disciplina de vbEfetivo. */
function rfEfetivo(p) {
  return Math.max(1, (Number(p && p.rf) || 0) + somaEfeitosStatus(p, 'mod_rf'));
}
function rmEfetivo(p) {
  return Math.max(1, (Number(p && p.rm) || 0) + somaEfeitosStatus(p, 'mod_rm'));
}

/* Dano final depois do mod_dano_max do ALVO (Posicionamento).
   Entra DEPOIS de danoNoTier de propósito: a função de tier é espelho do
   Arsenal da Ficha e não deve saber de status de combate. Piso 0 — reduzir
   dano nunca pode virar cura. */
function danoComModMax(dano, alvo) {
  const base = Math.max(0, Math.floor(dano || 0));
  if (base === 0) return 0;
  return Math.max(0, base + somaEfeitosStatus(alvo, 'mod_dano_max'));
}
```

Acrescente `rfEfetivo, rmEfetivo, danoComModMax,` ao objeto `MotorBatalha`.

- [ ] **Step 4: Consumir nos dois pontos do `AcaoPanel`**

Em `src/12-batalha/batalha.jsx`, no ramo `apoio` do cálculo (`:4206`), troque a leitura crua do RF/RM do alvo:

```js
    const fAtk = Math.max(1, Math.min(20, apoioSel.nivel));
    // RF/RM EFETIVAS (Fase 1 das técnicas): Resistência à Dor / Extrema /
    // Fúria sobem estes números enquanto o status durar.
    const fDefBruta = apoioSel.resistencia === 'rm' ? rmEfetivo(alvoApoio) : rfEfetivo(alvoApoio);
    const fDef = Math.max(1, Math.min(20, fDefBruta));
    alvoResist = (typeof resolverResistencia === 'function')
      ? resolverResistencia(fAtk, fDef) : null;
```

E na linha do dano (`:4219`):

```js
  const armaPraDano = tab === 'magia' ? magia : arma;        // o objeto cujo `dano` será multiplicado pelo tier
  const danoBruto = (tab === 'arma' || tab === 'magia') && res && !res.erra ? danoNoTier(armaPraDano, res.codigo) : 0;
  // Posicionamento (mod_dano_max no alvo) corta o dano depois do tier.
  const dano = danoComModMax(danoBruto, alvo);
```

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `npx vitest run src/12-batalha/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-efeitos.test.js
git commit -m "feat(batalha): mod_rf/mod_rm na resistencia e mod_dano_max no dano"
```

---

## Task 6: `mod_eh_temp` — aplicar e expirar

A única primitiva que muda o snapshot, e por isso a única que precisa de tratamento na virada de rodada.

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `aplicarEfeitoTecnica` (Task 3) e `processarViradaDeRodada` (`:1667-1700`)
- Test: `src/12-batalha/tecnica-efeitos.test.js`

**Interfaces:**
- Consumes: `aplicarEfeitoTecnica` (Task 3), `decrementarStatusTemp` e `statusPorPools` (já existem)
- Produces: `expirarEhTemp(participante) -> participante` — devolve o `eh_max` emprestado dos status que acabaram de sair. Chamada por `processarViradaDeRodada`.

- [ ] **Step 1: Acrescentar o teste**

Adicione ao fim de `src/12-batalha/tecnica-efeitos.test.js`:

```js
describe('mod_eh_temp — EH temporária por cima do teto', () => {
  it('a aplicação sobe eh E eh_max', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    expect(p.eh).toBe(32);       // 20 + 12
    expect(p.eh_max).toBe(32);
  });

  it('reaplicar não empilha o empréstimo', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    p = M.aplicarEfeitoTecnica(p, { key: 'heroismo', nome: 'Heroísmo' }, 12);
    expect(p.eh_max).toBe(32);   // 32, não 44
    expect(p.status_temp).toHaveLength(1);
  });

  it('Fúria empresta EH junto com os outros três efeitos', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.eh).toBe(25);
    expect(p.eh_max).toBe(25);
  });

  it('na expiração devolve o teto e o valor não gasto', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'animosidade', nome: 'Animosidade' }, 10);
    // status já expirado (rodadas_rest 0) — é o que decrementarStatusTemp deixa
    const expirando = { ...p, status_temp: p.status_temp.map((s) => ({ ...s, rodadas_rest: 0 })) };
    const fim = M.expirarEhTemp(expirando);
    expect(fim.eh_max).toBe(20);
    expect(fim.eh).toBe(20);
  });

  // A regra que evita punir duas vezes quem levou dano durante o buff.
  it('quem gastou o bônus não fica com EH negativa nem perde EH própria', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'animosidade', nome: 'Animosidade' }, 10);
    const machucado = { ...p, eh: 4, status_temp: p.status_temp.map((s) => ({ ...s, rodadas_rest: 0 })) };
    const fim = M.expirarEhTemp(machucado);
    expect(fim.eh_max).toBe(20);
    expect(fim.eh).toBe(4);      // não vira -6
  });

  it('EH acima do teto restaurado é aparada até ele', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'animosidade', nome: 'Animosidade' }, 10);
    const cheio = { ...p, eh: 30, status_temp: p.status_temp.map((s) => ({ ...s, rodadas_rest: 0 })) };
    const fim = M.expirarEhTemp(cheio);
    expect(fim.eh_max).toBe(20);
    expect(fim.eh).toBe(20);
  });

  it('status ainda vivo não devolve nada', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    expect(M.expirarEhTemp(p)).toBe(p);
  });
});

describe('mod_eh_temp na virada de rodada', () => {
  it('a EH emprestada some sozinha quando a duração acaba', () => {
    // Animosidade dura 2 rodadas: sobrevive à 1ª virada, morre na 2ª.
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'animosidade', nome: 'Animosidade' }, 10);
    expect(p.eh_max).toBe(30);

    p = M.processarViradaDeRodada(p).participante || M.processarViradaDeRodada(p);
    p = p.participante || p;
    expect(p.eh_max, 'sobrevive à primeira virada').toBe(30);

    p = M.processarViradaDeRodada(p);
    p = p.participante || p;
    expect(p.eh_max, 'expira na segunda virada').toBe(20);
    expect(p.status_temp).toHaveLength(0);
  });
});
```

> **Nota para quem implementa:** confirme a assinatura de retorno de `processarViradaDeRodada` lendo `batalha.jsx:1667` antes de rodar — ela devolve `{ participante, eventos, total }`. Ajuste o teste acima para desestruturar direto (`const { participante } = M.processarViradaDeRodada(p)`) e remova os `|| p` defensivos; eles estão ali só para o caso de a assinatura ter mudado.

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-efeitos.test.js -t mod_eh_temp`
Expected: FAIL — `expected 20 to be 32` (a aplicação ainda não mexe nas pools).

- [ ] **Step 3: Fazer `aplicarEfeitoTecnica` mexer nas pools**

Em `src/12-batalha/batalha.jsx`, dentro de `aplicarEfeitoTecnica` (Task 3), troque o `return` final por:

```js
  let resultado = { ...participante, status_temp: [...semEsta, ...novos] };

  // mod_eh_temp é o ÚNICO efeito que muda o snapshot em vez de ser lido
  // on-the-fly: EH é pool com teto, e o combate clampa em eh_max. Emprestar
  // exige subir os dois. A devolução mora em expirarEhTemp.
  // Como a leva anterior foi removida acima, o empréstimo velho tem que ser
  // devolvido ANTES de emprestar de novo — senão reaplicar Heroísmo empilha.
  const devolverAntigo = anteriores
    .filter((s) => s.id === id && s.efeito && s.efeito.tipo === 'mod_eh_temp')
    .reduce((soma, s) => soma + (s.efeito.valor || 0), 0);
  const emprestarNovo = novos
    .filter((s) => s.efeito.tipo === 'mod_eh_temp')
    .reduce((soma, s) => soma + (s.efeito.valor || 0), 0);
  const delta = emprestarNovo - devolverAntigo;
  if (delta !== 0) {
    const ehMax = Math.max(0, (Number(resultado.eh_max) || 0) + delta);
    resultado = {
      ...resultado,
      eh_max: ehMax,
      eh: Math.max(0, Math.min(ehMax, (Number(resultado.eh) || 0) + delta)),
    };
  }
  return resultado;
```

- [ ] **Step 4: Implementar `expirarEhTemp` e ligar na virada**

Em `src/12-batalha/batalha.jsx`, logo antes de `processarViradaDeRodada` (`:1667`):

```js
/* Devolve a EH emprestada pelos mod_eh_temp que acabaram de expirar.
   Roda DEPOIS do dano por rodada e ANTES do decremento, olhando quem já
   está em rodadas_rest 0 — é a última janela em que o status ainda existe
   para dizer quanto emprestou.

   O eh é aparado no teto novo, com piso 0: quem gastou o bônus durante o
   buff não é punido de novo na devolução. */
function expirarEhTemp(p) {
  if (!p || !Array.isArray(p.status_temp)) return p;
  const devolver = p.status_temp
    .filter((s) => s.efeito && s.efeito.tipo === 'mod_eh_temp' && s.rodadas_rest === 0)
    .reduce((soma, s) => soma + (s.efeito.valor || 0), 0);
  if (devolver === 0) return p;
  const ehMax = Math.max(0, (Number(p.eh_max) || 0) - devolver);
  return { ...p, eh_max: ehMax, eh: Math.max(0, Math.min(ehMax, Number(p.eh) || 0)) };
}
```

Dentro de `processarViradaDeRodada`, imediatamente antes do bloco `if (Array.isArray(next.status_temp) && next.status_temp.length)`:

```js
  // Devolve a EH emprestada por técnica antes do decremento zerar o status.
  next = expirarEhTemp(next);
  // Perder EH emprestada pode derrubar: statusPorPools decide.
  next = statusPorPools(next);
```

Acrescente `expirarEhTemp,` ao objeto `MotorBatalha`.

> **Cuidado com a ordem:** `decrementarStatusTemp` leva `rodadas_rest` de 1 para 0 e remove os que chegam a 0. `expirarEhTemp` precisa rodar em quem JÁ está em 0. Se o decremento remove o item no mesmo passo em que ele chega a 0, leia `decrementarStatusTemp` (`batalha.jsx:1693`) e ajuste: ou `expirarEhTemp` roda depois do decremento sobre a lista removida, ou o decremento passa a deixar o item um tick em 0. Escolha a que não muda o comportamento dos status da Falha Crítica, e cubra com o teste "expira na segunda virada".

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `npx vitest run src/12-batalha/`
Expected: PASS — atenção especial a `motor-batalha.test.js`, que já cobre a virada de rodada.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-efeitos.test.js
git commit -m "feat(batalha): EH temporaria de tecnica sobe o teto e devolve ao expirar"
```

---

## Task 7: Restrição por arma e armadura

Correção do usuário em 09/09/2026: os dados de restrição já existem nas colunas
`grupo_armas` e `grupo_armaduras`. Esta task os transforma em regra, e corrige
dois defeitos encontrados no caminho.

**Files:**
- Create: `scripts/sql/tecnicas-grupo-armas-fix.sql`
- Modify: `src/12-batalha/batalha.jsx` — `tecnicasDoAtor` (`:684-698`), `tecnicasCompativeisComArma` (`:706-718`), export
- Test: `src/12-batalha/tecnica-efeitos.test.js`

**Interfaces:**
- Consumes: `gruposDeArma` (Task 3)
- Produces: `tecnicaPermitida(tecnica, ator, arma) -> { pode: boolean, motivo: 'arma'|'armadura'|null }`

- [ ] **Step 1: Corrigir o dado corrompido**

`resistencia_extrema.grupo_armas` está com `'Intermitente'` — valor da coluna
`uso` que vazou num import. As técnicas irmãs (Fúria, Heroísmo, Resistência à
Dor, Animosidade) são todas `'Livre'`, e o `uso` da própria Resistência Extrema
já é `'Único'`. Crie `scripts/sql/tecnicas-grupo-armas-fix.sql`:

```sql
-- ============================================================
-- resistencia_extrema.grupo_armas = 'Intermitente'  (achado 09/09/2026)
-- ============================================================
-- O valor da coluna `uso` vazou para `grupo_armas` em algum import. Nenhum
-- grupo de armas se chama 'Intermitente', então com a restrição virando
-- regra (Fase 1 das técnicas) a Resistência Extrema ficaria impossível de
-- ativar com qualquer arma.
--
-- 'Livre' é o valor das irmãs de mesma natureza (buff de resistência sem
-- exigência de empunhadura): furia, heroismo, resistencia_a_dor,
-- animosidade, segundo_folego.
-- ============================================================

begin;

update tecnicas
   set grupo_armas = 'Livre'
 where key = 'resistencia_extrema'
   and grupo_armas = 'Intermitente';

-- Esperado: 1 linha, grupo_armas 'Livre', uso 'Único'.
select key, uso, grupo_armas, grupo_armaduras
  from tecnicas
 where key = 'resistencia_extrema';

-- Nenhuma outra técnica deve ter um `uso` na coluna de armas.
-- Esperado: 0 linhas.
select key, uso, grupo_armas
  from tecnicas
 where grupo_armas in ('Único', 'Intermitente', 'Livre ')
    or grupo_armas = uso;

commit;   -- troque por  rollback;  se algo não fechar
```

Rode o script pelo MCP do Supabase (ou pelo SQL Editor) e confira as duas
saídas antes do commit.

- [ ] **Step 2: Escrever o teste que falha**

Adicione ao fim de `src/12-batalha/tecnica-efeitos.test.js`:

```js
describe('gruposDeArma — parser das colunas do banco', () => {
  it('quebra o CSV em lista', () => {
    expect(M.gruposDeArma('PL, PM, PP')).toEqual(['PL', 'PM', 'PP']);
    expect(M.gruposDeArma('CD')).toEqual(['CD']);
    expect(M.gruposDeArma('L, M')).toEqual(['L', 'M']);
  });

  // O bug que este parser existe pra não repetir: 'Livre' é truthy, então
  // `!col` não o pega, e tecnicasCompativeisComArma escondia 31 técnicas.
  it('"Livre" significa sem restrição, não um grupo chamado Livre', () => {
    expect(M.gruposDeArma('Livre')).toBeNull();
    expect(M.gruposDeArma('livre')).toBeNull();
    expect(M.gruposDeArma('  Livre  ')).toBeNull();
  });

  it('vazio, null e undefined também são sem restrição', () => {
    expect(M.gruposDeArma('')).toBeNull();
    expect(M.gruposDeArma(null)).toBeNull();
    expect(M.gruposDeArma(undefined)).toBeNull();
  });
});

describe('tecnicaPermitida', () => {
  const arco    = { slug: 'arco-curto', grupo_sigla: 'PL' };
  const espada  = { slug: 'espada-longa', grupo_sigla: 'CM' };
  const leve    = lutador({ defesa_sigla: 'L' });
  const pesada  = lutador({ defesa_sigla: 'P' });

  it('libera técnica Livre/Livre com qualquer arma e armadura', () => {
    const t = { key: 'furia', grupo_armas: 'Livre', grupo_armaduras: 'Livre' };
    expect(M.tecnicaPermitida(t, pesada, espada)).toEqual({ pode: true, motivo: null });
  });

  it('bloqueia por arma fora do grupo', () => {
    const t = { key: 'mira', grupo_armas: 'PL, PM, PP', grupo_armaduras: 'Livre' };
    expect(M.tecnicaPermitida(t, leve, arco).pode).toBe(true);
    expect(M.tecnicaPermitida(t, leve, espada)).toEqual({ pode: false, motivo: 'arma' });
  });

  it('bloqueia por armadura fora do grupo', () => {
    // Posicionamento exige armadura L.
    const t = { key: 'posicionamento', grupo_armas: 'Livre', grupo_armaduras: 'L' };
    expect(M.tecnicaPermitida(t, leve, espada).pode).toBe(true);
    expect(M.tecnicaPermitida(t, pesada, espada)).toEqual({ pode: false, motivo: 'armadura' });
  });

  it('Postura Defensiva exige armadura média ou pesada', () => {
    const t = { key: 'postura_defensiva', grupo_armas: 'Livre', grupo_armaduras: 'M, P' };
    expect(M.tecnicaPermitida(t, pesada, espada).pode).toBe(true);
    expect(M.tecnicaPermitida(t, leve, espada)).toEqual({ pode: false, motivo: 'armadura' });
  });

  it('a arma é checada antes da armadura quando as duas falham', () => {
    const t = { key: 'x', grupo_armas: 'CD', grupo_armaduras: 'L' };
    expect(M.tecnicaPermitida(t, pesada, espada)).toEqual({ pode: false, motivo: 'arma' });
  });

  // Técnica de buff puro é ativada sem arma selecionada na aba.
  it('sem arma, só a restrição de armadura vale', () => {
    const livre = { key: 'furia', grupo_armas: 'Livre', grupo_armaduras: 'Livre' };
    expect(M.tecnicaPermitida(livre, leve, null).pode).toBe(true);
    const exigeArma = { key: 'mira', grupo_armas: 'PL, PM, PP', grupo_armaduras: 'Livre' };
    expect(M.tecnicaPermitida(exigeArma, leve, null)).toEqual({ pode: false, motivo: 'arma' });
  });
});

describe('tecnicasCompativeisComArma — regressão do "Livre"', () => {
  const catalogos = { catalogoBySlug: { 'espada-longa': { grupo: 'CM' } } };
  const espada = { slug: 'espada-longa', grupo_sigla: 'CM' };

  // 31 das 58 técnicas têm grupo_armas 'Livre' e sumiam do dropdown do ataque.
  it('técnica "Livre" aparece para qualquer arma', () => {
    const lista = [{ key: 'furia', grupo_armas: 'Livre' }];
    expect(window.tecnicasCompativeisComArma(lista, espada, catalogos)).toHaveLength(1);
  });

  it('técnica específica continua filtrada', () => {
    const lista = [{ key: 'mira', grupo_armas: 'PL, PM, PP' }];
    expect(window.tecnicasCompativeisComArma(lista, espada, catalogos)).toHaveLength(0);
  });

  it('sem arma, sobram as sem restrição', () => {
    const lista = [{ key: 'furia', grupo_armas: 'Livre' }, { key: 'mira', grupo_armas: 'PL, PM' }];
    const r = window.tecnicasCompativeisComArma(lista, null, catalogos);
    expect(r.map((t) => t.key)).toEqual(['furia']);
  });
});
```

> Se `tecnicasCompativeisComArma` não estiver em `window`, acrescente-a ao
> `Object.assign(window, {...})` de `batalha.jsx` junto com o resto desta task.

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-efeitos.test.js -t "Livre"`
Expected: FAIL — `gruposDeArma` passa (veio da Task 3), mas
`tecnicaPermitida is not a function` e a regressão do dropdown falha com
`expected length 0 to be 1`.

- [ ] **Step 4: Corrigir `tecnicasCompativeisComArma`**

Em `src/12-batalha/batalha.jsx`, substitua o corpo do filtro (`:706-718`):

```js
/* ── Filtra técnicas compatíveis com a arma equipada ──────────── */
/* Regra: técnica com `grupo_armas` específico (ex.: "CM") só       */
/* aparece para armas daquele grupo. 'Livre', vazio e null são      */
/* genéricas e aparecem para todas.                                 */
/* 09/09/2026 — 'Livre' NÃO era tratado: o teste era `!t.grupo_armas`,
   e 'Livre' é truthy, então caía no includes e as 31 técnicas
   genéricas (mais da metade da tabela) sumiam do dropdown. Agora a
   normalização passa por gruposDeArma, que devolve null para 'Livre'. */
function tecnicasCompativeisComArma(tecnicas, arma, catalogos) {
  if (!Array.isArray(tecnicas) || tecnicas.length === 0) return [];
  const semRestricao = (t) => gruposDeArma(t.grupo_armas) === null;
  if (!arma || !arma.slug || !catalogos || !catalogos.catalogoBySlug) {
    return tecnicas.filter(semRestricao);
  }
  const cat = catalogos.catalogoBySlug[arma.slug];
  const grupoArma = arma.grupo_sigla || (cat && cat.grupo) || null;
  return tecnicas.filter((t) => {
    const grupos = gruposDeArma(t.grupo_armas);
    if (!grupos) return true;              // genérica
    if (!grupoArma) return false;          // arma sem grupo → não casa específica
    return grupos.includes(grupoArma);
  });
}
```

> Leia o corpo atual antes de substituir: a linha que deriva `grupoArma` do
> catálogo pode estar escrita de outro jeito. Preserve a derivação existente e
> troque apenas a lógica de filtro.

- [ ] **Step 5: Implementar `tecnicaPermitida` e levar `grupo_armaduras` adiante**

Em `src/12-batalha/batalha.jsx`, logo depois de `tecnicasCompativeisComArma`:

```js
/* A técnica pode ser ATIVADA com o equipamento atual?
   Duas portas, as duas vindas do banco:
     grupo_armas      → a arma empunhada (grupo_sigla do ataque)
     grupo_armaduras  → a armadura vestida (defesa_sigla do snapshot, L/M/P)
   'Livre' libera. A arma é checada primeiro porque é a restrição que o
   jogador resolve trocando de item na hora.

   grupo_armaduras nunca tinha virado regra em lugar nenhum até 09/09/2026 —
   só era exibido no bestiário e na ficha. */
function tecnicaPermitida(tecnica, ator, arma) {
  const gArmas = gruposDeArma(tecnica && tecnica.grupo_armas);
  if (gArmas) {
    const grupoArma = arma ? (arma.grupo_sigla || arma.grupo || null) : null;
    if (!grupoArma || !gArmas.includes(grupoArma)) return { pode: false, motivo: 'arma' };
  }
  const gArmaduras = gruposDeArma(tecnica && tecnica.grupo_armaduras);
  if (gArmaduras) {
    const sigla = ((ator && ator.defesa_sigla) || 'L').toUpperCase();
    if (!gArmaduras.includes(sigla)) return { pode: false, motivo: 'armadura' };
  }
  return { pode: true, motivo: null };
}
```

Em `tecnicasDoAtor` (`:691-697`), acrescente a coluna que faltava ao objeto
construído — hoje só `grupo_armas` viaja:

```js
      uso: t.uso || null,
      grupo_armas: t.grupo_armas || null,
      // 09/09/2026: grupo_armaduras passou a ser regra (tecnicaPermitida).
      grupo_armaduras: t.grupo_armaduras || null,
      efeito: t.efeito || null,
```

Acrescente `tecnicaPermitida, tecnicasCompativeisComArma,` ao objeto
`MotorBatalha`.

- [ ] **Step 6: Rodar os testes e ver passar**

Run: `npx vitest run src/12-batalha/`
Expected: PASS. Atenção a `wizard-layout.test.jsx:208`, que monta uma técnica
com `grupo_armas: ''` e `grupo_armaduras: null` — os dois viram `null` no
parser, então deve continuar verde.

- [ ] **Step 7: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-efeitos.test.js scripts/sql/tecnicas-grupo-armas-fix.sql
git commit -m "fix(batalha): grupo_armas 'Livre' escondia 31 tecnicas; grupo_armaduras vira regra"
```

---

## Task 8: Ativação na aba Técnica

A última: liga tudo na UI e nos dois `aplicarTeste`.

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `AcaoPanel` (`:4179`, `:4376-4390`, `:4596-4620`, `:4803`, `:4859`), `aplicarTeste` do Mestre (`:2428`), `aplicarTeste` do Jogador (`:5291`)
- Test: `src/12-batalha/tecnica-efeitos.test.js`

**Interfaces:**
- Consumes: `aplicarEfeitoTecnica` (Task 3), `tecnicaEfeitoDe` (Task 2), `tecnicaPermitida` (Task 7)
- Produces: `podeUsarTecnica(participante, tecnica) -> { pode: boolean, motivo: string|null }` — `motivo` é `'ja_usada'` quando `uso === 'Único'` e a key já está em `participante.tecnicas_usadas`. Os motivos `'arma'` e `'armadura'` vêm de `tecnicaPermitida`; a UI trata os três no mesmo lugar.

- [ ] **Step 1: Acrescentar o teste**

Adicione ao fim de `src/12-batalha/tecnica-efeitos.test.js`:

```js
describe('podeUsarTecnica — uso Único', () => {
  it('libera técnica Intermitente já usada', () => {
    const p = lutador({ tecnicas_usadas: ['mira'] });
    expect(M.podeUsarTecnica(p, { key: 'mira', uso: 'Intermitente' }))
      .toEqual({ pode: true, motivo: null });
  });

  it('libera técnica Livre já usada', () => {
    const p = lutador({ tecnicas_usadas: ['resguardar'] });
    expect(M.podeUsarTecnica(p, { key: 'resguardar', uso: 'Livre' }).pode).toBe(true);
  });

  it('bloqueia técnica Única já usada nesta batalha', () => {
    const p = lutador({ tecnicas_usadas: ['furia'] });
    expect(M.podeUsarTecnica(p, { key: 'furia', uso: 'Único' }))
      .toEqual({ pode: false, motivo: 'ja_usada' });
  });

  it('libera técnica Única ainda não usada', () => {
    expect(M.podeUsarTecnica(lutador(), { key: 'furia', uso: 'Único' }).pode).toBe(true);
  });

  it('participante sem tecnicas_usadas não quebra', () => {
    expect(M.podeUsarTecnica({}, { key: 'furia', uso: 'Único' }).pode).toBe(true);
  });
});

describe('registro de uso', () => {
  it('aplicarEfeitoTecnica anota a key em tecnicas_usadas', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.tecnicas_usadas).toContain('furia');
  });

  it('não duplica a key ao reaplicar', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 4);
    p = M.aplicarEfeitoTecnica(p, { key: 'mira', nome: 'Mira' }, 4);
    expect(p.tecnicas_usadas.filter((k) => k === 'mira')).toHaveLength(1);
  });

  // O uso é do ATOR; o efeito pode cair só no alvo (Voz de Comando,
  // Pressionar Oponente). Por isso marcarTecnicaUsada é chamada à parte.
  it('marcarTecnicaUsada anota sem tocar em status_temp', () => {
    const p = M.marcarTecnicaUsada(lutador(), 'voz_de_comando');
    expect(p.tecnicas_usadas).toEqual(['voz_de_comando']);
    expect(p.status_temp).toHaveLength(0);
  });

  it('marcarTecnicaUsada é idempotente e devolve o mesmo objeto se nada muda', () => {
    const p = M.marcarTecnicaUsada(lutador(), 'furia');
    expect(M.marcarTecnicaUsada(p, 'furia')).toBe(p);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-efeitos.test.js -t podeUsarTecnica`
Expected: FAIL — `M.podeUsarTecnica is not a function`.

- [ ] **Step 3: Implementar `podeUsarTecnica` e o registro de uso**

Em `src/12-batalha/batalha.jsx`, logo depois de `aplicarEfeitoTecnica`:

```js
/* `uso: 'Único'` significa uma vez por batalha (decisão de 09/09/2026).
   'Intermitente' e 'Livre' ficam sem limite — reaplicar só renova a duração,
   sem somar, o que já tira o incentivo de spammar. */
function podeUsarTecnica(p, tecnica) {
  const usadas = (p && Array.isArray(p.tecnicas_usadas)) ? p.tecnicas_usadas : [];
  if (tecnica && tecnica.uso === 'Único' && usadas.includes(tecnica.key)) {
    return { pode: false, motivo: 'ja_usada' };
  }
  return { pode: true, motivo: null };
}

/* Anota a técnica como usada nesta batalha. Separada de aplicarEfeitoTecnica
   porque o uso é sempre do ATOR, enquanto o efeito pode cair só nos alvos
   (Voz de Comando, Pressionar Oponente): os dois não andam no mesmo
   participante. Idempotente. */
function marcarTecnicaUsada(p, key) {
  if (!p || !key) return p;
  const usadas = Array.isArray(p.tecnicas_usadas) ? p.tecnicas_usadas : [];
  if (usadas.includes(key)) return p;
  return { ...p, tecnicas_usadas: [...usadas, key] };
}
```

E dentro de `aplicarEfeitoTecnica`, troque o `return resultado` final por:

```js
  return marcarTecnicaUsada(resultado, key);
```

Acrescente `podeUsarTecnica, marcarTecnicaUsada,` ao objeto `MotorBatalha`.

- [ ] **Step 4: Garantir `tecnicas_usadas` no snapshot**

Em `montarSnapshots` (`batalha.jsx:880` para PJ e `:917` para criatura), acrescente `tecnicas_usadas: []` ao lado do `status_temp: []` já existente, nos dois pontos. Batalhas antigas não têm o campo — por isso `podeUsarTecnica` e `aplicarEfeitoTecnica` tratam `undefined` como lista vazia.

- [ ] **Step 5: Ligar na UI da aba Técnica**

Em `AcaoPanel`:

1. Depois de `const tecnicaTesteSel = ...` (`:4179`), acrescente:

```js
  // Fase 1 (09/09/2026): a aba Técnica passou a APLICAR efeito, não só rolar.
  const tecRegistro = tecnicaTesteSel ? tecnicaEfeitoDe(tecnicaTesteSel.key) : null;
  const tecPrecisaAlvo = !!tecRegistro && tecRegistro.alvo !== 'self';
  // Duas portas de bloqueio: uso Único já gasto, e equipamento incompatível
  // (grupo_armas / grupo_armaduras, Task 7). A de equipamento vem primeiro
  // porque o jogador resolve trocando de item.
  const tecEquip = tecnicaTesteSel
    ? tecnicaPermitida(tecnicaTesteSel, ator, arma) : { pode: true, motivo: null };
  const tecUso = tecnicaTesteSel
    ? podeUsarTecnica(ator, tecnicaTesteSel) : { pode: true, motivo: null };
  const tecBloqueio = !tecEquip.pode ? tecEquip : tecUso;
  // modo 'total' não rola dado: o valor é o total da técnica, direto.
  const tecSemDado = !!tecRegistro && tecRegistro.modo === 'total';
  // 'aliados' (só Voz de Comando: até 4) precisa de multisseleção; as outras
  // reusam o `alvo` único que a aba de arma já tem.
  const tecMultiAlvo = !!tecRegistro && tecRegistro.alvo === 'aliados';
  const [tecAliados, setTecAliados] = useState([]);   // inst_id[] dos escolhidos
  const tecAliadosOpcoes = useMemo(
    () => (tecMultiAlvo ? participantes.filter((p) => p.status === 'ativo') : []),
    [tecMultiAlvo, participantes]
  );
  const tecAlvosEscolhidos = tecMultiAlvo
    ? tecAliadosOpcoes.filter((p) => tecAliados.includes(p.inst_id))
    : (tecPrecisaAlvo && alvo ? [alvo] : []);
  const tecMultiCheio = tecMultiAlvo && tecAliados.length >= (tecRegistro.maxAlvos || 1);
```

2. Em `semCard` (`:4803`), a aba Técnica passa a mostrar o card do alvo quando precisar de um alvo ÚNICO (a multisseleção tem UI própria, item 6):

```js
        semCard={tab === 'habilidade'
          || (tab === 'tecnica_teste' && (!tecPrecisaAlvo || tecMultiAlvo))}
```

3. Na guarda do botão de confirmar (`:4859`), some o bloqueio, a exigência de alvo e a de ao menos um aliado marcado:

```js
                : tab === 'tecnica_teste' ? (!tecnicaTesteSel || !tecBloqueio.pode
                    || (tecPrecisaAlvo && tecAlvosEscolhidos.length === 0))
```

6. Multisseleção de aliados, renderizada dentro do bloco da aba Técnica, logo depois do dropdown de técnica, só quando `tecMultiAlvo`:

```jsx
            {tecMultiAlvo && (
              <div className="acao-aliados">
                <span className="acao-aliados-lbl">
                  {isEn
                    ? `Allies (${tecAliados.length}/${tecRegistro.maxAlvos})`
                    : `Aliados (${tecAliados.length}/${tecRegistro.maxAlvos})`}
                </span>
                {tecAliadosOpcoes.map((p) => {
                  const marcado = tecAliados.includes(p.inst_id);
                  return (
                    <label key={p.inst_id} className={'acao-aliado' + (marcado ? ' on' : '')}>
                      <input
                        type="checkbox"
                        checked={marcado}
                        // Teto de maxAlvos: quem não está marcado trava quando lota.
                        disabled={!marcado && tecMultiCheio}
                        onChange={() => setTecAliados((atual) => (
                          marcado ? atual.filter((id) => id !== p.inst_id) : [...atual, p.inst_id]
                        ))}
                      />
                      {p.nome}
                    </label>
                  );
                })}
              </div>
            )}
```

7. Zere a seleção ao trocar de técnica ou de aba, senão os marcados sobrevivem para a técnica seguinte. No `useEffect` que já reage a `tab` (`:4102`), acrescente `setTecAliados([])`, e adicione `tecTesteKey` às dependências dele.

4. No bloco de exibição do efeito da técnica (`:4613`), acrescente o aviso de bloqueio logo abaixo do texto:

```jsx
            {tecnicaTesteSel && tecnicaTesteSel.efeito && (
              <p className="acao-efeito-texto">{tecnicaTesteSel.efeito}</p>
            )}
            {!tecBloqueio.pode && (
              <p className="acao-efeito-texto acao-efeito-bloqueio">
                {tecBloqueio.motivo === 'arma'
                  ? (isEn
                      ? `Requires a weapon of group: ${tecnicaTesteSel.grupo_armas}.`
                      : `Exige arma do grupo: ${tecnicaTesteSel.grupo_armas}.`)
                  : tecBloqueio.motivo === 'armadura'
                  ? (isEn
                      ? `Requires armor of group: ${tecnicaTesteSel.grupo_armaduras}.`
                      : `Exige armadura do grupo: ${tecnicaTesteSel.grupo_armaduras}.`)
                  : (isEn
                      ? 'Already used this battle (single use).'
                      : 'Já usada nesta batalha (uso Único).')}
              </p>
            )}
            {tecRegistro && tecRegistro.parcial === 'ignora_armadura' && (
              <p className="acao-efeito-texto acao-efeito-parcial">
                {isEn
                  ? 'Armor-ignoring half is not automated yet — apply it manually.'
                  : 'A metade que ignora a armadura ainda não é automática — aplique na mão.'}
              </p>
            )}
```

5. No `onConfirm` da aba (`:4376`), o payload de teste ganha o alvo e o registro:

```js
    } else if (tab === 'tecnica_teste' && tecnicaTesteSel) {
      onAplicarTeste({
        tipo_teste: 'tecnica',
        testador: ator,
        chave: tecnicaTesteSel.key,
        nome:  tecnicaTesteSel.nome,
        // Fase 1: o que o motor precisa pra aplicar o efeito.
        // alvos_efeito é SEMPRE lista — 'self' manda vazia (o motor usa o
        // testador), 'inimigo' manda um, 'aliados' manda até maxAlvos.
        tecnica: tecnicaTesteSel,
        alvos_efeito: tecAlvosEscolhidos,
        valor_total: tecnicaTesteSel.total,
        sem_dado: tecSemDado,
```

O restante do payload (`coluna`, `d20`, `resultado`) fica como está.

- [ ] **Step 6: Aplicar o efeito nos dois `aplicarTeste`**

Nas DUAS cópias — Mestre (`:2428`) e Jogador (`:5291`) — depois do bloco que debita o PA e antes de montar o log, insira o mesmo trecho:

```js
    // Fase 1 das técnicas: aplica o efeito mecânico.
    //   modo 'total' → aplica sempre (não há dado).
    //   modo 'teste' → só no sucesso (o resultado já veio resolvido no payload).
    // Aparece nas DUAS cópias de aplicarTeste porque o Mestre e o Jogador têm
    // handlers separados; a REGRA mora em aplicarEfeitoTecnica, aqui é só a
    // chamada. Ver batalha.jsx:5517 pro precedente de cópia dessincronizada.
    let efeitoTecnicaAplicado = null;
    if (tipo_teste === 'tecnica' && payload.tecnica) {
      const reg = tecnicaEfeitoDe(payload.tecnica.key);
      const passou = payload.sem_dado
        || (payload.resultado && payload.resultado.q >= D20_QUALIDADE_MINIMA[reg && reg.dificuldade]);
      if (reg && passou) {
        // Lista vazia = alvo é o próprio testador ('self').
        const destinos = (payload.alvos_efeito && payload.alvos_efeito.length)
          ? payload.alvos_efeito.slice(0, reg.maxAlvos || payload.alvos_efeito.length)
          : [next[testIdx]];
        const atingidos = [];
        destinos.forEach((destino) => {
          const dIdx = next.findIndex((p) => mesmoParticipante(p, destino));
          if (dIdx < 0) return;
          next[dIdx] = aplicarEfeitoTecnica(next[dIdx], payload.tecnica, payload.valor_total);
          atingidos.push(next[dIdx].nome);
        });
        // O uso Único é do ATOR, mesmo quando o efeito cai só nos outros.
        next[testIdx] = marcarTecnicaUsada(next[testIdx], payload.tecnica.key);
        if (atingidos.length) {
          efeitoTecnicaAplicado = {
            key: payload.tecnica.key, valor: payload.valor_total, alvos: atingidos,
          };
        }
      }
    }
```

E no objeto `entry` do log (ramo não-resistência), acrescente:

```js
        tecnica_efeito_aplicado: efeitoTecnicaAplicado,
```

> **Atenção:** o mesmo trecho vai nas DUAS cópias, sem divergir uma vírgula. Copie e cole; não reescreva a segunda de cabeça.

- [ ] **Step 7: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS. `softlock-acao.test.jsx` e `apoio-tab.test.jsx` exercitam o `AcaoPanel` — se algum quebrar, foi a mudança de `semCard` ou da guarda do botão.

- [ ] **Step 8: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-efeitos.test.js
git commit -m "feat(batalha): aba Tecnica aplica o efeito mecanico e respeita uso Unico"
```

---

## Verificação final

- [ ] `npm test` — suíte inteira verde
- [ ] `npm run lint` — sem erro novo
- [ ] `npm run build` — `tsc -b && vite build` passa
- [ ] Teste manual numa batalha real: ativar Mira num Guerreiro e conferir que a coluna do próximo ataque subiu pelo total da técnica, e que na segunda rodada voltou ao normal
- [ ] Teste manual: ativar Fúria e conferir as 4 barras/números mudando de uma vez, e o bloqueio ao tentar ativar de novo
- [ ] Teste manual: com espada equipada, Mira aparece bloqueada por arma; com arco, libera
- [ ] Teste manual: com armadura pesada, Posicionamento aparece bloqueado por armadura
- [ ] Teste manual (regressão da Task 7): no dropdown de técnica do ATAQUE, as técnicas `Livre` (Fúria, Heroísmo, Defletir Ataque…) agora aparecem — antes sumiam todas
