-- ============================================================
-- SLOTS E STATUS DA FICHA — proposta aprovada em 26/10/2026
-- (modelo: artifact c6dbd3d6; decisões 1–10 da rodada 7)
-- ============================================================
-- 1) Colunas novas no catálogo:
--    tipo_equip  — 'equipamento' | 'vestimenta' | 'adorno'
--    mod_vel     — ajuste passivo de Velocidade enquanto equipado/vestido
--    mod_kar     — ajuste passivo de Karma (máximo) enquanto equipado/vestido
-- 2) Vocabulário novo de regiões (slot_equip), 17 regiões:
--    cabeca · orelha · rosto · pescoco · ombro · costas · dorso · peito ·
--    braco · dedo · pulso · mao · perna · cintura · canela · pe · alforje
--    (peito antigo = armadura → dorso; corpo antigo = roupa → peito)
-- 3) Padrões por classe (vereditos):
--    Armadura  P: DEF 1, VEL −2, KAR −15, ABS 3, RES 3
--              M: DEF 2, VEL −1, KAR −10, ABS 2, RES 2   (dec. 3)
--              L: DEF 3, VEL  0, KAR  −5, ABS 1, RES 1   (dec. 2: grevas e
--                 caneleiras na MESMA escada das demais)
--    Escudo    P: KAR −15, VEL −3, ABS 10, RES 5          (dec. 7)
--              M: KAR −10, VEL −2, ABS  6, RES 4
--              L: KAR  −5, VEL −1, ABS  4, RES 3
--    Arma (sufixo de grupo_armas) P: KAR −10, VEL −2, RES 10
--                                 M: KAR  −5, VEL −1, RES 7
--                                 L: RES 3
--    Joia por material: ouro KAR +3 · prata +2 · cobre/latão/marfim +1.
--    Fama (dec. 8: a barra REP/Desonra funciona como as demais — melhorar
--    a fama grava como "Protege N de Desonra", manchar como "Aumenta").
-- 4) Instâncias nos inventários NÃO são tocadas: o código (01-core) ganha
--    aliases dos slots antigos (ombros→ombro etc.).
-- Backup: backup_itens_slots_2026_10_26
-- ============================================================

begin;

-- ── backup ──────────────────────────────────────────────────
create table if not exists backup_itens_slots_2026_10_26 as
  select id, slug, nome, grupo, slot_equip, categoria_equip, tipo_armadura,
         defesa, absorcao, resistencia, efeito_positivo, efeito_negativo
  from itens
  where slot_equip is not null
     or grupo in ('Vestimentas','Armaduras','Armas','Recipientes');

-- ── colunas novas ───────────────────────────────────────────
alter table itens add column if not exists tipo_equip text;
alter table itens add column if not exists mod_vel smallint not null default 0;
alter table itens add column if not exists mod_kar smallint not null default 0;

-- ── vocabulário novo de regiões ─────────────────────────────
update itens set slot_equip = 'dorso'  where slot_equip = 'peito';
update itens set slot_equip = 'peito'  where slot_equip = 'corpo';
update itens set slot_equip = 'orelha' where slot_equip = 'orelhas';
update itens set slot_equip = 'dedo'   where slot_equip = 'dedos';
update itens set slot_equip = 'mao'    where slot_equip = 'maos';
update itens set slot_equip = 'perna'  where slot_equip = 'pernas';
update itens set slot_equip = 'pe'     where slot_equip = 'pes';
update itens set slot_equip = 'ombro'  where slot_equip = 'ombros';
update itens set slot_equip = 'braco'  where slot_equip = 'bracos';

-- máscaras saem da cabeça para o ROSTO (região nova)
update itens set slot_equip = 'rosto'
  where slot_equip = 'cabeca' and nome ~* 'máscara|mascara|olhar da inf';
-- braceletes são pulseiras: vão para o PULSO (região nova)
update itens set slot_equip = 'pulso' where slug like 'bracelete_%';
-- broches moram no PEITO
update itens set slot_equip = 'peito' where slug like 'broche_%';
-- ALFORJE (região nova): aljavas, algibeiras, alforges e bainhas
update itens set slot_equip = 'alforje'
  where slug in ('aljava','aljava_reforcada','algibeira','algibeira_grande',
                 'algibeira_planense','alforge','alforge_duplo','bainha','bainha_5');

-- ── tipo_equip ──────────────────────────────────────────────
update itens set tipo_equip = 'equipamento'
  where categoria_equip in ('armadura','arma');
