# Redesign da Ficha do Personagem — Design

**Data:** 2026-06-22
**Tela:** `src/11-ficha/ficha.jsx` (+ `ficha.p3.jsx`) — sistema Tagmar
**Status:** aprovado para implementação (via brainstorming com mockups)

## 1. Contexto e objetivo

A ficha é a tela mais importante do Menestrel: é onde o jogador controla e
consulta o personagem durante o jogo. O layout atual divide tudo em abas
(Ficha · Capacidades · Inventário · Loja), escondendo informação crítica de
combate atrás de troca de aba. O objetivo é um layout coeso, bem-acabado, que
funcione bem no **desktop (principal)** e no **mobile (consulta rápida)**, com o
**retrato + equipamento como peça central** e acesso permanente a Vitalidade,
Arsenal e Capacidades.

Decisões fechadas no brainstorming:

- **Dispositivo:** desktop é o principal; mobile precisa funcionar bem para consulta.
- **Sempre visível durante o jogo:** Vitalidade + estados, Arsenal, Capacidades.
- **Peça central:** o retrato do personagem com os slots de equipamento ao redor.
- **Direção visual:** escuro "Pedra & Bronze" (consistente com o app).

## 2. Linguagem visual (a verdadeira do app)

Fonte da verdade: `src/index.css` (classes `.fp2-*`, `.fp-*`, `.ms-*`), **não** o
kit shadcn em `src/components/ui`.

- **Tipografia:** Cinzel (nomes, títulos de painel em versalete) + Lora
  (corpo, labels em itálico). `--font-body` (Plus Jakarta) é resíduo do kit
  shadcn — não usar.
- **Raio:** 6px em tudo.
- **Ícones:** Tabler (`<i className="ti ti-...">`), nunca emoji.
- **Painéis:** `.fp2-panel` — gradiente `#1f1a12→#15110a`, borda `#4A3C26`, raio
  6px, linha-dragão (`--grad-dragon`) de 2px no topo.
- **Cores de vitalidade (já no código, `FICHA_VIT_COLORS`):** EF `#A23B2F`,
  EH `#C9A44E`, AR `#6E8AA6`, KA `#9150A0`. Ouro `--gold #C9A44E` / `--gold-bright #E6C97A`.

## 3. Ficha completa — layout

### Desktop (2 colunas, sob uma barra de topo)

- **Barra de topo:** nome (Cinzel) · classe/raça/nível (Lora itálico) ·
  Velocidade · botões **só-ícone**: ⚔ Modo Combate (primário, dourado), editar,
  tela cheia.
- **Coluna esquerda — "Personagem":**
  - **Hero: retrato emoldurado + equipamento.** O retrato (foto do jogador) com
    os slots de equipamento dispostos ao redor (cabeça em cima, mãos nas
    laterais, tronco/cinto no meio, anéis e pés embaixo). Slot equipado = dourado;
    vazio = apagado. Reaproveita os dados do boneco atual (`FP_BODY_ROWS`,
    `FP_REGION_ICON`, `getSlotsState`) num novo arranjo ao redor da foto.
  - **Atributos:** faixa compacta de 7 células (Int/Aur/Car/For/Fis/Agi/Per) —
    presença discreta, sem painel grande.
- **Coluna direita — "Jogo":**
  - **Vitalidade:** 4 barras (EF/EH/AR/KA) em grade 2×2, clique-para-editar
    (reaproveita `FichaVitBars` + `BarEditPopover`).
  - **Arsenal:** tabela de ataques (reaproveita `gerarAtaques`).
  - **Capacidades:** sub-abas Habilidades · Magias · Técnicas.

### Mobile (uma coluna, ordenada por uso)

Barra de vitais fixa no topo (nome + 4 barras compactas 2×2 + botão Combate) →
retrato+equipamento (escalado) → faixa de atributos → Arsenal → Capacidades.

### Secundário

Inventário e Loja **não** ficam na ficha de jogo: continuam acessíveis a partir
da barra de topo, como telas próprias (como hoje), fora do fluxo de combate.

## 4. Modo Combate — HUD

Aberto pelo botão da espada; foco no turno. Sai com "Ficha completa".

- **Cabeçalho:** indicador ⚔ Modo Combate · nome · **Iniciativa** em destaque ·
  botões Tela cheia / Ficha completa.
- **Vitalidade:** as 4 barras **com o mesmo peso** (EF sem destaque especial),
  clique-para-editar. Sem steppers/trilho de cura.
- **Card de Dado:** dado grande com resultado, seletor de tipo
  (d4 · d6 · d8 · d10 · d12 · d20 · d100 · +mod) e botão Rolar. Generaliza o
  componente `Dado` existente em `src/12-batalha/batalha.jsx` (hoje só d20).
