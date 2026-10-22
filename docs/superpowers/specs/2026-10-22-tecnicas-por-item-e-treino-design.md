# Técnicas por item e treino com tempo (técnicas e magias) — design

Data: 22/10/2026 · Status: aprovado em conversa

## Pedido do usuário

> "vamos fazer a mudança nas técnicas de combate com o mesmo intuito que
> fizemos para as magias, todo mundo poderá aprender todas as técnicas. Toda
> técnica terá um pergaminho para aprender igual a magia, porém ao clicar e
> 'comprar' (e possuir pontos para isso) a técnica vai aparecer no menu
> treinando, e só vai efetivamente ficar disponível para uso após [um tempo]
> de treinamento. Para cada nível comprados, são [N] dias treinando."

> "Vamos adicionar a dinâmica de aprender magia como é feito com as técnicas,
> porém será estudando para feitiços, orando para milagres, meditando para
> transmutação e adicione mais um: praticando para encantos, e ao invés de ser
> 7 dias, será 1 dia. As técnicas deixam de ser 7 dias e passam a ser 3 dias."

Decisões do usuário na conversa (22/10/2026):

1. "Dias treinando" = dias do **relógio da mesa** com a atividade certa
   **ligada**; o treino pausa quando o personagem faz outra coisa.
2. Técnicas têm **livros com pergaminhos vinculados**, a mesma funcionalidade
   das magias (janela Estudar, vínculo no admin). **Livros separados** dos de
   magia. Nada automático: o Mestre entrega ou o jogador compra.
3. Fila: níveis comprados treinam **em fila**, na ordem da compra. O nível já
   sabido **continua usável** enquanto o próximo treina.
4. Tempo por nível: técnica **3 dias** de Treinando; magia **1 dia** da
   atividade da classe — Feitiço: Estudando; Milagre: Orando; Transmutação:
   Meditando; Encanto: **Praticando** (atividade nova).
5. Pontos de técnica por estágio = base + max(0, Físico) + max(0, Agilidade);
   sem regra de base zero. Base: Guerreiro 4, Ladino 2, Rastreador 3,
   Sacerdote 3, Bardo 2, Mago 1.
6. Técnicas sem permissão vão para um **Livro Geral de Técnicas de Combate**.
7. **Praticando** recupera igual a Estudando e Treinando (+5 de Reputação por
   hora).

## 1. Fila de treino (técnicas e magias)

Coluna nova `personagens.treinos jsonb NOT NULL DEFAULT '[]'`, uma lista em
ordem de compra:

```
{ id, tipo: 'tecnica' | 'magia', key, nivel, atividade, horas_restantes, comprado_em }
```

- `nivel`: para técnica, o nível comprado (1, 2, …); para magia, os
  **passos** (1..5).
- `atividade`: `treinando` (técnica) ou a da classe da magia.
- `horas_restantes`: 72 (técnica) ou 24 (magia) na compra.

**Avanço.** Quando o Mestre avança o relógio (shell.jsx, o mesmo laço que já
aplica desgaste e recuperação por atividade), para cada protagonista com a
atividade ligada: as horas avançadas vão para o PRIMEIRO item da fila com
aquela atividade; sobrando horas, para o seguinte da mesma atividade. Item que
chega a 0 sai da fila e grava o nível em `tecnicas[key]` ou `magias[key]`
(nunca rebaixa: grava o maior). Itens de outras atividades não andam.
Função pura `avancarTreinos(treinos, atividade, horas) → { treinos, concluidos }`
em `01-core/clima-desgaste.jsx` (ao lado de `recuperacaoPorAtividade`).

**Pontos.** O nível vai para a fila já pago: o gasto conta `tecnicas`/`magias`
**mais** o que está na fila. O próximo nível comprável é
`max(sabido, maior na fila) + 1`.

