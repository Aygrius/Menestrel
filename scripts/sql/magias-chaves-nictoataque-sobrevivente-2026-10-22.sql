-- scripts/sql/magias-chaves-nictoataque-sobrevivente-2026-10-22.sql
-- ============================================================
-- Pedido do usuário (22/10/2026): "Arrume as chaves internas."
-- Nictoataque (era Ataque Infernal) e Sobrevivente (era Abrigo) foram
-- renomeadas e guardavam a chave antiga. A chave deriva do nome
-- (magias-key-alinha-nome.sql) e o registro de efeitos do código usa a nova.
--
-- Levantado antes: nenhum personagem, estado, inventário, batalha, loja ou
-- log usa as chaves antigas. O pergaminho de cada uma muda de slug, e
-- livro_pergaminhos acompanha por ON UPDATE CASCADE.
-- ============================================================
BEGIN;
UPDATE public.magias SET key = 'nictoataque', atualizado_em = now() WHERE key = 'ataque_infernal';
UPDATE public.magias SET key = 'sobrevivente', atualizado_em = now() WHERE key = 'abrigo';
UPDATE public.itens SET slug = 'pergaminho_nictoataque', atualizado_em = now() WHERE slug = 'pergaminho_ataque_infernal';
UPDATE public.itens SET slug = 'pergaminho_sobrevivente', atualizado_em = now() WHERE slug = 'pergaminho_abrigo';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.magias WHERE key IN ('ataque_infernal', 'abrigo');
  IF n > 0 THEN RAISE EXCEPTION 'chave antiga sobrou'; END IF;
  SELECT count(*) INTO n FROM public.magias m
   WHERE NOT EXISTS (SELECT 1 FROM public.itens i WHERE i.slug = 'pergaminho_' || m.key);
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) sem pergaminho', n; END IF;
END $$;
COMMIT;
