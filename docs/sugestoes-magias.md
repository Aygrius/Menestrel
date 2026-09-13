# Magias — estatística, sugestões e o que foi aplicado

**Atualizado em 12/09/2026, depois da reforma.** A primeira versão deste
documento propunha magias novas e adaptações a partir do catálogo de 238
magias. As decisões foram aplicadas no banco por
`scripts/sql/magias-reforma-perfis.sql` (backup em `backup.*_20260912`), e as
análises abaixo foram **refeitas contra o catálogo novo**, com a mesma conta
das *Estatísticas do catálogo* desta página.

---

## 0. O perfil de cada profissão (decisão sua)

| Profissão | Foco |
|---|---|
| **Mago** | magias de **ataque**, de acordo com cada colégio |
| **Bardo** | magias de **suporte** |
| **Rastreador** | magias de **controle animal** |
| **Sacerdote** | magias de **cura**, de acordo com cada ordem |

E, atravessando as profissões: **proteção e dano por elemento** — fogo, terra,
água, ar, celestial e infernal.

---

## 1. O que foi aplicado

```
238 magias → 235 magias   ·   no motor 95 → 106   ·   0 quebradas · 0 ambíguas
+25 novas · 28 fundidas em outras · 1 excluída (Teriantropia) · 1 renomeada
```

As descrições das magias novas foram escritas no tom das que já existiam:
segunda pessoa, a restrição de uso na própria descrição, e o teste de
resistência mágica só onde o alvo tem de onde escapar.

### 1.1 Magias novas aplicadas — ataque para os colégios com menos ataque

| Magia | Colégio | Custo | Evocação · Alcance | Nível 1 → 9 |
|---|---|---|---|---|
| **Frasco Incendiário** | Alquímico | 2 | 1 rodada · 15 metros | 10 → 30 de dano elemental de fogo, pode atingir quem estiver próximo |
| **Névoa Cáustica** | Alquímico | 1 | 1 rodada · 20 metros | 6 → 22 de dano elemental de ar, com resistência |
| **Verdade Ofuscante** | Filosófico | 1 | 1 rodada · 20 metros | 6 → 26 de dano elemental celestial |
| **Paradoxo** | Filosófico | 2 | 2 rodadas · 20 metros | 4 → 20 de dano na energia heroica e −1 → −5 colunas por 3 rodadas |
| **Terror Fantasma** | Ilusionista | 1 | Instantânea · 20 metros | 6 → 22 de dano na energia heroica |
| **Enxame de Espinhos** | Naturalista | 1 | 1 rodada · 20 metros | 6 → 26 de dano elemental de terra, só em solo natural |

Rajada Cortante (Elemental) e Chama Negra (Necromântico) **não entraram**: o
Elemental já é o colégio com mais ataque, e o Necromântico ganhou dano infernal
comprável com Putrefação, Toque Gélido e Degeneração Física.

### 1.2 Bardo

| Magia | Confraria | Custo | Evocação · Alcance · Duração | Nível 1 → 9 |
|---|---|---|---|---|
| **Cadência Veloz** | Artistas | 2 | Instantânea · 10 metros · 3 rodadas | +3 → +9 de velocidade para todos os aliados na área |

Hino de Guerra, Balada do Escudo, Canção da Firmeza e Refrão Heroico foram
descartadas.

### 1.3 Sacerdote — uma cura com a cara de cada ordem

| Magia | Ordem | Custo | Nível 1 → 9 |
|---|---|---|---|
| **Bálsamo de Lena** | Lena | 1 | +5 → +25 de Saúde (condição da ficha) |
| **Seiva de Maira** | Maira | 2 | 6 → 30 de energia física, só em ambiente natural |
| **Maré Restauradora** | Ganis | 2 | 4 → 20 de energia heroica e de energia física |
| **Paz Coletiva** | Selimon | 2 | 4 → 16 de energia heroica, todos os aliados na área |
| **Sangue de Batalha** | Blator | 2 | 8 → 24 de energia física e +1 → +3 colunas, em si |
| **Descanso de Cruine** | Cruine | 1 | 8 → 32 de energia heroica; fere morto-vivo |
| **Justa Reparação** | Crizagom | 2 | 4 → 20 de energia física e +2 → +6 de defesa |
| **Bênção da Terra** | Sevides | 2 | 6 → 22 de energia física e reduz 4 → 16 de dano de terra |
| **Chama Vital** | Crezir | 2 | 6 → 22 de energia física e reduz 4 → 16 de dano de fogo |
| **Mente Serena** | Palier | 1 | 6 → 24 de energia heroica |
| **Têmpera da Carne** | Parom | 2 | 6 → 22 de energia física e +1 → +3 de defesa |
| **Alívio Dourado** | Cambu | 2 | 3 → 12 de energia heroica, todos os aliados na área |
| **Presságio Curativo** | Plandis | 1 | 4 → 20 de energia física, evocação instantânea |

O custo seguiu as curas que o Sacerdote já tinha: **1** para a cura de um poço
só (como Curas Heroicas), **2** para a que cura em área ou soma um segundo
efeito (como Curas Físicas e Curas Espirituais).

