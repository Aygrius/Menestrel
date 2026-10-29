-- scripts/sql/so-mesma-cidade-2026-10-06.sql
-- ============================================================================
-- O JOGADOR SÓ VÊ QUEM ESTÁ NA MESMA CIDADE (06/10/2026)
--
-- Pedido do usuário: "Os jogadores só podem ver e interagir com personagens que
-- estão na mesma cidade que o seu próprio personagem."
--
-- POR QUE NA FUNÇÃO, E NÃO NAS TELAS. `get_pjs_historia` é a ÚNICA porta pela
-- qual um jogador lê outros personagens: a RLS de `personagens` só autoriza o
-- dono e o Mestre, então a janela de magia (11-ficha), a transferência de item
-- (07-inventario) e os amigos da ficha todos passam por esta função
-- SECURITY DEFINER. Uma regra escrita aqui vale para as três de uma vez, e
-- nenhuma tela nova pode esquecê-la.
--
-- COMPARAÇÃO TOLERANTE, pelo mesmo motivo de `mesmaCidade` (01-core):
-- `personagens.localizacao` é TEXTO livre ("Farzelo", "farzelo ") e não aponta
-- para public.cidades. Sem acento (translate, como em
-- fabricacao-2026-10-06.sql) e sem caixa, "Ilha dos Corvos" casa com
-- "ilha dos corvos".
--
-- SEM LOCALIZAÇÃO NÃO VÊ NINGUÉM, e também não é visto. Dois personagens "em
-- lugar nenhum" não estão na mesma cidade — estão os dois sem cidade. Tratar o
-- vazio como um lugar faria dele a maior cidade do mundo, onde cada personagem
-- novo nasceria vendo todos os outros, que é exatamente o que o pedido fecha.
-- Quem move o personagem é a barra do topo (CardDataJogoAtual, 10-shell), e é
-- de lá que o Mestre tira alguém do limbo.
--
-- `localizacao` ENTRA NO RETORNO para a tela poder dizer o PORQUÊ de uma lista
-- curta ("ninguém mais está em Haafel") em vez de só mostrar menos gente.
--
-- APLICADO NO BANCO EM 06/10/2026 (projeto kaxbdpdutentlrobuqyu), pela
-- migration `pjs_historia_so_mesma_cidade`.
-- ============================================================================

-- O tipo de retorno mudou (ganhou `localizacao`), e o Postgres não troca o tipo
-- de uma função existente: derruba e recria.
drop function if exists public.get_pjs_historia(bigint);

create function public.get_pjs_historia(p_pj_id bigint)
returns table(id bigint, nome text, sobrenome text, raca text, profissao text,
              foto_url text, localizacao text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_local text;
  v_fold  text;
begin
  select coalesce(p.localizacao, '') into v_local
    from personagens p where p.id = p_pj_id;

  v_fold := lower(btrim(translate(coalesce(v_local, ''),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc')));

  -- Quem não está em cidade nenhuma não vê ninguém.
  if v_fold = '' then
    return;
  end if;

  return query
  select p.id, p.nome, p.sobrenome, p.raca, p.profissao, p.foto_url, p.localizacao
  from personagens p
  where p.id <> p_pj_id
    and lower(btrim(translate(coalesce(p.localizacao, ''),
          'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
          'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc'))) = v_fold
    and p.id = any (
      select unnest(h.protagonista_ids)
      from historias h
      where p_pj_id = any (h.protagonista_ids)
    );
end;
$function$;

-- ── CONFERÊNCIA ─────────────────────────────────────────────────────────────
-- Quem vê quantos, por cidade (conferido em 06/10/2026: os seis de Haafel veem
-- 5 cada, os três da Ilha dos Corvos veem 2, e quem está sozinho ou sem cidade
-- vê 0):
--   select p.id, p.nome, p.localizacao,
--          (select count(*) from get_pjs_historia(p.id)) as ve_quantos
--     from personagens p order by p.localizacao nulls first, p.nome;

-- ── ENTREGAR TAMBÉM É INTERAGIR ─────────────────────────────────────────────
-- `transfer_item` ganhou a mesma trava, na migration
-- `transfer_item_so_mesma_cidade` (06/10/2026): a lista de amigos da tela já
-- não mostra quem está em outra cidade, mas lista de tela é conveniência, não
-- regra — e a função já guardava "mesma aventura" e "pacto selado" pelo mesmo
-- raciocínio. O MESTRE segue passando: ele é exceção na trava do pacto pelo
-- mesmo motivo, e não está em cidade nenhuma porque está em todas.
-- O motivo devolvido é 'cidade_diferente', e o recado está em
-- src/07-inventario/inventario.jsx (MOTIVOS da transferência).
--
--   select * from transfer_item(<de>, <para>, '<instanceId>');
--   -- → { ok: false, motivo: 'cidade_diferente' } quando estão separados.
