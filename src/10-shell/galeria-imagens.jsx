/* ============================================================
   galeria-imagens.jsx — [Imagens] a galeria das pinturas, para o Mestre
   ============================================================
   Pedido do usuário em 25/10/2026: "Adicione a página [das pinturas] no nosso
   sistema para controle do mestre, abaixo de Paleta, chamado Imagens."

   A PAREDE SAI DO CATÁLOGO (28/11/2026). Usuário: "Ainda está aparecendo
   máscara de prata, etc. […] Não tem como essa página de imagens só mostrar
   os itens que existem? As armas não vão mostrar por tipo, vão mostrar por
   arma."

   Até aqui a parede nascia do vocabulário de bases (window.BASES_ITEM) e dos
   registros de pintura — e por isso mostrava o que nenhum item usa mais: a
   base de um item excluído, a pintura antiga que ficou no disco. Agora cada
   item do catálogo passa pelo MESMO window.arteDoItem que a ficha usa, e a
   parede é o que sai dali:

   - as ARMAS, uma moldura por arma, com o nome dela;
   - o resto, uma moldura por PINTURA, agrupada pela região do corpo (ou pelo
     grupo do catálogo), com a base na legenda e quantos itens a usam no pé.

   Item excluído some daqui sozinho; pintura que nenhum item usa não aparece.
   Fora do catálogo ficam só as imagens do próprio sistema: os rostos das
   criaturas, as condições e as pedras das Energias.
   ============================================================ */

const { useState, useEffect, useMemo } = React;

/* As condições da ficha. O Peso virou barra no pé do cartão e não usa mais o
   medalhão — a pintura fica guardada. */
const GI_CONDICOES = [
  ['cond-doenca', 'Doença'], ['cond-sono', 'Sono'], ['cond-sede', 'Sede'], ['cond-fome', 'Fome'],
  ['cond-frio', 'Frio'], ['cond-calor', 'Calor'], ['cond-vicio', 'Vício'], ['cond-loucura', 'Loucura'],
  ['cond-desonra', 'Má Fama'], ['cond-pesado', 'Peso (guardada)'],
];

// A ordem do corpo, de cima para baixo: é a ordem das seções equipáveis.
const GI_REGIAO_NOME = {
  cabeca: 'Cabeça', orelha: 'Orelha', rosto: 'Rosto', pescoco: 'Pescoço', ombro: 'Ombro',
  costas: 'Costas', dorso: 'Dorso', peito: 'Peito', braco: 'Braço', pulso: 'Pulso', dedo: 'Dedo',
  mao: 'Mão', cintura: 'Cintura', alforje: 'Alforje', perna: 'Perna', canela: 'Canela', pe: 'Pé',
};
const GI_ORDEM_REGIAO = Object.keys(GI_REGIAO_NOME);

