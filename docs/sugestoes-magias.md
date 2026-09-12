# Magias — estatística, sugestões novas e adaptações

**Levantado em 12/09/2026** a partir do catálogo de produção (238 magias). Os
números ao vivo estão nas *Estatísticas do catálogo*, na Verificação do
catálogo desta mesma página. Nada aqui foi aplicado ao banco: são propostas
para você decidir.

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

Todas as sugestões e adaptações abaixo seguem esse perfil.

---

## 1. O catálogo contra o perfil

```
238 magias · 95 no motor
Função (no motor):   Ataque 29 · Suporte 37 · Controle 16 · Proteção 7 · Cura 6
Raridade:            Básica 170 · Perdida 51 · Ancestral 15 · sem tipo 2
```

### Mago — ataque, por colégio

| Colégio | Ataques no motor | Observação |
|---|---|---|
| Todo Mago | 4 | Bola de Fogo, Raio Elétrico, Fotomanipulação, Dardos de Luz (travada) |
| Colégio Elemental | 7 | cobre fogo, água, terra e ar — e o infernal só por Energia Primordial, que é Ancestral |
| Colégio Necromântico | 5 | **3 das 5 travadas**; as 2 compráveis são dano base, sem elemento |
| Colégio Naturalista | 2 | as duas são dano base |
| Colégio Ilusionista | 1 | só Covardia |
| **Colégio Alquímico** | **0** | |
| **Colégio Filosófico** | **0** | |

### Bardo — suporte

11 magias de suporte no motor (Canção do Alento, Canção do Ânimo, Perspicácia,
Tensão, Dueto Mágico…). O perfil está atendido; o buraco é a **Confraria de
Arautos, com 2 magias no total**, e nenhuma proteção de grupo.

### Rastreador — controle animal

**Nenhuma magia de controle animal está no motor.** Adestramento e Elo Animal
são narrativas; Dominação Animal espera correção de texto; Aprimoramento
Animal e Vínculo Vital precisam do sistema de companheiro. O que o motor tem de
"animal" é buff no próprio Rastreador (Destreza Animal, Habilidade Animal,
Visão Animal) e em animal aliado (Força Mútua).

### Sacerdote — cura, por ordem

| | |
|---|---|
| Curas compráveis | **3** — Curas Espirituais, Curas Físicas, Curas Heroicas |
| Curas próprias de ordem | **0** em 13 ordens (Véu de Maira é Perdida) |

Toda cura do Sacerdote é da profissão inteira: entrar numa ordem não muda
**como** ele cura.

### Elementos — dano e proteção (no motor)

| Elemento | Dano | Proteção |
|---|---|---|
| Fogo | 3 | 1 |
| Terra | 2 | 1 |
| Água | 2 | 1 — Hidroproteção, **Perdida** |
| Ar | **1** | 1 — Aeroproteção, **só Rastreador** |
| Celestial | 4 (2 travadas) | **0** |
| Infernal | 4 — **as 4 travadas** | **0** |
| Sem elemento (dano base) | **13** | — |
| Qualquer elemento | — | Armadura Elemental, Parede de Cristal, Proteção Natural |

Os três buracos: **nenhuma proteção celestial ou infernal**, **nenhum dano
infernal comprável**, e **13 ataques sem elemento** — metade deles tem nome de
elemento (Relâmpago, Toque Gélido, Fogo Divino) e texto de "dano base".

---

## 2. Magias novas sugeridas

Todas escritas no padrão que o motor lê (**verbo + número + unidade**, dígito,
número antes da unidade). Os textos foram conferidos contra o leitor — inclusive
o **elemento** de cada dano e proteção. Nenhuma pede primitiva nova: basta a
entrada no registro.

Nas tabelas, os níveis intermediários seguem a mesma escala.

### 2.1 Mago — um ataque para cada colégio que falta

**Rajada Cortante** · Colégio Elemental · Básica · Evocação 1 rodada · 20 metros · Instantânea
> O ar se comprime numa lâmina invisível que corta o alvo.

| 1 | 5 | 9 |
|---|---|---|
| Causa 6 de dano elemental de ar. | Causa 16 de dano elemental de ar. | Causa 26 de dano elemental de ar. |

