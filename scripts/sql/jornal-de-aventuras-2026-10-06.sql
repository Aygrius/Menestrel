-- scripts/sql/jornal-de-aventuras-2026-10-06.sql
-- ============================================================================
-- O JORNAL DE AVENTURAS (06/10/2026)
--
-- Pedido do usuário: "Quero criar um jornal para divulgação das aventuras que
-- os personagens podem explorar, teremos a seguinte estrutura: Nome da
-- Aventura · Estágio · Personagem · Recompensa · Experiência · Início · Fim.
-- As aventuras vão estar em uma aba da cidade."
--
-- UMA AVENTURA PERTENCE A UMA CIDADE. É nela que o jornal circula, e é por isso
-- que a FK aponta para `cidades.slug` (a PK dela) em vez de guardar o nome:
-- cidade renomeada não perde o mural, e cidade apagada leva o dela — um anúncio
-- sem mural não é lido por ninguém.
--
-- OS SETE CAMPOS, e por que quase todos são TEXTO:
--   nome         "A Viúva"
--   estagio      5 — o único número. É o que diz se a aventura serve ao grupo,
--                e por isso também é a ordenação da lista.
--   personagem   "Celsior Altana" — quem oferece. TEXTO, e não FK para `npcs`:
--                o pedido dá um nome, e exigir um NPC cadastrado travaria o
--                Mestre que ainda não o criou.
--   recompensa   "2 moedas de ouro" — texto, porque a recompensa do exemplo é
--                moeda mas pode ser um favor, um título ou uma casa.
--   experiencia  "15 pontos de experiência" — idem: o exemplo é número, mas é
--                a frase que o jornal publica.
--   inicio       o chamado — o anúncio em si.
--   fim          A SOLUÇÃO. Ver abaixo.
--
-- O `fim` É DO MESTRE, e esta é a única decisão do jornal que NÃO está literal
-- no pedido. O jornal é "para divulgação das aventuras que os personagens podem
-- explorar": o que se divulga é o convite. O exemplo do campo Fim é o assassino
-- revelado ("Envilla Demiris assassinou o próprio marido"), e entregá-lo junto
-- do Início resolveria o mistério antes de o grupo sair da taverna.
-- A coluna é lida por todos (o Mestre precisa do mesmo SELECT); quem esconde é
-- a tela, por `podeEditarAventuras` — ver src/13-diario/jornal-aventuras.jsx.
-- Reverter é tirar uma condição.
--
-- APLICADO NO BANCO EM 06/10/2026 (projeto kaxbdpdutentlrobuqyu), pela
-- migration `jornal_de_aventuras`.
-- ============================================================================

create table if not exists public.aventuras (
  id            bigserial primary key,
  cidade_slug   text not null references public.cidades(slug) on update cascade on delete cascade,
  nome          text not null,
  estagio       smallint,
  personagem    text,
  recompensa    text,
  experiencia   text,
  inicio        text,
  fim           text,
  criado_por    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.aventuras is
  'Jornal de aventuras de uma cidade: o que os personagens podem explorar.';
comment on column public.aventuras.fim is
  'A solução da aventura — só o Mestre vê (a tela filtra).';

create index if not exists aventuras_cidade_idx on public.aventuras (cidade_slug);

-- O mesmo teto da tabela de estágios do sistema (GAME_DATA.estagios: 1 a 40).
do $do$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.aventuras'::regclass
                    and conname = 'aventuras_estagio_chk') then
    alter table public.aventuras add constraint aventuras_estagio_chk
      check (estagio is null or estagio between 1 and 40);
  end if;
end
$do$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- LEITURA como `cidades`: todo autenticado lê. O jornal é público na mesa — é o
-- sentido de "divulgação" — e o que o jogador não pode ver (o `fim`) é filtrado
-- na TELA, não na linha, porque o Mestre precisa do mesmo SELECT.
--
-- ESCRITA do MESTRE da história da cidade, ou do admin nas cidades do mundo
-- (historia_id nulo). É a mesma divisão que o Diário já faz para reino, cidade
-- e NPC — ver `editavel` em GerenciarLoreView.
alter table public.aventuras enable row level security;

drop policy if exists aventuras_leitura on public.aventuras;
create policy aventuras_leitura on public.aventuras
  for select to authenticated using (true);

/* SECURITY DEFINER porque a checagem cruza `cidades` e `historias`, e a RLS de
   `historias` não deixa o jogador ler a linha do Mestre — sem isto a policy
   seria falsa para todo mundo. STABLE: o Postgres pode reaproveitá-la dentro da
   mesma consulta em vez de chamá-la por linha. */
create or replace function public.pode_editar_aventura(p_cidade_slug text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(eh_admin(), false)
      or exists (
           select 1
             from cidades c
             join historias h on h.id = c.historia_id
            where c.slug = p_cidade_slug
              and h.mestre_id = auth.uid());
$$;

drop policy if exists aventuras_insert on public.aventuras;
create policy aventuras_insert on public.aventuras
  for insert to authenticated with check (pode_editar_aventura(cidade_slug));

drop policy if exists aventuras_update on public.aventuras;
create policy aventuras_update on public.aventuras
  for update to authenticated
  using (pode_editar_aventura(cidade_slug))
  with check (pode_editar_aventura(cidade_slug));

drop policy if exists aventuras_delete on public.aventuras;
create policy aventuras_delete on public.aventuras
  for delete to authenticated using (pode_editar_aventura(cidade_slug));

-- ── ONDE A ABA APARECE ──────────────────────────────────────────────────────
-- "As aventuras vão estar em uma aba da cidade." Não houve mecanismo de aba a
-- construir: a ficha de uma entrada do Diário vira abas a partir das SEÇÕES que
-- o conteúdo desenha (ver DetalheMoldura em src/13-diario/diario.jsx — "as abas
-- saem das seções .best-secao com título"). O jornal é uma seção chamada
-- "Aventuras" na ficha da cidade, entre Rumores e Suas anotações, e o modelo
-- único de janela faz o resto.

-- ── CONFERÊNCIA ─────────────────────────────────────────────────────────────
-- As aventuras de uma cidade, na ordem em que o mural as mostra:
--   select nome, estagio, personagem, recompensa
--     from aventuras where cidade_slug = '<slug>'
--    order by estagio nulls last, nome;
--
-- Quem pode escrever no mural de cada cidade (rodar como o usuário em questão):
--   select c.nome, pode_editar_aventura(c.slug) from cidades c order by c.nome;
