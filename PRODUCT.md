# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Mestre** — prepara e conduz campanhas do sistema Tagmar: cria histórias, convida jogadores, monta a loja, cadastra lore e criaturas, conduz batalhas (iniciativa, ação, dano em cascata) durante a sessão.
- **Jogador** — controla um personagem (PJ): ficha, inventário, carga, magias e técnicas, diário de campanha. Consulta e age durante a sessão, muitas vezes no meio de uma cena.

Uso confirmado (22/10/2026): notebook/desktop, tablet apoiado na mesa e sessões online (Discord etc.), cada um na sua tela. Celular não foi apontado como uso principal, mas a interface precisa continuar funcionando nele.

## Product Purpose

Tirar a burocracia da mesa de Tagmar: a regra é calculada pelo sistema (pontos, carga, colunas de resolução, custo de aprendizado, cascata EH → AR → EF), e a mesa fica com a história. Sucesso é o jogador achar o número ou a ação em segundos sem parar a cena, e o Mestre conduzir uma batalha sem planilha paralela.

## Positioning

Plataforma de mesa feita para o Tagmar especificamente — as regras do sistema (estágios, grupos de armas, magias por passos, técnicas por treino, moedas ouro/prata/cobre/latão, carga com containers) são o motor do produto, não uma ficha genérica adaptada. Vendida como SaaS por landing page (planos free e premium).

## Operating Context

- Sessões ao vivo, presenciais ou online, com tempo de jogo correndo: consultas rápidas, ações em poucos cliques.
- Preparação fora da sessão pelo Mestre: cadastro de histórias, loja, lore, bestiário.
- Bilíngue: português (padrão) e inglês, por `lang`.
- Muitas janelas modais sobre a ficha/inventário (detalhe de item, estudar/aprender, usar, transferir, quantidade).

## Capabilities and Constraints

- Histórias, convites, PJs (assistente de criação de 7 passos), ficha, inventário com carga e containers, loja, batalha, bestiário, diário (lore, NPCs, reinos, cidades, memórias).
- Stack existente: Vite + React 19 + Tailwind v4 + shadcn, fases em `src/NN-*`, tokens escopados em `.menestrel-ui` (`src/index.css`).
- Regras de jogo e RPCs vivem no Supabase; a interface não decide regra.

## Brand Commitments

- **Redesenho completo autorizado, cores incluídas** (usuário, 22/10/2026, depois das etapas 1 e 2): "Estou disposto a mudar completamente o design do ambiente." A paleta couro/ouro/brasa/magia deixou de ser fixa — é o ponto de partida, não um compromisso. Antes disso, no mesmo dia, ela tinha sido fixada; essa restrição foi retirada pelo próprio usuário.
- Identidade: RPG de mesa voltado para ambientação e narrativa, era medieval — daí o nome Menestrel (o trovador que conta a história).
- Fontes podem ser trocadas, todas (22/10/2026).
- Ícones Tabler, preferindo as versões filled.
- Seletor de quantidade único do sistema (`QuantidadeStepper`): pílula com − e + em círculos nas pontas.
- Botões de confirmação dos modais no rodapé.

## Evidence on Hand

Nenhum depoimento, cliente ou métrica registrado neste repositório. Não inventar.

## Product Principles

1. A cena não para: a informação que o jogador procura durante o jogo aparece em segundos, legível de relance.
2. A regra é do sistema, a escolha é da mesa: a interface mostra custo, limite e motivo do bloqueio antes do clique.
3. Um desenho para cada pergunta: o mesmo controle resolve a mesma tarefa em todas as telas.
4. Clima sem custo de leitura: a ambientação medieval nunca pode tornar um número ou um rótulo difícil de ler.

## Accessibility & Inclusion

Legibilidade é a queixa principal (22/10/2026): fontes difíceis de ler e tamanhos desproporcionais. Contraste de texto no fundo escuro e piso de tamanho de fonte são requisitos, não acabamento.
