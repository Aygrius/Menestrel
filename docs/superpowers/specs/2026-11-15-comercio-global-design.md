# O comércio global das cidades — desenho

15/11/2026 · aprovado pelo usuário, com duas correções (o saque, e onde o
personagem está)

## Por quê

Pedido do usuário: "A loja das cidades funcionará globalmente, independente das
mesas e do tempo. Isso quer dizer que um item/moeda que entrar no comércio, será
visto por todas as vezes. Definiremos o nome dos comércios de cada cidade, com um
estoque e caixa financeiro próprio." E: "A loja vai sair do trilho superior da
mesa, e agora irá para o mapa."

Hoje cada mesa tem a sua loja (o bloco `historias.estoque_loja`), copiada entre as
mesas do mesmo Mestre por um gatilho. O mundo passa a ter **uma** economia por
cidade: o que um grupo vende em Abrasil está lá para o próximo grupo que passar.

## Decisões do usuário

1. **Quem administra:** só o Imperador (nome, estoque, preços, caixa). Mestre e
   Jogador só leem.
2. **Os estoques que existem nas mesas:** não são aproveitados; os comércios
   começam vazios. O bloco antigo fica guardado, sem uso — nada é apagado.
3. **O caixa:** a venda do jogador é paga pelo caixa; sem caixa, o comércio não
   compra. A compra do jogador põe o dinheiro no caixa.
4. **A venda é proposta, e quem responde é o Imperador:** o jogador propõe um
   preço, o Imperador aceita, recusa ou contrapropõe.
5. **O saque não vai para comércio nenhum** (correção): "o saque aparece no campo
   de batalha para os combatentes saquearem, sem preço. O saque desaparece quando
   a batalha se encerra." Hoje o que ninguém leva vai de graça para a loja da
   mesa; isso acaba.
