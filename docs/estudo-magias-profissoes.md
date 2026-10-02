# Estudo — magias por profissão: acesso e equilíbrio

**Levantado em 29/09/2026** direto no banco (238 magias), com as regras de compra
do código: `podeAcessarMagia`, `pontosMagiasTotal`, `gastoMagias` e o teto de
nível por estágio do criador de personagem.

**A hierarquia pedida pelo usuário:** "Em níveis de acesso a magia, os magos
terão mais acesso, em segundo plano vem os sacerdotes, depois igualmente vem os
bardos e os rastreadores."

**Veredito:** a ordem só vale nos **pontos**. No **catálogo** ela não vale:

- o Sacerdote começa com mais magias que o Mago;
- o Rastreador tem cerca de 40% mais magias que o Bardo;
- a Confraria de Arautos quase não tem magia própria.

---

## 0. Resumo

| | Mago | Sacerdote | Bardo | Rastreador | Pedido |
|---|---|---|---|---|---|
| Pontos por estágio | **14** | **10** | **8** | **8** | ✓ Mago > Sacerdote > Bardo = Rastreador |
| Catálogo base (estágios 1–4) | 15 | **19** | 11 | 14 | ✗ Sacerdote passa o Mago; Bardo ≠ Rastreador |
| Catálogo com especialização (média) | 27,7 | 26,5 | **16,7** | 23,7 | ✗ Sacerdote empata com o Mago; Bardo bem abaixo |
| Catálogo com especialização (faixa) | 22–36 | 23–30 | 12–19 | 21–27 | |
| Magias no estágio 1 (nível 1) | 11 | 9 | 7 | 7 | ✓ |
| Catálogo inteiro no teto, no estágio 20 | 67–100% | 49–67% | 60–100% | 46–60% | ✗ o Bardo vai mais fundo que o Sacerdote |

"Catálogo" conta só as magias **compráveis com pontos** (tipo Básica). Perdidas
e Ancestrais se aprendem com pergaminho e estão na §3.

---

## 1. Como a conta foi feita

- **O que cada um alcança.** A profissão compra o que a `permissao` cita por
  nome. Do estágio 5 em diante soma o que cita a especialização dele.
- **Pontos.** Taxa da profissão × estágio: Mago 14, Sacerdote 10, Bardo 8 e
  Rastreador 8.
- **Custo de uma magia.** É `custo × nível` (1, 3, 5, 7 ou 9), e não o custo
  por passo. O nível não pode passar do estágio.
- **"Magias no estágio N"** é quantas magias diferentes cabem no nível 1,
  comprando as mais baratas primeiro.
- **"Catálogo no teto"** é quanto do catálogo do caminho os pontos pagam com
  cada magia no nível máximo que o estágio permite.

---

## 2. Tamanho do catálogo por caminho

### Na base (estágios 1 a 4)

| Profissão | Compráveis | Travadas | Custo médio |
|---|---|---|---|
| Sacerdote | **19** | 8 | 1,53 |
| Mago | 15 | 7 | 1,40 |
| Rastreador | 14 | 4 | 1,57 |
| Bardo | 11 | 7 | 1,45 |

As 19 do Sacerdote são: Apelo, Bênção, Corrente, as três Curas, Detecção de
Magia, Esconjuração, **Hidroproteção**, Ira Divina, Maldições, Ordens, Quebra
de Encantos, Recuperação Física, Regeneração, **Relâmpago**, Ressurreição,
Sagração e **Super Resistência**. As três em negrito não têm cara de tronco
comum do clero. A §4 trata delas.

### Com especialização (estágio 5 em diante)

