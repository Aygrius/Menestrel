# Técnicas de combate — Fase 2: a resolução do golpe

**Data:** 2026-09-10
**Escopo:** as 26 técnicas que reescrevem a resolução do golpe passam a produzir
efeito mecânico. Completa a `Explorar Fraqueza`, que ficou pela metade na Fase 1.
Três das 29 previstas ficam narrativas por falta de modelo de dados.

**Depende de:** `docs/superpowers/specs/2026-09-09-tecnicas-efeitos-combate-design.md`
(Fase 1). Esta spec assume o registro, o `status_temp`, a ativação pela aba
Técnica e o gate de equipamento já construídos lá.

---

## 1. Problema

A Fase 1 entregou 24 das 58 técnicas — as cujo efeito é *um número somado a um
stat por N rodadas*. Elas reusaram o `status_temp` quase inteiro.

As 29 restantes com efeito mecânico exigem algo que a Fase 1 evitou de
propósito: **mudar como o golpe é resolvido**. Ignorar a energia heroica do
alvo, multiplicar o dano, atacar duas vezes, anular um golpe recebido. É a área
que levou quatro correções (`bc1fa6a`, `912730c`, `c0eb189`, `454c991`) antes
de a Fase 1 começar, e onde a própria Fase 1 quase introduziu outra.

Hoje essas 29 rolam o dado, gastam PA, e o Mestre resolve na mesa. Desde a
correção de 10/09/2026 a mensagem diz "efeito narrativo, resolva na mesa" — o
jogador ao menos sabe que o sistema não está aplicando nada.

---

## 2. Escopo: 26, e as 3 que ficam de fora

### 2.1 Bloqueadas por falta de modelo de dados

Investigação no banco em 10/09/2026:

| Técnica | Precisa de | Existe? |
|---|---|---|
| Estilhaçar ("2 de dano em 1 equipamento") | durabilidade de item | **Não.** Zero colunas com `durab`/`integridade`/`desgaste` em todo o schema |
| Retalhar ("3 de dano em 1 equipamento") | idem | **Não** |
| Combate Montado ("50% da EH da sua montaria") | montaria como entidade de combate | **Não.** Zero colunas ou tabelas de montaria. Há 68 itens no grupo `Animais`, mas nada os liga a um PJ como combatente com EH própria |

**Decisão:** as três continuam narrativas. Durabilidade de equipamento e montaria
são features próprias — cada uma mexe em inventário, ficha e loja, não só em
batalha. Emendá-las aqui dobraria a fase e misturaria assuntos.

### 2.2 As 26

| Primitiva | N | Técnicas (dificuldade, rodadas) |
|---|---|---|
| `ignora_eh` | 6 | Ataque Oportuno (Médio, 1), Atravessar Oponente (Médio, 1), Carga (Difícil, 1), Carga de Arremesso (Médio, 1), Carga Montada (Médio, 2), Golpe Letal (MD, 1) |
| `dano_pct` | 5 | Ambidestria (+25%, Médio, 1), Aprimorar (+25%, MD, 3), Dano Agravado (+25%, MD, 1), Força Interior (+25%, Médio, 2), Brutalizar (+50%, Difícil, 1) |
| `dano_recebido_pct` | 3 | Aparar (−75%, MD, 1), Desviar (−50%, MD, 3), Combate com Escudo (−25%, Médio, 2) |
| `ataque_extra` | 3 | Contra-Ataque (Difícil, 1), Golpe Duplo (MD, 1), Flechadas Múltiplas (MD, 1) |
| `sem_atacar` | 2 | Inibir Ataque (Difícil, 1), Intimidar (MD, 1) |
| `ignora_armadura` | 1 | Disparo Certeiro (Médio, 3) — **mais a metade pendente de Explorar Fraqueza** |
| `alvos_extras` + `dano_pct` | 1 | Golpe Giratório (+25% em até 3 alvos, Difícil, 1) |
| `sem_tecnicas` | 1 | Leitura de Batalha (Médio, 2) |
| `sem_critico` | 1 | Combate Não Letal (Médio, 2) |
| `derrubado` | 1 | Desequilibrar (MD, 1) |
| `evita_golpe` | 1 | Esquiva (MD, 1) |
| `usa_defesa_de` | 1 | Escolta (Médio, 3) |

**17 das 26 duram exatamente 1 rodada** — o que motiva a decisão 3 abaixo.

---

## 3. Decisões

