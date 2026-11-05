-- ============================================================
-- reforma-armaduras-vestimentas-2026-10-30.sql
-- ============================================================
-- Pedido do usuário em 30/10/2026. Gerado por um script (não editar à mão):
--   • ARMADURAS: 24 peças novas (8 por classe, com absorção/defesa/resistência
--     da tabela do usuário) × 15 nomes (4 reinos, 4 religiões, 3
--     especializações, 4 classes sociais) = 360 itens, e os 45 KITS
--     ("Conjunto de Armadura Leve de Crizagom"), que se desmontam nas peças.
--     Preço, peso, velocidade e karma vêm da peça antiga equivalente
--     ("Mantém os valores de hoje"), e a receita de fabricação também.
--   • VESTIMENTAS: uma linha por peça × material ("Colar de Ouro") e uma por
--     peça × material × profissão ("Blusa de Ladino", que diz na descrição
--     que é feita de algodão). Os itens de nome próprio ficam.
--   • PERSONAGENS: a armadura vira a do reino de origem quando ele está na
--     lista (Calco, Verrogar), senão Dantsem ou Eredra; a vestimenta vira a da
--     profissão; todos ganham Blusa e Calça de algodão da profissão, menos quem
--     já tem. Bônus de Sagração preservado; a durabilidade volta cheia.
--
-- ORDEM, por causa de dois gatilhos (itens-excluidos-somem-2026-09-27.sql):
-- criar os itens novos → migrar inventários e receitas → apagar os antigos.
-- Apagar antes faria o gatilho tirar a peça do inventário; gravar o inventário
-- com slug que ainda não existe faria o outro gatilho descartá-la.
-- Idempotente: na segunda vez não há slug antigo para migrar.
-- ============================================================

begin;

alter table public.itens add column if not exists conjunto text;
comment on column public.itens.conjunto is 'Peças idênticas de uma armadura (e o kit) dividem o valor, ex.: leve-crizagom. Ver bonusDeConjunto.';

-- Cópias de segurança (sem política de RLS: só o banco lê).
create table if not exists public.backup_reforma_itens_2026_10_30 as
  select * from public.itens where grupo in ('Armaduras', 'Vestimentas');
create table if not exists public.backup_reforma_inventarios_2026_10_30 as
  select id, inventario, inventario_versao, now() as copiado_em from public.personagens;
create table if not exists public.backup_reforma_receitas_2026_10_30 as
  select r.* from public.receitas r join public.itens i on i.slug = r.resultado_slug where i.grupo in ('Armaduras', 'Vestimentas');
alter table public.backup_reforma_itens_2026_10_30 enable row level security;
alter table public.backup_reforma_inventarios_2026_10_30 enable row level security;
alter table public.backup_reforma_receitas_2026_10_30 enable row level security;

create temp table _peca (chave text, nome text, slot text, classe text, abs int, def int, res int, base text, velho text) on commit drop;
insert into _peca values
  ('galea', 'Gálea', 'cabeca', 'L', 1, 3, 1, 'elmo-leve', 'galea'),
  ('colete', 'Colete', 'dorso', 'L', 2, 3, 2, 'peitoral-leve', 'colete'),
  ('ombreira', 'Ombreira', 'ombro', 'L', 0, 2, 0, 'ombreiras-leve', 'ombreiras'),
  ('escudo_broquel', 'Escudo Broquel', 'mao', 'L', 3, 3, 3, 'escudo-leve', 'escudo_broquel'),
  ('bracadeira', 'Braçadeira', 'braco', 'L', 0, 2, 0, 'bracos-leve', 'bracadeiras'),
  ('calca', 'Calça', 'perna', 'L', 1, 2, 1, 'pernas-leve', 'calca'),
  ('caneleira', 'Caneleira', 'canela', 'L', 0, 2, 0, 'caneleiras-leve', 'caneleiras_de_couro'),
  ('coturno', 'Coturno', 'pe', 'L', 0, 2, 0, 'botas-leve', 'botas_de_couro'),
  ('elmo_aberto', 'Elmo Aberto', 'cabeca', 'M', 2, 1, 2, 'elmo-medio', 'elmo'),
  ('cota_parcial', 'Cota Parcial', 'dorso', 'M', 3, 2, 3, 'peitoral-medio', 'cota_de_malha'),
  ('espaldar', 'Espaldar', 'ombro', 'M', 1, 1, 1, 'ombreiras-medio', 'espaldares_de_malha'),
  ('escudo_aquecedor', 'Escudo Aquecedor', 'mao', 'M', 5, 2, 5, 'escudo-medio', 'escudo_aquecedor'),
  ('avambraco', 'Avambraço', 'braco', 'M', 1, 1, 1, 'bracos-medio', 'manoplas_de_malha'),
  ('greva', 'Greva', 'perna', 'M', 2, 2, 2, 'pernas-medio', 'calca_de_malha'),
  ('perneira', 'Perneira', 'canela', 'M', 1, 1, 1, 'caneleiras-medio', 'caneleiras_de_malha'),
  ('bota_media', 'Bota', 'pe', 'M', 1, 1, 1, 'botas-medio', 'botas_de_malha'),
  ('elmo_fechado', 'Elmo Fechado', 'cabeca', 'P', 3, 0, 3, 'elmo-pesado', 'armet'),
  ('cota_completa', 'Cota Completa', 'dorso', 'P', 4, 1, 4, 'peitoral-pesado', 'peitoral_de_aco'),
  ('espaldar_pesado', 'Espaldar Pesado', 'ombro', 'P', 2, 0, 2, 'ombreiras-pesado', 'ombreiras_de_aco'),
  ('escudo_pipa', 'Escudo Pipa', 'mao', 'P', 7, 1, 7, 'escudo-pesado', 'escudo_pipa'),
  ('manopla', 'Manopla', 'braco', 'P', 2, 0, 2, 'bracos-pesado', 'manoplas_de_aco'),
  ('greva_fechada', 'Greva Fechada', 'perna', 'P', 3, 1, 3, 'pernas-pesado', 'greva_de_aco'),
  ('perneira_pesada', 'Perneira Pesada', 'canela', 'P', 2, 0, 2, 'caneleiras-pesado', 'caneleiras_de_aco'),
  ('bota_pesada', 'Bota Pesada', 'pe', 'P', 2, 0, 2, 'botas-pesado', 'botas_de_aco');