Registro: inimigo, `dano`. *O ar é o elemento com menos dano (1).*

**Chama Negra** · Colégio Necromântico · Básica · Evocação 1 rodada · 20 metros · Instantânea
> Um fogo sem luz, alimentado pela morte, consome a carne do alvo.

| 1 | 5 | 9 |
|---|---|---|
| Causa 8 de dano infernal. | Causa 20 de dano infernal. | Causa 32 de dano infernal. |

Registro: inimigo, `dano`. *Primeiro dano infernal comprável do catálogo.*

**Terror Fantasma** · Colégio Ilusionista · Básica · Evocação Instantânea · 20 metros · Instantânea
> Uma visão do pior medo do alvo, que falhar em um teste de resistência mágica,
> drena a sua coragem.

| 1 | 5 | 9 |
|---|---|---|
| Causa 6 de dano na energia heroica. | Causa 14 de dano na energia heroica. | Causa 22 de dano na energia heroica. |

Registro: inimigo, `dano` com `pool: 'eh'` (o molde de Covardia).

**Frasco Incendiário** · Colégio Alquímico · Básica · Evocação 1 rodada · 15 metros · Instantânea
> Um frasco de reagentes arremessado explode em chamas ao tocar o alvo.

| 1 | 5 | 9 |
|---|---|---|
| Causa 10 de dano elemental de fogo. | Causa 20 de dano elemental de fogo. | Causa 30 de dano elemental de fogo. |

Registro: inimigo, `dano`, `parcial: 'area'` (como Bola de Fogo).

**Verdade Ofuscante** · Colégio Filosófico · Básica · Evocação 1 rodada · 20 metros · Instantânea
> A luz de uma verdade inegável fere quem vive na mentira.

| 1 | 5 | 9 |
|---|---|---|
| Causa 6 de dano elemental celestial. | Causa 16 de dano elemental celestial. | Causa 26 de dano elemental celestial. |

Registro: inimigo, `dano`.

**Enxame de Espinhos** · Colégio Naturalista · Básica · Evocação 1 rodada · 20 metros · Instantânea
> Raízes e espinhos irrompem do chão sob o alvo.

| 1 | 5 | 9 |
|---|---|---|
| Causa 6 de dano elemental de terra. | Causa 16 de dano elemental de terra. | Causa 26 de dano elemental de terra. |

Registro: inimigo, `dano`. *Primeiro ataque do Naturalista com elemento.*

### 2.2 Bardo — suporte, e a Confraria de Arautos

**Hino de Guerra** · Confraria de Arautos · Básica · Evocação 1 rodada · 10 metros · 5 rodadas
> Um canto de marcha que firma o braço de todos os aliados que o ouvem.

| 1 | 5 | 9 |
|---|---|---|
| Aumenta 1 coluna de ataque. | Aumenta 2 colunas de ataque. | Aumenta 3 colunas de ataque. |

Registro: aliado, `alvos: 'escolha'`, `area: 'aura'`, `mod_ataque`.

**Balada do Escudo** · Confraria de Arautos · Básica · Evocação 2 rodadas · 10 metros · 3 rodadas
> A cadência da balada ergue um escudo sonoro ao redor dos aliados.

| 1 | 5 | 9 |
|---|---|---|
| Reduz 3 de dano. | Reduz 9 de dano. | Reduz 15 de dano. |

Registro: aliado, área (aura), `reducao_dano` sem elemento e `base: true`.

**Canção da Firmeza** · Confraria de Eruditos · Básica · Evocação 1 rodada · 10 metros · 5 rodadas
> Versos antigos lembram aos aliados quem eles são, e nenhum encanto os dobra.

| 1 | 5 | 9 |
|---|---|---|
| Aumenta 2 de resistência mágica e 2 de resistência física. | Aumenta 4 de resistência mágica e 4 de resistência física. | Aumenta 6 de resistência mágica e 6 de resistência física. |

Registro: aliado, área (aura), `mod_rm` + `mod_rf`.

