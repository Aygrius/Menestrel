/* ============================================================
   ATALHOS DA FICHA — Habilidade, Magia e Item flutuantes
   ============================================================
   "Assim como hoje existe um ícone flutuante de dado, tenha ícones de
   habilidade, magia, item. Quase como um atalho." (usuário, 12/09/2026)

   Por que existe: as janelas de usar habilidade (HabilidadeDetalhesModal) e
   de evocar magia (MagiaDetalhesModal) estavam prontas na ficha, mas NADA as
   abria — o card lateral que as chamava saiu num redesenho antigo, e o que
   sobrou foi código morto. Fora de combate o jogador não tinha onde clicar.

   Os botões empilham na coluna direita, abaixo dos dados e da música
   (top 16 → D20, 76 → D10, 136 → música, 196 em diante → estes). Cada um abre
   uma lista com busca, à esquerda do botão; escolher uma linha fecha a lista
   e entrega a chave para a ficha, que abre a janela que já existia. Nenhuma
   regra de jogo mora aqui: este componente só escolhe.

   Quem monta é a FichaPersonagem, e só para o DONO do personagem, nas abas
   Ficha e Informações. Nas abas Inventário e Loja não: ali o InventarioList
   tem a própria cópia do inventário e do estado, e gravar pelos dois lados
   ao mesmo tempo é a corrida que estado-handoff.test.js vigia. Em batalha a
   ficha nem está montada (FichaComBatalha troca pela tela de batalha), então
   os atalhos são, por construção, de fora de combate.
   ============================================================ */

const semAcentoAtalho = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* O item entra no atalho quando a janela dele mostraria "Usar" — a mesma
   condição do DetalhesItemModal (07-inventario): consumível, e não é peça de
   equipar, recipiente nem pergaminho de magia (esses têm ações próprias). */
function itemUsavelNoAtalho(cat) {
  if (!cat) return false;
  const consumivel = cat.grupo === 'Consumíveis' || cat.tipo === 'L';
  if (!consumivel) return false;
  if (cat.categoria_equip) return false;
  if (cat.armazena != null && Number(cat.armazena) > 0) return false;
  if (cat.magia && cat.nivel_magia != null) return false;
  // Flecha: quem gasta é o ataque com arco, não o jogador (14/09/2026).
  const _ehFlecha = (typeof window !== 'undefined' && window.ehFlecha) || null;
  if (_ehFlecha && _ehFlecha(cat)) return false;
  return true;
}

const ATALHOS_TIPOS = [
  { id: 'habilidade', icone: 'ti-brain', pt: 'Habilidades', en: 'Skills',
    buscaPt: 'Buscar habilidade', buscaEn: 'Search skill',
    vazioPt: 'Nenhuma habilidade encontrada.', vazioEn: 'No skill found.' },
  { id: 'magia', icone: 'ti-comet', pt: 'Magias', en: 'Spells',
    buscaPt: 'Buscar magia', buscaEn: 'Search spell',
    vazioPt: 'Nenhuma magia encontrada.', vazioEn: 'No spell found.' },
  { id: 'item', icone: 'ti-flask', pt: 'Itens', en: 'Items',
    buscaPt: 'Buscar item', buscaEn: 'Search item',
    vazioPt: 'Nenhum item encontrado.', vazioEn: 'No item found.' },
];

/* Props:
   - habilidades: [{ key, nome, grupo, total }]
   - magias:      [{ key, nome, nivel }]
   - itens:       [{ id, nome, quantidade, icone }]
   - onHabilidade(key) / onMagia(key) / onItem(id)
   Lista vazia = botão não aparece (PJ sem magia não ganha um atalho morto). */