create temp table _var (chave text, nome text, frase text) on commit drop;
insert into _var values
  ('calco', 'Calco', 'no estilo de Calco'),
  ('dantsem', 'Dantsem', 'no estilo de Dantsem'),
  ('verrogar', 'Verrogar', 'no estilo de Verrogar'),
  ('eredra', 'Eredra', 'no estilo de Eredra'),
  ('blator', 'Blator', 'com os símbolos de Blator'),
  ('crezir', 'Crezir', 'com os símbolos de Crezir'),
  ('crizagom', 'Crizagom', 'com os símbolos de Crizagom'),
  ('parom', 'Parom', 'com os símbolos de Parom'),
  ('gladiador', 'Gladiador', 'no feitio dos gladiadores'),
  ('cavaleiro', 'Cavaleiro', 'no feitio dos cavaleiros'),
  ('arqueiro', 'Arqueiro', 'no feitio dos arqueiros'),
  ('nobre', 'Nobre', 'no feitio dos nobres'),
  ('livre', 'Livre', 'no feitio dos homens livres'),
  ('selvagem', 'Selvagem', 'no feitio dos selvagens'),
  ('mercenario', 'Mercenário', 'no feitio dos mercenários');
create temp table _vbase (base text, generico text, fam text, gen text, slot text, mat text, mat_nome text, modelo text, peso numeric, fonte text, preco int) on commit drop;
insert into _vbase values
  ('chapeu-couro', 'chapeu_couro', 'Chapéu', 'm', 'cabeca', 'couro', 'Couro', 'chapeu_couro', 1, 'chapeu_couro', 100),
  ('chapeu-algodao', 'chapeu_algodao', 'Chapéu', 'm', 'cabeca', 'algodao', 'Algodão', 'chapeu_couro', 1, 'chapeu_palha', 20),
  ('chapeu-linho', 'chapeu_linho', 'Chapéu', 'm', 'cabeca', 'linho', 'Linho', 'chapeu_couro', 1, null, 1900),
  ('chapeu-seda', 'chapeu_seda', 'Chapéu', 'm', 'cabeca', 'seda', 'Seda', 'chapeu_couro', 1, 'chapeu_veludo', 4200),
  ('coroa-ouro', 'coroa_ouro', 'Coroa', 'f', 'cabeca', 'ouro', 'Ouro', 'coroa_ouro', 1, 'coroa_ouro', 2000),
  ('coroa-prata', 'coroa_prata', 'Coroa', 'f', 'cabeca', 'prata', 'Prata', 'coroa_ouro', 1, 'coroa_prata', 200),
  ('coroa-porcelana', 'coroa_porcelana', 'Coroa', 'f', 'cabeca', 'porcelana', 'Porcelana', 'coroa_ouro', 1, null, 1000),
  ('coroa-marfim', 'coroa_marfim', 'Coroa', 'f', 'cabeca', 'marfim', 'Marfim', 'coroa_ouro', 1, 'coroa_marfim', 4),
  ('tiara-ouro', 'tiara_ouro', 'Tiara', 'f', 'cabeca', 'ouro', 'Ouro', 'tiara_prata', 1, 'tiara_ouro', 2000),
  ('tiara-prata', 'tiara_prata', 'Tiara', 'f', 'cabeca', 'prata', 'Prata', 'tiara_prata', 1, 'tiara_prata', 200),
  ('tiara-porcelana', 'tiara_porcelana', 'Tiara', 'f', 'cabeca', 'porcelana', 'Porcelana', 'tiara_prata', 1, null, 1000),
  ('tiara-cobre', 'tiara_cobre', 'Tiara', 'f', 'cabeca', 'cobre', 'Cobre', 'tiara_prata', 1, 'tiara_cobre', 20),
  ('tiara-latao', 'tiara_latao', 'Tiara', 'f', 'cabeca', 'latao', 'Latão', 'tiara_prata', 1, 'tiara_latao', 2),
  ('tiara-marfim', 'tiara_marfim', 'Tiara', 'f', 'cabeca', 'marfim', 'Marfim', 'tiara_prata', 1, 'tiara_mafim', 4),
  ('capuz-couro', 'capuz_couro', 'Capuz', 'm', 'cabeca', 'couro', 'Couro', 'capuz_algodao', 0.5, 'capuz_couro', 100),
  ('capuz-algodao', 'capuz_algodao', 'Capuz', 'm', 'cabeca', 'algodao', 'Algodão', 'capuz_algodao', 0.5, 'capuz_algodao', 20),
  ('capuz-linho', 'capuz_linho', 'Capuz', 'm', 'cabeca', 'linho', 'Linho', 'capuz_algodao', 0.5, null, 1900),
  ('capuz-seda', 'capuz_seda', 'Capuz', 'm', 'cabeca', 'seda', 'Seda', 'capuz_algodao', 0.5, 'capuz_seda', 4200),
  ('mascara-ouro', 'mascara_ouro', 'Máscara', 'f', 'rosto', 'ouro', 'Ouro', 'mascara_nobre', 0.5, null, 2000),
  ('mascara-prata', 'mascara_prata', 'Máscara', 'f', 'rosto', 'prata', 'Prata', 'mascara_nobre', 0.5, null, 200),
  ('mascara-porcelana', 'mascara_porcelana', 'Máscara', 'f', 'rosto', 'porcelana', 'Porcelana', 'mascara_nobre', 0.5, 'mascara_nobre', 1000),
  ('mascara-cobre', 'mascara_cobre', 'Máscara', 'f', 'rosto', 'cobre', 'Cobre', 'mascara_nobre', 0.5, null, 20),
  ('mascara-latao', 'mascara_latao', 'Máscara', 'f', 'rosto', 'latao', 'Latão', 'mascara_nobre', 0.5, 'mascara_decorativa', 2),
  ('mascara-marfim', 'mascara_marfim', 'Máscara', 'f', 'rosto', 'marfim', 'Marfim', 'mascara_nobre', 0.5, 'mascara_marfim', 4),
  ('tapa-olho-ouro', 'tapa_olho_ouro', 'Tapa-olho', 'm', 'rosto', 'ouro', 'Ouro', 'mascara_nobre', 0.2, null, 2000),
  ('tapa-olho-prata', 'tapa_olho_prata', 'Tapa-olho', 'm', 'rosto', 'prata', 'Prata', 'mascara_nobre', 0.2, null, 200),
  ('tapa-olho-cobre', 'tapa_olho_cobre', 'Tapa-olho', 'm', 'rosto', 'cobre', 'Cobre', 'mascara_nobre', 0.2, null, 20),
  ('tapa-olho-latao', 'tapa_olho_latao', 'Tapa-olho', 'm', 'rosto', 'latao', 'Latão', 'mascara_nobre', 0.2, null, 2),
  ('tapa-olho-marfim', 'tapa_olho_marfim', 'Tapa-olho', 'm', 'rosto', 'marfim', 'Marfim', 'mascara_nobre', 0.2, null, 4),
  ('brincos-ouro', 'brinco_ouro', 'Brinco', 'm', 'orelha', 'ouro', 'Ouro', 'brinco_prata', 0.2, 'brinco_ouro', 2000),
  ('brincos-prata', 'brinco_prata', 'Brinco', 'm', 'orelha', 'prata', 'Prata', 'brinco_prata', 0.2, 'brinco_prata', 200),
  ('brincos-porcelana', 'brinco_porcelana', 'Brinco', 'm', 'orelha', 'porcelana', 'Porcelana', 'brinco_prata', 0.2, null, 1000),
  ('brincos-cobre', 'brinco_cobre', 'Brinco', 'm', 'orelha', 'cobre', 'Cobre', 'brinco_prata', 0.2, 'brinco_cobre', 20),
  ('brincos-latao', 'brinco_latao', 'Brinco', 'm', 'orelha', 'latao', 'Latão', 'brinco_prata', 0.2, 'brinco_latao', 2),
  ('brincos-marfim', 'brinco_marfim', 'Brinco', 'm', 'orelha', 'marfim', 'Marfim', 'brinco_prata', 0.2, 'brinco_marfim', 4),
  ('piercing-ouro', 'piercing_ouro', 'Piercing', 'm', 'orelha', 'ouro', 'Ouro', 'piercing_prata', 0.1, 'piercing_ouro', 2000),
  ('piercing-prata', 'piercing_prata', 'Piercing', 'm', 'orelha', 'prata', 'Prata', 'piercing_prata', 0.1, 'piercing_prata', 200),
  ('piercing-latao', 'piercing_latao', 'Piercing', 'm', 'orelha', 'latao', 'Latão', 'piercing_prata', 0.1, null, 2),
  ('piercing-marfim', 'piercing_marfim', 'Piercing', 'm', 'orelha', 'marfim', 'Marfim', 'piercing_prata', 0.1, null, 4),
  ('colar-ouro', 'colar_ouro', 'Colar', 'm', 'pescoco', 'ouro', 'Ouro', 'colar_prata', 0.3, 'colar_ouro', 2000),
  ('colar-prata', 'colar_prata', 'Colar', 'm', 'pescoco', 'prata', 'Prata', 'colar_prata', 0.3, 'colar_prata', 200),
  ('colar-porcelana', 'colar_porcelana', 'Colar', 'm', 'pescoco', 'porcelana', 'Porcelana', 'colar_prata', 0.3, null, 1000),
  ('colar-cobre', 'colar_cobre', 'Colar', 'm', 'pescoco', 'cobre', 'Cobre', 'colar_prata', 0.3, 'colar_cobre', 20),
  ('colar-latao', 'colar_latao', 'Colar', 'm', 'pescoco', 'latao', 'Latão', 'colar_prata', 0.3, 'colar_latao', 2),
  ('colar-marfim', 'colar_marfim', 'Colar', 'm', 'pescoco', 'marfim', 'Marfim', 'colar_prata', 0.3, 'colar_marfim', 4),
  ('pingente-ouro', 'pingente_ouro', 'Pingente', 'm', 'pescoco', 'ouro', 'Ouro', 'pingente_prata', 0.2, 'pingente_ouro', 2000),
  ('pingente-prata', 'pingente_prata', 'Pingente', 'm', 'pescoco', 'prata', 'Prata', 'pingente_prata', 0.2, 'pingente_prata', 200),
  ('pingente-porcelana', 'pingente_porcelana', 'Pingente', 'm', 'pescoco', 'porcelana', 'Porcelana', 'pingente_prata', 0.2, null, 1000),
  ('pingente-marfim', 'pingente_marfim', 'Pingente', 'm', 'pescoco', 'marfim', 'Marfim', 'pingente_prata', 0.2, null, 4),
  ('gargantilha-ouro', 'gargantilha_ouro', 'Gargantilha', 'f', 'pescoco', 'ouro', 'Ouro', 'gargantilha_prata', 0.2, 'gargantilha_ouro', 2000),
  ('gargantilha-prata', 'gargantilha_prata', 'Gargantilha', 'f', 'pescoco', 'prata', 'Prata', 'gargantilha_prata', 0.2, 'gargantilha_prata', 200),
  ('gargantilha-porcelana', 'gargantilha_porcelana', 'Gargantilha', 'f', 'pescoco', 'porcelana', 'Porcelana', 'gargantilha_prata', 0.2, null, 1000),
  ('gargantilha-marfim', 'gargantilha_marfim', 'Gargantilha', 'f', 'pescoco', 'marfim', 'Marfim', 'gargantilha_prata', 0.2, null, 4),
  ('cachecol-seda', 'cachecol_seda', 'Cachecol', 'm', 'pescoco', 'seda', 'Seda', 'cachecol_algodao', 0.3, 'cachecol_seda', 4200),
  ('cachecol-linho', 'cachecol_linho', 'Cachecol', 'm', 'pescoco', 'linho', 'Linho', 'cachecol_algodao', 0.3, 'cachecol_linho', 1900),
  ('cachecol-algodao', 'cachecol_algodao', 'Cachecol', 'm', 'pescoco', 'algodao', 'Algodão', 'cachecol_algodao', 0.3, 'cachecol_algodao', 20),
  ('lenco-seda', 'lenco_seda', 'Lenço', 'm', 'pescoco', 'seda', 'Seda', 'lenco_algodao', 0.1, 'lenco_seda', 4200),
  ('lenco-linho', 'lenco_linho', 'Lenço', 'm', 'pescoco', 'linho', 'Linho', 'lenco_algodao', 0.1, 'lenco_linho', 1900),
  ('lenco-algodao', 'lenco_algodao', 'Lenço', 'm', 'pescoco', 'algodao', 'Algodão', 'lenco_algodao', 0.1, 'lenco_algodao', 20),
  ('dragona-couro', 'dragona_couro', 'Dragona', 'f', 'ombro', 'couro', 'Couro', 'dragona_prata', 0.3, null, 100),
  ('dragona-algodao', 'dragona_algodao', 'Dragona', 'f', 'ombro', 'algodao', 'Algodão', 'dragona_prata', 0.3, 'dragona_cobre', 20),
  ('dragona-linho', 'dragona_linho', 'Dragona', 'f', 'ombro', 'linho', 'Linho', 'dragona_prata', 0.3, 'dragona_prata', 1900),
  ('dragona-seda', 'dragona_seda', 'Dragona', 'f', 'ombro', 'seda', 'Seda', 'dragona_prata', 0.3, 'dragona_ouro', 4200),
  ('medalha-ouro', 'medalha_ouro', 'Medalha', 'f', 'ombro', 'ouro', 'Ouro', 'medalha_prata', 0.2, 'medalha_ouro', 2000),
  ('medalha-prata', 'medalha_prata', 'Medalha', 'f', 'ombro', 'prata', 'Prata', 'medalha_prata', 0.2, 'medalha_prata', 200),
  ('medalha-porcelana', 'medalha_porcelana', 'Medalha', 'f', 'ombro', 'porcelana', 'Porcelana', 'medalha_prata', 0.2, null, 1000),
  ('medalha-cobre', 'medalha_cobre', 'Medalha', 'f', 'ombro', 'cobre', 'Cobre', 'medalha_prata', 0.2, 'medalha_cobre', 20),
  ('medalha-latao', 'medalha_latao', 'Medalha', 'f', 'ombro', 'latao', 'Latão', 'medalha_prata', 0.2, null, 2),
  ('medalha-marfim', 'medalha_marfim', 'Medalha', 'f', 'ombro', 'marfim', 'Marfim', 'medalha_prata', 0.2, null, 4),
  ('broche-ouro', 'broche_ouro', 'Broche', 'm', 'peito', 'ouro', 'Ouro', 'broche_prata', 0.3, 'broche_ouro', 2000),
  ('broche-prata', 'broche_prata', 'Broche', 'm', 'peito', 'prata', 'Prata', 'broche_prata', 0.3, 'broche_prata', 200),
  ('broche-porcelana', 'broche_porcelana', 'Broche', 'm', 'peito', 'porcelana', 'Porcelana', 'broche_prata', 0.3, null, 1000),
  ('broche-cobre', 'broche_cobre', 'Broche', 'm', 'peito', 'cobre', 'Cobre', 'broche_prata', 0.3, 'broche_cobre', 20),
  ('broche-latao', 'broche_latao', 'Broche', 'm', 'peito', 'latao', 'Latão', 'broche_prata', 0.3, 'broche_latao', 2),
  ('broche-marfim', 'broche_marfim', 'Broche', 'm', 'peito', 'marfim', 'Marfim', 'broche_prata', 0.3, 'broche_marfim', 4),
  ('tunica-couro', 'tunica_couro', 'Túnica', 'f', 'peito', 'couro', 'Couro', 'traje_simples', 1, null, 100),
  ('tunica-algodao', 'tunica_algodao', 'Túnica', 'f', 'peito', 'algodao', 'Algodão', 'traje_simples', 1, null, 20),
  ('tunica-linho', 'tunica_linho', 'Túnica', 'f', 'peito', 'linho', 'Linho', 'traje_simples', 1, null, 1900),
  ('tunica-seda', 'tunica_seda', 'Túnica', 'f', 'peito', 'seda', 'Seda', 'traje_simples', 1, null, 4200),
  ('blusa-couro', 'blusa_couro', 'Blusa', 'f', 'peito', 'couro', 'Couro', 'traje_simples', 1, 'traje_reforcado', 100),
  ('blusa-algodao', 'blusa_algodao', 'Blusa', 'f', 'peito', 'algodao', 'Algodão', 'traje_simples', 1, 'traje_simples', 20),
  ('blusa-linho', 'blusa_linho', 'Blusa', 'f', 'peito', 'linho', 'Linho', 'traje_simples', 1, 'traje_linho', 1900),
  ('blusa-seda', 'blusa_seda', 'Blusa', 'f', 'peito', 'seda', 'Seda', 'traje_simples', 1, 'traje_nobre', 4200),
  ('casaco-couro', 'casaco_couro', 'Casaco', 'm', 'peito', 'couro', 'Couro', 'casaco_algodao', 1.5, 'casaco_couro', 100),
  ('casaco-algodao', 'casaco_algodao', 'Casaco', 'm', 'peito', 'algodao', 'Algodão', 'casaco_algodao', 1.5, 'casaco_algodao', 20),
  ('casaco-linho', 'casaco_linho', 'Casaco', 'm', 'peito', 'linho', 'Linho', 'casaco_algodao', 1.5, 'casaco_nobre', 1900),
  ('casaco-seda', 'casaco_seda', 'Casaco', 'm', 'peito', 'seda', 'Seda', 'casaco_algodao', 1.5, 'casaco_decorativo', 4200),
  ('capa-couro', 'capa_couro', 'Capa', 'f', 'costas', 'couro', 'Couro', 'capa_simples', 1, 'capa_couro', 100),
  ('capa-algodao', 'capa_algodao', 'Capa', 'f', 'costas', 'algodao', 'Algodão', 'capa_simples', 1, 'capa_simples', 20),
  ('capa-linho', 'capa_linho', 'Capa', 'f', 'costas', 'linho', 'Linho', 'capa_simples', 1, 'capa', 1900),
  ('capa-seda', 'capa_seda', 'Capa', 'f', 'costas', 'seda', 'Seda', 'capa_simples', 1, 'capa_decorada', 4200),
  ('sobretudo-couro', 'sobretudo_couro', 'Sobretudo', 'm', 'costas', 'couro', 'Couro', 'sobretudo_simples', 1, 'sobretudo_completo', 100),
  ('sobretudo-algodao', 'sobretudo_algodao', 'Sobretudo', 'm', 'costas', 'algodao', 'Algodão', 'sobretudo_simples', 1, 'sobretudo_simples', 20),
  ('sobretudo-linho', 'sobretudo_linho', 'Sobretudo', 'm', 'costas', 'linho', 'Linho', 'sobretudo_simples', 1, null, 1900),
  ('sobretudo-seda', 'sobretudo_seda', 'Sobretudo', 'm', 'costas', 'seda', 'Seda', 'sobretudo_simples', 1, 'sobretudo_luxuoso', 4200),
  ('calca-couro', 'calca_couro', 'Calça', 'f', 'perna', 'couro', 'Couro', 'calca_algodao', 0.6, 'calca_couro_fina', 100),
  ('calca-algodao', 'calca_algodao', 'Calça', 'f', 'perna', 'algodao', 'Algodão', 'calca_algodao', 0.6, 'calca_algodao', 20),
  ('calca-linho', 'calca_linho', 'Calça', 'f', 'perna', 'linho', 'Linho', 'calca_algodao', 0.6, 'calca_linho', 1900),
  ('calca-seda', 'calca_seda', 'Calça', 'f', 'perna', 'seda', 'Seda', 'calca_algodao', 0.6, 'calca_seda', 4200),
  ('bombacha-couro', 'bombacha_couro', 'Bombacha', 'f', 'perna', 'couro', 'Couro', 'bombacha_algodao', 0.6, 'bombacha_couro', 100),
  ('bombacha-algodao', 'bombacha_algodao', 'Bombacha', 'f', 'perna', 'algodao', 'Algodão', 'bombacha_algodao', 0.6, 'bombacha_algodao', 20),
  ('bombacha-linho', 'bombacha_linho', 'Bombacha', 'f', 'perna', 'linho', 'Linho', 'bombacha_algodao', 0.6, null, 1900),
  ('bombacha-seda', 'bombacha_seda', 'Bombacha', 'f', 'perna', 'seda', 'Seda', 'bombacha_algodao', 0.6, null, 4200),
  ('anel-ouro', 'anel_ouro', 'Anel', 'm', 'dedo', 'ouro', 'Ouro', 'anel_prata', 0.3, 'anel_ouro', 2000),
  ('anel-prata', 'anel_prata', 'Anel', 'm', 'dedo', 'prata', 'Prata', 'anel_prata', 0.3, 'anel_prata', 200),
  ('anel-latao', 'anel_latao', 'Anel', 'm', 'dedo', 'latao', 'Latão', 'anel_prata', 0.3, 'anel_latao', 2),
  ('anel-marfim', 'anel_marfim', 'Anel', 'm', 'dedo', 'marfim', 'Marfim', 'anel_prata', 0.3, 'anel_marfim', 4),
  ('bracelete-ouro', 'bracelete_ouro', 'Bracelete', 'm', 'pulso', 'ouro', 'Ouro', 'bracelete_prata', 0.5, 'bracelete_ouro', 2000),
  ('bracelete-prata', 'bracelete_prata', 'Bracelete', 'm', 'pulso', 'prata', 'Prata', 'bracelete_prata', 0.5, 'bracelete_prata', 200),
  ('bracelete-porcelana', 'bracelete_porcelana', 'Bracelete', 'm', 'pulso', 'porcelana', 'Porcelana', 'bracelete_prata', 0.5, null, 1000),
  ('bracelete-cobre', 'bracelete_cobre', 'Bracelete', 'm', 'pulso', 'cobre', 'Cobre', 'bracelete_prata', 0.5, 'bracelete_cobre', 20),
  ('bracelete-latao', 'bracelete_latao', 'Bracelete', 'm', 'pulso', 'latao', 'Latão', 'bracelete_prata', 0.5, 'bracelete_latal', 2),
  ('bracelete-marfim', 'bracelete_marfim', 'Bracelete', 'm', 'pulso', 'marfim', 'Marfim', 'bracelete_prata', 0.5, 'bracelete_marfim', 4),
  ('pulseira-ouro', 'pulseira_ouro', 'Pulseira', 'f', 'pulso', 'ouro', 'Ouro', 'bracelete_prata', 0.3, null, 2000),
  ('pulseira-prata', 'pulseira_prata', 'Pulseira', 'f', 'pulso', 'prata', 'Prata', 'bracelete_prata', 0.3, null, 200),
  ('pulseira-porcelana', 'pulseira_porcelana', 'Pulseira', 'f', 'pulso', 'porcelana', 'Porcelana', 'bracelete_prata', 0.3, null, 1000),
  ('pulseira-cobre', 'pulseira_cobre', 'Pulseira', 'f', 'pulso', 'cobre', 'Cobre', 'bracelete_prata', 0.3, null, 20),
  ('pulseira-latao', 'pulseira_latao', 'Pulseira', 'f', 'pulso', 'latao', 'Latão', 'bracelete_prata', 0.3, null, 2),
  ('pulseira-marfim', 'pulseira_marfim', 'Pulseira', 'f', 'pulso', 'marfim', 'Marfim', 'bracelete_prata', 0.3, null, 4),
  ('luva-pano-seda', 'luva_seda', 'Luva', 'f', 'pulso', 'seda', 'Seda', 'luva_algodao', 0.2, 'luva_seda', 4200),
  ('luva-pano-couro', 'luva_couro', 'Luva', 'f', 'pulso', 'couro', 'Couro', 'luva_algodao', 0.2, 'luva_couro_fina', 100),
  ('luva-pano-algodao', 'luva_algodao', 'Luva', 'f', 'pulso', 'algodao', 'Algodão', 'luva_algodao', 0.2, 'luva_algodao', 20),
  ('sandalia-couro', 'sandalia_couro', 'Sandália', 'f', 'pe', 'couro', 'Couro', 'sandalias', 1, 'sandalias', 100),
  ('sandalia-algodao', 'sandalia_algodao', 'Sandália', 'f', 'pe', 'algodao', 'Algodão', 'sandalias', 1, null, 20),
  ('sandalia-linho', 'sandalia_linho', 'Sandália', 'f', 'pe', 'linho', 'Linho', 'sandalias', 1, null, 1900),
  ('sandalia-seda', 'sandalia_seda', 'Sandália', 'f', 'pe', 'seda', 'Seda', 'sandalias', 1, null, 4200),
  ('sapato-couro', 'sapato_couro', 'Sapato', 'm', 'pe', 'couro', 'Couro', 'sandalias', 1, null, 100),
  ('sapato-algodao', 'sapato_algodao', 'Sapato', 'm', 'pe', 'algodao', 'Algodão', 'sandalias', 1, null, 20),
  ('sapato-linho', 'sapato_linho', 'Sapato', 'm', 'pe', 'linho', 'Linho', 'sandalias', 1, null, 1900),
  ('sapato-seda', 'sapato_seda', 'Sapato', 'm', 'pe', 'seda', 'Seda', 'sandalias', 1, null, 4200);