**Telas.**
- Menu de atividade da ficha: cada atividade lista a sua fila (nome, nível,
  dias e horas que faltam); o primeiro marcado como "em treino agora".
- Janela Estudar: linha com nível em fila mostra "em treino" e o próximo
  nível depois dele.
- Batalha e ficha só usam o que está em `tecnicas`/`magias` (o que já é
  verdade): o nível em treino não aparece.

## 2. Técnicas por item

- Coluna nova `itens.tecnica text` (nome da técnica que o pergaminho ensina),
  espelho de `itens.magia`.
- **Pergaminhos**: um por técnica, slug `pergaminho_tecnica_<key>`, nome
  `Pergaminho <Técnica>`, grupo Consumíveis, ícone `ti-file-star`, origem
  Comum.
- **Livros novos (14)**, grupo Itens, molde do `livro_do_justiceiro`:
  - Manual do Guerreiro, Manual do Ladino, Manual do Rastreador, Manual do
    Bardo, Manual do Sacerdote, Manual do Mago;
  - Manual da Academia de Soldados / de Arqueiros / de Cavaleiros / de
    Gladiadores;
  - Manual da Guilda de Assassinos / de Ladrões / de Piratas;
  - Livro Geral de Técnicas de Combate (as 7 técnicas sem permissão).
- **Vínculos** em `livro_pergaminhos` (a tabela é genérica), carga pela
  permissão atual de cada técnica.
- **RPC `aprender_tecnica(p_pj_id, p_instance_id, p_tecnica_key)`**, espelho
  da `aprender_magia`: instância no inventário; não à venda; o item é o
  pergaminho da técnica ou um livro com vínculo; próximo nível =
  max(sabido, fila) + 1; pontos; **não confere permissão**; não consome; põe
  na fila (`treinando`, 72 h).
- **Pontos** (JS e SQL espelhados): `pontosTecnicasPorEstagio(profissao,
  fisico, agilidade)` = base + max(0, Físico) + max(0, Agilidade); total ×
  estágio. Atributos gravados (`fisico_base`, `agilidade_base`).
- **Inventário**: pergaminho e livro de técnica abrem a mesma janela Estudar
  (linhas de técnica com nível atual → próximo e custo).
- **Criador de personagem**: sai o passo de técnicas; criação grava
  `tecnicas = {}`; edição não manda `tecnicas`.
- `tecnicas.permissao` **fica** como informação (bestiário, divisão
  Básicas/Avançadas da ficha) — só deixa de decidir quem aprende. Remover é
  decisão futura, como foi com as magias.

## 3. Magias na fila

- `aprender_magia` deixa de gravar `magias[key]`: põe na fila com a atividade
  da classe e 24 h. Próximo nível e pontos contam a fila.
- Atividade nova `praticando` (ícone `ti-music`), efeito igual a
  estudando/treinando.

## 4. Migração

- `personagens.treinos` nasce `[]`. Ninguém perde técnica nem magia já
  aprendida.
- Guardas: toda técnica tem pergaminho; toda técnica está em ≥1 livro; os 14
  livros existem.

## 5. Testes

- `avancarTreinos`: fila por atividade, sobra de horas passando ao próximo,
  conclusão grava o maior nível, outras atividades não andam.
- Pontos de técnica: tabela de bases, atributo negativo conta 0, gasto
  incluindo a fila.
- RPCs: técnica entra na fila (não em `tecnicas`); magia entra na fila com a
  atividade da classe; próximo nível conta a fila (ensaio SQL com ROLLBACK).
- Janela Estudar com técnica; linha "em treino".
- Menu de atividade mostra a fila com dias restantes.
- Criador sem passo de técnicas; edição não manda `tecnicas`.
- Relógio: avançar 24 h com Orando conclui um milagre na fila.

## Fora de escopo

- Remover `tecnicas.permissao`.
- Cancelar treino / devolver pontos.
- Treino quando o relógio não anda (o tempo é sempre o da mesa).