const giNormal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const giArquivo = (src) => String(src || '').replace(/^.*\/|\.webp$/g, '');
const giLegivel = (k) => { const t = String(k).replace(/[_-]+/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
const giItens = (n) => n + (n === 1 ? ' item' : ' itens');
// A arma de verdade: o ataque natural (grupo Livre) é pintado pelo nome, como item.
const giEhArma = (c) => c.categoria_equip === 'arma' && c.grupo_armas && c.grupo_armas !== 'Livre';

/* Uma pintura na parede: moldura quadrada, legenda e o pé. `dica` lista os
   itens que a usam, para o Mestre conferir sem abrir nada — no balão do
   projeto (propsTip), nunca no title nativo. */
function GiPeca({ src, nome, pe, dica, tip }) {
  const comDica = dica && tip ? { tabIndex: 0, ...window.propsTip(tip.abrir, tip.fechar, dica) } : {};
  return (
    <figure className="gi-peca" {...comDica}>
      <span className="gi-moldura"><img src={src} alt="" loading="lazy" /></span>
      <figcaption className="gi-nome">{nome}</figcaption>
      {pe && <span className="gi-arq">{pe}</span>}
    </figure>
  );
}

function GiSecao({ titulo, conta, nota, children }) {
  return (
    <section className="gi-sec">
      <div className="mn-quadro-cabeca">
        <h3 className="gi-sec-titulo">{titulo}</h3>
        <span className="gi-conta">{conta}</span>
      </div>
      {nota && <p className="gi-sec-nota">{nota}</p>}
      {children}
    </section>
  );
}

function GaleriaImagensModal({ lang = 'pt', onClose }) {
  const [catalogo, setCatalogo] = useState(null);   // null = carregando
  const [busca, setBusca] = useState('');
  const [faixa, setFaixa] = useState('tudo');        // tudo | armas | equip | itens | criaturas | cond | falta
  const [tip, abrirTip, fecharTip, manterTip] = window.useTooltip(60);
  const giTip = { abrir: abrirTip, fechar: fecharTip };

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabaseClient
        .from('itens')
        .select('slug, nome, base, arte, grupo, slot_equip, tipo_equip, categoria_equip, tipo_armadura, grupo_armas, valor_latao, tipo_item, magico')
        .order('nome');
      if (!vivo) return;
      if (error) { console.error('[imagens] catálogo não carregou:', error); setCatalogo([]); return; }
      setCatalogo(data || []);
    })();
    return () => { vivo = false; };
  }, []);

  const nomeDaBase = useMemo(() => {
    const m = {};
    ((typeof window !== 'undefined' && window.BASES_ITEM) || []).forEach((b) => { m[b.slug] = b.nome; });
    return m;
  }, []);

  /* O catálogo inteiro passa uma vez pelo arteDoItem: o que volta é a parede
     (armas uma a uma, o resto agrupado por pintura) e o que volta null é a
     lista do que falta pintar. */
  const parede = useMemo(() => {
    const vazio = { armas: [], secoes: [], falta: [], itensPintados: 0, pinturas: 0 };
    if (!catalogo || typeof window === 'undefined' || !window.arteDoItem) return vazio;
    const armas = [];
    const porSecao = new Map();   // secao → Map(src → { src, itens: [] })
    const falta = new Map();      // secao → [nomes]
    const srcs = new Set();
    let itensPintados = 0;
    for (const c of catalogo) {
      const src = window.arteDoItem(c);
      const secao = c.slot_equip ? (GI_REGIAO_NOME[c.slot_equip] || c.slot_equip) : (c.grupo || 'Outros');
      if (!src) {
        if (!falta.has(secao)) falta.set(secao, []);
        falta.get(secao).push(c.nome);
        continue;
      }
      itensPintados += 1;
      srcs.add(src);
      if (giEhArma(c)) { armas.push({ item: c, src }); continue; }
      if (!porSecao.has(secao)) porSecao.set(secao, new Map());
      const doSrc = porSecao.get(secao);
      if (!doSrc.has(src)) doSrc.set(src, { src, itens: [] });
      doSrc.get(src).itens.push(c);
    }
    const ordemSecao = (nome) => {
      const i = GI_ORDEM_REGIAO.findIndex((k) => GI_REGIAO_NOME[k] === nome);
      return i < 0 ? 100 : i;
    };
    const secoes = [...porSecao.entries()]
      .map(([nome, m]) => ({
        nome,
        equip: ordemSecao(nome) < 100,
        pecas: [...m.values()].map((p) => {
          /* A legenda: a base, quando todos os itens da pintura dividem uma;
             o próprio item, quando é um só; senão, o nome do arquivo. */
          const bases = new Set(p.itens.map((i) => i.base).filter(Boolean));
          const base = bases.size === 1 && p.itens.every((i) => i.base) ? [...bases][0] : null;
          const nome = (base && nomeDaBase[base])
            || (p.itens.length === 1 ? p.itens[0].nome : giLegivel(giArquivo(p.src)));
          return { ...p, nome };
        }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      }))
      .sort((a, b) => ordemSecao(a.nome) - ordemSecao(b.nome) || a.nome.localeCompare(b.nome, 'pt-BR'));
    return {
      armas: armas.sort((a, b) => a.item.nome.localeCompare(b.item.nome, 'pt-BR')),
      secoes,
      falta: [...falta.entries()].map(([regiao, nomes]) => ({ regiao, nomes }))
        .sort((a, b) => b.nomes.length - a.nomes.length),
      itensPintados,
      pinturas: srcs.size,
    };
  }, [catalogo, nomeDaBase]);

  /* As imagens do próprio sistema, que não são de item. */
  const sistema = useMemo(() => {
    if (typeof window === 'undefined') return { criaturas: [], energia: [] };
    const NOME_ENERGIA = { ef: 'Energia Física', eh: 'Energia Heroica', ka: 'Karma' };
    return {
      criaturas: (window.ARTE_CRIATURA || [])
        .map(([, arq, nome]) => ({ src: '/criaturas/' + arq + '.webp', nome: nome || giLegivel(arq), arq })),
      energia: Object.entries(window.ARTE_GEMA || {})
        .map(([k, src]) => ({ src, nome: NOME_ENERGIA[k] || k, arq: giArquivo(src) })),
    };
  }, []);

  // A busca vale para a legenda, os itens da pintura e o arquivo.
  const q = giNormal(busca.trim());
  const casa = (...partes) => !q || partes.some((p) => giNormal(p).includes(q));
  const mostra = (f) => faixa === 'tudo' || faixa === f;

  const armasAVista = mostra('armas')
    ? parede.armas.filter(({ item, src }) => casa(item.nome, item.grupo_armas, giArquivo(src))) : [];
  const secoesAVista = parede.secoes
    .filter((s) => mostra(s.equip ? 'equip' : 'itens'))
    .map((s) => ({ ...s, pecas: s.pecas.filter((p) => casa(p.nome, giArquivo(p.src), ...p.itens.map((i) => i.nome))) }))
    .filter((s) => s.pecas.length);
  const criaturasAVista = mostra('criaturas') ? sistema.criaturas.filter((p) => casa(p.nome, p.arq)) : [];
  const condAVista = mostra('cond') ? GI_CONDICOES.filter(([a, n]) => casa(n, a)) : [];
  const energiaAVista = mostra('cond') ? sistema.energia.filter((p) => casa(p.nome, p.arq)) : [];
  const faltaAVista = mostra('falta')
    ? parede.falta.map((g) => ({ ...g, nomes: g.nomes.filter((n) => casa(n, g.regiao)) })).filter((g) => g.nomes.length)
    : [];
  const totalFalta = parede.falta.reduce((s, g) => s + g.nomes.length, 0);
  const faltaContada = faltaAVista.reduce((s, g) => s + g.nomes.length, 0);

  const FAIXAS = [
    ['tudo', 'Tudo'], ['armas', 'Armas'], ['equip', 'Equipáveis'], ['itens', 'Itens'],
    ['criaturas', 'Criaturas'], ['cond', 'Condições'], ['falta', 'Sem pintura'],
  ];
  const vazio = catalogo && !armasAVista.length && !secoesAVista.length && !criaturasAVista.length
    && !condAVista.length && !energiaAVista.length && !faltaAVista.length && faixa !== 'falta';

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
            <span className="mn-rotulo">Pinturas em uso</span>
            <span className="mn-celula-valor">{catalogo ? parede.pinturas : '—'}</span>
          </div>
          <div className="mn-celula">
            <span className="mn-rotulo">Itens pintados</span>
            <span className="mn-celula-valor">{catalogo ? parede.itensPintados : '—'}</span>
          </div>
          <div className="mn-celula">
            <span className="mn-rotulo">Itens sem pintura</span>
            <span className={'mn-celula-valor' + (totalFalta ? ' mn-celula-valor--alerta' : '')}>
              {catalogo ? totalFalta : '—'}
            </span>
          </div>
          <div className="mn-celula">
            <span className="mn-rotulo">Criaturas</span>
            <span className="mn-celula-valor">{sistema.criaturas.length}</span>
          </div>
          <div className="mn-celula">
            <span className="mn-rotulo">Condições</span>
            <span className="mn-celula-valor">{GI_CONDICOES.length}</span>
          </div>
        </div>

        <p className="gi-intro">
          A parede sai do <b>catálogo</b>: cada pintura aparece com os itens que a usam, e item
          excluído some daqui sozinho. As armas aparecem uma a uma; o resto, uma vez por pintura,
          com a <b>base</b> na legenda.
        </p>

        {/* ── busca e faixas ── */}
        <div className="gi-barra">
          <span className="best-search">
            <input
              type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder={lang === 'en' ? 'Search an item…' : 'Procurar um item…'}
              aria-label={lang === 'en' ? 'Search items' : 'Procurar itens'}
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

        {!catalogo && <p className="gi-nada">Carregando o catálogo…</p>}

        {vazio && (
          <p className="gi-nada">
            {busca.trim()
              ? <>Nenhuma pintura com <b>{busca.trim()}</b>.</>
              : 'Nada nesta faixa.'}
          </p>
        )}

        {/* ── as armas, uma a uma ── */}
        {armasAVista.length > 0 && (
          <GiSecao titulo="Armas" conta={armasAVista.length + (armasAVista.length === 1 ? ' arma' : ' armas')}>
            <div className="gi-grade">
              {armasAVista.map(({ item, src }) => (
                <GiPeca key={item.slug} src={src} nome={item.nome} pe={item.grupo_armas} />
              ))}
            </div>
          </GiSecao>
        )}

        {/* ── o resto do catálogo, uma moldura por pintura ── */}
        {secoesAVista.map(({ nome, pecas }) => (
          <GiSecao key={nome} titulo={nome} conta={pecas.length + (pecas.length === 1 ? ' pintura' : ' pinturas')}>
            <div className="gi-grade">
              {pecas.map((p) => (
                <GiPeca key={p.src} src={p.src} nome={p.nome}
                  pe={giItens(p.itens.length)}
                  dica={p.itens.map((i) => i.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')).join(' · ')} tip={giTip} />
              ))}
            </div>
          </GiSecao>
        ))}

        {/* ── as imagens do sistema ── */}
        {criaturasAVista.length > 0 && (
          <GiSecao titulo="Criaturas" conta={criaturasAVista.length + (criaturasAVista.length === 1 ? ' rosto' : ' rostos')}
            nota="Um rosto por tipo de criatura: todas as fichas do tipo dividem a mesma pintura.">
            <div className="gi-grade">
              {criaturasAVista.map((p) => <GiPeca key={p.src} src={p.src} nome={p.nome} />)}
            </div>
          </GiSecao>
        )}

        {condAVista.length > 0 && (
          <GiSecao titulo="Condições" conta={condAVista.length + ' pinturas'}>
            <div className="gi-grade">
              {condAVista.map(([arq, nome]) => <GiPeca key={arq} src={'/cond/' + arq + '.webp'} nome={nome} />)}
            </div>
          </GiSecao>
        )}

        {energiaAVista.length > 0 && (
          <GiSecao titulo="Energias" conta={energiaAVista.length + ' pinturas'} nota="As três pedras do cartão Energias da ficha.">
            <div className="gi-grade">
              {energiaAVista.map((p) => <GiPeca key={p.src} src={p.src} nome={p.nome} />)}
            </div>
          </GiSecao>
        )}

        {/* ── itens do catálogo que ainda caem no glifo ── */}
        {mostra('falta') && catalogo && (
          <GiSecao titulo="Itens sem pintura" conta={giItens(faltaContada)}
            nota="Sem base escolhida, ou com uma base que ainda não foi pintada. Sai do próprio catálogo: item novo aparece aqui sozinho.">
            {faltaAVista.length === 0 && (
              <p className="gi-nada">
                {busca.trim()
                  ? <>Nenhum item sem pintura com <b>{busca.trim()}</b>.</>
                  : 'Nenhum item do catálogo está sem pintura.'}
              </p>
            )}
            <div className="gi-falta">
              {faltaAVista.map((g) => (
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
          </GiSecao>
        )}

        <window.Tooltip tip={tip} onEnter={manterTip} onLeave={fecharTip} />

        <p className="gi-rodape">
          A pintura de cada item é a mesma da ficha e do inventário: vem da base escolhida no
          editor (<code>itens.base</code>) ou, sem base, do nome. Os arquivos ficam em
          {' '}<code>public/equip/</code>, <code>public/itens/</code>, <code>public/cond/</code> e <code>public/criaturas/</code>;
          a pauta do Figma, em <code>.impeccable/arte-equipamentos.md</code>.
        </p>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { GaleriaImagensModal });
