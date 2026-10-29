-- scripts/sql/montaria-aceita-arreamento-2026-10-27.sql
-- ============================================================================
-- QUEM PODE SER MONTADO PODE USAR ARREAMENTO (27/10/2026)
--
-- Pedido do usuário:
--   "Crie os itens no sistema e no figma para a montaria. Os animais que podem
--    ser montados, podem usar os itens de montaria."
--
-- Os treze itens já existiam (arreamento-e-atrelado-2026-10-05.sql). O que não
-- existia era a REGRA certa: a porta das onze peças de montaria era o CSV
-- `itens.animal_subtipos`, escrito à mão com sete subtipos —
--
--   'Cavalo, Grifo, Dragão, Avestruz, Pônei, Elefante, Camelo'
--
-- — enquanto `criaturas.montaria` já respondia a mesma pergunta, e melhor.
-- Em 27/10/2026 o banco tinha 28 criaturas montáveis em VINTE subtipos. Treze
-- deles ficavam de fora e não podiam receber peça nenhuma:
--
--   Águia, Búfalo, Cavalum, Cérberus, Dradenar, Drake, Mamute, Mula, Pégaso,
--   Quimera, Tigre, Unicórnio, Vaca
--
-- (conferido com: select subtipo from public.criaturas where montaria
--  and subtipo not in ('Cavalo','Grifo','Dragão','Avestruz','Pônei','Elefante','Camelo'))
--
-- Uma lista escrita à mão ao lado de uma coluna que já sabe a resposta só sabe
-- ficar velha: criatura montável nova nascia sem poder usar sela, e ninguém
-- era avisado. A regra passa a ser lida de `criaturas.montaria` (front:
-- ehPecaDeMontaria / animalAceitaAPeca em src/07-inventario/inventario.jsx).
--
-- O ATRELADO NÃO MUDA. Quem PUXA não precisa ser montável: o boi puxa o carro
-- e não se monta, o lobo puxa o trenó. As duas listas do pedido de 05/10
-- continuam onde estavam, e `animal_subtipos` continua existindo para elas —
-- e para qualquer peça futura que precise mesmo de uma lista.
--
-- Esta migração só APAGA a lista que virou mentira: deixá-la no banco faria o
-- editor e o aviso de recusa dizerem uma regra que o sistema não usa mais.
-- ============================================================================

-- As onze casas de montaria (tudo o que não é 'atrelado') perdem o CSV.
update public.itens
   set animal_subtipos = null
 where slot_arreio is not null
   and slot_arreio <> 'atrelado'
   and animal_subtipos is not null;

comment on column public.itens.animal_subtipos is
  'CSV de criaturas.subtipo que aceita a peça — hoje só o atrelado (quem puxa). NULL = sem restrição por subtipo. A peça de MONTARIA (slot_arreio <> atrelado) não usa esta coluna: quem decide é criaturas.montaria.';

-- ── CONFERÊNCIA ─────────────────────────────────────────────────────────────
-- Nenhuma peça de montaria com lista sobrando (tem de voltar 0):
--   select count(*) from public.itens
--    where slot_arreio is not null and slot_arreio <> 'atrelado'
--      and animal_subtipos is not null;
--
-- O atrelado intacto (tem de voltar as seis linhas de 05/10):
--   select nome, animal_subtipos from public.itens
--    where slot_arreio = 'atrelado' order by nome;
--
-- Quantos bichos ganharam arreamento com a mudança:
--   select count(*) from public.criaturas where montaria
--     and subtipo not in ('Cavalo','Grifo','Dragão','Avestruz','Pônei','Elefante','Camelo');
