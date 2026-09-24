-- Três versões do Dragoniano (24/09/2026)
-- Pedido do usuário: "Dragoniano jovem = um pouco mais fraco; Dragoniano
-- líder = muito mais forte; Dragoniano guerreiro = um pouco mais forte."
-- Copia o Dragoniano (id 240) e sobrescreve atributos, equipamento e técnicas.
-- As colunas calculadas seguem 09-bestiario/criatura-formulas.jsx:
--   EF = ⌈2·√peso + Físico⌉ · EH = (12 + Aura) × Estágio · VB = (Fís + Agi) × Estágio
--   Absorção/Defesa = soma das peças (+ Agilidade na defesa)
--   L/M/P = arma + Força (ajuste FOR) · Dano 100% = dano da arma + Força
-- Idempotente: só insere o nome que ainda não existe.

insert into criaturas (
  nome, tipo, estagio, energia_fisica, energia_heroica, absorcao, armadura, defesa, velocidade, peso,
  ataque, dano_l, dano_m, dano_p, dano_25, dano_50, dano_75, dano_100,
  intelecto, aura, carisma, forca, fisico, agilidade, percepcao,
  tipo_armadura, descricao, subtipo, plano, coletivo, magia, magia_n, tecnicas_especiais, habilidades,
  equipamento, montaria, altura, elemento
)
select
  v.nome, b.tipo, v.estagio, v.ef, v.eh, v.absorcao, 'M', v.defesa, v.vb, v.peso,
  v.ataque, v.dl, v.dm, v.dp, v.d25, v.d50, v.d75, v.d100,
  v.intelecto, v.aura, v.carisma, v.forca, v.fisico, v.agilidade, v.percepcao,
  'M', v.descricao, b.subtipo, b.plano, b.coletivo, b.magia, b.magia_n, v.tecnicas, b.habilidades,
  v.equipamento::jsonb, b.montaria, v.altura, b.elemento
from criaturas b
cross join (values
  ('Dragoniano Jovem', 5, 21, 70, 14, 9, 20, 100, 1.75,
   'Espada Longa', -2, 2, 6, 8, 15, 23, 30,
   '1', 2, 0, 2, 1, 3, 3,
   'Ataque Oportuno 5, Esquiva 5, Fúria 7, Imprevisibilidade 5',
   '[{"slot":"pes","slug":"botas_de_malha"},{"slot":"pernas","slug":"calca_de_malha"},{"slot":"peito","slug":"cota_de_malha"},{"slot":"arma","slug":"espada_longa"}]',
   'Recém-saído do ritual que o transformou, o dragoniano jovem ainda se acostuma ao próprio corpo: as escamas são mais finas e a cauda ainda não tem o peso que terá. É mandado às incursões para aprender, quase sempre na retaguarda, e compensa a inexperiência com a ânsia de provar à tribo que foi uma criança que valeu a pena salvar.'),
  ('Dragoniano Guerreiro', 7, 27, 98, 33, 11, 42, 140, 2.0,
   'Montante', -1, 3, 7, 9, 17, 25, 33,
   '1', 2, 0, 3, 3, 3, 3,
   'Ataque Oportuno 8, Esquiva 8, Fúria 11, Imprevisibilidade 8',
   '[{"slot":"pes","slug":"botas_de_malha_verrogari"},{"slot":"pernas","slug":"calca_de_malha_verrogari"},{"slot":"peito","slug":"cota_de_malha_verrogari"},{"slot":"ombros","slug":"espaldares_de_malha_verrogari"},{"slot":"bracos","slug":"manoplas_de_malha_verrogari"},{"slot":"arma","slug":"espada_montante"}]',
   'O guerreiro é quem abre as incursões. Veterano de muitos saques, veste a malha tomada de povoados que já não existem e maneja o montante com as duas mãos, usando a cauda como contrapeso. Na tribo, é ele quem decide quais crianças serão levadas e quais adultos servirão ao festim.'),
  ('Dragoniano Líder', 10, 30, 150, 43, 12, 80, 160, 2.2,
   'Kronagar', 2, 6, 10, 11, 22, 33, 43,
   '2', 3, 2, 4, 4, 4, 4,
   'Ataque Oportuno 10, Esquiva 10, Fúria 13, Imprevisibilidade 10',
   '[{"slot":"pes","slug":"botas_de_malha_padmarashka"},{"slot":"pernas","slug":"calca_de_malha_padmarashka"},{"slot":"peito","slug":"cota_de_malha_padmarashka"},{"slot":"ombros","slug":"espaldares_de_malha_padmarashka"},{"slot":"bracos","slug":"manoplas_de_malha_padmarashka"},{"slot":"arma","slug":"espada_montante_kronagar"}]',
   'Cada tribo segue um líder, e ele é quase sempre o mais antigo entre os transformados. Maior e mais pesado que os outros, de escamas cor de marfim envelhecido, fala em nome dos dragões e interpreta os sinais do céu para a tribo. É ele quem decide quando atacar e quando partir — e raramente é visto lutando, porque quando luta, poucos sobram para contar.')
) as v(nome, estagio, ef, eh, absorcao, defesa, vb, peso, altura,
       ataque, dl, dm, dp, d25, d50, d75, d100,
       intelecto, aura, carisma, forca, fisico, agilidade, percepcao,
       tecnicas, equipamento, descricao)
where b.id = 240
  and not exists (select 1 from criaturas c where c.nome = v.nome);
