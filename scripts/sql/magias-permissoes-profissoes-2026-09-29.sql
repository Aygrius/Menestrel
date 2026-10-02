-- Reforma de permissões por profissão (29/09/2026)
-- Estudo: docs/estudo-magias-profissoes.md, §4.1 a §4.4. Aprovado pelo
-- usuário: "Pode fazer conforme sugerido."
--
-- Hierarquia pedida: Mago > Sacerdote > Bardo = Rastreador.
-- 17 permissões mudam; nenhuma magia é criada ou apagada.
--
-- Cada UPDATE confere a permissão de ANTES: se alguém a editou depois do
-- estudo, a linha fica como está e o total no fim acusa (esperado: 17).
--
-- Quem perde acesso a uma magia que já comprou (Lirael: Arqueirismo e
-- Aeroproteção) a mantém no nível que tem — a ficha e o criador passaram a
-- listar a magia possuída mesmo sem acesso; só não sobe mais.

BEGIN;

WITH mudancas(key, antes, depois) AS (VALUES
  -- §4.1 Mago: o que já era de dois Colégios vira tronco comum.
  ('desintegracao',   'Colégio Naturalista, Colégio Elemental',       'Mago'),
  ('escuridao',       'Colégio Ilusionista, Colégio Necromântico',    'Mago'),
  ('medo',            'Colégio Ilusionista, Colégio Necromântico',    'Mago'),
  -- §4.2 Sacerdote: sai do tronco o que é de um deus.
  ('relampago',       'Colégio Naturalista, Sacerdote',               'Colégio Naturalista'),
  ('hidroprotecao',   'Sacerdote, Colégio Elemental',                 'Ordem de Ganis, Colégio Elemental'),
  -- §4.3 Bardo: a Confraria de Arautos ganha corpo; Leitura vai ao tronco.
  ('lenda_viva',         'Confraria de Eruditos', 'Confraria de Eruditos, Confraria de Arautos'),
  ('convivencia',        'Confraria de Eruditos', 'Confraria de Eruditos, Confraria de Arautos'),
  ('leitura_de_habitos', 'Confraria de Eruditos', 'Confraria de Eruditos, Confraria de Arautos'),
  ('cadencia_veloz',     'Confraria de Artistas', 'Confraria de Artistas, Confraria de Arautos'),
  ('aura_ameacadora',    'Confraria de Artistas', 'Confraria de Artistas, Confraria de Arautos'),
  ('fascinio',           'Confraria de Artistas', 'Confraria de Artistas, Confraria de Arautos'),
  ('tensao',             'Confraria de Artistas', 'Confraria de Artistas, Confraria de Arautos'),
  ('leitura', 'Confraria de Eruditos, Colégio Filosófico, Ordem de Palier', 'Bardo, Colégio Filosófico, Ordem de Palier'),
  -- §4.4 Rastreador: sai do tronco o que é de uma Trilha; Guardiões encolhe.
  ('arqueirismo',     'Rastreador',                                   'Trilha de Caçadores'),
  ('aeroprotecao',    'Rastreador, Colégio Elemental',                'Trilha de Exploradores, Colégio Elemental'),
  ('distracao',       'Bardo, Trilha de Guardiões',                   'Bardo'),
  ('bencao_selvagem', 'Trilha de Caçadores, Trilha de Guardiões',     'Trilha de Caçadores')
),
feitas AS (
  UPDATE public.magias m
     SET permissao = mu.depois
    FROM mudancas mu
   WHERE m.key = mu.key AND m.permissao = mu.antes
  RETURNING m.key
)
SELECT count(*) AS alteradas FROM feitas;  -- esperado: 17

COMMIT;
