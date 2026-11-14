# Auditoria — batalha e inventário (13/11/2026)

Pedido do usuário: "Faça uma verificação profunda e extensa no sistema de
batalha e no sistema de inventário." Depois: "Documente e faça os itens em
sequência."

Sete frentes auditadas em paralelo: motor de batalha (duas metades), condução
do Mestre, painel do Jogador, regras puras do inventário, telas que gravam o
inventário/loja, e o banco (RLS, RPCs, gatilhos — só leitura). Ponto de partida:
308 arquivos de teste / 5 312 casos verdes, `tsc -b` limpo, `eslint` com um erro
(hooks depois de `return` em `DetalhesItemModal`).

Estado: ⬜ pendente · ✅ corrigido (com o commit) · 📝 decidido não mexer / adiado.

## ▶ Onde paramos (14/11/2026)

- **Feitos:** 1 a 4 e 6 a 22 (todos os críticos, todos os de alta
  prioridade e os cinco primeiros de média), mais o karma das criaturas
  (pedido à parte). Item 5 adiado. Itens 33 e 41 resolvidos só no lado do jogador
  (saque pela RPC `saquear_criatura`); falta o saque do Mestre.
- **Feitos também (14/11/2026):** 23 a 28.
- **Próximo: item 29** — usar consumível: efeito e baixa gravam em pernas
  separadas. O usuário pediu (14/11) para seguir direto até o 48 e depois
  REVISAR todas as correções.
- **Banco:** o usuário autorizou (14/11/2026) mudanças no banco feitas pelo
  Claude.
- **Banco:** tudo dos itens 1–4 já está aplicado no Supabase (scripts em
  `scripts/sql/*-2026-11-14.sql`).
- **App NÃO publicado:** os commits de 14/11 estão na main, mas não houve
  `npx vercel deploy --prod`. O site no ar ainda tem a tela de saque antiga
  (grava o saque direto) e não traduz as recusas novas da batalha. Sem criatura
  com moeda no banco hoje, nada quebra — mas publicar antes de seguir.
- **Item 6, decisão de 14/11/2026 (tempo da batalha):** "Considere que cada
  ação é 30 segundos no jogo para cada combatente, e a rodada será calculada
  com base nesse tempo. Inclusive esse cálculo pode ser usado para passar o
  tempo de forma automática depois da batalha." Respostas dele:
  - rodada = 30 s × combatentes que agem nela;
  - o relógio guarda minutos por dentro (o pill segue mostrando só a hora);
  - no encerramento, o Mestre confirma o avanço ("Avançar 25 min?", marcado);
  - status com prazo: o prazo ganha hora e minuto; na entrada, o tempo que
    falta vira rodadas; na saída, as rodadas que sobram viram tempo.

## Decisões do usuário (13/11/2026)

- **Posicionamento**: o inimigo marcado passa a **causar** menos dano (leitura
  literal de "subtraído do dano máximo do adversário"). Antes reduzia o dano que
  ele **recebia**.
- **Colunas do personagem**: gatilho de guarda no banco — quem não é Mestre não
  muda XP, atributos base, receitas, `vendas_a_resgatar`, nem aumenta o valor
  total das moedas por gravação direta. O inventário segue gravável pelo dono
  (o CAS não muda); RPCs SECURITY DEFINER passam.
- **Batalha no servidor**: travar a ESCRITA do jogador (vez, cortina, base nula).
  A leitura com a cortina aplicada no servidor fica como próximo passo.

## 🔴 Crítico — banco

