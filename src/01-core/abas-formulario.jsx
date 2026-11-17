/* ============================================================
   abas-formulario.jsx — as abas dos editores longos (17/11/2026)
   ============================================================
   Usuário: "Crie abas para preenchimento organizado de todas as páginas de
   compêndio e ambientação." Os editores do Compêndio (CatalogoEditor), das
   Entidades e dos Grupos (EditorMundo) e de Reinos, Cidades, Locais e
   Pessoas (LoreEntradaForm) eram uma coluna só, longa, rolando por baixo do
   título. Agora cada um divide os campos em abas.

   A pele é a pílula segmentada do sistema (.nb-paginas / .nb-pagina-op, a
   das abas do Livro inicial), com a lâmina (10-shell): .form-abas é trilho,
   a aba aberta é .is-on. Fica presa no alto do corpo da janela enquanto ele
   rola. A aba com campo obrigatório vazio leva o ponto de brasa — o Salvar
   fica apagado, e o ponto diz onde está o que falta.

   AbasDoFormulario({ abas: [{ id, rotulo, alerta? }], ativa, onTrocar, rotulo })
   useAbaDoFormulario(ids) → [ativa, setAtiva]: começa na primeira e volta a
   ela se a aba aberta deixar de existir (trocar o tipo do lugar, por exemplo).
   ============================================================ */

function AbasDoFormulario({ abas, ativa, onTrocar, rotulo = 'Seções' }) {
  if (!Array.isArray(abas) || abas.length < 2) return null;
  return (
    <div className="nb-paginas form-abas" role="tablist" aria-label={rotulo}
      style={{ gridTemplateColumns: `repeat(${abas.length}, minmax(0, 1fr))` }}>
      {abas.map((a) => (
        <button key={a.id} type="button" role="tab" aria-selected={a.id === ativa} data-aba={a.id}
          className={'nb-pagina-op' + (a.id === ativa ? ' is-on' : '')}
          onClick={() => onTrocar(a.id)}>
          <span className="form-aba-rotulo">{a.rotulo}</span>
          {a.alerta && <span className="form-aba-alerta" aria-label="Falta preencher" />}
        </button>
      ))}
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
