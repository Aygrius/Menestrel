-- ============================================================
-- resistencia_extrema.grupo_armas = 'Intermitente'  (achado 09/09/2026)
-- ============================================================
-- O valor da coluna `uso` vazou para `grupo_armas` em algum import. Nenhum
-- grupo de armas se chama 'Intermitente', então com a restrição virando
-- regra (Fase 1 das técnicas) a Resistência Extrema ficaria impossível de
-- ativar com qualquer arma.
--
-- 'Livre' é o valor das irmãs de mesma natureza (buff de resistência sem
-- exigência de empunhadura): furia, heroismo, resistencia_a_dor,
-- animosidade, segundo_folego.
-- ============================================================

begin;

update tecnicas
   set grupo_armas = 'Livre'
 where key = 'resistencia_extrema'
   and grupo_armas = 'Intermitente';

-- Esperado: 1 linha, grupo_armas 'Livre', uso 'Único'.
select key, uso, grupo_armas, grupo_armaduras
  from tecnicas
 where key = 'resistencia_extrema';

-- Nenhuma outra técnica deve ter um `uso` na coluna de armas.
-- Esperado: 0 linhas.
select key, uso, grupo_armas
  from tecnicas
 where grupo_armas in ('Único', 'Intermitente', 'Livre ')
    or grupo_armas = uso;

commit;   -- troque por  rollback;  se algo não fechar
