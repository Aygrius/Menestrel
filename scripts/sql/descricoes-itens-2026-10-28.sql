-- ============================================================
-- AS DESCRIÇÕES QUE FALTAVAM (28/10/2026)
-- ============================================================
-- Pedido do usuário: "Com base na descrição dos itens atuais, crie a descrição
-- dos itens que estão sem", com a Lança como exemplo de voz:
--   "Arma de haste longa equipada com uma ponta metálica, oferecendo maior
--    alcance que a maioria das armas corpo a corpo."
--
-- Eram 50 itens: 35 Vestimentas, 9 Armas, 3 Armaduras, 3 Serviços. Os outros
-- nove grupos do catálogo já estavam completos.
--
-- O ESTILO NÃO FOI INVENTADO: cada família do catálogo já tinha o seu, e o
-- texto novo entra na forma da família a que pertence.
--   • Caneleiras seguem as Grevas e as Botas:
--       "As Grevas de Aço são equipamento de aço para proteção das pernas."
--   • Jóias seguem os Anéis, Colares e Brincos — e a escada de material é a
--     mesma que o catálogo já usa: cobre é "simples", prata e ouro são
--     "sofisticado", com "entalhes finos" nos caros.
--   • O Chapéu de Veludo seguiria "O Chapéu de X é um adereço para proteção
--     contra o sol", mas veludo não é peça de sol: virou adereço de corte, e
--     o texto diz isso em vez de repetir uma função que ele não cumpre.
--   • As Diárias seguem "Diária em hospital para recuperação."
--   • As nove Armas são ARMAS NATURAIS de criatura (bico, garra, coice…), e
--     não equipamento de loja. O texto diz de que criatura é e contra o que
--     serve — e, onde os ajustes por armadura são gritantes, diz isso também:
--     Garra e Patada (+3 contra leve, −3 ou −4 contra pesada) rasgam carne e
--     pouco fazem contra placa; Hálito e Toque (+1 contra as três) atingem
--     igual, blindado ou não. Isso sai das colunas dano_l/dano_m/dano_p.
--
-- A trava do UPDATE é o `where descricao is null or btrim(descricao) = ''`:
-- este script só PREENCHE vazio, nunca sobrescreve texto escrito à mão.
-- Rodar de novo não faz nada.
--
-- Aplicado em produção via execute_sql em 28/10/2026.
-- ============================================================
update public.itens i set descricao = n.texto
from (values
  -- ── Armaduras: a forma das Grevas, com "canelas" no lugar de "pernas" ──
  ('caneleiras_de_aco',    'As Caneleiras de Aço são equipamento de aço para proteção das canelas.'),
  ('caneleiras_de_couro',  'As Caneleiras de Couro são equipamento de couro para proteção das canelas.'),
  ('caneleiras_de_malha',  'As Caneleiras de Malha são equipamento de malha para proteção das canelas.'),

  -- ── Armas naturais de criatura ────────────────────────────────────────
  ('bico',     'Arma natural de aves e criaturas bicudas, desferida em estocadas rápidas contra quem está ao alcance do pescoço.'),
  ('cauda',    'Arma natural de criaturas de cauda longa, varrida em arco para atingir quem se aproxima pelos lados ou por trás, mais longe que as demais armas naturais.'),
  ('chifre',   'Arma natural de criaturas chifrudas, usada em investidas que concentram todo o peso do corpo na ponta.'),
  ('coice',    'Arma natural de criaturas de patas traseiras fortes, desferido para trás com a força inteira do quadril.'),
  ('garra',    'Arma natural de feras de unhas afiadas, que rasga a carne exposta e pouco faz contra armadura pesada.'),
  ('halito',   'Arma natural de criaturas que sopram fogo, gelo ou veneno, atingindo o alvo à distância sem que a armadura o proteja.'),
  ('mordida',  'Arma natural de criaturas de presas e dentes, cravada no alvo em curta distância.'),
  ('patada',   'Arma natural de criaturas de patas pesadas, golpe desferido de cima para baixo, devastador contra quem veste pouco.'),
  ('toque',    'Arma natural de criaturas cujo simples contato fere — veneno, frio, putrefação ou magia —, e contra a qual a armadura não protege.'),

  -- ── Serviços: a forma de "Diária em hospital para recuperação." ───────
  ('estalagem_popular',  'Diária em estalagem popular, com catre em quarto coletivo e refeição simples.'),
  ('estalagem_mercante', 'Diária em estalagem mercante, com quarto privado, cama de verdade e refeição quente.'),
  ('estalagem_nobre',    'Diária em estalagem nobre, com aposento espaçoso, roupa de cama lavada e serviço à mesa.'),

  -- ── Vestimentas: cachecóis ────────────────────────────────────────────
  ('cachecol_algodao', 'Vestimenta de algodão enrolada ao pescoço para abrigo do frio.'),
  ('cachecol_linho',   'Vestimenta de linho enrolada ao pescoço, de trama fina e mais leve que a de algodão.'),
  ('cachecol_seda',    'Vestimenta de seda enrolada ao pescoço, macia ao toque e de caimento elegante.'),

  -- ── Vestimentas: calças ───────────────────────────────────────────────
  ('calca_algodao',     'Vestimenta de algodão para as pernas, confortável e de uso diário.'),
  ('calca_couro_fina',  'Vestimenta de couro fino para as pernas, resistente ao atrito da estrada e da sela.'),
  ('calca_seda',        'Vestimenta de seda para as pernas, de caimento leve e própria para ocasiões de corte.'),

  -- ── Vestimentas: capuzes ──────────────────────────────────────────────
  ('capuz_algodao', 'Vestimenta de algodão que cobre a cabeça e sombreia o rosto.'),
  ('capuz_couro',   'Vestimenta de couro que cobre a cabeça e sombreia o rosto, firme contra chuva e vento.'),
  ('capuz_seda',    'Vestimenta de seda que cobre a cabeça e sombreia o rosto, de tecido leve e discreto.'),

  -- ── Vestimentas: chapéu ───────────────────────────────────────────────
  ('chapeu_veludo', 'O Chapéu de Veludo é um adereço de corte, usado mais por ostentação que por proteção.'),

  -- ── Vestimentas: dragonas (ombreiras de uniforme) ─────────────────────
  ('dragona_cobre', 'Adorno de cobre preso ao ombro, marca de posto em uniformes militares.'),
  ('dragona_prata', 'Adorno sofisticado de prata preso ao ombro, marca de posto em uniformes militares.'),
  ('dragona_ouro',  'Adorno sofisticado de ouro preso ao ombro, reservado aos postos mais altos.'),

  -- ── Vestimentas: estojo ───────────────────────────────────────────────
  ('estojo', 'Caixa rígida de couro para guardar e transportar objetos pequenos sem que se quebrem.'),

  -- ── Vestimentas: gargantilhas ─────────────────────────────────────────
  ('gargantilha_cobre', 'Adorno de cobre cingido ao pescoço, de aro estreito e entalhes simples.'),
  ('gargantilha_prata', 'Adorno sofisticado de prata cingido ao pescoço, de aro estreito e entalhes finos.'),
  ('gargantilha_ouro',  'Adorno sofisticado de ouro cingido ao pescoço, de aro estreito e acabamento polido.'),

  -- ── Vestimentas: lenços ───────────────────────────────────────────────
  ('lenco_algodao', 'Peça quadrada de algodão, usada ao pescoço ou à mão.'),
  ('lenco_linho',   'Peça quadrada de linho, de trama fina e caimento leve.'),
  ('lenco_seda',    'Peça quadrada de seda, macia e de cores vivas.'),

  -- ── Vestimentas: luvas ────────────────────────────────────────────────
  ('luva_algodao',    'Vestimenta de algodão para as mãos, de uso diário.'),
  ('luva_couro_fina', 'Vestimenta de couro para as mãos, protege do atrito das rédeas e do cabo da arma.'),
  ('luva_seda',       'Vestimenta de seda para as mãos, fina o bastante para não atrapalhar o tato.'),

  -- ── Vestimentas: medalhas ─────────────────────────────────────────────
  ('medalha_cobre', 'Adorno de cobre preso ao peito, concedido em reconhecimento a um feito.'),
  ('medalha_prata', 'Adorno sofisticado de prata preso ao peito, concedido em reconhecimento a um feito.'),
  ('medalha_ouro',  'Adorno sofisticado de ouro preso ao peito, concedido pelos feitos de maior monta.'),

  -- ── Vestimentas: piercings ────────────────────────────────────────────
  ('piercing_cobre', 'Adorno de cobre atravessado na orelha, de aro simples.'),
  ('piercing_prata', 'Adorno sofisticado de prata atravessado na orelha, de aro fino.'),
  ('piercing_ouro',  'Adorno sofisticado de ouro atravessado na orelha, de aro fino e polido.'),

  -- ── Vestimentas: pingentes ────────────────────────────────────────────
  ('pingente_cobre', 'Adorno de cobre pendurado ao pescoço, de entalhes simples.'),
  ('pingente_prata', 'Adorno sofisticado de prata pendurado ao pescoço, de entalhes finos.'),
  ('pingente_ouro',  'Adorno sofisticado de ouro pendurado ao pescoço, de acabamento polido.'),

  -- ── Vestimentas: sobretudos ───────────────────────────────────────────
  ('sobretudo_simples',  'Vestimenta de lã grossa que cobre dos ombros aos joelhos, abrigo contra o frio e a chuva.'),
  ('sobretudo_completo', 'Vestimenta de lã e couro que cobre dos ombros aos tornozelos, com forro e punhos reforçados.'),
  ('sobretudo_luxuoso',  'Vestimenta de lã fina com acabamento em seda, de corte elegante e forro bordado.')
) as n(slug, texto)
where i.slug = n.slug
  and (i.descricao is null or btrim(i.descricao) = '');
