---
version: 1
slug: "src-08-personagens-guia-personagem-jsx"
primary_target: "src/08-personagens/guia_personagem.jsx"
related_targets: ["src/index.css"]
---

# Guia de criação de personagem — As cartas da regra

Escopo: a página de Ajuda (`guia_personagem`), as regras de Tagmar como o Menestrel as calcula hoje. Modo: Read. Origem: pedido do usuário em 11/11/2026 ("transformar essa página em uma apresentação mais didática", "não precisamos mostrar o clima"); estrutura escolhida na página de decisão (cartas, entre cartas / mapa das escolhas / lições).

## Direction contract

THESIS: Cada regra é uma carta: a regra numa frase, o número que importa e o porquê com a tabela, juntos, ao lado da arte vertical do tema. Recusa a página longa de rolagem com seções empilhadas. (Revisto em 11/11/2026: a carta não vira mais — "Remova o ver o porquê e coloque o texto no card".)

OWN-WORLD: O padrão de página da Ficha: cartão sólido (--pg-fundo), trilho DENTRO da página com as pílulas do Livro de Regras, réguas de borda a borda, cartões do corpo opacos (--pg-trilho-fundo, raio 10, --regua-forte), título de cartão .fp-col-tit, passe .mn-passe, quadro .mn-quadro, ouro só no aceso e misturado ao fundo (opaco), balão do sistema.

STORY: O jogador entende uma regra por vez, sabe sempre em que capítulo e carta está, vira a carta quando quer o porquê, e chega a qualquer regra em dois cliques pelo trilho.

FIRST VIEWPORT: Trilho de capítulos dentro do cartão no alto (ícones, o atual com nome). No corpo, a carta: arte vertical à esquerda (30%), texto à direita com título de cartão, a frase, o passe e o porquê, que rola por dentro. Abaixo, as miniaturas do capítulo. No pé, Anterior · capítulo · carta N de M · Próxima.

FORM: as cartas da regra, 5º da lista ordenada (dealt lead), seed:be0c58b4ab3756fc

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
