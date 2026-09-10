# Editor de catálogo no site (admin master)

**Data:** 2026-09-10
**Escopo:** o administrador passa a criar e editar as cinco tabelas de catálogo
global — `magias`, `itens`, `criaturas`, `habilidades`, `tecnicas` — pela própria
aplicação, sem script SQL. Inclui a correção de permissão que hoje impede
qualquer escrita nessas tabelas pelo app.

---

## 1. Problema

Todo dado de regra do sistema vive em cinco tabelas globais que a aplicação
inteira lê: ficha, inventário, loja, bestiário e batalha. Mudar qualquer uma
delas hoje exige script SQL rodado por fora.

Isso já cobrou preço. Nesta mesma base encontramos, em um único dia:

- `resistencia_extrema.grupo_armas` guardando `'Intermitente'` — valor da coluna
  `uso` que vazou para a coluna de armas em algum import;
- 185 criaturas com `dano_25/50/75` nulos porque o formulário só gravava
  `dano_100`.

Nenhum dos dois seria possível com um campo de opções fechadas na tela.

### 1.1 O que a investigação revelou

**As cinco tabelas têm RLS ligada e só política de SELECT.** RLS ligada sem
política para um comando nega o comando. Consequência: **nenhum usuário da
aplicação consegue escrever nessas tabelas hoje** — nem o administrador.

| Tabela | RLS | Políticas existentes |
|---|---|---|
| `criaturas` | ligada | `criaturas_select_authenticated` (SELECT) |
| `magias` | ligada | `magias_select_authenticated` (SELECT) |
| `tecnicas` | ligada | `tecnicas_select_authenticated` (SELECT) |
| `habilidades` | ligada | `habilidades_select_all` (SELECT) |
| `itens` | ligada | `itens_leitura_publica` (SELECT, inclui `anon`) |

**Corolário: o formulário "Nova Criatura" do Diário está quebrado em produção.**
`NovaCriaturaModal` (`13-diario/diario.jsx`) faz `.from('criaturas').insert()`
direto. Sem política de INSERT, a RLS nega. Ele foi construído contra uma porta
trancada e ninguém percebeu porque o erro só aparece ao salvar.

**Dívida de GRANT.** `anon` tem INSERT/UPDATE/DELETE em `criaturas`, `magias`,
`tecnicas` e `habilidades`. Inofensivo enquanto a RLS nega, mas é a única linha
de defesa se alguém desligar RLS numa dessas tabelas um dia.

### 1.2 O que já existe e serve

| Peça | Onde | Serve para |
|---|---|---|
| `eh_admin()` | função no banco | `SECURITY DEFINER`, `STABLE`, lê `auth.users` pelo `auth.uid()` e compara com o e-mail do admin. Já usada por `admin_definir_plano` |
| Bestiário | `09-bestiario/bestiario.jsx` | JÁ lista `criaturas`, `magias`, `habilidades` e `tecnicas`, com ordenação e filtro |
| `NovaCriaturaModal` | `13-diario/diario.jsx` | As fórmulas derivadas de criatura (EF, EH, absorção, defesa, velocidade, L/M/P, dano) |
| `ModalShell`, `SelectPill` | componentes do app | Molde visual do editor |
| `GRUPOS_ARMAS` | `01-core/game-data.jsx` | Catálogo fixo dos 11 grupos de arma |

`09-bestiario/itens-campanha.jsx` **não** é precedente: ele edita
`itens_historia`, tabela por história, não o catálogo global `itens`.

---

## 2. Decisões

Tomadas com o usuário em 10/09/2026:

1. **Criar e editar, sem excluir.** Magias e técnicas são referenciadas por
   `key` dentro do JSON dos personagens, sem foreign key para proteger. Apagar
   uma magia deixa fichas apontando para o vazio. O DELETE fica negado por
   ausência de política — a forma mais forte de "não" no Postgres.
2. **Descritor por tabela.** Um editor genérico lê um descritor declarativo por
   tabela, em vez de cinco formulários escritos à mão para 115 colunas.
3. **Mora no Bestiário**, que já é o navegador de catálogo. O "Nova Criatura" do
   Diário é aposentado, com suas fórmulas migradas para o descritor.
4. **Admin é `richardnanet@gmail.com`**, confirmado pelo usuário e já embutido em
   `eh_admin()`. Com um administrador só, embutir o e-mail na função é mais
   simples que uma tabela de papéis, e trocar exige migração — o que é proteção,
   não estorvo.

---

## 3. Segurança

A trava real é a RLS. A interface é conveniência.

### 3.1 Políticas

Duas por tabela, nas cinco:

```sql
create policy tecnicas_admin_insert on public.tecnicas
  for insert to authenticated
  with check (public.eh_admin());

create policy tecnicas_admin_update on public.tecnicas
  for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());
```

