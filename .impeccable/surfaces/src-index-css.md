---
version: 1
slug: "src-index-css"
primary_target: "src/index.css"
related_targets: ["src/07-inventario/inventario.jsx","src/09-bestiario/bestiario.jsx","src/07-inventario/loja.jsx"]
---

# Design system do Menestrel — Quadro de Iniciativa

Escopo: o sistema visual de toda a interface autenticada (Operate). Primeira superfície: o modal Estudar/Aprender (`EstudarMagiaModal`, 07-inventario). Etapas: 1) fundação (tipo, escala, componentes base: célula rotulada, passe, quadro, modal, botão); 2) modais de item; 3) ficha; 4) batalha; 5) criação de personagem.

Audiência e tarefa: Mestre e Jogador de Tagmar em notebook, tablet e sessões online; acham número e ação em segundos sem parar a cena. Restrições: paleta couro/ouro/brasa/magia fixa (PRODUCT.md); QuantidadeStepper; confirmação no rodapé dos modais; ícones Tabler filled.

## Decisões por etapa

- Etapa 2, janelas de item (22/10/2026, respostas do usuário): ações em "barra com nome" (ícone + nome, principal em ouro, motivo do bloqueio escrito ao tocar); "passe + página única" (números do item no passe fixo, Descrição/Características/Magia sem abas); Usar "direto no rodapé" (sem aba Usar nem card do alvo). Vale para inventário, loja, anúncio e catálogo de itens; ícones de edição do Mestre no bestiário seguem ao lado do X por ora.

## Direction contract

THESIS: A interface é um documento de viagem medieval com um quadro de partidas: cada entidade (magia, item, combatente) é um passe segmentado de células rotuladas, e cada lista é um quadro ordenado pelo que importa agora. Recusa a ficha-padrão de painéis escuros com abas e texto dourado em tudo.

OWN-WORLD: Couro escuro como chão, réguas finas de bronze como única estrutura, células com rótulo em caixa-alta espaçada (Alegreya Sans 600, 12px) sobre valor grande em algarismos tabulares alinhados. Cinzel só em títulos de 18px para cima. Ouro reservado para estado vivo (selecionado, ação primária); brasa reservada para o que mudou ou bloqueia; roxo para magia. Sem cards aninhados, sem glow.

STORY: O jogador abre o item, vê de relance o que pode aprender agora, o que custa e quanto sobra; o que está bloqueado diz o porquê na própria linha; aprende com um clique no rodapé.

FIRST VIEWPORT: Modal md. Topo: o passe da escolha (células Magia · Nível · Custo · Saldo, valores grandes). Abaixo, o quadro: grupo "Aprender agora" e grupo "Bloqueadas", linhas de 44px com nome à esquerda e colunas tabulares fixas; a linha escolhida ganha barra de ouro e fundo levemente aceso. Rodapé: Fechar à esquerda, Aprender à direita.

FORM: Quadro de Iniciativa (cartão de embarque + painel de partidas), desafiante competitivo escolhido pelo usuário; seed 6a73e274.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
