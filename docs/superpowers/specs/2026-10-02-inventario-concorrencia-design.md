# Gravações concorrentes no inventário — design

Data: 02/10/2026 · Status: implementado em 02/10/2026 (plano docs/superpowers/plans/2026-10-02-inventario-concorrencia.md)

## Problema

`personagens.inventario` é um JSONB gravado inteiro por vários escritores:

| Escritor | Onde | Como grava hoje |
|---|---|---|
| Autosave e flush da tela de Inventário | `src/07-inventario/inventario.jsx` | cópia local segurada por minutos, grava a coluna inteira |
| Desequipar/despir na Ficha | `src/11-ficha/ficha.jsx` (`salvarItensFicha`) | cópia da Ficha, grava a coluna inteira |
| Batalha: pergaminho, poção, flecha | `batalha.jsx` (`consumirItemDoPJ`) | relê e grava (janela de milissegundos) |
| Batalha: ação do veneno | `batalha.jsx` (`gastarMunicaoEVeneno`) | relê e grava |
| Batalha: saque | `batalha.jsx` (`gravarSaqueNoPj`) | relê e grava |
| Fim da batalha: animais mortos | `batalha.jsx` (encerramento) | relê e grava |
| Compra, transferência, loja, abate, pergaminho | RPCs no servidor | atômico no servidor |

Quem segura cópia antiga grava por cima do que mudou por fora: uma flecha gasta
na batalha "volta" quando o jogador, com o Inventário aberto, guarda outro item.

## Objetivo

Quando duas mudanças no inventário do mesmo PJ acontecem perto uma da outra,
**as duas valem**, sem aviso ao jogador e sem pedir para refazer nada.

- Frequência real: "às vezes" (resposta do usuário) — confiável, sem tempo real.
- RPCs existentes não mudam. Permissões e RLS não mudam.

**Critério de sucesso:** "a batalha gasta uma flecha enquanto o jogador guarda a
corda no alforge" termina com as duas mudanças gravadas e visíveis. O mesmo vale
para Ficha × batalha e batalha × batalha.

## Abordagem escolhida

Mescla de três vias no cliente, com trava de versão (compare-and-swap).
Descartadas: mescla em RPC PL/pgSQL (duplica regras de pilha/recipiente em SQL e
exige permissão nova em `SECURITY DEFINER`) e uma operação no servidor por ação
(reescreve o inventário inteiro, desproporcional).

## 1. Regras da mescla — `mesclarInventario(base, local, remoto)`

Função pura. **B** = base (o banco quando a cópia foi lida), **L** = local (o que
se quer gravar, derivado de B), **R** = remoto (o banco agora). O resultado parte
de R e recebe só o que mudou de B para L.

Itens, casados por `instanceId` (todos os 257 itens em produção têm um):

| Situação | Resultado |
|---|---|
| Item em L e não em B (novo local) | entra |
| Item em B e não em L (removido local) | sai |
| Item fora de R, L não mexeu | continua fora |
| Item fora de R, L mexeu | continua fora — remoção remota vence |
| Campo mudado só em L | vale L |
| Campo mudado só em R | vale R |
| Campos diferentes mudados em cada lado | cada campo vem de quem o mudou |
| `quantidade` mudada nos dois lados | `R + (L − B)` |
| Outro campo mudado nos dois lados | vale L |
| `quantidade` final ≤ 0 | item sai |

"Campo mudado" compara por valor (igualdade profunda), para cobrir objetos como
`veneno` e `bonus`.

Moedas: cada moeda `max(0, R + (L − B))`.

Ordem: a de R; itens novos de L no fim, na ordem de L.

**Limite conhecido (aceito):** se L junta duas pilhas (a normalização de pilhas
faz isso) e R gasta uma unidade da pilha que L removeu, essa unidade volta. Fica
documentado no código e num teste.

## 2. Banco e protocolo de gravação

Migração aditiva, em `scripts/sql/inventario-versao-2026-10-02.sql` com seção
REVERTER:

