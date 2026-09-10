/* ============================================================
   tecnica-efeitos.test.js — aplicação dos efeitos de técnica
   ============================================================
   Cobre a Task 3 (gravação) e as Tasks 4-7 (consumo e expiração).
   As tasks seguintes ACRESCENTAM describes aqui; não recriar o arquivo.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/tecnicas-efeito.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';   // processarViradaDeRodada usa movimentoBase

let M;
beforeAll(() => {
  M = window.MotorBatalha;
  expect(M.aplicarEfeitoTecnica).toBeTypeOf('function');
});

// Participante mínimo no shape que montarSnapshots produz.
function lutador(over = {}) {
  return {
    inst_id: 'i1', tipo: 'pj', ref_id: 1, nome: 'Teste', ordem: 1,
    vb: 10, pa_max: 1, pa_rest: 1,
    eh: 20, eh_max: 20, ar: 5, ar_max: 5, ef: 30, ef_max: 30,
    defesa_valor: 12, rf: 8, rm: 6,
    status: 'ativo', status_temp: [], tecnicas_usadas: [],
    ...over,
  };
}

describe('aplicarEfeitoTecnica — gravação', () => {
  it('modo total grava um status_temp com o valor recebido', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 7);
    expect(p.status_temp).toHaveLength(1);
    const st = p.status_temp[0];
    expect(st.id).toBe('tec_mira');
    expect(st.nome).toBe('Mira');
    expect(st.icone).toBe('🎯');
    expect(st.rodadas_rest).toBe(1);
    expect(st.efeito).toEqual({ tipo: 'mod_ataque', valor: 7 });
  });

  it('não muta o participante recebido', () => {
    const orig = lutador();
    const p = M.aplicarEfeitoTecnica(orig, { key: 'mira', nome: 'Mira' }, 7);
    expect(orig.status_temp).toHaveLength(0);
    expect(p).not.toBe(orig);
  });

  it('sinal negativo vira valor negativo (debuff no adversário)', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'expectativa', nome: 'Expectativa' }, 6);
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'mod_vb', valor: -6 });
  });

  it('Fúria grava os quatro efeitos de uma vez, sob o mesmo id', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.status_temp).toHaveLength(4);
    expect(p.status_temp.every((s) => s.id === 'tec_furia')).toBe(true);
    expect(p.status_temp.map((s) => s.efeito.tipo).sort())
      .toEqual(['mod_ataque', 'mod_eh_temp', 'mod_rf', 'mod_rm'].sort());
    expect(p.status_temp.every((s) => s.efeito.valor === 5)).toBe(true);
  });

  it('Postura Defensiva grava +defesa e −ataque com o mesmo total', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'postura_defensiva', nome: 'Postura Defensiva' }, 4);
    const porTipo = Object.fromEntries(p.status_temp.map((s) => [s.efeito.tipo, s.efeito.valor]));
    expect(porTipo).toEqual({ mod_defesa: 4, mod_ataque: -4 });
  });

  it('modo teste usa o valor FIXO do registro, não o total da técnica', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'sangramento', nome: 'Sangramento' }, 99);
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'dano_por_rodada', valor: 1 });
    expect(p.status_temp[0].rodadas_rest).toBe(5);
  });

  it('copia a restrição de arma do banco para o efeito', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'pugilato', nome: 'Pugilato', grupo_armas: 'CD' }, 3);
    expect(p.status_temp[0].efeito).toEqual({ tipo: 'mod_ataque', valor: 3, grupos: ['CD'] });
  });

  it('quebra a lista CSV do banco em grupos', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'mira', nome: 'Mira', grupo_armas: 'PL, PM, PP' }, 5);
    expect(p.status_temp[0].efeito.grupos).toEqual(['PL', 'PM', 'PP']);
  });

  it('"Livre" e vazio não viram restrição', () => {
    const livre = M.aplicarEfeitoTecnica(
      lutador(), { key: 'furia', nome: 'Fúria', grupo_armas: 'Livre' }, 5);
    expect(livre.status_temp.find((s) => s.efeito.tipo === 'mod_ataque').efeito.grupos)
      .toBeUndefined();
    const vazio = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 5);
    expect(vazio.status_temp[0].efeito.grupos).toBeUndefined();
  });

  it('técnica sem entrada no mapa devolve o participante intacto', () => {
    const orig = lutador();
    expect(M.aplicarEfeitoTecnica(orig, { key: 'golpe_duplo', nome: 'Golpe Duplo' }, 5)).toBe(orig);
  });
});

describe('aplicarEfeitoTecnica — reaplicar NÃO acumula', () => {
  it('a segunda aplicação renova a duração e mantém um único status', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'ajustar_disparo', nome: 'Ajustar Disparo' }, 6);
    p = { ...p, status_temp: p.status_temp.map((s) => ({ ...s, rodadas_rest: 1 })) }; // uma rodada já passou
    p = M.aplicarEfeitoTecnica(p, { key: 'ajustar_disparo', nome: 'Ajustar Disparo' }, 6);
    expect(p.status_temp).toHaveLength(1);
    expect(p.status_temp[0].rodadas_rest).toBe(2);
    expect(p.status_temp[0].efeito.valor).toBe(6);   // 6, não 12
  });

  it('reaplicar com total diferente usa o total NOVO', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 4);
    p = M.aplicarEfeitoTecnica(p, { key: 'mira', nome: 'Mira' }, 9);
    expect(p.status_temp).toHaveLength(1);
    expect(p.status_temp[0].efeito.valor).toBe(9);
  });

  it('reaplicar uma combinada troca os quatro, não vira oito', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    p = M.aplicarEfeitoTecnica(p, { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.status_temp).toHaveLength(4);
  });

  it('técnicas diferentes convivem', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 4);
    p = M.aplicarEfeitoTecnica(p, { key: 'defletir_ataque', nome: 'Defletir Ataque' }, 3);
    expect(p.status_temp).toHaveLength(2);
    expect(p.status_temp.map((s) => s.id).sort()).toEqual(['tec_defletir_ataque', 'tec_mira']);
  });

  // A Falha Crítica e as magias de apoio escrevem no MESMO array.
  it('não pisa em status de outra origem', () => {
    const comFC = lutador({ status_temp: [
      { id: 'fc_defesa', nome: 'Defesa −5', icone: '🛡️', rodadas_rest: null, efeito: { tipo: 'mod_defesa', valor: -5 } },
    ] });
    const p = M.aplicarEfeitoTecnica(comFC, { key: 'mira', nome: 'Mira' }, 4);
    expect(p.status_temp).toHaveLength(2);
    expect(p.status_temp[0].id).toBe('fc_defesa');
  });
});

describe('somaModAtaque', () => {
  it('soma o mod_ataque sem grupo para qualquer arma', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 7);
    expect(M.somaModAtaque(p, 'CM')).toBe(7);
    expect(M.somaModAtaque(p, 'PL')).toBe(7);
    expect(M.somaModAtaque(p, null)).toBe(7);
  });

  it('mod_ataque COM restrição só vale para os grupos daquela técnica', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'pugilato', nome: 'Pugilato', grupo_armas: 'CD' }, 3);
    expect(M.somaModAtaque(p, 'CD')).toBe(3);
    expect(M.somaModAtaque(p, 'CM')).toBe(0);
    expect(M.somaModAtaque(p, null)).toBe(0);
  });

  it('vale para qualquer grupo da lista', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'mira', nome: 'Mira', grupo_armas: 'PL, PM, PP' }, 5);
    expect(M.somaModAtaque(p, 'PL')).toBe(5);
    expect(M.somaModAtaque(p, 'PP')).toBe(5);
    expect(M.somaModAtaque(p, 'CM')).toBe(0);
  });

  // O caso que motiva a lista viajar no efeito: ativar com arco, trocar de arma.
  it('trocar para arma fora da lista derruba o bônus sem apagar o status', () => {
    const p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'mira', nome: 'Mira', grupo_armas: 'PL, PM, PP' }, 5);
    expect(M.somaModAtaque(p, 'CM')).toBe(0);
    expect(p.status_temp).toHaveLength(1);   // o buff continua correndo
  });

  it('acumula técnicas diferentes na mesma coluna', () => {
    let p = M.aplicarEfeitoTecnica(
      lutador(), { key: 'furia', nome: 'Fúria', grupo_armas: 'Livre' }, 7);
    p = M.aplicarEfeitoTecnica(p, { key: 'pugilato', nome: 'Pugilato', grupo_armas: 'CD' }, 3);
    expect(M.somaModAtaque(p, 'CD')).toBe(10);
    expect(M.somaModAtaque(p, 'CM')).toBe(7);
  });

  it('debuff de Resguardar entra negativo', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'resguardar', nome: 'Resguardar' }, 5);
    expect(M.somaModAtaque(p, 'CM')).toBe(-5);
  });

  it('participante sem status_temp devolve 0', () => {
    expect(M.somaModAtaque(lutador(), 'CM')).toBe(0);
    expect(M.somaModAtaque({}, 'CM')).toBe(0);
  });

  // A separação que justifica a primitiva existir: o −7 da Falha Crítica
  // (mod_coluna) pune TODA ação; o bônus da técnica é só de ataque.
  it('não confunde mod_ataque com o mod_coluna da Falha Crítica', () => {
    const comFC = lutador({ status_temp: [
      { id: 'fc_acoes', nome: 'Ações −7', icone: '🤕', rodadas_rest: null, efeito: { tipo: 'mod_coluna', valor: -7 } },
    ] });
    expect(M.somaModAtaque(comFC, 'CM')).toBe(0);
    expect(M.somaEfeitosStatus(comFC, 'mod_coluna')).toBe(-7);
  });
});

describe('resistências efetivas', () => {
  it('Resistência à Dor sobe a RF e não toca a RM', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'resistencia_a_dor', nome: 'Resistência à Dor' }, 4);
    expect(M.rfEfetivo(p)).toBe(12);   // 8 + 4
    expect(M.rmEfetivo(p)).toBe(6);
  });

  it('Resistência Extrema sobe a RM e não toca a RF', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'resistencia_extrema', nome: 'Resistência Extrema' }, 3);
    expect(M.rmEfetivo(p)).toBe(9);    // 6 + 3
    expect(M.rfEfetivo(p)).toBe(8);
  });

  it('Fúria sobe as duas de uma vez', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(M.rfEfetivo(p)).toBe(13);
    expect(M.rmEfetivo(p)).toBe(11);
  });

  it('sem status, devolve o valor cru do snapshot', () => {
    expect(M.rfEfetivo(lutador())).toBe(8);
    expect(M.rmEfetivo(lutador())).toBe(6);
  });

  // resolverResistencia só aceita 1..20; a efetiva não pode furar o piso.
  it('nunca desce abaixo de 1', () => {
    const p = lutador({ rf: 2, status_temp: [
      { id: 'x', nome: 'x', icone: '🔻', rodadas_rest: 1, efeito: { tipo: 'mod_rf', valor: -10 } },
    ] });
    expect(M.rfEfetivo(p)).toBe(1);
  });
});

describe('danoComModMax', () => {
  it('Posicionamento subtrai o total do dano sofrido pelo alvo', () => {
    const alvo = M.aplicarEfeitoTecnica(lutador(), { key: 'posicionamento', nome: 'Posicionamento' }, 6);
    expect(M.danoComModMax(20, alvo)).toBe(14);
  });

  it('nunca vira cura: piso 0', () => {
    const alvo = M.aplicarEfeitoTecnica(lutador(), { key: 'posicionamento', nome: 'Posicionamento' }, 30);
    expect(M.danoComModMax(5, alvo)).toBe(0);
  });

  it('alvo sem o status recebe o dano cheio', () => {
    expect(M.danoComModMax(20, lutador())).toBe(20);
  });

  it('dano 0 continua 0', () => {
    expect(M.danoComModMax(0, lutador())).toBe(0);
  });
});

describe('mod_eh_temp — EH temporária por cima do teto', () => {
  it('a aplicação sobe eh E eh_max', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    expect(p.eh).toBe(32);       // 20 + 12
    expect(p.eh_max).toBe(32);
  });

  it('reaplicar não empilha o empréstimo', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    p = M.aplicarEfeitoTecnica(p, { key: 'heroismo', nome: 'Heroísmo' }, 12);
    expect(p.eh_max).toBe(32);   // 32, não 44
    expect(p.status_temp).toHaveLength(1);
  });

  it('Fúria empresta EH junto com os outros três efeitos', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.eh).toBe(25);
    expect(p.eh_max).toBe(25);
  });

  it('na expiração devolve o teto e o valor não gasto', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'animosidade', nome: 'Animosidade' }, 10);
    const fim = M.expirarEhTemp(p, p.status_temp);
    expect(fim.eh_max).toBe(20);
    expect(fim.eh).toBe(20);
  });

  it('quem gastou o bônus não fica com EH negativa nem perde EH própria', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'animosidade', nome: 'Animosidade' }, 10);
    const fim = M.expirarEhTemp({ ...p, eh: 4 }, p.status_temp);
    expect(fim.eh_max).toBe(20);
    expect(fim.eh).toBe(4);      // não vira -6
  });

  it('EH acima do teto restaurado é aparada até ele', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'animosidade', nome: 'Animosidade' }, 10);
    const fim = M.expirarEhTemp({ ...p, eh: 30 }, p.status_temp);
    expect(fim.eh_max).toBe(20);
    expect(fim.eh).toBe(20);
  });

  it('sem status removido, não devolve nada', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    expect(M.expirarEhTemp(p, [])).toBe(p);
  });
});

describe('mod_eh_temp na virada de rodada', () => {
  it('a EH emprestada some sozinha quando a duração acaba', () => {
    // Animosidade dura 2 rodadas: sobrevive à 1ª virada, morre na 2ª.
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'animosidade', nome: 'Animosidade' }, 10);
    expect(p.eh_max).toBe(30);

    p = M.processarViradaDeRodada(p).participante;
    expect(p.eh_max, 'sobrevive à primeira virada').toBe(30);

    p = M.processarViradaDeRodada(p).participante;
    expect(p.eh_max, 'expira na segunda virada').toBe(20);
    expect(p.status_temp).toHaveLength(0);
  });

  it('status de OUTRA técnica que só decrementou não devolve EH', () => {
    // Regressão: comparar `antes`/`depois` por referência classificava como
    // removido todo status decrementado, porque decrementarStatusTemp recria
    // o objeto via spread mesmo quando ele sobrevive. Heroísmo dura 5 rodadas:
    // depois de uma virada ainda está vivo e não pode ter devolvido nada.
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    expect(p.eh_max).toBe(32);
    p = M.processarViradaDeRodada(p).participante;
    expect(p.eh_max, 'Heroísmo ainda vivo, EH emprestada intacta').toBe(32);
    expect(p.status_temp).toHaveLength(1);
  });
});

describe('gruposDeArma — parser das colunas do banco', () => {
  it('quebra o CSV em lista', () => {
    expect(M.gruposDeArma('PL, PM, PP')).toEqual(['PL', 'PM', 'PP']);
    expect(M.gruposDeArma('CD')).toEqual(['CD']);
    expect(M.gruposDeArma('L, M')).toEqual(['L', 'M']);
  });

  // O bug que este parser existe pra não repetir: 'Livre' é truthy, então
  // `!col` não o pega, e tecnicasCompativeisComArma escondia 31 técnicas.
  it('"Livre" significa sem restrição, não um grupo chamado Livre', () => {
    expect(M.gruposDeArma('Livre')).toBeNull();
    expect(M.gruposDeArma('livre')).toBeNull();
    expect(M.gruposDeArma('  Livre  ')).toBeNull();
  });

  it('vazio, null e undefined também são sem restrição', () => {
    expect(M.gruposDeArma('')).toBeNull();
    expect(M.gruposDeArma(null)).toBeNull();
    expect(M.gruposDeArma(undefined)).toBeNull();
  });
});

describe('tecnicaPermitida', () => {
  const arco    = { slug: 'arco-curto', grupo_sigla: 'PL' };
  const espada  = { slug: 'espada-longa', grupo_sigla: 'CM' };
  const leve    = lutador({ defesa_sigla: 'L' });
  const pesada  = lutador({ defesa_sigla: 'P' });

  it('libera técnica Livre/Livre com qualquer arma e armadura', () => {
    const t = { key: 'furia', grupo_armas: 'Livre', grupo_armaduras: 'Livre' };
    expect(M.tecnicaPermitida(t, pesada, espada)).toEqual({ pode: true, motivo: null });
  });

  it('bloqueia por arma fora do grupo', () => {
    const t = { key: 'mira', grupo_armas: 'PL, PM, PP', grupo_armaduras: 'Livre' };
    expect(M.tecnicaPermitida(t, leve, arco).pode).toBe(true);
    expect(M.tecnicaPermitida(t, leve, espada)).toEqual({ pode: false, motivo: 'arma' });
  });

  it('bloqueia por armadura fora do grupo', () => {
    // Posicionamento exige armadura L.
    const t = { key: 'posicionamento', grupo_armas: 'Livre', grupo_armaduras: 'L' };
    expect(M.tecnicaPermitida(t, leve, espada).pode).toBe(true);
    expect(M.tecnicaPermitida(t, pesada, espada)).toEqual({ pode: false, motivo: 'armadura' });
  });

  it('Postura Defensiva exige armadura média ou pesada', () => {
    const t = { key: 'postura_defensiva', grupo_armas: 'Livre', grupo_armaduras: 'M, P' };
    expect(M.tecnicaPermitida(t, pesada, espada).pode).toBe(true);
    expect(M.tecnicaPermitida(t, leve, espada)).toEqual({ pode: false, motivo: 'armadura' });
  });

  it('a arma é checada antes da armadura quando as duas falham', () => {
    const t = { key: 'x', grupo_armas: 'CD', grupo_armaduras: 'L' };
    expect(M.tecnicaPermitida(t, pesada, espada)).toEqual({ pode: false, motivo: 'arma' });
  });

  // Técnica de buff puro é ativada sem arma selecionada na aba.
  it('sem arma, só a restrição de armadura vale', () => {
    const livre = { key: 'furia', grupo_armas: 'Livre', grupo_armaduras: 'Livre' };
    expect(M.tecnicaPermitida(livre, leve, null).pode).toBe(true);
    const exigeArma = { key: 'mira', grupo_armas: 'PL, PM, PP', grupo_armaduras: 'Livre' };
    expect(M.tecnicaPermitida(exigeArma, leve, null)).toEqual({ pode: false, motivo: 'arma' });
  });
});

describe('tecnicasCompativeisComArma — regressão do "Livre"', () => {
  const catalogos = { catalogoBySlug: { 'espada-longa': { grupo: 'CM' } } };
  const espada = { slug: 'espada-longa', grupo_sigla: 'CM' };

  // 31 das 58 técnicas têm grupo_armas 'Livre' e sumiam do dropdown do ataque.
  it('técnica "Livre" aparece para qualquer arma', () => {
    const lista = [{ key: 'furia', grupo_armas: 'Livre' }];
    expect(window.tecnicasCompativeisComArma(lista, espada, catalogos)).toHaveLength(1);
  });

  it('técnica específica continua filtrada', () => {
    const lista = [{ key: 'mira', grupo_armas: 'PL, PM, PP' }];
    expect(window.tecnicasCompativeisComArma(lista, espada, catalogos)).toHaveLength(0);
  });

  it('sem arma, sobram as sem restrição', () => {
    const lista = [{ key: 'furia', grupo_armas: 'Livre' }, { key: 'mira', grupo_armas: 'PL, PM' }];
    const r = window.tecnicasCompativeisComArma(lista, null, catalogos);
    expect(r.map((t) => t.key)).toEqual(['furia']);
  });
});

describe('podeUsarTecnica — uso Único', () => {
  it('libera técnica Intermitente já usada', () => {
    const p = lutador({ tecnicas_usadas: ['mira'] });
    expect(M.podeUsarTecnica(p, { key: 'mira', uso: 'Intermitente' }))
      .toEqual({ pode: true, motivo: null });
  });

  it('libera técnica Livre já usada', () => {
    const p = lutador({ tecnicas_usadas: ['resguardar'] });
    expect(M.podeUsarTecnica(p, { key: 'resguardar', uso: 'Livre' }).pode).toBe(true);
  });

  it('bloqueia técnica Única já usada nesta batalha', () => {
    const p = lutador({ tecnicas_usadas: ['furia'] });
    expect(M.podeUsarTecnica(p, { key: 'furia', uso: 'Único' }))
      .toEqual({ pode: false, motivo: 'ja_usada' });
  });

  it('libera técnica Única ainda não usada', () => {
    expect(M.podeUsarTecnica(lutador(), { key: 'furia', uso: 'Único' }).pode).toBe(true);
  });

  it('participante sem tecnicas_usadas não quebra', () => {
    expect(M.podeUsarTecnica({}, { key: 'furia', uso: 'Único' }).pode).toBe(true);
  });
});

describe('registro de uso', () => {
  it('aplicarEfeitoTecnica anota a key em tecnicas_usadas', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.tecnicas_usadas).toContain('furia');
  });

  it('não duplica a key ao reaplicar', () => {
    let p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 4);
    p = M.aplicarEfeitoTecnica(p, { key: 'mira', nome: 'Mira' }, 4);
    expect(p.tecnicas_usadas.filter((k) => k === 'mira')).toHaveLength(1);
  });

  // O uso é do ATOR; o efeito pode cair só no alvo (Voz de Comando,
  // Pressionar Oponente). Por isso marcarTecnicaUsada é chamada à parte.
  it('marcarTecnicaUsada anota sem tocar em status_temp', () => {
    const p = M.marcarTecnicaUsada(lutador(), 'voz_de_comando');
    expect(p.tecnicas_usadas).toEqual(['voz_de_comando']);
    expect(p.status_temp).toHaveLength(0);
  });

  it('marcarTecnicaUsada é idempotente e devolve o mesmo objeto se nada muda', () => {
    const p = M.marcarTecnicaUsada(lutador(), 'furia');
    expect(M.marcarTecnicaUsada(p, 'furia')).toBe(p);
  });
});

// REGRA NOVA (revisão final, 09/09/2026): ativação de técnica modo 'total'
// (23 das 24) passa a custar 0 PA, com teto de 1 ativação livre por rodada
// por combatente. modo 'teste' (só Sangramento) continua custando 1 PA — o
// próprio PA já o limita.
describe('debitarCustoTecnica — ativação livre de modo "total"', () => {
  it('modo total não debita PA e marca a flag', () => {
    const p = M.debitarCustoTecnica(lutador({ pa_rest: 2 }), 'mira');
    expect(p.pa_rest).toBe(2);
    expect(p.tecnica_livre_usada).toBe(true);
  });

  it('modo teste (sangramento) debita 1 PA e não toca a flag', () => {
    const p = M.debitarCustoTecnica(lutador({ pa_rest: 2 }), 'sangramento');
    expect(p.pa_rest).toBe(1);
    expect(p.tecnica_livre_usada).toBeUndefined();
  });

  it('técnica sem entrada no registro (Fase 2, narrativa) debita 1 PA — comportamento de antes', () => {
    const p = M.debitarCustoTecnica(lutador({ pa_rest: 2 }), 'golpe_duplo');
    expect(p.pa_rest).toBe(1);
  });

  it('PA no piso 0 não vira negativo', () => {
    const p = M.debitarCustoTecnica(lutador({ pa_rest: 0 }), 'sangramento');
    expect(p.pa_rest).toBe(0);
  });
});

describe('podeAtivarTecnicaLivre — teto de 1 ativação livre por rodada', () => {
  it('libera a primeira ativação de modo total', () => {
    expect(M.podeAtivarTecnicaLivre(lutador(), { key: 'mira' }).pode).toBe(true);
  });

  it('bloqueia a segunda ativação de modo total na mesma rodada', () => {
    const p = lutador({ tecnica_livre_usada: true });
    expect(M.podeAtivarTecnicaLivre(p, { key: 'furia' }))
      .toEqual({ pode: false, motivo: 'livre_usada' });
  });

  it('sangramento (modo teste) nunca disputa a cota — livre mesmo com a flag marcada', () => {
    const p = lutador({ tecnica_livre_usada: true });
    expect(M.podeAtivarTecnicaLivre(p, { key: 'sangramento' }).pode).toBe(true);
  });

  it('técnica sem entrada no registro nunca disputa a cota', () => {
    const p = lutador({ tecnica_livre_usada: true });
    expect(M.podeAtivarTecnicaLivre(p, { key: 'golpe_duplo' }).pode).toBe(true);
  });
});

describe('processarViradaDeRodada zera tecnica_livre_usada', () => {
  it('a virada devolve a ativação livre — mesmo padrão de moveu_na_rodada', () => {
    const p = lutador({ status: 'ativo', vb: 10, pa_max: 1, tecnica_livre_usada: true });
    const { participante } = M.processarViradaDeRodada(p);
    expect(participante.tecnica_livre_usada).toBe(false);
  });

  it('quem não está ativo não recupera a cota', () => {
    const p = lutador({ status: 'desmaiado', vb: 10, pa_max: 1, tecnica_livre_usada: true });
    const { participante } = M.processarViradaDeRodada(p);
    expect(participante.tecnica_livre_usada).toBe(true);
  });
});

// I3 (revisão final): remover o chip à mão pulava expirarEhTemp — cancelar
// Heroísmo/Fúria/Animosidade/Segundo Fôlego pelo chip deixava o eh_max
// inflado pelo resto da batalha.
describe('removerStatusTempParticipante — devolve a EH ao remover pelo chip', () => {
  it('remove um mod_eh_temp e devolve o eh_max ao teto de antes', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    expect(p.eh_max).toBe(32);   // 20 + 12
    const depois = M.removerStatusTempParticipante(p, 'tec_heroismo');
    expect(depois.eh_max).toBe(20);
    expect(depois.status_temp).toHaveLength(0);
  });

  it('quem já gastou o bônus não é punido duas vezes (piso 0 na EH)', () => {
    let p = M.aplicarEfeitoTecnica(lutador({ eh: 20, eh_max: 20 }), { key: 'heroismo', nome: 'Heroísmo' }, 12);
    p = { ...p, eh: 3 };   // gastou o bônus e mais um pouco, sobrou 3
    const depois = M.removerStatusTempParticipante(p, 'tec_heroismo');
    expect(depois.eh).toBe(3);
    expect(depois.eh_max).toBe(20);
  });

  it('id inexistente devolve null — o call site sabe que não há o que persistir', () => {
    expect(M.removerStatusTempParticipante(lutador(), 'nao_existe')).toBeNull();
  });

  it('remover um status sem mod_eh_temp não mexe em eh/eh_max', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'mira', nome: 'Mira' }, 5);
    const depois = M.removerStatusTempParticipante(p, 'tec_mira');
    expect(depois.status_temp).toHaveLength(0);
    expect(depois.eh_max).toBe(p.eh_max);
  });
});