create temp table _vvelho (velho text, base text) on commit drop;
insert into _vvelho values
  ('chapeu_couro', 'chapeu-couro'),
  ('chapeu_palha', 'chapeu-algodao'),
  ('chapeu_veludo', 'chapeu-seda'),
  ('coroa_cobre', null),
  ('coroa_latao', null),
  ('coroa_marfim', 'coroa-marfim'),
  ('coroa_ouro', 'coroa-ouro'),
  ('coroa_prata', 'coroa-prata'),
  ('tiara_cobre', 'tiara-cobre'),
  ('tiara_ouro', 'tiara-ouro'),
  ('tiara_latao', 'tiara-latao'),
  ('tiara_prata', 'tiara-prata'),
  ('tiara_mafim', 'tiara-marfim'),
  ('capa_couro', 'capa-couro'),
  ('capa_decorada', 'capa-seda'),
  ('capa', 'capa-linho'),
  ('capa_simples', 'capa-algodao'),
  ('sobretudo_completo', 'sobretudo-couro'),
  ('sobretudo_luxuoso', 'sobretudo-seda'),
  ('sobretudo_simples', 'sobretudo-algodao'),
  ('anel_cobre', 'anel-latao'),
  ('anel_ouro', 'anel-ouro'),
  ('anel_latao', 'anel-latao'),
  ('anel_prata', 'anel-prata'),
  ('anel_marfim', 'anel-marfim'),
  ('dragona_cobre', 'dragona-algodao'),
  ('dragona_prata', 'dragona-linho'),
  ('dragona_ouro', 'dragona-seda'),
  ('brinco_cobre', 'brincos-cobre'),
  ('brinco_ouro', 'brincos-ouro'),
  ('brinco_latao', 'brincos-latao'),
  ('brinco_prata', 'brincos-prata'),
  ('brinco_marfim', 'brincos-marfim'),
  ('piercing_cobre', null),
  ('piercing_ouro', 'piercing-ouro'),
  ('piercing_prata', 'piercing-prata'),
  ('sandalias', 'sandalia-couro'),
  ('broche_cobre', 'broche-cobre'),
  ('broche_ouro', 'broche-ouro'),
  ('broche_latao', 'broche-latao'),
  ('broche_prata', 'broche-prata'),
  ('broche_marfim', 'broche-marfim'),
  ('casaco_algodao', 'casaco-algodao'),
  ('casaco_couro', 'casaco-couro'),
  ('casaco_decorativo', 'casaco-seda'),
  ('casaco_nobre', 'casaco-linho'),
  ('medalha_cobre', 'medalha-cobre'),
  ('medalha_ouro', 'medalha-ouro'),
  ('medalha_prata', 'medalha-prata'),
  ('pingente_cobre', null),
  ('pingente_ouro', 'pingente-ouro'),
  ('pingente_prata', 'pingente-prata'),
  ('traje_simples', 'blusa-algodao'),
  ('traje_reforcado', 'blusa-couro'),
  ('traje_linho', 'blusa-linho'),
  ('traje_nobre', 'blusa-seda'),
  ('bombacha_algodao', 'bombacha-algodao'),
  ('bombacha_couro', 'bombacha-couro'),
  ('calca_algodao', 'calca-algodao'),
  ('calca_couro_fina', 'calca-couro'),
  ('calca_linho', 'calca-linho'),
  ('calca_seda', 'calca-seda'),
  ('cachecol_algodao', 'cachecol-algodao'),
  ('cachecol_linho', 'cachecol-linho'),
  ('cachecol_seda', 'cachecol-seda'),
  ('colar_cobre', 'colar-cobre'),
  ('colar_latao', 'colar-latao'),
  ('colar_marfim', 'colar-marfim'),
  ('colar_ouro', 'colar-ouro'),
  ('colar_prata', 'colar-prata'),
  ('gargantilha_cobre', null),
  ('gargantilha_ouro', 'gargantilha-ouro'),
  ('gargantilha_prata', 'gargantilha-prata'),
  ('lenco_algodao', 'lenco-algodao'),
  ('lenco_linho', 'lenco-linho'),
  ('lenco_seda', 'lenco-seda'),
  ('bracelete_cobre', 'bracelete-cobre'),
  ('bracelete_ouro', 'bracelete-ouro'),
  ('bracelete_latal', 'bracelete-latao'),
  ('bracelete_prata', 'bracelete-prata'),
  ('bracelete_marfim', 'bracelete-marfim'),
  ('luva_algodao', 'luva-pano-algodao'),
  ('luva_couro_fina', 'luva-pano-couro'),
  ('luva_seda', 'luva-pano-seda'),
  ('capuz_algodao', 'capuz-algodao'),
  ('capuz_couro', 'capuz-couro'),
  ('capuz_seda', 'capuz-seda'),
  ('mascara_decorativa', 'mascara-latao'),
  ('mascara_nobre', 'mascara-porcelana'),
  ('mascara_marfim', 'mascara-marfim');
