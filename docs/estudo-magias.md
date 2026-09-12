# Estudo — enxugar e melhorar o catálogo de magias

**Levantado em 12/09/2026** lendo as 238 magias (descrição e os cinco níveis) e
agrupando por **efeito no motor**, por **habilidade afetada** e por **tema**.
Nada foi aplicado: é um estudo para você decidir. As sugestões respeitam o
perfil já decidido — Mago ataque, Bardo suporte, Rastreador controle animal,
Sacerdote cura, e dano e proteção por elemento.

---

## 0. Resumo

| | Magias hoje | Depois do estudo |
|---|---|---|
| Fundir parecidas (seção 2) | 86 | 40 |
| Cortar ou reescrever (seção 3) | 13 | 4 (as reescritas) |
| Não mexer | 139 | 139 |
| **Total** | **238** | **183** |

A redução é de **55 magias (23%)**, e quase nenhuma perde algo que a
mesa usaria: o que some é repetição de número, magia-muleta de outra magia e
"reduz a dificuldade de uma habilidade" espalhado em vinte variações.

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

Achados pelo motor, não pelo nome: estas duplas têm o mesmo efeito, os mesmos
números no nível 1 e no 9, e o mesmo alcance.

| Magias | Nível 1 → 9 | Onde diferem |
|---|---|---|
| **Degeneração Física** e **Ruído** | Reduz 1 → 9 colunas de ataque, 20 metros | só a permissão (Necromântico/Blator/Crezir × Artistas) |
| **Bênção** e **Canção do Alento** | +1 → +5 colunas e +5 → +25 de energia heroica | Toque × 20 metros |
| **Relâmpago** e **Fogo Divino** | Causa 28 → 44 de dano base, 100 metros, 1 rodada | nenhuma, além da permissão |
| **Putrefação** e **Armadilha Natural** | Causa 12 → 28 de dano base | Armadilha dura 24 horas no local |
| **Curas Heroicas** e **Heroísmo** | Restaura 8 de energia heroica no nível 1 | Heroísmo sobe até 40, mas evoca em 5 rodadas e é Perdida |
| **Piromanipulação, Hidromanipulação, Geomanipulação, Aeromanipulação, Fotomanipulação** | Causa 4 → 20, 10 metros, 1 rodada | só o elemento |

---

## 2. Grupos que podem virar uma magia

Cada grupo diz **o que funde**, **em quê**, e **o que a magia final faz**.

### 2.1 Dificuldade de habilidade — 22 magias viram 6

É o maior ganho do estudo. Hoje há uma magia por habilidade; o catálogo de
habilidades já está organizado em **grupos**, e a primitiva nova do motor já
sabe reduzir a dificuldade de um grupo inteiro.

| Magia final | Grupo | Absorve |
|---|---|---|
| **Amizade** | Influência | Empatia, Detectar Intenção, Sedução, Avaliação (Negociar), Convocação (Liderar) |
| **Conhecimento Natural** | Geral | Faro, Rastreamento, Orientação, Sexto Sentido (Sensitividade), Dominação Animal (Adestrar) |
| **Conhecimento** | Profissional | Mestre da Forja (Metalurgia) |
| **Dom das Línguas** *(nova)* | Idioma e Alfabetização | Linguagem, Conhecimento Linguístico, Escrita |
| **Sombra** *(nova)* | Subterfúgio | Camuflagem (Furtividade), Ausência (Escapar) |
| **Graça Felina** *(nova)* | Manobra | Deslocamento Natural (Equilibrar, Nadar, Escalar), Malabarismo (Prestidigitação), Aprimorar Habilidades |

Regra que mantém a variedade: **a instantânea é "para o próximo teste"**, a de
duração vale enquanto dura. Cada magia final pode ter as duas formas pelo
nível — níveis 1 e 3 instantâneos, 5 em diante com 1 hora.

*Por que não perde nada:* a mesa sempre testou a habilidade; a magia só mudava
qual das 22 precisava estar na ficha para o bônus existir.

### 2.2 Controle e debuff

