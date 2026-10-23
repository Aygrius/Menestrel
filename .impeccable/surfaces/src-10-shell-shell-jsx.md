---
version: 1
slug: "src-10-shell-shell-jsx"
primary_target: "src/10-shell/shell.jsx"
related_targets: ["src/01-core/constants.jsx","src/04-auth/auth.jsx"]
---

# Shell do Menestrel — Mesa em Sessão

Escopo: a moldura do app logado (navegação lateral, cabeçalho de página, celular/tablet, menu da conta); depois login e primeira entrada. Modo: Operate (Persuade só no login). Origem: crítica de 22/10/2026 (19/40), escolha do usuário entre as direções (seed 7dd3056a, card "Mesa em Sessão").

Decisões do usuário (22/10/2026): Mestre navega pela mesa ativa — seletor da mesa no topo (troca de campanha e "Todas as mesas"), depois Cena, Batalha, Personagens, Diário, Loja, Jogadores; régua; Livro de Regras com busca (criaturas, itens, magias, técnicas, habilidades); conta no avatar (perfil, idioma, plano, sair). Jogador navega pelo personagem ativo — retrato no topo (troca de personagem), depois Ficha, Inventário, Loja, Diário, Mesa; Livro de Regras; conta. Ordem: a moldura primeiro, depois login e primeira entrada.

## Direction contract

THESIS: O Menestrel é a mesa em sessão: a navegação nasce da campanha (Mestre) ou do personagem (Jogador) que está em jogo, e a página sempre diz onde a cena está — hora, clima, local. Recusa o console de admin com trilho de ícones mudos e menu de 54 folhas.

OWN-WORLD: O couro, ouro e brasa das etapas 1 e 2, evoluído: trilho largo de couro fosco com rótulos em Alegreya Sans, régua de bronze separando Mesa, Livro de Regras e Conta; brasão/retrato no topo como identidade; cabeçalho de página com título em Cinzel, trilha e a faixa viva da cena. Ouro só no item ativo e na ação primária. A luz da mesa (hora e clima) segue no fundo.

STORY: Quem entra vê de cara em que mesa ou personagem está, chega à Batalha ou à Ficha em um clique, encontra qualquer regra pela busca e sabe sempre onde está.

FIRST VIEWPORT: Desktop: trilho de 232px à esquerda (seletor no topo, destinos com ícone e rótulo, régua, Livro de Regras, conta embaixo); à direita, cabeçalho de página de 72px (trilha pequena acima, título em Cinzel, ações à direita, faixa da cena: data · hora · clima · local) e o conteúdo abaixo. Celular: barra inferior com 4–5 destinos e "Mais".

FORM: Mesa em Sessão (pick do impeccable, escolhida pelo usuário), seed 7dd3056a.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
