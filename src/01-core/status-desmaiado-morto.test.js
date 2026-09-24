/* ============================================================
   status-desmaiado-morto.test.js — o Mestre pode marcá-los à mão
   ============================================================
   "Falta adicionar todos os status possíveis na ficha, para o mestre alterar."
   (usuário, 20/09/2026) — escolhendo, entre as opções, incluir desmaiado e
   morto.

   O RISCO QUE ISTO CRIA, e como a spec o resolve: os dois já são DERIVADOS da
   vitalidade (EF no piso é morto; EF ou EH zerada é desmaiado). Marcar à mão
   cria um segundo dono da mesma verdade.

   A saída ELIMINA o conflito em vez de arbitrá-lo: não existe marca manual de
   "são/ativo". Derivado e manual nunca podem se contradizer — só coincidir. E
   quando coincidem, o card e a ficha mostram UM chip, não dois.

   A armadilha concreta que este arquivo trava: `statusAplicadoPeloMestre` tem
   um `return` final que trata QUALQUER tipo desconhecido como veneno. Sem
   ramos próprios, marcar "morto" produziria um status chamado "Envenenado"
   com dano por rodada — silenciosamente.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import './copy.jsx';
import './constants.jsx';
import './helpers.jsx';
import './inventario-helpers.jsx';
import './clima-desgaste.jsx';
import './game-data.jsx';
import './status-efeito.jsx';
import '../12-batalha/batalha.jsx';

let STATUS_MESTRE_TIPOS, statusAplicadoPeloMestre, tipoDoStatus, tb;
beforeAll(() => {
  ({ STATUS_MESTRE_TIPOS, statusAplicadoPeloMestre, tipoDoStatus } = globalThis);
  expect(STATUS_MESTRE_TIPOS, 'STATUS_MESTRE_TIPOS precisa estar no window').toBeTruthy();
  expect(statusAplicadoPeloMestre).toBeTypeOf('function');
  tb = globalThis.COPY.pt.batalha;
});

describe('o cardápio do Mestre ganhou os dois', () => {
  const tipos = () => STATUS_MESTRE_TIPOS.map((t) => t.tipo);

  it('desmaiado e morto estão na lista', () => {
    expect(tipos()).toContain('desmaiado');
    expect(tipos()).toContain('morto');
  });

  it('e os quatro de antes continuam', () => {
    for (const t of ['veneno', 'sangramento', 'ferido', 'caido']) {
      expect(tipos(), `${t} sumiu do cardápio`).toContain(t);
    }
  });

  /* Nenhum dos dois tem número: não há "dano por rodada" nem "colunas de
     penalidade" em estar desmaiado. O modal de prazo lê isto para não pedir um
     valor que não existe. */
  it('os dois são sem valor', () => {
    for (const t of ['desmaiado', 'morto']) {
      expect(STATUS_MESTRE_TIPOS.find((x) => x.tipo === t).semValor, `${t} devia ser semValor`).toBe(true);
    }
  });

  /* Mesmo cuidado do clima e do período: ícone inventado vira quadrado vazio
     na tela. Estes dois têm de usar os MESMOS desenhos da batalha. */
  it('os ícones são os do mapa da batalha', () => {
    const mapa = globalThis.ICONE_STATUS;
    expect(STATUS_MESTRE_TIPOS.find((x) => x.tipo === 'desmaiado').ic).toBe(mapa.desmaiado);
    expect(STATUS_MESTRE_TIPOS.find((x) => x.tipo === 'morto').ic).toBe(mapa.morto);
  });
});

describe('statusAplicadoPeloMestre reconhece os dois', () => {
  /* A ARMADILHA. O `return` final da fábrica é o veneno; sem ramo próprio,
     marcar "morto" viraria um "Envenenado" com dano por rodada. */
  it('morto não vira veneno', () => {
    const st = statusAplicadoPeloMestre('morto', null, 1, tb);
    expect(tipoDoStatus(st)).toBe('morto');
    expect(st.nome).toBe(tb.statusMorto);
    expect(st.efeito.tipo).not.toBe('dano_por_rodada');
  });

  it('desmaiado também não', () => {
    const st = statusAplicadoPeloMestre('desmaiado', null, 1, tb);
    expect(tipoDoStatus(st)).toBe('desmaiado');
    expect(st.nome).toBe(tb.statusDesmaiado);
    expect(st.efeito.tipo).not.toBe('dano_por_rodada');
  });

  /* Quem está desmaiado ou morto não age — o mesmo efeito do "caído", que a
     batalha já sabe resolver. */
  it('os dois tiram as ações do combatente', () => {
    expect(statusAplicadoPeloMestre('morto', null, 1, tb).efeito.tipo).toBe('sem_acoes');
    expect(statusAplicadoPeloMestre('desmaiado', null, 1, tb).efeito.tipo).toBe('sem_acoes');
  });

  it('e o veneno continua sendo o veneno', () => {
    const st = statusAplicadoPeloMestre('veneno', 3, 1, tb);
    expect(tipoDoStatus(st)).toBe('veneno');
    expect(st.efeito).toEqual({ tipo: 'dano_por_rodada', valor: 3 });
  });
});
