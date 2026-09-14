-- scripts/sql/criaturas-haalin-nenrode.sql
-- ============================================================
-- Duas criaturas novas, derivadas de existentes (usuário, 13/09/2026):
--   Haalin   — versão +25% mais forte do Lobisomem (id 86)
--   Nenrode  — versão +10% mais forte do Vladimir  (id 127)
--
-- REGRA DE "MAIS FORTE" (arredonda para o inteiro mais próximo):
--   × fator: energia física, energia heroica, absorção, defesa, todos os danos
--            (L/M/P e 25/50/75/100) e os atributos Força, Físico, Agilidade,
--            Percepção e Aura;
--   iguais:  estágio, velocidade, peso, intelecto, carisma, tipo, subtipo,
--            ataque, armadura, magia/nível, plano, coletivo, habilidades.
--
-- Idempotente: não insere se já existir criatura com o mesmo nome.
-- REVERSÍVEL: DELETE FROM public.criaturas WHERE nome IN ('Haalin', 'Nenrode');
-- ============================================================

WITH base AS (
  SELECT 'Haalin'::text AS novo_nome, 1.25::numeric AS f, c.* FROM public.criaturas c WHERE c.id = 86
  UNION ALL
  SELECT 'Nenrode', 1.10, c.* FROM public.criaturas c WHERE c.id = 127
)
INSERT INTO public.criaturas
  (nome, tipo, subtipo, estagio, energia_fisica, energia_heroica, absorcao, armadura, tipo_armadura, defesa,
   velocidade, peso, ataque, dano_l, dano_m, dano_p, dano_25, dano_50, dano_75, dano_100,
   intelecto, aura, carisma, forca, fisico, agilidade, percepcao,
   descricao, plano, coletivo, magia, magia_n, tecnicas_especiais, habilidades)
SELECT novo_nome, tipo, subtipo, estagio,
  round(energia_fisica * f)::int, round(energia_heroica * f)::int, round(absorcao * f)::int, armadura, tipo_armadura, round(defesa * f)::int,
  velocidade, peso, ataque,
  round(dano_l * f)::int, round(dano_m * f)::int, round(dano_p * f)::int,
  round(dano_25 * f)::int, round(dano_50 * f)::int, round(dano_75 * f)::int, round(dano_100 * f)::int,
  intelecto, round(aura * f)::int, carisma, round(forca * f)::int, round(fisico * f)::int, round(agilidade * f)::int, round(percepcao * f)::int,
  descricao, plano, coletivo, magia, magia_n, tecnicas_especiais, habilidades
FROM base b
WHERE NOT EXISTS (SELECT 1 FROM public.criaturas x WHERE lower(x.nome) = lower(b.novo_nome));
