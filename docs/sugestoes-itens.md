# Itens para batalha — o que falta de verdade

**Refeito em 28/09/2026** a partir do catálogo de produção (1.035 itens),
depois de entrarem os frascos alquímicos, os amuletos elementais, as flechas
envenenadas e o veneno em arma. A pergunta desta revisão é uma só: **ainda é
necessário criar itens novos?** Resposta curta: **quase nada** — o que falta
é ajustar os que já existem.

Em combate, um item faz efeito por **dois caminhos**:

| Caminho | Como | Onde vale |
|---|---|---|
| **Efeito** | `efeito_positivo` / `efeito_negativo` — "Aumenta 20 de Energia Física" | aba **Item** da batalha, e na ficha |
| **Magia** | `magia` + `nivel_magia` | abas **Magia / Apoio**, sem karma: item em uso (equipado ou vestido); consumível vale na mochila e some ao ser usado |

---

## 1. O catálogo hoje

| Grupo | Itens | Com efeito | Com magia | Sem valor |
|---|---|---|---|---|
| Consumíveis | 402 | 63 | 12 frascos + 286 pergaminhos | 307 |
| Itens | 195 | 0 | 3 | 19 |
| Vestimentas | 95 | 84 | 23 | 28 |
| Armas | 84 | 0 | 22 | 10 |
| Animais | 74 | 0 | 0 | 13 |
| Armaduras | 63 | 0 | 0 | 0 |
| outros | 122 | 4 | 5 | 6 |

### O que a revisão de 12/09 pedia e já existe

| Pedido de 12/09 | Situação em 28/09 |
|---|---|
| Consumível ofensivo (bomba, óleo, veneno) | **Feito** — 6 frascos de dano, 3 flechas envenenadas e o veneno de lâmina (15 ações) |
| Proteção por elemento | **Feito** — 4 amuletos (Brasa, Rocha, Maré, Vento) e 6 frascos de suporte |
| Poções de combate em três tamanhos | **Não precisa** — os 16 elixires já cobrem Energia Física (5 a 100), Energia Heroica (25 e 50), Absorção (5 a 30) e Karma (5 a 100) |
| Pergaminhos de combate | **Não precisa** — os frascos fazem esse papel para dano e proteção elemental, sem ensinar a magia |
| Arma de dano por elemento | **Não precisa** — Narya, Nenya, Vilya e Khazad (anéis) e os frascos cobrem os quatro elementos; Sagae e Impetusion, ar e celestial |
| Item que causa dano | **Feito** — pelo caminho da magia (frasco) |
| Item que aplica veneno | **Feito** — arma e flecha envenenadas, só quando o golpe chega à Energia Física |

---

## 2. O que ainda falta

### 2.1 Preço dos elixires

Os 16 elixires estão sem `valor_latao`. Pela regra nova, item sem valor se
vende por **0** — e na loja do Mestre sai **de graça**. Régua sugerida
(25 de energia ≈ 120 latão; 100 de energia ≈ 1.500 latão):

| Elixir | Efeito | Valor sugerido |
|---|---|---|
| Diatrimis | 5 Energia Física | 25 |
| Selimon | 5 Absorção, −5 Sono, −10 Desonra | 40 |
| Fada | 5 Karma, −5 Sono | 60 |
| Seinoniz | 15 Energia Física | 70 |
| Maira | 20 Energia Física | 95 |
| Cruine | 20 Energia Física, −4 Doença | 110 |
| Blator | 25 Energia Heroica | 120 |
| Cambu | 25 Absorção | 120 |
| Vouxiz | 30 Absorção | 150 |
| Dragão | 10 Karma, −5 Sono | 150 |
| Antredom | 50 Energia Heroica | 400 |
| Ganis | −100 Sede, −10 Sono, −10 Frio | 60 |
| Udoviom | −15 Sono, −100 Fome | 60 |
| Unicórnio | −100 Doença | 500 |
| Morrigalti | 100 Energia Física | 1.500 |
| Palier | 100 Karma, −100 Vício | 1.500 |

### 2.2 Virote para besta e arlabesta

A munição agora é completa para o **arco** (todo ataque gasta uma flecha).
A **Besta** e a **Arlabesta** atiram virote, que o catálogo não tem — por isso
continuam atirando de graça. Para fechar a regra, basta **um item novo**:

| Item | Grupo | Ocupa | Valor | Observação |
|---|---|---|---|---|
| Virote | Consumíveis | 0,1 | 2 | e o motor passa a gastá-lo como gasta a flecha |

Com ele, os três venenos também poderiam virar **virote envenenado** — o
mesmo caminho da flecha.

---

## 3. Adaptações dos itens existentes

### 3.1 Armas mágicas cuja magia a batalha não aplica

**14 das 22 armas mágicas** concedem uma magia narrativa ou de ritual: em
combate, não fazem nada. A magia pode continuar na **descrição**; o campo
`magia` passa a apontar para uma magia do motor com o mesmo tema.

| Arma | Hoje | Sugestão |
|---|---|---|
| Reshanta | Caçada Marcada | **Ataque Infernal** |
| Vampirus Escarlate | Caçada Marcada | **Toque Gélido** (drena energia heroica — vampírico) |
| Tridente de Theobomos | Respiração Arcana | **Hidromanipulação** |
| Jagan | Aura Ameaçadora | **Medo** |
| Daeva do Mar | Solo Divino | **Dardos de Gelo** |
| Kronagar | Intuição | **Barreira Mística** |
| Hongor-Tun | Modificar Espírito | **Geomanipulação** |
| Mangual do Dragão | Invocar Instrumento | **Piromanipulação** |
| Coração de Lena | Toque de Fúria | **Curas Heroicas** |
| Cetro Dourado | Prisão Púrpura | **Corrente** |
| Líbano da Luz | Purificação | **Curas Espirituais** |
| Necroptum | Necroanimação | **Campo de Trevas** |
| Punhal de Ocantir | Criação | **Putrefação** |
| Punhal dos Mortos | Cárcere de Almas | **Carne em Vermes** |

### 3.2 Vestimentas mágicas fora do motor

**9 das 23** (os amuletos novos já valem): Benção de Sevides (Controle
Climático), Coroa Abad'Dorim (Convivência), Desejo de Lena (Manjar de Lena),
Lágrimas de Ganis (Respiração Arcana), Maldição de Menard (Caçada Marcada),
Outras Memórias (Clarividência), Sombra de Maira (Mimetismo Animal), Tiara do
Conhecimento (Milagre Análogo) e Traje Selimônio (Modificar Espírito). Mesmo
critério: manter o tema, trocar para uma magia que a batalha aplica — ou
deixar como está, se o valor delas é fora de combate.

---

## 4. O que precisaria de sistema

| Peça | O que permitiria |
|---|---|
| **Efeito de item com duração** ("Coluna de Ataque 1 por 3 rodadas") | óleo de afiar, tônico de agilidade, incenso de foco |
| **Escuridão por item** | bomba de fumaça, que o tabuleiro já saberia desenhar |

> Conclusão: **não é necessário criar mais itens de batalha**. O único item
> novo que faz falta é o **Virote**; o resto é dar preço aos elixires e
> apontar a magia das armas caras para uma que a batalha aplica.