**Cadência Veloz** · Confraria de Artistas · Básica · Evocação Instantânea · 10 metros · 3 rodadas
> Um ritmo acelerado que os pés dos aliados seguem sem perceber.

| 1 | 5 | 9 |
|---|---|---|
| Aumenta 3 de velocidade. | Aumenta 6 de velocidade. | Aumenta 9 de velocidade. |

Registro: aliado, área (aura), `mod_vb`.

**Refrão Heroico** · Bardo · Básica · Evocação Instantânea · Toque · 10 rodadas
> Um refrão que o aliado não consegue tirar da cabeça, e que o faz lutar além
> do limite.

| 1 | 5 | 9 |
|---|---|---|
| Aumenta 5 de energia heroica. | Aumenta 15 de energia heroica. | Aumenta 25 de energia heroica. |

Registro: aliado, `mod_eh_temp` (o molde da Bênção).

### 2.3 Rastreador — controle animal

Todas com `so_racas: ['Animal']`: o motor já recusa alvo que não é animal (é o
que Força Mútua faz).

**Acalmar Fera** · Rastreador · Básica · Evocação Instantânea · 20 metros · Variável
> O animal que falhar em um teste de resistência mágica se aquieta e deixa de
> atacar.

| 1 | 5 | 9 |
|---|---|---|
| A magia tem duração de 1 rodada. | A magia tem duração de 3 rodadas. | A magia tem duração de 5 rodadas. |

Registro: inimigo, `sem_acoes`, `so_racas: ['Animal']` (o molde de Medo).

**Espantar Fera** · Trilha de Guardiões · Básica · Evocação Instantânea · 20 metros · 3 rodadas
> Um gesto e um som que o animal que falhar em um teste de resistência mágica
> reconhece como predador maior.

| 1 | 5 | 9 |
|---|---|---|
| Reduza 4 de velocidade e 1 coluna de ataque. | Reduza 8 de velocidade e 2 colunas de ataque. | Reduza 12 de velocidade e 3 colunas de ataque. |

Registro: inimigo, `mod_vb −` + `mod_ataque −`, `so_racas: ['Animal']`.

**Instigar Fera** · Trilha de Caçadores · Básica · Evocação Instantânea · 20 metros · 5 rodadas
> O animal aliado sente a caçada e ataca com fúria redobrada.

| 1 | 5 | 9 |
|---|---|---|
| Aumenta 1 coluna de ataque e 3 de velocidade. | Aumenta 2 colunas de ataque e 6 de velocidade. | Aumenta 3 colunas de ataque e 9 de velocidade. |

Registro: aliado, `mod_ataque` + `mod_vb`, `so_racas: ['Animal']`.

**Couro de Fera** · Trilha de Guardiões · Básica · Evocação 1 rodada · Toque · 10 rodadas
> O couro do animal aliado endurece como casca de árvore.

| 1 | 5 | 9 |
|---|---|---|
| Reduz 4 de dano. | Reduz 10 de dano. | Reduz 16 de dano. |

Registro: aliado, `reducao_dano` com `base: true`, `so_racas: ['Animal']`.

**Chamado da Matilha** · Trilha de Exploradores · Básica · Evocação 1 rodada · 20 metros · 5 rodadas
> Um uivo que todos os animais aliados no raio atendem ao mesmo tempo.

| 1 | 5 | 9 |
|---|---|---|
| Aumenta 1 coluna de ataque. | Aumenta 2 colunas de ataque. | Aumenta 3 colunas de ataque. |

Registro: aliado, área (aura), `mod_ataque`, `so_racas: ['Animal']`.

> O que mais destravaria o Rastreador **não é magia nova, é o companheiro
> animal** como participante da batalha: Aprimoramento Animal, Vínculo Vital,
> Elo Animal e metade de Força Mútua e Véu de Maira esperam por ele.

### 2.4 Sacerdote — uma cura com a cara de cada ordem

