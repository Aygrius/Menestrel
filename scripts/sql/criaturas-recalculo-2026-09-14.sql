-- criaturas-recalculo-2026-09-14.sql
--
-- Aplica às 228 criaturas as fórmulas novas (decisão do usuário: "Faça tudo
-- agora, não precisa de backup."). A mesma conta de
-- src/09-bestiario/criatura-formulas.jsx (derivadosDaCriatura):
--
--   EF = ceil(2·√Peso + Físico)       EH = (12 + Aura) × Estágio
--   VB = (Físico + Agilidade) × Estágio
--   Equipamento: a criatura cujo `ataque` é o nome de uma arma do catálogo
--   (55 delas) sai com essa arma na mão direita; as de ataque natural (Presas,
--   Garras…) ficam SEM arma até as armas naturais entrarem no catálogo.
--   Sem armadura: Absorção 0, Defesa = Agilidade, Tipo Leve.
--   Com arma: L/M/P = dano_l/m/p + atributo de ajuste; Dano 100% = dano + Força;
--   25/50/75% arredondados pra cima. Sem arma: ataque e danos NULL.

with arma as (
  select c.id,
         i.slug, i.nome, i.dano, i.dano_l, i.dano_m, i.dano_p,
         case upper(coalesce(i.ajuste_atributo, ''))
           when 'FOR' then coalesce(c.forca, 0)
           when 'AGI' then coalesce(c.agilidade, 0)
           when 'PER' then coalesce(c.percepcao, 0)
           when 'AUR' then coalesce(c.aura, 0)
           when 'FIS' then coalesce(c.fisico, 0)
           when 'CAR' then coalesce(c.carisma, 0)
           else 0 end as bonus
    from public.criaturas c
    left join public.itens i on i.grupo = 'Armas' and i.nome = c.ataque
)
update public.criaturas c set
  equipamento     = case when a.slug is not null
                      then jsonb_build_array(jsonb_build_object('slug', a.slug, 'slot', 'mao_d'))
                      else '[]'::jsonb end,
  energia_fisica  = ceil(2 * sqrt(greatest(0, coalesce(c.peso, 0))) + coalesce(c.fisico, 0) - 1e-9),
  energia_heroica = ceil((12 + coalesce(c.aura, 0)) * coalesce(c.estagio, 0) - 1e-9),
  velocidade      = (coalesce(c.fisico, 0) + coalesce(c.agilidade, 0)) * coalesce(c.estagio, 0),
  armadura        = 'L',
  absorcao        = 0,
  defesa          = coalesce(c.agilidade, 0),
  ataque          = a.nome,
  dano_l          = case when a.slug is null then null else coalesce(a.dano_l, 0) + a.bonus end,
  dano_m          = case when a.slug is null then null else coalesce(a.dano_m, 0) + a.bonus end,
  dano_p          = case when a.slug is null then null else coalesce(a.dano_p, 0) + a.bonus end,
  dano_100        = case when a.slug is null then null else coalesce(a.dano, 0) + coalesce(c.forca, 0) end,
  dano_25         = case when a.slug is null then null else ceil(greatest(0, coalesce(a.dano, 0) + coalesce(c.forca, 0)) / 4.0) end,
  dano_50         = case when a.slug is null then null else ceil(greatest(0, coalesce(a.dano, 0) + coalesce(c.forca, 0)) / 2.0) end,
  dano_75         = case when a.slug is null then null else ceil(3 * greatest(0, coalesce(a.dano, 0) + coalesce(c.forca, 0)) / 4.0) end,
  atualizado_em   = now()
from arma a
where a.id = c.id;
