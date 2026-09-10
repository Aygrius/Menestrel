# Técnicas de combate — Fase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As 26 técnicas de combate que reescrevem a resolução do golpe passam a produzir efeito mecânico, levando o total de 24 para 50 das 58.

**Architecture:** Mesmo modelo da Fase 1 — técnica é ação própria, ativada na aba Técnica, que grava `status_temp`; os consumidores leem. A Fase 2 acrescenta 12 primitivas, e a maior parte do trabalho é ensinar a resolução do golpe (`aplicarDanoCascata` e a montagem do dano no `AcaoPanel`) a respeitá-las. Um mecanismo novo: status consumido por evento, não por contagem de rodadas.

**Tech Stack:** React 19 sem bundler de módulo (`.jsx` carregados por `main.tsx`, símbolos por `Object.assign(window, {...})`), Vitest, Supabase.

**Spec:** `docs/superpowers/specs/2026-09-10-tecnicas-fase-2-design.md`

## Global Constraints

- **Padrão de módulo:** nada de `export`. Funções puras do motor saem por `window.MotorBatalha`; componentes React vão soltos em `window`. Arquivo novo precisa de `import` em `src/main.tsx`, dependências antes.
- **Padrão de teste:** `import './arquivo.jsx'` pelo efeito colateral, ler `window.X` em `beforeAll`. `npx vitest run <caminho>`; suíte inteira `npm test`.
- **Idioma:** código e comentários em português. Comentário explica POR QUÊ.
- **i18n:** texto de INTERFACE passa pelo objeto de tradução. **Exceção documentada:** mensagens da Central de Mensagens (`registrar_evento_mesa`) são PT literal — são gravadas num log compartilhado que vários jogadores com idiomas diferentes leem, e as 15 chamadas existentes fazem assim. Siga o padrão existente.
- **Commits:** `git add` com caminhos EXPLÍCITOS. NUNCA `git add -A`, `git add .`, `git commit -a`. Mensagem em português, `feat(batalha):` / `fix(batalha):` / `test(batalha):`.
- **SEM DELETE, SEM REAÇÃO.** Nenhuma técnica interrompe o turno alheio.
- **`motor-batalha.test.js` é intocável.** Ele congela as regras de cascata confirmadas em 06/07/2026. Se uma expectativa dele mudar, é regressão — pare e reporte.
- BASELINE: `npm test` = 745 testes em 41 arquivos, verdes.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/12-batalha/batalha.jsx` **(modificar)** | `aplicarDanoCascata` (assinatura), montagem do dano no `AcaoPanel`, consumidores das primitivas, os dois `aplicarTeste`, a regra de ativação livre |
| `src/01-core/tecnicas-efeito.jsx` **(modificar)** | +26 entradas no `TECNICA_EFEITO_MAP` |
| `src/12-batalha/dano-cascata-modificadores.test.js` **(criar)** | A assinatura nova e a regressão da cascata |
| `src/12-batalha/dano-ordem.test.js` **(criar)** | A ordem de aplicação do dano |
| `src/12-batalha/tecnica-fase2.test.js` **(criar)** | As 26 entradas e cada primitiva |
| `src/12-batalha/evita-golpe.test.js` **(criar)** | O ciclo de vida novo |

---

## Task 1: A cascata de dano aceita modificadores

Primeiro e mais arriscado. É a área que levou quatro correções antes desta feature existir.

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `aplicarDanoCascata` (`:772`) e os 3 chamadores (`:1956`, `:2642`, `:5734`)
- Create: `src/12-batalha/dano-cascata-modificadores.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `aplicarDanoCascata(dano, p, mods) -> participante`, onde `mods` é `{ critico?, ignoraEh?, ignoraArmadura? }`. Aceita `true`/`false` no lugar de `mods` por compatibilidade e trata como `{ critico: <valor> }`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/12-batalha/dano-cascata-modificadores.test.js`:

```js
/* ============================================================
   dano-cascata-modificadores.test.js — a assinatura nova da cascata
   ============================================================
   A Fase 2 precisa que o golpe possa pular a EH (ignora_eh, Derrubado) e
   a AR (ignora_armadura). O mecanismo de pular a EH JÁ EXISTIA — é o que
   o crítico faz. Esta task acrescenta produtores, não mecanismo.

   O primeiro describe é REGRESSÃO: a forma antiga de chamar tem que
   continuar valendo exatamente igual. motor-batalha.test.js cobre as
   mesmas regras e não pode mudar nenhuma expectativa.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.aplicarDanoCascata).toBeTypeOf('function'); });

const alvo = (over = {}) => ({ eh: 10, eh_max: 10, ar: 5, ar_max: 5, ef: 20, ef_max: 20, status: 'ativo', ...over });

describe('compatibilidade — a forma antiga continua idêntica', () => {
  it('booleano false se comporta como antes: come EH, depois AR, depois EF', () => {
    const r = M.aplicarDanoCascata(12, alvo(), false);
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 0, ar: 3, ef: 20 });
  });

  it('booleano true pula a EH, como o crítico sempre fez', () => {
    const r = M.aplicarDanoCascata(12, alvo(), true);
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 10, ar: 0, ef: 13 });
  });

  it('sem terceiro argumento não pula nada', () => {
    const r = M.aplicarDanoCascata(3, alvo());
    expect(r.eh).toBe(7);
  });
});

describe('objeto de modificadores', () => {
  it('{ critico: true } é igual ao booleano true', () => {
    const a = M.aplicarDanoCascata(12, alvo(), true);
    const b = M.aplicarDanoCascata(12, alvo(), { critico: true });
    expect({ eh: b.eh, ar: b.ar, ef: b.ef }).toEqual({ eh: a.eh, ar: a.ar, ef: a.ef });
  });

  it('ignoraEh pula a EH e começa na AR', () => {
    const r = M.aplicarDanoCascata(12, alvo(), { ignoraEh: true });
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 10, ar: 0, ef: 13 });
  });

  it('ignoraArmadura pula a AR mas come a EH', () => {
    const r = M.aplicarDanoCascata(12, alvo(), { ignoraArmadura: true });
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 0, ar: 5, ef: 18 });
  });

  it('os dois juntos vão direto na EF', () => {
    const r = M.aplicarDanoCascata(12, alvo(), { ignoraEh: true, ignoraArmadura: true });
    expect({ eh: r.eh, ar: r.ar, ef: r.ef }).toEqual({ eh: 10, ar: 5, ef: 8 });
  });
});

describe('as garantias antigas não mudam', () => {
  it('a EF para no piso de morte e o excedente vira sobra', () => {
    const r = M.aplicarDanoCascata(100, alvo(), { ignoraEh: true, ignoraArmadura: true });
    expect(r.ef).toBe(M.EF_MORTE);
    expect(r.sobra).toBe(100 - (20 - M.EF_MORTE));
    expect(r.status).toBe('morto');
  });

  it('zerar a EH derruba quem tem pool de EH', () => {
    const r = M.aplicarDanoCascata(10, alvo());
    expect(r.eh).toBe(0);
    expect(r.status).toBe('desmaiado');
  });

  it('quem não tem pool de EH não desmaia por EH zero', () => {
    const r = M.aplicarDanoCascata(1, alvo({ eh: 0, eh_max: 0 }));
    expect(r.status).toBe('ativo');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/dano-cascata-modificadores.test.js`
Expected: FAIL nos testes de `{ ignoraEh }` — hoje o terceiro argumento é tratado como booleano, então um objeto é truthy e cai no caminho do crítico.

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, substitua a assinatura e as duas primeiras linhas do corpo:

```js
/* Dano em cascata EH → AR → EF (com transbordo).
   … (preserve o bloco de comentário existente acima da função) …

   O 3º parâmetro era um booleano `critico`. Virou objeto de modificadores
   na Fase 2 das técnicas, porque agora há três motivos diferentes pra pular
   uma camada: crítico, `ignora_eh` (Golpe Letal e as 5 irmãs, mais a
   condição Derrubado) e `ignora_armadura` (Disparo Certeiro, Explorar
   Fraqueza). Booleano ainda é aceito e vira `{ critico: <valor> }` — os
   chamadores antigos não mudam de comportamento, e motor-batalha.test.js
   prova isso sem alterar uma expectativa. */
