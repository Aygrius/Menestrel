# Magias — efeitos mecânicos nas rodadas (Fase 1)

**Data:** 2026-09-11
**Escopo:** as magias deixam de ser texto narrativo e passam a produzir efeito
mecânico nas rodadas de batalha, pelas quatro dimensões que o sistema define —
**nível** da magia, **alvo**, **rodadas de evocação** e **rodadas de duração**.
Fase 1 cobre as 25 magias que os PJs da campanha compraram *e* que têm efeito
mecânico em rodada. Inclui a correção de três defeitos encontrados no caminho.

Irmão de `2026-09-09-tecnicas-efeitos-combate-design.md`, que fez o mesmo
trabalho para as técnicas. Onde a regra é idêntica, este documento aponta para
lá em vez de repetir.

---

## 1. Problema

A tabela `magias` tem 238 linhas. Cada uma descreve o efeito em prosa, em cinco
textos por nível (`nivel_1`, `nivel_3`, `nivel_5`, `nivel_7`, `nivel_9`), mais
`evocacao`, `alcance` e `duracao`.

Hoje o motor lê **duas** coisas desse catálogo:

| O que lê | Onde | Para quê |
|---|---|---|
| `danoMagiaNoNivel` | `batalha.jsx:516` | dano da aba Magia |
| `modVelocidadeNoNivel` + `duracaoEmRodadas` + `exigeResistencia` | `batalha.jsx:549/573/595` | buff/debuff de velocidade da aba Apoio |

Tudo o mais é narrativo. Em particular: **a evocação nunca virou regra** —
`magias.evocacao` só é exibida na ficha (`ficha.jsx:716`) e no bestiário
(`bestiario.jsx:652`). Uma magia de "5 rodadas" de evocação é lançada hoje no
mesmo tempo que uma Instantânea.

### O que já existe e funciona

O motor de efeito por rodada está pronto, testado e em uso pelas técnicas.
Não é preciso construir nada disto:

| Peça | Onde | O que faz |
|---|---|---|
| `status_temp[]` | formato do snapshot | `{ id, nome, icone, rodadas_rest, efeito: { tipo, valor } }` |
| `somaEfeitosStatus(p, tipo)` | `batalha.jsx:1609` | soma os `valor` de um tipo |
| `decrementarStatusTemp` | `batalha.jsx:1693` | −1 por virada; `rodadas_rest: null` persiste até o fim |
| `processarViradaDeRodada` | `batalha.jsx:1667` | reset de PA → dano por rodada → decremento |
| `aplicarEfeitoApoio` | `batalha.jsx:2144` | já grava `status_temp` a partir de uma magia |
| `quebrarConcentracao` | `batalha.jsx:2619` | derruba magia sustentada, em todos os alvos |
| `quebrarConcentracaoPorDano` | `batalha.jsx:2664` | a mesma regra nos 3 caminhos de dano |
| `saidaDeCombate` | `batalha.jsx:2726` | desmaiar/morrer/desistir também derruba |
| `alcanceDaAcao` / `dentroDoAlcance` | `tabuleiro.jsx:93/86` | distância já é regra no tabuleiro |
| `nivelMagiaEfetivo(passos)` | `game-data.jsx` | passos comprados → nível 1/3/5/7/9 |
| `TECNICA_EFEITO_MAP` | `01-core/tecnicas-efeito.jsx` | o molde do registro que esta fase copia |

Das quatro dimensões do pedido, portanto, **duas já estão resolvidas**: o
**nível** (`nivelMagiaEfetivo` + os textos `nivel_N`) e a **duração**
(`duracaoEmRodadas` + `rodadas_rest`). O que falta é o **alvo** (além da
distância) e a **evocação** — e as primitivas dos efeitos em si.

### A lacuna

Nenhuma magia produz `status_temp`, exceto as oito de velocidade. O caminho da
magia termina no dano ou no log.

---

## 2. Análise do catálogo

### 2.1 Distribuição das 238

| Campo | Distribuição |
|---|---|
| `evocacao` | Instantânea 80 · 1 rodada 49 · Ritual 39 · 2 rodadas 34 · 3–10 rodadas 29 · Variável 3 · fora de combate 4 |
| `duracao` | Instantânea 68 · Variável (concentração) 53 · mais longa que a batalha 84 · N rodadas 36 |
| `alcance` | Toque 65 · Pessoal 62 · 5–50 m 78 · Variável 11 · km 9 |
| efeito no `nivel_1` | dano 38 · EH 26 · coluna de ataque 22 · EF 10 · velocidade 9 · cura 5 · resistência 4 · defesa 2 · armadura 1 |

