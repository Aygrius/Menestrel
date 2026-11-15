/* ============================================================
   GRUPOS — colégios, ordens, guildas e o resto de Tagmar (13/11/2026)
   ============================================================
   Usuário: "Crie um novo grupo chamado 'Grupos' e faça a construção dos
   colégios de magia." É a página irmã de Entidades na Ambientação, igual
   para Mestre e Jogador. O TEXTO MORA NO BANCO desde 15/11/2026, como o das
   Entidades (catalogo_mundo; ver 13-diario/catalogo-mundo.jsx): aqui ficou
   só o vocabulário dos tipos.

   OS TÓPICOS (15/11/2026, usuário: "vamos mudar os tópicos para: Epígrafe,
   História, Localização, Admissão, Organização, Relíquias, Rumores"). O texto
   dos tópicos que saíram foi para os novos (scripts/sql/grupos-topicos-
   2026-11-15.sql): Prólogo e Descrição para História; Lideranças, Símbolos,
   Objetivos e Ética para Organização. Tópico vazio fica fora da janela.

   OS TIPOS (15/11/2026): "Colégio (Magos), Ordem (Sacerdotes), Guilda
   (Ladinos), Confraria (Bardos), Academia (Guerreiros), Trilha
   (Rastreadores)". O nome do tipo e a profissão que ele reúne; o cartão diz
   os dois ("Colégio · Magos").

   Texto: cada "\n" é um parágrafo (a mesma regra das Entidades; sem
   Markdown).
   ============================================================ */

const GRUPO_TIPOS = {
  colegio:   { pt: 'Colégio',   en: 'College',   profPt: 'Magos',        profEn: 'Mages' },
  ordem:     { pt: 'Ordem',     en: 'Order',     profPt: 'Sacerdotes',   profEn: 'Priests' },
  guilda:    { pt: 'Guilda',    en: 'Guild',     profPt: 'Ladinos',      profEn: 'Rogues' },
  confraria: { pt: 'Confraria', en: 'Brotherhood', profPt: 'Bardos',     profEn: 'Bards' },
  academia:  { pt: 'Academia',  en: 'Academy',   profPt: 'Guerreiros',   profEn: 'Warriors' },
  trilha:    { pt: 'Trilha',    en: 'Trail',     profPt: 'Rastreadores', profEn: 'Rangers' },
};

/* "Colégio · Magos" — o tipo e a profissão que ele reúne. */
function tipoDoGrupo(g, lang) {
  const t = GRUPO_TIPOS[g && g.tipo];
  if (!t) return '';
  return lang === 'en' ? `${t.en} · ${t.profEn}` : `${t.pt} · ${t.profPt}`;
}

Object.assign(window, { GRUPO_TIPOS, tipoDoGrupo });