| # | Estado | Achado |
|---|---|---|
| 1 | ✅ `scripts/sql/comprar-item-so-do-dono-2026-11-14.sql` | `comprar_item` (SECURITY DEFINER, executável por `anon`) não confere que `p_pj_id` é de quem chama; aceita `p_negociacao='sucesso'` do cliente; não aplica o filtro de cidade de `get_loja_pj`. |
| 2 | ✅ `scripts/sql/saque-so-pelo-encerrar-2026-11-14.sql` | `_menestrel_saque_da_batalha` (e `_menestrel_matador_da_criatura`, `_menestrel_lojas_globais`) executáveis por `anon`/`authenticated` sem checar papel — dá para forjar saque a preço 0. |
| 3 | ✅ `scripts/sql/colunas-do-mestre-e-saque-por-rpc-2026-11-14.sql` | Policy `personagens_update_own_or_vinculado` libera as 40 colunas ao dono: XP, atributos, receitas, `vendas_a_resgatar`, moedas por PATCH direto. |
| 4 | ✅ `scripts/sql/batalha-jogador-so-na-vez-2026-11-14.sql` | `atualizar_batalha_jogador` só confere que o usuário tem PJ na batalha: grava qualquer participante, qualquer campo, fora da vez, com a cortina aguardando; base nula substitui tudo. |
| 5 | 📝 | O jogador lê a linha inteira de `batalhas` (cortina só na tela) e `historias` tem SELECT `true` para todo logado. Adiado: exige uma visão do jogador no servidor e mexe no realtime. |

## 🟠 Alta — batalha (`src/12-batalha/batalha.jsx`)

| # | Estado | Achado |
|---|---|---|
| 6 | ✅ | Status posto na ficha entra com `rodadas_rest: 1` (`ficha.jsx` StatusPrazoModal) e cai na 1ª virada (`decrementarStatusTemp`); o encerramento grava a ficha sem ele. |
| 7 | ✅ | Magia lançada sem PA quando sobra `pa_ataque_extra` (`podeAplicar` sem `!semPA`; `debitarCustoAtaque` só gasta o extra em arma). |
| 8 | ✅ | Clique duplo aplica a ação duas vezes (item/rolagem): handlers não conferem `salvando`. |
| 9 | ✅ | Consumo de item/munição e aviso à mesa saem ANTES de gravar a batalha; se a gravação falha, o item já foi. |
| 10 | ✅ | Posicionamento invertido (ver decisão acima) — `danoFinal` lê `mod_dano_max` do alvo. |
| 11 | ✅ | Purificação tira buffs de valor negativo (Aparar, Desviar, Escudo, Pele de Árvore) antes do veneno. |

## 🟠 Alta — inventário

| # | Estado | Achado |
|---|---|---|
| 12 | ✅ | `normalizarPilhas` funde pilha solta acumulável ignorando `animal_id`/`slot` (carga do animal volta ao dono; consumível do saque rápido some do saque). |
| 13 | ✅ | Dentro de recipiente, a fusão ignora `quebrada`, `res`, `veneno`, `vitalidade`… — o estado de uma instância contamina a pilha. |
| 14 | ✅ | Mestre dá item que estoura a carga: tela diz "Entregue", nada grava, e toda gravação seguinte é recusada em silêncio (aviso de falha comentado). |
| 15 | ✅ | Duas telas "explodem" a mesma pilha com IDs aleatórios e a mescla de três vias duplica (3 adagas → 6). |
| 16 | ✅ | Mescla perde compra: L removeu a pilha, R aumentou — `if (b && !l) return` descarta o aumento. |
| 17 | ✅ | Item sem `quantidade` vira NaN em `guardarNoRecipiente`/`podeMoverParaContainer`/`normalizarPilhas` — a pilha guardada some. |

## 🟡 Média — batalha

| # | Estado | Achado |
|---|---|---|
| 18 | ✅ | Criatura que escolhe nível de magia menor paga karma (`magiaNoNivel`) e trava (karma 0). |
| 19 | ✅ | Absorção de elixir/poção (`ar` acima de `ar_max`) não protege quem está sem armadura (`aplicarDanoCascata`). |
| 20 | ✅ | Item com prazo (Fogo Vivo, Karma Líquido, Energia Cinética, Elixir da Euforia) não faz nada em combate e é consumido (`aplicarEfeitoItemSnapshot`). |
| 21 | ✅ | Virada calcula PA e passo com o buff de velocidade que expira nela mesma. |
| 22 | ✅ | PJ que entra com EF ≤ 0 fica desmaiado a luta inteira (sem o contador `desmaio_ef`). |
| 23 | ✅ | Rodada trava se todo ativo está canalizando/sem ação — ninguém recebe `atual`. |
| 24 | ✅ | Falha passageira ao gravar a cortina desliga a cortina para sempre naquela tela. |
| 25 | ✅ | Encerrar sobrescreve `condicoes` com as da entrada (horas avançadas na luta somem). |
| 26 | ✅ | Alvo guardado por índice: quando alguém sai da lista, a mira pula para o vizinho. |
| 27 | ✅ | Item usado pelo Mestre a partir do cache velho: efeito sem baixa (`consumirDoInventario` devolve ok sem achar o item). |
| 28 | ✅ | Restaurar do treino não conserta peças quebradas nem `ar`/`ar_max`. |