### 2.2 O corte da Fase 1

Decidido com o usuário em 11/09/2026: **as magias que os PJs realmente
conhecem**. São 73 chaves distintas em `personagens.magias` com passos > 0.
Dessas, 27 têm efeito mecânico em rodada; duas saem (§2.3); restam **25**.

| Grupo | N | Magias |
|---|---|---|
| Dano | 12 | Bola de Fogo, Toque Gélido, Covardia, Aeromanipulação, Piromanipulação, Geomanipulação, Hidromanipulação, Fotomanipulação, Dardos de Gelo (3 alvos), Dardos de Luz (2), Raio Elétrico (2), Meteoros (5 fragmentos) |
| Redução de dano | 3 | Aeroproteção (−ar), Piroproteção (−fogo), Armadura Elemental (−elemental) |
| Buff / debuff | 8 | Arqueirismo (+coluna, só arco), Bênção (+coluna +EH), Bravura (+RM +EH), Super Resistência (+RF +RM), Barreira Mística (defesa), Aura Divina (−coluna), Força Mútua (+coluna), Velocidade (+vel) |
| Cura | 2 | Curas Espirituais (+EH), Curas Físicas (+EF) |

Velocidade já funciona hoje pela aba Apoio; entra aqui só para migrar do
caminho especial para o registro geral.

As ~45 magias restantes das 73 continuam narrativas — Rituais de dias ou
permanentes (Sagração, Necroanimação, Ressurreição, Prisão Púrpura, Ritual de
Sangue, Regeneração) e utilitárias (Clarividência, Detecção de Magia,
Rastreamento, Contatos Mentais, Telecinese, Adestramento, Visão Animal…).

### 2.3 O que sai da Fase 1, e por quê

- **Licantropia Lupina** — "+1 em Força, −1 em Intelecto". Atributo atravessa
  `calcularFicha` inteira (EH, EF, VB e colunas derivam dele). É primitiva de
  porte próprio, não um `status_temp`. Fase 2.
- **Oferenda** — "+2 níveis na próxima magia evocada". Estado entre ações, não
  efeito por rodada. Fase 2.

### 2.4 Fase 2 (registrada, fora deste spec)

O núcleo da Fase 2 são as sete magias de **controle** que os PJs já têm e que a
Fase 1 não alcança porque exigem primitivas que impedem ou anulam ações:
**Sono, Medo, Invisibilidade, Ordens, Possessão, Esconjuração, Alucinação** —
mais Licantropia Lupina e Oferenda (§2.3). Nove no total.

Fora do recorte "conhecidas pelos PJs", as outras 165 magias do catálogo ficam
para quando alguém as comprar: o registro é aditivo, e magia sem entrada segue
narrativa (§5).

### 2.5 Criaturas não conjuram nesta fase

Decidido com o usuário em 11/09/2026. 60 das 224 criaturas têm magia, mas o
dado está em `criaturas.magia` como **texto livre com os nomes separados por
vírgula** (`"Geoproteção, Transformação"`), sem `key`. Há uma coluna `magia_n`
com o nível, mas uma só para a lista inteira.

Normalizar isso é uma migração de banco com casamento nome→key contra o
catálogo, e alguns nomes podem não existir em `magias`. Fica registrado como
pré-requisito da fase em que criatura conjurar. Até lá, a magia da criatura
continua como hoje: texto exibido no card para o Mestre narrar.

---

## 3. Decisões

Tomadas com o usuário em 11/09/2026:

1. **O corte é "o que os PJs conhecem"** (§2.2), não o catálogo inteiro.
2. **Evocação de N rodadas é canalização interrompível** (§4). O conjurador
   gasta 1 PA por rodada e a magia só resolve no fim da N-ésima.
3. **Karma é debitado na largada e não volta se a evocação quebrar.** É o
   custo do risco.
4. **Multi-alvo é "N alvos escolhidos", sem área.** O teto de alvos vem do
   registro; um dado por alvo. Magia de área fica parcial (§6.3).
