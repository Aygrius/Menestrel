-- ============================================================================
-- FRASCOS ALQUÍMICOS, AMULETOS ELEMENTAIS E FLECHAS ENVENENADAS (28/09/2026)
--
-- Pedido do usuário:
--   "Crie 12 frascos em consumíveis, 2 para cada elemento, para ser usado em
--    batalha, de origem alquímica. São itens que disparam magias já
--    existentes de dano elemental, 1 sendo de suporte e outro sendo de dano."
--   "Adicione os seguintes itens mágicos: Amuleto da Brasa / da Rocha / da
--    Maré / do Vento — Vestimentas — Piro/Geo/Hidro/Aeroproteção — 3"
--   "Itens venenosos (Blueta, Leopis, Theonia) podem ser usados em armas e
--    flechas" — 1 dose vira 1 flecha envenenada (decisão do usuário).
--
-- Como o frasco dispara a magia: consumível com `magia` + `nivel_magia` entra
-- na lista de magias do PJ na batalha (magiasDeItensDoAtor), sem karma, e sai
-- da mochila ao ser usado (consumirItemDaMagia) — o caminho dos pergaminhos.
-- Para o frasco NÃO virar "Aprender magia", o pergaminho passa a ser
-- reconhecido também pelo slug `pergaminho_` (no cliente, ehPergaminhoDeMagia,
-- e aqui, na RPC usar_pergaminho_magia).
-- ============================================================================

-- ── Origem "Alquímico" ──────────────────────────────────────────────────────
alter table public.itens drop constraint if exists itens_origem_chk;
alter table public.itens add constraint itens_origem_chk
  check (origem is null or origem = any (array['Comum', 'Raro', 'Mágico', 'Alquímico']));
alter table public.itens_historia drop constraint if exists itens_historia_origem_chk;
do $$
declare c text;
begin
  -- A CHECK de origem de itens_historia não tem nome conhecido: acha pelo texto.
  for c in select conname from pg_constraint
            where conrelid = 'public.itens_historia'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) like '%origem%' loop
    execute format('alter table public.itens_historia drop constraint %I', c);
  end loop;
end $$;
alter table public.itens_historia add constraint itens_historia_origem_chk
  check (origem is null or origem = any (array['Comum', 'Raro', 'Mágico', 'Alquímico']));

-- ── Pergaminho = consumível com magia E slug pergaminho_ ────────────────────
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.usar_pergaminho_magia'::regproc);
  if position('pergaminho\_%' in d) = 0 then
    d := replace(d,
      'where i.slug = v_slug and i.grupo = ''Consumíveis'';',
      'where i.slug = v_slug and i.grupo = ''Consumíveis'' and i.slug like ''pergaminho\_%'';');
    if position('pergaminho\_%' in d) = 0 then
      raise exception 'usar_pergaminho_magia: ponto de enxerto não encontrado';
    end if;
    execute d;
  end if;
end
$do$;

