-- scripts/sql/classes-de-magia-2026-10-22.sql
-- Classe da magia (spec 2026-10-22-classes-de-magia-milagres). Pedido do
-- usuário: Feitiço (arcana, magos), Milagre (divina, sacerdotes), Encanto
-- (artística, bardos), Transmutação (espiritual, rastreadores). Uma classe
-- por magia; as 41 citadas por várias origens foram decididas pelo usuário.
BEGIN;
ALTER TABLE public.magias ADD COLUMN IF NOT EXISTS classe text;

-- Origem única, pela permissão.
WITH o AS (
  SELECT m.key,
    bool_or(btrim(p) = 'Mago' OR btrim(p) LIKE 'Colégio%')         AS arc,
    bool_or(btrim(p) = 'Sacerdote' OR btrim(p) LIKE 'Ordem%')      AS div,
    bool_or(btrim(p) = 'Bardo' OR btrim(p) LIKE 'Confraria%')      AS art,
    bool_or(btrim(p) = 'Rastreador' OR btrim(p) LIKE 'Trilha%')    AS esp
  FROM public.magias m
  CROSS JOIN LATERAL unnest(string_to_array(coalesce(m.permissao, ''), ',')) AS p
  GROUP BY m.key
)
UPDATE public.magias m SET classe = CASE
    WHEN o.arc THEN 'Feitiço' WHEN o.div THEN 'Milagre'
    WHEN o.art THEN 'Encanto' ELSE 'Transmutação' END
  FROM o
 WHERE m.key = o.key AND (o.arc::int + o.div::int + o.art::int + o.esp::int) = 1;

-- As 41 de várias origens (decisão do usuário, 22/10/2026).
UPDATE public.magias SET classe = v.classe
  FROM (VALUES
    ('Aeromanipulação','Feitiço'), ('Aeroproteção','Feitiço'), ('Amizade','Encanto'),
    ('Caçada Marcada','Transmutação'), ('Comunhão Natural','Transmutação'), ('Conhecimento','Encanto'),
    ('Conhecimento Natural','Transmutação'), ('Controle Climático','Transmutação'),
    ('Criptograma Místico','Feitiço'), ('Curas Heroicas','Milagre'), ('Degeneração Física','Feitiço'),
    ('Detecção de Magia','Feitiço'), ('Dom das Línguas','Encanto'), ('Elo Animal','Transmutação'),
    ('Esconjuração','Milagre'), ('Fotoataque','Feitiço'), ('Geoataque','Feitiço'), ('Geomanipulação','Feitiço'),
    ('Graça Felina','Transmutação'), ('Hidroataque','Feitiço'), ('Hidroproteção','Feitiço'),
    ('Hidromanipulação','Feitiço'), ('Intuição','Encanto'), ('Leitura','Encanto'), ('Lendas','Encanto'),
    ('Maldições','Milagre'), ('Memorização','Encanto'), ('Modificar Espírito','Encanto'), ('Mutação','Feitiço'),
    ('Necroconhecimento','Feitiço'), ('Ossos de Aço','Transmutação'), ('Piroataque','Feitiço'),
    ('Piromanipulação','Feitiço'), ('Piroproteção','Feitiço'), ('Quebra de Encantos','Feitiço'),
    ('Respiração Arcana','Feitiço'), ('Runas','Encanto'), ('Sombra','Encanto'),
    ('Super Resistência','Transmutação'), ('Transformação Metálica','Feitiço'), ('Ventriloquismo','Encanto')
  ) AS v(nome, classe)
 WHERE public.magias.nome = v.nome;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.magias WHERE classe IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '% magia(s) sem classe', n; END IF;
END $$;

ALTER TABLE public.magias ALTER COLUMN classe SET NOT NULL;
ALTER TABLE public.magias DROP CONSTRAINT IF EXISTS magias_classe_chk;
ALTER TABLE public.magias ADD CONSTRAINT magias_classe_chk
  CHECK (classe IN ('Feitiço', 'Milagre', 'Encanto', 'Transmutação'));
COMMIT;
