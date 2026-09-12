/* ============================================================
   magias-efeito.test.js — o parser e o registro contra o banco
   ============================================================
   O catálogo descreve o efeito em prosa, em cinco textos por nível. Este
   arquivo trava a leitura desses textos e o acordo entre eles e o registro.

   As frases abaixo são CÓPIAS LITERAIS do banco de produção (levantamento de
   11/09/2026), não invenções. Se o catálogo mudar de redação, a mudança
   aparece aqui primeiro.

   O describe do VERBO é o mais importante do arquivo: é regressão de um bug
   que estava VIVO em produção — "Reduz 16 de dano" era lido como 16 de dano
   causado, e as três magias de proteção dos PJs apareciam na aba Magia como
   ataques. Ver spec §7.1.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './magias-efeito.jsx';

let efeitosNoNivel, elementoDoNivel;
beforeAll(() => {
  efeitosNoNivel = window.efeitosNoNivel;
  elementoDoNivel = window.elementoDoNivel;
  expect(efeitosNoNivel).toBeTypeOf('function');
  expect(elementoDoNivel).toBeTypeOf('function');
});

const mag = (nivel1) => ({ key: 'x', nome: 'X', nivel_1: nivel1 });

describe('o verbo decide o sinal — regressão do bug de produção', () => {
  it('Aeroproteção: "Reduz 16 de dano" NÃO é dano causado', () => {
    const r = efeitosNoNivel(mag('Reduz 16 de dano elemental de ar.'), 1);
    expect(r.dano).toBeUndefined();
    expect(r.reducao_dano).toBe(16);
  });

  it('Piroproteção: idem', () => {
    const r = efeitosNoNivel(mag('Reduz 16 de dano elemental de fogo.'), 1);
    expect(r.dano).toBeUndefined();
    expect(r.reducao_dano).toBe(16);
  });

  it('Armadura Elemental: idem, sem elemento específico', () => {
    const r = efeitosNoNivel(mag('Reduz 8 de dano elemental.'), 1);
    expect(r.dano).toBeUndefined();
    expect(r.reducao_dano).toBe(8);
  });

  it('Bola de Fogo: "Causa 12 de dano" É dano causado', () => {
    const r = efeitosNoNivel(mag('Causa 12 de dano elemental de fogo.'), 1);
    expect(r.dano).toBe(12);
    expect(r.reducao_dano).toBeUndefined();
  });

  it('Hidromanipulação usa "Cause", não "Causa" — typo real do catálogo', () => {
    expect(efeitosNoNivel(mag('Cause 4 de dano elemental de água.'), 1).dano).toBe(4);
  });

  it('Dardos de Gelo: "Cada dardo causa N" — verbo longe do número', () => {
    expect(efeitosNoNivel(mag('Cada dardo causa 4 de dano elemental água.'), 1).dano).toBe(4);
  });

  it('Meteoros: "Cada fragmento causa N"', () => {
    expect(efeitosNoNivel(mag('Cada fragmento causa 12 de dano elemental da terra.'), 1).dano).toBe(12);
  });
});

describe('as unidades de buff', () => {
  it('Bênção: coluna e energia heroica na mesma frase', () => {
    const r = efeitosNoNivel(mag('Aumenta 1 coluna de ataque e 5 de energia heroica.'), 1);
    expect(r).toMatchObject({ coluna: 1, eh: 5 });
  });

  it('Bravura: resistência mágica e energia heroica', () => {
    const r = efeitosNoNivel(mag('Aumenta 1 de resistência mágica e 5 de energia heroica.'), 1);
    expect(r).toMatchObject({ rm: 1, eh: 5 });
  });

  it('Super Resistência: as duas resistências, valores iguais', () => {
    const r = efeitosNoNivel(mag('Aumenta 1 de resistência física e 1 de resistência mágica.'), 1);
    expect(r).toMatchObject({ rf: 1, rm: 1 });
  });

  it('Arqueirismo: plural "colunas"', () => {
    expect(efeitosNoNivel(mag('Aumenta 4 colunas de ataque para arco.'), 1).coluna).toBe(4);
  });

  it('Aura Divina: "A área reduz" — o sinal fica com o registro', () => {
    expect(efeitosNoNivel(mag('A área reduz 1 coluna de ataque.'), 1).coluna).toBe(1);
  });

  it('Barreira Mística: "A barreira reduz"', () => {
    expect(efeitosNoNivel(mag('A barreira reduz 1 coluna de ataque.'), 1).coluna).toBe(1);
  });

  it('Força Mútua: coluna sozinha', () => {
    expect(efeitosNoNivel(mag('Aumenta 1 coluna de ataque.'), 1).coluna).toBe(1);
  });

  it('Velocidade: continua lendo como antes', () => {
    expect(efeitosNoNivel(mag('Aumenta 2 de velocidade.'), 1).vb).toBe(2);
  });

  it('Perspicácia: lista de três unidades', () => {
    const r = efeitosNoNivel(mag('Aumente 1 de velocidade, 1 de defesa e 1 coluna de ataque.'), 1);
    expect(r).toMatchObject({ vb: 1, defesa: 1, coluna: 1 });
  });
});

describe('as curas — verbo Restaura, unidade própria', () => {
  it('Curas Espirituais restaura EH, e NÃO é buff de EH', () => {
    const r = efeitosNoNivel(mag('Restaura 20 de energia heroica.'), 1);
    expect(r.cura_eh).toBe(20);
    expect(r.eh).toBeUndefined();
  });

  it('Curas Físicas restaura EF', () => {
    expect(efeitosNoNivel(mag('Restaura 4 de energia física.'), 1).cura_ef).toBe(4);
  });
});

describe('o elemento do dano', () => {
  it.each([
    ['Causa 12 de dano elemental de fogo.', 'fogo'],
    ['Cada dardo causa 4 de dano elemental água.', 'agua'],
    ['Causa 4 de dano elemental de ar.', 'ar'],
    ['Cada fragmento causa 12 de dano elemental da terra.', 'terra'],
    ['Causa 4 de dano elemental de luz.', 'luz'],
    ['Cada dardo causa 8 de dano celestial.', 'celestial'],
  ])('%s → %s', (txt, esperado) => {
    expect(elementoDoNivel(mag(txt), 1)).toBe(esperado);
  });

  it('"dano base" não tem elemento (Toque Gélido)', () => {
    expect(elementoDoNivel(mag('Cause 12 de dano base.'), 1)).toBeNull();
  });

  it('"dano elemental" sem qualificador não tem elemento (Armadura Elemental)', () => {
    expect(elementoDoNivel(mag('Reduz 8 de dano elemental.'), 1)).toBeNull();
  });

  it('não tira o elemento do nome da magia', () => {
    // "Bola de Fogo" no nome não pode virar elemento quando o texto do nível
    // não menciona fogo.
    expect(elementoDoNivel({ key: 'bola_de_fogo', nome: 'Bola de Fogo',
                             nivel_1: 'Cause 12 de dano base.' }, 1)).toBeNull();
  });
});

describe('não inventa efeito onde não há', () => {
  it('texto narrativo devolve objeto vazio', () => {
    expect(efeitosNoNivel(mag('Permite fazer uma pergunta ao morto.'), 1)).toEqual({});
  });

  it('nível inexistente devolve objeto vazio, sem lançar', () => {
    expect(efeitosNoNivel(mag('Causa 12 de dano.'), 7)).toEqual({});
  });

  it('magia nula devolve objeto vazio, sem lançar', () => {
    expect(efeitosNoNivel(null, 1)).toEqual({});
  });

  it('REGRESSÃO: número DEPOIS da unidade não conta (Telecinese)', () => {
    // O mesmo erro que velocidade-magia.test.js já trava: "velocidade de 5
    // metros por rodada" DESCREVE, não modifica. Sem verbo nenhum aqui, mas
    // o teste vale como âncora da regra.
    const r = efeitosNoNivel(mag('Move 5 kg, arrasta 25 kg ou derruba 1 kg em uma velocidade de 5 metros por rodada.'), 1);
    expect(r.vb).toBeUndefined();
  });

  it('REGRESSÃO: "velocidade 20" da Unidade Natural não é buff', () => {
    expect(efeitosNoNivel(mag('Invoca um animal com velocidade 20.'), 1).vb).toBeUndefined();
  });
});

describe('MAGIA_EFEITO_MAP — a forma das 25 entradas', () => {
  let MAP, magiaEfeitoDe;
  beforeAll(() => {
    MAP = window.MAGIA_EFEITO_MAP;
    magiaEfeitoDe = window.magiaEfeitoDe;
    expect(MAP).toBeDefined();
    expect(magiaEfeitoDe).toBeTypeOf('function');
  });

  const ALVOS_VALIDOS = ['self', 'aliado', 'inimigo'];
  // Cópia de SELECT DISTINCT tipo FROM criaturas, 11/09/2026.
  const RACAS_VALIDAS = ['Animal', 'Civilizado', 'Místico', 'Dragão',
                         'Elemental', 'Morto', 'Demônio', 'Construído', 'Celestial'];
  const TIPOS_VALIDOS = ['dano', 'reducao_dano', 'cura_pool', 'dreno_eh',
                         'mod_ataque', 'mod_defesa', 'mod_vb',
                         'mod_rf', 'mod_rm', 'mod_eh_temp',
                         // Magias de criatura (12/09/2026): as duas ja existiam
                         // como primitivas de TECNICA e passaram a ter produtor
                         // magico — Sangramento e Posicionamento, respectivamente.
                         'dano_por_rodada', 'mod_dano_max',
                         // 12/09/2026: as primitivas que Oferenda e Licantropia
                         // trouxeram. Ver o comentario das entradas no mapa.
                         'mod_nivel_magia', 'sem_cura_ef', 'mod_atributo',
                         // Varredura das orfas: mod_coluna estreia produtor
                         // magico. Existia desde a Falha Critica, e so as
                         // tecnicas a usavam. Ato Falho pune TODAS as acoes.
                         'mod_coluna',
                         // Fase 2: sem_acoes JÁ EXISTIA (Falha Crítica). A fase
                         // acrescenta produtores, não mecanismo.
                         'sem_acoes'];

  it('tem 72 entradas — 69 mais as tres ultimas decisoes', () => {
    expect(Object.keys(MAP)).toHaveLength(72);
  });

  it.each(Object.entries(window.MAGIA_EFEITO_MAP))(
    '%s tem alvo, alvos, ícone e ao menos um efeito', (key, reg) => {
      expect(ALVOS_VALIDOS, key).toContain(reg.alvo);
      expect(reg.alvos === 'escolha' || Number.isInteger(reg.alvos), key).toBe(true);
      expect(Array.isArray(reg.efeitos), key).toBe(true);
      expect(reg.efeitos.length, key).toBeGreaterThan(0);
      expect(reg.icone, key).toBeTruthy();
    });

  it.each(Object.entries(window.MAGIA_EFEITO_MAP))(
    '%s só declara tipos que o motor conhece', (key, reg) => {
      reg.efeitos.forEach((ef) => {
        expect(TIPOS_VALIDOS, `${key}.${ef.tipo}`).toContain(ef.tipo);
        /* Duas formas de efeito, e cada uma exige um campo:
             NÚMERO   — `unidade`, a chave que efeitosNoNivel devolve;
             BANDEIRA — `valor`, sem unidade (sem_acoes não tem número: ou o
                        alvo está impedido, ou não está).
           Exigir `unidade` das duas rejeitaria as de controle; não exigir
           nada deixaria passar uma entrada malformada. */
        const temUnidade = !!ef.unidade;
        const temValor = ef.valor !== undefined;
        expect(temUnidade || temValor, `${key}.${ef.tipo}: sem unidade nem valor`).toBe(true);
        expect(temUnidade && temValor, `${key}.${ef.tipo}: unidade E valor`).toBe(false);
      });
    });

  it('so_racas e inverte_em só citam raças que existem em criaturas.tipo', () => {
    Object.entries(MAP).forEach(([key, reg]) => {
      [...(reg.so_racas || []), ...(reg.inverte_em || [])].forEach((r) => {
        expect(RACAS_VALIDAS, `${key}: raça "${r}"`).toContain(r);
      });
    });
  });

  it('magia sem entrada devolve null, sem lançar', () => {
    expect(magiaEfeitoDe('ressurreicao')).toBeNull();
    expect(magiaEfeitoDe('')).toBeNull();
    expect(magiaEfeitoDe(null)).toBeNull();
    expect(magiaEfeitoDe(undefined)).toBeNull();
  });

  it('Licantropia e Oferenda entraram em 12/09/2026, com primitiva propria', () => {
    // A Fase 1 as adiou (spec §2.3) por nao serem "um numero somado a um stat
    // por N rodadas". Continuam nao sendo — cada uma trouxe a primitiva que
    // faltava: mod_nivel_magia/sem_cura_ef e mod_atributo.
    expect(MAP.licantropia_lupina).toBeDefined();
    expect(MAP.oferenda).toBeDefined();
  });

  it('as chaves foram ALINHADAS aos nomes em 12/09/2026', () => {
    /* Seis magias tinham key divergente do nome — Aeroproteção era
       "protecao_animal", Hidroproteção era "protecao_elemental". Procurar
       pela magia pelo nome não a encontrava, e as quatro iniciadas por
       "protecao_" ainda ocupavam um espaço de nomes genérico.

       Alinhadas por scripts/sql/magias-key-alinha-nome.sql, que renomeou
       também personagens.magias. Criaturas referenciam por NOME e não
       foram afetadas. */
    expect(MAP.aeroprotecao).toBeDefined();
    expect(MAP.hidroprotecao).toBeDefined();
    expect(MAP.fotomanipulacao).toBeDefined();
    expect(MAP.protecao_animal).toBeUndefined();
    expect(MAP.protecao_elemental).toBeUndefined();
    expect(MAP.manipulacao_de_luz).toBeUndefined();
  });
});

