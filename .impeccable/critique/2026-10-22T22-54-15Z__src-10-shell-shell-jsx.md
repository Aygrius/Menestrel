---
target: "sistema: login, navegação, menus laterais"
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:C:\\dev\\Menestrel\\src\\10-shell\\shell.jsx"
target_fingerprint: "sha256:bdaaff0bbc60c7320f1e445eb79e59c750857851f7c2dcd6d16ea3bafd063980"
target_path: "C:\\dev\\Menestrel\\src\\10-shell\\shell.jsx"
timestamp: 2026-10-22T22-54-15Z
slug: src-10-shell-shell-jsx
---
Method: dual-agent (A: revisão de design · B: detector)

# Crítica — entrada, navegação e identidade (shell do Menestrel)

## Nielsen
| # | Heurística | Nota | Problema |
|---|---|---|---|
| 1 | Visibilidade do status | 2 | Sem título de página; seção atual só num tom dourado do ícone; mesa ativa do Mestre invisível |
| 2 | Mundo real | 3 | "Histórias" × "Aventuras"; "Comércio"/"Treinamento" escondem que são regras |
| 3 | Controle e liberdade | 2 | Sem rotas: Voltar sai do app; Loja/Batalha/Convites trocam a tela sem endereço |
| 4 | Consistência | 2 | Três camadas de navegação com lógicas diferentes; CTAs na pílula fixa |
| 5 | Prevenção de erros | 3 | Limites do plano explicados |
| 6 | Reconhecer vs lembrar | 1 | Trilho de 6 ícones sem rótulo; metáforas opacas; sem hover no toque |
| 7 | Flexibilidade | 1 | Sem busca global, atalhos, recentes, links; Batalha a 3+ cliques |
| 8 | Estética e minimalismo | 2 | Estado vazio = feixes de luz + frase solta |
| 9 | Recuperação de erros | 2 | AdminEmpty "Em breve" onde o problema é "sem personagem ativo" |
| 10 | Ajuda | 1 | Ajuda só cobre criação de personagem; sem onboarding |
| Total | | 19/40 | Ruim |

## Especificidade
Ambiente autoral (luz/clima pelo relógio da mesa, vocabulário, telas passe/quadro); esqueleto genérico de console de admin (trilho de ícones 64px com tooltip, avatar com menu, login em cartão de vidro sobre fumaça). Detector: 91 achados no shell/auth/nav, 90 design-system-*; #E0BE68 (ouro do item ativo) 10× literal fora do DESIGN.md; sistema todo 1675 (1655 design-system-*, 20 estruturais em index.css). Falsos positivos: tabler-filled.css (fonte de ícone), máscaras #000 do fundo, botão Google branco. Overlay de navegador não executado: o navegador conectado não alcança o localhost desta máquina.

## Problemas prioritários
1. [P1] IA mistura Mesa / Livro de Regras / Conta e enterra a sessão ao vivo (Batalha, Loja da mesa, Convites dentro do card da história). Fix: seletor de mesa no topo da navegação + destinos da mesa; Livro de Regras único com busca; Conta no avatar. /impeccable shape
2. [P1] Trilho só de ícones, sem cabeçalho de página, local atual fraco, CTAs na pílula fixa. Fix: trilho com rótulo, faixa de cabeçalho com título/trilha/ações/data-hora-clima. /impeccable layout
3. [P1] Sem navegação para celular/tablet (trilho 64px a 390px, painel de 3 colunas, tooltip no toque). Fix: barra inferior + folha de subníveis. /impeccable adapt
4. [P1] Acessibilidade: .mc-user é div clicável (shell.jsx:3723), sem foco próprio no trilho, alvos ~38px. Fix: botão com aria-haspopup, anel de foco único, 44px. /impeccable harden
5. [P2] Primeira entrada: conta nova vira Jogador (shell.jsx:3299); vazios com "Em breve". Fix: escolha Mestre/Jogador na primeira entrada; vazios que explicam e oferecem a ação. /impeccable onboard
6. [P2] Login/marca: logo é ti-currency-monero (auth.jsx:45); wordmark mais fraco que o título; eyebrow em degradê; política sem link; sem proposta de valor. Fix: marca própria, wordmark Cinzel, login em duas partes, link. /impeccable shape

## Personas
- Primeira vez: cai como Jogador; ícones sem nome; "Treinamento/Comércio" opacos; "Premium em breve".
- Mestre ao vivo: Batalha a 3 cliques; Voltar fecha o app; sem busca; sem abas/links.
- Acessibilidade: menu da conta sem teclado; sem foco no trilho; sem aria-current no topo; fundo animado atrás do texto.
- Tablet/celular: trilho rouba largura; painel estoura; alvos pequenos; pílula fixa cobre conteúdo.
- Mestre preparando × conduzindo: o produto não distingue os modos; um modo "Em sessão" resolveria.

## Menores
Três ícones de livro quase iguais; "Plano" desativado no menu; card da história sem affordance antes do hover; comentário de Criaturas no menu do Jogador desatualizado.

## Perguntas
Batalha como lugar; dois saguões Mestre/Jogador; Livro de Regras com busca; luz da mesa emoldurando a cena; "minha mesa de hoje" após o login.

## Direções possíveis
A. Mesa em Sessão — trilho com brasão e seletor de mesa; Livro de Regras com Ctrl+K; cabeçalho vivo; mantém couro/ouro/brasa.
B. Grimório — marcadores de livro; pergaminho claro para leitura, couro escuro na sessão.
C. Mapa e Taverna — saguão ilustrado; barra horizontal; noite azul-aço + vela âmbar.