| Magia | Ordem | Alcance · Evocação | Nível 1 | Nível 9 | Registro |
|---|---|---|---|---|---|
| **Bálsamo de Lena** | Lena | Toque · 3 rodadas | Aumenta 5 de Saúde. | Aumenta 25 de Saúde. | aliado, `mod_condicao` Saúde + |
| **Seiva de Maira** | Maira | Toque · 2 rodadas | Restaura 6 de energia física. | Restaura 30 de energia física. | aliado, `cura_pool` EF |
| **Maré Restauradora** | Ganis | Toque · 2 rodadas | Restaura 4 de energia heroica e 4 de energia física. | Restaura 20 de energia heroica e 20 de energia física. | aliado, `cura_pool` EH + EF |
| **Paz Coletiva** | Selimon | 10 metros · 3 rodadas | Restaura 4 de energia heroica. | Restaura 16 de energia heroica. | aliado, área (aura), `cura_pool` EH |
| **Sangue de Batalha** | Blator | Pessoal · Instantânea | Restaura 8 de energia física e aumenta 1 coluna de ataque. | Restaura 24 de energia física e aumenta 3 colunas de ataque. | self, `cura_pool` EF + `mod_ataque` |
| **Descanso de Cruine** | Cruine | Toque · 1 rodada | Restaura 8 de energia heroica. | Restaura 32 de energia heroica. | aliado, `cura_pool` EH, `inverte_em: ['Morto']` (fere morto-vivo) |
| **Justa Reparação** | Crizagom | Toque · 2 rodadas | Restaura 4 de energia física e aumenta 2 de defesa. | Restaura 20 de energia física e aumenta 6 de defesa. | aliado, `cura_pool` EF + `mod_defesa` |
| **Bênção da Terra** | Sevides | Toque · 2 rodadas | Restaura 6 de energia física e reduz 4 de dano elemental de terra. | Restaura 22 de energia física e reduz 16 de dano elemental de terra. | aliado, `cura_pool` EF + `reducao_dano` terra |
| **Chama Vital** | Crezir | Toque · 2 rodadas | Restaura 6 de energia física e reduz 4 de dano elemental de fogo. | Restaura 22 de energia física e reduz 16 de dano elemental de fogo. | aliado, `cura_pool` EF + `reducao_dano` fogo |
| **Mente Serena** | Palier | Toque · 1 rodada | Restaura 6 de energia heroica. | Restaura 24 de energia heroica. | aliado, `cura_pool` EH |
| **Têmpera da Carne** | Parom | Toque · 3 rodadas | Restaura 6 de energia física e aumenta 1 de defesa. | Restaura 22 de energia física e aumenta 3 de defesa. | aliado, `cura_pool` EF + `mod_defesa` |
| **Alívio Dourado** | Cambu | 10 metros · 2 rodadas | Restaura 3 de energia heroica. | Restaura 12 de energia heroica. | aliado, área (aura), `cura_pool` EH |
| **Presságio Curativo** | Plandis | Toque · Instantânea | Restaura 4 de energia física. | Restaura 20 de energia física. | aliado, `cura_pool` EF — a cura mais rápida, para quem previu o golpe |

### 2.5 Elementos — as proteções que faltam

**Égide Celestial** · Sacerdote · Básica · Evocação Instantânea · Toque · 3 rodadas
> Um véu de sombra sagrada que desvia a luz dos seres celestiais.

| 1 | 5 | 9 |
|---|---|---|
| Reduz 8 de dano elemental celestial. | Reduz 16 de dano elemental celestial. | Reduz 24 de dano elemental celestial. |

Registro: aliado, `reducao_dano` com `elemento: 'celestial'`.

**Selo contra o Abismo** · Ordem de Cruine · Básica · Evocação Instantânea · Toque · 3 rodadas
> Um selo desenhado com cinzas que o fogo infernal não atravessa.

| 1 | 5 | 9 |
|---|---|---|
| Reduz 8 de dano infernal. | Reduz 16 de dano infernal. | Reduz 24 de dano infernal. |

Registro: aliado, `reducao_dano` com `elemento: 'infernal'`.

Com essas duas, **Chama Negra** e **Rajada Cortante** (2.1), e as adaptações
de 3.1, todo elemento passa a ter dano e proteção compráveis.

---

## 3. Adaptações das magias existentes

