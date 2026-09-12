# Habilidades, itens e magias fora de combate

**Mapa do que já funciona, do que não funciona e do que trava.** Levantado em
12/09/2026 a pedido do usuário. É um documento de decisão, não um plano de
execução: as escolhas que ele expõe são suas.

---

## 1. O estado de hoje, em uma tabela

Tudo isto acontece na **ficha do personagem** (`11-ficha`), fora de qualquer
batalha.

| | Rola dado | Aplica efeito | Consome recurso | Avisa a mesa |
|---|---|---|---|---|
| **Habilidade** | ✅ d20, dificuldade e veredito | — (o teste **é** o resultado) | — | ✅ |
| **Item** | — (não precisa) | ✅ condições e poços da ficha | ✅ baixa no inventário | ✅ |
| **Magia** | ❌ | ❌ | ❌ | ✅ |

**Duas das três já estão prontas.** Habilidade e item funcionam fim a fim: o
item consumido mexe em Saúde, Hidratação, EH, EF — a mesma escala que a batalha
usa, pela mesma função (`aplicarDeltaCondicao`), então não há duas verdades.

**Magia não.** O botão *Evocar* escolhe nível e alvo, escreve na Central de
Mensagens da Mesa — e para aí. Não aplica efeito, não cobra karma. O próprio
código já dizia isso desde que foi escrito:

> *"Evocar (onEvocar) fecha o modal e notifica a Central de Mensagens da Mesa
> com { nivel, alvo } — ainda NÃO aplica o efeito mecânico no alvo."*

Ou seja: **a lacuna é uma só, e tem nome.**

---

## 2. Por que a magia parou aí — as quatro travas

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

Três saídas, em ordem de custo:

| Saída | Custo | O que muda na mesa |
|---|---|---|
| **O Mestre aplica** | zero | o jogador evoca, a mesa vê no log, o Mestre aplica. É como a mesa já resolve tudo que o motor não faz |
| **RPC dedicada** | média | espelha `atualizar_batalha_jogador`, que já existe pelo mesmo motivo, no combate |
| **Só em si mesmo** | zero | magia de alvo próprio aplica sozinha; alvo em terceiro vai para o Mestre |

### Trava 3 — Fora de combate não há rodadas

E é aqui que o catálogo é duro:

```
67 instantâneas          → aplicam e acabam. Nenhum problema.
57 tempo de calendário   → "10 minutos", "1 hora", "30 dias"
53 variáveis (ver nível) → a duração está no texto do nível
43 em RODADAS            → não significam nada fora de combate
17 permanentes           → aplicam e ficam
```

As **43 em rodadas** são o problema conceitual: *"Aumenta 1 coluna por 10
rodadas"* fora de combate dura o quê? Isso é decisão de regra, não de código.

As **57 de calendário** já têm para onde ir: a data do jogo existe e o motor já
sabe somar dias nela (`somarDiasFantasy`, construída para a cura natural de
Doenças). Uma magia de 30 dias vira *"vence em 12 de Mês do Ouro"*.

### Trava 4 — Os testes precisam de duas pessoas

Magia com **teste de resistência** exige que o alvo role. Em combate o painel
faz isso porque os dois estão na mesma tela. Fora de combate, o alvo é outro
jogador, talvez ausente. O teste de **habilidade** (do conjurador) não tem esse
problema: a ficha já rola habilidade com dificuldade e veredito.

---

## 3. O que eu recomendo

**Três degraus, e o primeiro resolve a maior parte.**

### Degrau 1 — Magia em si mesmo, agora

Magia cujo alvo é o **próprio conjurador** aplica de verdade: cobra karma,
grava o efeito na ficha, avisa a mesa. Sem trava 2 (é a própria linha), sem
trava 4 (ninguém resiste a si mesmo).

Cobre cura pessoal, buff pessoal, proteção — e são as que mais se usam fora de
combate. **É o degrau que eu construiria primeiro**, e é pequeno: o motor
existe, falta o caminho até `estado_atual`.

Para a trava 3, a regra mais simples que funciona: **instantâneas e
permanentes aplicam; as de rodada ficam para o Mestre**, com o log dizendo por
quê. Sem inventar equivalência entre rodada e minuto.

### Degrau 2 — Alvo em terceiro, pelo Mestre

O jogador evoca, o log registra com nível e alvo, e o **Mestre aplica** com um
clique — ele já pode escrever em qualquer protagonista da história dele. Zero
infraestrutura nova, e mantém a mesa no controle, que é como Provocar e
Conduzir Oponente já foram resolvidas.

### Degrau 3 — Duração no calendário

Magia de minutos, horas ou dias ganha data de vencimento pela data do jogo. É
a peça mais bonita e a menos urgente: depende de alguém avançar a data, e o
Mestre já faz isso à mão.

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

> Habilidade e item **já funcionam** fora de combate. Magia anuncia e não
> acontece — e o que falta não é motor, é **onde escrever** (ficha do colega é
> proibida pelo banco) e **quanto tempo dura** (43 magias contam em rodadas,
> que fora de combate não existem). Magia em si mesmo resolve a maior fatia e
> não esbarra em nenhuma das duas.