Tomadas com o usuário em 10/09/2026:

1. **As 3 bloqueadas ficam narrativas.** Ver §2.1.
2. **Mesmo modelo de ativação da Fase 1**: técnica é ação própria, ativada na
   aba Técnica, que grava `status_temp`; os consumidores leem. Nada é pendurado
   no dropdown de técnica do ataque de arma, que segue narrativo. O texto do
   banco sustenta isso: todas dizem "por N rodadas", não "neste golpe".
3. **A ativação livre passa a valer para QUALQUER modo.** A regra da Fase 1 era
   "0 PA para `modo: 'total'`, 1 ativação livre por rodada". Todas as 26 desta
   fase são `modo: 'teste'`, e 17 duram 1 rodada: sob a regra antiga, ativar
   consumiria o turno e o efeito expiraria antes do ataque — as 17 nasceriam
   inúteis, repetindo o que quase aconteceu com Mira. A regra passa a ser
   **uma ativação livre de técnica por rodada, de qualquer modo**. Continua uma,
   então não vira empilhamento, e reusa a flag `tecnica_livre_usada`.
4. **"causa X% de dano" é bônus no dano dos SEUS ataques**, não dano imediato
   nem dano por rodada. Ativou Dano Agravado, seus golpes causam +25% enquanto
   durar.
5. **`derrubado` é condição no ALVO**: enquanto durar, o golpe de **qualquer
   um** contra ele ignora a EH. Não é perder a vez — o sistema não tem conceito
   de "caído" além do desmaio, e esta é a leitura do usuário.
6. **`ignora_eh` é ancorado no ATACANTE**, por alvo: Golpe Letal deixa *você*
   furar a EH daquele alvo por 1 rodada; os demais combatentes continuam
   batendo na EH dele. É o que separa um golpe especial de uma condição.

---

## 4. As primitivas

Onze das doze cabem no `status_temp` como ele é hoje. A décima segunda exige um
ciclo de vida novo (§5).

### 4.1 Onde cada uma morde

| Primitiva | Ancorada em | Consumidor |
|---|---|---|
| `ignora_eh` | atacante, com `alvo_inst_id` | `aplicarDanoCascata` pula a EH |
| `derrubado` | alvo | idem, para qualquer atacante |
| `ignora_armadura` | atacante, com `alvo_inst_id` | `aplicarDanoCascata` pula a AR |
| `dano_pct` | atacante | multiplica o dano final |
| `dano_recebido_pct` | alvo | reduz o dano antes da cascata |
| `ataque_extra` | próprio | `+1` em `pa_rest`, utilizável só para atacar |
| `alvos_extras` | próprio | painel de ação permite escolher até N alvos |
| `sem_atacar` | alvo | aba Arma desabilitada no turno dele |
| `sem_tecnicas` | alvo | aba Técnica desabilitada no turno dele |
| `sem_critico` | próprio | resultado Absurdo não vira crítico |
| `evita_golpe` | próprio | anula o próximo golpe recebido (§5) |
| `usa_defesa_de` | alvo, com `fonte_inst_id` | `colunaAtaque` lê a defesa da fonte |

### 4.2 A cascata de dano

`aplicarDanoCascata(dano, p, critico)` já pula a EH quando `critico` é
verdadeiro — a mecânica de "furar a EH" **já existe**, só não tem outro
produtor. Esta fase acrescenta produtores, não mecanismo.

A assinatura passa a receber um objeto de modificadores em vez de mais
booleanos posicionais:

```js
aplicarDanoCascata(dano, p, { critico, ignoraEh, ignoraArmadura })
```

Chamadores existentes passam `{ critico }` e se comportam como hoje. **A função
continua pura**, e os testes de cascata que já existem
(`motor-batalha.test.js`) não mudam de expectativa — se mudarem, é regressão.

### 4.3 Ordem de aplicação do dano

Definida explicitamente porque a ordem muda o número:

```
1. dano base            danoNoTier(arma, codigo)
2. + dano_pct           do atacante
3. − mod_dano_max       do alvo (Posicionamento, Fase 1)
4. − dano_recebido_pct  do alvo
5. cascata              EH → AR → EF, pulando o que ignora_* mandar
```

Percentuais somam antes de multiplicar: Ambidestria +25% e Brutalizar +50%
ativas dão +75%, não +87,5%. Piso 0 em cada subtração — reduzir dano nunca vira
cura, mesma regra do `mod_dano_max` da Fase 1.

---

