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
                         // Fase 2: sem_acoes JÁ EXISTIA (Falha Crítica). A fase
                         // acrescenta produtores, não mecanismo.
                         'sem_acoes'];

  it('tem exatamente 28 entradas — 25 da Fase 1 + 3 de controle da Fase 2', () => {
    expect(Object.keys(MAP)).toHaveLength(28);
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

  it('as duas magias adiadas para a Fase 2 NÃO estão no mapa', () => {
    /* Licantropia mexe em atributo (atravessa calcularFicha inteira) e
       Oferenda modifica a PRÓXIMA magia — nenhuma das duas é status_temp.
       Spec §2.3. Se alguém as acrescentar sem a primitiva, este teste avisa. */
    expect(MAP.licantropia_lupina).toBeUndefined();
    expect(MAP.oferenda).toBeUndefined();
  });

  it('protecao_animal é a key de Aeroproteção — nome e chave divergem no banco', () => {
    // Documentado aqui porque é armadilha: quem procurar 'aeroprotecao' no
    // mapa não acha, e renomear a key quebraria pj.magias dos personagens.
    expect(MAP.protecao_animal).toBeDefined();
    expect(MAP.aeroprotecao).toBeUndefined();
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
    manipulacao_de_luz: 'Causa 4 de dano elemental de luz.',
    meteoros:           'Cada fragmento causa 12 de dano elemental da terra.',
    piromanipulacao:    'Causa 4 de dano elemental de fogo.',
    piroprotecao:       'Reduz 16 de dano elemental de fogo.',
    protecao_animal:    'Reduz 16 de dano elemental de ar.',
    raio_eletrico:      'Cada raio causa 12 de dano elemental fogo.',
    super_resistencia:  'Aumenta 1 de resistência física e 1 de resistência mágica.',
    toque_gelido:       'Cause 12 de dano base.',
    velocidade:         'Aumenta 2 de velocidade.',
    /* Fase 2 — as tres de CONTROLE. O texto do nivel delas NAO traz numero de
       efeito: traz duracao (Medo), teto de estagio (Esconjuracao) ou prosa
       (Sono). Por isso as entradas declaram `valor: true` em vez de
       `unidade`, e o acordo mapa-parser abaixo as pula. */
    medo:               'A magia tem duracao de 1 rodada.',
    esconjuracao:       'Afeta criaturas de estagio 1.',
    sono:               'Altera uma condicao do sono.',
  };

  it('a lista de conferência cobre as 25 entradas do mapa', () => {
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
    ['alucinacao', 'invisibilidade', 'ordens', 'possessao',
     'licantropia_lupina', 'oferenda'].forEach((k) => {
      expect(MAP[k], `${k} entrou no mapa sem a primitiva que precisa`).toBeUndefined();
    });
  });
});