- `alter table personagens add column inventario_versao bigint not null default 0`.
- Gatilho `personagens_inventario_versao`, `BEFORE UPDATE` (em todo update, não
  só `OF inventario` — senão um update só de `inventario_versao` passaria): se
  `new.inventario is distinct from old.inventario`, então
  `new.inventario_versao := old.inventario_versao + 1`; senão
  `new.inventario_versao := old.inventario_versao`. O valor enviado pelo cliente
  é sempre ignorado.
- Roda depois de `personagens_inventario_sem_orfaos` (ordem alfabética dos
  gatilhos BEFORE), então compara o inventário já limpo.
- RPCs existentes passam a incrementar a versão pelo gatilho, sem alteração.

Compatibilidade: cliente antigo continua gravando sem trava; o gatilho incrementa
do mesmo jeito. Ordem de entrega: migração, depois código.

Gravação com trava:

```js
update({ inventario }).eq('id', pjId).eq('inventario_versao', versaoLida)
  .select('inventario, inventario_versao')
```

Uma linha de volta = gravou. Zero linhas = conflito: relê, refaz, tenta de novo,
até 3 tentativas; depois devolve erro.

Helpers em `src/01-core/inventario-helpers.jsx` (expostos no `window`):

- `mesclarInventario(base, local, remoto)` — seção 1.
- `gravarInventario(pjId, { base, local, versao })` — para quem segura cópia. Se
  `local` não difere de `base`, não grava. Em conflito: relê R e versão, grava
  `mesclarInventario(base, local, R)`. Devolve
  `{ ok, inventario, versao }` ou `{ ok: false, error }`.
- `alterarInventario(pjId, fn)` — para mudança pontual. Lê `(R, versão)`, grava
  `fn(R)` com a trava; em conflito, repete com o dado novo. Mesmo retorno.

## 3. Integração

**Tela de Inventário (`inventario.jsx`):**
- `PJ_COLS` inclui `inventario_versao`. Ao carregar um PJ e ao recarregar depois
  de RPC (transferir, publicar na loja, pergaminho), atualiza `invBaseRef` e
  `versaoRef`.
- Autosave e flush chamam `gravarInventario`.
- Rebase ao terminar: com o resultado M, `inv = mesclarInventario(enviado,
  invAtualNaTela, M)`, `base = M`, `versao = nova`. Sem mudança no meio-tempo, a
  tela passa a mostrar M (aparece o que mudou por fora). Sem diferença local,
  nada é gravado — o autosave não entra em laço.

**Ficha (`salvarItensFicha`):** base = `pj.inventario` exibido; local = base com
a peça desequipada/despida; versão = `pj.inventario_versao`. Só a peça vai ao
banco, mesmo com cópia velha.

**Batalha:** `consumirItemDoPJ`, o gasto do veneno em `gastarMunicaoEVeneno`,
`gravarSaqueNoPj` e a remoção de animais mortos no encerramento passam a usar
`alterarInventario`. Sai o aviso "ainda não é atômico" do comentário de
`consumirItemDoPJ`.

## 4. Testes

1. `mesclarInventario`: um caso por linha da tabela da seção 1, moedas, ordem, e
   o limite conhecido.
2. `fakeSupabase` simula a versão: `update` com `.eq` encadeados e `.select()`,
   e o gatilho que incrementa `inventario_versao`. Testes da trava e da nova
   tentativa em `gravarInventario` e `alterarInventario`.
3. Integração pelo `InventarioList`: guardar a corda enquanto a "batalha" gasta
   uma flecha por fora; as duas mudanças no banco falso e na tela.
4. Migração: gatilho verificado em produção dentro de `BEGIN … ROLLBACK` antes de
   aplicar de verdade.

## Fora do escopo

Realtime, aviso visual de conflito e `estado_atual` (já tem mescla própria em
`patchDeEstado`/`gravarEstadoAtual`).