describe('o acordo entre o mapa e o texto do banco', () => {
  /* ESTE É O TESTE QUE SEGURA A FASE INTEIRA.

     O mapa declara QUAIS unidades a magia usa; o parser lê o NÚMERO do texto.
     Se o Mestre editar o catálogo pelo editor de admin e quebrar o padrão
     "verbo + número + unidade", o mapa passa a prometer uma unidade que o
     parser não acha mais — e a magia vira um buff de zero, em silêncio.

     Aqui isso vira erro de CI em vez de surpresa na mesa. Spec §5.3.

     As frases são cópias literais do banco em 11/09/2026, um nível por magia
     (o padrão é idêntico nos cinco). */
  const NIVEL_1_NO_BANCO = {
    aeromanipulacao:    'Causa 4 de dano elemental de ar.',
    armadura_elemental: 'Reduz 8 de dano elemental.',
    arqueirismo:        'Aumenta 4 colunas de ataque para arco.',
    aura_divina:        'A área reduz 1 coluna de ataque.',
    barreira_mistica:   'A barreira reduz 1 coluna de ataque.',
    bencao:             'Aumenta 1 coluna de ataque e 5 de energia heroica.',
    bola_de_fogo:       'Causa 12 de dano elemental de fogo.',
    bravura:            'Aumenta 1 de resistência mágica e 5 de energia heroica.',
    covardia:           'Causa 8 de dano na energia heroica.',
    curas_espirituais:  'Restaura 20 de energia heroica.',
    curas_fisicas:      'Restaura 4 de energia física.',
    dardos_de_gelo:     'Cada dardo causa 4 de dano elemental água.',
    dardos_de_luz:      'Cada dardo causa 8 de dano celestial.',
    forca_mutua:        'Aumenta 1 coluna de ataque.',
    geomanipulacao:     'Causa 4 de dano elemental de terra.',
    hidromanipulacao:   'Cause 4 de dano elemental de água.',
    fotomanipulacao:    'Causa 4 de dano elemental de luz.',
    meteoros:           'Cada fragmento causa 12 de dano elemental da terra.',
    piromanipulacao:    'Causa 4 de dano elemental de fogo.',
    piroprotecao:       'Reduz 16 de dano elemental de fogo.',
    aeroprotecao:       'Reduz 16 de dano elemental de ar.',
    raio_eletrico:      'Cada raio causa 12 de dano elemental fogo.',
    super_resistencia:  'Aumenta 1 de resistência física e 1 de resistência mágica.',
    toque_gelido:       'Cause 12 de dano base.',
    velocidade:         'Aumenta 2 de velocidade.',
    /* Fase 2 — as tres de CONTROLE. O texto do nivel delas NAO traz numero de
       efeito: traz duracao (Medo), teto de estagio (Esconjuracao) ou prosa
       (Sono). Por isso as entradas declaram `valor: true` em vez de
       `unidade`, e o acordo mapa-parser abaixo as pula. */
    /* As sete de CRIATURA (12/09/2026). Copias literais do banco. */
    ataque_infernal:    'Cause 28 de dano base e, mais 1 de dano máximo na energia física por rodada.',
    bastao_de_luz:      'Cause 20 de dano base.',
    campo_de_trevas:    'Reduza 1 de energia física por rodada.',
    geoprotecao:        'Reduz 16 de dano elemental da terra.',
    pele_de_arvore:     'Reduza 4 de dano máximo.',
    relampago:          'Cause 28 de dano base.',
    ruido_extenuante:   'Reduza 1 coluna de ataque e 8 de velocidade.',
    /* META e ATRIBUTO (12/09/2026). */
    oferenda:           'Aumenta 2 níveis da magia e reduz 1 de energia física.',
    /* NIVEL 5, nao 1: Licantropia so menciona Fisico e Carisma a partir dele.
       Unidade que so existe em nivel alto e caso real, e a conferencia tem
       que usar um texto que exercite TODAS as declaradas. */
    licantropia_lupina: 'Aumenta 2 no atributo Força e 1 no atributo Físico e diminui 2 no atributo Intelecto e 1 no atributo Carisma.',
    /* ══ VARREDURA DAS ÓRFÃS (12/09/2026). Cópias literais do banco. ══ */
    armadilha_natural:     'Cause 12 de dano base.',
    energia_primordial:    'Cause 36 de dano base.',
    feixes_incandescentes: 'Cause 32 de dano base.',
    flecha_divina:         'Cause 20 de dano base.',
    fogo_divino:           'Cause 28 de dano base.',
    manipulacao_infernal:  'Causa 28 de dano infernal.',
    putrefacao:            'Cause 12 de dano base.',
    onda_destrutiva:       'Cause 4 de dano base.',
    narrativa_real:        'Cause 16 de dano base.',
    hidroprotecao:         'Reduz 16 de dano elemental de água.',
    destreza_animal:       'Aumente 2 colunas de ataque.',
    obstinacao:            'Aumente 1 coluna de ataque, 1 de resistência física, 1 de resistência mágica e 5 de energia heroica.',
    coordenacao:           'Aumente 1 coluna de ataque e 2 de velocidade.',
    perspicacia:           'Aumente 1 de velocidade, 1 de defesa e 1 coluna de ataque.',
    cancao_do_alento:      'Aumente 1 coluna de ataque e 5 de energia heroica.',
    cancao_do_animo:       'Aumenta 1 de velocidade e 5 de energia heroica.',
    // Texto corrigido pelo usuario em 12/09/2026: ganhou o "de" e trocou
    // "Aumente" por "Recupera" — que o leitor nao conhecia. Ver o verbo novo.
    veu_de_maira:          'Recupera 15 de energia heroica e 1 coluna de ataque.',
    bencao_selvagem:       'Aumenta 1 coluna de ataque e reduz 5 de energia heroica.',
    ato_falho:             'Reduza 1 coluna de resolução para todas as ações.',
    degeneracao_fisica:    'Reduza 1 coluna de ataque.',
    ruido:                 'Reduza 1 coluna de ataque.',
    distracao:             'Reduza 4 pontos de velocidade.',
    regiao_inviolavel:     'Reduza 12 de velocidade.',
    cancao_do_sono:        'Reduza 1 coluna de ataque e 5 de energia heroica.',
    cancao_do_tormento:    'Reduza 1 coluna de ataque e causa 4 de dano base.',
    carne_em_vermes:       'Cause 4 de dano base e reduza 1 coluna de ataque.',
    curas_naturais:        'Restaura 4 de energia heroica e 2 de energia física.',
    curas_heroicas:        'Restaura 8 de energia heroica.',
    // Entrou depois de o usuario trocar "Cure" por "Restaura": nao havia
    // dificuldade nenhuma, o verbo antigo e que era desconhecido.
    heroismo:              'Restaura 8 de energia heroica.',
    // Entrou depois de o usuario trocar "dano maximo" por "dano": a
    // ambiguidade era essa, e o texto novo e inequivoco.
    auxilio_natural:       'Causa 4 de dano e reduz 1 coluna de ataque.',
    // Entraram depois de o usuario trocar `alcance` de "Pessoal" para
    // "Toque": dano em inimigo com alcance que nao alcanca inimigo.
    garras:                'Causa 4 de dano, ignora a energia heroica.',
    lamina_de_luz:         'Causa 24 de dano elemental de luz.',
    /* As tres ultimas pendencias de decisao, respondidas em 12/09/2026:
       o bonus de Forcar Disputa e do ADVERSARIO; a Parede vale numa area a
       partir do conjurador; e resistir e escolha de quem recebe, nao sinal
       de debuff — o que liberou Tensao. */
    forcar_disputa:        'Aumenta 1 de velocidade.',
    parede_de_cristal:     'Reduz 8 de dano.',
    tensao:                'Aumenta 1 de defesa, 1 de velocidade e 1 coluna de ataque.',
    medo:               'A magia tem duracao de 1 rodada.',
    esconjuracao:       'Afeta criaturas de estagio 1.',
    sono:               'Altera uma condicao do sono.',
  };

  it('a lista de conferência cobre TODAS as entradas do mapa', () => {
    expect(Object.keys(NIVEL_1_NO_BANCO).sort())
      .toEqual(Object.keys(window.MAGIA_EFEITO_MAP).sort());
  });

  it.each(Object.entries(NIVEL_1_NO_BANCO))(
    '%s: toda unidade declarada é encontrada pelo parser', (key, texto) => {
      const reg = window.MAGIA_EFEITO_MAP[key];
      expect(reg, ` não está no mapa`).toBeDefined();
      const lido = window.efeitosNoNivel({ key, nivel_1: texto }, 1);
      reg.efeitos.forEach((ef) => {
        // Efeito de bandeira não lê número nenhum: nada a conferir aqui.
        if (ef.valor !== undefined) return;
        expect(lido[ef.unidade],
          `${key}: unidade "${ef.unidade}" não encontrada em "${texto}"`)
          .toBeGreaterThan(0);
      });
    });
});