6. **A Loja sai do trilho da mesa e vai para o mapa.**
7. **O jogador vê o comércio de onde o PERSONAGEM está** (correção: "O comércio
   onde ELE está"), não de onde a mesa está.
8. **Abordagem:** tabelas próprias (escolhida). A outra — o bloco de hoje num
   registro global — foi descartada: compras de mesas diferentes ao mesmo tempo
   sobrescreveriam o estoque umas das outras.

## Objetivos

- Um conjunto de comércios por cidade do catálogo do mundo, visto por toda mesa.
- Estoque e caixa que nunca ficam negativos e nunca vendem a mesma unidade duas
  vezes, com várias mesas comprando ao mesmo tempo.
- O Imperador administra pelo mapa: toca na cidade, vê os comércios dela.
- A Loja do jogador continua onde está (trilho da ficha) e mostra os comércios
  da cidade onde o personagem está.

## Não objetivos

- Reabastecimento automático, preço que varia com o tempo ou com a oferta.
- Comércio por mesa, ou o Mestre montando loja.
- Migrar os estoques atuais.
- Pagamento real (o caixa é moeda do jogo).

## Anti-objetivos (seria fracasso mesmo funcionando)

- Um item comprado por dois grupos ao mesmo tempo sair duas vezes do estoque.
- O caixa ficar negativo, ou uma venda aceita sem caixa para pagar.
- O jogador ver a loja de uma cidade onde o personagem não está.
- Perder o item do jogador numa proposta recusada.

## O banco

**`comercios`**
- `id` (identidade)
- `cidade` (o slug da cidade do mundo)
- `nome`
- `caixa_latao` (bigint, ≥ 0)
- `aberto` (bool)
- `ordem`, `criado_em`

RLS: leitura para todo logado; escrita só `eh_admin()`.

**`comercio_itens`**
- `comercio_id` → `comercios` (cascade)
- `slug` → `itens`
- `estoque` (int, ≥ 0)
- `preco_latao` (nulo = o valor de tabela do item)
- `casa` (a posição na grade)

Chave: (`comercio_id`, `slug`). Mesma RLS.

**`personagens.cidade_atual`** (coluna nova): o slug da cidade do mundo; nulo =
na estrada. Quem grava é o mapa — o Mestre põe ou arrasta o personagem para
dentro de uma cidade (um lugar do mapa ligado a uma ficha de cidade) e o
personagem fica nela; fora de cidade, nulo. O texto livre
`personagens.localizacao` (que o acesso a propriedades usa) não muda.

**`propostas_comercio`**
- `id`, `comercio_id`
- `pj_id`, `user_id`, `historia_id`
- `item` (jsonb: a instância que saiu do inventário), `slug`, `item_nome`, `quantidade`
- `preco_latao` (o proposto), `preco_contra` (a contraproposta do Imperador)
- `status`: `aberta` · `contraproposta` · `aceita` · `recusada` · `retirada`
- datas

RLS: o jogador lê as do seu personagem; o Imperador lê todas. Ninguém escreve
direto; tudo passa pelas funções.

**Funções** (SECURITY DEFINER, cada uma numa transação, com `FOR UPDATE` na
linha do comércio ou do item):
- `comercios_do_personagem(p_pj_id)` — os comércios abertos da cidade em
  `personagens.cidade_atual`, com itens e preços. Sem cidade, nenhum.
- `comprar_no_comercio(p_pj_id, p_comercio_id, p_slug, p_qtd, p_container_id)` —
  baixa o estoque, cobra o personagem, põe o valor no caixa, entrega o item. O
  inventário só por compare-and-swap, como manda a casa.
- `propor_venda_comercio(p_pj_id, p_comercio_id, p_instance_id, p_qtd, p_preco)` —
  tira o item do inventário (ele fica guardado na proposta) e abre a proposta.
  Só para um comércio da cidade onde o personagem está.
- `responder_proposta_comercio(p_id, p_acao, p_preco)` — só o Imperador:
  - `aceitar`: só se o caixa tiver o preço. Paga o personagem, o item entra no
    estoque e o caixa baixa.
  - `recusar`: o item volta ao inventário.
  - `contrapropor`: grava `preco_contra`; a proposta vai para o jogador.
- `responder_contraproposta(p_id, p_acao)` — o jogador aceita (mesma regra do
  aceitar, com o preço da contraproposta) ou recusa (o item volta).
- `retirar_proposta(p_id)` — o jogador desiste enquanto está aberta; o item volta.
- `pôr o personagem na cidade(p_pj_id, p_cidade)` — grava `cidade_atual`; confere
  que quem pede é o Mestre da mesa do personagem.
- Admin, para o Imperador: criar, renomear, abrir e fechar comércio; pôr ou tirar
  item; mudar estoque, preço e caixa.
- **Saque:** os combatentes saqueiam no campo de batalha durante a luta, de graça
  (`saquear_criatura`, como hoje). Ao encerrar, o que sobrou **some** —
  `_menestrel_saque_da_batalha` deixa de mandar o resto para a loja da mesa.

As funções antigas da loja (`get_loja_pj`, `comprar_item`, `vender_item`, as de
anúncio e proposta) deixam de ser chamadas pela tela. Ficam no banco até uma
limpeza combinada.

## A tela

- **Mesa do Mestre:** a Loja sai do trilho (fica Cena · Batalha).
- **Mapa, para todos:** tocar numa cidade mostra no painel lateral os comércios
  dela, com nome, aberto ou fechado e quantos itens tem.
  - **Imperador:** cria, renomeia, abre e fecha comércio; abre a grade de
    estoque, a mesma do Estoque de hoje, para pôr itens, estoque e preço; ajusta
    o caixa. As propostas que chegaram para aquele comércio aparecem ali, com
    Aceitar / Recusar / Contrapropor. Aceitar fica desligado, com o motivo,
    quando o caixa não cobre.
  - **Mestre e Jogador:** leem o que cada comércio vende.
  - **Mestre:** pôr ou arrastar o personagem para dentro de uma cidade grava a
    cidade dele (`cidade_atual`); tirar da cidade a apaga.
- **Loja do jogador** (trilho da ficha): a mesma tela de compra, lendo
  `comercios_do_personagem`. Vender abre a proposta, e as propostas do
  personagem mostram o estado (aberta, contraproposta com Aceitar/Recusar,
  recusada). Na estrada: "Seu personagem não está numa cidade."
- **Aviso ao Imperador:** um contador de propostas abertas no menu, e um aviso
  no feed (mesa_log) quando chega uma nova.

## O que fica para quem constrói

- O componente da grade de estoque: reaproveitar `EstoqueMestreView` apontando
  para as tabelas novas, ou extrair a grade dele — decidir lendo o código.
- O texto dos avisos e das recusas (o motivo do banco dito para a pessoa).
- Os testes: as funções de compra e de proposta com duas compras simultâneas,
  caixa insuficiente, recusa devolvendo o item; o mapa gravando a cidade.
- Atualizar `docs/CODEBASE_MAP.md` (tabelas e funções novas).
