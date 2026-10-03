# Item à venda fica no inventário; venda vira moedas a resgatar — design

Data: 02/10/2026 · Status: aprovado em conversa

## Pedido do usuário

> "Quando o item for vendido, o dinheiro fica pendente de ser resgatado pelo
> jogador que o vendeu. O item à venda, continua ocupando espaço no inventário."

Decisões do usuário no mesmo dia:
- Enquanto à venda, o item fica **travado**: não pode ser usado, equipado,
  vestido, transferido, guardado, descartado nem vendido. Para mexer, retira da
  loja primeiro.
- O resgate fica **na própria loja**: aviso no topo com o botão Resgatar.

Decisões do executor (ver a conversa): o anúncio aberto que existe hoje volta
ao inventário do vendedor já travado; mudar o item de **casa** continua
permitido (é arrumação, não uso).

## Hoje

`publicar_item_loja` tira o item do inventário e o guarda em
`anuncios_loja.item`. `comprar_item_anunciado` dá ao comprador uma cópia de
`anuncios_loja.item` e credita as moedas direto na bolsa do vendedor
(`_menestrel_inv_creditar_latao`); sem bolsa, a compra é recusada
(`vendedor_sem_espaco_moedas`). `retirar_item_loja` devolve uma cópia ao
inventário.

## 1. Banco

Migração aditiva `scripts/sql/venda-pendente-2026-10-02.sql`, com REVERTER.

- **Coluna** `personagens.vendas_a_resgatar bigint not null default 0`
  (latão). Só as funções `SECURITY DEFINER` abaixo a escrevem; o cliente lê.
- **Marca** `anuncio_id` (número) na instância do inventário = item à venda.
  `anuncios_loja.item->>'instanceId'` aponta a instância travada.
- **`publicar_item_loja`**, além das checagens de hoje:
  - recusa instância que já tem `anuncio_id` (`item_ja_a_venda`);
  - insere o anúncio primeiro (para ter o id);
  - quantidade inteira: grava `anuncio_id` na própria instância;
  - parte da pilha: a instância fica com o resto e uma instância nova, com a
    quantidade anunciada, `anuncio_id` e a mesma casa/recipiente, é criada;
  - `anuncios_loja.item` guarda a cópia da instância travada (com o
    instanceId dela).
- **`comprar_item_anunciado`**:
  - acha no vendedor a instância com `anuncio_id = id do anúncio`; sem ela, o
    anúncio é encerrado (`status = 'retirado'`) e a compra volta
    `item_indisponivel`;
  - tira `v_q` unidades dela (remove a instância quando zera);
  - o comprador recebe a cópia **sem** `anuncio_id`, `casa` nem `containerId`,
    com instanceId novo (a casa livre é dada pelo cliente);
  - o vendedor ganha `v_custo` em `vendas_a_resgatar`;
  - sai o erro `vendedor_sem_espaco_moedas`;
  - Mestre comprando (`p_pj_id` nulo): o item sai do jogo, o vendedor ganha o
    valor a resgatar.
- **`retirar_item_loja`**: tira `anuncio_id` da instância (se ela existir) e
  encerra o anúncio. Não cria cópia.
- **`resgatar_vendas(p_pj_id)`** (nova, só o dono): deposita
  `vendas_a_resgatar` na bolsa, moeda a moeda do maior para o menor
  (`inv_depositar_moeda`); o que couber sai do pendente, o que não couber
  fica. Devolve `{ ok, resgatado, restante }`; nada coube →
  `{ ok:false, motivo:'sem_espaco_moedas' }`.
- **`transfer_item`** e **`vender_item`**: recusam instância com `anuncio_id`
  (`item_a_venda`).
- **Migração do anúncio aberto**: para cada anúncio `aberto`, devolve a cópia
  ao inventário do vendedor com `anuncio_id` (instanceId preservado ou novo).
- Funções novas/alteradas: `set search_path`, `revoke` de `anon`, `grant` a
  `authenticated`.

## 2. Núcleo do cliente

Em `src/01-core/inventario-helpers.jsx` (no `window`):
- `estaAVenda(it)` → `!!(it && it.anuncio_id != null)`.
- `itensLivres(itens)` → os itens que não estão à venda.

`normalizarPilhas` (07-inventario) **não funde nem explode** instância à venda
(trata como equipado: instância intacta).

## 3. Tela

- **Inventário:** card com selo de etiqueta (`ti-tag`); continua pesando e
  ocupando casa. `DetalhesItemModal`: as ações de usar, equipar, vestir,
  transferir, armazenar, descartar, vender, envenenar, preparar e aprender
  ficam desativadas com a dica "À venda na loja — retire o anúncio para usar".
  Arrastar para outra casa: permitido. Para mochila: `guardarNoRecipiente`
  recusa (`a_venda`). Para o card de amigo: recusa com aviso.
- **Batalha e Ficha:** `consumirDoInventario`, `flechasNoInventario`,
  `contarPorNome`/`consumirItensDoRitual`, `carneDisponivel`,
  `magiasDeItensDoAtor`, os consumíveis da aba Item, `usarItemFicha` e
  `animaisDoPersonagem` ignoram o que está à venda.
- **Loja:** com `vendas_a_resgatar > 0`, aviso no topo "Você tem X em vendas
  para resgatar" + **Resgatar** (chama `resgatar_vendas`, recarrega o PJ e
  mostra o resultado). Retirar/comprar recarregam o PJ (já fazem).

## 4. Testes

- Banco, em `BEGIN … ROLLBACK`: publicar inteiro e parcial (instância travada,
  casa preservada), comprar parcial e total (vendedor perde as unidades,
  comprador recebe sem marca, pendente soma), retirar (destrava), resgatar
  total e parcial, transfer_item recusando item à venda.
- Cliente: `estaAVenda`/`itensLivres`; `normalizarPilhas` não funde o
  travado; `guardarNoRecipiente` recusa; `consumirDoInventario` e
  `flechasNoInventario` ignoram; selo e ações bloqueadas no modal; aviso de
  resgate na loja.

## Fora do escopo

Notificação ao vendedor quando vende; histórico de vendas; prazo de anúncio.