### 3.1 Dar elemento a quem tem nome de elemento

Treze ataques são "dano base". Estes seis têm o elemento no nome ou na
descrição — trocar o texto do nível basta, sem código:

| Magia | Hoje | Sugestão |
|---|---|---|
| **Relâmpago** | "Cause 28 de dano base." | "Causa 28 de dano elemental de ar." |
| **Raio Elétrico** | "Cada raio causa 12 de dano elemental **fogo**." | "…de dano elemental de ar." — eletricidade é ar, e o ar só tem 1 ataque |
| **Toque Gélido** | "Cause 12 de dano base." | "Causa 12 de dano elemental de água." |
| **Fogo Divino** | "Cause 28 de dano base." | "Causa 28 de dano elemental celestial." |
| **Feixes Incandescentes** | "Cause 32 de dano base." | "Causa 32 de dano elemental de fogo." |
| **Putrefação** | "Cause 12 de dano base." | "Causa 12 de dano infernal." — e vira o dano infernal comprável do Necromântico |

### 3.2 Proteções travadas ou mal distribuídas

- **Hidroproteção** é Perdida e só do Sacerdote: é a única proteção de água.
  Sugestão: **Básica**, e permissão também para o **Colégio Elemental**.
- **Aeroproteção** é só do Rastreador. Sugestão: somar o **Colégio
  Elemental**, que tem as proteções de fogo e terra e não a de ar.

### 3.3 Mover magias para o perfil certo

| Magia | Hoje | Sugestão |
|---|---|---|
| **Curas Naturais** | Rastreador, Ancestral | Ordem de Maira, Básica — cura é do Sacerdote, e hoje ninguém a compra |
| **Curas Heroicas** | Sacerdote, Bardo | manter no Bardo como suporte, ou deixar só no Sacerdote |
| **Covardia** | Colégio Ilusionista, Ordem de Blator | manter no Ilusionista (ataque); Blator ganha Sangue de Batalha (2.4) |
| **Mestre da Forja** | sem permissão | Ordem de Parom — o título da ordem é literalmente "Mestre da Forja" |

### 3.4 Correções de texto que ligam a magia no motor

| Magia | Hoje | Sugestão |
|---|---|---|
| **Dominação Animal** | "Reduz **um** nível…" | "Reduz **1** nível de dificuldade da habilidade Adestrar." — e é controle animal |
| **Alucinação** | "Aumenta **um** nível…" | "Aumenta **1** nível de dificuldade da habilidade Sentidos." |
| **Rastreamento** | "Reduz **um** nível…" | "Reduz **1** nível de dificuldade da habilidade Rastrear." |
| **Apontar Sufocante** | "Sufoca o alvo por 3 rodadas." | "A magia tem duração de 3 rodadas. Reduza 1 de energia física por rodada." |

### 3.5 Higiene do catálogo

- **Recupereção Física**: nome e chave com erro, sem permissão e sem tipo.
  Pelo perfil é cura de Sacerdote: renomear para **Recuperação Física** e dar a
  permissão — ou apagar em favor de Purificação. Ninguém a conhece, então a
  chave pode mudar sem quebrar ficha.
- **Linguagem**, **Conhecimento Linguístico** e **Escrita** cobrem quase o mesmo
  nicho (Idioma e Alfabetização). Fundir duas delas.

### 3.6 As travadas

**66 magias (28%)** dependem do item especial que ainda não existe — e o
**dano infernal inteiro** está nelas. Criar o item destrava tudo de uma vez;
rebaixar só os níveis 1 e 3 para Básica é a alternativa.

### 3.7 Os sistemas que mais destravam, pelo perfil

| Peça | Para quem | O que destrava |
|---|---|---|
| **Companheiro animal** | Rastreador | Aprimoramento Animal, Vínculo Vital, Elo Animal, metade de Força Mútua e Véu de Maira |
| **Porcentagem de poço** | Sacerdote | Nutrição Natural (cura), Julgamento de Cruine, Passagem Vital, Pele Ígnea |
| **Karma como alvo** | Mago e Bardo | Cataclisma, Explosão Mística, Rompimento de Harmonia |
