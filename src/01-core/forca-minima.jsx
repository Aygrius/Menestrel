/* ============================================================
   FORÇA MÍNIMA — quem limita a arma é o atributo, não a linhagem
   ============================================================
   Pedido do usuário (06/10/2026):
     "Remova a limitação de uso de armas das raças anão, pequenino, etc. A
      limitação será pelo campo 'força mínima'. Você deve manter apenas a
      quantidade mínima de mãos para usar determinado item, que atualmente
      está escrito 'Mãos (Outras Raças)'."

   O QUE SAIU: `getMaosRequeridas` escolhia entre três colunas pela raça
   (maos_pequenino / maos_anao / maos_outras), e coluna VAZIA significava
   "esta raça não pode usar" — era daí que saía o "Proibido para Anão" no
   modal do item. Hoje há uma coluna só, e ela vale para todos
   (01-core/inventario-helpers.jsx).

   O QUE ENTROU: `forca_req`, que sempre existiu no catálogo como número
   exibido e nunca foi regra. Agora é a trava.

   DUAS ARMADILHAS, e é por elas que este módulo é pequeno e explícito:

   1. `forca_req` ZERO. A maioria esmagadora das peças tem 0 ou nulo. Tratar
      zero como exigência travaria o catálogo inteiro; e "exige 0" é o mesmo
      que não exigir. Zero, nulo, vazio e NEGATIVO são todos "não exige".

   2. A MENSAGEM. `alcancaForcaMinima` devolve o par (precisa, tem) e não só
      um booleano, porque a tela precisa dizer "Precisa de Força 3 (você tem
      2)". Com "não pode usar" o jogador não sabe o que fazer a respeito.

   A sub-raça (Vampiro, Lobisomem) PODE mudar o acesso a uma arma — e isso é
   coerente: ela não mexeu numa regra de raça, mexeu na Força do personagem.
   Ver 01-core/forma-raca.jsx.
   ============================================================ */

/* A Força que a peça exige. Zero quando não exige nada. */
function forcaMinimaDoItem(cat) {
  const v = Number(cat && cat.forca_req);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round(v);
}

/* O personagem alcança a peça? Devolve { ok, precisa, tem } — os dois números
   são para a tela explicar, não só barrar. Força fracionada arredonda
   (atributo é inteiro) e Força negativa conta como 0. */
function alcancaForcaMinima(cat, forca) {
  const precisa = forcaMinimaDoItem(cat);
  const bruto = Number(forca);
  const tem = Number.isFinite(bruto) ? Math.max(0, Math.round(bruto)) : 0;
  return { ok: tem >= precisa, precisa, tem };
}

Object.assign(window, { forcaMinimaDoItem, alcancaForcaMinima });
