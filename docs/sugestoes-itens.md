# Itens para batalha — estatística, sugestões novas e adaptações

**Levantado em 12/09/2026** a partir do catálogo de produção (747 itens). Nada
aqui foi aplicado: são propostas para você decidir.

Em combate, um item faz efeito por **dois caminhos independentes** (ver
`docs/manutencao-magias.md` §8):

| Caminho | Como | Onde vale |
|---|---|---|
| **Efeito** | `efeito_positivo` / `efeito_negativo` — "25 Energia Heroica" | aba **Item** da batalha, e na ficha |
| **Magia** | `magia` + `nivel_magia` | abas **Magia / Apoio**, com o item em uso (equipado ou vestido; pergaminho vale na mão e some ao ser lido) |

---

## 1. O que o catálogo mostra

| Grupo | Itens | Com efeito | Com magia |
|---|---|---|---|
| Itens | 210 | 0 | 3 |
| Consumíveis | 97 | 52 | 6 (pergaminhos) |
| Vestimentas | 92 | 84 | 19 |
| Armas | 75 | 0 | 22 |
| Animais | 68 | 0 | 0 |
| Armaduras | 63 | 0 | 0 |
| outros | 142 | 4 | 5 |

### O vocabulário de efeito

O leitor de efeito conhece **12 rótulos**: Energia Heroica, Energia Física,
Absorção, Karma, Saúde, Sanidade, Sono, Alimentação, Hidratação, Temperatura,
Sobriedade, Reputação.

Só os **cinco primeiros** mexem em algo que a batalha usa. E todos são
**instantâneos**: não existe item que dê coluna de ataque, defesa, velocidade
ou resistência por algumas rodadas.

### Os desequilíbrios que saltam

1. **Das 22 armas mágicas, 14 concedem magia que o motor não aplica.** A arma
   "tem" a magia, e em batalha ela não faz nada:

   | Arma | Valor | Magia concedida | Por que não vale em combate |
   |---|---|---|---|
   | Foice Longa Reshanta | 39.500 | Caçada Marcada | narrativa |
   | Tridente de Theobomos | 25.500 | Hidrotolerância | narrativa |
   | Espada Jagan | 21.000 | Aura Ameaçadora | ritual |
   | Cimitarra Daeva do Mar | 19.000 | Solo Divino | ritual |
   | Espada Montante Kronagar | 14.000 | Intuição | narrativa |
   | Espada Montante Vampirus Escarlate | 14.000 | Marca da Morte | narrativa |
   | Clava Hongor-Tun | 12.000 | Modificar Espírito | narrativa |
   | Mangual do Dragão | 5.900 | Invocar Instrumento | narrativa |
   | Malho Coração de Lena | 4.000 | Toque de Fúria | sistema |
   | Cetro Dourado | 3.000 | Prisão Púrpura | ritual |
   | Cajado Líbano da Luz | 2.000 | Purificação | sistema |
   | Cajado Necroptum | 2.000 | Necroanimação | ritual |
   | Punhal de Ocantir | 2.000 | Criação | invocação |
   | Punhal dos Mortos | 2.000 | Cárcere de Almas | ritual |

2. **Das 19 vestimentas mágicas, 10 concedem magia fora do motor** — Anel das
   Outras Memórias (Clarividência), Bracelete da Maldição de Menard (Marca da
   Morte), Tiara do Conhecimento de Palier (Milagre Análogo), entre outras.
3. **Não há consumível ofensivo.** Nenhuma bomba, óleo, veneno de lâmina ou
   flecha especial — e a batalha **já tem** a ação *Envenenar* do Mestre, que
   nenhum item alimenta.
4. **As poções de combate não têm preço.** Elixir de Blator, de Maira, de
   Cambu, de Cruine, de Unicórnio… estão sem `valor_latao`: a loja não
   consegue vendê-las.
5. **Dois pergaminhos concedem magia fora do motor** — Milagre Análogo e
   Nutrição Natural.

---

## 2. Itens novos sugeridos

### 2.1 Poções de combate, em três tamanhos

Usam só rótulos que o leitor conhece — funcionam na aba Item **hoje**. Valores
em latão, para a loja.

| Item | Grupo | Efeito positivo | Efeito negativo | Valor |
|---|---|---|---|---|
| Poção Menor de Vigor | Consumíveis | 10 Energia Física | | 40 |
| Poção de Vigor | Consumíveis | 25 Energia Física | 5 Sono | 120 |
| Poção Maior de Vigor | Consumíveis | 50 Energia Física | 10 Sono | 400 |
| Tônico Heroico Menor | Consumíveis | 10 Energia Heroica | | 40 |
| Tônico Heroico | Consumíveis | 20 Energia Heroica | 5 Sobriedade | 120 |
| Tônico Heroico Maior | Consumíveis | 35 Energia Heroica | 10 Sobriedade | 400 |
| Unguento de Couraça | Consumíveis | 10 Absorção | | 90 |
| Pó Arcano | Consumíveis | 5 Karma | 5 Sanidade | 150 |
| Ração de Campanha | Consumíveis | 50 Alimentação, 5 Energia Física | | 12 |

