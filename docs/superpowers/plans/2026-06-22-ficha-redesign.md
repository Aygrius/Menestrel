# Redesign da Ficha do Personagem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a ficha do personagem (`src/11-ficha/`) em layout escuro de 2 colunas (Personagem | Jogo) com o retrato+equipamento como peça central, mais um Modo Combate (HUD), funcionando bem em desktop e mobile.

**Architecture:** Extrair lógica pura (rolagem de dado, mapeamento de slots) para módulos ES testáveis; construir componentes React pequenos e bem delimitados que consomem essa lógica e reaproveitam peças existentes (`FichaVitBars`, `BarEditPopover`, `gerarAtaques`, boneco `FP_BODY_ROWS`/`getSlotsState`, `Dado` da batalha); montar dois layouts (ficha completa e Modo Combate) com CSS grid responsivo; integrar em `FichaPersonagem`.

**Tech Stack:** React 19 (runtime clássico, `window.React`), Vite, Tailwind v4 + CSS em `src/index.css` (classes `.fp2-*`), Vitest + @testing-library/react, ícones Tabler webfont, fontes Cinzel/Lora.

**Referência de design:** `docs/superpowers/specs/2026-06-22-ficha-redesign-design.md` e os mockups em `.superpowers/brainstorm/1690-1782137132/content/` (design-ficha-v5, design-combate-v2).

---

## Convenções deste plano

- **Sem git hoje:** o repo não está sob git. A Task 0 inicializa. Cada "Commit" assume o git já inicializado.
- **Cores/tokens (já em `src/index.css`):** EF `#A23B2F`, EH `#C9A44E`, AR `#6E8AA6`, KA `#9150A0`, `--gold #C9A44E`, `--gold-bright #E6C97A`, `--border #4A3C26`, painel `linear-gradient(180deg,#1f1a12,#15110a)`, `--grad-dragon`. Raio 6px. Ícones `<i className="ti ti-..." />`.
- **Lógica pura em `src/11-ficha/lib/`** (ES modules, sem React) para permitir TDD limpo; componentes React consomem essa lógica.

## Mapa de arquivos

| Arquivo | Cria/Modifica | Responsabilidade |
|---|---|---|
| `vitest.config.ts` | criar | ambiente jsdom + setup testing-library |
| `src/test/setup.ts` | criar | `@testing-library/jest-dom` |
| `src/11-ficha/lib/dado.js` | criar | rolagem pura: tipos de dado, `rolarDado`, `rolarExpressao` |
| `src/11-ficha/lib/dado.test.js` | criar | testes da rolagem |
| `src/11-ficha/lib/equip-slots.js` | criar | mapeia estado de equipamento → slots radiais do retrato |
| `src/11-ficha/lib/equip-slots.test.js` | criar | testes do mapeamento |
| `src/11-ficha/components/DadoCard.jsx` | criar | card de dado (seletor + rolar) |
| `src/11-ficha/components/DadoCard.test.jsx` | criar | teste de render/rolar |
| `src/11-ficha/components/LogRolagens.jsx` | criar | lista de rolagens recentes |
| `src/11-ficha/components/AtributosFaixa.jsx` | criar | faixa compacta de 7 atributos |
| `src/11-ficha/components/RetratoEquipamento.jsx` | criar | retrato + slots ao redor |
| `src/11-ficha/components/RetratoEquipamento.test.jsx` | criar | teste de slots equipado/vazio |
| `src/11-ficha/components/ModoCombate.jsx` | criar | HUD de combate |
| `src/11-ficha/ficha.jsx` | modificar | render reorganizado (2 colunas) + toggle de modo |
| `src/index.css` | modificar | classes `.fk-*` do novo layout (2col, hero, mobile) |

> O projeto usa runtime JSX clássico e `window.React`. Os novos `.jsx` seguem o mesmo padrão dos componentes em `ficha.jsx` (funções que usam `React.useState` global). Antes da Task 7, **leia** `src/11-ficha/ficha.jsx:116-264` (FichaVitBars, BarEditPopover, FpHead) e `src/12-batalha/batalha.jsx:1269-1310` (Dado) para casar os formatos.

---

## Task 0: Setup (git + Vitest)

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`
- Modify: `package.json` (script de teste)

- [ ] **Step 1: Inicializar git e branch**

```bash
cd /c/dev/Menestrel
git init
git add -A
git commit -m "chore: snapshot inicial antes do redesign da ficha"
git checkout -b ficha-redesign
```

- [ ] **Step 2: Criar config do Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Adicionar script de teste**

Modify `package.json` — adicionar em `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Verificar que o runner sobe (sem testes ainda)**