| Fundir | Em | A magia final |
|---|---|---|
| Ruído, Ruído Extenuante | **Ruído** (Bardo) | nível 1–5 reduz colunas; 7–9 reduz também velocidade. Degeneração Física, o clone exato, sai do lugar de debuff (linha abaixo) |
| Degeneração Física | vira **ataque** | "Causa N de dano infernal e reduz 1 coluna de ataque" — ataque, que é o perfil do Mago |
| Distração, Região Inviolável | **Distração** | reduz velocidade; nos níveis altos, em área |

### 2.3 Dano

| Fundir | Em | A magia final |
|---|---|---|
| Relâmpago, Fogo Divino, Flecha Divina, Feixes Incandescentes | **dois**: Relâmpago (ar, Naturalista) e Fogo Divino (celestial, Sacerdote) | os quatro são "dano base de longo alcance" (50 a 100 metros); o elemento é o que os separa — e o perfil pede elemento |
| Putrefação, Armadilha Natural | **Putrefação** vira infernal (Necromântico); **Armadilha Natural** vira armadilha de verdade | a armadilha ganha o que só ela tem: fica armada no local e dispara quando alguém pisa |
| As cinco manipulações | **manter as cinco** | o elemento É a identidade delas; fundir tiraria o dano por elemento que você pediu. O que muda: a Fotomanipulação passa a se chamar Celestomanipulação, alinhada ao nome do elemento |

### 2.4 Suporte e cura

| Fundir | Em | A magia final |
|---|---|---|
| Bênção, Canção do Alento | **Bênção** (Sacerdote, alvo único) e **Canção do Alento** (Bardo, área) | clones hoje; ficam as duas, mas a do Bardo pega **todos os aliados no raio** — é suporte, o perfil dele |
| Curas Heroicas, Heroísmo, Curas Espirituais | **Curas Espirituais** (energia heroica) | níveis 1–5 como Curas Heroicas, 7–9 como Heroísmo; Heroísmo sai do catálogo de travadas |
| Herbologia, Recupereção Física, Purificação (a parte de veneno) | **Purificação** | cura veneno, vício e doença por tipo; a parte de "purificar alimento" continua nela |
| Ressurreição, Retorno do Mártir | **Ressurreição** | nível 1–5 como hoje (até 7 dias); 7–9 como Retorno do Mártir (anos) |
| Hibernar, Campo Abençoado, Vigília | **Descanso Profundo** *(nova)* | recuperação fora de combate: sozinho (Hibernar), em grupo (Campo Abençoado), ou atento (Vigília) conforme o nível |

### 2.5 Invocação e banimento

| Fundir | Em | A magia final |
|---|---|---|
| Chamado Elemental, Domínio Elemental | **Chamado Elemental** | nos níveis baixos evoca sem controle (como hoje); nos altos, já controlado |
| Conjuração Demoníaca, Domínio Demoníaco | **Conjuração Demoníaca** | mesma lógica |
| Apelo, Última Oração | **Apelo** | Última Oração vira os níveis 7–9: o enviado não recusa |
| Retorno, Expulsão, Desfazer | **Expulsão** | bane elementais, demônios, enviados e criaturas criadas por magia, por tipo |
| Criação, Criatura Disforme, Necroanimação | **Criação** e **Necroanimação** | Criatura Disforme vira o nível alto da Criação. *Atenção:* Criação cita a magia "Controle", **que não existe no catálogo** |

### 2.6 Utilidade

