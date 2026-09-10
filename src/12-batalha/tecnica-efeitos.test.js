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
