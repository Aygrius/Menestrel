/* ============================================================
   AMIGOS DA FICHA — pacto de amizade e os cards dos amigos
   ============================================================
   "Parecido com os botões flutuantes de dados, habilidades, à direita, vamos
   adicionar botões com o avatar dos outros personagens de jogadores à
   esquerda, mas só vai aparecer dos personagens que fizeram um pacto de
   amizade, para isso, adicione um botão com ícone heart-handshake para selar
   o pacto de amizade. Agora, para transferir um item para um amigo, só
   precisa arrastar o item do inventário para o card do amigo." (usuário,
   28/09/2026)

   A coluna mora na borda ESQUERDA, logo depois da sidebar: primeiro o botão
   do pacto, embaixo um card redondo por amigo. O pacto é dos DOIS: um propõe,
   o outro aceita (tabela pactos_amizade, RPCs listar_amizades / propor_pacto /
   desfazer_pacto — scripts/sql/pacto-amizade-2026-09-28.sql).

   O card do amigo é destino de arraste: leva data-amigo-pj-id, que o arraste
   do inventário (InvItemsTable, 07-inventario) procura sob o ponteiro e acende
   com .is-alvo. Nenhuma regra de transferência mora aqui.

   Quem monta é a FichaPersonagem, só para o DONO do personagem.
   ============================================================ */

const AMIGOS_INTERVALO_MS = 30000;   // proposta nova de outro jogador aparece sozinha

function nomeCompletoAmigo(p) {
  return [p && p.nome, p && p.sobrenome].filter(Boolean).join(' ');
}

function AvatarAmigo({ p, className }) {
  const nome = nomeCompletoAmigo(p);
  return p && p.foto_url
    ? <img className={className} src={p.foto_url} alt="" draggable={false} />
    : <span className={className + ' amg-avatar--vazio'} aria-hidden="true">{(nome || '?').trim().slice(0, 1).toUpperCase()}</span>;
}

