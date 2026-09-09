-- scripts/sql/seguranca-rls-fix.sql
-- ============================================================
-- APLICADO EM 01/09/2026 no projeto kaxbdpdutentlrobuqyu.
-- Registro do que foi feito, e por quê. Não precisa rodar de novo.
--
-- Origem: advisor de segurança do Supabase, 115 avisos. Só 3 eram ERRO;
-- 111 dos avisos são ruído esperado para um app Supabase (ver o fim).
-- Resultado: 3 ERROS → 1, e o que sobrou é intencional (ver bloco 1).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1) CRÍTICO — escrita em `profiles` através da view public_profiles
-- ────────────────────────────────────────────────────────────
-- O advisor classificava isto só como "Security Definer View". Era pior:
-- um caminho de ESCRITA aberto para qualquer um.
--
--     public_profiles é auto-atualizável ...... is_updatable = YES
--     dona = postgres, e NÃO é security_invoker
--     profiles tem RLS, mas SEM force row level security
--                            → o dono da tabela ignora a RLS
--     anon/authenticated tinham INSERT/UPDATE/DELETE/TRUNCATE na view
--
-- Somando: qualquer pessoa com a chave anon (pública, vai no bundle do site)
-- renomeava ou apagava o perfil de QUALQUER usuário, furando a política de
-- "cada um só mexe no próprio". Confirmado por metadados, não por exploração.
--
-- A leitura precisa continuar: o app usa a view para mostrar o nome dos
-- outros jogadores (src/data/bridge.ts:95) — é para isso que ela fura a RLS
-- de propósito. Só a escrita saiu.
revoke insert, update, delete, truncate, references
  on public.public_profiles from anon, authenticated;

-- Endurecimento: sem isto, um visitante DESLOGADO listava o nome de todos os
-- usuários. `authenticated` mantém o SELECT, que é quem o app usa.
-- ⚠ SE ALGUM NOME DE JOGADOR SUMIR DA TELA, é esta linha que se desfaz:
--     grant select on public.public_profiles to anon;
revoke select on public.public_profiles from anon;

-- NOTA: o advisor CONTINUA acusando "security_definer_view" depois disto, e
-- está certo — a view segue SECURITY DEFINER. Isso é intencional e não tem
-- conserto sem quebrar a funcionalidade: torná-la security_invoker faria a
-- RLS de profiles valer, e cada jogador voltaria a ver só o próprio nome.
-- A metade perigosa (escrita) é a que foi fechada.


-- ────────────────────────────────────────────────────────────
-- 2) ALTO — catálogo `itens` sem RLS e com grants de escrita
-- ────────────────────────────────────────────────────────────
-- RLS DESLIGADA + grants completos para anon: dava para apagar o catálogo
-- de itens inteiro com a chave pública.
--
-- Seguro porque o app só LÊ esta tabela — conferido nos 9 call sites
-- (inventario-helpers:63, personagens:826, bestiario:770, ficha:1598,
-- batalha:790/1765/4522, diario:2680/2993), todos .select().
--
-- A ORDEM IMPORTA: política criada JUNTO com o enable, na mesma transação.
-- Ligar RLS sem política deixaria o catálogo invisível e derrubaria ficha,
-- batalha, loja e bestiário de uma vez.
begin;
  alter table public.itens enable row level security;

  create policy itens_leitura_publica
    on public.itens for select
    to anon, authenticated
    using (true);

  -- Defesa em profundidade: sem grant de escrita, nem uma política futura
  -- criada por engano reabre o buraco.
  revoke insert, update, delete, truncate, references
    on public.itens from anon, authenticated;
commit;


-- ────────────────────────────────────────────────────────────
-- 3) ALTO — tabela de backup exposta
-- ────────────────────────────────────────────────────────────
-- criaturas_lmp_backup_20260830 (207 linhas, backup de 30/08/2026): RLS
-- desligada, grants completos, e não referenciada em lugar nenhum do código.
-- RLS ligada SEM política = inacessível pela API, preservada no banco.
-- Não foi apagada: backup é seu, a decisão de descartar é sua.
alter table public.criaturas_lmp_backup_20260830 enable row level security;
revoke all on public.criaturas_lmp_backup_20260830 from anon, authenticated;

-- Quando não precisar mais:  drop table public.criaturas_lmp_backup_20260830;
-- (o advisor passa a acusar "rls_enabled_no_policy" nesta tabela — é o
--  comportamento desejado aqui, não um problema.)


