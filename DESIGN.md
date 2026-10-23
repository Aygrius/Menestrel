---
name: Menestrel
description: Plataforma de mesa para Tagmar — couro, ouro e magia, legível de relance no meio da cena.
colors:
  couro-fundo: "#1C150E"
  couro-painel: "#120D06"
  couro-cartao: "#2E2419"
  tinta: "#F1E6CF"
  tinta-2: "#CDBF9F"
  tinta-3: "#A3937A"
  tinta-escura: "#1C1407"
  ouro: "#C9A44E"
  ouro-vivo: "#E6C97A"
  ouro-vivo-fundo: "rgba(201,164,78,0.12)"
  ouro-vivo-aro: "rgba(230,201,122,0.55)"
  cobre: "#B8702E"
  brasa: "#E8836A"
  brasa-fundo: "rgba(162,59,47,0.16)"
  sangue: "#A23B2F"
  magia: "#B48BD3"
  bronze: "#6B5436"
  regua: "rgba(138,110,64,0.28)"
  regua-forte: "rgba(138,110,64,0.50)"
  chao-celula: "rgba(138,110,64,0.07)"
  couro-pilula: "rgba(138,110,64,0.12)"
  campo-tinta: "#E8DDC6"
  chao-celula-opaco: "#17110A"
typography:
  headline:
    fontFamily: "Spectral SC, Spectral, Georgia, serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.01em"
  page-title:
    fontFamily: "Spectral SC, Spectral, Georgia, serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.15
  value-lider:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "lnum, tnum"
  value-lg:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.15
    fontFeature: "lnum, tnum"
  value:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.15
    fontFeature: "lnum, tnum"
  nav-label:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    fontFeature: "lnum, tnum"
  body-ui:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    fontFeature: "lnum, tnum"
  small:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  caption:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  modal: "6px"
  linha: "6px"
  nav: "8px"
  passe: "10px"
  area: "12px"
  pilula: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.tinta-escura}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.pilula}"
    padding: "0 20px"
    height: "40px"
  button-primary-footer:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.tinta-escura}"
    typography: "{typography.small}"
    rounded: "{rounded.pilula}"
    padding: "0 20px"
    height: "46px"
  button-primary-disabled:
    backgroundColor: "rgba(138,110,64,0.16)"
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.pilula}"
  button-ghost:
    backgroundColor: "{colors.couro-pilula}"
    textColor: "{colors.tinta}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.pilula}"
    padding: "0 20px"
    height: "40px"
  button-ghost-sm:
    backgroundColor: "{colors.couro-pilula}"
    textColor: "{colors.tinta}"
    typography: "{typography.small}"
    rounded: "{rounded.pilula}"
    padding: "0 14px"
    height: "32px"
  button-danger:
    backgroundColor: "rgba(200,33,44,0.10)"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pilula}"
    padding: "0 20px"
    height: "40px"
  button-icon:
    backgroundColor: "{colors.couro-pilula}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pilula}"
    size: "40px"
  field:
    backgroundColor: "{colors.couro-pilula}"
    textColor: "{colors.campo-tinta}"
    rounded: "{rounded.pilula}"
    height: "32px"
  quantity-stepper:
    backgroundColor: "{colors.couro-painel}"
    textColor: "{colors.tinta}"
    typography: "{typography.small}"
    rounded: "{rounded.pilula}"
    padding: "0 4px"
    height: "40px"
  cell-label:
    textColor: "{colors.tinta-3}"
    typography: "{typography.label}"
  passe:
    backgroundColor: "{colors.chao-celula}"
    rounded: "{rounded.passe}"
    padding: "12px 16px"
  passe-value:
    textColor: "{colors.tinta}"
    typography: "{typography.value}"
  board-row:
    textColor: "{colors.tinta}"
    typography: "{typography.body-ui}"
    padding: "8px 12px"
    height: "44px"
  board-row-selected:
    backgroundColor: "rgba(201,164,78,0.15)"
    textColor: "{colors.ouro-vivo}"
    rounded: "{rounded.linha}"
  modal:
    backgroundColor: "{colors.couro-painel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.modal}"
  modal-title:
    textColor: "{colors.tinta}"
    typography: "{typography.headline}"
  passe-value-lider:
    textColor: "{colors.tinta}"
    typography: "{typography.value-lider}"
  action-pill:
    backgroundColor: "rgba(138,110,64,0.13)"
    textColor: "{colors.tinta}"
    typography: "{typography.small}"
    rounded: "{rounded.pilula}"
    padding: "0 16px 0 13px"
    height: "36px"
  action-pill-principal:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.tinta-escura}"
    rounded: "{rounded.pilula}"
    height: "36px"
  action-pill-disabled:
    backgroundColor: "{colors.chao-celula}"
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.pilula}"
  action-pill-principal-disabled:
    backgroundColor: "rgba(201,164,78,0.07)"
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.pilula}"
  sidebar:
    width: "232px"
    padding: "18px 12px 12px"
  context-selector:
    backgroundColor: "{colors.chao-celula}"
    textColor: "{colors.tinta}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.passe}"
    padding: "8px 6px 8px 8px"
    height: "52px"
  context-crest:
    backgroundColor: "{colors.ouro-vivo-fundo}"
    textColor: "{colors.ouro-vivo}"
    rounded: "{rounded.nav}"
    size: "36px"
  nav-item:
    textColor: "{colors.tinta-2}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.nav}"
    padding: "8px 10px"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.ouro-vivo-fundo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.nav}"
  nav-item-child:
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.nav}"
    padding: "6px 10px"
    height: "34px"
  page-header:
    textColor: "{colors.tinta}"
    typography: "{typography.page-title}"
    padding: "0 28px"
    height: "70px"
  scene-pill:
    backgroundColor: "rgba(18,13,6,0.80)"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pilula}"
    padding: "0 16px"
    height: "32px"
  nav-sheet:
    backgroundColor: "{colors.chao-celula-opaco}"
    width: "min(320px, 86vw)"
  bottom-bar-item:
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.nav}"
    height: "56px"
  bottom-bar-item-active:
    backgroundColor: "{colors.ouro-vivo-fundo}"
    textColor: "{colors.ouro-vivo}"
    rounded: "{rounded.nav}"