| Fundir | Em | A magia final |
|---|---|---|
| Hidrotolerância, Respiração Arcana | **Respiração Arcana** | água nos níveis baixos, qualquer ambiente nos altos |
| Levitação, Vôo | **Vôo** | níveis 1–5 levitam (sem os 10 cm do nível 1 de hoje), 7–9 voam |
| Visão Térmica, Visão Animal | **Visão Animal** | escuridão nos níveis baixos; calor e seres invisíveis nos altos |
| Detecção de Magia, Análise | **Detecção de Magia** | detecta nos níveis baixos; revela propriedades de item nos altos |
| Sentido Natural, Comunhão Natural | **Comunhão Natural** | os dois são "perceber pela natureza" |
| Marca da Morte, Caçada Marcada | **Caçada Marcada** | as duas marcam o alvo para achá-lo depois |
| Mutação, Transformação Animal | **Mutação** | Transformação Animal vira os níveis altos, e sai de Ancestral |
| Licantropia Lupina, Teriantropia | **Licantropia Lupina** | as formas da Teriantropia viram escolha nos níveis altos |
| Ilusões, Pseudoconsciência, Pseudomatéria, Armadilha Ilusória | **Ilusões** | as três são muletas de Ilusões — viram o que a ilusão ganha em cada nível: sem concentração, com matéria, armada num local |
| Cataclisma, Explosão Mística, Rompimento de Harmonia | **Rompimento de Harmonia** | as três reduzem karma; uma magia de alvo único e área pelo nível |

---

## 3. Cortar ou reescrever

Estas não têm com quem fundir, e na forma atual pouco mudam a mesa. (Recupereção Física, que também estaria aqui, já some na fusão de 2.4.)

| Magia | O problema | Sugestão |
|---|---|---|
| **Ventriloquismo** | cosmético; o nível só muda a distância da voz | virar nível de **Ilusões** (ilusão sonora) |
| **Invocar Instrumento** | 12 horas de evocação para o instrumento voar até a mão | cortar — ou virar truque instantâneo do Bardo |
| **Memorização** | o jogador lembra do que quiser sem magia | cortar |
| **Abrigo** | ritual para achar abrigo, que a habilidade Sobrevivência já resolve | virar parte de **Conhecimento Natural** |
| **Leitura** | "compreenda um livro" | virar nível alto de **Dom das Línguas** |
| **Transformação Metálica** | muda a maleabilidade de metal por tamanho | fundir em **Desintegração** ("manipula a matéria") |
| **Aura Ameaçadora** | uma obra de arte que intimida quem olha, com números de combate que nunca chegam ao combate | reescrever como aura no **conjurador** — vira debuff de Bardo |
| **Criptograma Místico** | protege um texto escrito | virar nível de **Runas** |
| **Lenda Viva** | dá vida a uma lenda local, sem efeito definido | fundir em **Lendas** |
| **Ambiente Natural** | só libera outras magias fora da natureza | cortar a restrição de ambiente das outras, e esta some |
| **Ossos de Aço** | só vale para queda | reescrever: "Reduz N de dano" base por 5 rodadas — proteção física do Naturalista |
| **Telecinese** nível 1 | "derruba 1 kg" | começar em 5 kg; o nível 1 de hoje é inútil |
| **Sono** | o nível diz "Altera uma condição do sono" e não diz por quanto tempo | reescrever com "A magia tem duração de N rodadas", como Medo |

---

## 4. Difíceis de equilibrar

Não são pouco interessantes — são **decisivas demais**, e merecem revisão de
regra antes de qualquer outra coisa:

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

## 5. Ordem sugerida

1. **Dificuldade de habilidade (2.1)** — maior redução, nenhum código novo.
2. **Clones exatos (seção 1)** — só texto e permissão.
3. **Muletas de Ilusões e das invocações (2.5, 2.6)** — viram níveis.
4. **Cortes (seção 3)**.
5. **As decisivas (seção 4)** — regra antes de texto.

> Fundir magia **conhecida por personagem** exige migrar a ficha: a chave some
> e `personagens.magias` precisa apontar para a magia final, no mesmo passo
> que o Mestre renomearia por SQL. Das magias deste estudo, os personagens
> conhecem Bênção, Curas Espirituais, Herbologia, Ressurreição, Ilusões,
> Armadilha Ilusória, Chamado Elemental, Domínio Elemental, Apelo, Retorno,
> Respiração Arcana, Visão Animal, Detecção de Magia, Transformação Animal,
> Licantropia Lupina e Ventriloquismo. Na seção 2.1, **18 das 22 ninguém
> conhece** (as quatro conhecidas são Dominação Animal, Rastreamento, Sedução
> e Aprimorar Habilidades) — por isso ela pode ir primeiro, quase sem migração.
