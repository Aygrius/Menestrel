/* ============================================================
   contas.jsx — [Contas] os tipos de conta, só para o Imperador
   ============================================================
   Pedido do usuário em 15/11/2026: "Teremos 4 tipos de conta em nosso
   sistema. A minha, que será denominada com a nomenclatura Imperador [...]
   Plebeu [...] Conselheiro [...] Nobre". O pagamento fica suspenso até haver
   um ("O sistema de pagamento ficará suspenso até criarmos um"), então quem
   promove é o Imperador, por esta janela — e o Nobre, que é mensal, ganha
   uma VALIDADE: vencida, a conta vale Plebeu sozinha (conta_efetiva, no
   banco). Abre pelas Configurações, como Testes de combate e Imagens.

   O banco decide e esta janela só pergunta: admin_listar_contas e
   admin_definir_conta recusam quem não é o Imperador (eh_admin), e o gatilho
   de profiles não deixa ninguém mudar o próprio tipo
   (scripts/sql/tipos-de-conta-e-forum-2026-11-15.sql).

   Escolher grava na hora, como a pílula das Configurações: não há rodapé
   nem "Salvar".
   ============================================================ */

const { useState: useStateContas, useEffect: useEffectContas, useMemo: useMemoContas } = React;

/* O que cada tipo pode — a frase do placar e da dica. */
const TIPOS_DE_CONTA = [
  { id: 'plebeu',      pt: 'Plebeu',      en: 'Commoner',
    frasePt: 'Gratuita. Sempre jogador, 1 personagem.', fraseEn: 'Free. Always a player, 1 character.' },
  { id: 'nobre',       pt: 'Nobre',       en: 'Noble',
    frasePt: 'Mensal. 1 história e 4 personagens, até a validade.', fraseEn: 'Monthly. 1 story and 4 characters, until it expires.' },
  { id: 'conselheiro', pt: 'Conselheiro', en: 'Counselor',
    frasePt: 'Vitalícia. Histórias e personagens sem limite.', fraseEn: 'Lifetime. Unlimited stories and characters.' },
];
const NOME_DA_CONTA = { imperador: ['Imperador', 'Emperor'], plebeu: ['Plebeu', 'Commoner'], nobre: ['Nobre', 'Noble'], conselheiro: ['Conselheiro', 'Counselor'] };
const nomeDaConta = (tipo, en) => (NOME_DA_CONTA[tipo] || NOME_DA_CONTA.plebeu)[en ? 1 : 0];

/* A recusa do banco, dita para quem clicou. */
const MOTIVO_CONTA = {
  sem_permissao: ['Só o Imperador muda contas.', 'Only the Emperor changes accounts.'],
  tipo_invalido: ['Tipo de conta desconhecido.', 'Unknown account type.'],
  validade_obrigatoria: ['O Nobre precisa de uma validade no futuro.', 'A Noble needs a future expiry date.'],
  conta_do_imperador: ['A conta do Imperador não muda por aqui.', "The Emperor's account can't change here."],
  usuario_nao_encontrado: ['Conta não encontrada.', 'Account not found.'],
};

