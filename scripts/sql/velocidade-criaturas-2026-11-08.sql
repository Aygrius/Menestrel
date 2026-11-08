-- Velocidade das criaturas na conta nova (08/11/2026).
-- Antes: (Físico + Agilidade) × Estágio  → de −19 a 1584.
-- Agora: 15 + 3 × Agilidade + Físico + ⌊Estágio / 3⌋, piso 0
--        (velocidade() em src/09-bestiario/criatura-formulas.jsx).
-- Batalhas já abertas guardam a velocidade no snapshot e não mudam.

begin;

update criaturas
   set velocidade = greatest(0,
         15 + 3 * coalesce(agilidade, 0) + coalesce(fisico, 0)
            + floor(coalesce(estagio, 0) / 3.0)::int)
 where velocidade is distinct from greatest(0,
         15 + 3 * coalesce(agilidade, 0) + coalesce(fisico, 0)
            + floor(coalesce(estagio, 0) / 3.0)::int);

-- Conferência (rodado em 08/11/2026): 164 criaturas, mediana 24, de 9 a 80, 44 com 30 ou mais.
select percentile_cont(0.5) within group (order by velocidade) as mediana,
       min(velocidade), max(velocidade),
       count(*) filter (where velocidade >= 30) as com_acao_extra
  from criaturas;

commit;
