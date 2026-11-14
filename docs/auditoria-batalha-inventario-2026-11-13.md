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

- **Feitos:** 1 a 4 e 6 a 12 (todos os críticos do banco, todos os de alta
  prioridade da batalha e o primeiro do inventário). Item 5 adiado. Itens 33 e 41 resolvidos só no lado do jogador
  (saque pela RPC `saquear_criatura`); falta o saque do Mestre.
- **Próximo: item 13** — dentro de recipiente, a fusão ignora `quebrada`,
  `res`, `veneno`, `vitalidade`… Depois seguir a ordem da tabela (14, 15…).
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
| 13 | ⬜ | Dentro de recipiente, a fusão ignora `quebrada`, `res`, `veneno`, `vitalidade`… — o estado de uma instância contamina a pilha. |
| 14 | ⬜ | Mestre dá item que estoura a carga: tela diz "Entregue", nada grava, e toda gravação seguinte é recusada em silêncio (aviso de falha comentado). |
| 15 | ⬜ | Duas telas "explodem" a mesma pilha com IDs aleatórios e a mescla de três vias duplica (3 adagas → 6). |
| 16 | ⬜ | Mescla perde compra: L removeu a pilha, R aumentou — `if (b && !l) return` descarta o aumento. |
| 17 | ⬜ | Item sem `quantidade` vira NaN em `guardarNoRecipiente`/`podeMoverParaContainer`/`normalizarPilhas` — a pilha guardada some. |

## 🟡 Média — batalha

| # | Estado | Achado |
|---|---|---|
| 18 | ⬜ | Criatura que escolhe nível de magia menor paga karma (`magiaNoNivel`) e trava (karma 0). |
| 19 | ⬜ | Absorção de elixir/poção (`ar` acima de `ar_max`) não protege quem está sem armadura (`aplicarDanoCascata`). |
| 20 | ⬜ | Item com prazo (Fogo Vivo, Karma Líquido, Energia Cinética, Elixir da Euforia) não faz nada em combate e é consumido (`aplicarEfeitoItemSnapshot`). |
| 21 | ⬜ | Virada calcula PA e passo com o buff de velocidade que expira nela mesma. |
| 22 | ⬜ | PJ que entra com EF ≤ 0 fica desmaiado a luta inteira (sem o contador `desmaio_ef`). |
| 23 | ⬜ | Rodada trava se todo ativo está canalizando/sem ação — ninguém recebe `atual`. |
| 24 | ⬜ | Falha passageira ao gravar a cortina desliga a cortina para sempre naquela tela. |
| 25 | ⬜ | Encerrar sobrescreve `condicoes` com as da entrada (horas avançadas na luta somem). |
| 26 | ⬜ | Alvo guardado por índice: quando alguém sai da lista, a mira pula para o vizinho. |
| 27 | ⬜ | Item usado pelo Mestre a partir do cache velho: efeito sem baixa (`consumirDoInventario` devolve ok sem achar o item). |
| 28 | ⬜ | Restaurar do treino não conserta peças quebradas nem `ar`/`ar_max`. |

## 🟡 Média — inventário

| # | Estado | Achado |
|---|---|---|
| 29 | ⬜ | Usar consumível: efeito e baixa gravam em pernas separadas; o rollback reverte o PJ inteiro. |
| 30 | ⬜ | Fabricar valida material numa cópia velha e anuncia sucesso sem esperar a gravação. |
| 31 | ⬜ | Conteúdo de recipiente posto no animal pesa no dono (`calcCarga`). |
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