function AtalhosFicha({ lang, habilidades = [], magias = [], itens = [], onHabilidade, onMagia, onItem }) {
  const en = lang === 'en';
  const [aberto, setAberto] = React.useState(null);   // 'habilidade' | 'magia' | 'item' | null
  const [busca, setBusca] = React.useState('');
  const rootRef = React.useRef(null);
  const buscaRef = React.useRef(null);
  const [tip, abrirTip, fecharTip, manterTip] = useTooltip(60);

  const listas = { habilidade: habilidades, magia: magias, item: itens };
  const visiveis = ATALHOS_TIPOS.filter((t) => (listas[t.id] || []).length > 0);

  // Fecha no Esc e no clique fora — o mesmo trato do mini-player de música.
  React.useEffect(() => {
    if (!aberto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setAberto(null); };
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setAberto(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [aberto]);

  // Busca limpa a cada lista aberta, e o cursor já vai para ela.
  React.useEffect(() => {
    setBusca('');
    if (aberto && buscaRef.current) buscaRef.current.focus();
  }, [aberto]);

  // A lista aberta pode sumir (último item usado): fecha em vez de ficar órfã.
  React.useEffect(() => {
    if (aberto && !(listas[aberto] || []).length) setAberto(null);
  });

  if (!visiveis.length) return null;

  const alternar = (id) => { fecharTip(); setAberto((cur) => (cur === id ? null : id)); };

  const escolher = (tipo, id) => {
    setAberto(null);
    if (tipo === 'habilidade' && onHabilidade) onHabilidade(id);
    if (tipo === 'magia' && onMagia) onMagia(id);
    if (tipo === 'item' && onItem) onItem(id);
  };

  const indiceAberto = visiveis.findIndex((t) => t.id === aberto);
  const tipoAberto = indiceAberto >= 0 ? visiveis[indiceAberto] : null;

  let linhas = [];
  if (tipoAberto) {
    const termo = semAcentoAtalho(busca.trim());
    linhas = [...(listas[tipoAberto.id] || [])]
      .filter((l) => !termo || semAcentoAtalho(l.nome).includes(termo)
        || (l.grupo && semAcentoAtalho(l.grupo).includes(termo)))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'));
  }

  /* O número de cada linha vem com o NOME do que ele é (pedido do usuário,
     12/09/2026): "Total" na habilidade, "Nível" na magia, "Quantidade" no
     item. Sozinho, o número não dizia de onde vinha. */
  const metaDaLinha = (tipo, l) => {
    if (tipo === 'habilidade') return l.total != null ? { lbl: 'Total', val: l.total } : null;
    if (tipo === 'magia') return l.nivel != null ? { lbl: en ? 'Level' : 'Nível', val: l.nivel } : null;
    return l.quantidade != null ? { lbl: en ? 'Quantity' : 'Quantidade', val: l.quantidade } : null;
  };

  return (
    <div className="menestrel-ui at-root" ref={rootRef}>
      {visiveis.map((t, i) => {
        const rotulo = en ? t.en : t.pt;
        const ativo = aberto === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className={'at-fab' + (ativo ? ' is-aberto' : '')}
            style={{ '--at-i': i }}
            onClick={() => alternar(t.id)}
            aria-label={rotulo}
            aria-expanded={ativo}
            data-atalho={t.id}
            {...(ativo ? {} : propsTip(abrirTip, fecharTip, rotulo))}
          >
            <i className={'ti ' + t.icone} aria-hidden="true" />
          </button>
        );
      })}

      {tipoAberto && (
        <div className="at-panel" style={{ '--at-i': indiceAberto }} role="dialog"
          aria-label={en ? tipoAberto.en : tipoAberto.pt}>
          <div className="at-panel-head">
            <i className={'ti ' + tipoAberto.icone} aria-hidden="true" />
            <span className="at-panel-titulo">{en ? tipoAberto.en : tipoAberto.pt}</span>
            <span className="at-panel-conta">{(listas[tipoAberto.id] || []).length}</span>
          </div>
          <input
            ref={buscaRef}
            type="text"
            className="at-busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={en ? tipoAberto.buscaEn : tipoAberto.buscaPt}
            aria-label={en ? tipoAberto.buscaEn : tipoAberto.buscaPt}
          />
          <div className="at-lista" role="list">
            {linhas.length === 0 ? (
              <p className="at-vazio">{en ? tipoAberto.vazioEn : tipoAberto.vazioPt}</p>
            ) : linhas.map((l) => {
              const id = tipoAberto.id === 'item' ? l.id : l.key;
              const meta = metaDaLinha(tipoAberto.id, l);
              return (
                <button key={id} type="button" role="listitem" className="at-linha"
                  onClick={() => escolher(tipoAberto.id, id)}>
                  {tipoAberto.id === 'item' && (
                    <i className={'ti ' + (l.icone || 'ti-box') + ' at-linha-ic'} aria-hidden="true" />
                  )}
                  {/* Só o nome: o grupo embaixo era ruído (pedido do usuário,
                      12/09/2026). A busca continua casando pelo grupo. */}
                  <span className="at-linha-texto">
                    <span className="at-linha-nome">{l.nome}</span>
                  </span>
                  {meta && (
                    <span className="at-linha-meta">
                      <span className="at-linha-meta-lbl">{meta.lbl}</span>
                      <span className="at-linha-meta-val">{meta.val}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />
    </div>
  );
}

Object.assign(window, { AtalhosFicha, itemUsavelNoAtalho });
