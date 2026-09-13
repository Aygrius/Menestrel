# Estudo — enxugar e melhorar o catálogo de magias

**Levantado em 12/09/2026** lendo as 238 magias (descrição e os cinco níveis) e
agrupando por **efeito no motor**, por **habilidade afetada** e por **tema**.
As sugestões respeitam o perfil já decidido — Mago ataque, Bardo suporte,
Rastreador controle animal, Sacerdote cura, e dano e proteção por elemento.

**Aplicado no mesmo dia** (`scripts/sql/magias-reforma-perfis.sql`): as seções
**2.1**, **2.2** e sete linhas de **2.6**. O resto segue como proposta. Quem
perdeu com as fusões está em *Sugestões de magias*, §3, e resumido no fim deste
estudo.

---

## 0. Resumo

| | Proposto | Aplicado |
|---|---|---|
| Dificuldade de habilidade (2.1) | 22 → 6 | **22 → 6** |
| Controle e debuff (2.2) | 4 → 2, e Degeneração vira ataque | **aplicado** |
| Utilidade (2.6) | 22 → 10 | **14 → 7**, e Teriantropia excluída |
| Dano, suporte, invocação (2.3 a 2.5) | 25 → 13 | não decidido |
| Cortar ou reescrever (seção 3) | 13 → 4 | não decidido |
| **Catálogo** | 238 → 183 | **238 → 235** (com as 25 magias novas das sugestões) |

### Os critérios

Uma magia foi marcada quando cai em pelo menos um destes:

1. **Clone de número** — mesmo efeito, mesmos números, mesmo alcance de outra.
2. **Fatia de outra** — faz uma parte do que outra magia já faz inteira (por
   exemplo, reduzir a dificuldade de *uma* habilidade quando outra reduz a do
   *grupo*).
3. **Muleta** — só existe para destravar ou acompanhar outra magia.
4. **Não muda decisão na mesa** — efeito cosmético, minúsculo, ou que o
   jogador resolve sem magia.
5. **Nível que não escala** — os cinco níveis mudam só uma distância ou um
   tempo, sem mudar o que a magia faz.

---

## 1. Os clones exatos (mesmos números)

| Magias | Nível 1 → 9 | Situação |
|---|---|---|
| **Degeneração Física** e **Ruído** | Reduz 1 → 9 colunas de ataque, 20 metros | **resolvido** — Degeneração virou ataque infernal |
| **Bênção** e **Canção do Alento** | +1 → +5 colunas e +5 → +25 de energia heroica | segue |
| **Relâmpago** e **Fogo Divino** | Causa 28 → 44, 100 metros, 1 rodada | **resolvido** — ar e celestial |
| **Putrefação** e **Armadilha Natural** | Causa 12 → 28 | meio resolvido — Putrefação é infernal; Armadilha segue dano base |
| **Curas Heroicas** e **Heroísmo** | Restaura 8 de energia heroica no nível 1 | segue |
| **as cinco manipulações** | Causa 4 → 20, 10 metros | ficam — o elemento é a identidade delas |

---

## 2. Grupos que podem virar uma magia

### 2.1 Dificuldade de habilidade — 22 magias viram 6 ✓ aplicado

| Magia final | Vale para | Absorveu | Custo |
|---|---|---|---|
| **Amizade** | grupo Influência | Empatia, Detectar Intenção, Sedução, Avaliação, Convocação | 1 |
| **Conhecimento Natural** | grupo Geral | Faro, Rastreamento, Orientação, Sexto Sentido, Dominação Animal | 1 |
| **Conhecimento** | grupo Profissional | Mestre da Forja | 2 |
| **Dom das Línguas** *(nova)* | Idioma e Alfabetização | Linguagem, Conhecimento Linguístico, Escrita | 2 |
| **Sombra** *(nova)* | grupo Subterfúgio | Camuflagem, Ausência | 1 |
| **Graça Felina** *(nova)* | grupo Manobra | Deslocamento Natural, Malabarismo, Aprimorar Habilidades | 1 |

Três escolhas feitas na aplicação:

- **Dom das Línguas cita as duas habilidades pelo nome.** Idioma e
  Alfabetização moram no grupo Conhecimento, e dar o grupo inteiro seria dar
  muito mais do que as três magias faziam.
- **Amizade e Graça Felina são "para o próximo teste"** (instantâneas), como
  eram quase todas as que absorveram. Conhecimento Natural, Conhecimento, Dom
  das Línguas e Sombra duram 1 hora.
- **O custo nunca sobe para quem já tinha a magia.** A permissão da final é a
  soma das permissões das antigas, e o custo é o da maioria delas — nenhum
  personagem passou a gastar mais pontos.

### 2.2 Controle e debuff ✓ aplicado

| Fundiu | Em | A magia final |
|---|---|---|
| Ruído, Ruído Extenuante | **Ruído** (Bardo) | níveis 1–5 reduzem colunas; 7 e 9 reduzem também 8 e 12 de velocidade |
| Degeneração Física | vira **ataque** | "Causa 6 → 22 de dano infernal e reduza 1 → 3 colunas de ataque" |
| Distração, Região Inviolável | **Distração** (Bardo e Trilha de Guardiões) | reduz 4 → 12 de velocidade; nos níveis 7 e 9, 20 e 28 em todos na área |

### 2.3 Dano — não decidido

| Fundir | Em | A magia final |
|---|---|---|
| Flecha Divina, Feixes Incandescentes | Relâmpago (ar) e Fogo Divino (celestial) | Relâmpago, Fogo Divino e Feixes já ganharam elemento; Flecha Divina segue dano base |
| Armadilha Natural | armadilha de verdade | fica armada no local e dispara quando alguém pisa |
| As cinco manipulações | manter as cinco | a Fotomanipulação passaria a se chamar Celestomanipulação |

### 2.4 Suporte e cura — não decidido

| Fundir | Em | A magia final |
|---|---|---|
| Bênção, Canção do Alento | **Bênção** (Sacerdote, alvo único) e **Canção do Alento** (Bardo, área) | ficam as duas, mas a do Bardo pega todos os aliados no raio |
| Curas Heroicas, Heroísmo, Curas Espirituais | **Curas Espirituais** | níveis 1–5 como Curas Heroicas, 7–9 como Heroísmo |
| Herbologia, Recuperação Física, Purificação (a parte de veneno) | **Purificação** | cura veneno, vício e doença por tipo |
| Ressurreição, Retorno do Mártir | **Ressurreição** | 7–9 como Retorno do Mártir |
| Hibernar, Campo Abençoado, Vigília | **Descanso Profundo** *(nova)* | recuperação fora de combate, sozinho, em grupo ou atento |

Com as 13 curas de ordem já aplicadas, a fusão das curas perdeu urgência: o
Sacerdote tem 16 curas compráveis.

### 2.5 Invocação e banimento — não decidido

| Fundir | Em | A magia final |
|---|---|---|
| Chamado Elemental, Domínio Elemental | **Chamado Elemental** | nos níveis altos, já controlado |
| Conjuração Demoníaca, Domínio Demoníaco | **Conjuração Demoníaca** | mesma lógica |
| Apelo, Última Oração | **Apelo** | Última Oração vira os níveis 7–9 |
| Retorno, Expulsão, Desfazer | **Expulsão** | bane por tipo |
| Criação, Criatura Disforme, Necroanimação | **Criação** e **Necroanimação** | *Atenção:* Criação cita a magia "Controle", **que não existe no catálogo** |

### 2.6 Utilidade — sete aplicadas

| Fundir | Em | Situação |
|---|---|---|
| Hidrotolerância, Respiração Arcana | **Respiração Arcana** | ✓ água nos níveis 1–5, qualquer ambiente em 7–9; virou Básica (Mago e Ordem de Ganis) |
| Visão Térmica, Visão Animal | **Visão Animal** | ✓ escuridão até o 5; calor e invisíveis em 7–9 |
| Detecção de Magia, Análise | **Detecção de Magia** | ✓ a descrição ganhou a análise de objeto |
| Sentido Natural, Comunhão Natural | **Comunhão Natural** | ✓ sentidos pela vegetação, alcance pelo nível |
| Marca da Morte, Caçada Marcada | **Caçada Marcada** | ✓ 1 → 500 km; Trilha de Caçadores e Ordem de Crezir |
| Mutação, Transformação Animal | **Mutação** | ✓ Transformação Animal virou os níveis 7–9 e saiu de Ancestral |
| Licantropia Lupina, Teriantropia | — | ✓ **só a Teriantropia foi excluída** (decisão sua) |
| Levitação, Vôo | **Vôo** | não decidido |
| Ilusões, Pseudoconsciência, Pseudomatéria, Armadilha Ilusória | **Ilusões** | não decidido |
| Cataclisma, Explosão Mística, Rompimento de Harmonia | **Rompimento de Harmonia** | não decidido |

