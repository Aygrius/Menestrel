-- Montaria vira CARACTERÍSTICA da criatura (14/09/2026).
--
-- "Adicione uma nova característica das criaturas, que é de montaria." Até aqui
-- a batalha decidia pelo NOME (/^(cavalo|pônei)\b/, ehMontaria em
-- 12-batalha/batalha.jsx). Agora o Mestre marca no editor, e o inventário usa o
-- mesmo campo para oferecer "Montar" no animal.
--
-- Carga inicial: as que a regra por nome já aceitava (cavalos e pônei) mais os
-- animais que se montam de fato no catálogo. O resto nasce false e o Mestre
-- liga no editor.

alter table public.criaturas
  add column if not exists montaria boolean not null default false;

update public.criaturas set montaria = true
 where nome ~* '^(cavalo|p[ôo]nei)\M'
    or nome in ('Camelo', 'Camelo de Guerra', 'Mula', 'Elefante', 'Elefante de Guerra',
                'Avestruz de Guerra', 'Mamute', 'Grifo', 'Pégaso', 'Unicórnio');
