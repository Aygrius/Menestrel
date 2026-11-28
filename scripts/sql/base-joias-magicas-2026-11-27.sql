-- As quatro joias mágicas sem base (27/11/2026). Sem base, a pintura não
-- tinha de onde vir; o material sai da descrição do catálogo.
--   Juízo Perfeito, Lágrimas de Ganis, Outras Memórias: "jóia sofisticada de prata" → anel-prata
--   Maldição de Menard: "jóia rústica de marfim", slot pulso → bracelete-marfim
update itens set base = 'anel-prata'
 where slug in ('anel_juizo_perfeito', 'anel_lagrima_de_ganis', 'anel_outras_memorias') and base is null;
update itens set base = 'bracelete-marfim'
 where slug = 'bracelete_maldicao_de_menard' and base is null;