describe('tetoEstagioNoNivel — Esconjuração escala com o nível', () => {
  /* Frases literais do banco, levantadas em 12/09/2026. O "até" aparece a
     partir do nível 3 e não muda o sentido: o número é o teto nos dois casos. */
  let tetoEstagioNoNivel;
  beforeAll(() => {
    tetoEstagioNoNivel = window.tetoEstagioNoNivel;
    expect(tetoEstagioNoNivel).toBeTypeOf('function');
  });

  const esc = {
    key: 'esconjuracao',
    nivel_1: 'Afeta criaturas de estágio 1.',
    nivel_5: 'Afeta criaturas de até estágio 9.',
    nivel_9: 'Afeta criaturas de até estágio 17.',
  };

  it.each([[1, 1], [5, 9], [9, 17]])('nível %i → teto %i', (nivel, teto) => {
    expect(tetoEstagioNoNivel(esc, nivel)).toBe(teto);
  });

  it('nível sem texto devolve null', () => {
    expect(tetoEstagioNoNivel(esc, 3)).toBeNull();
  });

  it('magia que não fala de estágio devolve null', () => {
    expect(tetoEstagioNoNivel({ nivel_1: 'Causa 12 de dano.' }, 1)).toBeNull();
  });

  it('magia nula não lança', () => {
    expect(tetoEstagioNoNivel(null, 1)).toBeNull();
  });
});