update itens set tipo_equip = 'adorno'
  where slot_equip is not null and tipo_equip is null
    and (nome ~* 'tiara|coroa|anel|brinco|piercing|colar|amuleto|bracelete|pulseira|broche|medalha|pingente|dragona|gargantilha|cinto|cinturão|cinturao'
         or (grupo = 'Vestimentas' and nome ~* '^botas? '));
update itens set tipo_equip = 'vestimenta'
  where slot_equip is not null and tipo_equip is null
    and grupo in ('Vestimentas','Recipientes');

-- ── padrões por classe: ARMADURAS (couro/malha/aço = L/M/P) ─
update itens set defesa = 1, mod_vel = -2, mod_kar = -15, absorcao = 3, resistencia = 3
  where categoria_equip = 'armadura' and tipo_armadura = 'P' and slug not like 'escudo%';
update itens set defesa = 2, mod_vel = -1, mod_kar = -10, absorcao = 2, resistencia = 2
  where categoria_equip = 'armadura' and tipo_armadura = 'M' and slug not like 'escudo%';
update itens set defesa = 3, mod_vel =  0, mod_kar =  -5, absorcao = 1, resistencia = 1
  where categoria_equip = 'armadura' and tipo_armadura = 'L' and slug not like 'escudo%';

-- ── ESCUDOS (decisão 7) ─────────────────────────────────────
update itens set defesa = null, mod_vel = -3, mod_kar = -15, absorcao = 10, resistencia = 5
  where slug like 'escudo%' and tipo_armadura = 'P';
update itens set defesa = null, mod_vel = -2, mod_kar = -10, absorcao = 6, resistencia = 4
  where slug like 'escudo%' and tipo_armadura = 'M';
update itens set defesa = null, mod_vel = -1, mod_kar =  -5, absorcao = 4, resistencia = 3
  where slug like 'escudo%' and tipo_armadura = 'L';

-- ── ARMAS (peso = sufixo do grupo: CL/CM/CP, EL/EM/EP, PL/PM/PP) ─
update itens set mod_vel = -2, mod_kar = -10, resistencia = 10
  where categoria_equip = 'arma' and slug not like 'escudo%' and grupo_armas ~ '^[A-Z]P$';
update itens set mod_vel = -1, mod_kar = -5, resistencia = 7
  where categoria_equip = 'arma' and slug not like 'escudo%' and grupo_armas ~ '^[A-Z]M$';
update itens set mod_vel = 0, mod_kar = 0, resistencia = 3
  where categoria_equip = 'arma' and slug not like 'escudo%' and grupo_armas ~ '^[A-Z]L$';

-- ── JOIAS: Karma por material ───────────────────────────────
update itens set mod_kar = 3 where tipo_equip = 'adorno' and slug ~ '_ouro$';
update itens set mod_kar = 2 where tipo_equip = 'adorno' and slug ~ '_prata$';
update itens set mod_kar = 1 where tipo_equip = 'adorno' and slug ~ '_(cobre|latao|marfim)$';

-- joias de cobre/latão/marfim mancham a fama (dec. 8), menos as coroas
update itens
   set efeito_positivo = null, efeito_negativo = 'Aumenta 1 de Desonra.'
 where tipo_equip = 'adorno' and slug ~ '_(cobre|latao|marfim)$'
   and slug not like 'coroa_%';
-- coroas têm fama própria (dec. 6: a de cobre melhora a fama em 6)
update itens set efeito_positivo = 'Protege 10 de Desonra.', efeito_negativo = null where slug = 'coroa_ouro';
update itens set efeito_positivo = 'Protege 8 de Desonra.',  efeito_negativo = null where slug = 'coroa_prata';
update itens set efeito_positivo = 'Protege 6 de Desonra.',  efeito_negativo = null where slug = 'coroa_cobre';
update itens set efeito_positivo = 'Protege 4 de Desonra.',  efeito_negativo = null where slug = 'coroa_latao';
update itens set efeito_positivo = 'Protege 2 de Desonra.',  efeito_negativo = null where slug = 'coroa_marfim';
-- joias de ouro/prata: fama padrão da proposta
update itens set efeito_positivo = 'Protege 2 de Desonra.', efeito_negativo = null
 where tipo_equip = 'adorno' and slug ~ '_ouro$' and slug not like 'coroa_%';
update itens set efeito_positivo = 'Protege 1 de Desonra.', efeito_negativo = null
 where tipo_equip = 'adorno' and slug ~ '_prata$' and slug not like 'coroa_%';

