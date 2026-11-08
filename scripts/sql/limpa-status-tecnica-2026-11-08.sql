-- Limpa os efeitos de técnica (id 'tec_*') que atravessaram a batalha antes
-- da correção de 08/11/2026 em estadoAoEncerrar. Hoje: Voz de Comando em
-- Victor (67), Adrian (69), Aldren (54) e Galadar (57); Disparo Rápido em
-- Adrian. Todos são mod_vb — nenhum empresta EH/EF, então só sai da lista.
update personagens
set estado_atual = jsonb_set(estado_atual, '{status}',
  coalesce((select jsonb_agg(s) from jsonb_array_elements(estado_atual->'status') s
            where coalesce(s->>'id', '') not like 'tec\_%'), '[]'::jsonb))
where estado_atual->'status' @? '$[*] ? (@.id like_regex "^tec_")'
returning id, nome, estado_atual->'status' as status;
