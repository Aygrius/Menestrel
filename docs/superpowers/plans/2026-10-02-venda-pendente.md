# Item à venda no inventário e moedas a resgatar — plano

> Execução: nativa (executing-plans), nesta sessão.

**Spec:** `docs/superpowers/specs/2026-10-02-venda-pendente-design.md`

## Tarefas

1. **Migração do banco** — `scripts/sql/venda-pendente-2026-10-02.sql`:
   coluna `vendas_a_resgatar`; `publicar_item_loja`, `comprar_item_anunciado`,
   `retirar_item_loja` reescritas; `resgatar_vendas` nova; `transfer_item`,
   `vender_item` e `comprar_item` remendadas (recusar/ignorar `anuncio_id`);
   migração dos anúncios abertos. Teste completo em `BEGIN … ROLLBACK`
   (personagens de teste montados dentro da transação, `auth.uid()` simulado
   por `request.jwt.claims`), depois `apply_migration`.
2. **Núcleo** — `estaAVenda`, `itensLivres` (inventario-helpers);
   `normalizarPilhas` intacto para travado; `consumirDoInventario`,
   `flechasNoInventario`, `contarPorNome`, `carneDisponivel`,
   `magiasDeItensDoAtor`, consumíveis da aba Item, `animaisDoPersonagem`
   ignoram travado. Testes unitários.
3. **Inventário** — selo `ti-tag`; `DetalhesItemModal` com ações bloqueadas e
   dica; `guardarNoRecipiente` recusa `a_venda`; soltar no amigo recusa;
   `usarItemFicha` ignora. Testes.
4. **Loja** — `PJ_COLS`/carga com `vendas_a_resgatar`; aviso + Resgatar;
   recarregar após resgate. Testes.
5. **Verificação** — suíte, lint, tsc, detector; tela; commit; push.

Desvios registrados na conversa: parte travada nasce sem `casa`; comprador
recebe o estado atual da instância do vendedor; `transfer_item` e
`comprar_item` não empilham sobre pilha à venda.