create temp table _prof (profissao text, chave text, plural text) on commit drop;
insert into _prof values
  ('Guerreiro', 'guerreiro', 'guerreiros'),
  ('Ladino', 'ladino', 'ladinos'),
  ('Sacerdote', 'sacerdote', 'sacerdotes'),
  ('Mago', 'mago', 'magos'),
  ('Rastreador', 'rastreador', 'rastreadores'),
  ('Bardo', 'bardo', 'bardos');

-- 1) As 360 peças de armadura.
insert into public.itens (slug, nome, base, slot_equip, descricao, absorcao, defesa, resistencia, tipo_armadura, conjunto, grupo, ocupa, armazena, porte, tipo, valor_latao, efeito, efeito_positivo, efeito_negativo, tipo_item, magia, nivel_magia, magico, categoria_equip, grupo_equipamento, maos_pequenino, maos_anao, maos_outras, forca_req, dano, alcance, ajuste_atributo, dano_l, dano_m, dano_p, grupo_armas, origem, icone, consumiveis, consumiveis_peso, tipo_equip, mod_vel, mod_kar, efeito_transborda, efeito_duracao_dias, tecnica)
select pc.chave || '_' || v.chave, pc.nome || ' de ' || v.nome, pc.base, pc.slot,
       pc.nome || ' da armadura ' || case pc.classe when 'L' then 'leve' when 'M' then 'média' else 'pesada' end || ', ' || v.frase || '.',
       pc.abs, nullif(pc.def, 0), pc.res, pc.classe,
       case pc.classe when 'L' then 'leve' when 'M' then 'media' else 'pesada' end || '-' || v.chave,
       o.grupo, o.ocupa, o.armazena, o.porte, o.tipo, o.valor_latao, o.efeito, o.efeito_positivo, o.efeito_negativo, o.tipo_item, o.magia, o.nivel_magia, o.magico, o.categoria_equip, o.grupo_equipamento, o.maos_pequenino, o.maos_anao, o.maos_outras, o.forca_req, o.dano, o.alcance, o.ajuste_atributo, o.dano_l, o.dano_m, o.dano_p, o.grupo_armas, o.origem, o.icone, o.consumiveis, o.consumiveis_peso, o.tipo_equip, o.mod_vel, o.mod_kar, o.efeito_transborda, o.efeito_duracao_dias, o.tecnica
  from _peca pc cross join _var v join public.itens o on o.slug = pc.velho