`using` **e** `with check` no UPDATE: sem o `with check`, o admin poderia
alterar uma linha para um estado que ele mesmo não teria direito de criar. Aqui
as duas expressões são iguais, mas a assimetria é a armadilha clássica de RLS e
fica explícita.

Nenhuma política de DELETE, deliberadamente.

### 3.2 Limpeza de GRANT

```sql
revoke insert, update, delete on public.criaturas, public.magias,
  public.tecnicas, public.habilidades from anon;
```

`authenticated` mantém os GRANTs — é a RLS que decide, e é ela que queremos como
porta única.

### 3.3 Gate de interface

O Bestiário chama `eh_admin()` por RPC uma vez ao montar e guarda o booleano.
Ele decide **apenas** se os controles de edição aparecem. Um usuário comum que
forje a chamada recebe erro do banco.

Chamar a RPC em vez de comparar o e-mail no cliente é deliberado: a regra fica
com uma dona só. Comparar no front duplicaria a definição de admin em dois
lugares que podem divergir.

---

## 4. O descritor

Arquivo novo: `src/09-bestiario/catalogo-descritores.jsx`.

```js
const CATALOGO_DESCRITORES = {
  tecnicas: {
    tabela: 'tecnicas',
    rotulo: { pt: 'Técnicas', en: 'Techniques' },
    chave: 'key',
    campos: [
      { col: 'key',   tipo: 'texto',  rotulo: 'Chave', obrigatorio: true, somenteNovo: true },
      { col: 'nome',  tipo: 'texto',  rotulo: 'Nome',  obrigatorio: true },
      { col: 'custo', tipo: 'numero', rotulo: 'Custo', obrigatorio: true, min: 1, max: 2 },
      { col: 'uso',   tipo: 'opcoes', rotulo: 'Uso',
        opcoes: ['Único', 'Intermitente', 'Livre'] },
      { col: 'grupo_armas',     tipo: 'grupos', rotulo: 'Armas',     catalogo: 'GRUPOS_ARMAS' },
      { col: 'grupo_armaduras', tipo: 'grupos', rotulo: 'Armaduras', catalogo: 'GRUPOS_ARMADURAS' },
      { col: 'ajuste',    tipo: 'opcoes', rotulo: 'Ajuste', opcoes: ATRIBUTOS_KEYS },
      { col: 'permissao', tipo: 'texto',  rotulo: 'Permissão' },
      { col: 'descricao', tipo: 'area',   rotulo: 'Descrição', linhas: 3 },
      { col: 'efeito',    tipo: 'area',   rotulo: 'Efeito',    linhas: 3 },
    ],
  },
  // …4 outras
};
```

### 4.1 Tipos de campo

| Tipo | Widget | Onde é usado |
|---|---|---|
| `texto` | input de linha | nome, key, permissao |
| `area` | textarea | descricao, efeito |
| `numero` | stepper, com `min`/`max` | custo, estágio, atributos |
| `opcoes` | `SelectPill` de lista fechada | uso, grupo de habilidade, ajuste |
| `grupos` | multisseleção CSV, de um catálogo | grupo_armas, grupo_armaduras |
| `derivado` | campo travado, valor calculado | EF, EH, dano de criatura |

`opcoes` e `grupos` são o coração do valor: eles fecham a porta pela qual entrou
o `grupo_armas = 'Intermitente'`. Aquele valor pertence à lista de `uso`, e um
campo de armas com lista fechada nunca o ofereceria.

### 4.2 Valores fechados, medidos nos dados atuais

| Coluna | Valores |
|---|---|
| `tecnicas.uso` | Único, Intermitente, Livre |
| `habilidades.grupo` | Conhecimento, Geral, Influência, Manobra, Profissional, Subterfúgio |
| `habilidades.ajuste`, `tecnicas.ajuste` | os 7 atributos (`ATRIBUTOS_KEYS`) |
| `itens.grupo` | Animais, Armaduras, Armas, Consumíveis, Diario, Instrumentos, Itens, Minerais, Moedas, Propriedades, Recipientes, Serviços, Transportes, Vestimentas |
| `grupo_armas`, `grupo_armaduras` | `'Livre'` + os grupos de `GRUPOS_ARMAS` |

### 4.3 Obrigatoriedade

O descritor marca `obrigatorio: true` onde o banco tem `NOT NULL` sem default:

| Tabela | Obrigatórios |
|---|---|
| `habilidades` | key, nome, grupo, ajuste, custo |
| `tecnicas` | key, nome, custo |
| `magias` | key, nome |
| `criaturas` | nome |
| `itens` | slug, nome |

`somenteNovo: true` na coluna-chave: `key` é editável ao criar e travada ao
editar. Renomear uma `key` quebraria toda ficha que a referencia.

A coluna-chave difere por tabela e o descritor precisa declará-la:
`magias`, `tecnicas` e `habilidades` usam `key`; `itens` usa `slug`; `criaturas`
usa o `id` gerado pelo banco e portanto **não tem** campo `somenteNovo` — ela é
identificada por `nome`, que é editável.