describe('as três magias de CONTROLE da Fase 2', () => {
  let MAP;
  beforeAll(() => { MAP = window.MAGIA_EFEITO_MAP; });

  it.each(['medo', 'esconjuracao', 'sono'])('%s produz sem_acoes', (key) => {
    expect(MAP[key].efeitos.map((e) => e.tipo)).toEqual(['sem_acoes']);
  });

  it.each(['medo', 'esconjuracao', 'sono'])('%s mira inimigo', (key) => {
    expect(MAP[key].alvo).toBe('inimigo');
  });

  it('o efeito de controle é BANDEIRA: valor true, sem unidade', () => {
    const ef = MAP.medo.efeitos[0];
    expect(ef.valor).toBe(true);
    expect(ef.unidade).toBeUndefined();
  });

  it('só Esconjuração restringe raça e estágio', () => {
    expect(MAP.esconjuracao.so_racas).toEqual(['Morto', 'Demônio']);
    expect(MAP.esconjuracao.teto_estagio).toBe(true);
    expect(MAP.medo.so_racas).toBeUndefined();
    expect(MAP.sono.teto_estagio).toBeUndefined();
  });

  it('as seis magias que NÃO cabem na Fase 2 continuam fora do mapa', () => {
    /* Alucinação (dificuldade de habilidade), Invisibilidade (seleção de
       alvo), Ordens (narrativa), Possessão (troca de corpo), Licantropia
       (atributos) e Oferenda (meta-magia) precisam de sistemas que o motor de
       combate não tem. Entregar três inteiras é melhor que nove pela metade. */
    ['alucinacao', 'invisibilidade', 'ordens', 'possessao'].forEach((k) => {
      expect(MAP[k], `${k} entrou no mapa sem a primitiva que precisa`).toBeUndefined();
    });
  });
});