on conflict (slug) do nothing;

-- 2) Os 45 kits: soma o preço e o peso das peças; a descrição diz as peças e o bônus.
insert into public.itens (slug, nome, base, grupo, descricao, tipo_armadura, conjunto, valor_latao, ocupa, tipo, origem, icone, tipo_equip, magico)
select 'conjunto_' || c.chave || '_' || v.chave,
       'Conjunto de Armadura ' || c.nome || ' de ' || v.nome,
       'peitoral-' || c.base_suf, 'Armaduras',
       'Conjunto de armadura ' || lower(c.nome) || ' ' || v.frase || '. ' || c.descr,
       c.classe, c.chave || '-' || v.chave,
       (select sum(o.valor_latao) from _peca pc join public.itens o on o.slug = pc.velho where pc.classe = c.classe),
       (select sum(o.ocupa) from _peca pc join public.itens o on o.slug = pc.velho where pc.classe = c.classe),
       'S', 'Comum', 'ti-shield', 'equipamento', false
  from (values ('L', 'leve', 'Leve', 'leve', 'Peças: Gálea, Colete, Ombreira, Escudo Broquel, Braçadeira, Calça, Caneleira e Coturno. Com todas vestidas, idênticas e inteiras: +2 de Absorção e +4 de Defesa.'),
               ('M', 'media', 'Média', 'medio', 'Peças: Elmo Aberto, Cota Parcial, Espaldar, Escudo Aquecedor, Avambraço, Greva, Perneira e Bota. Com todas vestidas, idênticas e inteiras: +3 de Absorção e +3 de Defesa.'),
               ('P', 'pesada', 'Pesada', 'pesado', 'Peças: Elmo Fechado, Cota Completa, Espaldar Pesado, Escudo Pipa, Manopla, Greva Fechada, Perneira Pesada e Bota Pesada. Com todas vestidas, idênticas e inteiras: +4 de Absorção e +2 de Defesa.')) as c(classe, chave, nome, base_suf, descr)
  cross join _var v