---

## 3. Cortar ou reescrever — não decidido

| Magia | O problema | Sugestão |
|---|---|---|
| **Ventriloquismo** | cosmético; o nível só muda a distância da voz | virar nível de **Ilusões** |
| **Invocar Instrumento** | 12 horas de evocação para o instrumento voar até a mão | cortar, ou virar truque instantâneo do Bardo |
| **Memorização** | o jogador lembra do que quiser sem magia | cortar |
| **Abrigo** | ritual que a habilidade Sobrevivência já resolve | virar parte de **Conhecimento Natural** |
| **Leitura** | "compreenda um livro" | virar nível alto de **Dom das Línguas**, que agora existe |
| **Transformação Metálica** | muda a maleabilidade de metal por tamanho | fundir em **Desintegração** |
| **Aura Ameaçadora** | obra de arte com números de combate que nunca chegam ao combate | reescrever como aura no conjurador |
| **Criptograma Místico** | protege um texto escrito | virar nível de **Runas** |
| **Lenda Viva** | dá vida a uma lenda local, sem efeito definido | fundir em **Lendas** |
| **Ambiente Natural** | só libera outras magias fora da natureza | cortar a restrição das outras, e esta some |
| **Ossos de Aço** | só vale para queda | reescrever como proteção física do Naturalista |
| **Telecinese** nível 1 | "derruba 1 kg" | começar em 5 kg |
| **Sono** | o nível não diz por quanto tempo | reescrever com "A magia tem duração de N rodadas" |

---

## 4. Difíceis de equilibrar

| Magia | Por quê |
|---|---|
| **Soneto da Morte** | quem ouve as quatro estrofes morre, aliado ou inimigo, sem resistência |
| **Julgamento de Cruine** | até 100% da energia heroica e física |
| **Possessão** e **Canção do Controle** | tiram o personagem do jogador |
| **Ordens** | cinco palavras de comando obrigatório |
| **Piedade** | converte um inimigo em servo por um ano |

Sugestão comum às cinco: **custo alto e resistência sempre** (inclusive para
aliados), e o nível máximo como Ancestral.

---

## 5. Depois da aplicação — quem perdeu

| Profissão | Magias antes | Depois | Das suas, fundidas ou excluídas |
|---|---|---|---|
| **Rastreador** | 50 | 43 | **12 (24%)** |
| **Bardo** | 41 | 37 | 8 (19,5%) |
| Sacerdote | 88 | 97 | 11 (12,5%) |
| Mago | 97 | 102 | 5 (5,2%) |

> **O Rastreador foi o mais prejudicado**: as fusões de dificuldade e de
> utilidade tiraram um quarto da lista dele, e as magias de controle animal que
> o compensariam não foram decididas. O Bardo vem em seguida, e a Confraria de
> Arautos ficou com uma magia só.

**A migração já foi feita** no mesmo script: os cinco personagens que conheciam
magias fundidas (Sedução, Rastreamento, Dominação Animal, Aprimorar Habilidades
e Transformação Animal) apontam para a magia final, com o maior passo que
tinham. Gnomo, Duende e Verme do Deserto, e dez itens, citam o nome novo.

## 6. Ordem sugerida para o que falta

1. **Controle animal do Rastreador** (sugestões §4.1) — compensa a profissão mais prejudicada.
2. **Muletas de Ilusões e das invocações (2.5, 2.6)** — viram níveis.
3. **Cortes (seção 3)**.
4. **As decisivas (seção 4)** — regra antes de texto.