5. **O número do efeito vem do texto; a semântica vem do registro** (§5). O
   mapa não guarda números.
6. **Criaturas não conjuram** (§2.5).
7. **Restrição de alvo é regra, não sugestão** (§6.2).
8. **Reaplicar não acumula** — renova `rodadas_rest` e mantém um único
   `status_temp`. Mesma decisão 7 do spec das técnicas, pelo mesmo motivo.
9. **A duração conta a rodada em que a magia RESOLVE**, não a em que a
   evocação começou.

---

## 4. A evocação canalizada

É o mecanismo novo desta fase — técnica nenhuma tinha equivalente.

### 4.1 Estado

Campo novo no participante, **fora** de `status_temp` (não é um modificador de
stat; é uma ação em curso):

```js
evocando: {
  magia_key, nivel,
  alvos: [instId, …],     // escolhidos na largada, revalidados na resolução
  rodadas_rest,           // decrementa na virada
  karma_pago,             // registro, não devolução
}
```

### 4.2 Ciclo de vida

- **Largada.** Debita o karma (= nível efetivo) e 1 PA; grava `evocando` com
  `rodadas_rest: N`. Nada acontece com o alvo ainda.
- **Cada rodada seguinte.** Custa 1 PA no turno do conjurador; a virada
  decrementa `rodadas_rest`.
- **Resolução.** Ao chegar a 0, a magia acontece: dado, dano ou `status_temp`,
  log. A duração passa a contar daqui (decisão 9).
- **Quebra.** Pelas **mesmas regras da concentração**, que já estão escritas e
  testadas (`quebrarConcentracao`, `batalha.jsx:2619`): atacar, lançar outra
  magia, usar item, andar, levar dano que chega na EF, desmaiar, morrer ou
  desistir. Passar a vez **não** quebra — é assim que se evoca. Dano contido
  inteiramente por EH ou AR **não** quebra.
- **Karma não volta** (decisão 3).

### 4.3 Alvo que some no meio

Se um alvo escolhido na largada morre, desiste ou sai do alcance antes da
resolução, ele é descartado na revalidação. Sobrando zero alvos válidos, a
magia resolve sem efeito e o log diz por quê — o karma já foi gasto.

### 4.4 Os outros valores de `evocacao`

- `"Instantânea"` (80 magias) — resolve na hora, sem estado. É o
  comportamento de hoje.
- `"Ritual"` (39) — desabilitada em batalha, com o motivo no tooltip.
- `"Variável"` (3) e os valores em horas/dias (4) — tratados como Ritual.

### 4.5 Por que reusar a concentração

As duas coisas são "o conjurador está preso a uma magia e qualquer outra coisa
a derruba". A diferença é só o payload: concentração sustenta um efeito **já
aplicado**, evocação sustenta um efeito **ainda não aplicado**. As três funções
de quebra (`quebrarConcentracao`, `quebrarConcentracaoPorDano`,
`saidaDeCombate`) ganham um segundo alvo de limpeza em vez de um caminho
paralelo — o spec das técnicas registra o preço de manter dois caminhos: a
cópia do Jogador ficou meses sem decrementar `status_temp`.

---

## 5. O registro e o parser

Decisão 5: **o mapa diz a forma, o texto diz o número.**

A alternativa de digitar os números à mão (como as técnicas fazem) foi
recusada porque a magia tem cinco textos por nível — seriam ~125 números que
saem de sincronia no primeiro UPDATE pelo editor de catálogo do admin, que
existe e é usado. A alternativa de ler tudo da prosa sem mapa foi recusada
porque a prosa não diz semântica: não distingue "A barreira reduz 1 coluna de
ataque" (defesa própria) de "A área reduz 1 coluna de ataque" (penalidade no
inimigo), nem diz quantos alvos Dardos de Gelo pega.

### 5.1 Arquivo novo: `src/01-core/magias-efeito.jsx`