## 5. O mecanismo novo: status consumido por evento

**Esquiva** ("evita o golpe de 1 alvo por 1 rodada") é a única que não expira
por tempo. Ela é gasta pelo **próximo golpe recebido** — ou pelo fim da
duração, o que vier primeiro.

O `status_temp` de hoje só sabe decrementar `rodadas_rest`. Acrescentamos um
campo opcional:

```js
{ id: 'tec_esquiva', nome: 'Esquiva', icone: '🌀', rodadas_rest: 1,
  consome_em: 'golpe_recebido',
  efeito: { tipo: 'evita_golpe' } }
```

Quem aplica dano verifica `consome_em: 'golpe_recebido'` antes da cascata: se
houver, o golpe é anulado (dano 0) e o status é removido. A expiração por tempo
continua funcionando normalmente para o caso de ninguém atacar.

É aditivo: status sem `consome_em` se comporta exatamente como hoje.

---

## 6. `ataque_extra`

"Permite atacar 1 alvo 2 vezes por 1 rodada" vira **+1 ponto de ação utilizável
apenas para atacar**, naquela rodada.

Um campo `pa_ataque_extra` no participante, zerado na virada junto de
`moveu_na_rodada` e `tecnica_livre_usada`. O painel de ação o consome antes do
`pa_rest` quando a aba é Arma, e o ignora nas demais abas.

Alternativa descartada: dobrar o dano de um golpe só. O texto diz "atacar 2
vezes", e dois golpes rolam dois dados — o que muda a distribuição de crítico e
de falha, e é isso que a técnica compra.

---

## 7. Testes

**`src/12-batalha/dano-cascata-modificadores.test.js`** — a assinatura nova:

- `{ critico }` sozinho se comporta exatamente como hoje (trava a regressão);
- `ignoraEh` pula a EH e começa na AR;
- `ignoraArmadura` pula a AR;
- os dois juntos vão direto na EF;
- o piso `EF_MORTE` e a `sobra` continuam iguais.

**`src/12-batalha/dano-ordem.test.js`** — a ordem de §4.3, com um caso que
distingue somar-antes de multiplicar-em-cadeia (+25% e +50% = +75%).

**`src/12-batalha/tecnica-fase2.test.js`** — as 26 entradas do registro e a
aplicação de cada primitiva, no molde de `tecnica-efeitos.test.js`.

**`src/12-batalha/evita-golpe.test.js`** — o ciclo novo: consome no primeiro
golpe, some depois, expira por tempo se ninguém atacar, e não interfere em
status sem `consome_em`.

**Regressão obrigatória:** `motor-batalha.test.js` inteiro tem que passar sem
mudar uma expectativa. Ele congela as regras de cascata confirmadas em
06/07/2026. Qualquer alteração ali é sinal de que a Fase 2 mudou o que não
devia.

---

## 8. Fora de escopo, declarado

- Durabilidade de equipamento e montaria (§2.1), e com elas Estilhaçar,
  Retalhar e Combate Montado.
- **Concentração, Luta às Cegas, Provocar e Conduzir Oponente** seguem
  narrativas em qualquer fase — as três primeiras não têm efeito mecânico
  descritível, e a quarta é de tabuleiro (mede metros).
- **Remover Debilitação** (bônus na habilidade Escapar) não é stat de rodada.
- Reação: nenhuma técnica interrompe o turno alheio. Todas são ativadas no
  próprio turno e duram. `evita_golpe` é o mais perto disso, e ainda assim é
  ativado antes, não em resposta.

Com esta fase, **50 das 58 técnicas** têm efeito mecânico. As 8 restantes são
as 3 bloqueadas por dados e as 5 narrativas por natureza.

---

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Regressão na cascata de dano — 4 correções recentes na área | Assinatura nova com default idêntico ao atual; `motor-batalha.test.js` intocado como prova |
| Ordem de aplicação errada muda o número em silêncio | Ordem fixada em §4.3 e travada por teste que distingue as ordens |
| `evita_golpe` vazar para outros status | `consome_em` é opcional; teste garante que status sem ele não muda |
| `ataque_extra` virar PA genérico | Campo separado de `pa_rest`, consumido só na aba Arma, com teste |
| 17 técnicas de 1 rodada inúteis por custo de PA | Decisão 3: ativação livre para qualquer modo |
| `ignora_eh` do atacante confundido com `derrubado` do alvo | Primitivas separadas, ancoragens diferentes, teste para cada |