- **Ataques:** linhas acionáveis com botão **Rolar** (usa `gerarAtaques`).
- **Capacidades ativas:** magias/habilidades/técnicas usáveis no turno (Usar/Testar).
- **Log de rolagens:** histórico recente (dado avulso + ataques + testes).

Mobile: coluna única — Vitalidade → Card de Dado → Ataques → Capacidades → Log (recolhível).

## 5. Componentes (isolamento)

Cada unidade com um propósito claro, testável isolada. Reuso máximo do que já existe.

| Componente | Novo/Reuso | Responsabilidade |
|---|---|---|
| `FichaLayout` | novo (orquestrador) | escolhe ficha-completa vs modo-combate; provê `pj`/dados |
| `PersonagemColuna` | novo (composição) | hero retrato+equip + faixa de atributos |
| `RetratoEquipamento` | novo (restyle do boneco) | foto + slots ao redor; usa `FP_BODY_ROWS`/`getSlotsState` |
| `AtributosFaixa` | novo (pequeno) | 7 células compactas |
| `VitalidadePanel` | reuso | `FichaVitBars` + `BarEditPopover` |
| `ArsenalPanel` | reuso | `gerarAtaques` → tabela |
| `CapacidadesPanel` | reuso | sub-abas Hab/Mag/Téc |
| `ModoCombate` | novo | HUD: Vitalidade + Dado + Ataques + Capacidades + Log |
| `DadoCard` | novo (generaliza `Dado` de batalha) | seletor d4–d100 + mod, rolar |
| `LogRolagens` | novo (pequeno) | lista de resultados recentes |

**Melhoria de código pontual (no escopo):** `ficha.jsx`/`ficha.p3.jsx` têm ~1600
linhas cada. Extrair os painéis acima para componentes próprios e bem
delimitados durante o redesign (sem refatorar o que não toca a tela).

## 6. Dados e estado

- Dados já carregados por `FichaPersonagem` (Supabase: `personagens`, `itens`,
  `magias`, `tecnicas`, `habilidades`). O redesign é majoritariamente
  apresentacional sobre os mesmos dados.
- **Novo estado:** modo de exibição (`completa` | `combate`); estado do Card de
  Dado (tipo + mod + último resultado); log de rolagens (lista em memória da
  sessão — persistência fica fora do escopo inicial).
- Edição de vitais continua via `BarEditPopover` → update no Supabase (fluxo atual).

## 7. Responsividade

- Breakpoint único ficha-completa: ≥ ~960px = 2 colunas; abaixo = coluna única
  (ordem da §3 mobile). Grid CSS, sem JS de layout.
- A barra de vitais vira fixa no topo no mobile.
- Retrato escala por largura (%); slots reposicionam proporcionalmente.

## 8. Fora de escopo (follow-ups)

- **Resolução completa de combate** (acerto vs. defesa do alvo, aplicar dano no
  inimigo): o "Rolar/Usar" do HUD **rola e registra no log**; a mecânica de
  resolução contra alvos permanece no módulo `12-batalha`. Integração mais
  profunda entre Modo Combate e Batalha é um passo futuro.
- **Correção do design-sync:** os componentes em `src/components/ui` (shadcn,
  Plus Jakarta, `rounded-none`) não refletem a cara real do app. Alinhar esse kit
  (ou o conventions header sincronizado) ao Cinzel/Lora/6px/Tabler é uma tarefa
  separada.
- Persistência do log de rolagens entre sessões.

## 9. Testes e riscos

- **Testes:** unidade para `DadoCard` (faixas de cada tipo de dado, +mod) e para
  o restyle do boneco (slot equipado/vazio correto a partir de `getSlotsState`).
  Verificação visual desktop+mobile (Vitest + testing-library já no projeto).
- **Riscos:** (a) reposicionar os slots ao redor da foto sem sobreposição em
  larguras variadas; (b) o `Dado` de batalha está acoplado ao d20 — generalizar
  exige cuidado para não quebrar a Batalha; (c) os arquivos grandes da ficha
  tornam a extração de componentes a parte mais trabalhosa.

## 10. Sucesso

- Desktop em 2 colunas com retrato+equipamento central e Vitalidade/Arsenal/
  Capacidades sempre visíveis; mobile em coluna única bem-acabada.
- Modo Combate abre/fecha com um toque, com vitais editáveis, ataques/capacidades
  acionáveis, card de dado e log.
- Visual fiel: Cinzel/Lora, 6px, Tabler, painéis pedra-bronze com linha-dragão.
