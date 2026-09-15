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
    // Desde 14/09/2026 todas as 58 do banco têm entrada (Provocar, o último
    // exemplo real, entrou no motor). O caminho segue existindo para chave
    // que o registro não conhece.
    expect(M.aplicarEfeitoTecnica(orig, { key: 'tecnica_sem_registro', nome: 'Sem Registro' }, 5)).toBe(orig);
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
  // higiene 7 (revisão final): a chave real do catálogo é `grupo_armas`, não
  // `grupo` — com a chave errada, grupoDaArma nunca resolvia o grupo da
  // arma (ficava null), e os casos abaixo passavam pelo ramo "arma sem
  // grupo" em vez de exercitar a comparação de verdade. `espada` de
  // propósito NÃO carrega `grupo_sigla`: só o catálogo pode resolver o
  // grupo aqui, pra este teste pegar a chave errada se ela voltar.
  const catalogos = { catalogoBySlug: { 'espada-longa': { grupo_armas: 'CM' } } };
  const espada = { slug: 'espada-longa' };

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

  // higiene 7: caso positivo de verdade — sem ele, os três casos acima
  // fecham sem NUNCA exercitar `grupos.includes(grupoArma)` retornando true.
  it('técnica com múltiplos grupos casa quando a arma pertence a um deles', () => {
    const lista = [{ key: 'defletir_ataque', grupo_armas: 'PL, PM, CM' }];
    expect(window.tecnicasCompativeisComArma(lista, espada, catalogos)).toHaveLength(1);
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

describe('registro de uso — o uso é do ATOR, não de aplicarEfeitoTecnica', () => {
  // C2 (revisão final, 09/09/2026): aplicarEfeitoTecnica NÃO marca mais o
  // uso — ela grava só o efeito no participante recebido, que nos dois
  // call sites de aplicarTeste é o DESTINO do efeito, nem sempre o ator
  // (Voz de Comando, Pressionar Oponente miram em outros). A versão antiga
  // chamava marcarTecnicaUsada sobre esse mesmo participante recebido:
  // Voz de Comando (Único, até 4 aliados) queimava a técnica dos QUATRO
  // ALVOS em vez do ator. O uso é anotado à parte pelos dois aplicarTeste,
  // sempre sobre o TESTADOR — ver marcarTecnicaUsada, abaixo.
  it('aplicarEfeitoTecnica NÃO toca tecnicas_usadas', () => {
    const p = M.aplicarEfeitoTecnica(lutador(), { key: 'furia', nome: 'Fúria' }, 5);
    expect(p.tecnicas_usadas).toEqual([]);
  });

  it('aplicar num alvo não suja o tecnicas_usadas do alvo (regressão do bug de Voz de Comando)', () => {
    const alvo = lutador({ inst_id: 'alvo1', nome: 'Alvo' });
    const depois = M.aplicarEfeitoTecnica(
      alvo, { key: 'voz_de_comando', nome: 'Voz de Comando', uso: 'Único' }, 3
    );
    expect(depois.tecnicas_usadas).toEqual([]);
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

// A regra mudou duas vezes, e este bloco guarda a segunda versão:
//
//   09/09/2026 (Fase 1): só modo 'total' era livre; modo 'teste' pagava PA.
//   10/09/2026 (Fase 2): QUALQUER técnica com entrada no registro é livre,
//     de qualquer modo, mantido o teto de 1 por rodada.
//
// As expectativas de Sangramento abaixo mudaram por causa disso — é mudança
// de regra pedida pelo usuário, não regressão. Técnica SEM entrada no
// registro continua pagando 1 PA, e é ela que passou a guardar esse caminho.
describe('debitarCustoTecnica — ativação livre de qualquer modo registrado', () => {
  it('modo total não debita PA e marca a flag', () => {
    const p = M.debitarCustoTecnica(lutador({ pa_rest: 2 }), 'mira');
    expect(p.pa_rest).toBe(2);
    expect(p.tecnica_livre_usada).toBe(true);
  });

  it('modo teste (sangramento) TAMBÉM é livre desde a Fase 2', () => {
    const p = M.debitarCustoTecnica(lutador({ pa_rest: 2 }), 'sangramento');
    expect(p.pa_rest, 'não debita mais PA').toBe(2);
    expect(p.tecnica_livre_usada, 'passou a consumir a cota').toBe(true);
  });

  it('técnica sem entrada no registro (Fase 2, narrativa) debita 1 PA — comportamento de antes', () => {
    const p = M.debitarCustoTecnica(lutador({ pa_rest: 2 }), 'tecnica_sem_registro');
    expect(p.pa_rest).toBe(1);
  });

  // Usava 'sangramento', que desde a Fase 2 não debita nada — o teste
  // passaria sem exercitar o piso. Trocado para uma técnica SEM entrada no
  // registro, que é o único caminho que ainda debita.
  it('PA no piso 0 não vira negativo', () => {
    const p = M.debitarCustoTecnica(lutador({ pa_rest: 0 }), 'tecnica_sem_registro');
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

  it('sangramento (modo teste) PASSOU a disputar a cota na Fase 2', () => {
    const p = lutador({ tecnica_livre_usada: true });
    expect(M.podeAtivarTecnicaLivre(p, { key: 'sangramento' }))
      .toEqual({ pode: false, motivo: 'livre_usada' });
  });

  it('técnica sem entrada no registro nunca disputa a cota', () => {
    const p = lutador({ tecnica_livre_usada: true });
    expect(M.podeAtivarTecnicaLivre(p, { key: 'tecnica_sem_registro' }).pode).toBe(true);
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

// Fecha a lacuna relatada pelo jogador: "usou Esquiva → Falha Crítica (col 11,
// d20 1)" não dizia NADA sobre o efeito — indistinguível de "aplicou" ou "não
// tem automação". textoEfeitoTecnica é o complemento que os dois aplicarTeste
// (Mestre e Jogador) anexam ao texto da Central de Mensagens quando
// tipo_teste === 'tecnica'. Três ramos: aplicado / teste falhou / narrativa.
describe('textoEfeitoTecnica — complemento da Central de Mensagens', () => {
  it('efeito aplicado no próprio ator: mostra o valor com sinal, sem nome (alvo = self)', () => {
    const aplicado = { key: 'mira', valor: 7, alvos: ['Lysandra'] };
    expect(M.textoEfeitoTecnica('mira', aplicado, 'Lysandra'))
      .toBe(' — efeito aplicado: +7');
  });

  it('debuff em inimigo: sinal negativo do registro vira valor negativo, com o nome do alvo', () => {
    // expectativa é modo 'total', alvo 'inimigo', sinal -1 — mesmo par que
    // aplicarEfeitoTecnica grava (ver describe de gravação acima).
    const aplicado = { key: 'expectativa', valor: 6, alvos: ['Lobisomem'] };
    expect(M.textoEfeitoTecnica('expectativa', aplicado, 'Lysandra'))
      .toBe(' — efeito aplicado em Lobisomem: -6');
  });

  it('modo teste (Sangramento): usa o valor FIXO do registro, não o total rolado', () => {
    // payload.valor_total do d20 pode ser qualquer coisa (ex. 15) — o dano
    // por rodada gravado é sempre 1 (ver aplicarEfeitoTecnica). A mensagem
    // tem que mostrar o valor que FOI gravado, não o total do teste.
    const aplicado = { key: 'sangramento', valor: 15, alvos: ['Lobisomem'] };
    expect(M.textoEfeitoTecnica('sangramento', aplicado, 'Lysandra'))
      .toBe(' — efeito aplicado em Lobisomem: +1');
  });

  it('vários alvos (Voz de Comando): junta os nomes', () => {
    const aplicado = { key: 'voz_de_comando', valor: 3, alvos: ['Aliado A', 'Aliado B'] };
    expect(M.textoEfeitoTecnica('voz_de_comando', aplicado, 'Lysandra'))
      .toBe(' — efeito aplicado em Aliado A, Aliado B: +3');
  });

  it('técnica COM registro mas o teste falhou (efeito null): diz que não aplicou', () => {
    expect(M.textoEfeitoTecnica('sangramento', null, 'Lysandra'))
      .toBe(' — efeito não aplicado (teste falhou)');
  });

  it('técnica SEM registro (Fase 2/narrativa, ex. Concentração): efeito narrativo', () => {
    expect(M.textoEfeitoTecnica('tecnica_sem_registro', null, 'Lysandra')).toBe(' — efeito narrativo, resolva na mesa');
  });

  it('chave desconhecida (defensivo): trata como narrativa, não lança', () => {
    expect(() => M.textoEfeitoTecnica('nao_existe_xyz', null, 'Lysandra')).not.toThrow();
    expect(M.textoEfeitoTecnica('nao_existe_xyz', null, 'Lysandra'))
      .toBe(' — efeito narrativo, resolva na mesa');
  });
});

describe('o 2º ponto base só paga TÉCNICA — regra de 12/09/2026', () => {
  /* Guerreiro e Ladino especializados seguem com duas ações, mas a segunda
     serve só para técnica de combate. Arma, magia, habilidade e item saem da
     primeira. A ação extra por velocidade > 30 é livre para todos e NÃO entra
     nesta restrição.

     O pool é próprio (pa_tecnica_rest) porque um número só não conseguiria
     dizer que um dos pontos é restrito: com pa_rest 2, o Guerreiro
     especializado atacaria duas vezes por rodada. */
  const guerreiro = (over = {}) => ({
    inst_id: 'g1', tipo: 'pj', status: 'ativo', status_temp: [],
    pa_max: 1, pa_rest: 1, pa_tecnica_max: 1, pa_tecnica_rest: 1, vb: 10, ...over,
  });
  // Técnica FORA do registro: paga PA. As do registro são ativação livre.
  const KEY_PAGA = 'tecnica_inexistente_no_registro';

  it('a técnica gasta o ponto EXCLUSIVO primeiro, preservando o livre', () => {
    // Gastar o livre primeiro desperdiçaria o restrito, que não serve para
    // mais nada e não acumula entre rodadas.
    const r = M.debitarCustoTecnica(guerreiro(), KEY_PAGA);
    expect(r.pa_tecnica_rest).toBe(0);
    expect(r.pa_rest).toBe(1);
  });

  it('esgotado o exclusivo, a técnica passa a pagar do livre', () => {
    const r = M.debitarCustoTecnica(guerreiro({ pa_tecnica_rest: 0 }), KEY_PAGA);
    expect(r.pa_rest).toBe(0);
  });

  it('quem NÃO é especializado sempre paga do livre', () => {
    const mago = guerreiro({ pa_tecnica_max: 0, pa_tecnica_rest: 0 });
    expect(M.debitarCustoTecnica(mago, KEY_PAGA).pa_rest).toBe(0);
  });

  /* Regra do usuário (13/09/2026): "Ao acabar o PA, pode passar a vez
     automático" — e, perguntado sobre o ponto de técnica que sobra: "Passar
     mesmo assim". Quem quer usar o ponto de técnica usa ANTES de gastar o
     último PA, mesma lógica da técnica gratuita. Até aqui o ponto segurava a
     vez (o teste dizia o contrário). */
  it('o ponto de técnica NÃO segura a vez: PA normal zerado, a vez passa', () => {
    expect(M.temAcaoRestante(guerreiro({ pa_rest: 0 }))).toBe(false);
  });

  it('com PA normal sobrando, o ponto de técnica continua utilizável', () => {
    expect(M.temAcaoRestante(guerreiro({ pa_rest: 1 }))).toBe(true);
  });

  it('sem PA livre E sem ponto de técnica, não há ação', () => {
    expect(M.temAcaoRestante(guerreiro({ pa_rest: 0, pa_tecnica_rest: 0 }))).toBe(false);
  });

  it('o ponto de técnica volta cheio na virada, e NÃO acumula', () => {
    const gasto = guerreiro({ pa_rest: 0, pa_tecnica_rest: 0 });
    expect(M.processarViradaDeRodada(gasto).participante.pa_tecnica_rest).toBe(1);
    const inteiro = guerreiro();
    expect(M.processarViradaDeRodada(inteiro).participante.pa_tecnica_rest).toBe(1);
  });

  it('o ponto de técnica NÃO paga ataque de arma', () => {
    // debitarCustoAtaque nem conhece o pool: tira do pa_rest, como sempre.
    const r = M.debitarCustoAtaque(guerreiro(), 'arma', 0);
    expect(r.pa_rest).toBe(0);
    expect(r.pa_tecnica_rest).toBe(1);
  });

  it('a ação extra por VELOCIDADE é livre, e soma ao ponto de técnica', () => {
    // Guerreiro especializado e veloz: 1 livre + 1 de velocidade + 1 de técnica.
    const veloz = guerreiro({ vb: 35, pa_rest: 0, pa_tecnica_rest: 0 });
    const r = M.processarViradaDeRodada(veloz).participante;
    expect(r.pa_rest).toBe(2);
    expect(r.pa_tecnica_rest).toBe(1);
  });

  it('criatura nunca tem o ponto de técnica', () => {
    const cri = { inst_id: 'c1', tipo: 'criatura', status: 'ativo', status_temp: [],
                  pa_max: 1, pa_rest: 1, pa_tecnica_max: 0, pa_tecnica_rest: 0, vb: 10 };
    expect(M.processarViradaDeRodada(cri).participante.pa_tecnica_rest).toBe(0);
  });
});
