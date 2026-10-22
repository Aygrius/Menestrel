# Aprendizado de magia por item (livros e pergaminhos) — design

Data: 22/10/2026 · Status: aprovado em conversa

## Pedido do usuário

> "Não teremos mais permissão de aprendizado de uma magia por classe. Ao invés
> disso, o personagem poderá aprender a magia usando o item que a ensina, a
> partir de agora, todas as magias precisam ser aprendidas através do uso do
> item. Não teremos mais o stepper de magia na criação do personagem. Ou seja,
> qualquer profissão pode aprender qualquer magia."

> "Vamos criar o Livro do Mago, Livro do Rastreador, Livro do Bardo. [...]
> Dentro desses livros, estarão vinculadas os itens para aprendizado das magias
> difundida (mas não exclusiva) das profissões. As magias perdidas e magias
> ancestrais são as únicas que terão seus itens próprios. Mas agora não possuem
> mais restrição de classe."

> "Magias básicas custam entre 1 e 2 pontos. Magias perdidas entre 2 e 3
> pontos. Magias ancestrais entre 3 e 4 pontos. Por nível. Magos e Bardos
> possuem pontos-base alto por nível, escalado por intelecto e aura.
> Rastreadores e Sacerdotes pontos-base medianos [...]. Guerreiros e Ladinos
> pontos-base baixo [...]."

Decisões do usuário na conversa (22/10/2026):

1. Toda magia tem **pergaminho**; usar um pergaminho **não o consome** — vale
   também para os pergaminhos de Perdida/Ancestral que já existem.
2. Os pergaminhos de **básicas** ficam **vinculados a livros** no catálogo; o
   livro no inventário é a porta de entrada (abre o livro, aprende dali). Os
   pergaminhos de básica não andam soltos.
3. **Um pergaminho por magia**, valendo todos os níveis — inclusive Perdidas e
   Ancestrais (acaba o "um pergaminho por nível").
4. Cada deus tem seu livro com as magias de Sacerdote; cada especialização
   (Ordem, Colégio, Confraria, Trilha) tem o seu livro. Livros de Trilha são
   criados.
5. Pontos: base Mago/Bardo 8, Rastreador/Sacerdote 5, Guerreiro/Ladino **1**;
   **Aura negativa zera a base**.
6. PJ novo **não ganha livro automaticamente** — Mestre entrega ou jogador
   compra.
7. PJs existentes **preservam** as magias aprendidas; pergaminhos por nível
   em inventários viram o pergaminho único.
8. Vínculo livro→pergaminho numa **tabela própria**.

## Hoje

- `magias.permissao` (CSV de profissões/especializações) decide quem compra o
  quê — `podeAcessarMagia`, `magiaEhAvancada` (`src/01-core/game-data.jsx`) e
  a RPC `usar_pergaminho_magia`.
- Básicas se compram com pontos no stepper da criação/edição
  (`src/08-personagens/personagens.jsx`). Guerreiro e Ladino não têm magia
  (`MAGIAS_POR_PROFISSAO`, `profissaoUsaMagia`).
- Perdidas/Ancestrais (`magiaEhTravada`) só por pergaminho, um por nível
  (`scripts/sql/pergaminhos-por-nivel.sql`), consumido no uso.
- Pontos: `pontosPorEstagio × estágio` (Mago 14, Sacerdote 10, Bardo e
  Rastreador 8). Gasto: `custo × nível efetivo` (1/3/5/7/9). Espelho SQL em
  `_menestrel_pontos_magia_estagio`.
- Livros de deus, Ordens, Colégios e Confrarias existem em `itens` (grupo
  Itens), só para leitura (`doc_url`).
- Custos atuais: Básica 1–3, Perdida 1–4, Ancestral 1–4.

## 1. Dados

Script `scripts/sql/aprendizado-magia-por-item-2026-10-22.sql`, idempotente,
numa transação, com guardas `DO $$` no fim.

### Pergaminhos

- **Um por magia**, de todos os tipos: slug `pergaminho_<key>`, nome
  `Pergaminho <Magia>`, `magia = <nome>`, `nivel_magia = NULL`. Demais
  campos no molde atual (Consumíveis, ocupa 0.1, tipo S, ícone
  `ti-file-star`); origem `Raro` para Perdida/Ancestral, `Comum` para Básica
  (decisão do executor; os de Básica não andam soltos, então a origem só
  aparece no admin).