-- ── Os 12 frascos: dano e suporte por elemento, nível 3 ─────────────────────
insert into public.itens (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, magia, nivel_magia, descricao)
values
  -- Fogo
  ('frasco_incendiario', 'Frasco Incendiário', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask', 'Frasco Incendiário', 3,
   'Frasco de reagentes instáveis preparado pelos alquimistas. Arremessado, parte-se contra o alvo e explode em chamas.'),
  ('frasco_de_chama_vital', 'Frasco de Chama Vital', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask-2', 'Chama Vital', 3,
   'Tintura rubra e morna. Quem a bebe sente as feridas se cauterizarem e o corpo resistir ao fogo.'),
  -- Terra
  ('frasco_de_espinhos', 'Frasco de Espinhos', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask', 'Enxame de Espinhos', 3,
   'Mistura de sementes e limalha em lama escura. Ao se quebrar, brota num enxame de espinhos de pedra contra o alvo.'),
  ('frasco_da_bencao_da_terra', 'Frasco da Bênção da Terra', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask-2', 'Bênção da Terra', 3,
   'Lama mineral de aroma terroso. Fecha os ferimentos de quem a bebe e endurece a pele contra ataques de terra.'),
  -- Água
  ('frasco_de_gelo', 'Frasco de Gelo', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask', 'Dardos de Gelo', 3,
   'Solução gelada que embaça o vidro. Arremessada, estilhaça em lascas de gelo cortante.'),
  ('frasco_de_hidroprotecao', 'Frasco de Hidroproteção', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask-2', 'Hidroproteção', 3,
   'Essência azul e densa. Envolve quem a bebe numa película que protege contra ataques de água.'),
  -- Ar
  ('frasco_caustico', 'Frasco Cáustico', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask', 'Névoa Cáustica', 3,
   'Vapor esverdeado preso sob rolha e cera. Ao se partir, libera uma névoa corrosiva sobre o alvo.'),
  ('frasco_de_aeroprotecao', 'Frasco de Aeroproteção', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask-2', 'Aeroproteção', 3,
   'Líquido quase transparente, leve como o ar. Ergue ao redor de quem o bebe uma barreira contra ataques de ar.'),
  -- Celestial
  ('frasco_de_luz_ofuscante', 'Frasco de Luz Ofuscante', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask', 'Verdade Ofuscante', 3,
   'Óleo dourado que brilha no escuro. Arremessado, explode num clarão de luz celestial sobre o alvo.'),
  ('frasco_da_egide_celestial', 'Frasco da Égide Celestial', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask-2', 'Égide Celestial', 3,
   'Água benta destilada com pó de prata. Quem a bebe fica protegido contra o dano celestial.'),
  -- Infernal
  ('frasco_de_putrefacao', 'Frasco de Putrefação', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask', 'Putrefação', 3,
   'Caldo negro de odor pútrido. Ao se partir, a corrupção infernal apodrece a carne do alvo.'),
  ('frasco_do_selo_abismal', 'Frasco do Selo Abismal', 'Consumíveis', 'L', 'Alquímico', 0.5, 100, 'ti-flask-2', 'Selo Abismal', 3,
   'Tinta rubro-escura com runas gravadas no vidro. Quem a bebe é selado contra o dano infernal.')
on conflict (slug) do nothing;

-- ── Os 4 amuletos elementais (Vestimentas, pescoço, nível 3) ────────────────
insert into public.itens (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, slot_equip, magia, nivel_magia, descricao)
values
  ('amuleto_da_brasa', 'Amuleto da Brasa', 'Vestimentas', 'S', 'Mágico', 0.3, null, 'ti-flame', 'pescoco', 'Piroproteção', 3,
   'Amuleto mágico de cobre com uma brasa que nunca se apaga presa em vidro. Protege quem o veste contra o fogo.'),
  ('amuleto_da_rocha', 'Amuleto da Rocha', 'Vestimentas', 'S', 'Mágico', 0.3, null, 'ti-mountain', 'pescoco', 'Geoproteção', 3,
   'Amuleto mágico de pedra polida, pesado e frio ao toque. Protege quem o veste contra ataques de terra.'),
  ('amuleto_da_mare', 'Amuleto da Maré', 'Vestimentas', 'S', 'Mágico', 0.3, null, 'ti-droplet', 'pescoco', 'Hidroproteção', 3,
   'Amuleto mágico de madrepérola que sempre parece úmido. Protege quem o veste contra ataques de água.'),
  ('amuleto_do_vento', 'Amuleto do Vento', 'Vestimentas', 'S', 'Mágico', 0.3, null, 'ti-wind', 'pescoco', 'Aeroproteção', 3,
   'Amuleto mágico de prata vazada, que assobia com a menor brisa. Protege quem o veste contra ataques de ar.')
on conflict (slug) do nothing;

-- ── As 3 flechas envenenadas (1 dose = 1 flecha) ────────────────────────────
-- O efeito na batalha é o efeito_negativo: a Energia Física que o veneno tira
-- quando o golpe chega à EF (passou pela EH e pela armadura).
insert into public.itens (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, efeito_negativo, descricao)
values
  ('flecha_envenenada_blueta', 'Flecha Envenenada (Blueta)', 'Consumíveis', 'S', 'Comum', 0.1, 26, 'ti-archery-arrow',
   'Diminui 5 de Energia Física.',
   'Flecha com a ponta untada de Blueta. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.'),
  ('flecha_envenenada_leopis', 'Flecha Envenenada (Leopis)', 'Consumíveis', 'S', 'Comum', 0.1, 76, 'ti-archery-arrow',
   'Diminui 10 de Energia Física.',
   'Flecha com a ponta untada de Leopis. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.'),
  ('flecha_envenenada_theonia', 'Flecha Envenenada (Theonia)', 'Consumíveis', 'S', 'Comum', 0.1, 226, 'ti-archery-arrow',
   'Diminui 15 de Energia Física.',
   'Flecha com a ponta untada de Theonia. Se o golpe chegar à energia física do alvo, o veneno age. Serve uma vez só.')
on conflict (slug) do nothing;