on conflict (slug) do nothing;

-- 3) A receita da peça antiga passa para as 15 versões da peça nova.
insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais)
select pc.chave || '_' || v.chave, r.habilidade_key, r.dificuldade, r.dias, r.materiais
  from _peca pc cross join _var v join public.receitas r on r.resultado_slug = pc.velho
on conflict (resultado_slug) do nothing;

-- 4) Vestimenta por MATERIAL. O antigo de mesmo slug é atualizado no lugar;
--    o resto nasce copiando a linha antiga equivalente (ou a modelo da família).
update public.itens i set nome = b.fam || ' de ' || b.mat_nome, base = b.base, slot_equip = b.slot
  from _vbase b where i.slug = b.generico;
insert into public.itens (slug, nome, base, slot_equip, descricao, grupo, ocupa, armazena, porte, tipo, valor_latao, efeito, efeito_positivo, efeito_negativo, tipo_item, magia, nivel_magia, magico, categoria_equip, grupo_equipamento, maos_pequenino, maos_anao, maos_outras, forca_req, dano, alcance, ajuste_atributo, dano_l, dano_m, dano_p, grupo_armas, origem, icone, consumiveis, consumiveis_peso, tipo_equip, mod_vel, mod_kar, efeito_transborda, efeito_duracao_dias, tecnica)
select b.generico, b.fam || ' de ' || b.mat_nome, b.base, b.slot,
       coalesce(f.descricao, b.fam || ' ' || case b.gen when 'f' then 'feita' else 'feito' end || ' de ' || lower(b.mat_nome) || '.'),
       coalesce(f.grupo, m.grupo), coalesce(f.ocupa, b.peso), coalesce(f.armazena, m.armazena), coalesce(f.porte, m.porte), coalesce(f.tipo, m.tipo), coalesce(f.valor_latao, b.preco), f.efeito, f.efeito_positivo, f.efeito_negativo, coalesce(f.tipo_item, m.tipo_item), f.magia, f.nivel_magia, coalesce(f.magico, false), coalesce(f.categoria_equip, m.categoria_equip), coalesce(f.grupo_equipamento, m.grupo_equipamento), coalesce(f.maos_pequenino, m.maos_pequenino), coalesce(f.maos_anao, m.maos_anao), coalesce(f.maos_outras, m.maos_outras), coalesce(f.forca_req, m.forca_req), coalesce(f.dano, m.dano), coalesce(f.alcance, m.alcance), coalesce(f.ajuste_atributo, m.ajuste_atributo), coalesce(f.dano_l, m.dano_l), coalesce(f.dano_m, m.dano_m), coalesce(f.dano_p, m.dano_p), coalesce(f.grupo_armas, m.grupo_armas), coalesce(f.origem, m.origem), coalesce(f.icone, m.icone), coalesce(f.consumiveis, m.consumiveis), coalesce(f.consumiveis_peso, m.consumiveis_peso), coalesce(f.tipo_equip, m.tipo_equip), coalesce(f.mod_vel, m.mod_vel), coalesce(f.mod_kar, m.mod_kar), coalesce(f.efeito_transborda, false), f.efeito_duracao_dias, f.tecnica
  from _vbase b
  left join public.itens f on f.slug = b.fonte
  join public.itens m on m.slug = b.modelo
