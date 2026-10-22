# Técnicas por item e treino com tempo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Técnicas passam a ser aprendidas por pergaminho/livro (sem permissão), e técnicas e magias compradas entram numa fila de treino que só libera o nível depois de tempo de jogo na atividade certa.

**Architecture:** Coluna `personagens.treinos` (fila). As RPCs `aprender_tecnica` (nova) e `aprender_magia` (alterada) põem o nível na fila. O relógio da mesa (shell.jsx, laço de desgaste) chama a função pura `avancarTreinos` e grava o nível concluído em `tecnicas`/`magias`. Regras puras em `game-data.jsx`; a janela Estudar ganha linhas de técnica; o menu de atividade da ficha mostra a fila.

**Tech Stack:** React 19 + Vite (`.jsx` globais em `window`), Vitest, Supabase Postgres (MCP `supabase-write`), Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-22-tecnicas-por-item-e-treino-design.md`

## Global Constraints

- Tempo por nível: técnica **72 h** de `treinando`; magia **24 h** da atividade da classe: Feitiço `estudando`, Milagre `orando`, Transmutação `meditando`, Encanto `praticando`.
- Fila em `personagens.treinos` (jsonb array): `{ id, tipo: 'tecnica'|'magia', key, nivel, atividade, horas_restantes, comprado_em }`. Para magia `nivel` = passos (1..5).
- Ordem: itens da mesma atividade andam na ordem da lista; sobra de horas passa ao próximo da mesma atividade.
- Concluir grava `max(atual, nivel)` em `tecnicas[key]` / `magias[key]`.
- Pontos de técnica por estágio = base + max(0, `fisico_base`) + max(0, `agilidade_base`). Base: Guerreiro 4, Ladino 2, Rastreador 3, Sacerdote 3, Bardo 2, Mago 1 (outra = 0).
- Gasto de técnica = Σ nível × custo, contando o **maior** entre sabido e fila. Idem magia (`custo × nível efetivo`).
- Técnica: nível ≤ estágio (regra atual do criador).
- Próximo nível comprável = max(sabido, maior da fila) + 1.
- Pergaminho de técnica: slug `pergaminho_tecnica_<key>`, `itens.tecnica` = nome da técnica.
- 14 livros novos (slugs na Task 1). Nenhum automático.
- `tecnicas.permissao` fica (só informação).
- UI nova com a skill `impeccable`; confirmação no `.ms-footer`.
- Commits na `main`, português, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Working tree começa limpo.

## Review Focus

1. Mestre avança 30 h com Orando e há 2 milagres na fila: o primeiro conclui (24 h) e o segundo fica com 18 h restantes (teste na Task 2).
2. Técnica com o nível 1 ainda na fila e o jogador estuda de novo: o próximo é o nível 2 (não repete o 1), o gasto já conta o nível 1 da fila, e no estágio 1 o nível 2 recusa por `acima_do_estagio` (teste na Task 2).
3. Relógio avança sem atividade ligada: fila não anda (teste na Task 2).
4. Batalha durante o treino: o nível em fila não aparece; o nível já sabido aparece (comportamento atual — `tecnicas`/`magias` só mudam na conclusão; teste na Task 3).
5. Edição de personagem depois de concluir um treino não regrava `tecnicas` (teste na Task 6).

---

### Task 1: Banco (escrito e ensaiado)

**Files:**
- Create: `scripts/sql/tecnicas-por-item-e-treino-2026-10-22.sql`
- Create: `scripts/sql/aprender-tecnica-rpc-2026-10-22.sql`
- Modify: `scripts/sql/aprender-magia-rpc-2026-10-22.sql`

**Produces:** `personagens.treinos jsonb not null default '[]'`; `itens.tecnica text`; pergaminhos `pergaminho_tecnica_<key>`; livros abaixo; vínculos; `aprender_tecnica`; `aprender_magia` na fila; `_menestrel_pontos_tecnica_por_estagio(text,int,int)`.

- [ ] **Step 1: Script de catálogo**

```sql
BEGIN;
ALTER TABLE public.personagens ADD COLUMN IF NOT EXISTS treinos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS tecnica text;

