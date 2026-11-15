/* ============================================================
   ENTIDADES — deuses, titãs e príncipes de Tagmar (08/11/2026)
   ============================================================
   O TEXTO MORA NO BANCO (15/11/2026). Usuário: "O texto original não precisa
   ser guardado, minha conta é de admin master, eu que estou criando a
   história. Usamos o PDF apenas como pontapé inicial. E iremos subir mais
   coisas da ambientação." As 28 entidades foram para catalogo_mundo
   (scripts/sql/catalogo-mundo-2026-11-15.sql); quem lê é
   13-diario/catalogo-mundo.jsx, quem edita é o admin pela tela, e lote novo
   escrito fora dela sobe por scripts/mundo/subir-catalogo.mjs.

   Aqui ficou só o vocabulário: as classes e as contas dos feriados.

   FERIADOS: a entidade é a FONTE dos seus feriados. O calendário
   (FERIADOS_FANTASY, 10-shell/shell.jsx) junta os delas às estações quando o
   catálogo chega (refazerFeriadosDoCalendario).

   Texto: cada "
" é um parágrafo (a mesma regra da ficha de lore; sem
   Markdown). `prefacio.fonte` é a assinatura em itálico no fim do prefácio.
   ============================================================ */

const ENTIDADE_CLASSES = {
  deus:     { pt: 'Deus',     en: 'God' },
  deusa:    { pt: 'Deusa',    en: 'Goddess' },
  tita:     { pt: 'Titã',     en: 'Titan' },
  principe: { pt: 'Príncipe', en: 'Prince' },
  princesa: { pt: 'Princesa', en: 'Princess' },
};

function classeDaEntidade(ent, lang) {
  const c = ENTIDADE_CLASSES[ent && ent.classe];
  return c ? (lang === 'en' ? c.en : c.pt) : '';
}

/* Os feriados de todas as entidades, no formato do calendário
   ({ dia, mes, nome }), com a entidade de quem são. É o que
   FERIADOS_FANTASY junta à lista dele. */
/* Um feriado pode cair em várias datas (`datas: [{dia, mes}, …]`, como a
   festa que se repete a cada passagem de mês), e `quando` é a data por
   extenso que a ficha mostra no lugar da conta. Feriado sem data que o
   calendário entenda (o livro diz só "no fim do inverno") fica só na ficha. */
function datasDoFeriado(f) {
  if (Array.isArray(f.datas)) return f.datas;
  return (f.dia && f.mes) ? [{ dia: f.dia, mes: f.mes }] : [];
}
/* MESMO NOME, MESMO DIA = uma linha só no calendário. A Festa da Iluminação
   (9 do mês do Sangue) é de Palier — a festa dos elfos — e de Plandis — a
   peregrinação à Floresta de Laudis: os livros dão as duas com o mesmo nome e
   a mesma data. Cada ficha conta a sua; o calendário diz o nome uma vez. */
function feriadosDasEntidades(lista) {
  const fonte = Array.isArray(lista) ? lista : [];
  const out = [];
  const vistos = new Set();
  fonte.forEach((ent) => (ent.feriados || []).forEach((f) => {
    datasDoFeriado(f).forEach(({ dia, mes }) => {
      const chave = dia + '/' + mes + '/' + f.nome;
      if (vistos.has(chave)) return;
      vistos.add(chave);
      out.push({ dia, mes, nome: f.nome, entidade: ent.slug });
    });
  }));
  return out;
}

Object.assign(window, { ENTIDADE_CLASSES, classeDaEntidade, feriadosDasEntidades, datasDoFeriado });