Run: `npx vitest run`
Expected: "No test files found" (exit 0/1, mas sem erro de config)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json
git commit -m "chore: configurar Vitest (jsdom + testing-library)"
```

---

## Task 1: Lógica de rolagem de dado (pura, TDD)

**Files:**
- Create: `src/11-ficha/lib/dado.js`
- Test: `src/11-ficha/lib/dado.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Create `src/11-ficha/lib/dado.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { DICE_TYPES, rolarDado, rolarExpressao } from './dado.js'

describe('rolarDado', () => {
  it('expõe os tipos de dado do sistema', () => {
    expect(DICE_TYPES).toEqual([4, 6, 8, 10, 12, 20, 100])
  })

  it('retorna um valor entre 1 e N (inclusive)', () => {
    for (const faces of DICE_TYPES) {
      for (let i = 0; i < 50; i++) {
        const v = rolarDado(faces)
        expect(v).toBeGreaterThanOrEqual(1)
        expect(v).toBeLessThanOrEqual(faces)
      }
    }
  })

  it('usa o mínimo quando random=0 e o máximo quando random≈1', () => {
    const r0 = vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(rolarDado(20)).toBe(1)
    r0.mockReturnValue(0.999999)
    expect(rolarDado(20)).toBe(20)
    r0.mockRestore()
  })
})

describe('rolarExpressao', () => {
  it('soma N dados e o modificador, devolvendo detalhe', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // todo dado = 1
    const r = rolarExpressao({ n: 2, faces: 6, mod: 3 })
    expect(r.dados).toEqual([1, 1])
    expect(r.total).toBe(5) // 1+1+3
    expect(r.texto).toBe('2d6+3 = 5')
    Math.random.mockRestore()
  })

  it('omite o sinal do modificador quando 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const r = rolarExpressao({ n: 1, faces: 20, mod: 0 })
    expect(r.texto).toBe('1d20 = 1')
    Math.random.mockRestore()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/11-ficha/lib/dado.test.js`
Expected: FAIL ("Cannot find module './dado.js'")

- [ ] **Step 3: Implementar o mínimo**

Create `src/11-ficha/lib/dado.js`:

```js
// Rolagem de dados — lógica pura (sem React), testável isolada.
export const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100]

export function rolarDado(faces) {
  return 1 + Math.floor(Math.random() * faces)
}

// { n, faces, mod } → { dados:[…], total, texto:"NdF±M = T" }
export function rolarExpressao({ n = 1, faces = 20, mod = 0 }) {
  const dados = Array.from({ length: n }, () => rolarDado(faces))
  const total = dados.reduce((s, d) => s + d, 0) + mod
  const sufMod = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : ''
  return { dados, total, texto: `${n}d${faces}${sufMod} = ${total}` }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/11-ficha/lib/dado.test.js`
Expected: PASS (todos)

- [ ] **Step 5: Commit**

```bash
git add src/11-ficha/lib/dado.js src/11-ficha/lib/dado.test.js
git commit -m "feat(ficha): lógica pura de rolagem de dado"
```

---

## Task 2: Mapeamento de slots do retrato (puro, TDD)

O boneco atual (`src/11-ficha/ficha.jsx:293` `FP_BODY_ROWS`, `:949` o render, e o helper `getSlotsState`) descreve regiões do corpo e o que está equipado. Esta lib converte esse estado num array ordenado de slots para posicionar **ao redor do retrato** (8 posições fixas).

**Files:**
- Create: `src/11-ficha/lib/equip-slots.js`
- Test: `src/11-ficha/lib/equip-slots.test.js`

- [ ] **Step 1: Escrever o teste que falha**

Create `src/11-ficha/lib/equip-slots.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { RADIAL_POSITIONS, slotsRadiais } from './equip-slots.js'

const estadoExemplo = {
  cabeca:  { icon: 'ti-helmet', label: 'Cabeça',   item: 'Elmo de aço' },
  maoDir:  { icon: 'ti-sword',  label: 'Mão dir.',  item: 'Espada longa' },
  maoEsq:  { icon: 'ti-shield', label: 'Mão esq.',  item: 'Escudo torre' },
  tronco:  { icon: 'ti-shirt',  label: 'Tronco',    item: 'Cota de malha' },
  cinto:   { icon: 'ti-bottle', label: 'Cinto',     item: 'Bolsa' },
  anelDir: { icon: 'ti-diamond',label: 'Anel',      item: 'Anel de proteção' },
  anelEsq: { icon: 'ti-circle', label: 'Anel',      item: null },          // vazio
  pes:     { icon: 'ti-shoe',   label: 'Pés',       item: 'Botas de couro' },
}

describe('slotsRadiais', () => {
  it('produz 8 slots nas posições fixas, na ordem do anel radial', () => {
    const slots = slotsRadiais(estadoExemplo)
    expect(slots).toHaveLength(8)
    expect(slots.map(s => s.pos)).toEqual(RADIAL_POSITIONS)
  })

  it('marca equipado quando há item e vazio quando não há', () => {
    const slots = slotsRadiais(estadoExemplo)
    const byKey = Object.fromEntries(slots.map(s => [s.key, s]))
    expect(byKey.cabeca.equipped).toBe(true)
    expect(byKey.anelEsq.equipped).toBe(false)
    expect(byKey.cabeca.icon).toBe('ti-helmet')
    expect(byKey.cabeca.item).toBe('Elmo de aço')
  })

  it('é tolerante a chave ausente (slot vazio sem ícone definido)', () => {
    const slots = slotsRadiais({})
    expect(slots).toHaveLength(8)
    expect(slots.every(s => s.equipped === false)).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/11-ficha/lib/equip-slots.test.js`
