# Menestrel — instruções para o Claude

## A base, em três parágrafos

SaaS para mesas de RPG do sistema **Tagmar**: o Mestre conduz uma história com
relógio, clima, loja e batalha; o Jogador tem ficha viva, inventário, diário e
companheiros. **Vite + React 19 + Tailwind v4 + Supabase.**

O código é dividido em **fases** (`src/NN-area/`), e elas **não se importam**:
cada arquivo publica no `window` com `Object.assign(window, { … })` no fim, e
quem consome lê do `window` — quase sempre no padrão `(typeof X === 'function'
? X : window.X)`, para o módulo continuar testável sozinho. **A ordem de carga
está em `src/main.tsx` e é regra de negócio, não acidente**: mover uma linha ali
deixa uma função `undefined` no `window`, e o erro só aparece em runtime.
`01-core` é o vocabulário (dados de Tagmar + regras puras, sem React); as fases
de 02 a 13 são telas que o consomem.

Três coisas que mordem quem chega: `personagens.inventario` **nunca** se grava
com `update` direto (é compare-and-swap, via `window.alterarInventario`); o
repositório é `core.autocrlf=true`, então regex sobre a fonte precisa de
`\r?\n`; e mais de 60 testes **leem o código-fonte** e casam regex, de modo que
reformatar uma linha pode quebrar um teste sem mudar comportamento nenhum.

Mapa completo — módulo a módulo, com os fluxos e as armadilhas — em
[docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Interface: use a skill `impeccable` por padrão

Todo trabalho de interface neste projeto (tela nova, ajuste de layout,
tipografia, cor, modal, tabela, formulário, menu) começa carregando a skill
**`impeccable`** — sem esperar o usuário pedir. Pedido do usuário em
26/09/2026: "Sempre use, como padrão, a skill impeccable. Registre isso na
documentação para que eu não precise lembrar de próxima vez."

A identidade visual é medieval — couro, ouro e magia — e a direção do design
system é o **Quadro de Iniciativa** (22/10/2026): cada entidade é um passe de
células rotuladas (`.mn-passe`/`.mn-celula`, rótulo `.mn-rotulo` sobre valor
grande) e cada lista é um quadro de linhas com réguas (`.mn-quadro`). Cinzel
só em títulos de 18px para cima; Alegreya Sans no resto, com algarismos
tabulares. Ouro (`--vivo`) só no que está vivo (escolhido, ação primária),
brasa (`--alerta`) só no que mudou ou bloqueia. Tokens `--fs-*`, `--tinta*` e
a paleta escopada em `.menestrel-ui` (`src/index.css`). Produto em
`PRODUCT.md`; contrato da direção em `.impeccable/surfaces/src-index-css.md`.

Prévia sem login: `npx vite --port 5174` e abrir `/preview/` (pasta
`preview/`, fora do git). `?clique=N` escolhe a N-ésima linha e
`?largura=390` simula celular.

`npm run dev` sobe em **5273**, porta própria e `strictPort` (27/10/2026): a
5173 é o padrão do Vite e vive disputada com os outros projetos abertos na
máquina, e escorregar de porta faz o login terminar na Vercel — a origem
precisa estar nas Redirect URLs do Supabase. Motivo inteiro em
`vite.config.ts`.

## Plugins instalados: use por padrão

Pedido do usuário em 27/09/2026: "Eu instalei alguns plugins agora, e a partir
de agora quero que eles sejam sempre usados no projeto." Sem esperar pedido:

- **`cartographer`** — o mapa da base fica em `docs/CODEBASE_MAP.md`. Consultar
  o mapa antes de explorar o código às cegas; depois de mudanças estruturais
  (arquivo/pasta nova, fase nova em `src/NN-*`, módulo movido ou removido),
  rodar `cartographer` para atualizar só as seções alteradas.
- **`claude-code-setup`** — ao notar tarefa repetitiva que caberia em hook,
  skill, subagente ou MCP, rodar `claude-automation-recommender` e propor a
  automação ao usuário (sem aplicar sozinho).

**Não usar `claude-mem-cowork`** (`mem-search`/`mem-setup`): o cmem.ai é pago.
Pedido do usuário em 29/09/2026: "Não quero usar mem-setup porque é pago." Não
rodar a busca nem sugerir a configuração.