| Profissão | Especialização | Compráveis | Travadas |
|---|---|---|---|
| Mago | Colégio Elemental | **36** | 10 |
| | Colégio Ilusionista | 31 | 7 |
| | Colégio Necromântico | 31 | **19** |
| | Colégio Alquímico | 23 | 7 |
| | Colégio Naturalista | 23 | 8 |
| | Colégio Filosófico | **22** | 7 |
| Sacerdote | Crezir, Cruine, Maira | 30 | 9–12 |
| | Blator, Cambu, Ganis, Sevides | 27 | 8–9 |
| | Crizagom, Palier | 26 | 8–9 |
| | Parom, Plandis | 24 | 8 |
| | Lena, Selimon | 23 | 9–10 |
| Rastreador | Trilha de Guardiões | **27** | 8 |
| | Trilha de Caçadores | 23 | 5 |
| | Trilha de Exploradores | 21 | 5 |
| Bardo | Confraria de Artistas | 19 | 7 |
| | Confraria de Eruditos | 19 | 9 |
| | Confraria de Arautos | **12** | 7 |

Três achados:

1. **O Mago mais fraco fica abaixo do Sacerdote médio.** Filosófico (22),
   Alquímico e Naturalista (23) alcançam menos que nove das treze Ordens.
2. **A Confraria de Arautos tem uma magia só: Sombra.** Um Bardo que entra
   nela ganha uma magia no estágio 5, contra +8 dos outros Bardos e +6 a +13
   dos Rastreadores.
3. **Trilha de Guardiões (27) é um Sacerdote médio.** Ela passa três Ordens e
   três Colégios.

---

## 3. Verificação

| Checagem | Resultado |
|---|---|
| Permissão que cita profissão ou especialização inexistente | **nenhuma** ✓ |
| Magia sem permissão | **nenhuma** ✓ |
| Magia sem nível 5 | **Soneto da Morte** (Ancestral, custo 1): só tem o nível 1. Parece texto faltando, não decisão. |
| Magias sem nível 9 | 24. Quase todas são utilitárias de 3 níveis (Amizade, Conhecimento, Leitura…), o que parece decisão. |
| Travadas (Perdida/Ancestral) | 60 no total (46 + 14). O **Colégio Necromântico tem 19**, o dobro do segundo colocado (Cruine, 12): quase metade do que ele alcança depende de pergaminho. |
| Profundidade | O Bardo tem o catálogo menor, então com os mesmos 8 pontos do Rastreador fecha tudo no estágio 20 (60–100%), enquanto o Rastreador fica em 46–60%. Isso acontece porque o catálogo do Bardo é pequeno, e não porque ele tenha mais acesso. |

---

## 4. Sugestões

**Meta**, na ordem pedida, contando só compráveis:

| | Base | Com especialização (média) |
|---|---|---|
| Mago | ~18 | ~29 |
| Sacerdote | ~17 | ~25 |
| Bardo | ~12 | ~21 |
| Rastreador | ~12 | ~21 |

Nenhuma sugestão cria magia. Todas só mexem em `permissao`, como a reforma de
12/09/2026. As novas magias próprias de Arautos ficam para *Sugestões de
magias*.

### 4.1 Mago: subir a base e o piso dos Colégios

Três magias que já são de **dois Colégios** passam a ser do tronco comum:

| Magia | Hoje | Proposta |
|---|---|---|
| Desintegração | Naturalista, Elemental | **Mago** |
| Escuridão | Ilusionista, Necromântico | **Mago** |
| Medo | Ilusionista, Necromântico | **Mago** |

Resultado: base 15 → **18**. Filosófico sobe de 22 para 25, Alquímico de 23
para 26 e Naturalista de 23 para 25. Ilusionista e Necromântico sobem para 32,
e Elemental para 38. Média ≈ **29,7**. Ninguém perde magia.

O **Elemental (38)** não precisa de corte. As cinco manipulações e os três
ataques/proteções por elemento são a identidade do Colégio (estudo de
12/09/2026, §1).

### 4.2 Sacerdote: tirar do tronco comum o que é de um deus

| Magia | Hoje | Proposta | Por quê |
|---|---|---|---|
| Relâmpago | Naturalista, **Sacerdote** | Naturalista | É o clone de Fogo Divino (estudo de 12/09, §1), que Palier já tem. |
| Hidroproteção | **Sacerdote**, Elemental | **Ordem de Ganis**, Elemental | Proteção contra água cabe ao deus das águas. |

Resultado: base 19 → **17**. As Ordens perdem 2 magias, e Ganis perde só 1
porque recebe a Hidroproteção. Faixa 21–28, média ≈ **24,5**: abaixo do Mago
e acima de Bardo e Rastreador.