---

# Design System: Menestrel

## Overview

**Creative North Star: "Quadro de Iniciativa"**

A interface é um documento de viagem medieval com um quadro de partidas. Cada entidade em foco (magia, item, combatente) é um **passe**: uma fileira de células rotuladas, rótulo pequeno em caixa-alta em cima, valor grande em algarismos tabulares embaixo, que mostra a decisão em números antes do clique. Cada lista é um **quadro**: grupos com cabeçalho rotulado e linhas de 44px separadas por réguas finas de bronze, colunas numéricas alinhadas à direita, ordenadas pelo que importa agora.

O chão é couro escuro; a única estrutura é a régua de bronze. Ouro não é decoração: acende só no que está vivo (o escolhido, a ação primária, o foco). Brasa fala só do que mudou ou bloqueia, e diz o porquê na própria linha. Roxo marca magia. A ambientação medieval vive na paleta e no título em Cinzel; todo o resto é escrito para ser lido de relance, em notebook, tablet apoiado na mesa ou sessão online, com o jogo correndo.

A paleta couro/ouro/brasa/magia é compromisso de marca fixado pelo usuário e não muda; fonte, escala e formato podem mudar. O sistema recusa a ficha-padrão de painéis escuros com abas e texto dourado em tudo.

**Key Characteristics:**
- Passe (células rotuladas) para a entidade em foco; quadro (linhas com régua) para listas.
- Ouro só para estado vivo; brasa só para mudança ou bloqueio; roxo para magia.
- Cinzel só em títulos de 18px para cima; corpo, rótulos e números em Alegreya Sans.
- Algarismos alinhados e tabulares em toda a interface.
- Estrutura por réguas, não por caixas; nada de card dentro de card.
- Um desenho por pergunta: um botão, um campo, um seletor de quantidade, um modal.
- Janela de item em página única: passe fixo no topo, barra de ações com nome, corpo sem abas.
- Mesa em Sessão: a navegação nasce da mesa ativa (Mestre) ou do personagem ativo (Jogador), com rótulos sempre visíveis e a cena escrita no topo.

## Colors

Couro escuro como chão, tinta de pergaminho em três níveis, e três acentos com papel fixo: ouro (vivo), brasa (mudou/bloqueia), roxo (magia).

### Primary
- **Ouro Vivo** (ouro-vivo): o ouro claro do estado vivo — nome e custo da linha escolhida, valor vivo no passe, aro de seleção, contorno de foco, cursor de texto e `accent-color`. Fundo vivo (ouro-vivo-fundo) e aro vivo (ouro-vivo-aro) são as versões translúcidas para preencher e contornar o escolhido.
- **Ouro de Lei** (ouro): o ouro da marca. Início do degradê da ação primária, ícones de controle, preenchimento de botões alternados ligados.
- **Cobre** (cobre): fim do degradê ouro→cobre da ação primária; no legado, também é o `--ember` laranja.

### Secondary
- **Brasa** (brasa): o que mudou ou bloqueia — motivo de bloqueio na linha, valor de alerta no passe, aviso de por que a ação não pode ser feita. Texto legível sobre couro (6.8:1). Fundo de brasa (brasa-fundo) para realçar uma área de alerta.
- **Sangue** (sangue): ação e estado destrutivos (o `--destructive`).

### Tertiary
- **Roxo Arcano** (magia): marca magia — tipo e escola da magia na linha, rótulo "Magia" no passe, aba Magia, Karma na batalha. Nunca usado para outra categoria.

### Neutral
- **Couro de Fundo** (couro-fundo): o chão da aplicação.
- **Couro de Painel** (couro-painel): o chão dos modais (a 90% de opacidade sobre o fundo) e do seletor de quantidade; referência de contraste da tinta.
- **Couro de Cartão** (couro-cartao): superfícies elevadas legadas (card, popover).
- **Tinta** (tinta): texto principal e valores (15:1 sobre o painel).
- **Tinta Segunda** (tinta-2): texto secundário, unidades e complementos de valor (9:1).
- **Tinta Discreta** (tinta-3): rótulos de célula, itens bloqueados, botão primário desativado (5.6:1). É o piso: nada de texto mais apagado que isso.
- **Tinta Escura** (tinta-escura): texto sobre o degradê de ouro.
- **Régua** e **Régua Forte** (regua, regua-forte): as linhas de bronze entre linhas do quadro, entre células e sob o cabeçalho de grupo; a forte contorna o passe e fecha cabeçalhos.
- **Chão de Célula** (chao-celula): o leve tom de bronze dentro do passe.
- **Pílula de Couro** (couro-pilula): fundo de botão secundário, botão de ícone e campo.
- **Couro de Folha** (chao-celula-opaco): o couro opaco do que se abre por cima do console — menu do seletor de contexto, folha do menu e barra inferior no celular.
- **Bronze** (bronze): borda sólida legada (`--border`, `--input`).