```js
const MAGIA_EFEITO_MAP = {
  bencao:           { alvo: 'aliado',  alvos: 1, icone: '✨',
                      efeitos: [{ tipo: 'mod_ataque',  unidade: 'coluna', sinal: +1 },
                                { tipo: 'mod_eh_temp', unidade: 'eh',     sinal: +1 }] },
  dardos_de_gelo:   { alvo: 'inimigo', alvos: 3, icone: '🧊',
                      efeitos: [{ tipo: 'dano', unidade: 'dano', elemento: 'agua' }] },
  arqueirismo:      { alvo: 'self',    alvos: 1, icone: '🏹', grupo_armas: 'AR',
                      efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: +1 }] },
  piroprotecao:     { alvo: 'self',    alvos: 1, icone: '🔥',
                      efeitos: [{ tipo: 'reducao_dano', unidade: 'dano',
                                  elemento: 'fogo', sinal: +1 }] },
  // alvos: 'escolha' = sem teto, só nas magias de área — ver §6.3.
  aura_divina:      { alvo: 'inimigo', alvos: 'escolha', icone: '🕊️',
                      so_racas: ['Demônio', 'Morto'], parcial: 'area',
                      efeitos: [{ tipo: 'mod_ataque', unidade: 'coluna', sinal: -1 }] },
  curas_espirituais:{ alvo: 'aliado',  alvos: 1, icone: '💚',
                      inverte_em: ['Morto'],
                      efeitos: [{ tipo: 'cura_pool', unidade: 'eh', pool: 'eh' }] },
  // …25 entradas
};
```

**O mapa não guarda `evocacao`, `duracao` nem `alcance`.** Os três já estão
corretos no banco, e é lá que o editor de admin os edita.

### 5.2 O parser: `efeitosNoNivel(magia, nivel)`

Generaliza `danoMagiaNoNivel` e `modVelocidadeNoNivel` num leitor só. Devolve
um objeto por unidade: `{ coluna: 1, eh: 5 }`.

Os cinco níveis do catálogo são muito regulares — sempre
`verbo + N + unidade`:

| Verbo | Unidades |
|---|---|
| `Aumenta`, `Aumente` | `coluna(s) de ataque`, `de energia heroica`, `de energia física`, `de resistência mágica`, `de resistência física`, `de velocidade`, `de defesa` |
| `Reduz`, `Reduza` | as mesmas, mais `de dano` |
| `Restaura` | `de energia heroica`, `de energia física` |
| `Causa`, `Cause` | `de dano` |

**Ancorar no verbo é obrigatório**, não opcional — ver §7.1. É a mesma lição
que `RE_VERBO_MOD` já aprendeu para velocidade.

### 5.3 O acordo entre os dois

Um teste exige que **toda unidade declarada no mapa seja encontrada pelo
parser nos cinco níveis daquela magia**. Se o Mestre editar o catálogo e
quebrar o padrão, o teste acusa antes de a mesa descobrir.

Magia **sem entrada no mapa** continua narrativa — é o comportamento de hoje,
que vira o fallback, não um erro.

---

## 6. Alvo

### 6.1 Distância

Já é regra: `alcanceDaAcao` lê `magias.alcance` e `dentroDoAlcance` filtra os
alvos no tabuleiro. Nada a construir — só a correção de §7.3.

### 6.2 Restrição por raça (decisão 7)

Três magias da Fase 1 restringem o alvo no próprio texto. O dado para aplicar
isso **já está no snapshot**: a criatura carrega `raca: c.tipo`
(`batalha.jsx:1005`), e `criaturas.tipo` tem exatamente os valores necessários
— `Animal` 74, `Morto` 18, `Demônio` 13. Nenhuma mudança de schema.

| Magia | Texto | Regra |
|---|---|---|
| Aura Divina | "repele demônios e mortos-vivos" | `so_racas: ['Demônio','Morto']` — alvo fora disso não fica selecionável |
| Curas Espirituais | "efeito inverso em mortos-vivos" | `inverte_em: ['Morto']` — a cura de EH vira dano na EH |
| Força Mútua | "apenas animais sob Elo Animal ou Convocação Animal" | `so_racas: ['Animal']` — **parcial**, ver abaixo |

**Força Mútua fica pela metade e isso é deliberado.** A raça é verificável; o
"sob Elo Animal" não, porque Elo Animal é narrativa nesta fase (§2.2) e não
grava status nenhum. A Fase 1 aplica a metade verificável e põe a outra no
tooltip e no log, para o Mestre não supor que o vínculo foi conferido. Mesmo
tratamento que a Fase 1 das técnicas deu a Explorar Fraqueza.