describe('auditarMagias — o verificador de manutenção do catálogo', () => {
  /* POR QUE ESTE VERIFICADOR EXISTE.

     O teste de acordo acima compara o mapa contra CÓPIAS do texto coladas
     neste arquivo. Ele pega mudança no CÓDIGO; não pega mudança no BANCO.
     Editar uma magia pelo admin e quebrar o padrão não dispara nada — a magia
     só para de fazer efeito, em silêncio.

     auditarMagias roda contra o catálogo de verdade e responde: o motor ainda
     entende o que está escrito? */
  let auditar, resumo;
  beforeAll(() => {
    auditar = window.auditarMagias;
    resumo = window.resumoAuditoria;
    expect(auditar).toBeTypeOf('function');
  });

  it('magia do registro com todas as unidades legíveis fica OK', () => {
    const r = auditar([{ key: 'bencao', nome: 'Bênção',
      nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' }]);
    expect(r.ok.map((x) => x.key)).toEqual(['bencao']);
    expect(r.quebrada).toHaveLength(0);
  });

  it('QUEBRADA: o texto mudou e a unidade declarada sumiu', () => {
    // O caso que motivou tudo: alguém troca "coluna de ataque" por "defesa" e
    // a magia vira um buff de zero, sem nada avisando.
    const r = auditar([{ key: 'bencao', nome: 'Bênção',
      nivel_1: 'Aumenta 1 de defesa e 5 de energia heroica.' }]);
    expect(r.quebrada).toHaveLength(1);
    expect(r.quebrada[0].faltando).toEqual(['coluna']);
  });

  it('a unidade precisa aparecer em ALGUM nível, não em todos', () => {
    /* Licantropia só menciona Físico e Carisma a partir do nível 5. Exigir
       todas em todos acusaria uma magia correta. */
    const r = auditar([{ key: 'licantropia_lupina', nome: 'Licantropia Lupina',
      nivel_1: 'Aumenta 1 no atributo Força e diminui 1 no atributo Intelecto.',
      nivel_5: 'Aumenta 2 no atributo Força e 1 no atributo Físico e diminui 2 no atributo Intelecto e 1 no atributo Carisma.' }]);
    expect(r.quebrada).toHaveLength(0);
    expect(r.ok).toHaveLength(1);
  });

  it('efeito de BANDEIRA não exige número nenhum', () => {
    // Medo produz sem_acoes; o texto do nível só traz a duração.
    const r = auditar([{ key: 'medo', nome: 'Medo',
      nivel_1: 'A magia tem duração de 1 rodada.' }]);
    expect(r.ok.map((x) => x.key)).toEqual(['medo']);
  });

  it('REGRESSÃO: número de duração ou de estágio NÃO é ambiguidade', () => {
    /* Primeira versão avisava sempre que houvesse número sem verbo, e a
       auditoria do catálogo real acusou Medo e Esconjuração nos cinco níveis.
       Número de duração e teto de estágio são legítimos. */
    const r = auditar([
      { key: 'medo', nome: 'Medo', nivel_1: 'A magia tem duração de 1 rodada.' },
      { key: 'esconjuracao', nome: 'Esconjuração', nivel_1: 'Afeta criaturas de estágio 1.' },
    ]);
    expect(r.ambigua).toHaveLength(0);
  });

  it('AMBÍGUA: dois números escrevendo o MESMO campo no mesmo nível', () => {
    // A armadilha que Ataque Infernal expôs, antes de `de dano máximo` virar
    // unidade própria: o segundo número sobrescrevia o primeiro.
    const r = auditar([{ key: 'bola_de_fogo', nome: 'Bola de Fogo',
      nivel_1: 'Causa 12 de dano elemental e causa 4 de dano extra.' }]);
    expect(r.ambigua).toHaveLength(1);
    expect(r.ambigua[0].avisos.some((a) => a.tipo === 'sobrescrita')).toBe(true);
  });

  it('AMBÍGUA: número com unidade que o leitor não conhece', () => {
    const r = auditar([{ key: 'bencao', nome: 'Bênção',
      nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica e 3 de sorte.' }]);
    expect(r.ambigua[0].avisos.some((a) => a.tipo === 'unidade_desconhecida')).toBe(true);
  });

  it('ÓRFÃ: tem número mecânico legível e NÃO tem registro', () => {
    /* A lista que responde "que magia eu deveria acrescentar a seguir".

       A fixture era Hidroproteção, que ENTROU no registro na varredura de
       12/09/2026 — órfã de exemplo precisa ser uma que siga de fora. Melodia
       Zen ficou por motivo registrado: exige meia hora de música
       ininterrupta, não é ação de combate. */
    const r = auditar([{ key: 'melodia_zen', nome: 'Melodia Zen',
      nivel_1: 'Durante meia hora de música, recuperando 8 de energia heroica.' }]);
    expect(r.orfa).toHaveLength(1);
    expect(r.orfa[0].unidades).toEqual(['cura_eh']);
  });

  it('NARRATIVA: sem registro e sem número — nada a fazer', () => {
    const r = auditar([{ key: 'clarividencia', nome: 'Clarividência',
      nivel_1: 'A magia tem duração de alguns segundos.' }]);
    expect(r.narrativa).toHaveLength(1);
    expect(r.orfa).toHaveLength(0);
  });

  it('o resumo conta tudo e fecha com o total', () => {
    const r = auditar([
      { key: 'bencao', nome: 'B', nivel_1: 'Aumenta 1 coluna de ataque e 5 de energia heroica.' },
      { key: 'melodia_zen', nome: 'M', nivel_1: 'Cure 8 de energia heroica.' },
      { key: 'xyz', nome: 'X', nivel_1: 'Narrativa pura.' },
    ]);
    const s = resumo(r);
    expect(s).toMatchObject({ ok: 1, orfa: 1, narrativa: 1, total: 3 });
  });

  it('entrada vazia ou malformada não lança', () => {
    expect(resumo(auditar(null)).total).toBe(0);
    expect(resumo(auditar([null, {}, { nome: 'sem key' }])).total).toBe(0);
  });
});

describe('auditarCriaturas — o furo do rename', () => {
  /* `personagens.magias` referencia magia por KEY e sobrevive a um rename.
     `criaturas.magia` referencia por NOME, em texto livre — trocar o nome de
     "Piromanipulação" quebra as 10 criaturas que a citam, em silêncio.

     `nome` parece conteúdo editável, e é identidade. Daí esta auditoria. */
  let auditar, resumo, resolver, indice;
  beforeAll(() => {
    auditar = window.auditarCriaturas;
    resumo = window.resumoAuditoriaCriaturas;
    resolver = window.resolverNomesDeMagia;
    indice = window.indiceMagiasPorNome;
    expect(auditar).toBeTypeOf('function');
  });

  const CATALOGO = [
    { key: 'piromanipulacao', nome: 'Piromanipulação' },
    { key: 'geoprotecao',     nome: 'Geoproteção' },
    { key: 'clarividencia',   nome: 'Clarividência' },   // sem entrada no registro
  ];

  it('criatura com nomes que casam e nível preenchido fica OK', () => {
    const r = auditar([{ id: 1, nome: 'Gárgula', magia: 'Geoproteção, Piromanipulação', magia_n: 5 }], CATALOGO);
    expect(r.ok).toHaveLength(1);
    expect(r.nome_orfao).toHaveLength(0);
  });

  it('NOME ÓRFÃO: alguém renomeou a magia e a criatura ficou apontando pro nada', () => {
    const r = auditar([{ id: 1, nome: 'Gárgula', magia: 'Piromanipulaçao', magia_n: 5 }], CATALOGO);
    expect(r.nome_orfao).toHaveLength(1);
    expect(r.nome_orfao[0].nomes).toEqual(['Piromanipulaçao']);
  });

  it('o painel mostra QUAL nome não casou, para dar pra corrigir', () => {
    const r = auditar([{ id: 1, nome: 'Quimera', magia: 'Geoproteção, Sopro Inexistente', magia_n: 5 }], CATALOGO);
    expect(r.nome_orfao[0].nomes).toEqual(['Sopro Inexistente']);
  });

  it('SEM NÍVEL: magia_n vazio faz o motor cair no nível 1', () => {
    const r = auditar([{ id: 1, nome: 'X', magia: 'Piromanipulação', magia_n: null }], CATALOGO);
    expect(r.sem_nivel).toHaveLength(1);
  });

  it('SÓ NARRATIVA: os nomes casam, mas nenhuma tem efeito no motor', () => {
    const r = auditar([{ id: 1, nome: 'Vidente', magia: 'Clarividência', magia_n: 5 }], CATALOGO);
    expect(r.so_narrativa).toHaveLength(1);
    expect(r.nome_orfao).toHaveLength(0);
  });

  it('criatura sem magia não entra na conta', () => {
    const r = auditar([{ id: 1, nome: 'Lobo', magia: null }, { id: 2, nome: 'Urso', magia: '  ' }], CATALOGO);
    expect(resumo(r).total).toBe(0);
  });

  it('o casamento tolera caixa e espaços, como o editor exige', () => {
    const r = auditar([{ id: 1, nome: 'X', magia: '  GEOPROTEÇÃO , piromanipulação', magia_n: 3 }], CATALOGO);
    expect(r.ok).toHaveLength(1);
  });

  it('entrada malformada não lança', () => {
    expect(resumo(auditar(null, null)).total).toBe(0);
    expect(resumo(auditar([null, {}], CATALOGO)).total).toBe(0);
  });

  it('o resolvedor é o MESMO que o motor usa em combate', () => {
    /* Se a auditoria tivesse cópia da lógica, ela mentiria: diria que está
       tudo certo enquanto a mesa vê a magia sumir. magiasConhecidasDoAtor
       chama estas duas funções. */
    const idx = indice(CATALOGO);
    const r = resolver('Geoproteção, Nao Existe', idx);
    expect(r.achadas.map((m) => m.key)).toEqual(['geoprotecao']);
    expect(r.naoAchadas).toEqual(['Nao Existe']);
  });
});

describe('verbos de cura — o caso que o verificador pegou em produção', () => {
  /* O usuário corrigiu o texto do Véu de Maira e, no mesmo movimento, trocou
     "Aumente" por "Recupera" — verbo que o leitor não conhecia. Verbo
     desconhecido = nada lido = magia com efeito ZERO, em silêncio.

     Foi o painel de verificação que apontou. É o cenário que ele existe para
     cobrir: mudança no BANCO, não no código. */
  it('Recupera é sinônimo de Restaura', () => {
    expect(efeitosNoNivel(mag('Recupera 15 de energia heroica.'), 1).cura_eh).toBe(15);
  });

  it.each(['Recupere', 'Recuperam', 'Recuperando'])('%s também', (verbo) => {
    expect(efeitosNoNivel(mag(`${verbo} 8 de energia heroica.`), 1).cura_eh).toBe(8);
  });

  it('REGRESSÃO: verbo de cura governando uma COLUNA não a descarta', () => {
    /* Véu de Maira: "Recupera 15 de energia heroica e 1 coluna de ataque."
       O verbo governa os dois, mas "recuperar uma coluna" só pode significar
       ganhar uma. O ramo de cura só tratava poços e engolia a coluna — a
       magia entregava metade do que promete. */
    const r = efeitosNoNivel(mag('Recupera 15 de energia heroica e 1 coluna de ataque.'), 1);
    expect(r).toMatchObject({ cura_eh: 15, coluna: 1 });
  });

  it('a preposição continua opcional depois da correção', () => {
    expect(efeitosNoNivel(mag('Aumente 15 energia heroica.'), 1).eh).toBe(15);
  });

  it('Melodia Zen fica legível, mas continua FORA do registro', () => {
    /* "Durante meia hora de música ininterrupta… recuperando 8 de energia
       heroica." O número é legível, mas a magia exige meia hora — não é ação
       de combate. Fica órfã no verificador, que é a classificação certa:
       número legível que o motor ignora de propósito. */
    const txt = 'Durante meia hora de música ininterrupta, os ouvintes sentem-se como se tivessem descansado por 4 horas, recuperando 8 de energia heroica.';
    expect(efeitosNoNivel(mag(txt), 1).cura_eh).toBe(8);
    expect(window.MAGIA_EFEITO_MAP.melodia_zen).toBeUndefined();
  });

  it('o número ANTES do verbo continua sendo ignorado', () => {
    // "descansado por 4 horas" vem antes de "recuperando" e não entra.
    const txt = 'Descansado por 4 horas, recuperando 8 de energia heroica.';
    const r = efeitosNoNivel(mag(txt), 1);
    expect(r.cura_eh).toBe(8);
    expect(Object.keys(r)).toEqual(['cura_eh']);
  });
});

describe('verbo `recebe` e os limites do leitor — varredura de 12/09/2026', () => {
  it('Necropotência: "Recebe N de energia heroica adicional" é ganho', () => {
    // Sentido confirmado pelo usuário: neste caso a EH é adicional.
    expect(efeitosNoNivel(mag('Recebe 10 de energia heroica adicional.'), 1).eh).toBe(10);
  });

  it('"recebe N de dano" continua ILEGÍVEL, e é o que resolve a ambiguidade', () => {
    /* A dúvida ao adotar o verbo era "recebe 10 de dano", que significaria o
       oposto de ganho. Ela se resolve sozinha: sob a ação 'mais', a unidade
       `dano` não é escrita em campo nenhum — só 'causa' e 'reduz' a escrevem.
       Ossos de Aço diz exatamente isso (dano de queda) e segue ignorada. */
    const r = efeitosNoNivel(mag('Só recebe 1 de dano na energia física a cada 5 metros.'), 1);
    expect(r.dano).toBeUndefined();
    expect(r.reducao_dano).toBeUndefined();
  });

  it('NÚMERO POR EXTENSO não é lido — o catálogo usa dígitos', () => {
    /* Aconteceu de verdade: ao consertar o "Reduza5" grudado do Ruído, o texto
       virou "Reduz cinco colunas de ataque" e a magia continuou entregando
       zero. O leitor procura dígitos, e as outras 237 magias usam dígitos. */
    expect(efeitosNoNivel(mag('Reduz cinco colunas de ataque.'), 1).coluna).toBeUndefined();
    expect(efeitosNoNivel(mag('Reduz 5 colunas de ataque.'), 1).coluna).toBe(5);
  });

  it('VERBO GRUDADO no número também não é lido', () => {
    // "Reduza5" — o typo original do Ruído, e o mesmo que já mordeu Ruído
    // Extenuante em 09/2026. A fronteira de palavra exige o espaço.
    expect(efeitosNoNivel(mag('Reduza5 colunas de ataque.'), 1).coluna).toBeUndefined();
  });

  it('magias de INVOCAÇÃO seguem fora do registro', () => {
    /* Projeção, Guardião Espiritual, Pseudomatéria e Criatura Disforme criam
       PARTICIPANTES. Os números do nível delas são a ficha do invocado, não
       efeito em alguém — ler como buff daria energia heroica ao conjurador.
       Entrar exige acrescentar participante depois do setup, com snapshot,
       posição e lugar na iniciativa: feature de porte próprio. */
    ['projecao', 'guardiao_espiritual', 'pseudomateria', 'criatura_disforme']
      .forEach((k) => expect(window.MAGIA_EFEITO_MAP[k], k).toBeUndefined());
  });

  it('"possui" e "conceda" NÃO são verbos, e é de propósito', () => {
    // São as formas que as magias de invocação usam para descrever a ficha do
    // invocado. Adotá-las daria os atributos dele a quem conjurou.
    expect(efeitosNoNivel(mag('A projeção possui 40 de energia heroica.'), 1)).toEqual({});
    expect(efeitosNoNivel(mag('Conceda ao morto-vivo 25 de energia física.'), 1)).toEqual({});
  });
});