-- ────────────────────────────────────────────────────────────
-- 4) MÉDIO — search_path mutável em SECURITY DEFINER
-- ────────────────────────────────────────────────────────────
-- Das 11 funções que o advisor listava, só 4 eram SECURITY DEFINER — que é
-- onde search_path mutável vira escalada de privilégio de verdade.
--
-- Lendo o corpo delas apareceu outra coisa: DUAS estão MORTAS. `excluir_convite`
-- e `reativar_convite` operam sobre a tabela `convites`, que NÃO EXISTE
-- (to_regclass devolve null) — sobras de quando o nome virou
-- `convites_historia`. Só podem dar erro, e o app não chama nenhuma das duas.
-- Eram superfície de ataque SECURITY DEFINER de graça.
--
-- 4a) As duas VIVAS: qualificadas + search_path fixo.
--     `convites_historia` sem qualificar quebraria com search_path vazio;
--     json_build_object/now()/interval vêm de pg_catalog, que é sempre
--     pesquisado, então continuam funcionando.
CREATE OR REPLACE FUNCTION public.excluir_convite_historia(p_convite_id bigint)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.convites_historia
    WHERE id = p_convite_id AND mestre_id = auth.uid()
  ) THEN
    RETURN json_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  DELETE FROM public.convites_historia WHERE id = p_convite_id;
  RETURN json_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reativar_convite_historia(p_convite_id bigint)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.convites_historia
    WHERE id = p_convite_id AND mestre_id = auth.uid()
  ) THEN
    RETURN json_build_object('ok', false, 'motivo', 'sem_permissao');
  END IF;

  UPDATE public.convites_historia
  SET status = 'ativo', expira_em = now() + interval '7 days'
  WHERE id = p_convite_id;

  RETURN json_build_object('ok', true);
END;
$function$;

-- 4b) As duas MORTAS: revogada a execução, não apagadas. Tira a superfície
--     sem destruir nada — reversível com um grant se algum dia voltarem a
--     fazer sentido. Se quiser limpar de vez:
--       drop function public.excluir_convite(bigint);
--       drop function public.reativar_convite(bigint);
revoke execute on function public.excluir_convite(bigint)  from anon, authenticated;
revoke execute on function public.reativar_convite(bigint) from anon, authenticated;

-- 4c) NÃO MEXIDO — as 7 restantes com search_path mutável são SECURITY
--     INVOKER (rodam com os direitos de quem chama), risco bem menor:
--       set_updated_at, diario_set_updated_at, batalhas_touch_updated_at,
--       gerar_codigo_convite_v1, estoque_loja_flat,
--       _menestrel_estagio, _menestrel_pontos_magia_estagio
--     Corrigir exige reescrever o corpo de cada uma (mesma qualificação do
--     4a). Vale fazer, mas é manutenção, não incidente.


-- ============================================================
-- VERIFICADO com a chave anon REAL, via PostgREST (01/09/2026)
-- ============================================================
--   GET  /rest/v1/itens?select=slug,nome ............ HTTP 200  ✅ app lê
--   PATCH /rest/v1/itens ........................... HTTP 401  ✅ fechado
--   PATCH /rest/v1/public_profiles ................. HTTP 401  ✅ CRÍTICO fechado
--   GET  /rest/v1/public_profiles .................. HTTP 401  ✅ anon não enumera
--   GET  /rest/v1/criaturas_lmp_backup_20260830 .... HTTP 401  ✅ fechado
--
-- NÃO VERIFICADO: leitura de public_profiles por usuário AUTENTICADO. O grant
-- de SELECT para `authenticated` foi preservado e conferido em
-- information_schema, mas não deu para exercitar sem uma sessão logada.
-- Ao entrar no app, confira se os nomes dos jogadores continuam aparecendo.


-- ============================================================
-- O QUE **NÃO** É PROBLEMA, apesar de aparecer no advisor
-- ============================================================
-- • 100 avisos "security_definer_function_executable" (50 funções × anon +
--   authenticated). São a camada de RPC do app — aceitar_convite, comprar_item,
--   transfer_item, registrar_evento_mesa, atualizar_batalha_jogador e cia.
--   SECURITY DEFINER aqui é o padrão CORRETO: é assim que a regra de negócio
--   roda no servidor em vez de confiar no cliente, e cada uma já valida quem
--   chama (o `IF ... auth.uid() THEN sem_permissao` que se vê no 4a). Não mexer.


-- ============================================================
-- PENDENTE — fora do SQL, precisa do dashboard
-- ============================================================
-- • "Leaked password protection" está DESLIGADA:
--   Authentication → Providers → Password → "Prevent use of leaked passwords".
--   Hoje o login é só Google, então não há superfície na prática — mas é de
--   graça e cobre o dia em que voltar a existir senha.
