/* ============================================================
   PAINEL-MODAL — as ferramentas do catálogo viram botão + janela
   ============================================================
   "Temos 'verificação do catálogo', 'sugestões', etc, ao invés de usarmos um
   texto expansível, eu quero botões ao lado de 'novo' no topo, para abrir um
   modal com as sugestões, etc." (usuário, 14/09/2026)

   Até aqui cada painel (Verificação, Sugestões, Estudo) era uma faixa
   recolhível entre o cabeçalho e a tabela. Agora é um botão pequeno no
   cabeçalho, ao lado do +, e o conteúdo abre numa janela.

   O botão guarda o que a faixa fechada mostrava sem abrir: o alerta. Painel
   com problema (magia quebrada, técnica divergente) ganha a borda vermelha e
   um ponto — é a única informação que não pode esperar o clique.

   A janela usa as classes ms-* do ModalShell montadas à mão, como a
   MagiaDetalhesModal da ficha: este arquivo carrega ANTES do shell.jsx (ver
   main.tsx) e os testes dos painéis não montam o shell. E vai por PORTAL para
   #root: o cabeçalho das listas é .fp-card-top, e a regra
   `.fp-card-top .ms-header` vazaria para o cabeçalho da janela.
   ============================================================ */

/* Sem ícone no botão, só o texto, e com tooltip — o título completo da janela
   (pedido do usuário, 14/09/2026). */
function BestPainelModal({ lang, rotulo, titulo, alerta, aberto, onAbrir, onFechar, acoesTopo, children }) {
  const en = lang === 'en';
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);
  const fecharRef = React.useRef(onFechar);
  React.useEffect(() => { fecharRef.current = onFechar; }, [onFechar]);

  // Escape fecha e o fundo não rola — o mesmo trato do ModalShell.
  React.useEffect(() => {
    if (!aberto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && fecharRef.current) fecharRef.current(); };
    window.addEventListener('keydown', onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = antes; };
  }, [aberto]);

  const alvo = (typeof document !== 'undefined') && (document.getElementById('root') || document.body);

  return (
    <div className={'best-painel-botao' + (alerta ? ' com-problema' : '')}>
      <button type="button" className="btn-ghost btn-sm best-painel-abrir"
        aria-haspopup="dialog" aria-expanded={!!aberto}
        onClick={() => { fecharTip(); onAbrir(); }}
        {...propsTip(abrirTip, fecharTip, titulo)}>
        {rotulo}
        {alerta && <span className="best-painel-alerta" aria-label={en ? 'needs attention' : 'precisa de atenção'} />}
      </button>
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
      {aberto && alvo && ReactDOM.createPortal(
        <div className="menestrel-ui ms-backdrop">
          <div className="ms-modal ms-lg modal-best-painel" role="dialog" aria-modal="true" aria-label={titulo}>
            <div className="ms-header">
              <h3 className="ms-title">{titulo}</h3>
              {acoesTopo && <div className="ms-header-extra">{acoesTopo}</div>}
              <button type="button" className="ms-close" onClick={onFechar} aria-label={en ? 'Close' : 'Fechar'}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="ms-body">{children}</div>
          </div>
        </div>,
        alvo
      )}
    </div>
  );
}

Object.assign(window, { BestPainelModal });
