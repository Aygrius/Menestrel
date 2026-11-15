-- O MAPA DA MESA (15/11/2026)
-- Usuário: "deixar o mestre criar os pontos, os caminhos, as rotas, as cidades"
-- e "os jogadores vão acompanhar onde seu personagem está, onde devem ir,
-- sabendo distâncias, marcar interesses no mapa".
--
-- Três peças:
--   mapas_mesa   — o que o MESTRE desenha sobre o mapa, uma linha por história:
--                  dados = { lugares, linhas, rota, gente }  (13-diario/mapa.jsx)
--                  Lê quem é da mesa; grava só o Mestre dela.
--   mapa_marcas  — as marcas de interesse de cada PERSONAGEM (só o dono lê e grava).
--   bucket mapas — os ladrilhos PNG da pintura (leitura pública, como avatares).
--                  O envio é feito por script (scripts/mapa/), não pelo app.
--
-- Coordenadas em unidades do mapa (1200 × 2000), não em pixels: trocar a
-- pintura por outra do mesmo tamanho não mexe em nada daqui.
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.mapas_mesa (
  historia_id bigint PRIMARY KEY REFERENCES public.historias(id) ON DELETE CASCADE,
  dados       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mapas_mesa ENABLE ROW LEVEL SECURITY;

-- Quem enxerga a história enxerga o mapa dela: a subconsulta passa pela
-- policy historias_select_da_mesa (Mestre ou dono de um protagonista).
DROP POLICY IF EXISTS mapas_mesa_select_da_mesa ON public.mapas_mesa;
CREATE POLICY mapas_mesa_select_da_mesa ON public.mapas_mesa
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.historias h WHERE h.id = mapas_mesa.historia_id));

DROP POLICY IF EXISTS mapas_mesa_insert_mestre ON public.mapas_mesa;
CREATE POLICY mapas_mesa_insert_mestre ON public.mapas_mesa
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.historias h
                       WHERE h.id = mapas_mesa.historia_id AND h.mestre_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS mapas_mesa_update_mestre ON public.mapas_mesa;
CREATE POLICY mapas_mesa_update_mestre ON public.mapas_mesa
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.historias h
                  WHERE h.id = mapas_mesa.historia_id AND h.mestre_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.historias h
                       WHERE h.id = mapas_mesa.historia_id AND h.mestre_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS mapas_mesa_delete_mestre ON public.mapas_mesa;
CREATE POLICY mapas_mesa_delete_mestre ON public.mapas_mesa
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.historias h
                  WHERE h.id = mapas_mesa.historia_id AND h.mestre_id = (SELECT auth.uid())));

REVOKE ALL ON public.mapas_mesa FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapas_mesa TO authenticated;

CREATE TABLE IF NOT EXISTS public.mapa_marcas (
  personagem_id bigint PRIMARY KEY REFERENCES public.personagens(id) ON DELETE CASCADE,
  marcas        jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mapa_marcas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mapa_marcas_do_dono ON public.mapa_marcas;
CREATE POLICY mapa_marcas_do_dono ON public.mapa_marcas
  FOR ALL TO authenticated
  USING (personagem_id = ANY ((SELECT public._menestrel_meus_pjs())::bigint[]))
  WITH CHECK (personagem_id = ANY ((SELECT public._menestrel_meus_pjs())::bigint[]));

REVOKE ALL ON public.mapa_marcas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapa_marcas TO authenticated;

-- O jogador vê o Mestre mexer no mapa sem recarregar a página.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                  WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mapas_mesa') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mapas_mesa;
  END IF;
END $$;

-- Os ladrilhos da pintura. Público para leitura; ninguém envia pelo app.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mapas', 'mapas', true, 5242880, ARRAY['image/png', 'application/json'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'application/json'];

DROP POLICY IF EXISTS "mapas: leitura publica" ON storage.objects;
CREATE POLICY "mapas: leitura publica" ON storage.objects
  FOR SELECT USING (bucket_id = 'mapas');

-- CONFERÊNCIA
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('mapas_mesa','mapa_marcas') ORDER BY 1,2;
-- SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'mapas';
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mapas_mesa';