## 🟡 Média — inventário

| # | Estado | Achado |
|---|---|---|
| 29 | ✅ | Usar consumível: efeito e baixa gravam em pernas separadas; o rollback reverte o PJ inteiro. |
| 30 | ✅ | Fabricar valida material numa cópia velha e anuncia sucesso sem esperar a gravação. |
| 31 | ✅ | Conteúdo de recipiente posto no animal pesa no dono (`calcCarga`). |
| 32 | ⬜ | Item do saque rápido guardado num recipiente continua no saque. |
| 33 | ⬜ (saque do jogador ✅ pela RPC) | `adicionarAoInventario` (saque) soma em pilha à venda ou no animal. No jogador, a RPC `saquear_criatura` já pula pilha à venda e no animal; falta o saque do Mestre e o treino. |
| 34 | ⬜ | Regra de endereço da Casa (`acessoAPropriedade`) nunca aplicada — ninguém passa a localização do PJ. |
| 35 | ⬜ | Preparar carne e envenenar flechas mexem em pilha à venda. |
| 36 | ⬜ | Pilha dividida (guardar, equipar, vestir, montar, pôr no animal) perde bônus/desgaste/veneno na parte que sai. |

## 🟢 Baixa

| # | Estado | Achado |
|---|---|---|
| 37 | ⬜ | `mod_ef_temp` com piso 0 cura EF negativa (deveria ser `EF_MORTE`). |
| 38 | ⬜ | Log da evocação perdida diz "dano na EF" quando foi desmaio por EH. |
| 39 | ⬜ | Desmontar deixa o cavalo desmaiado (EH 0 / máx > 0). |
| 40 | ⬜ | Oferenda consumida em magia de item sem dar o bônus. |
| 41 | ⬜ (jogador ✅ pela RPC) | Saque gravado antes de anotar; falha → saca de novo. Saque simultâneo de dois jogadores sobrescreve `saqueado`. No jogador, `saquear_criatura` grava item e anotação numa transação; falta o saque do Mestre. |
| 42 | ⬜ | Realtime não ouve DELETE; nome de canal fixo. |
| 43 | ⬜ | `handleDesistir` sem botão. |
| 44 | ⬜ | Parser lê "2,5" como 5. |
| 45 | ⬜ | Ritual/fabricação contam a mesma unidade em dois grupos. |
| 46 | ⬜ | Mescla de moedas por denominação com `Math.max(0)` pode criar dinheiro. |
| 47 | ⬜ | ~55 funções SECURITY DEFINER executáveis por `anon`; 25 policies sem `(select auth.uid())`. |
| 48 | ⬜ | Hooks depois de `return null` em `DetalhesItemModal` (`inventario.jsx`) — latente. |

## Verificado e correto

Cascata EH→AR→EF e piso −15; tabelas de crítico e falha crítica; evocação e
concentração; bandos e iniciativa; movimento no tabuleiro (alcance e casa
ocupada); trava da rolagem do d20; retry do compare-and-swap (sem dupla
contagem, limite de 3); grade do baú; compra da última unidade
(`FOR UPDATE`); encerramento repetível sem efeito em dobro; nenhum `select`
esquece `PJ_COLS`; nenhum `update` direto em `inventario` fora do CAS.

## Item 1 — como ficou (14/11/2026)

`comprar_item` virou casca de `_menestrel_comprar_item_nucleo` (sem EXECUTE
para anon/authenticated): confere dono ou Mestre da história, recusa
`p_negociacao` de quem não é Mestre e exige a entrada num comércio da cidade
atual da mesa (o filtro de `get_loja_pj`).

## Item 3 — como ficou (14/11/2026)

