-- O "Arco" usa a pintura do arco leve (28/11/2026, usuário: 'O "Arco" vai usar
-- a imagem de "Arco Leve"'). O grupo dele é PM — sem isto, a mão desenharia o
-- arco médio. `itens.arte` é a pintura escolhida para o exemplar e ganha da escada.
update itens set arte = 'arma-arco-leve' where slug = 'arco' and arte is null;