Expected: FAIL ("Cannot find module './equip-slots.js'")

- [ ] **Step 3: Implementar o mínimo**

Create `src/11-ficha/lib/equip-slots.js`:

```js
// Converte o estado de equipamento (do boneco existente) em 8 slots
// posicionados ao redor do retrato. Posições fixas (sentido horário a partir
// do topo). A ORDEM e as chaves casam com o layout do RetratoEquipamento.
export const RADIAL_POSITIONS = [
  'top', 'left-up', 'right-up', 'left-mid',
  'right-mid', 'bottom-left', 'bottom-right', 'bottom',
]

const ORDEM = [
  ['cabeca',  'top'],
  ['maoDir',  'left-up'],
  ['maoEsq',  'right-up'],
  ['tronco',  'left-mid'],
  ['cinto',   'right-mid'],
  ['anelDir', 'bottom-left'],
  ['anelEsq', 'bottom-right'],
  ['pes',     'bottom'],
]

const ICONE_PADRAO = {
  cabeca: 'ti-helmet', maoDir: 'ti-sword', maoEsq: 'ti-shield',
  tronco: 'ti-shirt', cinto: 'ti-bottle', anelDir: 'ti-diamond',
  anelEsq: 'ti-circle', pes: 'ti-shoe',
}

export function slotsRadiais(estado = {}) {
  return ORDEM.map(([key, pos], i) => {
    const s = estado[key] || {}
    return {
      key,
      pos: RADIAL_POSITIONS[i],
      label: s.label || key,
      icon: s.icon || ICONE_PADRAO[key] || 'ti-square',
      item: s.item ?? null,
      equipped: !!s.item,
    }
  })
}
```

> **Nota de integração (Task 7):** o adaptador que monta `estado` a partir de
> `getSlotsState(pj)`/`FP_BODY_ROWS` será escrito ao ligar o componente real —
> esta lib só depende do formato `{ key: { icon, label, item } }`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/11-ficha/lib/equip-slots.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/11-ficha/lib/equip-slots.js src/11-ficha/lib/equip-slots.test.js
git commit -m "feat(ficha): mapeamento de slots radiais do retrato"
```

---

## Task 3: Componente DadoCard

**Files:**
- Create: `src/11-ficha/components/DadoCard.jsx`
- Test: `src/11-ficha/components/DadoCard.test.jsx`

- [ ] **Step 1: Escrever o teste que falha**

Create `src/11-ficha/components/DadoCard.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DadoCard } from './DadoCard.jsx'