### Named Rules
**The Ouro É Vivo Rule.** Ouro claro só no que está vivo agora: escolhido, ação primária, foco. Texto dourado em rótulo, título ou decoração está proibido. Quem não pode agir não acende: o botão primário desativado vira pílula de couro com tinta discreta, nunca ouro a 50%. Na barra de ações, a principal bloqueada guarda o lugar com um aro de ouro tênue (35%) sobre fundo quase apagado (7%) e texto em tinta discreta: marca o lugar, não acende.

**The Brasa Explica Rule.** Brasa só para o que mudou ou bloqueia, e sempre com o motivo escrito na própria linha. Bloqueado continua legível e escolhível; cede a vez em tinta discreta e diz por quê em brasa.

**The Paleta Fixa Rule.** Couro, ouro, brasa e roxo da magia são identidade de marca. Ajuste de tom é permitido para legibilidade; troca de família de cor não.

## Typography

**Display Font:** Spectral SC (com Spectral, Georgia, serif) — desde 23/10/2026, escolhida no estudo de fontes
**Body Font:** Source Sans 3 (com Segoe UI, system-ui, sans-serif) — desde 23/10/2026; saíram Cinzel, Alegreya Sans e Pirata One

**Character:** Cinzel dá a voz medieval só no título da janela; Alegreya Sans, humanista e de raiz caligráfica, carrega todo o resto com algarismos tabulares de verdade. O clima fica na voz do título; a leitura fica com a sans.

Carregadas pelo Google Fonts: Spectral SC 500/600/700, Spectral 500/600 e itálico 500; Source Sans 3 400/500/600/700/800 e itálicos 400/500. Escala em tokens `--fs-*` (13 · 14 · 15 · 16 · 17 · 20 · 24 · 32), com rótulo de 12px à parte; o degrau de 32px (`--fs-lider`) é só do número líder do passe do item.

### Hierarchy
- **Headline** (Cinzel 600, 20px, 1.2, 0.01em): título de janela/modal. O único lugar da janela onde a Cinzel fala.
- **Título de Página** (Cinzel 600, 22px, 1.15): o título no cabeçalho do console, sozinho, sem rótulo acima; 20px no celular. A marca "Menestrel" no topo do menu e a inicial da mesa no brasão (18px) são as outras falas da Cinzel no console.
- **Value Líder** (Alegreya Sans 700, 32px, 1, tabular): o número que define o item (dano da arma, defesa da armadura) no passe da janela de item. Mede o próprio conteúdo; cai para 24px no celular. Um por passe.
- **Value Large** (Alegreya Sans 700, 24px, 1.15, tabular): valor da célula de identidade no passe (o nome da escolha). Cai para 20px no celular.
- **Value** (Alegreya Sans 700, 20px, 1.15, tabular): valor de célula no passe, título de seção. Complemento ("de 360") em 15px 500 tinta segunda.
- **Body** (Alegreya Sans 400, 17px): corpo de leitura.
- **Texto de modal** (Alegreya Sans 400, 16px, 1.7): todo texto corrido dentro de um modal, à esquerda. Na janela de item a descrição usa 16px, 1.6, tinta segunda, até 68ch.
- **Body UI** (Alegreya Sans 400, 16px): texto de interface, linhas do quadro (nome em 700), botões md.
- **Rótulo de Navegação** (Alegreya Sans 600, 16px): destinos do menu lateral; filhos de gaveta em 15px 500; barra inferior do celular em 12px 700, sem caixa-alta.
- **Small** (15px): tabelas, botões sm e de rodapé, rótulo do seletor de quantidade, motivos de bloqueio centrais.
- **Caption** (14px / 13px): tipo da linha, aviso de bloqueio e de treino sob o nome; legendas e contadores.
- **Label** (Alegreya Sans 700, 12px, 0.08em, CAIXA-ALTA, tinta discreta): rótulo de célula e cabeçalho de coluna/grupo — o "GATE" do cartão de embarque.

### Named Rules
**The Cinzel Acima de 18 Rule.** Cinzel só em títulos de 18px para cima. Abaixo disso, o que era Cinzel vira rótulo em caixa-alta espaçada na Alegreya Sans. Número nunca em Cinzel.

**The Algarismo Tabular Rule.** Toda a interface `.menestrel-ui` usa algarismos alinhados e tabulares (`lining-nums tabular-nums`); colunas numéricas alinham à direita e não quebram linha. A raiz também declara `font-feature-settings: "lnum" 1`, para que o algarismo alinhado vença regras legadas que pedem só `tabular-nums`.

**The Texto à Esquerda Rule.** Texto corrido em modal é alinhado à esquerda com `text-wrap: pretty`, nunca justificado: sem hifenização confiável, o justificado abre rios entre as palavras.

**The Rótulo Discreto Rule.** Rótulo de célula nunca em Cinzel e nunca em ouro. A exceção é semântica: o rótulo de uma magia veste o roxo arcano.

## Layout

Modal é a unidade de trabalho: larguras sm 400px, md 500px, lg 800px, full até 960px; o Estudar usa 620px. Backdrop com respiro maior no topo (60px) do que nos lados (20px). Cabeçalho e rodapé com 20px de respiro; corpo com 20px × 24px.

Ritmo: 6px entre rótulo e valor na célula; 8px × 12px de padding na linha do quadro; 12px × 16px na célula do passe; 16px entre colunas; 18px entre grupos do quadro; 22px entre o passe e o quadro; 10px entre botões do rodapé.