-- ── VESTIMENTAS: padrões da proposta (escala de proteção nova) ─
update itens set efeito_positivo = 'Protege 10 de Calor.', efeito_negativo = null where slug = 'chapeu_couro';
update itens set efeito_positivo = 'Protege 15 de Calor.', efeito_negativo = 'Aumenta 1 de Desonra.' where slug = 'chapeu_palha';
-- capas: nobre / militar / profissional
update itens set efeito_positivo = 'Protege 2 de Desonra, 5 de Frio e 5 de Calor.', efeito_negativo = null where slug = 'capa';
update itens set efeito_positivo = 'Protege 1 de Desonra, 10 de Frio e 10 de Calor.', efeito_negativo = null where slug = 'capa_couro';
update itens set efeito_positivo = 'Protege 15 de Frio e 15 de Calor.', efeito_negativo = 'Aumenta 1 de Desonra.' where slug = 'capa_simples';
-- casacos (peito): seda / linho / lã
update itens set efeito_positivo = 'Protege 2 de Desonra, 5 de Frio e 5 de Calor.', efeito_negativo = null where slug = 'casaco_nobre';
update itens set efeito_positivo = 'Protege 1 de Desonra e 10 de Frio.', efeito_negativo = null where slug = 'casaco_decorativo';
update itens set efeito_positivo = 'Protege 15 de Frio.', efeito_negativo = 'Aumenta 1 de Desonra.' where slug = 'casaco_couro';
update itens set efeito_positivo = 'Protege 15 de Frio.', efeito_negativo = 'Aumenta 1 de Desonra.' where slug = 'casaco_algodao';
-- túnicas (trajes, peito): seda / linho / lã
update itens set efeito_positivo = 'Protege 2 de Desonra, 10 de Frio e 10 de Calor.', efeito_negativo = null where slug = 'traje_nobre';
update itens set efeito_positivo = 'Protege 1 de Desonra e 20 de Frio.', efeito_negativo = null where slug = 'traje_linho';
update itens set efeito_positivo = 'Protege 30 de Frio.', efeito_negativo = 'Aumenta 1 de Desonra.' where slug = 'traje_reforcado';
update itens set efeito_positivo = 'Protege 30 de Frio.', efeito_negativo = 'Aumenta 1 de Desonra.' where slug = 'traje_simples';
-- cintas (cintura): militar / profissional / religiosa
update itens set efeito_positivo = 'Protege 15 de Pesado.', efeito_negativo = 'Aumenta 2 de Desonra.' where slug in ('cinturao_placas','cinto_suporte');
update itens set efeito_positivo = 'Protege 10 de Pesado.', efeito_negativo = null where slug in ('cinto_acessorios','cinturao_quadril');
update itens set efeito_positivo = 'Protege 5 de Pesado e 5 de Desonra.', efeito_negativo = null where slug in ('cinto_elfico','cinturao_portolivrense');
-- botas e sandálias (pé): a velocidade entra por mod_vel
update itens set mod_vel = 7, efeito_positivo = 'Aumenta 4 de Montar; protege 5 de Frio e 5 de Calor.', efeito_negativo = null where slug = 'bota_cavaleiro';
update itens set mod_vel = 3, efeito_positivo = 'Protege 3 de Desonra e 25 de Frio.', efeito_negativo = null where slug = 'bota_neve';
update itens set mod_vel = 2, efeito_positivo = 'Protege 5 de Desonra e 1 de Frio.', efeito_negativo = null where slug = 'sandalias_aleteias';
update itens set mod_vel = 4, efeito_positivo = 'Protege 1 de Frio.', efeito_negativo = 'Aumenta 2 de Desonra.' where slug = 'sandalias';
-- alforje: a carga alivia por proteção de Pesado
update itens set efeito_positivo = 'Protege 10 de Pesado.' where slug in ('aljava','aljava_reforcada');
update itens set efeito_positivo = 'Protege 5 de Pesado.'  where slug in ('algibeira','algibeira_grande','algibeira_planense');
update itens set efeito_positivo = 'Protege 15 de Pesado.' where slug in ('bainha','bainha_5');
update itens set efeito_positivo = 'Protege 20 de Pesado.' where slug in ('alforge','alforge_duplo');