- Gatilho `personagens_colunas_do_mestre` (BEFORE UPDATE, SECURITY INVOKER):
  só age na gravação direta (`current_user = authenticated`) de quem não é
  Mestre de uma história do PJ. RPC SECURITY DEFINER passa.
  - `experiencia`, `receitas_aprendidas`, `vendas_a_resgatar`: não mudam.
  - `*_base`: só sobem, de −2 a 6, e Σ custo ≤ 15 + ⌊(estágio−1)/2⌋ + 4
    (o modificador da raça se cancela na conta do assistente). O teste
    `src/01-core/colunas-do-mestre.test.js` amarra a tabela e o teto ao game-data.
  - Moedas: o valor total (itens do grupo Moedas + carteira legada) não sobe.
- O saque do jogador virou a RPC `saquear_criatura` (a única entrada de moeda
  por gravação direta do jogador). O treino segue no cache, como antes.
- Efeito colateral aceito: a mescla de três vias que "ressuscitava" moeda
  gasta em outra aba agora falha a gravação em vez de duplicar dinheiro.
- Fica de fora: o INSERT (criação nasce com XP 0 e sem campo de XP), e as
  colunas `magias`, `tecnicas`, `habilidades`, `grupos_armas`,
  `aprimoramentos` e `caracterizacao`, que o dono ainda grava direto.

## Item 6, parte 2 — o tempo da batalha (14/11/2026)

- **Rodada:** `segundosDaRodada` = 30 s × `combatentesQueAgem` (de pé, com vez
  própria: sem desmaiado, morto, reforço por chegar nem montaria em uso). A
  virada (`montarNovaRodada`) soma 1 em `rodadas_de_pe` de quem agiu; a
  duração é essa soma + a rodada em curso (`duracaoDaBatalhaSegundos`).
  Sem coluna nova: a virada também sai da tela do Jogador.
- **Status:** na largada e nos reforços, `prazosDaFichaEmRodadas` converte o
  prazo que falta em rodadas (para cima). No encerramento,
  `statusAoEncerrarBatalha(…, segundosPorRodada)` põe `vence_em` com hora e
  minuto. `statusVigentes` compara em minutos; o `vence_em` só com o dia
  segue vencendo à meia-noite.
- **Relógio:** `data_jogo_atual.minuto` por dentro; escolher outra hora zera
  os minutos. O modal de encerrar tem o toggle "Avançar o relógio 25 min"
  (ligado). Depois do `encerrar_batalha`, `avancarRelogioDaMesa` (10-shell)
  grava o relógio e anuncia no log. Com o relógio montado, ele cobra fome e
  sede na hora (`window.__menestrelCobrarHoras`); sem ele, a âncora fica e as
  horas ficam devendo para o próximo movimento.
- Testes: `src/12-batalha/tempo-da-batalha.test.js`,
  `src/10-shell/relogio-batalha.test.js`.

## Item 31 — como ficou (14/11/2026)

`animalDeCadaItem` (07-inventario) segue a cadeia de recipientes a partir de
quem tem `animal_id`: o conteúdo (e o conteúdo do conteúdo) mora no mesmo
animal. `calcCarga` pula esses itens; `cargaDoAnimal` passa a contá-los — as
duas contas seguem espelho. Teste: `src/07-inventario/carga-recipiente-no-animal.test.jsx`.

## Item 30 — como ficou (14/11/2026)

Ficha (`concluirFabricacao`): fabrica sobre o inventário RELIDO, pelo
compare-and-swap (`alterarInventario` + `fabricar` dentro da fn), e só então
mostra o resultado, liga a atividade e avisa a mesa. A bancada
(paginas-ficha.jsx) deixou de dizer "o material foi perdido" na recusa
(`ok: false`), que não gasta nada. Teste: `src/11-ficha/fabricar-material-atual.test.js`.

## Item 29 — como ficou (14/11/2026)

Ficha (`usarItemFicha`): a baixa grava primeiro (`salvarItensFicha` agora
devolve se gravou) e o efeito e o aviso à mesa só saem com ela gravada. O
desfazer de `salvarItensFicha` volta só o inventário — `setPj(anterior)`
voltava o PJ inteiro, inclusive o efeito já gravado no banco.
Teste: `src/11-ficha/usar-item-ficha.test.js`.

