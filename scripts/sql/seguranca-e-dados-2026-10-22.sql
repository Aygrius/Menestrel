-- scripts/sql/seguranca-e-dados-2026-10-22.sql
-- ============================================================
-- Busca por bugs de 22/10/2026 — o que mudou no banco, e o que falta.
-- ============================================================

-- ── JÁ APLICADO ─────────────────────────────────────────────

-- Pergaminho e criatura com o nome velho de "Presságio" (a magia
-- pressagio_curativo foi renomeada; o Enviado V perdia a magia no combate,
-- que casa pelo nome).
UPDATE public.itens SET magia = 'Presságio',
  nome = CASE WHEN nome = 'Pergaminho Presságio Curativo' THEN 'Pergaminho Presságio' ELSE nome END
 WHERE slug = 'pergaminho_pressagio_curativo' AND magia = 'Presságio Curativo';
UPDATE public.criaturas SET magia = regexp_replace(magia, '(^|,\s*)Presságio Curativo(\s*(,|$))', '\1Presságio\2')
 WHERE nome = 'Enviado V' AND magia ~ '(^|,\s*)Presságio Curativo(\s*(,|$))';

-- Migração avulsa que reescreve o inventário de TODOS os PJs, sem checar
-- quem chama: fora do alcance da API (continua rodável pelo SQL).
REVOKE EXECUTE ON FUNCTION public.migrar_moedas_para_itens() FROM PUBLIC, anon, authenticated;
-- Nome completo de qualquer jogador: o front não usa; fora do anônimo.
REVOKE EXECUTE ON FUNCTION public.resolver_nomes_jogadores(uuid[]) FROM PUBLIC, anon;

-- search_path fixo (advisor function_search_path_mutable).
ALTER FUNCTION public.diario_set_updated_at() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.batalhas_touch_updated_at() SET search_path = public;
-- (e estoque_loja_flat, gerar_codigo_convite_v1, _menestrel_estagio,
--  excluir_convite, reativar_convite — aplicado por laço sobre pg_proc.)

-- ── APLICADO DEPOIS, COM AUTORIZAÇÃO DO USUÁRIO (opção A, 22/10/2026) ──

-- CRÍTICO: mestre_ajustar_moedas é SECURITY DEFINER, não confere quem chama
-- e está aberta a anon e authenticated — qualquer um dá ou tira moedas de
-- qualquer PJ pela API. Sem chamador no front desde 17/09/2026.
REVOKE EXECUTE ON FUNCTION public.mestre_ajustar_moedas(bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- Leitura aberta ao anônimo (loja da mesa e colegas de um PJ qualquer);
-- o front só chama logado.
REVOKE EXECUTE ON FUNCTION public.get_loja_pj(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_pjs_historia(bigint) FROM PUBLIC, anon;