-- ── SEEDS: tipos que não existiam ───────────────────────────
insert into itens (slug, nome, grupo, tipo_equip, slot_equip, ocupa, valor_latao, mod_kar, mod_vel, efeito_positivo, efeito_negativo, tipo, origem)
values
  -- cabeça
  ('chapeu_veludo',      'Chapéu de Veludo',      'Vestimentas', 'vestimenta', 'cabeca',  0.5,  2500, 0, 0, 'Protege 5 de Calor e 1 de Desonra.', null, 'S', 'Comum'),
  -- rosto
  ('capuz_seda',         'Capuz de Seda',         'Vestimentas', 'vestimenta', 'rosto',   0.5,  3000, 0, 0, 'Protege 2 de Desonra, 5 de Calor e 5 de Frio.', null, 'S', 'Comum'),
  ('capuz_couro',        'Capuz de Couro',        'Vestimentas', 'vestimenta', 'rosto',   0.5,  1200, 0, 0, 'Protege 10 de Calor e 10 de Frio.', 'Aumenta 5 de Desonra.', 'S', 'Comum'),
  ('capuz_algodao',      'Capuz de Algodão',      'Vestimentas', 'vestimenta', 'rosto',   0.5,   500, 0, 0, 'Protege 15 de Calor e 15 de Frio.', 'Aumenta 10 de Desonra.', 'S', 'Comum'),
  -- orelha
  ('piercing_ouro',      'Piercing de Ouro',      'Vestimentas', 'adorno',     'orelha',  0.1, 12000, 3, 0, 'Protege 2 de Desonra.', null, 'S', 'Comum'),
  ('piercing_prata',     'Piercing de Prata',     'Vestimentas', 'adorno',     'orelha',  0.1,  6000, 2, 0, 'Protege 1 de Desonra.', null, 'S', 'Comum'),
  ('piercing_cobre',     'Piercing de Cobre',     'Vestimentas', 'adorno',     'orelha',  0.1,  1000, 1, 0, null, 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  -- pescoço
  ('gargantilha_ouro',   'Gargantilha de Ouro',   'Vestimentas', 'adorno',     'pescoco', 0.2, 12000, 3, 0, 'Protege 2 de Desonra.', null, 'S', 'Comum'),
  ('gargantilha_prata',  'Gargantilha de Prata',  'Vestimentas', 'adorno',     'pescoco', 0.2,  6000, 2, 0, 'Protege 1 de Desonra.', null, 'S', 'Comum'),
  ('gargantilha_cobre',  'Gargantilha de Cobre',  'Vestimentas', 'adorno',     'pescoco', 0.2,  1000, 1, 0, null, 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  ('cachecol_seda',      'Cachecol de Seda',      'Vestimentas', 'vestimenta', 'pescoco', 0.3,  2500, 0, 0, 'Protege 5 de Frio e 2 de Desonra.', null, 'S', 'Comum'),
  ('cachecol_linho',     'Cachecol de Linho',     'Vestimentas', 'vestimenta', 'pescoco', 0.3,  1000, 0, 0, 'Protege 10 de Frio e 1 de Desonra.', null, 'S', 'Comum'),
  ('cachecol_algodao',   'Cachecol de Algodão',   'Vestimentas', 'vestimenta', 'pescoco', 0.3,   400, 0, 0, 'Protege 15 de Frio.', 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  ('lenco_seda',         'Lenço de Seda',         'Vestimentas', 'vestimenta', 'pescoco', 0.1,  1500, 0, 0, 'Protege 2 de Desonra.', null, 'S', 'Comum'),
  ('lenco_linho',        'Lenço de Linho',        'Vestimentas', 'vestimenta', 'pescoco', 0.1,   800, 0, 0, 'Protege 5 de Frio e 1 de Desonra.', null, 'S', 'Comum'),
  ('lenco_algodao',      'Lenço de Algodão',      'Vestimentas', 'vestimenta', 'pescoco', 0.1,   300, 0, 0, 'Protege 10 de Frio.', 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  -- ombro
  ('dragona_ouro',       'Dragona de Ouro',       'Vestimentas', 'adorno',     'ombro',   0.3, 12000, 3, 0, 'Protege 2 de Desonra.', null, 'S', 'Comum'),
  ('dragona_prata',      'Dragona de Prata',      'Vestimentas', 'adorno',     'ombro',   0.3,  6000, 2, 0, 'Protege 1 de Desonra.', null, 'S', 'Comum'),
  ('dragona_cobre',      'Dragona de Cobre',      'Vestimentas', 'adorno',     'ombro',   0.3,  1000, 1, 0, null, 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  -- costas
  ('sobretudo_luxuoso',  'Sobretudo Luxuoso',     'Vestimentas', 'vestimenta', 'costas',  1.0,  6000, 0, 0, 'Protege 2 de Desonra, 5 de Calor e 5 de Frio.', null, 'S', 'Comum'),
  ('sobretudo_completo', 'Sobretudo Completo',    'Vestimentas', 'vestimenta', 'costas',  1.0,  3000, 0, 0, 'Protege 10 de Calor e 10 de Frio.', 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  ('sobretudo_simples',  'Sobretudo Simples',     'Vestimentas', 'vestimenta', 'costas',  1.0,  1200, 0, 0, 'Protege 10 de Calor e 10 de Frio.', 'Aumenta 2 de Desonra.', 'S', 'Comum'),
  -- peito (adornos)
  ('medalha_ouro',       'Medalha de Ouro',       'Vestimentas', 'adorno',     'peito',   0.2, 12000, 3, 0, 'Protege 2 de Desonra.', null, 'S', 'Comum'),
  ('medalha_prata',      'Medalha de Prata',      'Vestimentas', 'adorno',     'peito',   0.2,  6000, 2, 0, 'Protege 1 de Desonra.', null, 'S', 'Comum'),
  ('medalha_cobre',      'Medalha de Cobre',      'Vestimentas', 'adorno',     'peito',   0.2,  1000, 1, 0, null, 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  ('pingente_ouro',      'Pingente de Ouro',      'Vestimentas', 'adorno',     'peito',   0.2, 12000, 3, 0, 'Protege 2 de Desonra.', null, 'S', 'Comum'),
  ('pingente_prata',     'Pingente de Prata',     'Vestimentas', 'adorno',     'peito',   0.2,  6000, 2, 0, 'Protege 1 de Desonra.', null, 'S', 'Comum'),
  ('pingente_cobre',     'Pingente de Cobre',     'Vestimentas', 'adorno',     'peito',   0.2,  1000, 1, 0, null, 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  -- pulso (vestes)
  ('luva_seda',          'Luva de Seda',          'Vestimentas', 'vestimenta', 'pulso',   0.2,  1200, 0, 0, 'Protege 1 de Desonra e 5 de Frio.', null, 'S', 'Comum'),
  ('luva_couro_fina',    'Luva de Couro',         'Vestimentas', 'vestimenta', 'pulso',   0.2,   600, 0, 0, 'Protege 5 de Frio.', 'Aumenta 1 de Desonra.', 'S', 'Comum'),
  ('luva_algodao',       'Luva de Algodão',       'Vestimentas', 'vestimenta', 'pulso',   0.2,   300, 0, 0, 'Protege 10 de Frio.', 'Aumenta 3 de Desonra.', 'S', 'Comum'),
  -- cintura (calças)
  ('calca_seda',         'Calça de Seda',         'Vestimentas', 'vestimenta', 'cintura', 0.6,  4000, 0, 0, 'Protege 5 de Frio e 2 de Desonra.', null, 'S', 'Comum'),
  ('calca_couro_fina',   'Calça de Couro Fina',   'Vestimentas', 'vestimenta', 'cintura', 0.6,  1500, 0, 0, 'Protege 10 de Frio.', null, 'S', 'Comum'),
  ('calca_algodao',      'Calça de Algodão',      'Vestimentas', 'vestimenta', 'cintura', 0.6,   600, 0, 0, 'Protege 15 de Frio.', 'Aumenta 2 de Desonra.', 'S', 'Comum'),
  -- alforje
  ('estojo',             'Estojo',                'Vestimentas', 'vestimenta', 'alforje', 1.0,  2500, 0, 0, 'Protege 20 de Pesado.', null, 'S', 'Comum');

-- caneleiras: região nova de armadura (couro/malha/aço = L/M/P)
insert into itens (slug, nome, grupo, tipo_equip, categoria_equip, tipo_armadura, slot_equip, ocupa, valor_latao, defesa, absorcao, resistencia, mod_vel, mod_kar, tipo, origem)
values
  ('caneleiras_de_couro', 'Caneleiras de Couro', 'Armaduras', 'equipamento', 'armadura', 'L', 'canela', 1.0, 2000, 3, 1, 1,  0,  -5, 'S', 'Comum'),
  ('caneleiras_de_malha', 'Caneleiras de Malha', 'Armaduras', 'equipamento', 'armadura', 'M', 'canela', 1.5, 4500, 2, 2, 2, -1, -10, 'S', 'Comum'),
  ('caneleiras_de_aco',   'Caneleiras de Aço',   'Armaduras', 'equipamento', 'armadura', 'P', 'canela', 2.0, 9000, 1, 3, 3, -2, -15, 'S', 'Comum');

commit;