`itens.dano_l/m/p` são `NOT NULL` mas têm default, então entram como campos
normais, não obrigatórios: omitir cai no default do banco.

---

## 5. A tela

O Bestiário ganha uma **quinta aba, `itens`** — hoje ele cobre só quatro das
cinco. Listagem, filtro e ordenação das quatro existentes não mudam.

Quando `eh_admin()` for verdadeiro:

- um lápis por linha, que abre o editor com a linha carregada;
- um botão "Novo" no cabeçalho da aba, que abre o editor vazio.

O editor é um `ModalShell` montado a partir do descritor. Salvar faz `insert` ou
`update` conforme a origem, e recarrega a lista da aba.

Erro do banco (violação de NOT NULL, chave duplicada, RLS) aparece no rodapé do
modal, com o texto do Postgres. Não traduzimos: o admin é o dono do sistema e a
mensagem crua ajuda mais que uma genérica.

---

## 6. Campos calculados de criatura

As fórmulas do `NovaCriaturaModal` são a parte valiosa dele e migram para o
descritor de `criaturas` como campos `derivado`:

```
EF         = ceil(2·√peso + físico)
EH         = (base_do_coletivo + aura) · estágio
Absorção   = físico > 0 ? físico · 5 : 0
Defesa     = absorção > 0 ? agilidade + 8 : agilidade
Velocidade = (agilidade + estágio) · percepção
L/M/P      = dano_l/m/p da arma + agilidade
Dano       = ceil(dano da arma + √peso)
tiers      = ceil(dano_100 · n/4)
```

Elas ficam num módulo próprio para serem testáveis sem renderizar nada, e o
`NovaCriaturaModal` é removido do Diário no mesmo passo — deixá-lo vivo criaria
dois caminhos para criar criatura, que divergiriam. É exatamente o padrão das
duas cópias de `aplicarTeste` que deu trabalho na feature das técnicas.

> **Nota de fidelidade.** As criaturas de tipo Dragão do banco não seguem a
> fórmula de absorção nem a de velocidade: as duas são fixadas por classe. O
> campo derivado precisa ser sobrescrevível, ou essas linhas ficam ineditáveis
> sem alterar seus valores. Decisão: `derivado` calcula e preenche, mas aceita
> edição manual, marcando visualmente que o valor foi sobrescrito.

---

## 7. Testes

**`src/09-bestiario/catalogo-descritores.test.js`** — o descritor contra o
schema real, com fixture das colunas:

- toda `col` declarada existe na tabela correspondente;
- toda coluna `NOT NULL` sem default tem campo com `obrigatorio: true`;
- todo campo `opcoes` tem lista não vazia;
- a coluna-chave de cada tabela é `somenteNovo`.

É o teste que impede o descritor de apodrecer quando uma coluna nova aparecer no
banco.

**`src/09-bestiario/catalogo-editor.test.jsx`** — o editor renderizado:

- monta os campos na ordem do descritor;
- campo `opcoes` oferece só os valores da lista;
- obrigatório vazio bloqueia o salvar;
- `somenteNovo` fica travado no modo edição e livre no modo criação;
- campo `derivado` recalcula ao mudar a entrada, e aceita sobrescrita.

**`src/09-bestiario/criatura-formulas.test.js`** — as fórmulas migradas, contra
os valores reais do banco. Os 8 dragões adultos são a fixture: EF e EH batem em
todos os 8 pela fórmula, e absorção e velocidade não — o que trava a nota de
fidelidade da §6.

**Permissão** não é testável pelo Vitest (a RLS vive no banco). O script SQL
traz consultas de verificação, no mesmo padrão dos outros em `scripts/sql/`.

---

## 8. Fora de escopo, declarado

- **Exclusão** e **coluna `ativo`** para aposentar entrada. Sem delete, uma
  entrada criada por engano fica no catálogo. Aposentar sem apagar exige regra de
  leitura em todo consumidor de catálogo — é outra conversa.
- **Histórico de edição.** Acrescentamos só `atualizado_em` nas cinco, por ser
  barato e permitir auditar depois.
- **Mais de um administrador.** `eh_admin()` continua com um e-mail embutido.
- **`itens_historia`** (itens por história) segue com seu editor próprio.

---

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Abrir escrita numa tabela que a aplicação inteira lê | RLS gated em `eh_admin()`, sem DELETE, e `revoke` dos GRANTs de `anon` |
| Descritor divergir do schema | Teste que compara `col` contra as colunas reais |
| Campo derivado impedir edição das criaturas que fogem à fórmula | `derivado` é sobrescrevível, com marca visual — ver §6 |
| Aposentar o `NovaCriaturaModal` perder as fórmulas | Elas migram primeiro, com teste contra os 8 dragões, e só depois ele sai |
| `key` renomeada quebrar fichas | `somenteNovo` trava a coluna-chave no modo edição |
