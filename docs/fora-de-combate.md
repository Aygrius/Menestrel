# Habilidades, itens e magias fora de combate

**Mapa do que já funciona, do que não funciona e do que trava.** Levantado em
12/09/2026 a pedido do usuário, e atualizado no mesmo dia com as duas decisões
que ele tomou ao ler: **aprovação do Mestre** para alvo em terceiro, e
**rodadas não contam** fora de batalha. As duas fecharam as travas que este
documento existia para expor.

---

## 1. O estado de hoje, em uma tabela

Tudo isto acontece na **ficha do personagem** (`11-ficha`), fora de qualquer
batalha.

| | Rola dado | Aplica efeito | Consome recurso | Avisa a mesa |
|---|---|---|---|---|
| **Habilidade** | ✅ d20, dificuldade e veredito | — (o teste **é** o resultado) | — | ✅ |
| **Item** | — (não precisa) | ✅ condições e poços da ficha | ✅ baixa no inventário | ✅ |
| **Magia** | — | ✅ desde 12/09/2026 | ✅ karma, no nível evocado | ✅ |

Habilidade e item sempre funcionaram fim a fim: o item consumido mexe em Saúde,
Hidratação, EH, EF — a mesma escala que a batalha usa, pela mesma função
(`aplicarDeltaCondicao`), então não há duas verdades.

**Magia não funcionava.** O botão *Evocar* escolhia nível e alvo, escrevia na
Central de Mensagens da Mesa — e parava aí. O próprio código dizia isso desde
que foi escrito:

> *"Evocar (onEvocar) fecha o modal e notifica a Central de Mensagens da Mesa
> com { nivel, alvo } — ainda NÃO aplica o efeito mecânico no alvo."*

Era uma lacuna só, e tinha nome. **Os três degraus abaixo a fecharam em
12/09/2026** — e as seções 2 e 3 ficam como estão porque explicam POR QUE cada
peça é do jeito que é, que é o que se esquece primeiro.

---

## 2. Por que a magia parou aí — as quatro travas (três já resolvidas)

Não é falta de motor. O motor de magia existe e está completo (75 magias,
alvo, nível, elemento, testes, duração, cura, condição). O que falta é que ele
foi construído **dentro da batalha** e assume coisas que fora dela não existem.

### Trava 1 — O motor escreve num *snapshot*, não na ficha

`aplicarEfeitoMagia` opera sobre um participante de batalha: um objeto com
`eh`, `ef`, `ar`, `status_temp`, com os tetos **congelados** no início do
combate. A ficha tem `estado_atual`, que é outra forma.

> **Não é obstáculo grande.** As duas pontes já existem e foram construídas
> nesta semana: `aplicarCondicoesDaMagia` (magia → condição de ficha) e
> `aplicarEfeitoItemSnapshot` (item → snapshot). Falta a terceira direção.

### Trava 2 — O jogador não pode escrever na ficha do colega

Esta é a trava dura, e é de banco, não de código:

```
personagens_update_own_or_vinculado:
  auth.uid() = user_id  OU  quem é MESTRE da história
```

Um jogador pode alterar **o próprio** personagem. Curar um colega significa
escrever na linha dele — e o banco recusa, com razão.

**DECIDIDO pelo usuário em 12/09/2026: magia em outro jogador exige aprovação
do Mestre.** E isso não é contorno — é a solução correta, pela razão exata:

> O Mestre **já tem permissão de escrita** em todo protagonista da história
> dele, pela política acima. A aprovação não fura o banco: ela faz com que
> **quem escreve seja alguém que já podia**. A escrita acontece na sessão do
> Mestre, e a regra de segurança fica intacta em vez de perfurada.

É melhor que a alternativa que eu havia listado (uma RPC `SECURITY DEFINER`):
aquela teria de **reimplementar em código** quem pode conjurar em quem — uma
segunda cópia de uma regra que o banco já enuncia. Duas cópias da mesma regra
divergem sempre; foi o erro mais caro desta semana, três vezes.

**De brinde, resolve a trava 4:** o teste de resistência do alvo é arbitrado
pelo Mestre no momento de aprovar.

### A fila já existe: `mesa_log`

Tem `meta jsonb`, chega por realtime e o Mestre já a lê. Uma evocação pendente
é um evento com `meta.pendente`, e a Central de Mensagens ganha um botão
*Aplicar*.

