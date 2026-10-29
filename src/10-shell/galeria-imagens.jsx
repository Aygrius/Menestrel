/* ============================================================
   galeria-imagens.jsx — [Imagens] a galeria das pinturas, para o Mestre
   ============================================================
   Pedido do usuário em 25/10/2026: "Adicione a página [das pinturas] no nosso
   sistema para controle do mestre, abaixo de Paleta, chamado Imagens."

   E, em 26/10/2026, o que reorganizou esta página inteira:

     "Existe a base do item, por exemplo 'Máscara de Ouro', e existe o exemplar
      do item, 'Máscara Decorativa', 'Máscara Verrogari'."

   A versão anterior listava as pinturas com rótulos digitados à mão — e por
   isso mostrava "Máscara Decorativa" (um exemplar) no lugar de "Máscara de
   Ferro" (a base). Agora a parede inteira é desenhada a partir de
   window.BASES_ITEM (01-core/bases-item.jsx): o nome na legenda é o nome da
   base, e a pintura é a que a base aponta. Nada é digitado duas vezes.

   O resto da página sai do CATÁLOGO: o bloco "Itens sem pintura" carrega os
   itens e passa cada um por window.arteDoItem — quem volta null entra na
   lista. Item novo aparece aqui sozinho, sem ninguém atualizar nada.
   ============================================================ */

const { useState, useEffect, useMemo } = React;

/* As condições da ficha. O Peso virou barra no pé do cartão e não usa mais o
   medalhão — a pintura fica guardada. */
const GI_CONDICOES = [
  ['cond-doenca', 'Doença'], ['cond-sono', 'Sono'], ['cond-sede', 'Sede'], ['cond-fome', 'Fome'],
  ['cond-frio', 'Frio'], ['cond-calor', 'Calor'], ['cond-vicio', 'Vício'], ['cond-loucura', 'Loucura'],
  ['cond-desonra', 'Má Fama'], ['cond-pesado', 'Peso (guardada)'],
];

const GI_REGIAO_NOME = {
  cabeca: 'Cabeça', orelha: 'Orelha', rosto: 'Rosto', pescoco: 'Pescoço', ombro: 'Ombro',
  costas: 'Costas', dorso: 'Dorso', peito: 'Peito', braco: 'Braço', dedo: 'Dedo', pulso: 'Pulso',
  mao: 'Mão', perna: 'Perna', cintura: 'Cintura', canela: 'Canela', pe: 'Pé', alforje: 'Alforje',
};

const giNormal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Onde a base vive, em palavras: as regiões do corpo, ou os grupos do catálogo.
const giOnde = (base) => [
  ...(base.slots || []).map((s) => GI_REGIAO_NOME[s] || s),
  ...(base.grupos || []),
].join(' · ');

/* Uma pintura na parede: moldura quadrada, nome da BASE e o que ela cobre. */
function GiPeca({ src, nome, pe }) {
  return (
    <figure className="gi-peca">
      <span className="gi-moldura"><img src={src} alt="" loading="lazy" /></span>
      <figcaption className="gi-nome">{nome}</figcaption>
      {pe && <span className="gi-arq">{pe}</span>}
    </figure>
  );
}

