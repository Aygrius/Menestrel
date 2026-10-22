# Classes de magia e a regra dos milagres — design

Data: 22/10/2026 · Status: aprovado em conversa

## Pedido do usuário

> "Vamos classificar as magias da seguinte forma:
> Feitiço = Magia de origem arcana (magos).
> Milagre = Magia de origem divina (sacerdotes).
> Encanto = Magia de origem artística (bardos).
> Transmutação = Magia de origem espiritual (rastreadores).
> Um personagem vampiro, lobisomem ou sem religião não pode usar ou ser alvo
> de milagres.
> Uma criatura de elemento 'escuridão' não pode usar milagres."

Decisões do usuário na conversa (22/10/2026):

1. **Uma classe por magia** (coluna própria), não várias nem "depende de quem
   conjura".
2. Alcance da regra de vampiro/lobisomem/religião:
   - **Personagem:** sub-raça Vampiro ou Lobisomem, ou sem deus.
   - **Criatura:** subtipo Vampiro ou Lobisomem. Criatura não tem religião
     cadastrada e **não** é barrada por isso.
3. **Escuridão vale para qualquer ator**, inclusive personagem: o elemento do
   personagem vem da profissão, então o **Mago** (Escuridão) não usa milagres.
   Criatura com Escuridão entre os elementos ("Fogo, Escuridão") também conta.
4. **Quem não pode usar, não aprende** milagre quando o bloqueio é
   permanente (sem deus, sub-raça fixa Vampiro/Lobisomem, Escuridão). A
   transformação temporária (Licantropia) bloqueia só o **uso** enquanto dura.
5. As 41 magias citadas por mais de uma origem foram classificadas pelo
   usuário (tabela na seção 1).

## 1. Classe da magia

Coluna nova `magias.classe text NOT NULL`, com
`CHECK (classe IN ('Feitiço','Milagre','Encanto','Transmutação'))`.

Script `scripts/sql/classes-de-magia-2026-10-22.sql`:

**Carga pela permissão (198 magias de uma origem só).**
- Mago / Colégio → Feitiço
- Sacerdote / Ordem → Milagre
- Bardo / Confraria → Encanto
- Rastreador / Trilha → Transmutação

**As 41 de várias origens** (decisão do usuário):

| Classe | Magias |
|---|---|
| Feitiço | Aeromanipulação, Aeroproteção, Criptograma Místico, Degeneração Física, Detecção de Magia, Fotoataque, Geoataque, Geomanipulação, Hidroataque, Hidroproteção, Hidromanipulação, Mutação, Necroconhecimento, Piroataque, Piromanipulação, Piroproteção, Quebra de Encantos, Respiração Arcana, Transformação Metálica |
| Milagre | Curas Heroicas (não estava na lista do usuário; fica a proposta), Esconjuração, Maldições |
| Encanto | Amizade, Conhecimento, Dom das Línguas, Intuição, Leitura, Lendas, Memorização, Modificar Espírito, Runas, Sombra, Ventriloquismo |
| Transmutação | Caçada Marcada, Comunhão Natural, Conhecimento Natural, Controle Climático, Elo Animal, Graça Felina, Ossos de Aço, Super Resistência |

**Guarda:** nenhuma magia fica sem classe (a coluna vira NOT NULL só depois
da carga). Hoje todas as 239 têm ao menos uma origem na permissão.

**Onde aparece:**
- campo no editor de magias do admin (`catalogo-descritores.jsx`, `opcoes`);
- detalhe da magia na ficha (`MagiaDetalhesModal`) e no bestiário
  (`BestItemMagia` e a ficha da magia);
- janela Estudar, ao lado do tipo.

## 2. Quem não usa milagre

Função pura em `src/01-core/game-data.jsx`:

```
bloqueioMilagre(ator, opcoes?) → null | { motivo }
  ator = { tipo: 'pj' | 'criatura', deus, subraca (efetiva), subraca_fixa,
           elemento (CSV ou lista), subtipo, profissao }
  opcoes.permanente = true → ignora a sub-raça temporária (para aprender)
```