on conflict (slug) do nothing;
-- a receita do antigo vai para o genérico novo
insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais)
select b.generico, r.habilidade_key, r.dificuldade, r.dias, r.materiais
  from _vbase b join public.receitas r on r.resultado_slug = b.fonte
on conflict (resultado_slug) do nothing;

-- 5) Vestimenta por PROFISSÃO: cópia do genérico, com o nome da profissão.
insert into public.itens (slug, nome, base, slot_equip, descricao, grupo, ocupa, armazena, porte, tipo, valor_latao, efeito, efeito_positivo, efeito_negativo, tipo_item, magia, nivel_magia, magico, categoria_equip, grupo_equipamento, maos_pequenino, maos_anao, maos_outras, forca_req, dano, alcance, ajuste_atributo, dano_l, dano_m, dano_p, grupo_armas, origem, icone, consumiveis, consumiveis_peso, tipo_equip, mod_vel, mod_kar, efeito_transborda, efeito_duracao_dias, tecnica)
select b.generico || '_' || pr.chave, b.fam || ' de ' || pr.profissao, b.base, b.slot,
       b.fam || ' ' || case b.gen when 'f' then 'feita' else 'feito' end || ' de ' || lower(b.mat_nome) || ', ' || case b.gen when 'f' then 'usada' else 'usado' end || ' por ' || pr.plural || '.',
       g.grupo, g.ocupa, g.armazena, g.porte, g.tipo, g.valor_latao, g.efeito, g.efeito_positivo, g.efeito_negativo, g.tipo_item, g.magia, g.nivel_magia, g.magico, g.categoria_equip, g.grupo_equipamento, g.maos_pequenino, g.maos_anao, g.maos_outras, g.forca_req, g.dano, g.alcance, g.ajuste_atributo, g.dano_l, g.dano_m, g.dano_p, g.grupo_armas, g.origem, g.icone, g.consumiveis, g.consumiveis_peso, g.tipo_equip, g.mod_vel, g.mod_kar, g.efeito_transborda, g.efeito_duracao_dias, g.tecnica
  from _vbase b cross join _prof pr join public.itens g on g.slug = b.generico
