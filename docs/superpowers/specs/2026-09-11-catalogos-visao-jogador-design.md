# Catálogos na visão do Jogador — design

**Data:** 11/09/2026
**Pedido do usuário:** "Na visão do jogador, eu quero que apareça os menus itens, criaturas, magias, etc que ficam no menu esquerdo, mas apenas com as informações que ele conhece ou possui."

---

## 1. Decisões tomadas com o usuário (11/09/2026)

| Pergunta | Decisão |
|---|---|
| O que torna uma **criatura** conhecida? | **Liberada pelo Mestre** — marcação explícita, tabela nova. Não é derivada de batalha. |
| Quanta informação o jogador vê? | **Tudo que o Mestre vê**, menos o botão de editar. |
| Magias: a magia inteira ou só os níveis comprados? | **Só os níveis comprados.** |

A terceira decisão é a que tem consequência mecânica: ela liga esta tela à
regra de compra de níveis implementada no mesmo dia (`passosDisponiveisMagia`,
`01-core/game-data.jsx`). Um nível que o jogador não comprou não aparece,
pelo mesmo motivo que um nível que o admin apagou não aparece.

---

## 2. De onde sai "conhece ou possui"

Levantamento do banco em 11/09/2026: **tudo que o jogador conhece nos quatro
primeiros catálogos já está em `personagens`**, numa coluna `jsonb` por
catálogo, e a tabela tem `user_id`. Não é preciso inventar registro nenhum.

| Catálogo | Fonte | Formato |
|---|---|---|
| Magias | `personagens.magias` | mapa `key → passos comprados` |
| Técnicas | `personagens.tecnicas` | mapa `key → passos` |
| Habilidades | `personagens.habilidades` | mapa `key → nível` |
| Itens | `personagens.inventario` | lista de itens do PJ |
| **Criaturas** | **não existe** | ver §5 |

O conjunto é a UNIÃO sobre TODOS os personagens do usuário. Um jogador com
dois PJs vê o catálogo dos dois. A alternativa — filtrar pelo PJ ativo —
esconderia informação que o jogador legitimamente tem, e obrigaria a tela a
depender de um "PJ selecionado" que o menu lateral não tem.

Consequência aceita: **jogador sem personagem nenhum vê as abas vazias.** A
tela diz isso em texto, em vez de fingir que o catálogo não existe.

---

## 3. O que muda nas listas

As cinco listas (`CriaturasList`, `MagiasList`, `HabilidadesList`,
`TecnicasList`, `ItensList`, em `09-bestiario/bestiario.jsx`) ganham uma prop
`modoJogador`. Quando ligada:

1. a lista carrega o conjunto conhecido e filtra por ele;
2. o botão de editar não aparece — hoje isso já é decidido por `useEhAdmin`,
   e o jogador nunca será admin, então **não há nada a fazer aqui**. A prop
   não deve reimplementar a regra de admin;
3. nada mais muda: mesmas colunas, mesma descrição, mesma paginação. É a
   decisão "tudo que o Mestre vê".

O filtro é aplicado **depois** da busca por nome e dos filtros de tipo que já
existem, sobre a mesma lista `filtered` — assim paginação e contagem já saem
certas sem tocar em `useFitPageSize` nem em `totalPages`.

### Magias: só os níveis comprados

`MagiasList` em modo jogador recebe, junto do conjunto de chaves, o **maior
número de passos** que o usuário tem naquela magia (o máximo entre os PJs
dele). O painel expandido corta a lista de níveis nesse teto, reusando
`NIVEIS_MAGIA` de `01-core/game-data.jsx`.

Isso se compõe com o filtro de nível vazio que já existe na lista: o jogador
vê a interseção entre "nível que existe" e "nível que eu comprei".

---

## 4. Menu lateral

`ADMIN_SECTIONS.player` (`01-core/constants.jsx`) ganha as cinco seções, com
os mesmos ícones do perfil Mestre para que a mesma coisa tenha a mesma cara
nos dois perfis. O switch de `10-shell/shell.jsx` passa `modoJogador` quando
`profile === 'player'`.

`ADMIN_SECTIONS.master` **não muda**. O Mestre continua vendo tudo.

---

## 5. Criaturas — fase separada

Criatura é a única sem fonte de verdade, e a decisão do usuário exige
infraestrutura nova: tabela de liberação, RLS, e uma tela para o Mestre
liberar. Por isso o trabalho se divide:

- **Fase A** — os quatro catálogos derivados de `personagens` + o menu.
  Entrega valor sozinha e não depende de banco novo.
- **Fase B** — criaturas: tabela `criaturas_liberadas`, RLS, UI de liberação
  para o Mestre, e a aba Criaturas no menu do jogador.

Até a Fase B existir, a seção `criaturas` **não** entra no menu do jogador.
Uma aba permanentemente vazia é pior que uma aba ausente.

### Esboço da Fase B (não implementar ainda)

```
criaturas_liberadas (
  id           bigserial primary key,
  criatura_id  bigint not null references criaturas(id) on delete cascade,
  historia_id  bigint not null references historias(id) on delete cascade,
  liberado_por uuid   not null references auth.users(id),
  created_at   timestamptz default now(),
  unique (criatura_id, historia_id)
)
```

Liberação por **história** (mesa), não por jogador: é assim que o Mestre
pensa a informação que revelou à mesa, e evita N linhas por criatura. O
jogador enxerga a criatura se participa de alguma história em que ela foi
liberada. RLS: `select` para quem participa da história; `insert`/`delete`
só para o Mestre dela.

---

## 6. Testes

- `conhecidoDoJogador(personagens)` — função pura sobre as linhas de
  `personagens`, devolvendo `{ magias: Map<key, passos>, tecnicas: Set,
  habilidades: Set, itens: Set }`. Cobre: união entre PJs, o MÁXIMO de passos
  vencendo entre PJs, jsonb nulo/ausente, e lista vazia.
- Filtro das listas: registro conhecido aparece, desconhecido não, busca por
  nome continua funcionando **dentro** do conjunto conhecido.
- Magias: PJ com 2 passos vê os níveis 1 e 3 e não vê o 5, mesmo que a magia
  tenha os cinco preenchidos.
- Menu: `ADMIN_SECTIONS.player` ganha as 4 seções da Fase A e NÃO ganha
  `criaturas`; `ADMIN_SECTIONS.master` fica intacto.