Motivos, nesta ordem:
- `milagre_vampiro`: sub-raça Vampiro (PJ) ou subtipo Vampiro (criatura) — "Vampiros não usam milagres."
- `milagre_lobisomem`: sub-raça Lobisomem ou subtipo Lobisomem — "Lobisomens não usam milagres."
- `milagre_sem_religiao`: PJ sem deus — "Sem religião, não há milagre."
- `milagre_escuridao`: elemento inclui Escuridão (PJ pela profissão;
  criatura pelo campo `elemento`) — "A Escuridão não conjura milagres."

E `alvoDeMilagreBloqueado(ator) → null | { motivo }`: os três primeiros
motivos (vampiro, lobisomem, sem religião). Escuridão **não** impede de ser
alvo.

Sub-raça efetiva vem de `subracaEfetiva` (Licantropia temporária vence a
sub-raça fixa).

## 3. Onde a regra vale

### Aprender
- `bloqueioAprenderMagia` (JS) ganha, para `classe = 'Milagre'`, o
  `bloqueioMilagre(pj, { permanente: true })` antes dos pontos.
- RPC `aprender_magia` espelha: milagre recusado com o mesmo motivo quando
  `personagens.subraca IN ('Vampiro','Lobisomem')`, `deus IS NULL` ou a
  profissão é Mago (elemento Escuridão — mapa espelhado em SQL).

### Usar na batalha
- `magiasConhecidasDoAtor` / `magiasOfensivasDoAtor` / `magiasDeApoioDoAtor`
  marcam o milagre como bloqueado (`bloqueio: { motivo }`) para quem
  `bloqueioMilagre(ator)`. A UI mostra o milagre desativado com o motivo.
- `alvoPermitidoParaMagia` ganha a checagem: milagre em alvo com
  `alvoDeMilagreBloqueado` → `{ pode: false, motivo: 'milagre_…' }`. Área e
  aura já filtram por essa função, então pulam o alvo.
- O snapshot do participante (`montarSnapshots`) passa a levar `deus`,
  `subraca` efetiva, `elemento`, `subtipo` e `profissao`.
- Criatura usa o mesmo caminho: suas magias (`criaturas.magia`) e seu
  `elemento`/`subtipo`.

### Usar fora da batalha (ficha → Evocar)
- O botão Evocar do milagre fica desativado com o motivo para PJ bloqueado.
- Alvos (colegas, animais) bloqueados não aparecem na lista de alvo.

### PJs existentes
Quem já tem milagre e cai no bloqueio mantém a magia na ficha, marcada como
bloqueada (sem uso), sem devolução de pontos.

## 4. Dependência

A sub-raça (`GAME_DATA.subracas`, `subracaEfetiva`, Licantropia) está em
alterações **ainda não commitadas** do working tree (outro trabalho). A coluna
`personagens.subraca` já existe no banco. A implementação das partes de
vampiro/lobisomem no front precisa desse código na main; até lá,
`bloqueioMilagre` lê `subracaEfetiva` só se existir (`typeof`), e os testes
dessa parte entram junto.

## 5. Testes

- `bloqueioMilagre` / `alvoDeMilagreBloqueado`: cada motivo; Mago;
  criatura "Fogo, Escuridão"; criatura subtipo Vampiro; Licantropia
  temporária com `permanente`.
- `bloqueioAprenderMagia`: milagre bloqueado para PJ sem deus; não-milagre
  livre.
- Batalha: milagre desativado na lista do Mago; alvo vampiro inselecionável;
  área pula o alvo bloqueado.
- Ficha: Evocar desativado com motivo.
- SQL: guarda de classe; RPC recusa milagre para PJ sem deus (ensaio com
  ROLLBACK).

## Fora de escopo

- Remover `magias.permissao`.
- Religião para criaturas.
- Efeitos de classe além da regra dos milagres.