## Item 28 — como ficou (14/11/2026)

O snapshot do PJ guarda `armadura_entrada` (peças, `ar_max`, defesa e bônus
de conjunto); `restaurarArmaduraDoTreino` devolve as peças com a resistência
cheia (a que já entrou quebrada segue quebrada), a absorção, a defesa e o
conjunto da entrada. A criatura (sem peças) volta `ar` ao máximo.
Teste: `src/12-batalha/restaurar-treino-armadura.test.js`.

## Item 27 — como ficou (14/11/2026)

`itemAindaNaMochila` (12-batalha) relê o inventário do PJ no banco (no treino,
o cache), conta as unidades livres e refresca `catalogos.pjById`. Mestre
(`aplicarItemConferido`) e Jogador (`handleItemConferido`) conferem antes de
aplicar e avisam quando o item já não está lá; depois rodam o handler da
render mais nova (ref). `criarTravaDeAcao` passou a segurar o clique duplo
durante handler assíncrono. Falha de leitura não trava a mesa.
Teste: `src/12-batalha/item-cache-velho.test.js`.

## Item 26 — como ficou (14/11/2026)

AcaoPanel: o alvo da aba Arma/Magia é guardado pelo `inst_id`
(`alvoSelId`); `alvoIdx` é derivado a cada render e `setAlvoIdx` converte o
índice dos seletores em inst_id. Sem escolha, o primeiro da lista; o escolhido
que saiu deixa a mira vazia em vez de pular para o vizinho.
Teste: `src/12-batalha/alvo-por-id.test.js`.

## Item 25 — como ficou (14/11/2026)

O snapshot do PJ guarda `condicoes_entrada`; `condicoesAoEncerrar` grava a
ficha de AGORA mais a diferença que a luta fez em cada condição (no mesmo teto
e piso da entrada; a Temperatura tem sinal). O que o relógio cobrou durante a
batalha não some mais. Snapshot antigo, sem a foto, grava as finais como antes.
Teste: `src/12-batalha/condicoes-encerrar.test.js`.

## Item 24 — como ficou (14/11/2026)

`gravarCortina`: só a coluna ausente (`cortinaIndisponivel`: 42703, PGRST204 ou
a mensagem de coluna) liga `semCortina`. Erro passageiro mantém a cortina na
tela e regrava uma vez depois de 1,5 s, se nada mais novo foi para a cortina
nesse meio-tempo. Teste: `src/12-batalha/cortina-falha.test.js`.

## Item 23 — como ficou (14/11/2026)

