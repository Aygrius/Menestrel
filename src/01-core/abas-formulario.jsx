/* ============================================================
   abas-formulario.jsx — as abas dos editores longos (17/11/2026)
   ============================================================
   Usuário: "Crie abas para preenchimento organizado de todas as páginas de
   compêndio e ambientação." Os editores do Compêndio (CatalogoEditor), das
   Entidades e dos Grupos (EditorMundo) e de Reinos, Cidades, Locais e
   Pessoas (LoreEntradaForm) eram uma coluna só, longa, rolando por baixo do
   título. Agora cada um divide os campos em abas.

   A pele é a pílula de trilho do sistema (.trilho-solto, .mc-acao), com a
   lâmina (10-shell): .form-abas é trilho, a aba aberta é .is-ativo. Fica presa no alto do corpo da janela enquanto ele
   rola. A aba com campo obrigatório vazio leva o ponto de brasa — o Salvar
   fica apagado, e o ponto diz onde está o que falta.

   AbasDoFormulario({ abas: [{ id, rotulo, alerta? }], ativa, onTrocar, rotulo })
   useAbaDoFormulario(ids) → [ativa, setAtiva]: começa na primeira e volta a
   ela se a aba aberta deixar de existir (trocar o tipo do lugar, por exemplo).
   ============================================================ */

function AbasDoFormulario({ abas, ativa, onTrocar, rotulo = 'Seções' }) {
  if (!Array.isArray(abas) || abas.length < 2) return null;
  /* No padrão do trilho (17/11/2026, usuário: "O trilho no modal de edição
     ficou fora do padrão"): a pílula avulsa do sistema (.trilho-solto, a da
     Cena), do tamanho do conteúdo e no centro, com os botões do trilho
     (.mc-acao, .is-ativo) — não a faixa segmentada de ponta a ponta. */
  return (
    <div className="form-abas-barra">
      <div className="trilho-solto livro-trilho form-abas" role="tablist" aria-label={rotulo}>
        {abas.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={a.id === ativa} data-aba={a.id}
            className={'mc-acao' + (a.id === ativa ? ' is-ativo' : '')}
            onClick={() => onTrocar(a.id)}>
            <span className="mc-acao-rotulo">{a.rotulo}</span>
            {a.alerta && <span className="form-aba-alerta" aria-label="Falta preencher" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function useAbaDoFormulario(ids) {
  const lista = Array.isArray(ids) ? ids : [];
  const [ativa, setAtiva] = React.useState(lista[0] || null);
  const valida = lista.includes(ativa) ? ativa : (lista[0] || null);
  return [valida, setAtiva];
}

Object.assign(window, { AbasDoFormulario, useAbaDoFormulario });
