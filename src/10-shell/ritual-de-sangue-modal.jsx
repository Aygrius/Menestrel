/* ============================================================
   RITUAL DE SANGUE — a janela do Mestre (07/11/2026)
   ============================================================
   "Ao usar a magia, vai aparecer um modal para o mestre selecionar qual
   habilidade, magia ou técnica e o estágio que o evocador vai usar
   temporariamente, de acordo com a descrição da magia 'Ritual de Sangue'."
   (usuário)

   Abre em dois lugares: na ficha, quando quem evoca é o próprio Mestre; e na
   fila de aprovação (Central de Mensagens), quando o jogador evoca e o pedido
   chega ao Mestre. O catálogo é o do sistema inteiro (decisão do usuário: as
   criaturas guardam o que sabem como texto livre).

   O estágio vai até o nível evocado ("Rouba conhecimentos até nível N"):
   magia em 1, 3, 5, 7, 9; habilidade e técnica de 1 em 1 (ver
   niveisDoRitualDeSangue, 01-core/ritual-de-sangue.jsx).

   Não grava nada: devolve { tipo, key, nome, nivel, alvo } em onConfirmar, e
   quem abriu grava no evocador (comConhecimentoRoubado).
   ============================================================ */

const { useState, useEffect } = React;

const RS_TIPOS = [
  { id: 'habilidade', tabela: 'habilidades', pt: 'Habilidade', en: 'Skill', icone: 'ti-target-arrow' },
  { id: 'magia', tabela: 'magias', pt: 'Magia', en: 'Spell', icone: 'ti-sparkles' },
  { id: 'tecnica', tabela: 'tecnicas', pt: 'Técnica', en: 'Technique', icone: 'ti-sword' },
];
const RS_POR_PAGINA = 8;

