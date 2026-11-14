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
| 1 | ⬜ | `comprar_item` (SECURITY DEFINER, executável por `anon`) não confere que `p_pj_id` é de quem chama; aceita `p_negociacao='sucesso'` do cliente; não aplica o filtro de cidade de `get_loja_pj`. |
| 2 | ✅ `scripts/sql/saque-so-pelo-encerrar-2026-11-14.sql` | `_menestrel_saque_da_batalha` (e `_menestrel_matador_da_criatura`, `_menestrel_lojas_globais`) executáveis por `anon`/`authenticated` sem checar papel — dá para forjar saque a preço 0. |
| 3 | ⬜ | Policy `personagens_update_own_or_vinculado` libera as 40 colunas ao dono: XP, atributos, receitas, `vendas_a_resgatar`, moedas por PATCH direto. |
| 4 | ⬜ | `atualizar_batalha_jogador` só confere que o usuário tem PJ na batalha: grava qualquer participante, qualquer campo, fora da vez, com a cortina aguardando; base nula substitui tudo. |
| 5 | 📝 | O jogador lê a linha inteira de `batalhas` (cortina só na tela) e `historias` tem SELECT `true` para todo logado. Adiado: exige uma visão do jogador no servidor e mexe no realtime. |

## 🟠 Alta — batalha (`src/12-batalha/batalha.jsx`)

| # | Estado | Achado |
|---|---|---|
| 6 | ⬜ | Status posto na ficha entra com `rodadas_rest: 1` (`ficha.jsx` StatusPrazoModal) e cai na 1ª virada (`decrementarStatusTemp`); o encerramento grava a ficha sem ele. |
| 7 | ⬜ | Magia lançada sem PA quando sobra `pa_ataque_extra` (`podeAplicar` sem `!semPA`; `debitarCustoAtaque` só gasta o extra em arma). |
| 8 | ⬜ | Clique duplo aplica a ação duas vezes (item/rolagem): handlers não conferem `salvando`. |
| 9 | ⬜ | Consumo de item/munição e aviso à mesa saem ANTES de gravar a batalha; se a gravação falha, o item já foi. |
| 10 | ⬜ | Posicionamento invertido (ver decisão acima) — `danoFinal` lê `mod_dano_max` do alvo. |
| 11 | ⬜ | Purificação tira buffs de valor negativo (Aparar, Desviar, Escudo, Pele de Árvore) antes do veneno. |

## 🟠 Alta — inventário

| # | Estado | Achado |
|---|---|---|
| 12 | ⬜ | `normalizarPilhas` funde pilha solta acumulável ignorando `animal_id`/`slot` (carga do animal volta ao dono; consumível do saque rápido some do saque). |
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
| 33 | ⬜ | `adicionarAoInventario` (saque) soma em pilha à venda ou no animal. |
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
| 41 | ⬜ | Saque gravado antes de anotar; falha → saca de novo. Saque simultâneo de dois jogadores sobrescreve `saqueado`. |
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

## Notas para a continuação (14/11/2026)

- **Item 1** — plano: renomear `comprar_item` para
  `_menestrel_comprar_item_nucleo` (REVOKE de anon/authenticated) e criar uma
  casca `comprar_item` com a mesma assinatura que confere dono **ou** Mestre da
  história, recusa `p_negociacao` de quem não é Mestre e exige que a entrada
  esteja num comércio com `lugar` = `data_jogo_atual->>'local'` (o filtro de
  `get_loja_pj`).
- **Item 3** — cuidado: o assistente de evolução
  (`08-personagens/personagens.jsx`, `salvar` em modo edição) grava `*_base` e
  `experiencia` pelo próprio jogador, e `ficha.jsx` `salvarExperiencia` grava
  XP. O gatilho não pode travar atributos sem antes mover o evoluir para RPC ou
  aceitar só aumentos coerentes com os pontos do estágio.