Passe: grade em coluna única — a primeira célula (identidade) estica, as numéricas medem o próprio conteúdo. Quadro: grade com nome flexível e colunas numéricas de largura fixa compartilhadas entre cabeçalho e linhas, para alinhar. Lista longa rola dentro do quadro (até metade da tela), não o modal.

Janela de item: modal de 680px em três faixas — topo fixo (o passe, 18px × 20px), barra de ações (14px × 20px, régua embaixo) e corpo que rola. Descrição, Características e Magia seguem na mesma página, 22px entre seções; Características em uma coluna só, como linhas de quadro (9px de respiro vertical, régua fina). No passe do item as células alinham pelo topo, para os rótulos ficarem na mesma linha: a célula de texto estica (o dobro), o número líder mede o próprio conteúdo com 28px de folga à direita, as demais dividem o resto. Passe só de números divide a largura por igual.

Responsivo (≤560px): o backdrop vira 16px simétrico, o corpo 16px × 18px; no passe a identidade ocupa a primeira faixa inteira e os números dividem a segunda em partes iguais; colunas do quadro encolhem; o rodapé empilha com a ação primária em cima e os botões em largura total. No passe do item, as células quebram em fileiras separadas por fio de 1px (a régua é o vão), a última de cada fileira estica; só uma célula de texto inicial ocupa a faixa inteira; valores em 16px, líder em 24px.

**Console (Mesa em Sessão).** Menu lateral de 232px à esquerda; à direita, uma faixa fixa de 70px no topo (régua embaixo) com o título da página à esquerda e a faixa da cena à direita, na mesma altura. O conteúdo começa 20px abaixo da faixa e mede min(1060px, 100% − 48px), centrado; páginas que não são largas param em 860px. Respiro do menu: 18px × 12px; 2px entre destinos; régua com 14px acima e 12px abaixo antes do Livro de Regras.

Responsivo do console: até 1280px a data da cena encurta. Entre 769px e 1280px o cabeçalho ganha duas linhas — título em cima, cena embaixo à esquerda — e cresce com a altura real da cena (`--cdj-h`, publicada por ResizeObserver), para o conteúdo nunca ficar por baixo. Até 768px o menu vira folha sobreposta, o topo cai para 56px, a cena quebra em até duas linhas centradas logo abaixo e o conteúdo desce pela mesma `--cdj-h`; a barra inferior fixa (56px de alvo, com a área segura do aparelho) reserva 76px no pé, e o conteúdo mede 100% − 24px.

## Elevation & Depth

Sistema plano em camadas tonais. Profundidade vem do couro mais escuro do painel sobre o fundo desfocado, e das réguas — não de sombras. A única sombra estrutural é a do modal sobre o backdrop (desfoque de 6px, véu a 72%); o painel flutuante de seleção tem a sua versão menor. Botões não sobem com sombra; o clique afunda 1px.

### Shadow Vocabulary
- **Modal** (`box-shadow: 0 30px 80px -24px rgba(8,6,2,0.82)`): painel de modal sobre o backdrop.
- **Painel flutuante** (`box-shadow: 0 20px 50px -16px rgba(8,6,2,0.85)`): lista aberta de seleção.
- **Menu do seletor** (`box-shadow: 0 14px 36px rgba(0,0,0,0.55)`): menu aberto do seletor de contexto, sobre o menu lateral.
- **Folha do menu** (`box-shadow: 12px 0 40px rgba(0,0,0,0.5)`): o menu lateral aberto como folha no celular, sobre véu escuro a 62%.

### Named Rules
**The Régua, Não Caixa Rule.** Estrutura é régua de bronze de 1px, não caixa. Nada de card dentro de card; o passe é o único contorno dentro do corpo de um modal.

**The Sem Brilho Rule.** Seleção e foco são aro e preenchimento, nunca glow.

## Shapes

Dois idiomas de forma. Superfícies de leitura são retângulos de canto suave: modal 6px, linha escolhida 6px, passe 10px, área de texto 12px. Tudo que se aperta é pílula (999px): botões, campos, seletor de quantidade; os botões − e + do seletor são círculos. Bordas são sempre 1px de bronze translúcido.

## Components

### Buttons
Um único sistema de botões no console inteiro: quatro variantes, dois tamanhos.
- **Shape:** pílula (999px), Alegreya Sans 600.
- **Tamanhos:** md 40px (padding 0 20px, 16px), sm 32px (0 14px, 15px); no rodapé de modal e no wizard, 46px (15px). Ícone-só é quadrado (40px / 32px), ícone interno 16px.
- **Primary:** degradê 135° de ouro para cobre (`#C9A44E → #B8702E`), texto tinta escura. Hover clareia o degradê (`#D4B060 → #C47E3C`) com brilho 1.06.
- **Primary desativado:** pílula de couro (bronze a 16%), texto tinta discreta, opacidade cheia — não acende.
- **Ghost:** pílula de couro (bronze a 12%), texto tinta; hover sobe para 20% e o texto vira ouro claro.
- **Danger:** vermelho a 10% (hover 18%); combinável com ícone-só.
- **Toggle ligado** (`data-on="true"`): preenchimento de ouro com tinta escura — estado vivo.
- **Focus:** contorno de 2px em ouro a 65%, afastado 2px. **Active:** afunda 1px.

### Inputs / Fields
**Campo Único.** Uma pele só para todo campo de texto.
- **Style:** pílula de couro (bronze a 12%), sem borda visível (1px transparente reservado para não mudar a altura), tinta de campo, placeholder `#9C8F73`, 32px de altura; área de texto com 12px de canto.
- **Hover:** fundo sobe para bronze a 20%.
- **Focus:** a borda reservada acende em ouro a 55%.
- **Select nativo:** mesma pele com seta de ouro desenhada.