function RitualDeSangueModal({ lang = 'pt', conjurador = '', nivelEvocado = 1, alvoInicial = '', onConfirmar, onClose }) {
  const en = lang === 'en';
  const [tipo, setTipo] = useState('habilidade');
  const [catalogo, setCatalogo] = useState({});   // { habilidade: [...], magia: [...], tecnica: [...] }
  const [erroCarga, setErroCarga] = useState(null);
  const [busca, setBusca] = useState('');
  const [folha, setFolha] = useState(1);
  const [escolhido, setEscolhido] = useState(null);  // { tipo, key, nome }
  const [nivel, setNivel] = useState(1);
  const [alvo, setAlvo] = useState(alvoInicial || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const res = await Promise.all(RS_TIPOS.map((t) => supabaseClient.from(t.tabela).select('key, nome').order('nome')));
      if (!vivo) return;
      const falha = res.find((r) => r.error);
      if (falha) { setErroCarga(falha.error.message || String(falha.error)); return; }
      const out = {};
      RS_TIPOS.forEach((t, i) => { out[t.id] = res[i].data || []; });
      setCatalogo(out);
    })();
    return () => { vivo = false; };
  }, []);

  const niveis = (window.niveisDoRitualDeSangue || ((_, n) => [n]))(tipo, nivelEvocado);
  const nivelOk = niveis.includes(nivel) ? nivel : niveis[niveis.length - 1];
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const termo = semAcento(busca.trim());
  const lista = (catalogo[tipo] || []).filter((x) => !termo || semAcento(x.nome).includes(termo));
  const folhas = Math.max(1, Math.ceil(lista.length / RS_POR_PAGINA));
  const folhaOk = Math.min(folha, folhas);
  const visiveis = lista.slice((folhaOk - 1) * RS_POR_PAGINA, folhaOk * RS_POR_PAGINA);
  const trocarTipo = (t) => { setTipo(t); setFolha(1); setEscolhido(null); setNivel(1); };

  const confirmar = async () => {
    if (!escolhido || salvando) return;
    setSalvando(true); setErro(null);
    try {
      await onConfirmar({ tipo: escolhido.tipo, key: escolhido.key, nome: escolhido.nome, nivel: nivelOk, alvo: alvo.trim() || null });
    } catch (e) {
      setErro((e && e.message) || String(e));
      setSalvando(false);
    }
  };

  const Paginacao = window.BestPagination;
  const passoNivel = tipo === 'magia' ? 2 : 1;
  return (
    <ModalShell
      title={<><i className="ti ti-droplet" aria-hidden="true" /> {en ? 'Blood Ritual' : 'Ritual de Sangue'}</>}
      lang={lang} size="md" extraClass="rs-modal"
      onClose={salvando ? null : onClose}
      footerCenter={Paginacao && folhas > 1
        ? <Paginacao page={folhaOk} safePage={folhaOk} totalPages={folhas} setPage={setFolha} lang={lang} />
        : null}
      onConfirm={confirmar}
      confirmLabel={salvando ? (en ? 'Saving…' : 'Gravando…') : (en ? 'Give the knowledge' : 'Dar o conhecimento')}
      confirmDisabled={!escolhido || salvando}>
      <div className="rs-corpo">
        <p className="rs-intro">
          {en
            ? <>{conjurador ? <strong>{conjurador}</strong> : 'The caster'} cast it at level {nivelEvocado}: steals one skill, spell or technique up to level {nivelEvocado}, for ten days. Casting again removes the previous one.</>
            : <>{conjurador ? <strong>{conjurador}</strong> : 'O evocador'} evocou no nível {nivelEvocado}: rouba uma habilidade, magia ou técnica até o nível {nivelEvocado}, por dez dias. Evocar de novo remove a anterior.</>}
        </p>

        <div className="rs-seg" role="radiogroup" aria-label={en ? 'Kind of knowledge' : 'Tipo de conhecimento'}>
          {RS_TIPOS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id}
              className={'rs-seg-op' + (tipo === t.id ? ' is-on' : '')} onClick={() => trocarTipo(t.id)}>
              <i className={'ti ' + t.icone} aria-hidden="true" />
              <span>{en ? t.en : t.pt}</span>
            </button>
          ))}
        </div>

        <div className="rs-campos">
          <label className="rs-campo">
            <span className="mn-rotulo">{en ? 'Search' : 'Buscar'}</span>
            <input type="search" className="input" value={busca}
              onChange={(e) => { setBusca(e.target.value); setFolha(1); }}
              placeholder={en ? 'Name' : 'Nome'} />
          </label>
          <label className="rs-campo">
            <span className="mn-rotulo">{en ? 'Stolen from' : 'Roubado de'}</span>
            <input type="text" className="input" value={alvo} onChange={(e) => setAlvo(e.target.value)}
              placeholder={en ? 'The target (optional)' : 'O alvo (opcional)'} />
          </label>
        </div>

        {erroCarga ? <div className="err-msg">{erroCarga}</div>
          : !catalogo[tipo] ? <div className="rs-vazio">{en ? 'Loading…' : 'Carregando…'}</div>
          : visiveis.length === 0 ? <div className="rs-vazio">{en ? 'Nothing found.' : 'Nada encontrado.'}</div>
          : (
            <div className="rs-lista" role="radiogroup" aria-label={en ? 'Knowledge' : 'Conhecimento'}>
              {visiveis.map((x) => {
                const on = !!escolhido && escolhido.tipo === tipo && escolhido.key === x.key;
                return (
                  <button key={x.key} type="button" role="radio" aria-checked={on}
                    className={'rs-linha' + (on ? ' on' : '')}
                    onClick={() => setEscolhido({ tipo, key: x.key, nome: x.nome })}>
                    <span className="rs-linha-nome">{x.nome}</span>
                    <span className="part-marca" aria-hidden="true">{on && <i className="ti ti-check" />}</span>
                  </button>
                );
              })}
            </div>
          )}

        <div className="rs-nivel">
          <span className="mn-rotulo">{en ? 'Level' : 'Estágio'}</span>
          <QuantidadeStepper value={nivelOk} min={niveis[0]} max={niveis[niveis.length - 1]} step={passoNivel}
            onChange={setNivel} label={en ? 'Level' : 'Estágio'} />
        </div>
        {erro && <div className="err-msg">{erro}</div>}
      </div>
    </ModalShell>
  );
}

Object.assign(window, { RitualDeSangueModal });