describe('DadoCard', () => {
  it('mostra o seletor de tipos e o resultado inicial vazio', () => {
    render(<DadoCard onRoll={() => {}} />)
    expect(screen.getByRole('button', { name: /d20/i })).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('rola o dado selecionado e chama onRoll com o resultado', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // sempre 1
    const onRoll = vi.fn()
    render(<DadoCard onRoll={onRoll} />)
    fireEvent.click(screen.getByRole('button', { name: /^rolar/i }))
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(onRoll.mock.calls[0][0]).toMatchObject({ total: 1, texto: '1d20 = 1' })
    Math.random.mockRestore()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/11-ficha/components/DadoCard.test.jsx`
Expected: FAIL ("Cannot find module './DadoCard.jsx'")

- [ ] **Step 3: Implementar o mínimo**

Create `src/11-ficha/components/DadoCard.jsx`:

```jsx
import { DICE_TYPES, rolarExpressao } from '../lib/dado.js'

const R = (typeof window !== 'undefined' && window.React) ? window.React : require('react')

export function DadoCard({ onRoll }) {
  const [faces, setFaces] = R.useState(20)
  const [mod, setMod] = R.useState(0)
  const [ultimo, setUltimo] = R.useState(null)

  const rolar = () => {
    const r = rolarExpressao({ n: 1, faces, mod })
    setUltimo(r)
    onRoll && onRoll(r)
  }

  return (
    <div className="fp2-panel fk-dado">
      <header className="fp2-panel-head"><i className="ti ti-dice" /><h3>Dado</h3>
        <span className="fk-sp">rolagem avulsa</span></header>
      <div className="fk-dado-body">
        <div className="fk-die"><span className="fk-die-n">{ultimo ? ultimo.total : '—'}</span></div>
        <div className="fk-dado-ctrl">
          <div className="fk-dchips">
            {DICE_TYPES.map((d) => (
              <button key={d} className={'fk-dchip' + (faces === d ? ' on' : '')}
                onClick={() => setFaces(d)}>d{d}</button>
            ))}
            <button className={'fk-dchip' + (mod ? ' on' : '')}
              onClick={() => setMod((m) => (m + 1) % 6)}>+{mod}</button>
          </div>
          <button className="fk-roll-big" onClick={rolar}>
            <i className="ti ti-dice" /> Rolar 1d{faces}{mod ? `+${mod}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
```

> O `require('react')` é só para o ambiente de teste (jsdom); em runtime o app usa `window.React`. Se o projeto não resolver `require`, troque por `import * as React from 'react'` no topo e use `React.useState` — confirme o padrão lendo um componente existente de `ficha.jsx`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/11-ficha/components/DadoCard.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/11-ficha/components/DadoCard.jsx src/11-ficha/components/DadoCard.test.jsx
git commit -m "feat(ficha): componente DadoCard (seletor d4–d100 + rolar)"
```

---

## Task 4: CSS do novo layout

**Files:**
- Modify: `src/index.css` (acrescentar bloco `/* ===== Ficha redesign (.fk-*) ===== */` ao final, dentro de `.menestrel-ui`)

- [ ] **Step 1: Acrescentar as classes do layout**

Append em `src/index.css` (todas escopadas em `#root .menestrel-ui`):

```css
/* ===== Ficha redesign (.fk-*) ===== */
#root .menestrel-ui .fk-sheet { font-family: 'Lora', serif; color: var(--foreground); }
#root .menestrel-ui .fk-topbar { display:flex; align-items:center; gap:14px; padding:0 2px 10px; }
#root .menestrel-ui .fk-name { font-family:'Cinzel',serif; font-weight:700; font-size:18px; color:var(--gold-bright); }
#root .menestrel-ui .fk-sub { font-size:12px; color:#9C8F73; font-style:italic; }
#root .menestrel-ui .fk-actions { margin-left:auto; display:flex; gap:8px; align-items:center; }
#root .menestrel-ui .fk-iconbtn { height:36px; width:36px; display:grid; place-items:center; border:1px solid var(--border); background:linear-gradient(180deg,#231b11,#17110a); border-radius:6px; color:#9C8F73; font-size:17px; cursor:pointer; }
#root .menestrel-ui .fk-iconbtn.primary { border-color:var(--gold); color:#1C1407; background:linear-gradient(180deg,#D8B25C,#a9842f); box-shadow:0 2px 0 rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25); font-size:18px; }
/* 2 colunas desktop */
#root .menestrel-ui .fk-cols { display:grid; grid-template-columns:0.92fr 1.08fr; gap:12px; align-items:start; }
#root .menestrel-ui .fk-col { display:flex; flex-direction:column; gap:10px; }
/* hero retrato + slots */
#root .menestrel-ui .fk-portrait { position:relative; margin:8px auto 4px; width:54%; aspect-ratio:3/4; border-radius:6px; background:radial-gradient(120% 80% at 50% 18%,#3a2c18,#140e07); border:1px solid var(--gold); box-shadow:inset 0 0 0 4px rgba(20,14,7,.6), inset 0 0 44px rgba(0,0,0,.6), 0 0 26px rgba(201,164,78,.13); display:grid; place-items:center; }
#root .menestrel-ui .fk-slot { position:absolute; width:40px; height:40px; border-radius:6px; border:1px solid var(--border); background:linear-gradient(180deg,#241b10,#15100a); display:grid; place-items:center; font-size:17px; color:#9C8F73; z-index:2; }
#root .menestrel-ui .fk-slot.eq { border-color:var(--gold); color:var(--gold-bright); box-shadow:0 0 0 1px rgba(201,164,78,.3), 0 0 10px rgba(201,164,78,.18); }
#root .menestrel-ui .fk-slot.top{top:-7px;left:50%;transform:translateX(-50%)}
#root .menestrel-ui .fk-slot.left-up{top:40px;left:-20px}
#root .menestrel-ui .fk-slot.right-up{top:40px;right:-20px}
#root .menestrel-ui .fk-slot.left-mid{top:108px;left:-20px}
#root .menestrel-ui .fk-slot.right-mid{top:108px;right:-20px}
#root .menestrel-ui .fk-slot.bottom-left{bottom:40px;left:-20px}
#root .menestrel-ui .fk-slot.bottom-right{bottom:40px;right:-20px}
#root .menestrel-ui .fk-slot.bottom{bottom:-7px;left:50%;transform:translateX(-50%)}
/* faixa de atributos */
#root .menestrel-ui .fk-attrs { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; text-align:center; }
#root .menestrel-ui .fk-attrs .a { background:#16110a; border:1px solid var(--border); border-radius:6px; padding:6px 2px; }
#root .menestrel-ui .fk-attrs .a span { display:block; font-size:9.5px; color:#9C8F73; text-transform:uppercase; }
#root .menestrel-ui .fk-attrs .a b { font-family:'Cinzel'; font-size:15px; color:var(--gold-bright); }
/* card de dado */
#root .menestrel-ui .fk-dado-body { display:flex; gap:14px; align-items:center; }
#root .menestrel-ui .fk-die { width:74px; height:74px; border-radius:8px; background:linear-gradient(160deg,#2a2114,#15100a); border:1px solid var(--gold); box-shadow:inset 0 0 18px rgba(0,0,0,.6),0 0 16px rgba(201,164,78,.15); display:grid; place-items:center; }
#root .menestrel-ui .fk-die-n { font-family:'Cinzel'; font-weight:700; font-size:32px; color:var(--gold-bright); }
#root .menestrel-ui .fk-dado-ctrl { flex:1; }
#root .menestrel-ui .fk-dchips { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-bottom:6px; }
#root .menestrel-ui .fk-dchip { font-family:'Cinzel'; font-size:12px; color:#9C8F73; border:1px solid var(--border); border-radius:6px; padding:5px 0; cursor:pointer; background:transparent; }
#root .menestrel-ui .fk-dchip.on { border-color:var(--gold); color:var(--gold-bright); background:rgba(201,164,78,.1); }
#root .menestrel-ui .fk-roll-big { width:100%; height:34px; display:flex; align-items:center; justify-content:center; gap:7px; background:linear-gradient(180deg,#D8B25C,#a9842f); color:#1C1407; font-family:'Cinzel'; font-weight:700; font-size:12px; text-transform:uppercase; border-radius:6px; cursor:pointer; border:0; }
#root .menestrel-ui .fk-sp { margin-left:auto; font-size:11px; color:#9C8F73; font-style:italic; }
/* mobile: uma coluna */
@media (max-width: 960px) {
  #root .menestrel-ui .fk-cols { grid-template-columns:1fr; }
  #root .menestrel-ui .fk-vitais-fixos { position:sticky; top:0; z-index:30; }
  #root .menestrel-ui .fk-portrait { width:58%; }
}
```

- [ ] **Step 2: Verificar build do CSS**

Run: `npx vite build`
Expected: build conclui sem erro de CSS.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(ficha): CSS do novo layout (.fk-*) desktop + mobile"
```

---

## Task 5: Componentes presentacionais pequenos

**Files:**
- Create: `src/11-ficha/components/AtributosFaixa.jsx`, `src/11-ficha/components/LogRolagens.jsx`

- [ ] **Step 1: AtributosFaixa**

Create `src/11-ficha/components/AtributosFaixa.jsx`:

```jsx
const R = (typeof window !== 'undefined' && window.React) ? window.React : require('react')

// atributos: { intelecto, aura, carisma, forca, fisico, agilidade, percepcao }
const ORDEM = [
  ['Int', 'intelecto'], ['Aur', 'aura'], ['Car', 'carisma'], ['For', 'forca'],
  ['Fis', 'fisico'], ['Agi', 'agilidade'], ['Per', 'percepcao'],
]

export function AtributosFaixa({ atributos = {} }) {
  return (
    <div className="fk-attrs">
      {ORDEM.map(([abrev, key]) => (
        <div className="a" key={key}><span>{abrev}</span><b>{atributos[key] ?? '—'}</b></div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: LogRolagens**

Create `src/11-ficha/components/LogRolagens.jsx`:

```jsx
const R = (typeof window !== 'undefined' && window.React) ? window.React : require('react')

// rolagens: [{ origem, detalhe, resultado }]
export function LogRolagens({ rolagens = [] }) {
  return (
    <div className="fp2-panel">
      <header className="fp2-panel-head"><i className="ti ti-dice-5" /><h3>Log de rolagens</h3></header>
      {rolagens.length === 0 && <div className="fk-sub">Sem rolagens ainda.</div>}
      {rolagens.map((r, i) => (
        <div className="fk-logline" key={i}>
          <span><span style={{ color: 'var(--gold)' }}>{r.origem}</span> · {r.detalhe}</span>
          <span style={{ fontFamily: 'Cinzel', color: 'var(--gold-bright)' }}>{r.resultado}</span>
        </div>
      ))}
    </div>
  )
}
```

Append ao bloco CSS (Task 4) em `src/index.css`:

```css
#root .menestrel-ui .fk-logline { display:flex; justify-content:space-between; font-size:12px; padding:6px 2px; border-bottom:1px solid rgba(74,60,38,.4); }
#root .menestrel-ui .fk-logline:last-child { border-bottom:0; }
```

- [ ] **Step 3: Verificar build**

Run: `npx vite build`
Expected: conclui sem erro.

- [ ] **Step 4: Commit**

```bash
git add src/11-ficha/components/AtributosFaixa.jsx src/11-ficha/components/LogRolagens.jsx src/index.css
git commit -m "feat(ficha): AtributosFaixa e LogRolagens"
```

---

## Task 6: RetratoEquipamento

**Files:**
- Create: `src/11-ficha/components/RetratoEquipamento.jsx`
- Test: `src/11-ficha/components/RetratoEquipamento.test.jsx`

- [ ] **Step 1: Escrever o teste que falha**

Create `src/11-ficha/components/RetratoEquipamento.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { RetratoEquipamento } from './RetratoEquipamento.jsx'

const estado = {
  cabeca: { icon: 'ti-helmet', label: 'Cabeça', item: 'Elmo' },
  anelEsq: { icon: 'ti-circle', label: 'Anel', item: null },
}

describe('RetratoEquipamento', () => {
  it('renderiza 8 slots; equipados levam a classe eq, vazios não', () => {
    const { container } = render(
      <RetratoEquipamento nome="Thaddeus" epiteto="o Bravo" estadoEquip={estado} />
    )
    const slots = container.querySelectorAll('.fk-slot')
    expect(slots).toHaveLength(8)
    expect(container.querySelector('.fk-slot.top').classList.contains('eq')).toBe(true)
    expect(container.querySelector('.fk-slot.bottom-right').classList.contains('eq')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/11-ficha/components/RetratoEquipamento.test.jsx`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementar**

Create `src/11-ficha/components/RetratoEquipamento.jsx`:

```jsx
import { slotsRadiais } from '../lib/equip-slots.js'

const R = (typeof window !== 'undefined' && window.React) ? window.React : require('react')

export function RetratoEquipamento({ nome, epiteto, fotoUrl, estadoEquip, armadura, onTrocarFoto }) {
  const slots = slotsRadiais(estadoEquip || {})
  return (
    <div className="fp2-panel fk-hero">
      <header className="fp2-panel-head"><i className="ti ti-shield-bolt" /><h3>Equipamento</h3>
        {armadura != null && <span className="fk-sp">Armadura {armadura}</span>}</header>
      <div className="fk-portrait" style={fotoUrl ? { backgroundImage: `url(${fotoUrl})`, backgroundSize: 'cover' } : undefined}>
        {!fotoUrl && <i className="ti ti-user-shield" style={{ fontSize: 130, color: 'rgba(201,164,78,.18)' }} />}
        <div className="fk-who">
          <div className="fk-who-nm">{nome}</div>
          {epiteto && <div className="fk-who-sub">{epiteto}</div>}
        </div>
        {slots.map((s) => (
          <div key={s.key} className={'fk-slot ' + s.pos + (s.equipped ? ' eq' : '')}
               title={`${s.label}${s.item ? ' · ' + s.item : ' — vazio'}`}>
            <i className={'ti ' + s.icon} />
          </div>
        ))}
      </div>
      <div className="fk-hero-foot">
        <span onClick={onTrocarFoto}><i className="ti ti-camera" /> trocar foto</span>
      </div>
    </div>
  )
}
```

Append CSS em `src/index.css`:

```css
#root .menestrel-ui .fk-who { position:absolute; bottom:9px; left:0; right:0; text-align:center; }
#root .menestrel-ui .fk-who-nm { font-family:'Cinzel'; font-weight:700; color:var(--gold-bright); font-size:18px; text-shadow:0 1px 6px #000; }
#root .menestrel-ui .fk-who-sub { font-style:italic; color:#cdbf9d; font-size:11px; text-shadow:0 1px 4px #000; }
#root .menestrel-ui .fk-hero-foot { display:flex; justify-content:center; gap:16px; margin-top:16px; font-size:11.5px; color:#9C8F73; font-style:italic; cursor:pointer; }
#root .menestrel-ui .fk-hero-foot i { color:var(--gold); }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/11-ficha/components/RetratoEquipamento.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/11-ficha/components/RetratoEquipamento.jsx src/11-ficha/components/RetratoEquipamento.test.jsx src/index.css
git commit -m "feat(ficha): RetratoEquipamento com slots radiais"
```

---

## Task 7: Adaptador de equipamento + ModoCombate

Liga o estado real do personagem ao formato das libs e monta o HUD.

**Files:**
- Create: `src/11-ficha/components/ModoCombate.jsx`
- Modify: `src/11-ficha/ficha.jsx` (exportar/expor um helper `estadoEquipParaSlots(pj)` perto de `getSlotsState`)

- [ ] **Step 1: Adaptador no ficha.jsx**

Em `src/11-ficha/ficha.jsx`, **leia** `getSlotsState` e `FP_BODY_ROWS` (linhas ~293–960) e adicione uma função que devolve o formato `{ key: { icon, label, item } }` esperado por `slotsRadiais`. Mapeie as regiões do corpo para as chaves `cabeca/maoDir/maoEsq/tronco/cinto/anelDir/anelEsq/pes`. Exemplo de assinatura:

```js
// retorna { cabeca:{icon,label,item}, maoDir:{...}, ... } a partir do pj/slots atuais
function estadoEquipParaSlots(pj, slotsState) {
  const map = {
    cabeca: 'cabeca', tronco: 'tronco', maoDir: 'maoDir', maoEsq: 'maoEsq',
    cinto: 'cinto', anelDir: 'anelDir', anelEsq: 'anelEsq', pes: 'pes',
  }
  const out = {}
  for (const [destino, origem] of Object.entries(map)) {
    const slot = slotsState?.[origem]
    out[destino] = {
      icon: slot?.iconClass || undefined,
      label: slot?.label || destino,
      item: slot?.itemNome || null,
    }
  }
  return out
}
```

> Ajuste os nomes (`iconClass`, `itemNome`, chaves de `slotsState`) ao formato real após ler `getSlotsState`. Exponha `estadoEquipParaSlots` no escopo do arquivo (e em `window` se as fases precisarem).

- [ ] **Step 2: ModoCombate**

Create `src/11-ficha/components/ModoCombate.jsx`:

```jsx
import { DadoCard } from './DadoCard.jsx'
import { LogRolagens } from './LogRolagens.jsx'

const R = (typeof window !== 'undefined' && window.React) ? window.React : require('react')

// Props:
//  pj, vitBars (mesmo formato de FichaVitBars), ataques (gerarAtaques),
//  capacidades [{ nome, tipo, detalhe }], iniciativa, onSair, onEditarBarra
export function ModoCombate({ nome, iniciativa, vitalidadeSlot, ataques = [], capacidades = [], onSair }) {
  const [log, setLog] = R.useState([])
  const registrar = (origem, detalhe, resultado) =>
    setLog((l) => [{ origem, detalhe, resultado }, ...l].slice(0, 12))

  return (
    <div className="fk-sheet fk-combate">
      <div className="fk-combate-head">
        <span className="fk-combate-tag"><i className="ti ti-swords" /> Modo Combate</span>
        <span className="fk-name" style={{ fontSize: 16 }}>{nome}</span>
        <span className="fk-init"><i className="ti ti-bolt" /> Iniciativa {iniciativa}</span>
        <div className="fk-actions">
          <span className="fk-exit"><i className="ti ti-maximize" /> Tela cheia</span>
          <span className="fk-exit" onClick={onSair}><i className="ti ti-arrow-back-up" /> Ficha completa</span>
        </div>
      </div>
      <div className="fk-cols">
        <div className="fk-col">
          {vitalidadeSlot /* <VitalidadePanel> com as 4 barras iguais, clique edita */}
          <DadoCard onRoll={(r) => registrar('Dado', `1d${r.dados.length ? r.texto.split(' = ')[0] : ''}`, r.total)} />
          <LogRolagens rolagens={log} />
        </div>
        <div className="fk-col">
          <div className="fp2-panel">
            <header className="fp2-panel-head"><i className="ti ti-swords" /><h3>Ataques</h3></header>
            {ataques.map((a, i) => (
              <div className="fk-act" key={i}>
                <i className={'ti ' + (a.icon || 'ti-sword')} />
                <div><div>{a.nome}</div><div className="fk-sub">{a.dano} · iniciativa {a.iniciativa} · {a.alcance}</div></div>
                <button className="fk-roll" onClick={() => registrar(a.nome, 'dano', a.dano)}>
                  <i className="ti ti-dice" /> Rolar</button>
              </div>
            ))}
          </div>
          <div className="fp2-panel">
            <header className="fp2-panel-head"><i className="ti ti-masks-theater" /><h3>Capacidades ativas</h3></header>
            {capacidades.map((c, i) => (
              <div className="fk-act" key={i}>
                <i className={'ti ' + (c.icon || 'ti-sparkles')} />
                <div><div>{c.nome}</div><div className="fk-sub">{c.tipo} · {c.detalhe}</div></div>
                <button className="fk-use" onClick={() => registrar(c.nome, c.tipo, '—')}>
                  <i className="ti ti-sparkles" /> Usar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

Append CSS em `src/index.css` (use os mesmos valores do mockup `design-combate-v2.html`: `.fk-combate-head`, `.fk-combate-tag` (vermelho `#B8472F`), `.fk-init`, `.fk-exit`, `.fk-act`, `.fk-roll`, `.fk-use`). Copie as regras `.act/.roll/.use/.init/.exit` do mockup trocando o prefixo para `.fk-`.

- [ ] **Step 3: Verificar build**

Run: `npx vite build`
Expected: conclui sem erro.

- [ ] **Step 4: Commit**

```bash
git add src/11-ficha/components/ModoCombate.jsx src/11-ficha/ficha.jsx src/index.css
git commit -m "feat(ficha): HUD Modo Combate + adaptador de equipamento"
```

---

## Task 8: Reorganizar o render da ficha (2 colunas + toggle)

**Files:**
- Modify: `src/11-ficha/ficha.jsx` (o JSX de `FichaPersonagem`, a partir de ~`:1200`)

- [ ] **Step 1: Estado de modo + montagem**

Dentro de `FichaPersonagem`, adicione `const [modo, setModo] = React.useState('completa')`. Substitua o corpo de render por:

```jsx
// dados já existentes no componente: pj, ficha, ataques (gerarAtaques),
// vitBars (FichaVitBars), slotsState, etc.
const slotsEquip = estadoEquipParaSlots(pj, slotsState)
const vitalidadePanel = (
  <div className="fp2-panel">
    <header className="fp2-panel-head"><i className="ti ti-heart-rate-monitor" /><h3>Vitalidade</h3></header>
    <FichaVitBars bars={vitBars} showValue scope="ficha" onEdit={abrirEdicaoBarra} en={en} />
  </div>
)

if (modo === 'combate') {
  return (
    <ModoCombate
      nome={pj.nome} iniciativa={ficha.iniciativa}
      vitalidadeSlot={vitalidadePanel}
      ataques={ataques} capacidades={capacidadesAtivas}
      onSair={() => setModo('completa')}
    />
  )
}

return (
  <div className="fk-sheet">
    <div className="fk-topbar">
      <span className="fk-name">{pj.nome}</span>
      <span className="fk-sub">{pj.profissao} · {pj.raca} · Nível {ficha.nivel}</span>
      <span className="fk-sub"><i className="ti ti-run" /> Velocidade {ficha.velocidade}</span>
      <div className="fk-actions">
        <span className="fk-iconbtn primary" title="Modo Combate" onClick={() => setModo('combate')}><i className="ti ti-swords" /></span>
        <span className="fk-iconbtn" title="Editar" onClick={onEditar}><i className="ti ti-edit" /></span>
        <span className="fk-iconbtn" title="Tela cheia"><i className="ti ti-maximize" /></span>
      </div>
    </div>
    <div className="fk-cols">
      <div className="fk-col">
        <RetratoEquipamento nome={pj.nome} epiteto={pj.epiteto} fotoUrl={pj.foto_url}
          estadoEquip={slotsEquip} armadura={ficha.armadura} onTrocarFoto={abrirUploadFoto} />
        <AtributosFaixa atributos={ficha.atributos} />
      </div>
      <div className="fk-col">
        {vitalidadePanel}
        {/* ArsenalPanel: tabela de `ataques` no estilo .fp2-panel */}
        {/* CapacidadesPanel: sub-abas Habilidades/Magias/Técnicas (estado existente) */}
      </div>
    </div>
  </div>
)
```

> Os nomes `vitBars`, `abrirEdicaoBarra`, `slotsState`, `capacidadesAtivas`, `abrirUploadFoto`, `ficha.*` devem ser casados aos reais já presentes em `FichaPersonagem` (leia o componente). Arsenal e Capacidades reaproveitam o markup atual da aba "Ficha"/"Capacidades", apenas movidos para a coluna direita com a classe `.fp2-panel`.

- [ ] **Step 2: Importar os novos componentes**

No topo de `ficha.jsx` (ou via `main.tsx`, conforme o padrão das fases), garanta que `RetratoEquipamento`, `AtributosFaixa`, `ModoCombate` estão disponíveis. Se as fases usam globais, importe os `.jsx` em `src/main.tsx` antes de `./11-ficha/ficha.jsx`.

- [ ] **Step 3: Rodar o app e verificar visualmente (desktop)**

Run: `npx vite` (abrir o app, entrar numa ficha)
Expected: 2 colunas; retrato com slots à esquerda; vitalidade/arsenal/capacidades à direita; botão da espada abre o Modo Combate; "Ficha completa" volta.

- [ ] **Step 4: Verificar mobile**

No devtools, largura ~390px.
Expected: coluna única; vitais no topo; retrato; atributos; arsenal; capacidades. Slots sem sobreposição.

- [ ] **Step 5: Rodar a suíte e commitar**

Run: `npx vitest run`
Expected: PASS (todos os testes das libs/componentes)

```bash
git add src/11-ficha/ficha.jsx src/main.tsx
git commit -m "feat(ficha): layout 2 colunas + toggle Modo Combate"
```

---

## Task 9: Polimento e verificação final

**Files:**
- Modify: `src/index.css`, `src/11-ficha/ficha.jsx` (ajustes finos)

- [ ] **Step 1: Conferir fidelidade visual** contra os mockups `design-ficha-v5.html` e `design-combate-v2.html`: tipografia (Cinzel/Lora), raio 6px, ícones Tabler, linha-dragão nos painéis, cores das barras.

- [ ] **Step 2: Estados de borda** — ficha sem foto (mostra silhueta), slots todos vazios, personagem sem magias/técnicas (capacidades vazias), log vazio. Verificar que nada quebra.

- [ ] **Step 3: Rodar tudo**

Run: `npx vitest run && npx vite build`
Expected: testes PASS, build OK.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "polish(ficha): fidelidade visual e estados de borda"
```

---

## Auto-revisão (cobertura do spec)

- §3 Ficha completa (desktop 2col + mobile) → Tasks 4, 8 ✓
- §3 Retrato+equipamento central → Tasks 2, 6, 7 ✓
- §3 Atributos discreto → Task 5 ✓
- §3 Vitalidade/Arsenal/Capacidades → Task 8 (reuso `FichaVitBars`/`gerarAtaques`) ✓
- §4 Modo Combate (barras iguais, Dado, Ataques/Capacidades, Log) → Tasks 1, 3, 7 ✓
- §4 Botão Combate só-ícone → Task 8 ✓
- §5 Componentes isolados → Tasks 1–7 ✓
- §6 Estado (modo, dado, log) → Tasks 7, 8 ✓
- §7 Responsividade → Tasks 4, 8 ✓
- §8 Fora de escopo (resolução de combate, design-sync, persistência do log) → não implementado, por design ✓
- §9 Testes → Tasks 1, 2, 3, 6 ✓

**Riscos conhecidos a confirmar na execução:** formato real de `getSlotsState`/`slotsState` (Task 7 Step 1) e padrão de import dos `.jsx` nas fases (Task 8 Step 2) — ambos exigem ler o código existente antes de codar.