### Seletor de Quantidade (QuantidadeStepper)
O único seletor de quantidade do sistema. Pílula de 40px em couro de painel com aro de bronze a 35% e desfoque; botões − e + em círculos de 30px nas pontas, ícones em ouro claro, hover com ouro a 16%; valor central em 15px tabular, tinta. O complemento "de N" usa a mesma fonte e cor do número.

### Modal (ModalShell)
Toda janela usa o mesmo esqueleto: cabeçalho (título em Cinzel à esquerda, fechar à direita) / corpo com rolagem própria / rodapé. Painel de couro a 90%, aro de bronze a 30%, canto 6px, entrada com subida curta de 6px em 180ms. Réguas de bronze separam cabeçalho e rodapé do corpo.

### Rodapé de confirmação
Botões de confirmação vivem no rodapé do modal: Cancelar/Fechar à esquerda (ghost), ação primária à direita. No celular, empilha em largura total com a primária em cima.

**Usar direto no rodapé.** O consumível se usa pelo rodapé, sem aba Usar e sem card do alvo (o alvo é sempre o próprio personagem): seletor de quantidade no centro, Usar (primário) à direita.

### Passe (signature)
O cartão de embarque da entidade em foco. Fileira de células separadas por réguas verticais, dentro de um contorno de régua forte de 10px sobre chão de célula. Cada célula: rótulo em cima, valor grande embaixo. Valor vivo em ouro claro, valor de alerta em brasa, valor vazio em tinta discreta itálica. Quando a escolha muda, o valor novo assenta deslizando 5px de baixo (opacidade 0.4 → 1, 220ms, `cubic-bezier(.16,1,.3,1)`); desligado com movimento reduzido. É o único momento animado do passe.

**Passe do item.** Os números que se consultam no meio da cena saem de Características e sobem para um passe fixo no topo da janela. Ordem: primeiro a célula de texto (onde está, preço, vendedor, magia do pergaminho), depois o número que define o item (dano, defesa) em 32px, depois os demais (grupo, absorção, resistência, armazena, ocupa). Quando Ocupa seria a única célula, não há passe e Ocupa volta para Características.

**The Passe Não Se Repete Rule.** Valor que está no passe não aparece de novo em Características.

### Quadro (signature)
O painel de partidas. Grupos com cabeçalho rotulado (rótulo + contagem, cabeçalhos de coluna à direita) sobre régua forte; linhas de 44px mínimos separadas por régua fina, nome em 700 à esquerda com tipo ao lado na mesma linha, avisos numa segunda linha só quando existem. Hover: bronze a 10%. **Escolhida:** preenchimento de ouro a 15% e aro interno de 1px em ouro vivo, canto 6px; nome e valor-chave viram ouro claro. **Foco:** contorno de 2px em ouro vivo, interno. Seleção é um grupo de rádio com tabindex móvel e setas do teclado.

### Barra de Ações (signature)
"Barra com nome": as ações do item como pílulas de ícone + nome (36px, Alegreya Sans 700 15px, ícone 17px em tinta segunda) numa faixa entre o passe e o corpo, com régua embaixo. Ghost em bronze a 13% (hover 24%). A principal (equipar, vestir, estudar/aprender, montar) usa o degradê ouro→cobre do botão primário e vem primeiro; Descartar vem por último. Aberta (etapa em curso): fundo vivo, aro vivo, texto ouro claro. Destrutiva fala em brasa só no hover ou armada (fundo de brasa, aro de brasa a 55%). Desativada: bronze a 7%, tinta discreta. Foco: contorno de 2px em ouro vivo, afastado 2px.
- **Principal bloqueada:** continua no primeiro lugar, apagada com aro de ouro tênue; o motivo fica sempre escrito embaixo da faixa, em brasa (14px, nome da ação em negrito).
- **Secundária bloqueada:** leva um marcador de informação filled (14px) ao lado do nome; o motivo aparece embaixo da faixa, em tinta segunda, ao tocar, passar o mouse ou focar, e fica fixo depois do toque até novo toque.

**The Principal Primeiro Rule.** A ação principal é escolhida pelo que o item existe para fazer, não pelo estado: vem primeiro e nunca troca de lugar. Bloqueada, apaga e diz o porquê; a barra não se reordena.

### Janela de Item (passe + página única)
Inventário, loja, anúncio e catálogo de itens usam o mesmo esqueleto: título com ícone, passe do item, barra de ações, corpo único. Títulos de seção do corpo (Descrição, Características, Magia) são rótulos de 12px em tinta discreta. Linhas de Características: rótulo 15px tinta segunda à esquerda, valor 15px 700 tinta à direita. Valor em prosa (efeitos, itens do ritual) vira rótulo em cima e texto à esquerda, 16px 400. A magia do item é seção da página, sem caixa. Janelas de catálogo de magia e técnica mantêm abas; no bestiário, os ícones de edição do Mestre seguem ao lado do X por enquanto.

