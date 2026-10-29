-- scripts/sql/fabricacao-2026-10-06.sql
-- ============================================================================
-- A BANCADA — receitas, teste e tempo de construção (06/10/2026)
--
-- Pedidos do usuário:
--   "Com base nesses novos itens será possível fabricar armas e outros itens e
--    acessórios, com um teste específico de cada habilidade que possuir nível
--    Difícil, por exemplo, para fabricar uma Capa Simples, é necessário 20 de
--    algodão, possuir a habilidade artesanato e um teste difícil."
--   "Para fazer uma adaga, será necessário 20 aço, 2 madeira, 1 couro, possuir
--    metalurgia e um teste dificil. Para fazer um violão, será necessário 40
--    madeira, 5 linho, 5 seda e 5 cânhamo, possuir artesanato e um teste
--    dificil. Adicione também um tempo para construção dos itens […]"
--   "Teste falho consome os materiais."
--   "Teremos um novo menu 'Fabricar', com todos os possíveis itens a serem
--    fabricados, com sua 'receita' e itens necessários para o preparo."
--   "Os itens tipo matéria-prima são consumíveis ou minerais, os itens do tipo
--    arreios, são vestimentas ou armaduras."
--
-- APLICADO NO BANCO EM 06/10/2026 (projeto kaxbdpdutentlrobuqyu), pelas
-- migrations `receitas_tabela`, `receitas_violao_e_geracao` e
-- `sem_grupos_novos_arreios_e_materias`.
--
-- O QUE A TABELA NÃO GUARDA, de propósito:
--   • o resultado do teste — o d20 é o mesmo do resto do jogo
--     (RESULTADOS_ACAO + RolagemD20Overlay); a receita só diz a habilidade e a
--     dificuldade;
--   • o item em construção — ele é uma instância do inventário do jogador, com
--     um carimbo `construindo: { desde, pronto_em, dias }` no jsonb. Fica
--     pronto na LEITURA, contra historias.data_jogo_atual, como status, magia
--     ativa e bônus temporário. Nada avança a data sozinho neste projeto.
--
-- As regras puras moram em src/01-core/fabricacao.jsx; a tela, em
-- src/07-inventario/fabricar.jsx; a rolagem e a gravação, na ficha (um
-- escritor só do inventário).
-- ============================================================================

-- ── 1. A TABELA ─────────────────────────────────────────────────────────────
create table if not exists public.receitas (
  resultado_slug text primary key references public.itens(slug) on delete cascade,
  habilidade_key text not null references public.habilidades(key),
  dificuldade    text not null default 'D',
  dias           smallint not null default 1,
  materiais      jsonb not null default '[]'::jsonb,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

comment on table public.receitas is
  'Receitas de fabricação: materiais, habilidade, dificuldade e dias. Uma por item resultado.';
comment on column public.receitas.materiais is
  'jsonb [{ slug, qtd }] — o que o teste consome, com sucesso OU com falha.';
comment on column public.receitas.dificuldade is
  'Código de RESULTADOS_ACAO (01-core/game-data.jsx). D = Difícil.';
comment on column public.receitas.dias is
  'Dias de JOGO que a construção leva depois do teste bem-sucedido.';

do $do$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.receitas'::regclass
                    and conname = 'receitas_dificuldade_chk') then
    alter table public.receitas add constraint receitas_dificuldade_chk
      check (dificuldade = any (array['FC','R','F','M','D','MD','E','A']));
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.receitas'::regclass
                    and conname = 'receitas_dias_chk') then
    alter table public.receitas add constraint receitas_dias_chk
      check (dias between 1 and 365);
  end if;
end
$do$;

-- RLS igual a `itens`: todos leem, só admin escreve.
alter table public.receitas enable row level security;
drop policy if exists receitas_leitura_publica on public.receitas;
create policy receitas_leitura_publica on public.receitas
  for select to anon, authenticated using (true);
drop policy if exists receitas_admin_insert on public.receitas;
create policy receitas_admin_insert on public.receitas
  for insert to authenticated with check (eh_admin());
drop policy if exists receitas_admin_update on public.receitas;
create policy receitas_admin_update on public.receitas
  for update to authenticated using (eh_admin()) with check (eh_admin());
drop policy if exists receitas_admin_delete on public.receitas;
create policy receitas_admin_delete on public.receitas
  for delete to authenticated using (eh_admin());

