-- scripts/sql/acerto-atributos-mod-racial.sql
-- ============================================================
-- Distribui o saldo de pontos que a nova regra do modificador racial
-- devolveu a cada personagem já existente.
--
-- POR QUÊ
-- ============================================================
-- Até 08/09/2026 o modificador de raça não fazia nada: `calcularFicha` não o
-- somava e o wizard nunca semeava `X_base` com ele. Na prática todo jogador
-- comprou do zero absoluto os níveis que a raça deveria ter dado de graça.
--
-- A regra nova (01-core/game-data.jsx) faz do modificador o NÍVEL INICIAL
-- gratuito, e `pontosGastos(baseVals, raca)` passa a medir o gasto a partir
-- dessa linha de base. Consequência: cada personagem não-humano ficou com
-- saldo sobrando — entre 1,5 e 5 pontos.
--
-- POR QUE **NÃO** É UM `X_base = X_base + mod`
-- ============================================================
-- Somar o modificador em cima do valor salvo parece a correção óbvia e é a
-- errada. A tabela de custo é convexa (1, 3, 6, 10, 15, 21), então empurrar
-- cada atributo pra cima e remedir a partir da nova linha de base cobra MAIS
-- do que o jogador pagou: o Galadar tinha Físico 3 (custo 6) e viraria
-- Físico 5 com base 2, ou seja 15 − 3 = 12. Simulado com as funções reais,
-- todo PJ de modificador positivo terminava endividado em 6 a 13 pontos, e o
-- wizard travaria a edição. Quatro valores ainda estouravam a faixa −2..6.
--
-- Por isso os valores salvos ficam onde estão: eles JÁ representam a linha de
-- base racial mais o que foi comprado. O que este script faz é só gastar o
-- saldo que sobrou, na profissão de cada personagem primeiro.
--
-- CADA UPDATE É GUARDADO PELO VALOR DE ORIGEM
-- ============================================================
-- O `and <coluna> = <valor antigo>` impede aplicação dupla e protege contra
-- um personagem que tenha sido editado no app depois desta conta. Se um
-- UPDATE afetar 0 linhas, aquele PJ mudou e precisa ser refeito à mão.
--
-- Os três Humanos (Aldren 54, Victor 67, Adrian 69) não entram: sem
-- modificador racial, não sobrou saldo. É o vão que a equalização de raças
-- (bonusPontosRaca, mesma data) resolve.
-- ============================================================

begin;

-- Nihil · Meio-Elfo · Ladino — saldo 1,5 → Per 0→1 (resta 0,5)
update personagens set percepcao_base = 1
 where id = 35 and percepcao_base = 0;

-- Lysandra · Elfo-Florestal · Sacerdote — saldo 4 → Aura 3→4
update personagens set aura_base = 4
 where id = 51 and aura_base = 3;

-- Galadar · Anão · Sacerdote — saldo 4 → Aura 2→3, Car 0→1
update personagens set aura_base = 3, carisma_base = 1
 where id = 57 and aura_base = 2 and carisma_base = 0;

-- Yuldrous · Anão · Sacerdote — saldo 2 → Per 1→2
update personagens set percepcao_base = 2
 where id = 64 and percepcao_base = 1;

-- Eco · Elfo-Dourado · Mago — saldo 3,5 → Aura 2→3, For −2→−1
update personagens set aura_base = 3, forca_base = -1
 where id = 66 and aura_base = 2 and forca_base = -2;

-- Lamarc · Meio-Elfo · Mago — saldo 1,5 → For −1→0, Per 0→1
update personagens set forca_base = 0, percepcao_base = 1
 where id = 71 and forca_base = -1 and percepcao_base = 0;

-- Lirael · Elfo-Florestal · Rastreador — saldo 3 → Fís 1→2, Int 0→1
update personagens set fisico_base = 2, intelecto_base = 1
 where id = 74 and fisico_base = 1 and intelecto_base = 0;

-- Elarion · Elfo-Dourado · Mago — saldo 3,5 → Per 2→3 (resta 0,5).
-- Aura 5→6 custaria 6 e ele nunca alcança com saldo de acerto.
update personagens set percepcao_base = 3
 where id = 75 and percepcao_base = 2;

-- Krog · Meio-Orc · Guerreiro — saldo 5 → For 3→4, Int 0→1
update personagens set forca_base = 4, intelecto_base = 1
 where id = 76 and forca_base = 3 and intelecto_base = 0;

-- Kael · Elfo-Dourado · Bardo — saldo 3,5 → For 0→1, Fís 0→1, Agi 0→1
-- (resta 0,5). Car 3→4 custa 4 e não cabe; comprou corpo.
update personagens set forca_base = 1, fisico_base = 1, agilidade_base = 1
 where id = 78 and forca_base = 0 and fisico_base = 0 and agilidade_base = 0;

-- Tobin · Pequenino · Ladino — saldo 3 → Car 1→2, For 0→1.
-- Agi e Per, os atributos de Ladino, custam 4 cada e não cabem.
update personagens set carisma_base = 2, forca_base = 1
 where id = 79 and carisma_base = 1 and forca_base = 0;

commit;


-- ============================================================
-- ROLLBACK — valores exatos de antes desta distribuição
-- ============================================================
-- begin;
-- update personagens set percepcao_base = 0                                     where id = 35;
-- update personagens set aura_base = 3                                          where id = 51;
-- update personagens set aura_base = 2, carisma_base = 0                        where id = 57;
-- update personagens set percepcao_base = 1                                     where id = 64;
-- update personagens set aura_base = 2, forca_base = -2                         where id = 66;
-- update personagens set forca_base = -1, percepcao_base = 0                    where id = 71;
-- update personagens set fisico_base = 1, intelecto_base = 0                    where id = 74;
-- update personagens set percepcao_base = 2                                     where id = 75;
-- update personagens set forca_base = 3, intelecto_base = 0                     where id = 76;
-- update personagens set forca_base = 0, fisico_base = 0, agilidade_base = 0    where id = 78;
-- update personagens set carisma_base = 1, forca_base = 0                       where id = 79;
-- commit;