### Navigation (Mesa em Sessão)
O menu lateral com rótulos que nasce de quem está em jogo. Ordem, de cima para baixo: marca, seletor de contexto, grupo Mesa, régua, Livro de Regras, conta.
- **Seletor de contexto:** botão de 52px mínimos no topo, contorno de régua forte, canto 10px, chão de célula (hover: bronze a 15%). À esquerda o brasão de 36px (canto 8px, fundo vivo): Mestre vê a inicial da mesa ativa em Cinzel 18px ouro vivo; Jogador vê a foto do personagem ativo, ou a inicial. O nome aparece inteiro em até duas linhas (16px 700), nunca cortado na primeira. Abre um menu em couro de folha (régua forte, canto 10px): Mestre — as mesas (a atual com check), régua, "Todas as mesas", "Sair da mesa"; Jogador — "Abrir ficha", "Trocar de personagem".
- **Destino:** ícone de 19px + rótulo, 40px de alvo, canto 8px, tinta segunda com ícone em tinta discreta. Hover: bronze a 12%, texto em tinta. **Ativo:** fundo vivo, texto em tinta, ícone em ouro vivo — sem faixa lateral. Foco: contorno de 2px em ouro vivo, interno.
- **Gaveta (grupo Mesa):** Diário e a Loja do Mestre (Estoque, Itens da Campanha) abrem no próprio menu; a seta gira 180°, os filhos entram recuados 31px, sem ícone, 34px de alvo, 15px 500. Gaveta fechada que contém a página atual acende como ativa; navegar para um filho abre a gaveta sozinha.
- **Livro de Regras:** abaixo da régua, o rótulo "Livro de Regras" (rótulo de célula) e os itens Criaturas, Itens, Magias, Técnicas, Habilidades. Clicar no item abre a lista inteira; a seta de 32px à direita abre o painel de filtros ao lado (NavMenuPainel) e fica com fundo vivo e ícone em ouro enquanto ele está aberto.
- **Conta:** botão no pé, sobre régua; avatar redondo de 32px, nome 15px 700, papel (Mestre/Jogador) 13px em tinta discreta; abre o menu da conta.
- **Cabeçalho de página:** faixa de 70px com só o título em Cinzel; no celular ganha à esquerda o botão que abre o menu.
- **Celular (≤768px):** o menu vira folha de min(320px, 86vw) em couro de folha que desliza da esquerda (240ms, `cubic-bezier(.16,1,.3,1)`) sobre véu a 62%, com X para fechar. A barra inferior traz os quatro primeiros destinos do grupo Mesa (gaveta vale pelo primeiro filho; o Diário fica no "Mais") e "Mais", que abre a folha. Item: 56px, ícone 22px, rótulo 12px 700 em tinta discreta; ativo em ouro vivo sobre fundo vivo.

**The Mesa Primeiro Rule.** A navegação nasce da mesa ativa (Mestre: Cena, Batalha, Personagens, Diário, Loja, Jogadores) ou do personagem ativo (Jogador: Ficha, Inventário, Loja, Diário, Mesa). Abaixo da régua, o Livro de Regras; a conta no pé. Itens da Campanha moram na Loja da mesa. Trocar e sair da mesa acontecem só no seletor de contexto.

**The Rótulo Sempre Rule.** No desktop todo destino mostra ícone e rótulo; nome em tooltip não conta como rótulo. O trilho de 64px só de ícones (decisão de 12/09/2026) foi substituído pelo menu de 232px com rótulos por escolha do usuário em 22/10/2026.

**The Título Sozinho Rule.** O cabeçalho de página tem só o título em Cinzel. Nada de rótulo em caixa-alta acima dele: o seletor de contexto já diz em que mesa ou personagem se está.

### Faixa da Cena (signature)
A cena da mesa à direita da faixa do topo: pílulas de 32px no véu do console (couro a 80% com desfoque), 15px 600, ícone em ouro: data · local · hora · clima. A hora vem escrita ("15h") ao lado do sol ou da lua; cada trilha do clima traz a palavra ao lado do ícone, que veste a cor do próprio degrau. Para o Mestre as pílulas são editáveis (hover acende o texto em ouro por cima do véu; o clique afunda 1px). A faixa publica a altura real em `--cdj-h` para o cabeçalho e o conteúdo se ajustarem quando ela quebra em linhas.

**The Cena Por Extenso Rule.** Hora e clima se escrevem em palavras ao lado do ícone (usuário, 22/10/2026, revertendo a escolha de só ícone de 20/09/2026). A cena se lê de relance, sem passar o mouse.

### Marca: Selo de Cera
SVG desenhado (`SeloMenestrel`, 01-core/helpers.jsx; repetido em `public/favicon.svg`): cera de borda irregular em degradê radial #B4472C → #8A2E1C → #5C1B10, anel prensado e um M de capitular com serifas em ouro #E0BE68. Ao lado, "Menestrel" em Cinzel 600. Aparece no login (44px), no topo do menu (28px), na tela de carregamento (64px; 36px compacto) e na aba do navegador. Substituiu o ícone ti-currency-monero (símbolo de criptomoeda) em 22/10/2026.

