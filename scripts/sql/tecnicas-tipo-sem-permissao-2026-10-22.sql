-- scripts/sql/tecnicas-tipo-sem-permissao-2026-10-22.sql
-- ============================================================
-- Técnicas sem permissão (22/10/2026). Pedido do usuário: "Organize da
-- mesma forma que você fez com as magias." Qualquer profissão aprende
-- qualquer técnica pelo item; a permissão só sobrava para dividir o menu em
-- Básicas e Especializadas. Essa divisão vira coluna própria (tipo), como o
-- tipo das magias, gravada UMA vez pela regra de 26/09/2026 (categoriaTecnica):
--   Especializada = a permissão só cita academias/guildas;
--   Básica        = cita alguma profissão, ou não tem restrição.
-- Depois a coluna permissao sai, com backup. IDEMPOTENTE.
-- ============================================================
BEGIN;

ALTER TABLE public.tecnicas ADD COLUMN IF NOT EXISTS tipo text;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'tecnicas' AND column_name = 'permissao') THEN
    CREATE TABLE IF NOT EXISTS public.backup_tecnicas_permissao_2026_10_22 AS
      SELECT key, nome, permissao FROM public.tecnicas;
    ALTER TABLE public.backup_tecnicas_permissao_2026_10_22 ENABLE ROW LEVEL SECURITY;
    EXECUTE $q$
      UPDATE public.tecnicas SET tipo = CASE
        WHEN nullif(btrim(permissao), '') IS NULL THEN 'Básica'
        WHEN EXISTS (SELECT 1 FROM unnest(string_to_array(permissao, ',')) x
                      WHERE btrim(x) IN ('Bardo','Guerreiro','Ladino','Mago','Rastreador','Sacerdote')) THEN 'Básica'
        ELSE 'Especializada' END
       WHERE tipo IS NULL
    $q$;
  END IF;
END $$;

UPDATE public.tecnicas SET tipo = 'Básica' WHERE tipo IS NULL;
ALTER TABLE public.tecnicas ALTER COLUMN tipo SET DEFAULT 'Básica';
ALTER TABLE public.tecnicas ALTER COLUMN tipo SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tecnicas_tipo_check') THEN
    ALTER TABLE public.tecnicas ADD CONSTRAINT tecnicas_tipo_check CHECK (tipo IN ('Básica', 'Especializada'));
  END IF;
END $$;

-- Guarda: o backup tem todas as técnicas antes de a coluna sair.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'tecnicas' AND column_name = 'permissao')
     AND (SELECT count(*) FROM public.backup_tecnicas_permissao_2026_10_22)
         < (SELECT count(*) FROM public.tecnicas) THEN
    RAISE EXCEPTION 'backup incompleto — a coluna permissao não sai';
  END IF;
END $$;

ALTER TABLE public.tecnicas DROP COLUMN IF EXISTS permissao;

COMMIT;