- Básicas: criados (≈177).
- Perdida/Ancestral: o pergaminho do nível 1 (`pergaminho_<key>_1`) é
  renomeado para o molde novo; os dos níveis 3–9 são apagados **depois** da
  troca nas instâncias (seção 4).

### Livros

- Novos: **Livro do Mago**, **Livro do Bardo**, **Livro do Rastreador**,
  **Livro da Trilha dos Caçadores**, **Livro da Trilha dos Exploradores**,
  **Livro da Trilha dos Guardiões** — mesmo molde dos livros de Ordem.
- Existentes, sem mudança de item: os 12 livros de deus (`livro_do_deus_*`,
  `livro_da_deusa_*`), Ordens, Colégios e Confrarias.

### Tabela `livro_pergaminhos`

```sql
create table public.livro_pergaminhos (
  livro_slug      text not null references public.itens(slug) on update cascade on delete cascade,
  pergaminho_slug text not null references public.itens(slug) on update cascade on delete cascade,
  primary key (livro_slug, pergaminho_slug)
);
```

RLS: `select` para `authenticated`; escrita só admin (mesma regra do admin de
itens). Índice em `pergaminho_slug` para a busca reversa.

Carga inicial, só para magias **Básicas**, a partir de `permissao`:

| `permissao` cita       | Livro(s)                                   |
|------------------------|--------------------------------------------|
| Mago / Bardo / Rastreador | Livro do Mago / do Bardo / do Rastreador |
| Sacerdote              | os 12 livros de deus                        |
| Ordem de X             | Livro da Ordem do X (tabela de-para no script) |
| Colégio X              | Livro do Colégio X                          |
| Confraria de X         | Livro da Confraria X                        |
| Trilha de X            | Livro da Trilha dos X                       |

O de-para especialização→slug fica explícito no script (os nomes não seguem
um padrão derivável: "Ordem de Crizagom" → `livro_do_justiceiro`).

### Custos

Reclassificação por tipo, preservando a ordem relativa (quem era mais cara
continua no topo da faixa):

| Tipo      | Faixa | De-para (custo atual → novo) |
|-----------|-------|------------------------------|
| Básica    | 1–2   | 1 → 1 · ≥2 → 2               |
| Perdida   | 2–3   | ≤2 → 2 · ≥3 → 3              |
| Ancestral | 3–4   | ≤3 → 3 · 4 → 4               |

### `permissao`

Deixa de ser lida pelo código e pela RPC. A coluna fica até a carga ser
conferida; removê-la é limpeza posterior, fora deste trabalho.

### Guardas (falham a transação)

- toda magia tem exatamente um pergaminho `pergaminho_<key>`;
- todo pergaminho de Básica está em ≥1 livro;
- nenhum item com slug `pergaminho_*_<n>` sobrou no catálogo nem em instâncias;
- todo custo está dentro da faixa do tipo.

## 2. Regra de aprendizado

### RPC `aprender_magia(p_pj_id bigint, p_instance_id text, p_magia_key text)`

`SECURITY DEFINER`, mesmo padrão da `usar_pergaminho_magia` (que é
removida). Passos:

1. PJ do próprio usuário (`user_id = auth.uid()`).
2. Instância `p_instance_id` no inventário do PJ (busca também dentro de
   contêineres, como as demais RPCs de inventário).
3. O item é **(a)** o pergaminho da magia (`itens.magia` casa com a magia), ou
   **(b)** um livro com linha em `livro_pergaminhos` para o pergaminho dela.
   Senão: `item_nao_ensina`.
4. Próximo nível = passos atuais + 1 (`ja_no_maximo` se 5; `nivel_sem_texto`
   se a coluna `nivel_N` é nula — mesma regra de "para no primeiro buraco").
5. Teto: nível efetivo ≤ estágio (`acima_do_estagio`).
6. Pontos (`pontos_insuficientes`), fórmula abaixo, gasto `custo × nível
   efetivo` como hoje.
7. Grava `magias[key] = passos + 1`. **Não mexe no inventário.**