`montarNovaRodada`: se nenhum ativo pode agir (todos canalizando ou "sem
ações"), a vez vai ao primeiro ativo da ordem mesmo preso — antes ninguém
recebia `atual` e a batalha parava. As redes de sempre passam a vez dele (a
do Mestre para a criatura, a do Jogador pelo `podeAgir` para o PJ), a rodada
vira de novo e os prazos descontam até alguém poder agir.
Teste: `src/12-batalha/rodada-sem-livre.test.js`.

## Item 22 — como ficou (14/11/2026)

`montarSnapshots`: o PJ que entra desmaiado com a EF em zero ou menos (e acima
do piso da morte) ganha o `desmaio_ef` de 4 rodadas (`comDesmaioEf`), como quem
cai no meio da luta, e acorda quando ele acaba. Se a ficha já trouxe o zz de
uma luta anterior, vale o que restava. Morto não ganha.
Teste: `src/12-batalha/entra-desmaiado.test.js`.

## Item 21 — como ficou (14/11/2026)

`processarViradaDeRodada`: depois do decremento dos status, quem continua ativo
e perdeu um `mod_vb` nesta virada tem PA e passo refeitos
(`acoesDaRodadaNova`, pura). Vale para o bônus (Velocidade) e para a lentidão
que vencem. A iniciativa já era reordenada depois do processamento.
Teste: `src/12-batalha/virada-velocidade.test.js`.

## Item 20 — como ficou (14/11/2026)

Os seis itens com prazo do catálogo: Fogo Vivo (EH), Karmaquoso (karma),
Cinetézio e Elixir da Euforia I/II/III (velocidade); três têm também "Aumenta
10 de Vício".
- Combate (`aplicarBonusComPrazoNoSnapshot`, 12-batalha): EF/EH/karma sobem o
  atual E o máximo (passam do teto, como o item promete); absorção sobe só o
  atual (o elixir do item 19); velocidade soma no `vb`. As linhas vão em
  `efeitos_temporarios_luta`; o resto do efeito (Vício) segue a porta comum.
- Encerramento (`estadoAoEncerrar`): as linhas entram em
  `estado_atual.efeitos_temporarios`, vencendo a partir do fim da luta
  (`comVencimentoDoPrazo`, 01-core/efeito-temporario.jsx).
- Fora do combate (`aplicarEfeitosItem`): a porta com prazo gravava só a linha
  temporária e descartava o Vício; agora aplica o resto também.
Teste: `src/12-batalha/item-com-prazo-na-luta.test.js`.

## Item 19 — como ficou (14/11/2026)

`aplicarDanoCascata`: sem armadura de pé (ou com ela toda quebrada), o que
passa do `ar_max` — a absorção do elixir/poção, que soma em `ar` sem subir o
máximo — segura o golpe como a absorção da armadura, sem desgaste (não há peça).
Peça quebrando tira o mesmo de `ar` e de `ar_max` (desgastarAtor), então a
diferença é sempre só o elixir. Sem `ar_max` conhecido, não supõe nada.
`ignoraArmadura` fura o elixir também. Testes em
`src/12-batalha/dano-cascata-modificadores.test.js`; o fixture de
`tecnica-fase3.test.js` ganhou `ar_max` (os 20 eram da armadura quebrada).

## Karma das criaturas (14/11/2026, pedido fora da lista)

"Adicione karma às criaturas, mesma regra dos personagens." `karmaPelaRegra`
(01-core/game-data.jsx) é a conta única — (RM + 1) × (Aura + 1), sem poço com
Aura < 1 — usada por `calcularFicha` e pelo snapshot da criatura
(`montarSnapshots`); sem coluna nova, derivada como as resistências. Decidido
com o usuário: a criatura PAGA como o PJ (`magiasDaCriaturaCrua` com
`custo_karma` = nível, e ela escolhe o karma da coluna), e o minion fica com
1/4. No automático, o painel põe na coluna o menor entre o nível e o karma que
sobra (a criatura atacava na coluna do nível; sem isso, cairia na coluna 0) —
vale também para o PJ no automático, que antes ficava na coluna 0.
Consequência aceita: 19 das 74 criaturas com magia têm Aura < 1 e deixam de
lançar. O item 18 segue valendo só para a magia de item.
Teste: `src/12-batalha/karma-criatura.test.js`.

## Item 18 — como ficou (14/11/2026)

`magiaNoNivel` (12-batalha): quem nasceu de graça na lista — magia de item ou
de criatura, as duas com `custo_karma: 0` na base — segue de graça em qualquer
nível; o PJ paga sempre ao menos o nível comprado (≥ 1), então segue pagando o
nível escolhido. Teste em `src/12-batalha/magia-nivel-escolhido.test.js`.

## Item 17 — como ficou (14/11/2026)

`quantidadeDe` (01-core/inventario-helpers.jsx): ausente, vazio ou lixo vale
1; zero e negativo voltam como estão. Usada em `capacidadeContainer`, no card
do recipiente, em `guardarNoRecipiente` e em `moverParaContainer`; e
`normalizarPilhas` devolve a instância já consertada, que o autosave grava.
No banco não havia nenhum item sem quantidade (consulta de 14/11/2026), e
nenhuma RPC cria item sem ela — a correção é defensiva, no cliente.
Junto, no `moverParaContainer`: a "mesma pilha" escrita à mão conferia
`resistencia` (o desgaste mora em `res`) e deixava a peça gasta se somar às
inteiras — passou a usar a regra do item 13 (bônus + `assinaturaDeEstado`).
Teste: `src/07-inventario/itens-sem-quantidade.test.jsx`.

## Item 16 — como ficou (14/11/2026)

`mesclarInventario`: quando L removeu a pilha e R AUMENTOU a quantidade dela
(compra pela RPC, saque), fica um item com só o acréscimo (`R − B`); o que L
removeu, sai. R sem aumento segue saindo, e R gastando da pilha removida segue
o limite conhecido. Linha nova na tabela da spec
(`docs/superpowers/specs/2026-10-02-inventario-concorrencia-design.md`).
Testes em `src/01-core/inventario-concorrencia.test.js`.

## Item 15 — como ficou (14/11/2026)

- `normalizarPilhas` (07-inventario): as unidades que se desgarram de uma
  pilha não acumulável ganham ID DERIVADO do original (`<id>~1`, `<id>~2`…,
  pulando os que já existem) em vez de aleatório, e a primeira unidade fica
  sempre com o ID original (inclusive no caso geral, que antes trocava todos).
  Duas telas com a mesma pilha chegam aos mesmos IDs, e a mescla já tratava
  "o mesmo item novo dos dois lados" sem duplicar.
- `mesclarInventario` (01-core): `explodidosNosDois` acha os originais que os
  dois lados explodiram (derivado novo presente em L e em R); para eles a
  baixa de quantidade (3 → 1) conta UMA vez — somada, daria −1 e a peça
  equipada sumiria. A baixa normal dos dois lados (as flechas) segue somando.
Teste: `src/07-inventario/explosao-duas-telas.test.jsx`.

## Item 14 — como ficou (14/11/2026)

Três peças, no InventarioList (07-inventario) e no gravador (01-core/
inventario-concorrencia.jsx):
- `setInv` barra a carga estourada antes de aplicar, com a mesma conta da
  trava central (`entrouItem` + `cargaEstourouCom`), como já barrava o baú
  cheio — vale para toda entrada de item feita na tela, não só o "dar".
- `darItem` confere a carga ANTES de dizer "Entregue" e de contar à mesa.
- Recusa definitiva (`recusaDefinitiva`: carga máxima, baú cheio) no
  `aplicarGravacao`: `gravador.descartar` volta a cópia ao que o banco
  confirmou, a tela também volta, e o aviso aparece. Falha de rede mantém a
  cópia (a próxima mudança tenta de novo) e também avisa. O indicador
  "Falha ao salvar" do rodapé segue comentado; o aviso usa a faixa da tela.
Teste: `src/01-core/gravador-recusa.test.js`.

## Item 13 — como ficou (14/11/2026)

`assinaturaDeEstado` (07-inventario): compara a instância INTEIRA, menos o que
é identidade, anotação ou lugar (`instanceId`, `quantidade`, `observacao`,
`casa`, `origem_loja`, `containerId`, `slot`, `equipado`, `vestido`,
`vesteSlot`, `montado`, `animal_id`, `slot_animal`); vazio (null/false) conta
como ausente e a ordem das chaves não importa. Entra na chave das duas fusões
de `normalizarPilhas` (dentro do recipiente e solta acumulável) e no
"empilha, não gasta casa" de `guardarNoRecipiente`. Assim campo de estado novo
já nasce protegido, sem lista para atualizar. Pilhas que JÁ se fundiram antes
desta data não se separam (o estado perdido não volta).
Fica para o item 36: a parte que sai de uma pilha dividida (guardar parcial,
pôr no animal…) ainda nasce sem o estado da original.
Teste: `src/07-inventario/pilhas-no-lugar.test.jsx`.

## Item 12 — como ficou (14/11/2026)

A chave da pilha solta acumulável em `normalizarPilhas` (07-inventario) passou
de `slug` para `slug | animal_id | slot_animal | slot`: só funde quem está no
mesmo lugar — mochila do dono, lombo de um animal específico ou casa de saque
rápido. E a pilha não acumulável no saque (`slot` saque_d/saque_e) com
quantidade > 1 deixa UMA na casa e devolve o resto solto, como o equipado já
fazia; antes explodia com o `slot` copiado e duas peças ocupavam o mesmo saque.
Teste: `src/07-inventario/pilhas-no-lugar.test.jsx`.

## Item 11 — como ficou (14/11/2026)

`efeitoNegativo` (12-batalha) ganhou `TIPOS_MENOS_E_MELHOR`:
`dano_recebido_pct` (Aparar, Desviar, Combate com Escudo), `mod_dano_max`
(Pele de Árvore) e `mod_dificuldade` (Amizade, Conhecimento, Sombra…). Neles o
ruim é o valor POSITIVO — a Alucinação, que dificulta o teste do enganado,
passa a sair. Os demais tipos seguem "negativo é penalidade". As Proteções
(`reducao_dano`) já eram positivas e nunca saíam. Testes em
`src/12-batalha/magias-novas-cura.test.js` (bloco Purificação).

## Item 10 — como ficou (14/11/2026)

Posicionamento ganhou o tipo próprio `mod_dano_causado` (01-core/
tecnicas-efeito.jsx): fica no inimigo marcado e `danoFinal` o soma quando ELE
bate, no mesmo degrau plano do `mod_dano_max`. O `mod_dano_max` continua sendo
o teto do ALVO, que é a Pele de Árvore (protege quem a lança) — não foi
invertido, porque essa magia está certa. Os testes que travavam o
comportamento antigo (o marcado apanhando menos) foram reescritos.
Status de Posicionamento já gravado numa batalha em curso, com o tipo velho,
segue o efeito antigo até vencer (3 rodadas).

## Item 9 — como ficou (14/11/2026)

"Não podemos nos esquecer das flechas, etc." (usuário). Mestre e Jogador têm
a fila `aposGravar`: a ação enfileira o que mexe fora da batalha e o
`persistir`/`persistJogador` que ela dispara toma a fila de forma síncrona e
só a roda (`rodarEfeitosDaAcao`) depois de conferir o erro; falhou, descarta.
Entram na fila: a flecha e a ação do veneno da arma (`gastarMunicaoEVeneno`),
o pergaminho (`consumirItemDaMagia`, no ataque, no apoio e na magia de 1
rodada), o item da aba Item (`consumirItemDoPJ`) e todos os avisos à mesa da
ação — golpe, teste, item, apoio, largada e perda da evocação, magia pendente,
invocação, virada de rodada, passar e desistir — mais a fuga do bando e a
evocação quebrada que o próprio persistir anunciava antes de gravar.
Fica igual: na tela do Mestre a mesa é aplicada antes de gravar (otimista);
se a gravação falhar, o erro aparece e agora nada saiu do inventário.
Teste: `src/12-batalha/efeitos-apos-gravar.test.js`.

## Item 8 — como ficou (14/11/2026)

A brecha era só do Jogador: sem update local, o painel ficava aberto com a
mesa velha até a RPC voltar, e um segundo clique (ou o clique somado à
aplicação automática depois do dado) rodava o handler de novo — item consumido
duas vezes, dois avisos na mesa. O Mestre não tem a brecha: `persistir` aplica a
mesa e fecha o painel antes de ir ao banco. `criarTravaDeAcao` (pura) envolve
`handleAcao`/`handleTeste`/`handleItem`/`handleApoio` na entrega ao painel e
segura a próxima chamada até a `filaGravacao` daquela ação resolver; recusa sem
gravar ou falha soltam. Teste: `src/12-batalha/uma-acao-por-vez.test.js`.

## Item 7 — como ficou (14/11/2026)

`paParaAtaque(p, tipo)` (par de `debitarCustoAtaque`): PA paga tudo, o
`pa_ataque_extra` só paga arma. No `AcaoPanel`, `semPaParaAtaque` trava o
Atacar da resolução e o dado das abas Arma e Magia (rolar sem poder pagar
prenderia o painel). O modo automático também só escolhe magia com PA de
verdade; com só o extra, vai de arma. Teste: `src/12-batalha/magia-sem-pa.test.js`.

## Item 4 — como ficou (14/11/2026)

`atualizar_batalha_jogador` agora recusa: fora da vez (`nao_e_sua_vez` — o
`atual` do banco não é PJ do usuário nem animal de um PJ dele), cortina não
revelada (`cortina_aguardando`), participantes ou log sem base (`sem_base`) e
rodada que não fica nem vira uma (`rodada_invalida`). `anon` perdeu o EXECUTE.
Em QUEM o jogador escreve segue livre — o motor do combate roda na tela dele
e grava o dano no alvo e a vez de todos; travar isso pede o combate no servidor.
