-- scripts/sql/precos-restantes-e-feno-2026-10-04.sql
-- ============================================================================
-- O RESTO DOS PREÇOS, E O FENO (04/10/2026)
--
-- APLICADO NO BANCO EM 05/10/2026 (projeto kaxbdpdutentlrobuqyu). Conferido
-- depois: 1.044 itens, e sem preço só Água, Água Suja, Feno, Lenha e Terra.
--
-- Pedido do usuário:
--   "Pode dar preço para as coisas que faltam, inclusive para a planta
--    subella, de acordo com nosso mercado. As coisas que ficam sem preço são
--    água, água suja, lenha, terra, e adicione feno."
--
-- Fecha o buraco aberto em venda-item-sem-valor-2026-09-28.sql (item sem
-- `valor_latao` se vende por 0 e sai de graça na loja do Mestre). Depois dos
-- três scripts de hoje, SÓ CINCO itens ficam sem preço, e por decisão:
-- Água, Água Suja, Lenha, Terra e o Feno que entra aqui.
--
-- Os 44 preços saem do PRÓPRIO catálogo — cada bloco diz de onde:
--   Animais    Eredri 48.000 · Cavalo do Rei 24.000 · Ludgrimiano 16.000 ·
--              Ardennes 8.000 · Andaluz 4.000 · Mamute 18.000 · Urso Branco
--              6.000 · Gavião Treinado 1.400 · Falcão Treinado 700
--   Itens      Quadro Sagasta 33.000 · Ponte de Palier / Rainha Tória 17.000 ·
--              Glaurung 4.000 · Livro Tempo das Névoas (Raro) 2.200 · Livro de
--              Maudi 1.700 · Livros de Sabedoria 1.000 · Luneta 200 ·
--              Bússola 100 · Espelho 100
--   Mágico sem magia no motor: comum + 2.000 (a régua de
--              precos-magicos-e-dardo-2026-10-04.sql)
--   Vestimentas  Traje de Couro 200 · Capa de Proteção 100 · Chapéu 100
--   Plantas    Inina (+50 Sono) 10 · Nex (+75 Sono) 20
--
-- IDEMPOTENTE: todo preço só entra onde ainda está nulo, e o insert do Feno
-- tem `on conflict (slug) do nothing`.
-- ============================================================================

BEGIN;

-- ── 1. Os 13 animais ────────────────────────────────────────────────────────
-- Cavalo: o puro-sangue élfico entra no degrau do puro-sangue Eredri (48.000),
-- e a versão "de Guerra" custa o mesmo que a base — é como o catálogo já trata
-- Eredri, Quarter, Ardennes e Andaluz. O Cavalo Selvagem é o único não domado:
-- abaixo do Andaluz (4.000), perto do Pônei (1.000).
-- Bicho de bestiário também se compra (o catálogo já vende Tigre, Urso e
-- Mamute); o preço acompanha o porte e a raridade.
UPDATE public.itens i
   SET valor_latao = v.valor
  FROM (VALUES
    ('cavalo_puro_sangue_elfico',          48000),   -- puro-sangue, degrau do Eredri
    ('cavalo_puro_sangue_elfico_de_guerra',48000),   -- de guerra custa o mesmo que a base
    ('cavalo_arabe_de_guerra',             12000),   -- entre Ardennes (8.000) e Ludgrimiano (16.000)
    ('cavalo_arabe',                        1500),   -- "Cavalo Selvagem": não domado
    ('gaviao_de_caca',                      2000),   -- acima do Gavião Treinado (1.400)
    ('falcao_de_caca',                      1200),   -- acima do Falcão Treinado (700)
    ('baleia_tagmariana',                  15000),   -- porte de Mamute (18.000)
    ('baleia',                             10000),   -- Orca
    ('tubarao',                             3000),   -- Tubarão-branco
    ('tubarao_tigre',                       2500),
    ('crocodilo',                           1500),   -- Crocodilo-do-frefo
    ('cobra',                                800),   -- Sucuri
    ('serpente',                             400)    -- Cascavel: pequena, mas peçonhenta
  ) AS v(slug, valor)
 WHERE i.slug = v.slug AND i.valor_latao IS NULL;

