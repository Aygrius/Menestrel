-- ============================================================
-- A proteção "Pesado" sai do jogo — 30/10/2026
-- ============================================================
-- "Remover a informação 'Este item protege 20 de pesado.' e a mecânica, pois
-- os itens dentro de um recipiente já possuem um ajuste para amenizar a
-- carga" (usuário).
--
-- Confirmado no código (calcCarga, 07-inventario/inventario.jsx): o item
-- dentro de recipiente pesa 75% (PESO_FATOR_EM_CONTAINER) e o recipiente
-- ainda SOMA capacidade pelo `armazena`. "Protege N de Pesado" era um
-- terceiro alívio — teto na barra Pesado enquanto a peça está vestida. A
-- mecânica sai do cliente (o leitor de efeitos deixa de reconhecer
-- "Pesado"); este script tira o texto dos 15 itens que o tinham.
--
-- 13 itens tinham só "Protege N de Pesado." → o campo fica vazio.
-- Cinto Élfico e Cinturão Portolivrense: "Protege 5 de Pesado e 5 de
-- Desonra." → "Protege 5 de Desonra."
--
-- Desfazer:
--   update itens set efeito_positivo = 'Protege 20 de Pesado.' where slug in ('alforge','alforge_duplo','estojo');
--   update itens set efeito_positivo = 'Protege 5 de Pesado.' where slug in ('algibeira','algibeira_grande');
--   update itens set efeito_positivo = 'Protege 10 de Pesado.' where slug in ('aljava','aljava_reforcada','cinto_acessorios','cinturao_quadril');
--   update itens set efeito_positivo = 'Protege 15 de Pesado.' where slug in ('bainha','bainha_5','cinto_suporte','cinturao_placas');
--   update itens set efeito_positivo = 'Protege 5 de Pesado e 5 de Desonra.' where slug in ('cinto_elfico','cinturao_portolivrense');

update public.itens
set efeito_positivo = case
      when efeito_positivo ~* '^\s*Protege \d+ de Pesado\.?\s*$' then null
      else regexp_replace(efeito_positivo, 'Protege \d+ de Pesado e ', 'Protege ', 'i')
    end,
    atualizado_em = now()
where efeito_positivo ilike '%pesado%';
