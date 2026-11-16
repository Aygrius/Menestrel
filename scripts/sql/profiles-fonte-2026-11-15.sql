-- 15/11/2026 — A fonte dos títulos, escolhida nas Configurações.
--
-- Usuário: "Vamos continuar usando Spectral SC mesmo, mas deixe a fonte salva.
-- E coloque uma opção de mudar a fonte no menu configurações."
-- Como a paleta (profiles.paleta): o perfil guarda a escolha, e o navegador a
-- da última visita. NULL = a padrão (Spectral SC).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fonte text;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_fonte_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_fonte_check CHECK (fonte IS NULL OR fonte IN ('spectral', 'goudy'));

-- Conferência: SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'fonte';