### 2.2 Pergaminhos de combate

O caminho do pergaminho já existe: `magia` + `nivel_magia`, lido na mão e
consumido. Estes apontam para magias **do motor**, uma de cada perfil:

| Item | Magia | Nível | Para |
|---|---|---|---|
| Pergaminho de Curas Físicas | Curas Físicas | 3 | cura (perfil Sacerdote) |
| Pergaminho de Bênção | Bênção | 1 | suporte |
| Pergaminho de Bola de Fogo | Bola de Fogo | 3 | ataque (perfil Mago) |
| Pergaminho de Piroproteção | Piroproteção | 3 | proteção de fogo |
| Pergaminho de Medo | Medo | 1 | controle |
| Pergaminho de Aeroproteção | Aeroproteção | 3 | proteção de ar |

### 2.3 Armas e vestimentas por elemento

Uma arma de cada elemento, concedendo a magia de dano do elemento, e um
amuleto de cada elemento, concedendo a proteção. Todas as magias citadas já
estão no motor.

| Item | Grupo | Magia | Nível |
|---|---|---|---|
| Lâmina Ardente | Armas | Piromanipulação | 3 |
| Martelo Sísmico | Armas | Geomanipulação | 3 |
| Tridente das Correntes | Armas | Hidromanipulação | 3 |
| Arco dos Ventos | Armas | Aeromanipulação | 3 |
| Maça Solar | Armas | Lâmina de Luz | 3 |
| Adaga do Abismo | Armas | Manipulação Infernal (Ancestral — vale pelo item) | 1 |
| Amuleto da Brasa | Vestimentas | Piroproteção | 3 |
| Amuleto da Rocha | Vestimentas | Geoproteção | 3 |
| Amuleto da Maré | Vestimentas | Hidroproteção | 3 |
| Amuleto do Vento | Vestimentas | Aeroproteção | 3 |

> O item concede a magia **sem custar karma** e **no nível do item** — é o que
> torna Manipulação Infernal, travada para compra, alcançável por uma adaga.

---

## 3. Adaptações dos itens existentes

### 3.1 Trocar a magia das armas caras por uma que valha em combate

A magia narrativa pode continuar na **descrição** do item; o campo `magia`
passa a apontar para uma magia do motor com o mesmo tema.

| Arma | Hoje | Sugestão |
|---|---|---|
| Foice Longa Reshanta | Caçada Marcada | **Ataque Infernal** (dano + sangramento) |
| Tridente de Theobomos | Hidrotolerância | **Hidromanipulação** |
| Espada Jagan | Aura Ameaçadora | **Ruído Extenuante** (penalidade de ataque e velocidade) |
| Cimitarra Daeva do Mar | Solo Divino | **Hidromanipulação** |
| Espada Montante Kronagar | Intuição | **Barreira Mística** |
| Espada Montante Vampirus Escarlate | Marca da Morte | **Toque Gélido** (dano que drena energia heroica — vampírico) |
| Clava Hongor-Tun | Modificar Espírito | **Medo** |
| Mangual do Dragão | Invocar Instrumento | **Piromanipulação** |
| Malho Coração de Lena | Toque de Fúria | **Curas Heroicas** |
| Cetro Dourado | Prisão Púrpura | **Corrente** |
| Cajado Líbano da Luz | Purificação | **Curas Espirituais** |
| Cajado Necroptum | Necroanimação | **Campo de Trevas** |
| Punhal de Ocantir | Criação | **Putrefação** |
| Punhal dos Mortos | Cárcere de Almas | **Carne em Vermes** |

Mesmo tratamento cabe às 10 vestimentas mágicas fora do motor; o critério é o
mesmo — manter o tema, trocar para uma magia que a batalha aplica.

### 3.2 Dar preço às poções

Elixir de Blator, Cambu, Cruine, Maira, Unicórnio, Vouxiz, Antredom, Diatrimis,
Morrigalti, Palier, Seinoniz, Selimon e Udoviom estão sem `valor_latao`. Pela
tabela de 2.1 como régua: **25 de energia → ~120 latão**, **100 de energia →
~1.500 latão**.

### 3.3 Pergaminhos que não fazem nada

- **Pergaminho Milagre Análogo** e **Pergaminho Nutrição Natural** concedem
  magias fora do motor. Trocar por Curas Físicas e Curas Heroicas, ou esperar o
  sistema de porcentagem (que liga Nutrição Natural).

---

## 4. O que precisaria de sistema

Estas não cabem no vocabulário de hoje; ficam registradas para quando valer a
pena.

| Peça | O que permitiria |
|---|---|
| **Efeito de item com duração** ("Coluna de Ataque 1 por 3 rodadas") | óleo de afiar, tônico de agilidade, incenso de foco |
| **Item que causa dano** ("Dano 12 Fogo" num alvo) | frasco de fogo alquímico, bomba de estilhaços |
| **Item que aplica veneno** ligado à ação *Envenenar* | veneno de lâmina, dardo envenenado |
| **Escuridão por item** | bomba de fumaça, que o tabuleiro já saberia desenhar |