-- ── 2. Os 19 itens de lore ──────────────────────────────────────────────────
-- Livro: Comum 1.200 (entre os de Sabedoria, 1.000, e o de Maudi, 1.700);
-- Raro 2.200 (o Tempo das Névoas); Mágico, 2.200 + prêmio.
-- Estátua e busto não têm par com preço no catálogo: entram pela régua dos
-- quadros, por prestígio do retratado — o Cavaleiro Eredri no degrau mais alto
-- abaixo do Quadro Sagasta, o busto valendo menos que qualquer estátua.
UPDATE public.itens i
   SET valor_latao = v.valor
  FROM (VALUES
    ('a_batalha_de_blator',                 1200),   -- livro Comum
    ('livro_os_quatro_elementos',           1200),   -- livro Comum
    ('livro_paz_e_guerra',                  1200),   -- livro Comum
    ('livro_do_grande_sabio',               2200),   -- livro Raro
    ('livro_elatos_do_anfitriao_do_inferno', 2200),  -- livro Raro
    ('livro_veu_da_verdade',                2200),   -- livro Raro
    ('livro_a_marcha_de_simas',             2200),   -- livro Raro
    ('livro_a_natureza_bestial_de_mocna',   2200),   -- livro Raro
    ('livro_revelacoes',                    4500),   -- livro Mágico
    ('bussola_mapa_astral',                 2000),   -- Astralícia: bússola (100) + prêmio mágico
    ('luneta_olhos_de_ganis',               2200),   -- luneta (200) + prêmio mágico
    ('espelho_portao_de_cruine',            2500),   -- espelho mágico de estanho, ocupa 15
    ('estatua_eredri',                     20000),   -- o Cavaleiro: a maior (ocupa 120)
    ('estatua_alianca_dos_povos',          17000),   -- quadro histórico, degrau da Rainha Tória
    ('estatua_maira',                      15000),   -- deusa
    ('estatua_filam',                      12000),
    ('estatua_leon',                       12000),   -- Leônio
    ('busto_sivon',                         6000),   -- busto vale menos que estátua
    ('sarcofago',                           2500)    -- cantaria com inscrições de Cruine
  ) AS v(slug, valor)
 WHERE i.slug = v.slug AND i.valor_latao IS NULL;

-- ── 3. As duas botas comuns e a Planta Subella ──────────────────────────────
-- Botas: vestimenta de couro com efeito de verdade — acima do Traje de Couro
-- (200); a de cavaleiro pede trabalho de seleiro, e vale mais.
-- Subella é o terceiro degrau da erva sonífera: Inina (+50 Sono) 10, Nex
-- (+75) 20, Subella (+100 Sono, +15 Loucura) 30.
UPDATE public.itens i
   SET valor_latao = v.valor
  FROM (VALUES
    ('bota_cavaleiro', 400),   -- +4 Montar, protege 10 de Frio
    ('bota_neve',      250),   -- protege 25 de Frio
    ('planta_subella',  30)
  ) AS v(slug, valor)
 WHERE i.slug = v.slug AND i.valor_latao IS NULL;

-- ── 4. As 9 armas naturais ──────────────────────────────────────────────────
-- Bico, Cauda, Chifre, Coice, Garra, Hálito, Mordida, Patada e Toque são o
-- ataque da CRIATURA (o bestiário as equipa; nenhum ferreiro as forja). Como
-- nada mais fica de graça, elas entram pelo preço de MATERIAL — o que a mesa
-- paga por um troféu —, não pelo de arma: o catálogo vende Marfim por 1,
-- Couro por 5 e Marfim Místico por 10. Golpe de dano 4 vale 5; de dano 8,
-- vale 10. Se a intenção for que não se vendam, o caminho não é o preço: é
-- tirá-las da vitrine.
UPDATE public.itens i
   SET valor_latao = v.valor
  FROM (VALUES
    ('bico',     5),   -- dano 4
    ('cauda',    5),   -- dano 4
    ('garra',    5),   -- dano 4
    ('mordida',  5),   -- dano 4
    ('patada',   5),   -- dano 4
    ('chifre',  10),   -- dano 8
    ('coice',   10),   -- dano 8
    ('toque',   10),   -- dano 8
    ('halito',  10)    -- dano 8, origem Rara
  ) AS v(slug, valor)
 WHERE i.slug = v.slug AND i.valor_latao IS NULL;

-- ── 5. O Feno ───────────────────────────────────────────────────────────────
-- Entra na companhia da Lenha: recurso de cenário que se junta no campo, sem
-- preço e sem efeito em ficha (quem alimenta animal é a Ração Animal, 1 latão
-- — feno de graça com efeito de fome tornaria a ração inútil).
INSERT INTO public.itens
  (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, dano_l, dano_m, dano_p, descricao)
VALUES
  ('feno', 'Feno', 'Consumíveis', 'S', 'Comum', 0.5, NULL, 'ti-wheat', 0, 0, 0,
   'O Feno é capim ceifado e seco ao sol, atado em molho. Serve de cama no estábulo e de forragem para os animais no inverno.')
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- O que fica sem preço — espera EXATAMENTE 5 linhas: Água, Água Suja, Feno,
-- Lenha e Terra:
--   SELECT slug, nome, grupo FROM public.itens WHERE valor_latao IS NULL ORDER BY nome;
-- O Feno entrou (espera 1 linha):
--   SELECT slug, nome, grupo, ocupa, valor_latao FROM public.itens WHERE slug = 'feno';
-- Tamanho do catálogo (espera 1.044 com os três scripts de 04/10/2026):
--   SELECT count(*) FROM public.itens;