function aplicarDanoCascata(dano, p, mods) {
  const m = (mods && typeof mods === 'object') ? mods : { critico: !!mods };
  const pulaEh = !!(m.critico || m.ignoraEh);
  let r = Math.max(0, Math.floor(dano || 0));
  let eh = p.eh, ar = p.ar, ef = p.ef;
  if (!pulaEh && eh > 0)          { const c = Math.min(eh, r); eh -= c; r -= c; }
  if (r > 0 && !m.ignoraArmadura && ar > 0) { const c = Math.min(ar, r); ar -= c; r -= c; }
```

O resto do corpo (EF, `EF_MORTE`, `status`, `sobra`) fica **exatamente** como está.

- [ ] **Step 4: Rodar os dois arquivos**

Run: `npx vitest run src/12-batalha/dano-cascata-modificadores.test.js src/12-batalha/motor-batalha.test.js`
Expected: PASS nos dois. `motor-batalha.test.js` sem nenhuma expectativa alterada — se ele falhar, PARE e reporte: é regressão na área mais sensível do sistema.

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/dano-cascata-modificadores.test.js
git commit -m "feat(batalha): cascata de dano aceita ignoraEh e ignoraArmadura"
```

---

## Task 2: As 26 entradas do registro

**Files:**
- Modify: `src/01-core/tecnicas-efeito.jsx`
- Create: `src/12-batalha/tecnica-fase2.test.js`

**Interfaces:**
- Consumes: `TECNICA_EFEITO_MAP`, `tecnicaEfeitoDe` (Fase 1)
- Produces: 26 entradas novas, todas `modo: 'teste'`. Tipos de efeito novos: `ignora_eh`, `ignora_armadura`, `dano_pct`, `dano_recebido_pct`, `ataque_extra`, `alvos_extras`, `sem_atacar`, `sem_tecnicas`, `sem_critico`, `derrubado`, `evita_golpe`, `usa_defesa_de`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/12-batalha/tecnica-fase2.test.js`:

```js
/* ============================================================
   tecnica-fase2.test.js — as 26 entradas da Fase 2 no registro
   ============================================================
   Mesma disciplina do teste da Fase 1: o texto do banco é a fonte
   human-readable, o registro é a mecânica, e este arquivo trava o acordo
   entre os dois — em especial a duração e a dificuldade.

   Dados lidos do banco em 10/09/2026.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';

let MAP;
beforeAll(() => { MAP = window.TECNICA_EFEITO_MAP; expect(MAP).toBeDefined(); });

// key | dificuldade | rodadas — cópia do banco.
const FASE2 = {
  ambidestria:         ['medio', 1],  aparar:            ['muito_dificil', 1],
  aprimorar:           ['muito_dificil', 3], ataque_oportuno: ['medio', 1],
  atravessar_oponente: ['medio', 1],  brutalizar:        ['dificil', 1],
  carga:               ['dificil', 1], carga_de_arremesso: ['medio', 1],
  carga_montada:       ['medio', 2],  combate_com_escudo: ['medio', 2],
  combate_nao_letal:   ['medio', 2],  contra_ataque:     ['dificil', 1],
  dano_agravado:       ['muito_dificil', 1], desequilibrar: ['muito_dificil', 1],
  desviar:             ['muito_dificil', 3], disparo_certeiro: ['medio', 3],
  escolta:             ['medio', 3],  esquiva:           ['muito_dificil', 1],
  flechadas_multiplas: ['muito_dificil', 1], forca_interior: ['medio', 2],
  golpe_duplo:         ['muito_dificil', 1], golpe_giratorio: ['dificil', 1],
  golpe_letal:         ['muito_dificil', 1], inibir_ataque: ['dificil', 1],
  intimidar:           ['muito_dificil', 1], leitura_de_batalha: ['medio', 2],
};

const TIPOS_FASE2 = ['ignora_eh','ignora_armadura','dano_pct','dano_recebido_pct',
  'ataque_extra','alvos_extras','sem_atacar','sem_tecnicas','sem_critico',
  'derrubado','evita_golpe','usa_defesa_de'];

describe('as 26 entradas', () => {
  it('todas existem no registro', () => {
    for (const key of Object.keys(FASE2)) {
      expect(MAP[key], `${key} faltando`).toBeDefined();
    }
  });

  it('todas são modo teste, com a dificuldade do banco', () => {
    for (const [key, [dif]] of Object.entries(FASE2)) {
      expect(MAP[key].modo, key).toBe('teste');
      expect(MAP[key].dificuldade, key).toBe(dif);
    }
  });

  it('a duração bate com o número de rodadas do banco', () => {
    for (const [key, [, rodadas]] of Object.entries(FASE2)) {
      expect(MAP[key].rodadas, key).toBe(rodadas);
    }
  });

  it('todo efeito usa um tipo da Fase 2 e traz valor fixo', () => {
    for (const key of Object.keys(FASE2)) {
      for (const ef of MAP[key].efeitos) {
        expect(TIPOS_FASE2, `${key}/${ef.tipo}`).toContain(ef.tipo);
        expect(Number.isFinite(ef.valor) || ef.valor === true, `${key}/${ef.tipo}`).toBe(true);
      }
    }
  });
});

describe('as primitivas caíram nas técnicas certas', () => {
  const tipos = (k) => MAP[k].efeitos.map((e) => e.tipo).sort();

  it('as 6 de ignora_eh', () => {
    for (const k of ['ataque_oportuno','atravessar_oponente','carga','carga_de_arremesso','carga_montada','golpe_letal']) {
      expect(tipos(k), k).toContain('ignora_eh');
    }
  });

  it('os percentuais de dano causado', () => {
    expect(MAP.brutalizar.efeitos.find((e) => e.tipo === 'dano_pct').valor).toBe(50);
    for (const k of ['ambidestria','aprimorar','dano_agravado','forca_interior']) {
      expect(MAP[k].efeitos.find((e) => e.tipo === 'dano_pct').valor, k).toBe(25);
    }
  });

  it('os percentuais de dano recebido são NEGATIVOS', () => {
    expect(MAP.aparar.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-75);
    expect(MAP.desviar.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-50);
    expect(MAP.combate_com_escudo.efeitos.find((e) => e.tipo === 'dano_recebido_pct').valor).toBe(-25);
  });

  it('as 3 de ataque extra', () => {
    for (const k of ['contra_ataque','golpe_duplo','flechadas_multiplas']) {
      expect(tipos(k), k).toContain('ataque_extra');
    }
  });

  it('Golpe Giratório tem os DOIS: +25% e até 3 alvos', () => {
    expect(tipos('golpe_giratorio')).toEqual(['alvos_extras','dano_pct']);
    expect(MAP.golpe_giratorio.efeitos.find((e) => e.tipo === 'alvos_extras').valor).toBe(3);
  });

  it('as que atuam no alvo miram inimigo', () => {
    for (const k of ['ataque_oportuno','golpe_letal','inibir_ataque','intimidar','leitura_de_batalha','desequilibrar']) {
      expect(MAP[k].alvo, k).toBe('inimigo');
    }
  });

  it('as defensivas e as de auto-buff miram self', () => {
    for (const k of ['aparar','desviar','combate_com_escudo','esquiva','combate_nao_letal','ambidestria','aprimorar','brutalizar']) {
      expect(MAP[k].alvo, k).toBe('self');
    }
  });

  it('Escolta mira aliado e carrega usa_defesa_de', () => {
    expect(MAP.escolta.alvo).toBe('aliados');
    expect(tipos('escolta')).toContain('usa_defesa_de');
  });

  it('Esquiva é consumida por evento, não só por tempo', () => {
    expect(MAP.esquiva.consome_em).toBe('golpe_recebido');
  });
});

describe('o total do sistema', () => {
  it('o registro passa a cobrir 50 das 58 técnicas', () => {
    expect(Object.keys(MAP).length).toBe(50);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-fase2.test.js`
Expected: FAIL — as 26 chaves não existem.

- [ ] **Step 3: Acrescentar as 26 entradas**

Em `src/01-core/tecnicas-efeito.jsx`, acrescente ao `TECNICA_EFEITO_MAP`, num bloco com cabeçalho próprio explicando que é a Fase 2. Restrições de arma e armadura NÃO vão no registro — vêm de `tecnicas.grupo_armas`/`grupo_armaduras`, como na Fase 1.

Use esta tabela. `alvo` e `consome_em` conforme os testes acima.

| key | alvo | efeitos |
|---|---|---|
| ataque_oportuno, atravessar_oponente, carga, carga_de_arremesso, carga_montada, golpe_letal | inimigo | `{ tipo: 'ignora_eh', valor: true }` |
| ambidestria, aprimorar, dano_agravado, forca_interior | self | `{ tipo: 'dano_pct', valor: 25 }` |
| brutalizar | self | `{ tipo: 'dano_pct', valor: 50 }` |
| aparar | self | `{ tipo: 'dano_recebido_pct', valor: -75 }` |
| desviar | self | `{ tipo: 'dano_recebido_pct', valor: -50 }` |
| combate_com_escudo | self | `{ tipo: 'dano_recebido_pct', valor: -25 }` |
| contra_ataque, golpe_duplo, flechadas_multiplas | self | `{ tipo: 'ataque_extra', valor: 1 }` |
| golpe_giratorio | self | `{ tipo: 'dano_pct', valor: 25 }` e `{ tipo: 'alvos_extras', valor: 3 }` |
| disparo_certeiro | inimigo | `{ tipo: 'ignora_armadura', valor: true }` |
| inibir_ataque, intimidar | inimigo | `{ tipo: 'sem_atacar', valor: true }` |
| leitura_de_batalha | inimigo | `{ tipo: 'sem_tecnicas', valor: true }` |
| combate_nao_letal | self | `{ tipo: 'sem_critico', valor: true }` |
| desequilibrar | inimigo | `{ tipo: 'derrubado', valor: true }` |
| esquiva | self | `{ tipo: 'evita_golpe', valor: true }`, mais `consome_em: 'golpe_recebido'` |
| escolta | aliados | `{ tipo: 'usa_defesa_de', valor: true }`, `maxAlvos: 1` |

Ícones: escolha um emoji coerente por técnica, no espírito dos da Fase 1 (🎯 Mira, 🩸 Sangramento). `rotuloKey` não se aplica aqui — o registro da Fase 1 não usa.

**Complete também a Explorar Fraqueza:** ela tem `parcial: 'ignora_armadura'` desde a Fase 1. Acrescente `{ tipo: 'ignora_armadura', valor: true }` aos efeitos dela e REMOVA o campo `parcial`. Ajuste o teste da Fase 1 que verifica esse campo.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/01-core/ src/12-batalha/tecnica-fase2.test.js`
Expected: PASS. O teste da Fase 1 que contava 24 entradas passa a esperar 50 — ajuste-o, é mudança intencional.

- [ ] **Step 5: Commit**

```bash
git add src/01-core/tecnicas-efeito.jsx src/01-core/tecnicas-efeito.test.js src/12-batalha/tecnica-fase2.test.js
git commit -m "feat(batalha): registra as 26 tecnicas da Fase 2"
```

---

## Task 3: A ordem de aplicação do dano

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — helpers novos perto de `danoComModMax`, e o consumo em `AcaoPanel` (`:4674`)
- Create: `src/12-batalha/dano-ordem.test.js`

**Interfaces:**
- Consumes: `somaEfeitosStatus` (existente)
- Produces:
  - `somaDanoPct(p) -> number` — soma dos `dano_pct` do atacante
  - `somaDanoRecebidoPct(p) -> number` — soma dos `dano_recebido_pct` do alvo (negativos)
  - `danoFinal(danoBase, atacante, alvo) -> number` — aplica a ordem completa

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/12-batalha/dano-ordem.test.js`:

```js
/* ============================================================
   dano-ordem.test.js — a ordem de aplicação do dano
   ============================================================
   A ordem MUDA O NÚMERO, então está fixada na spec §4.3 e travada aqui:

     1. dano base           danoNoTier
     2. + dano_pct          do atacante
     3. − mod_dano_max      do alvo (Posicionamento, Fase 1)
     4. − dano_recebido_pct do alvo
     5. cascata             EH → AR → EF

   Percentuais SOMAM antes de multiplicar: +25% e +50% dão +75%, não
   +87,5%. O teste abaixo distingue as duas leituras.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.danoFinal).toBeTypeOf('function'); });

const comStatus = (...efeitos) => ({
  inst_id: 'x', eh: 50, eh_max: 50, ar: 0, ar_max: 0, ef: 50, ef_max: 50, status: 'ativo',
  status_temp: efeitos.map((efeito, i) => ({ id: 'st' + i, nome: 's', icone: '·', rodadas_rest: 1, efeito })),
});
const limpo = () => comStatus();

describe('somaDanoPct e somaDanoRecebidoPct', () => {
  it('somam os percentuais do mesmo tipo', () => {
    const p = comStatus({ tipo: 'dano_pct', valor: 25 }, { tipo: 'dano_pct', valor: 50 });
    expect(M.somaDanoPct(p)).toBe(75);
  });

  it('dano recebido é negativo e soma', () => {
    const p = comStatus({ tipo: 'dano_recebido_pct', valor: -25 }, { tipo: 'dano_recebido_pct', valor: -50 });
    expect(M.somaDanoRecebidoPct(p)).toBe(-75);
  });

  it('sem status, zero', () => {
    expect(M.somaDanoPct(limpo())).toBe(0);
    expect(M.somaDanoRecebidoPct(limpo())).toBe(0);
  });
});

describe('danoFinal', () => {
  it('sem modificador nenhum, devolve o dano base', () => {
    expect(M.danoFinal(20, limpo(), limpo())).toBe(20);
  });

  it('aplica o bônus do atacante', () => {
    expect(M.danoFinal(20, comStatus({ tipo: 'dano_pct', valor: 25 }), limpo())).toBe(25);
  });

  // A distinção que importa: somar antes, não multiplicar em cadeia.
  // Somando: 20 × 1.75 = 35. Em cadeia: 20 × 1.25 × 1.50 = 37.5 → 38.
  it('percentuais SOMAM antes de multiplicar', () => {
    const atacante = comStatus({ tipo: 'dano_pct', valor: 25 }, { tipo: 'dano_pct', valor: 50 });
    expect(M.danoFinal(20, atacante, limpo())).toBe(35);
  });

  it('aplica a redução do alvo', () => {
    expect(M.danoFinal(20, limpo(), comStatus({ tipo: 'dano_recebido_pct', valor: -75 }))).toBe(5);
  });

  it('mod_dano_max do alvo entra ANTES da redução percentual', () => {
    // 20 − 4 = 16, depois −50% = 8. Se a ordem invertesse: 20 −50% = 10, −4 = 6.
    const alvo = comStatus({ tipo: 'mod_dano_max', valor: -4 }, { tipo: 'dano_recebido_pct', valor: -50 });
    expect(M.danoFinal(20, limpo(), alvo)).toBe(8);
  });

  it('bônus e redução convivem', () => {
    // 20 +25% = 25, depois −50% = 12.5 → 13 (arredonda pra cima, como o resto do sistema)
    expect(M.danoFinal(20, comStatus({ tipo: 'dano_pct', valor: 25 }),
                           comStatus({ tipo: 'dano_recebido_pct', valor: -50 }))).toBe(13);
  });

  it('piso 0 — reduzir dano nunca vira cura', () => {
    const alvo = comStatus({ tipo: 'dano_recebido_pct', valor: -75 }, { tipo: 'mod_dano_max', valor: -50 });
    expect(M.danoFinal(10, limpo(), alvo)).toBe(0);
  });

  it('dano base 0 continua 0', () => {
    expect(M.danoFinal(0, comStatus({ tipo: 'dano_pct', valor: 50 }), limpo())).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/dano-ordem.test.js`
Expected: FAIL — `M.danoFinal is not a function`.

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, junto de `danoComModMax`:

```js
/* Percentuais de dano das técnicas da Fase 2.
   SOMAM antes de multiplicar (spec §4.3): Ambidestria +25% com Brutalizar
   +50% dá +75%, não +87,5%. Compor em cadeia inflaria o dano de quem
   empilha técnicas, e a regra do sistema é aditiva. */
function somaDanoPct(p) { return somaEfeitosStatus(p, 'dano_pct'); }
function somaDanoRecebidoPct(p) { return somaEfeitosStatus(p, 'dano_recebido_pct'); }

/* Dano final, na ordem fixada pela spec §4.3. A ordem MUDA O NÚMERO — em
   especial, mod_dano_max (Posicionamento) é subtração ABSOLUTA e entra antes
   da redução percentual; invertido, o resultado é outro.
   Arredonda pra cima, como o resto do sistema de dano ("arredondamento SEMPRE
   pra cima", regra confirmada). Piso 0: reduzir dano nunca vira cura. */
function danoFinal(danoBase, atacante, alvo) {
  const base = Math.max(0, Math.floor(danoBase || 0));
  if (base === 0) return 0;
  const comBonus = base * (1 + somaDanoPct(atacante) / 100);
  const aposMaximo = comBonus + somaEfeitosStatus(alvo, 'mod_dano_max');
  const aposReducao = aposMaximo * (1 + somaDanoRecebidoPct(alvo) / 100);
  return Math.max(0, Math.ceil(aposReducao - 1e-9));
}
```

Acrescente `somaDanoPct, somaDanoRecebidoPct, danoFinal,` ao `MotorBatalha`.

- [ ] **Step 4: Substituir o consumo no AcaoPanel**

Busque `const dano = danoComModMax(danoBruto, alvo);` e troque por:

```js
  // danoFinal engloba o que danoComModMax fazia (mod_dano_max) e acrescenta
  // os percentuais da Fase 2, na ordem da spec §4.3.
  const dano = danoFinal(danoBruto, ator, alvo);
```

`danoComModMax` fica no arquivo e continua exportada: os testes da Fase 1 a cobrem e ela documenta a regra do Posicionamento isoladamente. Não a remova.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/12-batalha/`
Expected: PASS, incluindo `motor-batalha.test.js` sem alteração.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/dano-ordem.test.js
git commit -m "feat(batalha): ordem de aplicacao do dano com os percentuais da Fase 2"
```

---

## Task 4: `ignora_eh`, `ignora_armadura` e `derrubado` no golpe

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `AcaoPanel` e os dois `aplicarAcao`
- Test: `src/12-batalha/tecnica-fase2.test.js` (acrescentar)

**Interfaces:**
- Consumes: `aplicarDanoCascata(dano, p, mods)` (Task 1), `somaEfeitosStatus`
- Produces: `modsDoGolpe(atacante, alvo) -> { ignoraEh, ignoraArmadura }`

- [ ] **Step 1: Acrescentar o teste**

Adicione a `src/12-batalha/tecnica-fase2.test.js`:

```js
describe('modsDoGolpe — quem fura o quê', () => {
  const comEfeito = (efeito, over = {}) => ({
    inst_id: 'a', status_temp: [{ id: 's', nome: 's', icone: '·', rodadas_rest: 1, efeito }], ...over,
  });
  const vazio = (inst_id = 'b') => ({ inst_id, status_temp: [] });

  it('sem status, não fura nada', () => {
    expect(M.modsDoGolpe(vazio('a'), vazio('b'))).toEqual({ ignoraEh: false, ignoraArmadura: false });
  });

  // ignora_eh é ancorado no ATACANTE e mira UM alvo — Golpe Letal deixa VOCÊ
  // furar a EH daquele inimigo, não abre ele pro grupo inteiro.
  it('ignora_eh do atacante vale só contra o alvo declarado', () => {
    const atacante = comEfeito({ tipo: 'ignora_eh', valor: true, alvo_inst_id: 'b' });
    expect(M.modsDoGolpe(atacante, vazio('b')).ignoraEh).toBe(true);
    expect(M.modsDoGolpe(atacante, vazio('c')).ignoraEh).toBe(false);
  });

  // Derrubado é o contrário: condição NO ALVO, vale pra qualquer atacante.
  it('derrubado no alvo vale pra qualquer atacante', () => {
    const alvo = comEfeito({ tipo: 'derrubado', valor: true }, { inst_id: 'b' });
    expect(M.modsDoGolpe(vazio('a'), alvo).ignoraEh).toBe(true);
    expect(M.modsDoGolpe(vazio('z'), alvo).ignoraEh).toBe(true);
  });

  it('ignora_armadura do atacante, também por alvo', () => {
    const atacante = comEfeito({ tipo: 'ignora_armadura', valor: true, alvo_inst_id: 'b' });
    expect(M.modsDoGolpe(atacante, vazio('b')).ignoraArmadura).toBe(true);
    expect(M.modsDoGolpe(atacante, vazio('c')).ignoraArmadura).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-fase2.test.js -t modsDoGolpe`
Expected: FAIL — `M.modsDoGolpe is not a function`.

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, perto de `somaModAtaque`:

```js
/* O que este golpe fura, deste atacante contra este alvo.
   Duas ancoragens diferentes, e a distinção é regra, não detalhe:
     • `ignora_eh`/`ignora_armadura` ficam no ATACANTE e carregam
       `alvo_inst_id` — Golpe Letal deixa VOCÊ furar a EH daquele inimigo,
       e não abre ele para os outros combatentes;
     • `derrubado` fica no ALVO e vale para QUALQUER atacante — é condição
       dele, não golpe seu.
   Decisão do usuário em 10/09/2026 (spec §3, itens 5 e 6). */
function modsDoGolpe(atacante, alvo) {
  const alvoId = alvo && alvo.inst_id;
  const doAtacante = (tipo) => !!(atacante && Array.isArray(atacante.status_temp)
    && atacante.status_temp.some((s) => s.efeito && s.efeito.tipo === tipo
      && (!s.efeito.alvo_inst_id || s.efeito.alvo_inst_id === alvoId)));
  const derrubado = !!(alvo && Array.isArray(alvo.status_temp)
    && alvo.status_temp.some((s) => s.efeito && s.efeito.tipo === 'derrubado'));
  return {
    ignoraEh: doAtacante('ignora_eh') || derrubado,
    ignoraArmadura: doAtacante('ignora_armadura'),
  };
}
```

Acrescente `modsDoGolpe,` ao `MotorBatalha`.

- [ ] **Step 4: Ligar nos dois pontos de ataque**

Nos DOIS `aplicarAcao` (busque `aplicarDanoCascata(dano, alvoAntes, critico)` — há dois, um do Mestre e um do Jogador), troque por:

```js
      // Fase 2: além do crítico, o golpe pode furar EH e/ou AR por técnica
      // (ignora_eh, ignora_armadura) ou por condição do alvo (derrubado).
      const modsG = modsDoGolpe(next[atorIdx], alvoAntes);
      next[alvoIdx] = aplicarDanoCascata(dano, alvoAntes, { critico, ...modsG });
```

⚠️ Os dois trechos precisam ficar IDÊNTICOS a menos do nome da variável do índice do ator, que difere entre os handlers. Leia os dois antes de editar. Essa duplicação já causou bug neste arquivo.

O autodano da Falha Crítica (`aplicarDanoCascata(dano, p, true)`) NÃO muda — é dano em si mesmo, sem técnica envolvida.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/12-batalha/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-fase2.test.js
git commit -m "feat(batalha): golpe respeita ignora_eh, ignora_armadura e derrubado"
```

---

## Task 5: `evita_golpe` — status consumido por evento

**Files:**
- Modify: `src/12-batalha/batalha.jsx`
- Create: `src/12-batalha/evita-golpe.test.js`

**Interfaces:**
- Consumes: `aplicarDanoCascata` (Task 1)
- Produces: `consumirEvitaGolpe(alvo) -> { evitou: boolean, participante }`

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/12-batalha/evita-golpe.test.js`:

```js
/* ============================================================
   evita-golpe.test.js — o único status consumido por EVENTO
   ============================================================
   Esquiva ("evita o golpe de 1 alvo por 1 rodada") é gasta pelo próximo
   golpe recebido, ou pelo fim da duração, o que vier primeiro. Todo o
   resto do status_temp expira só por tempo.

   `consome_em` é opcional: status sem ele não muda em nada.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let M;
beforeAll(() => { M = window.MotorBatalha; expect(M.consumirEvitaGolpe).toBeTypeOf('function'); });

const comEsquiva = () => ({
  inst_id: 'a', eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20, status: 'ativo',
  status_temp: [{ id: 'tec_esquiva', nome: 'Esquiva', icone: '🌀', rodadas_rest: 1,
    consome_em: 'golpe_recebido', efeito: { tipo: 'evita_golpe', valor: true } }],
});
const semNada = () => ({ inst_id: 'a', eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20, status: 'ativo', status_temp: [] });

describe('consumirEvitaGolpe', () => {
  it('evita o golpe e remove o status', () => {
    const r = M.consumirEvitaGolpe(comEsquiva());
    expect(r.evitou).toBe(true);
    expect(r.participante.status_temp).toHaveLength(0);
  });

  it('o segundo golpe da mesma rodada JÁ NÃO é evitado', () => {
    const r1 = M.consumirEvitaGolpe(comEsquiva());
    const r2 = M.consumirEvitaGolpe(r1.participante);
    expect(r2.evitou).toBe(false);
  });

  it('sem o status, não evita e devolve o mesmo objeto', () => {
    const p = semNada();
    const r = M.consumirEvitaGolpe(p);
    expect(r.evitou).toBe(false);
    expect(r.participante).toBe(p);
  });

  it('não toca status de outra origem', () => {
    const p = comEsquiva();
    p.status_temp.push({ id: 'fc_defesa', nome: 'Defesa −5', icone: '🛡️', rodadas_rest: null, efeito: { tipo: 'mod_defesa', valor: -5 } });
    const r = M.consumirEvitaGolpe(p);
    expect(r.participante.status_temp).toHaveLength(1);
    expect(r.participante.status_temp[0].id).toBe('fc_defesa');
  });
});

describe('expiração por tempo continua valendo', () => {
  it('se ninguém atacar, a Esquiva some na virada de rodada', () => {
    const p = comEsquiva();
    const { participante } = M.processarViradaDeRodada(p);
    expect(participante.status_temp).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/evita-golpe.test.js`
Expected: FAIL — `M.consumirEvitaGolpe is not a function`.

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`, perto de `modsDoGolpe`:

```js
/* Esquiva é o ÚNICO status consumido por evento, não por contagem de
   rodadas: ela é gasta pelo próximo golpe recebido, ou expira por tempo se
   ninguém atacar — o que vier primeiro.
   O campo `consome_em` é opcional e aditivo: status sem ele segue exatamente
   como antes, expirando só em processarViradaDeRodada. */
function consumirEvitaGolpe(alvo) {
  const st = (alvo && Array.isArray(alvo.status_temp)) ? alvo.status_temp : null;
  if (!st || !st.some((s) => s.consome_em === 'golpe_recebido' && s.efeito && s.efeito.tipo === 'evita_golpe')) {
    return { evitou: false, participante: alvo };
  }
  const restante = st.filter((s) => !(s.consome_em === 'golpe_recebido' && s.efeito && s.efeito.tipo === 'evita_golpe'));
  return { evitou: true, participante: { ...alvo, status_temp: restante } };
}
```

Acrescente `consumirEvitaGolpe,` ao `MotorBatalha`.

- [ ] **Step 4: Ligar nos dois pontos de ataque**

Nos DOIS `aplicarAcao`, ANTES da cascata (que a Task 4 já editou):

```js
      // Esquiva anula o golpe inteiro e é gasta nele.
      const esq = consumirEvitaGolpe(alvoAntes);
      if (esq.evitou) {
        next[alvoIdx] = esq.participante;   // dano nenhum, status consumido
      } else {
        const modsG = modsDoGolpe(next[atorIdx], alvoAntes);
        next[alvoIdx] = aplicarDanoCascata(dano, alvoAntes, { critico, ...modsG });
      }
```

Os dois trechos IDÊNTICOS a menos do nome da variável do índice do ator.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/12-batalha/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/evita-golpe.test.js
git commit -m "feat(batalha): Esquiva anula o golpe e e consumida por ele"
```

---

## Task 6: `ataque_extra`, `alvos_extras` e os bloqueios de turno

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — `montarSnapshots`, `processarViradaDeRodada`, `AcaoPanel`
- Test: `src/12-batalha/tecnica-fase2.test.js` (acrescentar)

**Interfaces:**
- Consumes: `statusTemEfeito` (existente)
- Produces:
  - campo `pa_ataque_extra` no participante, zerado na virada
  - `podeAtacarAgora(p) -> boolean` — false quando o alvo tem `sem_atacar`
  - `podeUsarTecnicaAgora(p) -> boolean` — false quando tem `sem_tecnicas`

- [ ] **Step 1: Acrescentar o teste**

Adicione a `src/12-batalha/tecnica-fase2.test.js`:

```js
describe('bloqueios de turno', () => {
  const com = (tipo) => ({ inst_id: 'a', status_temp: [{ id: 's', nome: 's', icone: '·', rodadas_rest: 1, efeito: { tipo, valor: true } }] });
  const sem = () => ({ inst_id: 'a', status_temp: [] });

  it('sem_atacar impede atacar, e só isso', () => {
    expect(M.podeAtacarAgora(com('sem_atacar'))).toBe(false);
    expect(M.podeUsarTecnicaAgora(com('sem_atacar'))).toBe(true);
  });

  it('sem_tecnicas impede técnica, e só isso', () => {
    expect(M.podeUsarTecnicaAgora(com('sem_tecnicas'))).toBe(false);
    expect(M.podeAtacarAgora(com('sem_tecnicas'))).toBe(true);
  });

  it('sem status, pode tudo', () => {
    expect(M.podeAtacarAgora(sem())).toBe(true);
    expect(M.podeUsarTecnicaAgora(sem())).toBe(true);
  });
});

describe('pa_ataque_extra', () => {
  const base = () => ({ inst_id: 'a', status: 'ativo', vb: 10, pa_max: 1, pa_rest: 1,
    mov_rest: 5, moveu_na_rodada: true, tecnica_livre_usada: true, pa_ataque_extra: 2, status_temp: [] });

  it('a virada de rodada zera o ataque extra, como zera o resto', () => {
    const { participante } = M.processarViradaDeRodada(base());
    expect(participante.pa_ataque_extra).toBe(0);
    expect(participante.tecnica_livre_usada).toBe(false);
    expect(participante.moveu_na_rodada).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-fase2.test.js -t "bloqueios de turno"`
Expected: FAIL — `M.podeAtacarAgora is not a function`.

- [ ] **Step 3: Implementar**

Em `src/12-batalha/batalha.jsx`:

```js
/* Bloqueios de turno da Fase 2. Separados de propósito: Inibir Ataque e
   Intimidar tiram só o ATAQUE, Leitura de Batalha tira só as TÉCNICAS.
   Nenhum dos dois é `sem_acoes` (que tira tudo e faz o turno passar sozinho
   — esse é da Falha Crítica). */
function podeAtacarAgora(p)      { return !statusTemEfeito(p, 'sem_atacar'); }
function podeUsarTecnicaAgora(p) { return !statusTemEfeito(p, 'sem_tecnicas'); }
```

Em `processarViradaDeRodada`, no objeto que já zera `moveu_na_rodada` e `tecnica_livre_usada`, acrescente `pa_ataque_extra: 0`.

Em `montarSnapshots`, nos DOIS pontos onde `tecnica_livre_usada: false` foi acrescentado (PJ e criatura), acrescente `pa_ataque_extra: 0`.

Acrescente `podeAtacarAgora, podeUsarTecnicaAgora,` ao `MotorBatalha`.

- [ ] **Step 4: Ligar na interface**

No `AcaoPanel`:

- a aba **Arma** fica desabilitada quando `!podeAtacarAgora(ator)`, com aviso no mesmo lugar das outras mensagens de bloqueio;
- a aba **Técnica** fica desabilitada quando `!podeUsarTecnicaAgora(ator)`, idem;
- ao confirmar um ataque, se `ator.pa_ataque_extra > 0`, consome ele em vez de `pa_rest` (só na aba Arma);
- quando a técnica ativada tem `alvos_extras: N`, a seleção de alvo do ataque passa a aceitar até N alvos — reuse a multisseleção que a Fase 1 construiu para Voz de Comando, não escreva outra.

Textos de bloqueio via `ADMIN_COPY`/`tBat`, nunca embutidos.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS. `softlock-acao.test.jsx`, `apoio-tab.test.jsx`, `card-jogador.test.jsx` e `tecnica-aba.test.jsx` exercitam o `AcaoPanel` — se algum quebrar, o controle entrou no lugar errado.

- [ ] **Step 6: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-fase2.test.js
git commit -m "feat(batalha): ataque extra, multi-alvo e bloqueios de atacar/tecnica"
```

---

## Task 7: Ativação livre para qualquer modo, `sem_critico` e `usa_defesa_de`

**Files:**
- Modify: `src/12-batalha/batalha.jsx`
- Test: `src/12-batalha/tecnica-fase2.test.js` (acrescentar)

**Interfaces:**
- Consumes: `debitarCustoTecnica`, `podeAtivarTecnicaLivre` (Fase 1)
- Produces: assinaturas inalteradas; muda só a condição interna

- [ ] **Step 1: Acrescentar o teste**

```js
describe('ativação livre vale para QUALQUER modo (mudança da Fase 2)', () => {
  const ator = (over = {}) => ({ inst_id: 'a', pa_rest: 1, tecnica_livre_usada: false, status_temp: [], tecnicas_usadas: [], ...over });

  it('técnica de modo teste também é ativação livre', () => {
    const p = M.debitarCustoTecnica(ator(), 'golpe_letal');
    expect(p.pa_rest, 'não debita PA').toBe(1);
    expect(p.tecnica_livre_usada).toBe(true);
  });

  it('técnica de modo total continua livre', () => {
    const p = M.debitarCustoTecnica(ator(), 'mira');
    expect(p.pa_rest).toBe(1);
    expect(p.tecnica_livre_usada).toBe(true);
  });

  it('a SEGUNDA da rodada é bloqueada, seja qual for o modo', () => {
    const usado = ator({ tecnica_livre_usada: true });
    expect(M.podeAtivarTecnicaLivre(usado, { key: 'golpe_letal' }).pode).toBe(false);
    expect(M.podeAtivarTecnicaLivre(usado, { key: 'mira' }).pode).toBe(false);
  });

  it('técnica SEM entrada no registro continua debitando PA', () => {
    const p = M.debitarCustoTecnica(ator(), 'concentracao');
    expect(p.pa_rest).toBe(0);
  });
});

describe('sem_critico', () => {
  it('o resultado Absurdo não vira crítico enquanto durar', () => {
    const com = { inst_id: 'a', status_temp: [{ id: 's', nome: 's', icone: '·', rodadas_rest: 1, efeito: { tipo: 'sem_critico', valor: true } }] };
    expect(M.criticoPermitido(com)).toBe(false);
    expect(M.criticoPermitido({ inst_id: 'a', status_temp: [] })).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-fase2.test.js -t "ativação livre"`
Expected: FAIL — hoje `debitarCustoTecnica` só isenta `modo: 'total'`.

- [ ] **Step 3: Implementar**

Em `debitarCustoTecnica`, troque a condição `reg.modo === 'total'` por `!!reg` — qualquer técnica COM entrada no registro é ativação livre. Técnica sem entrada continua debitando PA.

Atualize o comentário da função: a regra passou de "buff é livre" para "uma ativação de técnica por rodada é livre, de qualquer modo", por decisão do usuário em 10/09/2026 — 17 das 26 da Fase 2 duram 1 rodada, e sob a regra antiga nasceriam inúteis.

Acrescente:

```js
/* Combate Não Letal impede que o SEU golpe seja crítico. */
function criticoPermitido(atacante) { return !statusTemEfeito(atacante, 'sem_critico'); }
```

Ligue nos dois `aplicarAcao`: onde `critico` é calculado, passe a ser `critico && criticoPermitido(atacante)`.

**`usa_defesa_de` (Escolta):** em `colunaAtaque`, quando o alvo tem esse status com `fonte_inst_id`, use a `defesa_valor` do participante-fonte em vez da própria. Se a fonte não estiver mais em campo, o status é ignorado e a defesa própria vale.

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS, incluindo os testes da Fase 1 sobre PA — a mudança da regra altera o comportamento de `debitarCustoTecnica` para modo teste, então o teste da Fase 1 que verificava "sangramento debita PA" muda de expectativa. **É mudança intencional; ajuste-o e diga isso no relatório.**

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-fase2.test.js src/12-batalha/tecnica-efeitos.test.js
git commit -m "feat(batalha): ativacao livre para qualquer modo, sem_critico e Escolta"
```

---

## Task 8: Fiação final — alvo por técnica e mensagens

**Files:**
- Modify: `src/12-batalha/batalha.jsx` — os dois `aplicarTeste`, `textoEfeitoTecnica`
- Test: `src/12-batalha/tecnica-fase2.test.js` (acrescentar)

**Interfaces:**
- Consumes: `aplicarEfeitoTecnica`, `textoEfeitoTecnica` (Fase 1)
- Produces: efeitos ancorados no atacante passam a gravar `alvo_inst_id`

- [ ] **Step 1: Acrescentar o teste**

```js
describe('efeitos ancorados no atacante gravam o alvo', () => {
  const lutador = () => ({ inst_id: 'a', eh: 10, eh_max: 10, ar: 0, ar_max: 0, ef: 20, ef_max: 20,
    status: 'ativo', status_temp: [], tecnicas_usadas: [] });

  it('Golpe Letal grava alvo_inst_id no efeito do ATACANTE', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'golpe_letal', nome: 'Golpe Letal' }, 0, { alvoInstId: 'b' });
    const ef = p.status_temp.find((s) => s.efeito.tipo === 'ignora_eh').efeito;
    expect(ef.alvo_inst_id).toBe('b');
  });

  it('Desequilibrar grava derrubado no ALVO, sem alvo_inst_id', () => {
    const alvo = M.aplicarEfeitoTecnica({ ...lutador(), inst_id: 'b' }, { key: 'desequilibrar', nome: 'Desequilibrar' }, 0);
    const ef = alvo.status_temp.find((s) => s.efeito.tipo === 'derrubado').efeito;
    expect(ef.alvo_inst_id).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/12-batalha/tecnica-fase2.test.js -t "ancorados no atacante"`
Expected: FAIL — `aplicarEfeitoTecnica` ainda não aceita o 4º argumento.

- [ ] **Step 3: Implementar**

`aplicarEfeitoTecnica(participante, tecnica, valorTotal, opcoes)` ganha um 4º parâmetro opcional `{ alvoInstId }`. Quando presente E o tipo do efeito é `ignora_eh` ou `ignora_armadura`, grava `alvo_inst_id` no efeito. Os demais tipos ignoram.

Nos dois `aplicarTeste`, para técnicas cujos efeitos são desse tipo, o efeito vai no ATOR com `alvoInstId` do alvo escolhido — não no alvo. As de `derrubado`, `sem_atacar`, `sem_tecnicas` e `usa_defesa_de` continuam indo no alvo, como a Fase 1 já faz.

`textoEfeitoTecnica` não muda de assinatura, mas o texto de "efeito aplicado" deve nomear o alvo quando houver — ele já faz isso.

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/12-batalha/batalha.jsx src/12-batalha/tecnica-fase2.test.js
git commit -m "feat(batalha): efeitos de golpe gravam o alvo a que se aplicam"
```

---

## Verificação final

- [ ] `npm test` — suíte inteira verde
- [ ] **`motor-batalha.test.js` sem NENHUMA expectativa alterada** — é a prova de que a cascata não regrediu
- [ ] `npm run lint` — sem erro novo (há 9 pré-existentes, fora do nosso escopo)
- [ ] `npm run build` — passa
- [ ] Teste manual: ativar Golpe Letal num inimigo, atacar, e ver o dano ir direto na AR
- [ ] Teste manual: ativar Esquiva, ser atacado, e ver o golpe anulado e o status sumir
- [ ] Teste manual: ativar Golpe Duplo e conferir que dá para atacar duas vezes na mesma rodada
- [ ] Teste manual: ativar Aparar e conferir que o dano recebido cai 75%
