# Menestrel — instruções para o Claude

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
