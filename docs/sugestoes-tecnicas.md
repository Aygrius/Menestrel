# Técnicas de combate — sugestões de suporte e apoio

**Refeito em 15/09/2026.** Nada aqui foi aplicado: são propostas para você
decidir.

Técnica de combate **não é magia**. É o que o combatente treinou: postura,
leitura do adversário, trabalho de equipe. Por isso o foco aqui é o
**Guerreiro** e o **Ladino**, que não têm magia e dependem delas para ter
opções além de bater.

E o catálogo já tem golpe de sobra — Golpe Letal, Golpe Duplo, Brutalizar,
Dano Agravado, as três Cargas, Golpe Giratório… O que falta é o resto do
combate: **correr, desgastar o equipamento do inimigo, proteger e empurrar o
grupo.** Nenhuma sugestão abaixo aumenta dano direto.

Cada técnica traz o texto para o catálogo (no formato de sempre: *"Seu total
de X é adicionado…"* ou *"Um teste de X (Médio)…"*) e a linha do registro do
motor (`src/01-core/tecnicas-efeito.jsx`), usando primitivas que o combate já
tem. As que precisam de algo novo estão separadas no fim.

### As peças do motor que estas sugestões usam

| Primitiva | O que faz | Quem já usa |
|---|---|---|
| `mod_vb` | velocidade: iniciativa, passo e ação extra acima de 30 | Disparo Rápido, Voz de Comando, Expectativa |
| `conduzido` | move o alvo N casas, na vez de quem conduz | Conduzir Oponente |
| `dano_equipamento` | gasta a resistência da armadura do alvo | Estilhaçar, Retalhar |
| `mod_defesa` | soma ou tira da defesa | Defletir Ataque, Pressionar Oponente |
| `dano_pct` / `dano_recebido_pct` | percentual sobre o dano causado / recebido | Brutalizar / Aparar, Desviar |
| `mod_ataque` com `alvo: 'aliados'` | coluna de ataque de outros | — (Voz de Comando usa `mod_vb`) |
| `mod_eh_temp` | energia heroica emprestada, devolvida ao expirar | Heroísmo, Segundo Fôlego |
| `mod_rf` / `mod_rm` | resistência física / mágica | Resistência à Dor / Extrema |

---

## 1. Velocidade e movimento

`mod_vb` governa iniciativa, passo no tabuleiro **e** a ação extra acima de 30
de velocidade — então velocidade é, sozinha, uma técnica de apoio forte.

**Passo Ligeiro** · Ladino · Intermitente · custo 1 · Agilidade · armas Livre
> Seu total de Passo Ligeiro é adicionado à sua velocidade e à sua defesa por
> 1 rodada.

Registro: `modo: 'total'`, self, 1 rodada, `mod_vb +1`, `mod_defesa +1`.
*Entrar, sair do alcance e chegar primeiro. Hoje as duas técnicas de velocidade
do catálogo exigem arma de disparo.*

**Marcha de Guerra** · Academia de Soldados · Único · custo 2 · Físico
> Seu total de Marcha de Guerra é adicionado à velocidade de 4 alvos por
> 3 rodadas.

Registro: `modo: 'total'`, `alvo: 'aliados'`, `maxAlvos: 4`, 3 rodadas,
`mod_vb +1`. *O soldado dita o passo da tropa. Irmã curta e forte da Voz de
Comando (10 rodadas), para quando o grupo precisa chegar AGORA.*

**Abrir Caminho** · Academia de Cavaleiros · Intermitente · custo 2 · Força
> Um teste de Abrir Caminho (Médio) move 1 alvo por 3 metros por 1 rodada.

Registro: `modo: 'teste'`, inimigo, 1 rodada, `dificuldade: 'medio'`,
`conduzido` com `casas: 3`. *Empurra quem está bloqueando a porta ou em cima do
aliado caído. Usa a mesma condução de Conduzir Oponente, mais curta.*

**Travar Passagem** · Academia de Soldados · Intermitente · custo 1 · Físico
> Seu total de Travar Passagem é subtraído da velocidade de 1 alvo por
> 2 rodadas.

Registro: `modo: 'total'`, inimigo, 2 rodadas, `mod_vb −1`. *O inimigo perde a
iniciativa e o passo — o grupo alcança o arqueiro ou foge do ogro.*

---

## 2. Desgastar armas e armaduras

A armadura em combate tem **resistência** (`res`): o golpe acima do limiar gasta
um ponto, e com zero ela para de bloquear. Hoje só Estilhaçar e Retalhar mexem
nisso de propósito. Desgastar a armadura do chefe é apoio puro: **todo** o grupo
bate melhor depois.

**Cortar Correias** · Guilda de Ladrões · Intermitente · custo 1 · Agilidade ·
armas CL, PL
> Um teste de Cortar Correias (Muito Difícil) causa 5 de dano na armadura de
> 1 alvo.

Registro: `modo: 'teste'`, inimigo, 1 rodada, `dificuldade: 'muito_dificil'`,
`dano_equipamento 5`. *A lâmina curta não fura a placa — solta as fivelas que a
seguram.*

**Amassar Armadura** · Academia de Soldados · Único · custo 2 · Força · armas
EM, EP
> Um teste de Amassar Armadura (Difícil) causa 2 de dano na armadura e subtrai
> 3 da defesa de 1 alvo por 3 rodadas.

Registro: `modo: 'teste'`, inimigo, 3 rodadas, `dificuldade: 'dificil'`,
`dano_equipamento 2` e `mod_defesa −3`. *A peça amassada prende o movimento.
Primeira técnica a juntar desgaste e efeito com duração — conferir na
implementação que `aplicarDanoEquipamento` e o status convivem.*

**Travar Lâmina** · Academia de Gladiadores · Intermitente · custo 2 ·
Agilidade
> Um teste de Travar Lâmina (Difícil) subtrai 25% do dano de 1 alvo por
> 2 rodadas.

Registro: `modo: 'teste'`, inimigo, 2 rodadas, `dificuldade: 'dificil'`,
`dano_pct −25` no alvo. *A arma do adversário fica presa, torta, sem corte. O
efeito mora no inimigo e reduz o que ELE causa — é o `somaDanoPct` do atacante,
lido do outro lado.*

---

## 3. Apoio ao grupo

O catálogo inteiro tem duas técnicas que ajudam aliados (Voz de Comando e
Escolta). Guerreiro e Ladino são quem está na linha de frente e no flanco —
são eles que enxergam a abertura para o resto do grupo.

**Formação de Escudos** · Academia de Soldados · Único · custo 2 · Físico
> Seu total de Formação de Escudos é adicionado à defesa de 3 alvos por
> 3 rodadas.

Registro: `modo: 'total'`, `alvo: 'aliados'`, `maxAlvos: 3`, 3 rodadas,
`mod_defesa +1`. *Parede de escudos: a defesa que era de um vira de três.*

**Cobertura** · Academia de Cavaleiros · Intermitente · custo 2 · Físico
> Um teste de Cobertura (Difícil) reduz em 25% o dano recebido por 2 alvos por
> 2 rodadas.

Registro: `modo: 'teste'`, `alvo: 'aliados'`, `maxAlvos: 2`, 2 rodadas,
`dificuldade: 'dificil'`, `dano_recebido_pct −25`. *O cavaleiro se põe entre o
golpe e o mago. Combate com Escudo em versão para os outros.*

**Sinal Combinado** · Ladino · Intermitente · custo 1 · Percepção
> Seu total de Sinal Combinado é adicionado à coluna de ataque de 2 alvos por
> 1 rodada.

Registro: `modo: 'total'`, `alvo: 'aliados'`, `maxAlvos: 2`, 1 rodada,
`mod_ataque +1`. *O ladino aponta a hora certa; os aliados acertam. Curta de
propósito: é para a rodada decisiva.*

**Grito de Reunião** · Guerreiro · Único · custo 2 · Carisma
> Seu total de Grito de Reunião é adicionado à energia heroica de 3 alvos por
> 3 rodadas.

Registro: `modo: 'total'`, `alvo: 'aliados'`, `maxAlvos: 3`, 3 rodadas,
`mod_eh_temp +1`. *Heroísmo e Segundo Fôlego são só para si. Esta segura o
grupo de pé quando a luta vira.*

---

## 4. Abrir o adversário para os outros

Não é dano: é deixar o inimigo vulnerável ao que o **grupo** faz — o veneno do
assassino, a magia do sacerdote, a próxima técnica do guerreiro.

**Golpe nos Nervos** · Guilda de Assassinos · Intermitente · custo 2 ·
Percepção · armas PL, CD
> Um teste de Golpe nos Nervos (Difícil) subtrai 3 da resistência física de
> 1 alvo por 3 rodadas.

Registro: `modo: 'teste'`, inimigo, 3 rodadas, `dificuldade: 'dificil'`,
`mod_rf −3`. *Veneno, Sangramento e condições entram com mais facilidade. É a
técnica que faz o assassino jogar com o próprio arsenal.*

**Desconcentrar** · Guilda de Piratas · Intermitente · custo 1 · Carisma
> Um teste de Desconcentrar (Médio) subtrai 3 da resistência mágica de 1 alvo
> por 2 rodadas.

Registro: `modo: 'teste'`, inimigo, 2 rodadas, `dificuldade: 'medio'`,
`mod_rm −3`. *Provocação, barulho, areia nos olhos — e a magia do aliado entra.
Guerreiro e Ladino não conjuram, mas podem abrir caminho para quem conjura.*

---

## 5. Precisam de algo que o combate ainda não tem

| Ideia | O que falta |
|---|---|
| **Desgastar Arma** — "causa 3 de dano na arma de 1 alvo" | O combate não acompanha a resistência da ARMA (só a da armadura). `itens.resistencia` existe no catálogo; falta gastá-la em batalha e decidir o que acontece com a arma em zero. |
| **Bomba de Fumaça** — Ladino cria escuridão em 3 metros | O tabuleiro tem níveis de visibilidade, mas não há efeito que CRIE escuridão numa área. Com isso, Luta às Cegas vira a resposta natural. |
| **Negar Técnica** — Gladiador impede 2 inimigos de usar técnicas por 1 rodada | Teto de alvos (`maxAlvos`) para técnica com `alvo: 'inimigo'`; hoje só aliados têm. Com 1 alvo, seria a Leitura de Batalha. |
| **Troca de Posição** — Ladino troca de lugar com 1 aliado | Mover dois tokens de uma vez; a condução atual move um. |

---

## Resumo

| Técnica | Quem | Função | Uso · custo |
|---|---|---|---|
| Passo Ligeiro | Ladino | velocidade + defesa | Intermitente · 1 |
| Marcha de Guerra | Soldados | velocidade de 4 aliados | Único · 2 |
| Abrir Caminho | Cavaleiros | empurra 1 inimigo | Intermitente · 2 |
| Travar Passagem | Soldados | −velocidade do inimigo | Intermitente · 1 |
| Cortar Correias | Ladrões | desgasta armadura | Intermitente · 1 |
| Amassar Armadura | Soldados | desgasta armadura, −defesa | Único · 2 |
| Travar Lâmina | Gladiadores | −25% do dano do inimigo | Intermitente · 2 |
| Formação de Escudos | Soldados | defesa de 3 aliados | Único · 2 |
| Cobertura | Cavaleiros | −25% de dano em 2 aliados | Intermitente · 2 |
| Sinal Combinado | Ladino | ataque de 2 aliados | Intermitente · 1 |
| Grito de Reunião | Guerreiro | energia heroica de 3 aliados | Único · 2 |
| Golpe nos Nervos | Assassinos | −RF do inimigo | Intermitente · 2 |
| Desconcentrar | Piratas | −RM do inimigo | Intermitente · 1 |