function GaleriaImagensModal({ lang = 'pt', onClose }) {
  const [catalogo, setCatalogo] = useState(null);   // null = carregando
  const [busca, setBusca] = useState('');
  const [faixa, setFaixa] = useState('tudo');        // tudo | equip | itens | cond | falta

  const bases = (typeof window !== 'undefined' && window.BASES_ITEM) || [];
  const arteDaBase = (typeof window !== 'undefined' && window.arteDaBase) || (() => null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabaseClient
        .from('itens')
        .select('slug, nome, base, grupo, slot_equip, tipo_equip, categoria_equip, tipo_armadura, grupo_armas, valor_latao')
        .order('nome');
      if (!vivo) return;
      if (error) { console.error('[imagens] catálogo não carregou:', error); setCatalogo([]); return; }
      setCatalogo(data || []);
    })();
    return () => { vivo = false; };
  }, []);

  /* Cada base com as pinturas que ela aponta — a mesma consulta que a ficha,
     o inventário e a loja fazem, só que no PLURAL: a base da ARMA é o peso, e
     o tipo (espada, machado, lança, arco) vem do nome do exemplar, então três
     bases cobrem doze telas. Ver `artesDaBase` (11-ficha/ficha.jsx), pedido do
     usuário de 27/10/2026 ("fez o desenho de um machado duplo [...] mas não
     vejo ele nas imagens do sistema"). */
  const artesDaBase = (typeof window !== 'undefined' && window.artesDaBase) || null;
  const basesComArte = useMemo(
    () => bases.map((b) => {
      const telas = artesDaBase ? artesDaBase(b.slug) : [];
      const src = arteDaBase(b.slug);
      return { base: b, src: (telas[0] && telas[0].src) || src, telas: telas.length ? telas : (src ? [{ src, variante: null }] : []) };
    }),
    [bases.length],
  );

  /* Quantos itens do catálogo cada base cobre: é o que diz qual pintar antes. */
  const itensPorBase = useMemo(() => {
    const m = {};
    (catalogo || []).forEach((c) => { if (c.base) m[c.base] = (m[c.base] || 0) + 1; });
    return m;
  }, [catalogo]);

  /* O que o catálogo tem e a arte não cobre. Cada item passa pelo MESMO
     window.arteDoItem que a ficha usa; peça vestível se agrupa pela REGIÃO
     (é assim que a arte é encomendada) e o resto, pelo grupo do catálogo. */
  const semPintura = useMemo(() => {
    if (!catalogo || typeof window === 'undefined' || !window.arteDoItem) return [];
    const porGrupo = new Map();
    for (const cat of catalogo) {
      if (window.arteDoItem(cat)) continue;
      const chave = cat.slot_equip
        ? (GI_REGIAO_NOME[cat.slot_equip] || cat.slot_equip)
        : (cat.grupo || 'Outros');
      if (!porGrupo.has(chave)) porGrupo.set(chave, []);
      porGrupo.get(chave).push(cat.nome);
    }
    return [...porGrupo.entries()]
      .map(([regiao, nomes]) => ({ regiao, nomes }))
      .sort((a, b) => b.nomes.length - a.nomes.length);
  }, [catalogo]);

  // Casa com a busca? Vale para o nome da base, a família e o arquivo.
  const q = giNormal(busca.trim());
  const casa = (...partes) => !q || partes.some((p) => giNormal(p).includes(q));

  /* As famílias pintadas, na ordem do vocabulário. `equip` separa quem mora
     numa região do corpo de quem é item solto — são as duas faixas da barra. */
  const familias = useMemo(() => {
    const ordem = [];
    const porFamilia = new Map();
    basesComArte.forEach(({ base, telas }) => {
      if (!telas.length) return;
      if (!casa(base.nome, base.familia, base.slug, giOnde(base))) return;
      if (!porFamilia.has(base.familia)) { porFamilia.set(base.familia, []); ordem.push(base.familia); }
      /* Uma moldura por TELA: a base da arma pendura quatro. O nome ganha a
         variante ("Arma Pesada · Machado") para a parede dizer qual é qual. */
      telas.forEach((t) => porFamilia.get(base.familia).push({ base, src: t.src, variante: t.variante }));
    });
    return ordem.map((nome) => ({
      nome,
      pecas: porFamilia.get(nome),
      equip: (porFamilia.get(nome)[0].base.slots || []).length > 0,
    }));
  }, [basesComArte, q]);

  /* As bases que ainda não têm pintura — a encomenda seguinte do Figma, já
     com quantos itens do catálogo cada uma cobre. */
  const basesSemArte = useMemo(
    () => basesComArte
      .filter(({ base, src }) => !src && casa(base.nome, base.familia, base.slug))
      .map(({ base }) => ({ base, itens: itensPorBase[base.slug] || 0 }))
      .sort((a, b) => b.itens - a.itens),
    [basesComArte, itensPorBase, q],
  );

  const condFiltradas = GI_CONDICOES.filter(([a, n]) => casa(n, a));
  const faltaFiltrada = semPintura
    .map((g) => ({ ...g, nomes: g.nomes.filter((n) => casa(n, g.regiao)) }))
    .filter((g) => g.nomes.length);

  /* "Pintadas" conta TELAS (a arma tem quatro por base); "Bases sem arte"
     conta as bases que não têm nenhuma. Antes os dois eram a mesma conta, e
     ela parava de fechar no dia em que uma base ganhou a segunda tela. */
  const totalPintadas = basesComArte.reduce((s, x) => s + x.telas.length, 0);
  const basesPintadas = basesComArte.filter((x) => x.telas.length).length;
  const totalFalta = semPintura.reduce((s, g) => s + g.nomes.length, 0);
  const faltaAVista = faltaFiltrada.reduce((s, g) => s + g.nomes.length, 0);
  const mostra = (f) => faixa === 'tudo' || faixa === f;

  const FAIXAS = [
    ['tudo', 'Tudo'], ['equip', 'Equipáveis'], ['itens', 'Itens'],
    ['cond', 'Condições'], ['falta', 'Sem pintura'],
  ];
  const familiasAVista = familias.filter((f) => mostra(f.equip ? 'equip' : 'itens'));

  const vazio = !familiasAVista.length && !condFiltradas.length
    && !faltaFiltrada.length && !basesSemArte.length;

  return (
    <ModalShell
      title={lang === 'en' ? 'Images' : 'Imagens'}
      lang={lang}
      size="full"
      extraClass="modal-imagens"
      onClose={onClose}
    >
      <div className="gi">
        {/* ── o placar ── */}
        <div className="mn-passe mn-passe--igual gi-placar">
          <div className="mn-celula">
            <span className="mn-rotulo">Bases</span>
            <span className="mn-celula-valor">{bases.length}</span>
          </div>
          <div className="mn-celula">
            <span className="mn-rotulo">Pintadas</span>
            <span className="mn-celula-valor">{totalPintadas}</span>
          </div>
          <div className="mn-celula">
            <span className="mn-rotulo">Bases sem arte</span>
            <span className={'mn-celula-valor' + (bases.length - basesPintadas ? ' mn-celula-valor--alerta' : '')}>
              {bases.length - basesPintadas}
            </span>
          </div>
          <div className="mn-celula">
            <span className="mn-rotulo">Condições</span>
            <span className="mn-celula-valor">{GI_CONDICOES.length}</span>
          </div>
          <div className="mn-celula">
            <span className="mn-rotulo">Itens sem pintura</span>
            <span className={'mn-celula-valor' + (totalFalta ? ' mn-celula-valor--alerta' : '')}>
              {catalogo ? totalFalta : '—'}
            </span>
          </div>
        </div>

        <p className="gi-intro">
          Cada pintura é de uma <b>base</b>, não de um item: "Máscara de Ferro" é uma imagem
          só, valha ela para a Máscara Decorativa ou para a Máscara Verrogari. O nome do item
          é o <b>exemplar</b>; a base é o que ele é — e é ela, escolhida no editor do item,
          que decide a pintura.
        </p>

        {/* ── busca e faixas ── */}
        <div className="gi-barra">
          <span className="best-search">
            <input
              type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder={lang === 'en' ? 'Search a base…' : 'Procurar uma base…'}
              aria-label={lang === 'en' ? 'Search bases' : 'Procurar bases'}
            />
          </span>
          <div className="best-chips" role="group" aria-label="Faixa">
            {FAIXAS.map(([id, rotulo]) => (
              <button
                key={id} type="button"
                className={'best-chip gi-chip' + (faixa === id ? ' is-active' : '')}
                aria-pressed={faixa === id}
                onClick={() => setFaixa(id)}
              >{rotulo}</button>
            ))}
          </div>
        </div>

        {vazio && (
          <p className="gi-nada">
            {busca.trim()
              ? <>Nenhuma base com <b>{busca.trim()}</b>.</>
              : 'Nada nesta faixa.'}
          </p>
        )}

        {/* ── as famílias pintadas ── */}
        {familiasAVista.map(({ nome, pecas }) => (
          <section className="gi-sec" key={nome}>
            <div className="mn-quadro-cabeca">
              <h3 className="gi-sec-titulo">{nome}</h3>
              {/* A conta é de TELAS penduradas, não de bases: a família Arma
                  tem três bases e doze pinturas (27/10/2026). */}
              <span className="gi-conta">{pecas.length} {pecas.length === 1 ? 'pintura' : 'pinturas'}</span>
            </div>
            <div className="gi-grade">
              {pecas.map(({ base, src, variante }) => (
                <GiPeca key={base.slug + (variante || '')} src={src}
                  nome={variante ? `${base.nome} · ${variante}` : base.nome}
                  pe={itensPorBase[base.slug]
                    ? `${itensPorBase[base.slug]} ${itensPorBase[base.slug] === 1 ? 'item' : 'itens'}`
                    : giOnde(base)} />
              ))}
            </div>
          </section>
        ))}

        {/* ── condições ── */}
        {mostra('cond') && condFiltradas.length > 0 && (
          <section className="gi-sec">
            <div className="mn-quadro-cabeca">
              <h3 className="gi-sec-titulo">Condições</h3>
              <span className="gi-conta">{condFiltradas.length} pinturas</span>
            </div>
            <div className="gi-grade">
              {condFiltradas.map(([arq, nome]) => (
                <GiPeca key={arq} src={'/cond/' + arq + '.webp'} nome={nome} />
              ))}
            </div>
          </section>
        )}

        {/* ── bases sem pintura: a próxima encomenda ── */}
        {mostra('falta') && basesSemArte.length > 0 && (
          <section className="gi-sec">
            <div className="mn-quadro-cabeca">
              <h3 className="gi-sec-titulo">Bases sem pintura</h3>
              <span className="gi-conta">{basesSemArte.length} bases</span>
            </div>
            <p className="gi-sec-nota">
              A base já classifica o item; a casa mostra o glifo da região até alguém pintar.
              Ordenadas por <b>quantos itens do catálogo</b> cada uma cobre — quem cobre mais,
              aparece mais na mesa.
            </p>
            <div className="gi-falta">
              {basesSemArte.map(({ base, itens }) => (
                <div className="mn-quadro-linha gi-base-linha" key={base.slug}>
                  <span className="gi-base-nome">{base.nome}</span>
                  <span className="gi-base-onde">{giOnde(base)}</span>
                  <span className={'mn-quadro-num' + (itens ? ' gi-base-num' : '')}>{itens || '—'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── itens do catálogo que ainda caem no glifo ── */}
        {mostra('falta') && (
          <section className="gi-sec">
            <div className="mn-quadro-cabeca">
              <h3 className="gi-sec-titulo">Itens sem pintura</h3>
              <span className="gi-conta">
                {catalogo ? faltaAVista + (faltaAVista === 1 ? ' item' : ' itens') : 'carregando…'}
              </span>
            </div>
            <p className="gi-sec-nota">
              Sem base escolhida, ou com uma base que ainda não foi pintada. Sai do próprio
              catálogo: item novo aparece aqui sozinho.
            </p>
            {catalogo && faltaFiltrada.length === 0 && (
              <p className="gi-nada">
                {busca.trim()
                  ? <>Nenhum item sem pintura com <b>{busca.trim()}</b>.</>
                  : 'Nenhum item do catálogo está sem pintura.'}
              </p>
            )}
            <div className="gi-falta">
              {faltaFiltrada.map((g) => (
                <div className="mn-quadro-linha gi-falta-linha" key={g.regiao}>
                  <span className="gi-falta-regiao">{g.regiao}</span>
                  <span className="gi-falta-nomes">
                    {g.nomes.slice(0, 10).join(' · ')}
                    {g.nomes.length > 10 && <i> · e mais {g.nomes.length - 10}</i>}
                  </span>
                  <span className="mn-quadro-num gi-falta-num">{g.nomes.length}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="gi-rodape">
          O vocabulário das bases vive em <code>src/01-core/bases-item.jsx</code> e cada item
          guarda a sua em <code>itens.base</code>, escolhida no editor. Os arquivos ficam em
          {' '}<code>public/equip/</code>, <code>public/itens/</code> e <code>public/cond/</code>;
          a pauta do Figma, em <code>.impeccable/arte-equipamentos.md</code>.
        </p>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { GaleriaImagensModal });