-- ── 2. O VIOLÃO ─────────────────────────────────────────────────────────────
-- O pedido o nomeia como exemplo de receita, mas ele não existia no catálogo.
-- Entra com o tamanho e o preço dos outros instrumentos de corda (Banjo 1.900,
-- Bandolim 2.100, ocupa 5).
insert into public.itens (slug, nome, grupo, tipo, origem, ocupa, valor_latao, icone, descricao)
values ('violao', 'Violão', 'Instrumentos', 'S', 'Comum', 5, 1900, 'ti-music',
        'Caixa de madeira fina com braço longo e seis cordas. Afinado, acompanha uma taverna inteira; desafinado, esvazia a mesma taverna.')
on conflict (slug) do nothing;

-- ── 3. A GERAÇÃO DAS RECEITAS ───────────────────────────────────────────────
-- "todos os possíveis itens a serem fabricados": uma receita para cada item
-- NÃO MÁGICO dos grupos que se fabricam. Item mágico fica fora — encantamento
-- não sai de bancada.
--
-- As receitas são DERIVADAS do próprio catálogo, em vez de escritas uma por
-- uma: assim elas seguem o item, e 226 linhas não viram 226 decisões soltas.
--
--   MATERIAL pelo NOME ("Botas de Aço" → aço; "Traje de Linho" → linho) e,
--   sem pista no nome, pelo grupo.
--
--   QUANTIDADE em faixas de `ocupa`, calibradas nos três exemplos do pedido:
--     Capa Simples (ocupa 1) → 20 · Adaga (ocupa 3) → 20 · Violão (ocupa 5) → 40
--     ocupa <= 3 → 20 · <= 5 → 40 · <= 8 → 60 · acima → 80
--
--   SECUNDÁRIOS seguem o padrão dos exemplos: arma leva cabo de madeira e
--   empunhadura de couro (Adaga: 2 madeira, 1 couro); instrumento de corda
--   leva as cordas (Violão: 5 linho, 5 seda, 5 cânhamo); armadura de metal
--   leva forro de couro; vestimenta é só o tecido (Capa Simples: só algodão).
--
--   DIAS pelo valor: um dia por 2.000 latões, de 1 a 30. Adaga em um dia;
--   Barda, em treze.
--
-- NOTA: este bloco rodou ANTES do §4, quando o arreamento ainda tinha grupo
-- próprio ('Arreios'). Depois do §4 as peças estão em Vestimentas e Armaduras,
-- que o `in` abaixo também cobre — re-rodar dá o mesmo resultado.
do $do$
declare
  v_it record; v_nome text; v_princ text; v_qtd int;
  v_hab text; v_mats jsonb; v_dias int; v_cordas boolean;
