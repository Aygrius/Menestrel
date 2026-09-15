-- criaturas-equipamento.sql — 14/09/2026
--
-- "Os campos Ataque, Energia Física, Energia Heroica, Tipo de Armadura,
-- Absorção, Defesa, Velocidade, L, M, P e Dano 100% são calculados
-- automaticamente com base nas informações inseridas. Por isso deve ser
-- possível equipar a criatura com armas e armaduras." (usuário)
--
-- Lista de { slug, slot } — o mesmo par que o inventário do personagem usa
-- para peça equipada. slot: 'mao_d' / 'mao_e' para arma e escudo, e o
-- slot_equip do item para armadura (cabeca, peito, pernas, pes, ombros, bracos).
-- A conta está em src/09-bestiario/criatura-formulas.jsx (derivadosDaCriatura).

alter table public.criaturas
  add column if not exists equipamento jsonb not null default '[]'::jsonb;

comment on column public.criaturas.equipamento is
  'Armas e armaduras equipadas: [{ slug, slot }]. Deriva ataque, dano_l/m/p, dano_100, absorcao, defesa e armadura (criatura-formulas.jsx).';