Retorno: `{ ok, magia, magia_nome, nivel, passos }` ou `{ ok:false, motivo }`.

### Fórmula de pontos

```
porEstagio = (aura < 0 ? 0 : base) + max(0, intelecto) + max(0, aura)
total      = porEstagio × estágio
base: Mago 8 · Bardo 8 · Rastreador 5 · Sacerdote 5 · Guerreiro 1 · Ladino 1
```

Intelecto e aura = `intelecto_base` / `aura_base` como gravados (raça
incluída). A sub-raça fica de fora: os ajustes de raça/sub-raça vivem só em
`GAME_DATA` (JS), e o espelho SQL não os conhece — usar o valor gravado é o
que mantém JS e RPC idênticos. (Emenda de 22/10/2026, no plano.)

- JS: `pontosMagiasTotal(profissao, estagio, atributos)` em `game-data.jsx`;
  `MAGIAS_POR_PROFISSAO` vira tabela de base com as 6 profissões.
- SQL: `_menestrel_pontos_magia(p_pj record/ids)` substitui
  `_menestrel_pontos_magia_estagio`. As duas implementações têm testes com os
  mesmos casos.

## 3. Telas

Toda tela passa pela skill `impeccable` (identidade medieval, `.menestrel-ui`).

- **Criação/edição de personagem** (`personagens.jsx`): sai o stepper de
  magias e todo o estado ligado a ele.
- **Inventário — livro com vínculo**: ação **Estudar** abre o modal
  *Estudar*: lista as magias do livro (nome, tipo, nível atual → próximo,
  custo em pontos), botão **Aprender nível N** por linha, desativado com o
  motivo na dica (acima do estágio, pontos insuficientes, nível máximo/sem
  texto). Pontos gastos/total visíveis; confirmação no `.ms-footer`.
- **Inventário — pergaminho**: ação **Aprender** abre o mesmo modal com uma
  linha. O pergaminho fica no inventário. `bloqueioPergaminho` é reescrito para
  a regra nova (sem permissão, sem consumo).
- **Ficha**: seção de magias para todas as profissões, com pontos
  gastos/total; lista só as magias aprendidas (sai o filtro por `permissao`).
- **Admin de itens**: livro ganha o campo *Pergaminhos deste livro*
  (multi-seleção de itens `pergaminho_*`), gravando em `livro_pergaminhos`.

Saem do código as regras de **aprendizado** por permissão:
`podeAcessarMagia`, `magiaEhTravada`, `profissaoUsaMagia` e o filtro por
`permissao` na ficha, no criador e no inventário. Ficam, só como
**informação**, as leituras de `permissao` no bestiário (filtro por
profissão, "Exclusividade"), no painel de auditoria (`magias-efeito.jsx`) e
na divisão Básicas/Avançadas da ficha (`magiaEhAvancada`) — elas somem
junto com a coluna, na limpeza posterior. (Emenda de 22/10/2026, no plano.)

## 4. Migração de PJs existentes

- `personagens.magias`: intacto, mesmo que o gasto passe do orçamento novo —
  o PJ só não aprende nada até sobrar ponto.
- Instâncias com slug `pergaminho_<key>_<n>` viram `pergaminho_<key>`; várias
  da mesma magia no mesmo inventário viram **uma** (o item não se consome,
  cópias não têm uso). Varredura em: `personagens.inventario` (incluindo
  conteúdo de contêineres), anúncios/estoque de loja e qualquer outro jsonb
  que guarde instâncias — o levantamento exato é a primeira tarefa do plano.

## 5. Testes

- Fórmula de pontos: três faixas, aura negativa (base 0), intelecto/aura
  negativos contam 0, sub-raça fixa aplicada.
- Modal Estudar: cada motivo de bloqueio; livro sem vínculo não mostra
  Estudar.
- Criação: stepper ausente; PJ criado com `magias = {}`.
- `pergaminho-bloqueio.test.js` atualizado para a regra nova.
- SQL: guardas do script; RPC chamada nos casos ok/acima_do_estagio/
  pontos_insuficientes/item_nao_ensina em transação revertida.

## Fora de escopo

- Remover a coluna `magias.permissao`.
- Kit inicial de livros por profissão (decisão 6).
- Rever preço (`valor_latao`) de livros e pergaminhos na loja.
