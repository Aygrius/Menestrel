-- Ensaios da RPC aprender_magia. Roda TUDO numa transação e desfaz.
-- Usa um PJ real como cobaia (alterado só dentro da transação).
BEGIN;
DO $$
DECLARE
  v_pj   record;
  v_r    jsonb;
  v_livro text := 'livro_do_mago';
  v_mag  record;  -- uma Básica do Livro do Mago
BEGIN
  SELECT id, user_id INTO v_pj FROM public.personagens ORDER BY id LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pj.user_id::text)::text, true);

  SELECT m.key, m.custo INTO v_mag
    FROM public.livro_pergaminhos lp JOIN public.magias m ON 'pergaminho_' || m.key = lp.pergaminho_slug
   WHERE lp.livro_slug = v_livro AND m.nivel_1 IS NOT NULL AND m.nivel_3 IS NOT NULL ORDER BY m.key LIMIT 1;

  -- Mago, estágio 1 (xp 0), Int 2, Aura 1 → 11 pontos; inventário só com o livro.
  UPDATE public.personagens SET profissao = 'Mago', experiencia = 0, intelecto_base = 2, aura_base = 1,
         magias = '{}'::jsonb,
         inventario = jsonb_build_object('moedas', '{}'::jsonb, 'itens',
           jsonb_build_array(jsonb_build_object('instanceId', 'L1', 'slug', v_livro, 'quantidade', 1)))
   WHERE id = v_pj.id;

  -- 1) aprende o nível 1 pelo livro, e o livro continua lá
  v_r := public.aprender_magia(v_pj.id, 'L1', v_mag.key);
  ASSERT (v_r->>'ok')::boolean, 'ok pelo livro: ' || v_r::text;
  ASSERT (v_r->>'passos')::int = 1, 'passos 1: ' || v_r::text;
  ASSERT (SELECT jsonb_array_length(inventario->'itens') FROM public.personagens WHERE id = v_pj.id) = 1, 'livro não se consome';

  -- 2) nível 3 acima do estágio 1
  v_r := public.aprender_magia(v_pj.id, 'L1', v_mag.key);
  ASSERT v_r->>'motivo' = 'acima_do_estagio', 'acima_do_estagio: ' || v_r::text;

  -- 3) magia que o livro não ensina
  v_r := public.aprender_magia(v_pj.id, 'L1', (SELECT key FROM public.magias WHERE tipo = 'Ancestral' ORDER BY key LIMIT 1));
  ASSERT v_r->>'motivo' = 'item_nao_ensina', 'item_nao_ensina: ' || v_r::text;

  -- 4) pontos: Guerreiro Int 0 Aura 0, estágio 1 = 1 ponto; magia de custo 2 não cabe
  UPDATE public.personagens SET profissao = 'Guerreiro', intelecto_base = 0, aura_base = 0, magias = '{}'::jsonb WHERE id = v_pj.id;
  v_r := public.aprender_magia(v_pj.id, 'L1',
    (SELECT m.key FROM public.livro_pergaminhos lp JOIN public.magias m ON 'pergaminho_' || m.key = lp.pergaminho_slug
      WHERE lp.livro_slug = v_livro AND m.custo = 2 AND m.nivel_1 IS NOT NULL ORDER BY m.key LIMIT 1));
  ASSERT v_r->>'motivo' = 'pontos_insuficientes', 'pontos_insuficientes: ' || v_r::text;

  -- 5) Aura negativa zera a base: Mago Int 0 Aura -1 = 0 pontos
  UPDATE public.personagens SET profissao = 'Mago', aura_base = -1 WHERE id = v_pj.id;
  v_r := public.aprender_magia(v_pj.id, 'L1', v_mag.key);
  ASSERT v_r->>'motivo' = 'pontos_insuficientes', 'aura negativa: ' || v_r::text;

  -- 6) pergaminho avulso de Ancestral ensina a qualquer profissão
  UPDATE public.personagens SET profissao = 'Ladino', intelecto_base = 5, aura_base = 5, experiencia = 0, magias = '{}'::jsonb,
         inventario = jsonb_build_object('moedas', '{}'::jsonb, 'itens', jsonb_build_array(
           jsonb_build_object('instanceId', 'P1', 'quantidade', 1, 'slug',
             (SELECT 'pergaminho_' || key FROM public.magias WHERE tipo = 'Ancestral' AND nivel_1 IS NOT NULL ORDER BY key LIMIT 1)))))
   WHERE id = v_pj.id;
  v_r := public.aprender_magia(v_pj.id, 'P1', (SELECT key FROM public.magias WHERE tipo = 'Ancestral' AND nivel_1 IS NOT NULL ORDER BY key LIMIT 1));
  ASSERT (v_r->>'ok')::boolean, 'Ladino aprende Ancestral: ' || v_r::text;

  -- 7) item à venda não ensina
  UPDATE public.personagens SET magias = '{}'::jsonb,
         inventario = jsonb_set(inventario, '{itens,0,anuncio_id}', '1'::jsonb) WHERE id = v_pj.id;
  v_r := public.aprender_magia(v_pj.id, 'P1', (SELECT key FROM public.magias WHERE tipo = 'Ancestral' AND nivel_1 IS NOT NULL ORDER BY key LIMIT 1));
  ASSERT v_r->>'motivo' = 'item_a_venda', 'item_a_venda: ' || v_r::text;

  -- 8) instância inexistente
  v_r := public.aprender_magia(v_pj.id, 'NAO_EXISTE', v_mag.key);
  ASSERT v_r->>'motivo' = 'item_nao_encontrado', 'item_nao_encontrado: ' || v_r::text;

  -- 9) a fórmula, direto
  ASSERT public._menestrel_pontos_magia_por_estagio('Mago', 2, 1) = 11, 'Mago 2/1';
  ASSERT public._menestrel_pontos_magia_por_estagio('Rastreador', -1, 2) = 7, 'Rastreador -1/2';
  ASSERT public._menestrel_pontos_magia_por_estagio('Sacerdote', 3, -1) = 3, 'Sacerdote aura negativa';
  ASSERT public._menestrel_pontos_magia_por_estagio('Ladino', 0, 0) = 1, 'Ladino 0/0';
  RAISE NOTICE 'aprender_magia: todos os ensaios passaram';
END $$;
ROLLBACK;