### Entrada (login e primeira entrada)
Duas partes: à esquerda a cena (shader, selo, a frase do produto em Cinzel 600 clamp(30–52px) com no máximo 17ch, e "Feito para Tagmar · Mestres e Jogadores" em 16px 500); à direita o painel opaco (couro #17110A, régua forte à esquerda, 36% da largura, mínimo 420px) com o miolo de 380px centralizado na altura. Título do painel em Cinzel 30px; botão do Google branco no padrão da marca dele (50px, raio 8). Idioma PT/EN no rodapé do painel, o ativo em ouro vivo sobre fundo vivo. Até 860px a cena sobe (42vh) e o painel vem embaixo.

A primeira entrada usa a mesma moldura e pergunta só o papel: "Vou mestrar" / "Vou jogar", dois botões de linha com ícone em ouro num círculo de 46px, título Cinzel 20px e uma frase em 15px. A escolha grava perfil_tipo e plano_escolhido_em; o plano gratuito entra sozinho. "Entrar com outra conta" no rodapé é a saída.

**The Sem Rótulo Acima Rule.** Nenhum título de entrada leva rótulo em caixa-alta ou texto em degradê acima dele; a frase do produto e o título carregam o próprio peso.

### A Primeira Mesa (estado vazio)
Mestre sem mesa nenhuma: Cena, Batalha, Loja e Jogadores mostram o selo (56px), "Sua primeira mesa" em Cinzel 26px, uma frase de 46ch em tinta secundária e o botão primário "Criar mesa". Criada a mesa por ali, o console entra nela sozinho.

### Calendário (CampoData e FantasyDatePicker)
Um campo na pele dos campos vizinhos (--campo-*) que abre o mesmo quadro: couro opaco de 328px, raio 12, régua forte. Cabeçalho com o mês (Alegreya 700, clique vira a grade de meses), o ano editável e as setas; semana em rótulo de célula sobre régua; dias de 36px, escolhido em ouro cheio com tinta escura, hoje com aro de ouro. Rodapé com a data por extenso. A data real se digita (dd/mm/aaaa, barras automáticas) e tem Hoje e Limpar; a do mundo mostra a semana do mundo e marca feriados com um ponto, o nome no rodapé ao passar ou focar. Teclado: setas (viram o mês na borda), PageUp/PageDown, Home/End, Esc fecha só o calendário. Navegar não muda o valor; só escolher um dia muda.

### Busca no Livro de Regras (Ctrl+K)
Campo "Buscar no livro" logo abaixo do rótulo Livro de Regras (36px, régua, tecla Ctrl K à direita) e o atalho Ctrl+K/⌘K em qualquer tela. Abre no alto da tela (14vh) sobre véu a 66%: couro opaco de até 620px, raio 14, campo de 58px com lupa em ouro, resultados em linhas de 44px separadas por régua: ícone do tipo, nome 16px 600 e o tipo em rótulo de célula à direita; a linha ativa em fundo vivo com ícone em ouro. Ordem: começo do nome, depois começo de palavra, depois o resto; sem acento. O Jogador só acha o que o personagem conhece. Escolher leva à lista inteira (sem a folha do submenu) com a janela da entrada aberta.

**The Título Sozinho Rule (listas).** Dentro das listas o quadro não repete o nome da página: o cabeçalho do quadro traz só a busca (à esquerda, até 440px) e as ferramentas e o + à direita. O título fica só para leitor de tela.

### Barra de Ações da Ficha
Os botões que flutuavam nas bordas (D20, D10, Habilidades, Magias, Itens, Amigos) viram uma barra em pílula acima da ficha: couro opaco, régua forte, sticky a 8px do topo do conteúdo. Cada botão tem ícone em ouro e rótulo 15px 700; grupos separados por régua (dados · atalhos · amigos). Os retratos dos amigos (30px) seguem ao lado do Amigos e continuam sendo onde se solta o item arrastado. Painéis abrem logo abaixo do botão; no celular a barra rola na horizontal e o painel sobe do rodapé.

### Inventário: Baú com Painel
No alto, Carga (barra musgo → ouro acima de 75% → brasa acima da capacidade, com peso/capacidade em algarismos) e Bolsa (as quatro moedas). A grade mantém as casas livres e o arraste, mas tem só as linhas ocupadas e mais uma. A partir de 1180px, o item escolhido abre no painel de 360px à direita (a mesma janela do item, sem véu, sticky), e fica marcado na grade com aro de ouro; recipiente mostra o que guarda ali. Sem item escolhido, o painel explica o gesto. Abaixo de 1180px, a janela de sempre.

**Recipiente** (seção Conteúdo da janela do item): título à esquerda e medidor de ocupação à direita na mesma linha (barra de 72px, musgo; azul para líquidos; ouro quando cheio; `usado/capacidade` em algarismos). Embaixo, a grade do baú com casas de 50px, só completando a última fileira (as colunas são medidas pela largura). Vazio também aparece: um aviso em caixa tracejada ("Vazio." e, fora da ficha, como guardar).

### Loja: Balcão em Lista
Mesmo topo do inventário (Carga e Bolsa). Um quadro de linhas: ícone de 40px, nome 16px 700 com o grupo (ou "Vendido por…" para itens de aventureiros) embaixo, estoque (∞ quando ilimitado, Esgotado em brasa), preço em moedas e Comprar. A linha avisa "Bolsa não alcança" em brasa; esgotada, apaga e trava. No celular, a linha empilha nome e Comprar, preço e estoque embaixo; a busca desce para uma linha própria.

### Resumo da Ficha: Tubos e Medalhões
Aprovado em 23/10/2026. **Energia** (esquerda): Física, Heroica e Karma são tubos de alquimista — vidro antigo esverdeado, três aros de ferro com rebite nos quartos (a graduação), remate forjado em cima e taça de três pés embaixo. O número no alto é só o valor (Pirata One); embaixo, só o nome curto, sem ícone. Cores: Física #A3291A, Heroica #4E9A3E, Karma #3558B0. A Física vai até −15 (morte): abaixo de zero o líquido vira vermelho-sangue-seco (#4E0F09) e enche rumo ao −15; o número fica avermelhado. **Condições** (direita): medalhões de 86px — a pintura no meio (por ora o ícone) e, em volta, um tubo de vidro curvado com líquido roxo (#5E2FA0, claro no meio) até a porcentagem, aros de ferro em 25/50/75% e remate no alto. Sem texto: nome e porcentagem no tooltip; condição em zero recua (dessaturada). Todo líquido borbulha (bolhas sobem nos tubos e correm no anel), a superfície balança e um furta-cor oleoso escorre por cima; tudo para com prefers-reduced-motion. **Experiência**: faixa simples no pé do cartão (rótulo, barra fina dourada, XP, estágio). Títulos das colunas (Energia, Condições) em Pirata One — experimento do usuário, só aqui por enquanto.

### Preço por Extenso
O valor se grava em latão (1 ouro = 10 prata = 100 cobre = 1000 latão), mas se mostra nas moedas maiores, por extenso: 12000 → "12 moedas de ouro"; 5234 → "5 moedas de ouro, 2 de prata, 3 de cobre e 4 de latão" (precoPorExtenso, 01-core). Vale para a linha Valor das janelas de item, a coluna Valor da gestão da loja e as mensagens de custo. Onde o Mestre digita o valor, a ajuda embaixo do campo mostra a conversão ao vivo ("= 12 moedas de ouro"); o rótulo continua só "Valor", sem "latão". Na vitrine e na bolsa seguem as pílulas de moeda.

### Arte dos Slots de Equipamento
Pinturas no estilo de ícone de inventário de RPG (pincelada visível, luz quente vinda de cima à esquerda, fundo marrom quase preto #17110A que se funde ao couro), uma peça sozinha em três quartos, sem texto ou moldura. Peças em par aparecem como uma peça só. Três versões por peça: leve, médio e pesado pelo tipo de armadura; simples, ornado e nobre para joias e roupas, pelo valor. Arquivos em public/equip/ (WebP 320px); a casa vazia mostra a versão do meio esmaecida. Progresso em .impeccable/arte-equipamentos.md.

### Ícones
Tabler Icons (webfont), versão filled sempre que existir — `src/tabler-filled.css` faz a troca; escrever `ti ti-nome` normalmente.

### Pendências conhecidas (não são regras)
- O corpo da janela de criatura ainda não foi revisto: segue com texto justificado e o desenho antigo até a etapa do bestiário.
- Há cores legadas sem token espalhadas por `src/index.css` (o detector aponta perto de 1160 achados de cor fora do sistema, quase todos anteriores ao Quadro de Iniciativa). Não servem de referência para tela nova.
- A Política de Privacidade ainda não existe; o aviso do login fica sem link até ela existir.
- A pílula dourada "Novo personagem" deve sumir com a ficha aberta; o código indica que some, falta a confirmação na tela.

## Do's and Don'ts

### Do:
- **Do** mostrar a entidade em foco como passe: células com rótulo de 12px em caixa-alta espaçada e valor de 20–24px tabular.
- **Do** montar listas como quadro: linhas de 44px, régua de bronze entre elas, colunas numéricas de largura fixa alinhadas à direita.
- **Do** marcar a linha escolhida com preenchimento de ouro a 15% e aro interno de 1px em ouro vivo.
- **Do** escrever o motivo do bloqueio na própria linha, em brasa, antes do clique.
- **Do** colocar os botões de confirmação no rodapé do modal: Cancelar à esquerda, primária à direita; empilhados no celular.
- **Do** usar o QuantidadeStepper para toda escolha de quantidade, o Campo Único para todo campo e o sistema de botões para todo botão.
- **Do** usar ícones Tabler, filled onde houver.
- **Do** manter o texto em tinta discreta ou mais claro; legibilidade é requisito, não acabamento.
- **Do** abrir a janela de item com o passe fixo (texto primeiro, número líder em 32px) e a barra de ações com nome, principal primeiro e Descartar por último.
- **Do** escrever sempre, em brasa, por que a ação principal está bloqueada; nas secundárias, mostrar o marcador de informação e escrever o motivo ao toque.
- **Do** alinhar texto corrido de modal à esquerda com `text-wrap: pretty`.
- **Do** fazer a navegação nascer da mesa ativa (Mestre) ou do personagem ativo (Jogador), com o Livro de Regras abaixo de uma régua e a conta no pé.
- **Do** mostrar ícone e rótulo em todo destino do menu no desktop; ativo com fundo vivo e ícone em ouro vivo.
- **Do** escrever a hora e o clima por extenso na faixa da cena.

### Don't:
- **Don't** usar Cinzel abaixo de 18px nem em números.
- **Don't** usar ouro em rótulo, título ou decoração; ouro é só estado vivo.
- **Don't** usar brasa para ênfase; ela significa mudou ou bloqueia.
- **Don't** usar o roxo arcano fora de magia.
- **Don't** aninhar cards nem cercar grupos com caixas; use régua.
- **Don't** marcar seleção com barra lateral colorida; use preenchimento e aro.
- **Don't** usar glow em seleção, foco ou hover.
- **Don't** criar pele nova de modal, botão, campo ou seletor de quantidade.
- **Don't** trocar a família de cor da paleta couro/ouro/brasa/magia.
- **Don't** reordenar a barra de ações pelo estado nem esconder a principal quando bloqueada.
- **Don't** repetir em Características um valor que já está no passe.
- **Don't** dividir a janela de item em abas nem pôr a magia do item numa caixa.
- **Don't** justificar texto corrido.
- **Don't** pôr rótulo em caixa-alta (kicker) acima do título de página.
- **Don't** voltar ao trilho só de ícones nem deixar o nome do destino só no tooltip.
- **Don't** oferecer "Sair da mesa" fora do seletor de contexto.