on conflict (slug) do nothing;
insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais)
select b.generico || '_' || pr.chave, r.habilidade_key, r.dificuldade, r.dias, r.materiais
  from _vbase b cross join _prof pr join public.receitas r on r.resultado_slug = b.generico
on conflict (resultado_slug) do nothing;

-- 6) Os de nome próprio: só a base, quando a antiga sumiu.
update public.itens i set base = x.base from (values
  ('anel_bankdi', 'anel-marfim'),
  ('anel_camburiano', 'anel-ouro'),
  ('anel_coringa', 'anel-prata'),
  ('sandalias_aleteias', 'sandalia-couro'),
  ('traje_selimonio', 'blusa-seda'),
  ('amuleto_da_brasa', 'colar-cobre'),
  ('amuleto_da_mare', 'colar-marfim'),
  ('amuleto_da_rocha', 'colar-marfim'),
  ('amuleto_do_vento', 'colar-prata'),
  ('mascara_olhar_da_infamia', 'mascara-cobre')
) as x(slug, base) where i.slug = x.slug;

-- 7) OS PERSONAGENS. Armadura pelo reino; vestimenta pela profissão.
with alvo as (
  select p.id, coalesce(pr.chave, 'guerreiro') as prof,
         case p.reino when 'Calco' then 'calco' when 'Verrogar' then 'verrogar' when 'Dantsem' then 'dantsem' when 'Eredra' then 'eredra'
              else (array['dantsem', 'eredra'])[1 + (p.id % 2)::int] end as var
    from public.personagens p left join _prof pr on pr.profissao = p.profissao
   where jsonb_typeof(p.inventario->'itens') = 'array'
), novo as (
  select a.id, coalesce(jsonb_agg(
    case
      when pc.chave is not null then
        (e - 'res' - 'quebrada') || jsonb_build_object('slug', pc.chave || '_' || a.var)
        || case when (e->>'equipado')::boolean is true and coalesce(e->>'slot', '') not in ('mao_d', 'mao_e', 'saque_d', 'saque_e')
                then jsonb_build_object('slot', pc.slot) else '{}'::jsonb end
      when vb.generico is not null then
        e || jsonb_build_object('slug', vb.generico || '_' || a.prof)
        || case when e ? 'vesteSlot' then jsonb_build_object('vesteSlot', vb.slot) else '{}'::jsonb end
      else e end order by t.ord), '[]'::jsonb) as itens
    from alvo a
    join public.personagens p on p.id = a.id
    cross join lateral jsonb_array_elements(p.inventario->'itens') with ordinality as t(e, ord)
    left join _peca pc on pc.velho = e->>'slug'
    left join _vvelho vv on vv.velho = e->>'slug'
    left join _vbase vb on vb.base = vv.base
   group by a.id
)
update public.personagens p set inventario = jsonb_set(p.inventario, '{itens}', n.itens)
  from novo n where n.id = p.id and n.itens is distinct from p.inventario->'itens';

-- 8) Blusa e Calça de algodão da profissão para quem ainda não tem.
with alvo as (
  select p.id, coalesce(pr.chave, 'guerreiro') as prof,
         exists (select 1 from jsonb_array_elements(p.inventario->'itens') e join public.itens i on i.slug = e->>'slug' where i.base like 'blusa-%') as tem_blusa,
         exists (select 1 from jsonb_array_elements(p.inventario->'itens') e join public.itens i on i.slug = e->>'slug' where i.base like 'calca-%') as tem_calca
    from public.personagens p left join _prof pr on pr.profissao = p.profissao
   where jsonb_typeof(p.inventario->'itens') = 'array'
)
update public.personagens p set inventario = jsonb_set(p.inventario, '{itens}', (p.inventario->'itens')
  || case when a.tem_blusa then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
       'instanceId', (floor(extract(epoch from clock_timestamp()) * 1000))::bigint::text || '-' || substr(md5(random()::text), 1, 6),
       'slug', 'blusa_algodao_' || a.prof, 'quantidade', 1)) end
  || case when a.tem_calca then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
       'instanceId', (floor(extract(epoch from clock_timestamp()) * 1000) + 1)::bigint::text || '-' || substr(md5(random()::text), 1, 6),
       'slug', 'calca_algodao_' || a.prof, 'quantidade', 1)) end)
  from alvo a where a.id = p.id and not (a.tem_blusa and a.tem_calca);

-- Trava: o gatilho de exclusão tiraria do inventário, calado, quem ainda
-- tivesse um antigo. Se sobrou algum, aborta tudo.
do $$
declare v int;
begin
  select count(*) into v from public.personagens p, jsonb_array_elements(p.inventario->'itens') e
   where e->>'slug' in (select velho from _peca union select velho from _vvelho where velho not in (select generico from _vbase));
  if v > 0 then raise exception 'reforma: % instância(s) ainda com item antigo', v; end if;
end $$;

-- 9) Por último, saem os antigos (a receita vai junto, em cascata).
delete from public.itens where slug in (select velho from _peca);
delete from public.itens where slug in (select velho from _vvelho) and slug not in (select generico from _vbase);

-- Conferência: nada de instância órfã, todo personagem com blusa e calça.
do $$
declare v_orfas int; v_sem int; v_arm int; v_ves int; v_kit int; v_rec int;
begin
  select count(*) into v_orfas from public.personagens p, jsonb_array_elements(p.inventario->'itens') e
   where not exists (select 1 from public.itens i where i.slug = e->>'slug');
  select count(*) into v_sem from public.personagens p where jsonb_typeof(p.inventario->'itens') = 'array' and (
    not exists (select 1 from jsonb_array_elements(p.inventario->'itens') e join public.itens i on i.slug = e->>'slug' where i.base like 'blusa-%')
    or not exists (select 1 from jsonb_array_elements(p.inventario->'itens') e join public.itens i on i.slug = e->>'slug' where i.base like 'calca-%'));
  select count(*) into v_arm from public.itens where conjunto is not null and slot_equip is not null;
  select count(*) into v_kit from public.itens where conjunto is not null and slot_equip is null;
  select count(*) into v_ves from public.itens where grupo = 'Vestimentas';
  select count(*) into v_rec from public.receitas;
  if v_orfas > 0 then raise exception 'reforma: % instância(s) órfã(s)', v_orfas; end if;
  if v_sem > 0 then raise exception 'reforma: % personagem(ns) sem blusa ou calça', v_sem; end if;
  if v_arm <> 360 or v_kit <> 45 then raise exception 'reforma: % peças e % kits (esperado 360 e 45)', v_arm, v_kit; end if;
end $$;

commit;
