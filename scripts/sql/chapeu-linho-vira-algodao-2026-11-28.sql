-- O chapéu de linho sai do vocabulário (28/11/2026). O usuário excluiu o
-- Chapéu de Linho do catálogo, e os dois exemplares que ainda usavam a base
-- (Chapéu de Mago e de Sacerdote) passam para o algodão — escolha do usuário.
-- Os slugs ficam como estão: inventários já guardam chapeu_linho_mago/_sacerdote.
update itens
set base = 'chapeu-algodao',
    descricao = replace(descricao, 'feito de linho', 'feito de algodão')
where base = 'chapeu-linho'
  and slug in ('chapeu_linho_mago', 'chapeu_linho_sacerdote');