Um PJ nunca tem `raca` igual a `Demônio`, `Morto` ou `Animal` — a restrição
simplesmente nunca dispara sobre personagens, que é o resultado correto.

### 6.3 Quantidade de alvos (decisão 4)

`alvos` no registro assume duas formas, e só duas:

- **um número** — teto fixo de alvos. O painel pede exatamente até N e rola um
  dado por alvo. Dardos de Gelo 3, Raio Elétrico 2, Dardos de Luz 2,
  Meteoros 5. É a forma da maioria.
- **`'escolha'`** — sem teto: o Mestre seleciona quantos alvos válidos quiser
  dentro do alcance. Usada **apenas** nas magias marcadas `parcial: 'area'`,
  onde o teto verdadeiro seria o raio que o catálogo não tem.

**Magia de área fica parcial.** Bola de Fogo ("pode explodir e acertar quem
estiver próximo — à critério do Mestre do Jogo"), Meteoros e Aura Divina são
área por natureza, e o catálogo não tem raio. A Fase 1 aplica nos alvos que o
Mestre escolher e marca `parcial: 'area'`, que o log registra — o Mestre fica
sabendo que a seleção foi dele, não da regra. A própria Bola de Fogo já delega
ao Mestre no texto, então isto não inventa arbitragem nova.

Meteoros tem as duas coisas: teto de 5 fragmentos **e** área. Vale o teto —
`alvos: 5` com `parcial: 'area'`, porque o número de fragmentos está no texto
e o raio não.

**O raio vem depois, e o código já nasce esperando por ele.** O usuário
informou em 11/09/2026 que vai acrescentar raio de efeito a Bola de Fogo e
Meteoros. Para que isso seja preenchimento de banco e não mudança de código, a
seleção de alvos de uma magia `parcial: 'area'` lê um campo `raio` da magia:

- **`raio` preenchido** → os alvos são todos os participantes dentro de `raio`
  da célula escolhida, automaticamente, e o `parcial: 'area'` deixa de ser
  anotado no log daquela magia.
- **`raio` ausente ou 0** (estado de hoje) → seleção manual pelo Mestre, com
  `parcial: 'area'` no log.

O campo não existe ainda em `magias`; a leitura é tolerante a `undefined`, e um
teste cobre os dois ramos com um objeto de magia montado à mão. Nenhuma
migração entra nesta fase — quando a coluna chegar, o ramo automático liga
sozinho.

---

## 7. Três defeitos encontrados no caminho

Independentes desta feature, corrigidos aqui porque a Fase 1 passa a depender
das mesmas funções.

### 7.1 Bug vivo: proteção lida como ataque

`danoMagiaNoNivel` (`batalha.jsx:516`) casa `/(\d+)\s*de\s*dano/i` **sem olhar
o verbo**. Oito magias do catálogo dizem "Reduz N de dano" e são lidas como N
de dano *causado*.

Três delas os PJs têm. Hoje, **Aeroproteção, Piroproteção e Armadura Elemental
aparecem na aba Magia como magias ofensivas** — uma proteção de 16 vira um
ataque de 16, porque `magiasOfensivasDoAtor` só filtra por `dano > 0`.

É exatamente o erro de classe que `modVelocidadeNoNivel` já corrigiu ancorando
no verbo (`RE_VERBO_MOD`, `batalha.jsx:547`); aqui a âncora nunca foi posta.
Corrigido com teste de regressão nas oito.

### 7.2 Dado corrompido: Curas Físicas nível 9

`"Restaura 20 de energia física e e restaura 50 de saúde"` — "e" duplicado, e
**"saúde" é uma unidade que não existe em lugar nenhum do motor** (os pools
são EH → AR → EF). Corrigido por UPDATE, script versionado em `scripts/sql/`,
no mesmo molde de `magias-velocidade-fix.sql`.

### 7.3 `Pessoal` tratado como `Toque`

`parseAlcance` (`tabuleiro.jsx`) devolve 1 para os dois:
`if (/toque|pessoal|corpo/.test(s)) return 1`. A aba Apoio já trata `pessoal` à
parte (`batalha.jsx:663`), mas o tabuleiro não — então uma magia Pessoal aceita
alvo adjacente. São 62 magias com alcance Pessoal. `Pessoal` passa a ser 0
(só em si mesmo).

---

## 8. As primitivas

Reusadas sem tocar: `mod_ataque`, `mod_defesa`, `mod_vb`, `mod_rf`, `mod_rm`,
`mod_eh_temp` e a cascata de dano. Quatro novas:

| Primitiva | Onde morde | Nota |
|---|---|---|
| `elemento` | rótulo no objeto da magia ofensiva | Lido do texto (`"dano elemental de fogo"` → `fogo`; `"dano base"` → `null`). Não é efeito: é o que a redução precisa para casar |
| `reducao_dano` | **antes** de `aplicarDanoCascata` | `{ elemento, valor }`; `elemento: null` casa qualquer dano elemental (Armadura Elemental). Piso 0 — não vira cura |
| `cura_pool` | aplicação direta | `{ pool: 'eh' ou 'ef', valor }`, teto no `_max` correspondente. **Distinta de `mod_eh_temp`**: cura preenche o pool, `mod_eh_temp` levanta o teto |
| `dreno_eh` | depois do dano | Toque Gélido: 25% do dano que chegou na EF vira EH no conjurador, **podendo ultrapassar o máximo** — o texto da magia é explícito quanto a isso |

`reducao_dano` entra **antes** da cascata, reduzindo o número de entrada, e
não altera `aplicarDanoCascata`. É deliberado: é a área do projeto com mais
correções (`bc1fa6a`…`c0eb189`), e `motor-batalha.test.js` congela as regras
dela.

---

## 9. Aplicação

Função pura nova em `MotorBatalha`, no molde de `aplicarEfeitoTecnica` e
`aplicarEfeitoApoio`:

```js
aplicarEfeitoMagia(participante, magia, nivel, registro) → participante
```

Dona única da regra de não-acumular (decisão 8): havendo `status_temp` com
`id === 'mag_' + key`, **substitui** renovando `rodadas_rest` em vez de dar
push num segundo.

Chamada pelos dois call sites — Mestre (`aplicarAcao`) e Jogador
(`handleAcao`) — pelo motivo registrado no spec das técnicas §6: a duplicação
fica no call site, nunca na regra.

---

## 10. UI

- **Aba Magia** aceita N alvos quando `alvos > 1`, um dado por alvo.
- **Aba Apoio** deixa de ser "só velocidade": `magiasDeApoioDoAtor` troca o
  critério `mod_vb !== 0` por "tem entrada no registro e `alvo !== 'inimigo'`".
- **Evocação:** ao escolher uma magia de N rodadas, o painel diz quantas
  rodadas e o que quebra. Durante a evocação, o card mostra o estado e as
  rodadas restantes, e as demais ações ficam desabilitadas com o motivo.
- **Ritual** em batalha: opção desabilitada, motivo no tooltip.
- **Restrição de alvo:** alvo inválido não fica selecionável, com o motivo no
  tooltip — mesmo padrão de `tecnicaPermitida`.
- **Log** ganha `magia_efeito_aplicado` (com os deltas), `magia_evocacao_iniciada`
  e `magia_evocacao_quebrada` (com o motivo), para o Mestre auditar.

---

## 11. Testes

TDD. Três arquivos novos, dois existentes editados.

**`src/01-core/magias-efeito.test.js`** — o registro contra o banco:

- as 25 entradas têm `alvo`, `alvos` e ao menos um efeito;
- toda `key` do mapa existe em `magias`;
- **toda unidade declarada é encontrada pelo parser nos 5 níveis** (§5.3);
- **regressão do verbo:** "Reduz 16 de dano" não é dano causado (§7.1), nas
  oito magias afetadas;
- `so_racas` e `inverte_em` só citam valores que existem em `criaturas.tipo`.

**`src/12-batalha/magia-evocacao.test.js`** — o ciclo canalizado:

- decremento por virada e resolução no zero;
- cada uma das oito formas de quebrar de §4.2 — atacar, lançar outra magia,
  usar item, andar, dano que chega na EF, desmaiar, morrer, desistir — e as
  duas que **não** quebram (passar a vez; dano contido por EH ou AR);
- karma debitado na largada e não devolvido na quebra;
- Instantânea não cria estado; Ritual bloqueado em batalha;
- alvo que morre no meio é descartado; zero alvos válidos resolve sem efeito.

**`src/12-batalha/magia-efeitos.test.js`** — as primitivas:

- cada primitiva nova de §8;
- multi-alvo com um dado por alvo;
- `cura_pool` respeita o `_max`; `dreno_eh` ultrapassa;
- `reducao_dano` casa por elemento, e `elemento: null` casa qualquer um;
- reaplicar renova `rodadas_rest` sem criar segundo status;
- restrição de raça bloqueia o alvo; `inverte_em` inverte em Morto.

**`src/12-batalha/dano-cascata-modificadores.test.js`** *(existe)* — ganha os
casos de `reducao_dano`.

**`src/12-batalha/velocidade-magia.test.js`** *(existe)* — Velocidade migra do
caminho especial para o registro; as expectativas atuais têm que continuar
valendo.

**`motor-batalha.test.js` é intocável.** Congela as regras de cascata
confirmadas em 06/07/2026. Se uma expectativa dele mudar, é regressão — parar
e reportar.

---

## 12. Riscos

| Risco | Mitigação |
|---|---|
| `reducao_dano` toca a cascata de dano — a área com mais correções do projeto | Entra **antes** da cascata, reduzindo o número de entrada; `aplicarDanoCascata` não muda de assinatura |
| Corrigir §7.1 tira 3 magias da aba Magia de PJs que podem tê-las usado assim | É correção de bug, não mudança de regra, mas vale avisar a mesa — o log registra |
| O estado `evocando` divergir entre a tela do Mestre e a do Jogador | Regra em função pura de `MotorBatalha`, chamada pelos dois; teste cobre a função, não o componente |
| Parser e catálogo divergirem depois de um UPDATE no admin | Teste de §5.3 exige achar cada unidade declarada nos 5 níveis |
| Evocação longa travar o jogador sem ele entender | O painel diz na largada quantas rodadas e o que quebra; o card mostra o contador |
| Magia sem entrada no mapa quebrar a aba | Fallback é o comportamento narrativo de hoje, não erro |

---

# Revisões — o que a execução mudou

Este documento é o registro da decisão tomada em **11/09/2026**, e o corpo
acima fica como estava: apagá-lo esconderia *por que* cada escolha foi feita.
O que a implementação descobriu vai aqui.

Onde uma seção acima ficou factualmente errada, a linha abaixo diz qual é a
regra que vale. Comentários de código apontam para as seções (`ver spec §6.3`),
então a correção precisa ser encontrável a partir delas.

## R1 — O registro tem 35 entradas, não 25 (revisa §2.2)

| Leva | N | Quando |
|---|---|---|
| Fase 1 — as que os PJs compraram | 25 | 11/09/2026 |
| Fase 2 — controle | 3 | 12/09/2026 |
| Magias de criatura | 7 | 12/09/2026 |

## R2 — A Fase 2 entregou 3 magias, não 9 (revisa §2.4)

Das nove registradas, só **Medo, Sono e Esconjuração** cabiam: as três
impedem o alvo de agir, e `sem_acoes` já existia desde a Falha Crítica — a
fase acrescentou produtores, não mecanismo.

As outras seis precisam de sistemas que o motor de combate não tem, e **não
são trabalho pendente de magia**; são trabalho pendente de outros subsistemas:

| Magia | O que falta |
|---|---|
| Alucinação | dificuldade de HABILIDADE, não stat de combate |
| Invisibilidade | primitiva de seleção de alvo |
| Ordens | narrativa pura — "a ordem pode ter N palavras" |
| Possessão | troca de corpo entre participantes |
| Licantropia Lupina | `mod_atributo`, que atravessa `calcularFicha` |
| Oferenda | meta-magia: modifica a PRÓXIMA magia |

Há teste que falha se alguma delas entrar no mapa sem a primitiva.

## R3 — Criaturas conjuram, e NÃO foi preciso migrar (revisa §2.5)

§2.5 dizia que normalizar `criaturas.magia` era pré-requisito. O levantamento
de 12/09/2026 mostrou que não é:

- 89 menções, 39 nomes distintos, **100% casando** com `magias.nome`;
- `magia_n` preenchido nas 60 criaturas, sempre em 1/3/5/7/9.

`magiasConhecidasDoAtor` resolve por nome em tempo de execução. Sem migração,
sem mudança de schema, e o Mestre segue digitando nomes no editor de catálogo.

**Criatura não paga karma** — a tabela não tem a coluna, e o snapshot as monta
com 0/0. O custo delas é o ponto de ação.

## R4 — Área tem DUAS formas, e Aura Divina é a outra (revisa §6.3)

§6.3 tratou toda área como "projétil esperando a coluna `raio`". São duas:

| Forma | Centro | Raio | Precisa de `raio`? |
|---|---|---|---|
| **Aura** | o conjurador | o próprio `alcance` | **Não** |
| **Projétil** | célula escolhida | `raio` | Sim |

Aura Divina é aura — *"envolve seu corpo… a partir de si"*, 25 m. Estava
marcada `parcial: 'area'` com seleção manual e nunca precisou. Quem espera a
coluna é Bola de Fogo e Meteoros.

## R5 — `Variável` significa duas coisas opostas no catálogo

`duracaoEmRodadas` trata a coluna `duracao = 'Variável'` como concentração.
Mas **21 magias** usam 'Variável' querendo dizer *"a duração está no texto do
nível, e escala com ele"* — Medo vai de 1 a 5 rodadas assim.

`duracaoNoNivel` lê o nível primeiro e cai na coluna depois. As 32 'Variável'
sem texto de duração continuam concentração de verdade — o caso do Sono.

Nenhuma das 25 da Fase 1 tem essa forma, então a leitura delas não mudou.

## R6 — Quatro defeitos vivos, achados no caminho

1. **`danoMagiaNoNivel` sem âncora de verbo** (§7.1) — "Reduz N de dano" era
   lido como dano causado. Aeroproteção, Piroproteção e Armadura Elemental
   apareciam como magias de ataque.
2. **`parseAlcance` tratava `Pessoal` como `Toque`** (§7.3) — 62 magias
   aceitavam alvo adjacente.
3. **Magia que mira inimigo sem causar dano não aparecia em aba nenhuma** —
   `magiasOfensivasDoAtor` exige `dano > 0` e `magiasDeApoioDoAtor` excluía
   `alvo === 'inimigo'`. **Aura Divina ficou inconjurável** desde que entrou
   no registro. O critério passou a ser sobre o EFEITO: quem causa dano vive
   na aba Magia, o resto na Apoio.
4. **Parser sobrescrevia o dano** — "Cause 28 de dano base e, mais 1 de dano
   máximo…" tinha dois números casando com `de dano`, e o segundo vencia:
   Ataque Infernal entregaria 1 em vez de 28. `de dano máximo` virou unidade
   própria, testada antes.

E um de dado: Curas Físicas nível 9 prometia "50 de saúde", unidade que não
existe no motor. Corrigido por script.

## R7 — Regras de combate que o usuário confirmou durante a execução

- **Canalizar prende mesmo.** Meteoros deixa o conjurador 5 rodadas sem agir,
  e a vez dele passa sozinha. `evocacaoPrendeAcao` entra em `temAcaoRestante`
  e `proximoAtivo` — o mesmo caminho do `sem_acoes`. Sem o pulo em
  `proximoAtivo` a vez parava nele e a batalha travava.
- **O bônus de PA por velocidade valia só da rodada 2 em diante.** Vivia só em
  `processarViradaDeRodada`; os snapshots montavam a rodada 1 sem ele. Um
  combatente veloz agia uma vez a menos justamente na abertura. `paDaRodada`
  virou fonte única. Valia para PJ também, não só criatura.
- **A 2ª ação de Guerreiro/Ladino especializado só paga técnica de combate**
  (12/09/2026). Virou pool próprio (`pa_tecnica_rest`): um número só não
  conseguiria dizer que um dos pontos é restrito, e o especializado atacaria
  duas vezes por rodada. Mesmo desenho de `pa_ataque_extra`.
- **A ação extra por velocidade > 30 é livre para todos**, e não entra nessa
  restrição.

## R8 — O que continua fora

| Item | De quem é |
|---|---|
| Coluna `raio` | do usuário — serve só a Bola de Fogo e Meteoros; `alvosDeArea` já a lê |
| As 6 magias de R2 | de outros subsistemas, não da magia |
| ~19 magias de criatura | narrativas ou de outros sistemas (Escuridão, Silêncio, Fascínio, Aura Emocional…) |
| Rótulo da aba "Apoio" | ficou impreciso: abriga controle desde a Fase 2 |