function AmigosFab({ lang, pjId }) {
  const en = lang === 'en';
  const [lista, setLista] = React.useState([]);
  const [aberto, setAberto] = React.useState(false);
  const [ocupado, setOcupado] = React.useState(null);   // id do PJ com ação em curso
  const [erro, setErro] = React.useState(null);
  const rootRef = React.useRef(null);
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);

  const carregar = React.useCallback(async () => {
    if (!pjId) { setLista([]); return; }
    const { data, error } = await supabaseClient.rpc('listar_amizades', { p_pj_id: pjId });
    if (!error) setLista(data || []);
  }, [pjId]);

  React.useEffect(() => {
    carregar();
    const t = setInterval(carregar, AMIGOS_INTERVALO_MS);
    return () => clearInterval(t);
  }, [carregar]);

  // Abrir o painel relê — a lista pode ter mudado do outro lado.
  React.useEffect(() => { if (aberto) { setErro(null); carregar(); } }, [aberto, carregar]);

  // Esc e clique fora fecham, como nos atalhos da direita.
  React.useEffect(() => {
    if (!aberto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setAberto(false); };
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setAberto(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [aberto]);

  const agir = async (rpc, outroId) => {
    setOcupado(outroId); setErro(null);
    const { data, error } = await supabaseClient.rpc(rpc, { p_pj_id: pjId, p_outro_id: outroId });
    setOcupado(null);
    if (error || !data || !data.ok) {
      setErro(en ? 'Could not update the pact. Try again.' : 'Não foi possível atualizar o pacto. Tente de novo.');
      return;
    }
    carregar();
  };

  const amigos = lista.filter((p) => p.estado === 'selado');
  const pedidos = lista.filter((p) => p.estado === 'recebido').length;
  // Sem ninguém na história para fazer pacto, a coluna nem aparece.
  if (!lista.length) return null;

  const rotuloPacto = en ? 'Friendship pacts' : 'Pactos de amizade';

  const acoesDe = (p) => {
    const esp = ocupado === p.id;
    if (p.estado === 'selado') {
      return (
        <button type="button" className="amg-acao amg-acao--sec" disabled={esp}
          onClick={() => agir('desfazer_pacto', p.id)}>{en ? 'Break' : 'Romper'}</button>
      );
    }
    if (p.estado === 'recebido') {
      return (
        <>
          <button type="button" className="amg-acao amg-acao--sec" disabled={esp}
            onClick={() => agir('desfazer_pacto', p.id)}>{en ? 'Decline' : 'Recusar'}</button>
          <button type="button" className="amg-acao" disabled={esp}
            onClick={() => agir('propor_pacto', p.id)}>{en ? 'Accept' : 'Aceitar'}</button>
        </>
      );
    }
    if (p.estado === 'enviado') {
      return (
        /* Proposta enviada: o mesmo ícone, cinza, no lugar de "Cancelar"
           (28/09/2026). Clicar nele retira a proposta. */
        <button type="button" className="amg-acao amg-acao--ic amg-acao--pendente" disabled={esp}
          aria-label={en ? 'Cancel pact offer' : 'Cancelar proposta de pacto'}
          onClick={() => agir('desfazer_pacto', p.id)}>
          <i className="ti ti-heart-handshake" aria-hidden="true" />
        </button>
      );
    }
    return (
      /* O ícone do menu no lugar do texto (28/09/2026: "Ao invés de escrever
         'selar pacto' use o ícone do menu"). O nome fica no aria-label. */
      <button type="button" className="amg-acao amg-acao--ic" disabled={esp}
        aria-label={en ? 'Seal pact' : 'Selar pacto'}
        onClick={() => agir('propor_pacto', p.id)}>
        <i className="ti ti-heart-handshake" aria-hidden="true" />
      </button>
    );
  };

  const estadoTexto = (p) => ({
    selado:   en ? 'Friends' : 'Amigos',
    recebido: en ? 'Offers you a pact' : 'Propõe um pacto',
    enviado:  en ? 'Waiting for an answer' : 'Aguardando resposta',
    nenhum:   null,
  })[p.estado];

  return (
    <div className="menestrel-ui amg-root" ref={rootRef}>
      <button type="button" className={'amg-fab' + (aberto ? ' is-aberto' : '')}
        onClick={() => { fecharTip(); setAberto((v) => !v); }}
        aria-label={rotuloPacto} aria-expanded={aberto}
        {...(aberto ? {} : propsTip(abrirTip, fecharTip, rotuloPacto))}>
        <i className="ti ti-heart-handshake" aria-hidden="true" />
        {pedidos > 0 && <span className="amg-badge" aria-label={en ? `${pedidos} pending` : `${pedidos} pendente(s)`}>{pedidos}</span>}
      </button>

      {amigos.map((p, i) => {
        const nome = nomeCompletoAmigo(p);
        return (
          <div key={p.id} className="amg-amigo" style={{ '--amg-i': i + 1 }}
            data-amigo-pj-id={p.id} role="img" aria-label={nome} tabIndex={0}
            {...propsTip(abrirTip, fecharTip, {
              title: nome,
              desc: en ? 'Drag an item from your inventory here to send it.' : 'Arraste um item do inventário até aqui para enviar.',
            })}>
            <AvatarAmigo p={p} className="amg-avatar" />
          </div>
        );
      })}

      {aberto && (
        <div className="amg-panel" role="dialog" aria-label={rotuloPacto}>
          <div className="amg-lista" role="list">
            {lista.map((p) => (
              <div key={p.id} className="amg-linha" role="listitem">
                <AvatarAmigo p={p} className="amg-linha-foto" />
                <span className="amg-linha-texto">
                  <span className="amg-linha-nome">{nomeCompletoAmigo(p)}</span>
                  {estadoTexto(p) && <span className={'amg-linha-estado amg-linha-estado--' + p.estado}>{estadoTexto(p)}</span>}
                </span>
                <span className="amg-linha-acoes">{acoesDe(p)}</span>
              </div>
            ))}
          </div>
          {erro && <p className="amg-erro" role="alert">{erro}</p>}
        </div>
      )}
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

Object.assign(window, { AmigosFab });