begin
  for v_it in
    select slug, nome, grupo, coalesce(ocupa, 1) as ocupa, coalesce(valor_latao, 0) as valor,
           tipo_armadura, coalesce(magico, false) as magico, origem
      from public.itens
     where grupo in ('Armas','Armaduras','Vestimentas','Instrumentos','Recipientes','Arreios')
       -- UMA CONDIÇÃO SÓ (06/10/2026, "simplifique o campo mágico"). Havia duas
       -- para a mesma intenção, e elas NÃO querem dizer o mesmo:
       --   `magico`  é GERADA — "o item carrega uma magia". É esta que importa:
       --             encantamento não sai de bancada.
       --   `origem = 'Mágico'` é classificação de PROCEDÊNCIA, escolhida à mão.
       -- Os 54 itens de origem mágica que NÃO carregam magia (Aerílium e os
       -- outros minérios) ficavam fora das receitas sem motivo — são matéria,
       -- e matéria se trabalha. Agora só o que carrega magia é excluído.
       and coalesce(magico, false) = false
       -- ATAQUE NATURAL FICA FORA (06/10/2026, pedido do usuário: "Coice,
       -- Mordida, etc não podem ser fabricados"). As nove armas naturais das
       -- criaturas (Bico, Cauda, Chifre, Coice, Garra, Hálito, Mordida,
       -- Patada, Toque) moram no grupo 'Armas' porque é assim que a criatura
       -- as equipa, e esta varredura as pegou junto. O que as separa de uma
       -- adaga é `ocupa`: parte do corpo não ocupa casa na mochila. Ver
       -- scripts/sql/sem-receita-de-ataque-natural-2026-10-06.sql.
       and not (grupo = 'Armas' and coalesce(ocupa, 0) = 0)
  loop
    v_nome := lower(translate(v_it.nome,
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
      'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc'));

    v_princ := case
      when v_nome like '%aco%'      then 'aco'
      when v_nome like '%ferro%'    then 'ferro'
      when v_nome like '%bronze%'   then 'bronze'
      when v_nome like '%prata%'    then 'prata'
      when v_nome like '%ouro%'     then 'ouro_bruto'
      when v_nome like '%couro%'    then 'couro_curtido'
      when v_nome like '%algodao%'  then 'algodao'
      when v_nome like '%linho%'    then 'linho'
      when v_nome like '%seda%'     then 'seda'
      when v_nome like '%canhamo%'  then 'canhamo'
      when v_nome like '%marfim%'   then 'marfim_animal'
      when v_nome like '%madeira%'  then 'madeira'
      when v_nome like '%pedra%'    then 'pedra'
      when v_nome like '%vidro%'    then 'vidro'
      when v_it.grupo = 'Armas'        then 'aco'
      when v_it.grupo = 'Armaduras'    then (case when v_it.tipo_armadura = 'L' then 'couro_curtido' else 'aco' end)
      when v_it.grupo = 'Vestimentas'  then 'algodao'
      when v_it.grupo = 'Instrumentos' then 'madeira'
      when v_it.grupo = 'Recipientes'  then 'madeira'
      when v_it.grupo = 'Arreios'      then 'couro_curtido'
      else 'madeira'
    end;

    v_qtd := case
      when v_it.ocupa <= 3 then 20
      when v_it.ocupa <= 5 then 40
      when v_it.ocupa <= 8 then 60
      else 80
    end;

    v_hab := case
      when v_it.grupo in ('Instrumentos','Vestimentas') then 'artesanato'
      when v_it.grupo = 'Recipientes' and v_princ = 'madeira' then 'carpintaria'
      when v_princ in ('aco','ferro','bronze','prata','ouro_bruto') then 'metalurgia'
      else 'artesanato'
    end;

    v_mats := jsonb_build_array(jsonb_build_object('slug', v_princ, 'qtd', v_qtd));

    if v_it.grupo = 'Armas' and v_princ <> 'madeira' then
      v_mats := v_mats || jsonb_build_array(
        jsonb_build_object('slug', 'madeira', 'qtd', greatest(2, round(v_it.ocupa)::int)));
      if v_princ <> 'couro_curtido' then
        v_mats := v_mats || jsonb_build_array(jsonb_build_object('slug', 'couro_curtido', 'qtd', 1));
      end if;
    end if;

    if v_it.grupo = 'Armaduras' and v_princ in ('aco','ferro','bronze','prata','ouro_bruto') then
      v_mats := v_mats || jsonb_build_array(
        jsonb_build_object('slug', 'couro_curtido', 'qtd', greatest(1, round(v_it.ocupa / 2)::int)));
    end if;

    v_cordas := v_it.grupo = 'Instrumentos' and (
      v_nome like '%violao%' or v_nome like '%alaude%' or v_nome like '%bandolim%' or
      v_nome like '%banjo%'  or v_nome like '%harpa%'  or v_nome like '%rabeca%' or
      v_nome like '%viela%'  or v_nome like '%salterio%' or v_nome like '%lira%');
    if v_cordas then
      v_mats := v_mats
        || jsonb_build_array(jsonb_build_object('slug', 'linho',   'qtd', 5))
        || jsonb_build_array(jsonb_build_object('slug', 'seda',    'qtd', 5))
        || jsonb_build_array(jsonb_build_object('slug', 'canhamo', 'qtd', 5));
    end if;

    if v_it.grupo = 'Arreios' and v_princ in ('aco','ferro','bronze') then
      v_mats := v_mats || jsonb_build_array(jsonb_build_object('slug', 'couro_curtido', 'qtd', 2));
    end if;

    /* O PRAZO SAI DA RAIZ DO VALOR (06/10/2026), em duas correções do usuário:
         "aumente os tempos de confecção dos itens fabricados"
         "os tempos de fabricação estão muito diferentes entre si, leva-se
          apenas 2 dias para fabricar um punhal? e 60 dias para uma coroa?"

       A régua original era LINEAR (um dia por 2.000 latões) e o catálogo vai de
       2 a 50.000 — quatro ordens de magnitude. Linear num intervalo assim dá
       absurdo nas duas pontas: a mediana é 600, então 154 das 213 receitas
       saíam em UM DIA, e a coroa estourava o teto.

       A raiz quadrada comprime o alto sem achatar o baixo. Preso entre 5 e 25
       dias, o catálogo inteiro fica assim: punhal 6, adaga 7, espada longa 10,
       violão 11, peitoral de aço 22, coroa de ouro 25 — cinco vezes do menor
       ao maior, em vez de trinta.

       OS DOIS NÚMEROS A AJUSTAR: o `+ 4` move o piso de todo o catálogo; o
       `/ 6` controla quão rápido o prazo cresce com o preço.
       Ver as migrations `tempos_de_fabricacao_maiores` (o aumento) e
       `tempos_de_fabricacao_comprimidos` (esta régua). */
    v_dias := greatest(5, least(25, round(sqrt(v_it.valor) / 6.0)::int + 4));

    insert into public.receitas (resultado_slug, habilidade_key, dificuldade, dias, materiais)
    values (v_it.slug, v_hab, 'D', v_dias, v_mats)
    on conflict (resultado_slug) do update set
      habilidade_key = excluded.habilidade_key, dificuldade = excluded.dificuldade,
      dias = excluded.dias, materiais = excluded.materiais, atualizado_em = now();
  end loop;
end
$do$;

-- As três do pedido, explícitas: são a calibração da régua acima, e um dia a
-- régua pode mudar sem que o pedido mude.
-- `dias` saiu destes três updates em 06/10/2026: o prazo passou a vir da régua
-- (acima) e do aumento pedido, e fixá-lo em 1 aqui desfaria o aumento a cada
-- re-run. O que estes updates calibram são os MATERIAIS, que é o que o pedido
-- original listava item por item.
update public.receitas set habilidade_key = 'artesanato', dificuldade = 'D',
       materiais = '[{"slug":"algodao","qtd":20}]'::jsonb, atualizado_em = now()
 where resultado_slug = 'capa_simples';

update public.receitas set habilidade_key = 'metalurgia', dificuldade = 'D',
       materiais = '[{"slug":"aco","qtd":20},{"slug":"madeira","qtd":2},{"slug":"couro_curtido","qtd":1}]'::jsonb,
       atualizado_em = now()
 where resultado_slug = 'adaga';

update public.receitas set habilidade_key = 'artesanato', dificuldade = 'D',
       materiais = '[{"slug":"madeira","qtd":40},{"slug":"linho","qtd":5},{"slug":"seda","qtd":5},{"slug":"canhamo","qtd":5}]'::jsonb,
       atualizado_em = now()
 where resultado_slug = 'violao';

-- ── 4. OS DOIS GRUPOS NOVOS SAEM ────────────────────────────────────────────
-- "Os itens tipo matéria-prima são consumíveis ou minerais, os itens do tipo
--  arreios, são vestimentas ou armaduras." (usuário)
--
-- 'Arreios' (05/10) e 'Matérias-Primas' (06/10) existiram por um dia. O
-- catálogo volta aos 13 grupos. As COLUNAS continuam: é `slot_arreio` que
-- marca a peça como arreamento, não o grupo — e é ela que mantém a sela fora
-- do sistema de vestir do personagem (ehVestimenta, src/07-inventario).
update public.itens set grupo = 'Minerais'
 where slug in ('ferro', 'aco', 'bronze', 'prata', 'ouro_bruto', 'carvao', 'pedra');

update public.itens set grupo = 'Consumíveis'
 where slug in ('madeira', 'algodao', 'linho', 'canhamo', 'seda',
                'corda_material', 'couro_curtido', 'vidro');

-- O arreamento que PROTEGE o bicho (os cinco com absorção) → Armaduras.
update public.itens set grupo = 'Armaduras'
 where slug in ('chanfron', 'crinum', 'peitoral_de_montaria',
                'caneleiras_de_montaria', 'barda');

update public.itens set grupo = 'Vestimentas'
 where slug in ('cabecada_e_redeas', 'arreio', 'manta_de_sela', 'gualdrapa',
                'alforje_de_sela', 'sela_de_jornada', 'sela_de_torneio', 'sela_de_guerra');

-- ── CONFERÊNCIA ─────────────────────────────────────────────────────────────
-- Os 13 grupos, sem 'Arreios' nem 'Matérias-Primas':
--   select grupo, count(*) from itens group by 1 order by 1;
--
-- As receitas por grupo e habilidade:
--   select i.grupo, r.habilidade_key, count(*)
--     from receitas r join itens i on i.slug = r.resultado_slug
--    group by 1,2 order by 1,2;
--
-- As três do pedido, como o pedido pede:
--   select r.resultado_slug, r.habilidade_key, r.dias, r.materiais
--     from receitas r where r.resultado_slug in ('capa_simples','adaga','violao');
--
-- Nenhum material de receita sem linha no catálogo (a janela mostraria o slug cru):
--   select distinct m->>'slug' from receitas r,
--          jsonb_array_elements(r.materiais) m
--    where not exists (select 1 from itens i where i.slug = m->>'slug');
