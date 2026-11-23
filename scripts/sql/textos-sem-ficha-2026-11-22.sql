-- OS TEXTOS SÃO TODOS LOCAIS (22/11/2026)
-- Usuário: "eu quero que todos os atuais textos virem locais. Serão uma coisa só."
-- Dos 144 textos do mapa (lugares do mundo com `estilo`), 3 apontavam para uma
-- ficha que não existia mais: uma aba do mapa aberta desde antes regravou o
-- mundo antigo por cima da religação de 21/11 (texto-nos-locais-antigos.mjs).
-- Krokanom voltou para a ficha vulcao-krokanon (pelo script); Rio Lires e Galpas
-- ganham ficha própria (a de Rio Liris foi apagada; Galpas, a ilha, fica
-- separada do Arquipélago de Galpas, cujo pino volta ao mapa).

insert into public.locais (slug, nome) values ('rio-lires', 'Rio Lires'), ('galpas', 'Galpas') on conflict (slug) do nothing;
update public.catalogo_mundo c set dados = jsonb_set(c.dados, '{lugares}', (
  select jsonb_agg(case when l->>'id' = 'txmwqypzdp38'
                        then l || jsonb_build_object('ficha', 'galpas', 'nome', 'Galpas', 'estilo', (l->'estilo') - 'texto')
                        else l end order by o)
  from jsonb_array_elements(c.dados->'lugares') with ordinality x(l, o))
  || coalesce((select jsonb_agg(p) from backup_caminhos_mundo_20261121 b, jsonb_array_elements(b.dados->'lugares') p
               where p->>'id' = 'mwr4q0x9h4n' and not exists (select 1 from jsonb_array_elements(c.dados->'lugares') q where q->>'id' = 'mwr4q0x9h4n')), '[]'::jsonb)),
  updated_at = now()
where c.tipo = 'mapa' and c.slug = 'mundo';