### 1.4 Elementos — as proteções que faltavam

| Magia | Quem | Custo | Nível 1 → 9 |
|---|---|---|---|
| **Égide Celestial** | Colégio Necromântico | 1 | reduz 8 → 24 de dano elemental celestial |
| **Selo Abismal** | Ordem de Cruine | 1 | reduz 8 → 24 de dano infernal |

### 1.5 Adaptações das magias existentes

| Magia | Antes | Agora |
|---|---|---|
| **Relâmpago** | dano base | dano elemental de **ar** |
| **Raio Elétrico** | dano elemental de fogo | dano elemental de **ar** |
| **Toque Gélido** | dano base | dano **infernal** |
| **Fogo Divino** | dano base | dano elemental **celestial** |
| **Feixes Incandescentes** | dano base | dano elemental de **fogo** |
| **Putrefação** | dano base | dano **infernal** |
| **Hidroproteção** | Perdida, Sacerdote | **Básica**, Sacerdote e Colégio Elemental |
| **Aeroproteção** | Rastreador | Rastreador e **Colégio Elemental** |
| **Covardia** | Ilusionista e Ordem de Blator | só **Colégio Ilusionista** |
| **Apontar Sufocante** | "Imobiliza o alvo por N rodadas" | "A magia tem duração de N rodadas. Reduza 1 de energia física por rodada." — **entrou no motor** |
| **Recupereção Física** | nome e chave com erro, sem tipo | **Recuperação Física**, Básica |

Curas Naturais e Curas Heroicas ficaram como estavam. As três correções de
texto de §3.4 que diziam "um nível" (Dominação Animal, Alucinação e
Rastreamento) já estavam com dígito no banco; duas delas saíram na fusão.

---

## 2. O catálogo contra o perfil, refeito

```
235 magias · 106 no motor
Função (no motor):   Ataque 36 · Suporte 28 · Cura 19 · Controle 14 · Proteção 9
Raridade:            Básica 175 · Perdida 46 · Ancestral 14
```

| | Antes | Depois |
|---|---|---|
| Ataque no motor | 29 | **36** |
| Cura no motor | 6 | **19** |
| Proteção no motor | 7 | **9** |
| Suporte no motor | 37 | 28 — as fusões de dificuldade |
| Controle no motor | 16 | 14 — Ruído Extenuante e Região Inviolável fundidas; Degeneração virou ataque |
| Travadas (Perdida + Ancestral) | 66 (28%) | **60 (26%)** |

### Mago — ataque, por colégio

| Colégio | Antes | Depois | Quais |
|---|---|---|---|
| Todo Mago | 4 | 4 | Bola de Fogo, Raio Elétrico, Fotomanipulação, Dardos de Luz (travada) |
| Colégio Elemental | 7 | 7 | as quatro manipulações, Dardos de Gelo, Meteoros, Energia Primordial (travada) |
| Colégio Necromântico | 5 | **6** | Putrefação, Toque Gélido e **Degeneração Física** compráveis, e as três travadas |
| Colégio Naturalista | 2 | **3** | Relâmpago, Feixes Incandescentes, **Enxame de Espinhos** |
| Colégio Ilusionista | 1 | **2** | Covardia, **Terror Fantasma** |
| Colégio Alquímico | 0 | **2** | **Frasco Incendiário**, **Névoa Cáustica** |
| Colégio Filosófico | 0 | **2** | **Verdade Ofuscante**, **Paradoxo** |

Todo colégio tem agora ao menos dois ataques compráveis.

### Sacerdote — cura, por ordem

| | Antes | Depois |
|---|---|---|
| Curas compráveis | 3 | **16** |
| Ordens com cura própria | 0 de 13 | **13 de 13** |

### Elementos — dano e proteção (no motor)

| Elemento | Dano antes | Dano depois | Proteção antes | Proteção depois |
|---|---|---|---|---|
| Fogo | 3 | 4 | 1 | **2** (Chama Vital) |
| Terra | 2 | 3 | 1 | **2** (Bênção da Terra) |
| Água | 2 | 2 | 1 (Perdida) | 1 (**Básica**) |
| Ar | 1 | **4** | 1 | 1 (agora também no Elemental) |
| Celestial | 4 | 6 | **0** | **1** (Égide Celestial) |
| Infernal | 4, todas travadas | **7, três compráveis** | **0** | **1** (Selo Abismal) |
| Sem elemento | 13 | 10 | — | — |

Os três buracos de antes estão fechados: **todo elemento tem dano e proteção
compráveis**, o dano infernal pode ser comprado, e os ataques com nome de
elemento passaram a ter o elemento no texto.

---

## 3. Quem saiu perdendo com as fusões

A fusão soma as permissões: quem comprava a magia antiga alcança a final. Mesmo
assim, cada profissão fica com **menos magias distintas** na lista, e a perda
não se distribuiu por igual.