Super Resistência e Corrente ficam no tronco. Tirar as quatro derrubaria a
média das Ordens para ~22,7, abaixo do Rastreador.

### 4.3 Bardo: dar corpo à Confraria de Arautos

O arauto é voz, anúncio e fama. Sete magias das outras Confrarias passam a
incluir Arautos:

| Magia | Hoje | Proposta |
|---|---|---|
| Lenda Viva | Eruditos | Eruditos, **Arautos** |
| Convivência | Eruditos | Eruditos, **Arautos** |
| Leitura de Hábitos | Eruditos | Eruditos, **Arautos** |
| Cadência Veloz | Artistas | Artistas, **Arautos** |
| Aura Ameaçadora | Artistas | Artistas, **Arautos** |
| Fascínio | Artistas | Artistas, **Arautos** |
| Tensão | Artistas | Artistas, **Arautos** |

E uma para o tronco:

| Magia | Hoje | Proposta |
|---|---|---|
| Leitura | Eruditos, Filosófico, Palier | + **Bardo** |

Resultado: base 11 → **12**. Arautos sobe de 12 para 20, Artistas de 19 para
20, e Eruditos fica em 19. Média ≈ **19,7**.

### 4.4 Rastreador: igualar ao Bardo

| Magia | Hoje | Proposta | Por quê |
|---|---|---|---|
| Arqueirismo | **Rastreador** | **Trilha de Caçadores** | É a trilha do arco. |
| Aeroproteção | **Rastreador**, Elemental | **Trilha de Exploradores**, Elemental | Não é tronco. É do viajante que enfrenta o tempo. |
| Distração | Bardo, **Trilha de Guardiões** | Bardo | Tira uma da trilha inflada. |
| Bênção Selvagem | Caçadores, **Guardiões** | Caçadores | Idem. |

Resultado: base 14 → **12**. Caçadores vai de 23 para 22 e Exploradores de
21 para 20: cada uma recebe de volta uma das magias que saem do tronco e perde
a outra. Guardiões cai de 27 para 23. Média ≈ **21,7**.

### 4.5 Depois das quatro

| | Base | Com especialização (média) | Faixa |
|---|---|---|---|
| Mago | 18 | ~29,7 | 25–38 |
| Sacerdote | 17 | ~24,5 | 21–28 |
| Rastreador | 12 | ~21,7 | 20–23 |
| Bardo | 12 | ~19,7 | 19–20 |

Bardo e Rastreador ficam na mesma base e com ~2 magias de diferença na
especialização. Para fechar essa diferença, criar 2 magias próprias de
Arautos (ver *Sugestões de magias*).

### 4.6 Fora do escopo das permissões

- **Soneto da Morte:** escrever os níveis 3 a 9, ou decidir que ela é de nível
  único.
- **Colégio Necromântico:** avaliar se 19 travadas é o que se quer. Converter 4
  ou 5 Perdidas em Básicas deixaria o Colégio comprável sem pergaminho.

---

## 5. Aplicação

**Aplicado em 29/09/2026** (`scripts/sql/magias-permissoes-profissoes-2026-09-29.sql`):
as 17 mudanças de §4.1 a §4.4. A recontagem no banco depois do script bateu
com a §4.5:

| | Base | Com especialização (média) | Faixa |
|---|---|---|---|
| Mago | 18 | 29,7 | 25–38 |
| Sacerdote | 17 | 24,5 | 21–28 |
| Rastreador | 12 | 21,7 | 20–23 |
| Bardo | 12 | 19,7 | 19–20 |

**Quem já tinha comprado.** Só uma personagem perdeu acesso a magias que já
tinha: Lirael (Trilha de Guardiões), com Arqueirismo e Aeroproteção. Ela mantém
as duas no nível que tem. Para isso, a ficha e o criador passaram a listar a
magia possuída mesmo sem acesso. No criador, o "+" dela fica travado com o
aviso "Sua profissão não alcança mais esta magia".

**Ficou para depois:** as 2 magias próprias de Arautos (§4.5), o Soneto da
Morte e as travadas do Necromântico (§4.6).