> ⚠️ `mesa_log` tem **só política de SELECT** — é append-only para o cliente
> (a escrita passa pela RPC `registrar_evento_mesa`). Então "aplicada" é um
> **segundo evento**, não um update do primeiro. Melhor assim: o histórico da
> mesa fica intacto.

### Trava 3 — Fora de combate não há rodadas · **RESOLVIDA**

**Regra do usuário, 12/09/2026: fora de batalha, as rodadas não contam.**

Não é limitação — é uma classificação que o catálogo **já tinha feito**, e ela
dispensa inventar qualquer taxa entre rodada e minuto:

| Duração | Quantas | Fora de combate |
|---|---|---|
| **Instantânea** | 67 | aplica e acaba — **são estas as magias de fora de combate** |
| **Permanente** | 17 | aplica e fica |
| **Calendário** | 57 | vira **magia ativa** na ficha, com data de vencimento, e vale na próxima batalha (degrau 3) |
| **Rodadas** | 43 | **são magias de combate, por construção.** Evoca, o log registra, nada é escrito na ficha |

Quer o bônus de *"10 rodadas"*? Evoque quando o combate começar — é o que o
próprio texto da magia diz.

> ⚠️ **53 magias têm duração `Variável`**, que significa "veja o nível". Elas
> caem em baldes DIFERENTES conforme o nível evocado: a mesma magia pode ser
> instantânea no 1 e de horas no 9. A classificação é **por evocação**, não por
> magia — e `duracaoNoNivel` já sabe resolver isso.

### Duas regras que vêm junto com a trava 3

**Vencimento preguiçoso.** As de calendário expiram por **comparação na
leitura** — *"a data do jogo já passou de 14 de Mês do Ouro?"* —, nunca por
rotina de fundo. Nada avança a data do jogo sozinho; se o vencimento dependesse
de um processo, os bônus nunca acabariam. É o mesmo padrão da cura natural de
Doenças, que já funciona assim.

**A data aparece na ficha.** *"Bênção — vence em 14 de Mês do Ouro"*. Sem isso
o jogador não sabe o que ainda está ativo nele.

### Trava 4 — Os testes precisam de duas pessoas · **RESOLVIDA pela trava 2**

Magia com **teste de resistência** exige que o alvo role. Em combate o painel
faz isso porque os dois estão na mesma tela. Fora de combate, o alvo é outro
jogador, talvez ausente.

A aprovação do Mestre resolve de graça: **ele arbitra o teste ao aprovar**, que
é o que já faz com Provocar e Conduzir Oponente. E o teste de **habilidade** (do
conjurador) nunca foi problema — a ficha já rola com dificuldade e veredito.

---

## 3. Os três degraus — TODOS CONSTRUÍDOS em 12/09/2026

Foram construídos em ordem, e cada um destravou o seguinte.

### Degrau 1 — Magia em si mesmo · **CONSTRUÍDO**

Magia cujo alvo é o **próprio conjurador** aplica de verdade: cobra karma,
grava o efeito na ficha, avisa a mesa. Sem trava 2 (é a própria linha), sem
trava 4 (ninguém resiste a si mesmo) e sem aprovação de ninguém.

Cobre cura pessoal, buff pessoal, proteção — as que mais se usam fora de
combate. Foi o primeiro justamente por não depender de nenhuma das travas.

Aplica o que a trava 3 classificou: **instantânea e permanente entram; as de
rodada só registram no log**, com o texto dizendo por quê. E quando não aplica,
**o log diz o motivo** — *"evoquei e não aconteceu nada"* foi o que esta tela
fez por meses, e não pode voltar a ser mistério.

> **Uma porta só para escrever na ficha.** `aplicarEfeitosNaFicha` foi
> EXTRAÍDA de `aplicarEfeitosItem`, não copiada: item consumido e magia
> evocada entram pelo mesmo caminho, com o mesmo clamp de poço, a mesma escala
> de condição e o mesmo piso de zero.

### Degrau 2 — Alvo em terceiro, com aprovação do Mestre · **CONSTRUÍDO**

O jogador evoca → vira evento pendente no `mesa_log` → o Mestre vê na Central
de Mensagens e clica em *Aplicar* → a escrita acontece **na sessão dele**, que
o banco já autoriza.