| Profissão | Antes | Depois | Saldo | Das suas, fundidas ou excluídas | Compráveis | No motor |
|---|---|---|---|---|---|---|
| **Rastreador** | 50 | 43 | **−7** | **12 (24%)** | 39 → 34 | 21 → 19 |
| **Bardo** | 41 | 37 | **−4** | 8 (19,5%) | 31 → 28 | 19 → 18 |
| Sacerdote | 88 | 97 | +9 | 11 (12,5%) | 63 → 76 | 37 → 48 |
| Mago | 97 | 102 | +5 | 5 (5,2%) | 73 → 79 | 30 → 41 |

> **O Rastreador foi o mais prejudicado.** Perdeu 12 magias da lista — um
> quarto dela —, 6 das quais estavam no motor, e **não ganhou nenhuma magia
> do seu perfil**, porque as sugestões de controle animal (§4) ficaram fora
> das decisões. Das fundidas, só Teriantropia saiu sem deixar caminho.

**Rastreador** — o que saiu: Aprimorar Habilidades, Deslocamento Natural (→
Graça Felina), Camuflagem (→ Sombra), Conhecimento Linguístico (→ Dom das
Línguas), Dominação Animal, Faro, Orientação, Rastreamento (→ Conhecimento
Natural), Região Inviolável (→ Distração), Sentido Natural (→ Comunhão
Natural), Visão Térmica (→ Visão Animal) e Teriantropia. Um detalhe pesa no
perfil: **Dominação Animal era a única magia com nome de controle animal que
ele comprava**, e agora vive dentro de Conhecimento Natural.

**Bardo** — o que saiu: Empatia, Detectar Intenção, Sedução (→ Amizade),
Linguagem, Escrita (→ Dom das Línguas), Malabarismo (→ Graça Felina), Ausência
(→ Sombra) e Ruído Extenuante (→ Ruído). Ganhou Cadência Veloz. Todas as
fundidas têm caminho.

**Sacerdote** e **Mago** saíram no positivo: as fusões tiraram 11 e 5, e as
magias novas devolveram 15 e 7. O Sacerdote também deixou de ter Covardia pela
Ordem de Blator, que ganhou Sangue de Batalha.

### As especializações que mais perderam

| Especialização | Antes | Depois |
|---|---|---|
| **Trilha de Exploradores** | 12 | **8** |
| Trilha de Caçadores | 12 | 10 |
| **Confraria de Arautos** | 2 | **1** — só Sombra |
| Trilha de Guardiões | 18 | 17 |
| Ordem de Cambu | 10 | 9 |
| Ordem de Lena | 7 | 6 |
| Colégio Ilusionista | 17 | 16 |

A Confraria de Arautos, que já era a menor especialização do catálogo, ficou
com uma magia só. As duas sugestões feitas para ela (Hino de Guerra e Balada do
Escudo) estavam entre as descartadas.

---

## 4. O que ficou por decidir

### 4.1 Rastreador — controle animal (a sugestão 2.3)

A seção não recebeu decisão, e é a que compensaria a profissão mais
prejudicada. As cinco continuam prontas para entrar, todas com `so_racas:
['Animal']`:

| Magia | Quem | Nível 1 → 9 |
|---|---|---|
| **Acalmar Fera** | Rastreador | o animal fica sem ações por 1 → 5 rodadas |
| **Espantar Fera** | Trilha de Guardiões | −4 → −12 de velocidade e −1 → −3 colunas |
| **Instigar Fera** | Trilha de Caçadores | animal aliado ganha +1 → +3 colunas e +3 → +9 de velocidade |
| **Couro de Fera** | Trilha de Guardiões | animal aliado reduz 4 → 16 de dano |
| **Chamado da Matilha** | Trilha de Exploradores | todos os animais aliados na área ganham +1 → +3 colunas |

### 4.2 As travadas, explicado (a antiga 3.6)

**Perdida** e **Ancestral** são raridades que não se compram com pontos: cada
**nível** se aprende com um pergaminho próprio. **Resolvido em 12/09/2026**: o
catálogo tem agora **286 pergaminhos**, um para cada nível com texto das 60
magias travadas ("Pergaminho Vôo 1", "Pergaminho Vôo 3"… até o 9), criados por
`scripts/sql/pergaminhos-magias-travadas.sql` e `pergaminhos-por-nivel.sql`.

Usar o pergaminho no inventário ensina aquele nível, e só se o personagem já
tem o anterior, pode acessar a magia, está no estágio e tem pontos de magia —
a RPC `usar_pergaminho_magia` já fazia essas checagens. O que falta é o
pergaminho **chegar à mesa**: loja, recompensa ou item de história, a critério
do Mestre.

### 4.3 Os sistemas que mais destravam, pelo perfil

| Peça | Para quem | O que destrava |
|---|---|---|
| **Companheiro animal** | Rastreador | Aprimoramento Animal, Vínculo Vital, Elo Animal, metade de Força Mútua e Véu de Maira |
| **Porcentagem de poço** | Sacerdote | Nutrição Natural (cura), Julgamento de Cruine, Passagem Vital, Pele Ígnea |
| **Karma como alvo** | Mago e Bardo | Cataclisma, Explosão Mística, Rompimento de Harmonia |