// "2026-12-15" ↔ timestamptz: a validade vale até o fim do dia escolhido.
const contaDiaParaIso = (dia) => {
  const [a, m, d] = String(dia || '').split('-').map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d, 23, 59, 59).toISOString();
};
const contaIsoParaDia = (iso) => {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};
const contaDaquiA = (dias) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + dias);
  return contaIsoParaDia(dt.toISOString());
};
const contaSemAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function ContasModal({ lang = 'pt', onClose }) {
  const en = lang === 'en';
  const Janela = (typeof ModalShell === 'function' ? ModalShell : window.ModalShell);
  const [contas, setContas] = useStateContas(null);     // null = carregando
  const [erro, setErro] = useStateContas(null);
  const [busca, setBusca] = useStateContas('');
  const [gravando, setGravando] = useStateContas(null);  // id da conta
  const [recusa, setRecusa] = useStateContas({});        // id → texto

  const carregar = async () => {
    const { data, error } = await supabaseClient.rpc('admin_listar_contas');
    if (error) { console.error('[contas] não carregou:', error); setErro(error.message || String(error)); setContas([]); return; }
    setErro(null);
    setContas(data || []);
  };
  useEffectContas(() => { carregar(); }, []);

  const definir = async (conta, tipo, dia) => {
    const validade = tipo === 'nobre' ? contaDiaParaIso(dia) : null;
    setGravando(conta.id);
    setRecusa((r) => ({ ...r, [conta.id]: null }));
    const { data, error } = await supabaseClient.rpc('admin_definir_conta',
      { p_user_id: conta.id, p_tipo: tipo, p_valida_ate: validade });
    setGravando(null);
    if (error || !data || data.ok === false) {
      const motivo = (data && data.motivo) || null;
      const texto = (MOTIVO_CONTA[motivo] || [error ? error.message : 'Não gravou.', error ? error.message : 'Not saved.'])[en ? 1 : 0];
      setRecusa((r) => ({ ...r, [conta.id]: texto }));
      return;
    }
    await carregar();
  };

  const q = contaSemAcento(busca.trim());
  const visiveis = useMemoContas(() => (contas || []).filter((c) => (
    !q || contaSemAcento(c.nome).includes(q) || contaSemAcento(c.email).includes(q)
  )), [contas, q]);

  // O placar conta pela conta que VALE agora (o Nobre vencido conta Plebeu).
  const conta = (tipo) => (contas || []).filter((c) => c.conta_efetiva === tipo).length;
  const vencidos = (contas || []).filter((c) => c.tipo_conta === 'nobre' && c.conta_efetiva === 'plebeu').length;
  const hojeDia = contaIsoParaDia(new Date().toISOString());
  const fmtDia = (iso) => {
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString(en ? 'en-US' : 'pt-BR');
  };

  const linhaDe = (c) => {
    const ehImperador = c.conta_efetiva === 'imperador';
    const ocupada = gravando === c.id;
    const venceu = c.tipo_conta === 'nobre' && c.conta_efetiva === 'plebeu';
    const diaAtual = contaIsoParaDia(c.conta_valida_ate);
    return (
      <div className={'mn-quadro-linha contas-linha' + (ocupada ? ' is-gravando' : '')} key={c.id} role="row">
        <div className="contas-quem" role="cell">
          <span className="contas-nome">{c.nome || c.email}</span>
          {c.nome && <span className="contas-email">{c.email}</span>}
        </div>
        <div className="contas-tipo" role="cell">
          {ehImperador ? (
            <span className="contas-imperador">{nomeDaConta('imperador', en)}</span>
          ) : (
            <div className="fp-pop-stepper estoque-sim-nao cfg-pilula contas-pilula" role="radiogroup"
              aria-label={(en ? 'Account type of ' : 'Tipo da conta de ') + (c.nome || c.email)}>
              {TIPOS_DE_CONTA.map((t) => {
                const marcada = c.tipo_conta === t.id;
                return (
                  <button key={t.id} type="button" role="radio" aria-checked={marcada} disabled={ocupada}
                    className={'estoque-sim-nao-op' + (marcada ? ' is-on' : '')}
                    onClick={() => {
                      if (marcada) return;
                      // Virando Nobre: a validade que já tinha, se ainda vale; senão, 30 dias.
                      const dia = t.id === 'nobre' ? (diaAtual && diaAtual >= hojeDia ? diaAtual : contaDaquiA(30)) : null;
                      definir(c, t.id, dia);
                    }}>
                    {en ? t.en : t.pt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="contas-validade" role="cell">
          {c.tipo_conta === 'nobre' && !ehImperador ? (
            <label className={'contas-dia' + (venceu ? ' is-vencida' : '')}>
              <span className="mn-so-leitor">{en ? 'Valid until' : 'Vale até'}</span>
              <input type="date" value={diaAtual} min={hojeDia} disabled={ocupada}
                onChange={(e) => { if (e.target.value) definir(c, 'nobre', e.target.value); }} />
              {venceu && <span className="contas-venceu">{en ? 'Expired ' : 'Venceu em '}{fmtDia(c.conta_valida_ate)}</span>}
            </label>
          ) : <span className="contas-sem" aria-hidden="true">—</span>}
        </div>
        <span className="mn-quadro-num contas-num" role="cell">{c.personagens}</span>
        <span className="mn-quadro-num contas-num" role="cell">{c.historias}</span>
        {recusa[c.id] && <p className="contas-recusa" role="alert">{recusa[c.id]}</p>}
      </div>
    );
  };

  return (
    <Janela title={en ? 'Accounts' : 'Contas'} lang={lang} size="full" extraClass="contas-modal" onClose={onClose}>
      <div className="contas">
        <div className="mn-passe mn-passe--igual contas-placar">
          {TIPOS_DE_CONTA.map((t) => (
            <div className="mn-celula" key={t.id}>
              <span className="mn-rotulo">{en ? t.en : t.pt}</span>
              <span className="mn-celula-valor">{contas ? conta(t.id) : '—'}</span>
            </div>
          ))}
          <div className="mn-celula">
            <span className="mn-rotulo">{en ? 'Expired Nobles' : 'Nobres vencidos'}</span>
            <span className={'mn-celula-valor' + (vencidos ? ' mn-celula-valor--alerta' : '')}>{contas ? vencidos : '—'}</span>
          </div>
        </div>

        <div className="contas-barra">
          <span className="best-search">
            <i className="ti ti-eye busca-ic" aria-hidden="true" />
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder={en ? 'Search' : 'Buscar'}
              aria-label={en ? 'Search accounts' : 'Buscar contas'} />
          </span>
        </div>

        {erro ? (
          <p className="contas-aviso is-erro" role="alert">{en ? 'Could not load the accounts. ' : 'Não foi possível carregar as contas. '}{erro}</p>
        ) : contas === null ? (
          <p className="contas-aviso">{en ? 'Loading accounts…' : 'Carregando as contas…'}</p>
        ) : (
          <div className="mn-quadro">
            <div className="mn-quadro-grupo" role="table" aria-label={en ? 'Accounts' : 'Contas'}>
              <div className="mn-quadro-cabeca contas-linha contas-cabeca" role="row">
                <span className="mn-rotulo" role="columnheader">{en ? 'Account' : 'Conta'}</span>
                <span className="mn-rotulo" role="columnheader">{en ? 'Type' : 'Tipo'}</span>
                <span className="mn-rotulo" role="columnheader">{en ? 'Valid until' : 'Vale até'}</span>
                <span className="mn-rotulo contas-num" role="columnheader">{en ? 'Characters' : 'Personagens'}</span>
                <span className="mn-rotulo contas-num" role="columnheader">{en ? 'Stories' : 'Histórias'}</span>
              </div>
              {visiveis.map(linhaDe)}
              {visiveis.length === 0 && (
                <p className="contas-aviso">{q
                  ? (en ? `No account with “${busca.trim()}”.` : `Nenhuma conta com “${busca.trim()}”.`)
                  : (en ? 'No accounts yet.' : 'Nenhuma conta ainda.')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Janela>
  );
}

Object.assign(window, { ContasModal, TIPOS_DE_CONTA, nomeDaConta, contaDiaParaIso, contaIsoParaDia });