Zero infraestrutura nova, a regra de segurança intacta, e a mesa no controle —
que é como Provocar e Conduzir Oponente já foram resolvidas.

**Como ficou (12/09/2026):** a fila aparece no topo da Central de Mensagens, só
para o Mestre, com *Aplicar* e *Dispensar*. A resposta é um SEGUNDO evento
apontando para o pedido (`meta.responde_pedido`) — `mesa_log` é append-only, e
assim o histórico guarda quem aprovou o quê.

O **karma sai na evocação**, na linha do próprio conjurador — a única que ele
pode escrever. É o custo do ATO, como em batalha, onde o karma sai na largada e
não volta se a evocação quebrar. O que espera o Mestre é o efeito pousar no
alvo, não o preço.

E o Mestre aplica pela MESMA função que o jogador usa em si mesmo
(`efeitosDeMagiaNaFicha` + `aplicarEfeitosNaFicha`): dois caminhos divergiriam,
e curar a si mesmo daria um número enquanto curar o colega daria outro.

### Degrau 3 — Duração no calendário · **CONSTRUÍDO**

Magia de minutos, horas ou dias ganha data de vencimento pela data do jogo.

**O que a torna útil é o que vem depois:** uma Bênção de *"1 hora"* lançada
antes de entrar na masmorra precisa estar ativa **quando a luta começa**. Por
isso ela fica na ficha (`estado_atual.magias_ativas`) com a data de vencimento,
e o snapshot de batalha a transforma em status ao montar — reusando
`aplicarEfeitoMagia`, o mesmo caminho da conjuração dentro do combate. Um
segundo caminho daria números diferentes para a mesma magia conforme onde foi
evocada.

| Decisão | Por quê |
|---|---|
| guarda o **nível**, não os números | o texto do nível é a fonte; congelar valores criaria uma cópia que sai de sincronia no primeiro ajuste do catálogo |
| minutos e horas vencem **no mesmo dia** | o calendário tem grão de dia, e fingir precisão de hora seria mentir com mais casas |
| vence **no dia**, não depois dele | uma magia que vence em 14 vale no 13 e não vale no 14 |
| relançar **renova**, não empilha | mesma regra que o motor de batalha já segue |

A ficha mostra o que está ativo e até quando — sem isso a magia duraria no
escuro, e *"por que minha coluna está +1?"* viraria suporte.

---

## 4. O que eu NÃO recomendo

**Reproduzir o painel de batalha na ficha.** Alvo, dado, resistência, alcance,
canalização — fora de combate não há tabuleiro, não há iniciativa e não há
rodada. Copiar aquela tela para cá criaria uma segunda verdade sobre como
magia funciona, e a lição mais cara desta semana foi exatamente essa: duas
cópias da mesma regra divergem sempre (foi assim com a escala de dificuldade,
com o consumo de item e com os dois handlers de ação).

**Converter rodada em minuto.** Não existe essa taxa no jogo, e inventá-la é
decidir balanceamento no código — o oposto da regra que rege este catálogo.

---

## 5. Resumo de uma linha

> **As três funcionam fora de combate.** A lacuna era só da magia, e não era
> falta de motor: era **onde escrever** e **quanto tempo dura**. Duas decisões
> do usuário em 12/09/2026 fecharam as duas — quem escreve na ficha do colega é
> o **Mestre, aprovando** (funciona porque ele já podia), e magia de **rodada é
> magia de combate**, então fora dele só o log registra.
>
> O que sobrou virou os três degraus, todos construídos no mesmo dia: em si
> mesmo, com aprovação do Mestre, e com vencimento no calendário.

---

## 6. O que ficou por fazer

Nada dos três degraus. Duas coisas ficaram **de propósito**, e é bom que
estejam escritas:

- **Magia de rodada continua sem valer fora de combate.** É a regra, não uma
  lacuna — mas se um dia você quiser que ela valha (por exemplo, "dura até a
  próxima batalha"), o lugar de mexer é `classeDeDuracao`.
- **A duração de calendário tem grão de DIA.** Uma magia de 1 hora e outra de
  23 horas vencem no mesmo dia de jogo. Se a mesa passar a contar horas, o
  lugar é `duracaoEmDiasDeJogo`.