INSERT INTO public.itens (slug, nome, grupo, ocupa, tipo, origem, icone, tecnica, descricao, dano_l, dano_m, dano_p)
SELECT 'pergaminho_tecnica_' || t.key, 'Pergaminho ' || t.nome, 'Consumíveis', 0.1, 'S', 'Comum', 'ti-file-star', t.nome,
       'Pergaminho com instruções para o treino da técnica ' || t.nome || '.', 0, 0, 0
  FROM public.tecnicas t
 WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_tecnica_' || t.key);

INSERT INTO public.itens (slug, nome, grupo, ocupa, tipo, origem, icone, descricao, dano_l, dano_m, dano_p)
SELECT v.slug, v.nome, 'Itens', l.ocupa, l.tipo, l.origem, l.icone, v.descricao, 0, 0, 0
  FROM (VALUES
    ('manual_do_guerreiro',  'Manual do Guerreiro',  'Manual com as técnicas difundidas entre os guerreiros.'),
    ('manual_do_ladino',     'Manual do Ladino',     'Manual com as técnicas difundidas entre os ladinos.'),
    ('manual_do_rastreador', 'Manual do Rastreador', 'Manual com as técnicas difundidas entre os rastreadores.'),
    ('manual_do_bardo',      'Manual do Bardo',      'Manual com as técnicas difundidas entre os bardos.'),
    ('manual_do_sacerdote',  'Manual do Sacerdote',  'Manual com as técnicas difundidas entre os sacerdotes.'),
    ('manual_do_mago',       'Manual do Mago',       'Manual com as técnicas difundidas entre os magos.'),
    ('manual_academia_soldados',    'Manual da Academia de Soldados',    'Manual da academia de soldados.'),
    ('manual_academia_arqueiros',   'Manual da Academia de Arqueiros',   'Manual da academia de arqueiros.'),
    ('manual_academia_cavaleiros',  'Manual da Academia de Cavaleiros',  'Manual da academia de cavaleiros.'),
    ('manual_academia_gladiadores', 'Manual da Academia de Gladiadores', 'Manual da academia de gladiadores.'),
    ('manual_guilda_assassinos', 'Manual da Guilda de Assassinos', 'Manual da guilda de assassinos.'),
    ('manual_guilda_ladroes',    'Manual da Guilda de Ladrões',    'Manual da guilda de ladrões.'),
    ('manual_guilda_piratas',    'Manual da Guilda de Piratas',    'Manual da guilda de piratas.'),
    ('livro_geral_tecnicas_combate', 'Livro Geral de Técnicas de Combate', 'Técnicas de combate ao alcance de qualquer um.')
  ) AS v(slug, nome, descricao)
  CROSS JOIN (SELECT ocupa, tipo, origem, icone FROM public.itens WHERE slug = 'livro_do_justiceiro') l
 WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = v.slug);

CREATE TEMP TABLE _perm_manual (perm text, livro_slug text) ON COMMIT DROP;
INSERT INTO _perm_manual VALUES
  ('Guerreiro','manual_do_guerreiro'),('Ladino','manual_do_ladino'),('Rastreador','manual_do_rastreador'),
  ('Bardo','manual_do_bardo'),('Sacerdote','manual_do_sacerdote'),('Mago','manual_do_mago'),
  ('Academia de Soldados','manual_academia_soldados'),('Academia de Arqueiros','manual_academia_arqueiros'),
  ('Academia de Cavaleiros','manual_academia_cavaleiros'),('Academia de Gladiadores','manual_academia_gladiadores'),
  ('Guilda de Assassinos','manual_guilda_assassinos'),('Guilda de Ladrões','manual_guilda_ladroes'),
  ('Guilda de Piratas','manual_guilda_piratas');

INSERT INTO public.livro_pergaminhos (livro_slug, pergaminho_slug)
SELECT DISTINCT pm.livro_slug, 'pergaminho_tecnica_' || t.key
  FROM public.tecnicas t
  CROSS JOIN LATERAL unnest(string_to_array(coalesce(t.permissao, ''), ',')) AS p(x)
  JOIN _perm_manual pm ON pm.perm = btrim(p.x)
ON CONFLICT DO NOTHING;
INSERT INTO public.livro_pergaminhos (livro_slug, pergaminho_slug)
SELECT 'livro_geral_tecnicas_combate', 'pergaminho_tecnica_' || t.key
  FROM public.tecnicas t WHERE nullif(btrim(t.permissao), '') IS NULL
ON CONFLICT DO NOTHING;

DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.tecnicas t
   WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_tecnica_' || t.key);
  IF n > 0 THEN RAISE EXCEPTION '% técnica(s) sem pergaminho', n; END IF;
  SELECT count(*) INTO n FROM public.tecnicas t
   WHERE NOT EXISTS (SELECT 1 FROM public.livro_pergaminhos lp WHERE lp.pergaminho_slug = 'pergaminho_tecnica_' || t.key);
  IF n > 0 THEN RAISE EXCEPTION '% técnica(s) fora de qualquer livro', n; END IF;
END $$;
COMMIT;
```

(com cabeçalho de comentário no padrão dos outros scripts citando o pedido do usuário).

- [ ] **Step 2: Pontos de técnica + `aprender_tecnica`**

```sql
CREATE OR REPLACE FUNCTION public._menestrel_pontos_tecnica_por_estagio(p_profissao text, p_fisico int, p_agilidade int)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT (CASE p_profissao WHEN 'Guerreiro' THEN 4 WHEN 'Ladino' THEN 2 WHEN 'Rastreador' THEN 3
                           WHEN 'Sacerdote' THEN 3 WHEN 'Bardo' THEN 2 WHEN 'Mago' THEN 1 ELSE 0 END)
       + greatest(0, coalesce(p_fisico, 0)) + greatest(0, coalesce(p_agilidade, 0));
$$;
```

`aprender_tecnica(p_pj_id bigint, p_instance_id text, p_tecnica_key text) RETURNS jsonb` (SECURITY DEFINER, search_path public), passos:
1. auth; PJ do usuário (`id, tecnicas, treinos, inventario, profissao, experiencia, fisico_base, agilidade_base`).
2. instância no inventário; `anuncio_id` → `item_a_venda`.
3. técnica por key (`key, nome, custo`) → `tecnica_nao_encontrada`.
4. ensina: slug = `pergaminho_tecnica_<key>` ou vínculo em `livro_pergaminhos` → `item_nao_ensina`.
5. `v_sabido = coalesce((tecnicas->>key)::int, 0)`; `v_fila = max(nivel)` dos itens `tipo='tecnica' and key=key` em `treinos`; `v_alvo = greatest(v_sabido, v_fila) + 1`.
6. estágio = `_menestrel_estagio(experiencia)`; `v_alvo > estagio` → `acima_do_estagio`.
7. gasto = Σ sobre todas as técnicas de `greatest(sabido, fila) × custo`, com a desta = `v_alvo`; total = pontos × estágio → `pontos_insuficientes`.
8. `treinos = treinos || jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'tipo','tecnica','key',key,'nivel',v_alvo,'atividade','treinando','horas_restantes',72,'comprado_em',now()))`.
9. retorno `{ ok, tecnica, tecnica_nome, nivel, horas: 72 }`.
GRANT só `authenticated`.

- [ ] **Step 3: `aprender_magia` na fila**

No arquivo da RPC: selecionar `treinos` do PJ; `v_atual` passa a ser `greatest(sabido, maior passos da fila para esta magia)`; o gasto soma, por magia, `greatest(sabido, fila)`; em vez do `update … set magias`, acrescentar à fila `{ tipo:'magia', key, nivel: v_alvo, atividade: CASE classe WHEN 'Feitiço' THEN 'estudando' WHEN 'Milagre' THEN 'orando' WHEN 'Transmutação' THEN 'meditando' ELSE 'praticando' END, horas_restantes: 24 }`; retorno ganha `horas: 24, atividade`.

- [ ] **Step 4: Ensaiar (BEGIN … ROLLBACK)** os três com casos: técnica pelo manual entra na fila (não em `tecnicas`); segunda compra da mesma técnica pede nível 2; técnica acima do estágio recusa; Mago (base 1, Fís 0, Agi 0, estágio 1) sem pontos para custo 2; magia pelo livro entra na fila com `orando` para milagre e `estudando` para feitiço. Contagens: 65 pergaminhos de técnica, 14 livros com vínculo de técnica.
- [ ] **Step 5: Commit.**

---

### Task 2: Regras puras

**Files:** `src/01-core/game-data.jsx`, `src/01-core/clima-desgaste.jsx`; tests `src/01-core/treinos.test.js`, `src/01-core/pontos-tecnica.test.js`.

**Produces (window):**
- `TECNICAS_BASE_POR_PROFISSAO`, `pontosTecnicasPorEstagio(prof, fisico, agilidade)`, `pontosTecnicasTotal(prof, estagio, fisico, agilidade)` (substitui a assinatura antiga; `TECNICAS_POR_PROFISSAO` sai).
- `nivelNaFila(treinos, tipo, key) → number` (maior nível na fila, 0 se nenhum).
- `comFila(obj, treinos, tipo) → obj` (cada key com `max(obj[key], nivelNaFila)`).
- `bloqueioAprenderTecnica(tecnica, pj, tecnicasDb) → null | {motivo, …}` (motivos: `tecnica_nao_encontrada`, `acima_do_estagio`, `pontos_insuficientes` com `{faltam,gasto,total}`); usa `comFila`.
- `bloqueioAprenderMagia` passa a usar `comFila(pj.magias, pj.treinos, 'magia')` para passos e gasto.
- `ATIVIDADE_DA_CLASSE = { 'Feitiço':'estudando', 'Milagre':'orando', 'Transmutação':'meditando', 'Encanto':'praticando' }`, `HORAS_TREINO = { tecnica: 72, magia: 24 }`.
- Em `clima-desgaste.jsx`: atividade `{ id:'praticando', pt:'Praticando', en:'Practicing', icon:'ti-music' }` na lista `ATIVIDADES` e `praticando: { hora: [{ cond: 'reputacao', base: 5 }] }` em `ATIVIDADE_EFEITO`; `avancarTreinos(treinos, atividade, horas) → { treinos, concluidos }`.

- [ ] **Step 1: testes (falham)** — `treinos.test.js`:
  - fila `[magia A orando 24h, magia B orando 24h, tecnica T treinando 72h]`, `avancarTreinos(f, 'orando', 30)` → concluídos `[A]`, B com 18 h, T intacta;
  - `avancarTreinos(f, null, 10)` → nada muda;
  - `avancarTreinos(f, 'treinando', 72)` → conclui T;
  - `nivelNaFila` e `comFila` (maior entre sabido e fila);
  - `bloqueioAprenderTecnica`: Guerreiro Fís 2 Agi 1 estágio 1 = 7 pontos; técnica custo 2 nível 1 ok; com nível 1 na fila, próximo é 2 → `acima_do_estagio` no estágio 1; gasto conta a fila;
  - `bloqueioAprenderMagia` com 1 passo na fila → próximo passo 2.
  `pontos-tecnica.test.js`: tabela de bases (Mago 1), atributo negativo conta 0, × estágio.
- [ ] **Step 2: ver falhar. Step 3: implementar. Step 4: `npx vitest run src/01-core`. Step 5: commit.**

---

### Task 3: Relógio da mesa move a fila

**Files:** `src/10-shell/shell.jsx` (~2580, laço `pjs.map` do desgaste); test `src/10-shell/treino-relogio.test.js`.

- [ ] Extrair a decisão para uma função pura exportada `aplicarTreinoNoPj(pj, atividade, horas) → null | { treinos, tecnicas, magias }` (em `clima-desgaste.jsx`, ao lado de `avancarTreinos`), que devolve `null` quando nada muda. No laço, quando a atividade existe, chamar e somar `treinos`/`tecnicas`/`magias` ao `update` (o mesmo `update` do `estado_atual`). Morto não treina (mesma condição `morto` já calculada).
- [ ] Teste (falha → passa): `aplicarTreinoNoPj` conclui um milagre com 24 h de `orando` e grava `magias[key] = nivel`; nunca rebaixa (`magias[key]` maior fica); técnica concluída grava em `tecnicas`.
- [ ] Teste de fonte: o `update` do laço inclui `treinos`.
- [ ] Commit.

---

### Task 4: Inventário — Estudar técnicas

**Files:** `src/07-inventario/inventario.jsx`; tests em `src/07-inventario/estudar-tecnica.test.jsx`, `refetch-pjs.test.js`.

- [ ] `PJ_COLS` + `tecnicas,treinos,agilidade_base`; carregar `tecnicasDb` (`key,nome,custo,descricao,efeito,ajuste`).
- [ ] `tecnicasQueOItemEnsina(cat, vinculos, catalogoBySlug, tecnicasDb)` (pergaminho: `cat.tecnica`; livro: vínculos cujos pergaminhos têm `tecnica`); `ehPergaminhoDeTecnica(cat)` (slug `pergaminho_tecnica_`, grupo Consumíveis, `tecnica` preenchido). `magiasQueOItemEnsina` passa a ignorar pergaminhos de técnica.
- [ ] `EstudarMagiaModal` vira genérico: recebe `magias` e `tecnicas`; linhas de técnica mostram nível atual → próximo e custo (`custo × (próximo − atual)`), bloqueio por `bloqueioAprenderTecnica`; linha com nível em fila mostra "em treino · N dias"; confirmar chama `onAprender({ tipo, key })`. Ao aprender, a mensagem de rodapé diz "Em treino: X dias de Treinando" (ou da atividade da magia).
- [ ] `aprenderMagiaComItem` → `aprenderComItem(instanceId, { tipo, key })` chamando `aprender_tecnica` ou `aprender_magia`.
- [ ] Ação do item: "Estudar" aparece se ensina magia **ou** técnica; pergaminho de técnica mostra "Aprender".
- [ ] `motivoAprenderLabel` ganha `tecnica_nao_encontrada`.
- [ ] Testes (falham → passam): livro com vínculo de técnica mostra Estudar; janela lista técnica com custo; confirmar chama `onAprender({tipo:'tecnica', key})`; linha em treino; `PJ_COLS` com `treinos`.
- [ ] Carregar `impeccable` antes do CSS da linha "em treino". Commit.

---

### Task 5: Ficha — fila no menu de atividade

**Files:** `src/11-ficha/ficha.jsx` (`FichaAtividadeSeletor` ~529 e quem o renderiza); test `src/11-ficha/atividade-seletor.test.jsx`.

- [ ] `FichaAtividadeSeletor` recebe `treinos` e `nomeDe({tipo,key})`; cada opção da lista mostra, abaixo, os itens da fila daquela atividade: `Nome · nível N · X d Y h` (o primeiro com "em treino"). A opção "Praticando" aparece (vem de `ATIVIDADES`).
- [ ] Quem renderiza passa `pj.treinos` e um `nomeDe` que usa `tecnicasByKey`/`magiasByKey`.
- [ ] Teste: com fila de 1 técnica em treinando (36 h) a opção Treinando mostra "1 d 12 h"; Praticando existe. Commit.

---

### Task 6: Criador sem passo de técnicas

**Files:** `src/08-personagens/personagens.jsx`; `src/08-personagens/guia_personagem.jsx`; test `src/08-personagens/criador-sem-magias.test.jsx` (renomear o describe ou novo arquivo `criador-sem-tecnicas.test.jsx`).

- [ ] Mesmo molde da remoção das magias: tirar `{ id: 'tecnicas' }` dos passos, `tecTotalPontos…tecQtd`, `erroTecnicas`, a linha no `podeAvancar`, o `WizSaldo`, o bloco `<StepTecnicas>`, a função `StepTecnicas` e do export; payload: criação `tecnicas: {}`, edição sem `tecnicas`; `todosOsPontosGastos` sem `tecnicas`; `StepRevisao` só mostra técnicas se houver.
- [ ] Guia: seção de técnicas com a regra nova (livros, pontos base + Físico + Agilidade, 3 dias de Treinando por nível) e a de magias com o treino (1 dia na atividade da classe).
- [ ] Testes: nenhum passo de técnicas; edição sem `tecnicas` no payload; `StepTecnicas` undefined. Commit.

---

### Task 7: Admin — campo Técnica no item

**Files:** `src/09-bestiario/catalogo-descritores.jsx` (descritor `itens`, ao lado de `magia`), `src/01-core/constants.jsx` (`campoTecnica`), test `catalogo-descritores.test.js` (coluna `tecnica` no schema de `itens`).

- [ ] Campo `{ col: 'tecnica', tipo: 'opcoes', fonte: 'tecnicas', rotuloKey: 'campoTecnica', grupos: ['Consumíveis'] }` (mesmo molde do campo `magia`, que usa `fonte`). Teste → commit.

---

### Task 8: Aplicar, revisar e publicar

- [ ] `npm test`, `npm run build`, `npx eslint src` (só os 10 erros antigos).
- [ ] Aplicar os três scripts (MCP, com COMMIT) e conferir contagens; ensaio da RPC com ROLLBACK.
- [ ] Revisão final (revisor dedicado), corrigir Critical/Important com teste.
- [ ] Commit, push, `vercel --prod --yes`, conferir 200.
