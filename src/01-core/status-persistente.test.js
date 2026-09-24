/* ============================================================
   status-persistente.test.js — o status sobrevive à batalha
   ============================================================
   "Lembrando que o status da batalha também persiste depois que a luta acaba,
    mas o mestre pode remover e adicionar fora da batalha também."
    (usuário, 17/09/2026)

   Antes desta data não sobrevivia nada: estadoAoEncerrar devolvia à ficha só
   vitalidade e condições, e montarSnapshots entrava em combate com
   status_temp vazio. Quem saísse envenenado chegava curado.

   A decisão que custa explicação é a do PRAZO. O usuário escolheu "contam pelo
   tempo de jogo: as rodadas viram duração no calendário da mesa e caem quando
   o Mestre avança a data". O calendário tem grão de DIA e uma rodada são
   segundos — não existe conversão honesta entre os dois, e este módulo não
   inventa uma: o que sai do combate ainda contando vence NO DIA SEGUINTE, ou
   seja, dura o resto do dia de jogo da luta e cai no primeiro avanço de data.
   Fora do combate o Mestre conta em dias, que é a unidade que o mundo tem.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import './status-efeito.jsx';

let statusVigentes, statusComVencimento, statusAoEncerrarBatalha;
let comStatusPersistente, semStatusPersistente, STATUS_MESTRE_TIPOS;
beforeAll(() => {
  ({
    statusVigentes, statusComVencimento, statusAoEncerrarBatalha,
    comStatusPersistente, semStatusPersistente, STATUS_MESTRE_TIPOS,
  } = window);
  expect(statusVigentes, 'o módulo precisa estar no window').toBeTypeOf('function');
});

const HOJE = { dia: 11, mes: 11, ano: 1500 };
const veneno = (extra) => ({ id: 'veneno:a', nome: 'Envenenado', icone: '☠', rodadas_rest: 3,
  efeito: { tipo: 'dano_por_rodada', valor: 2 }, ...extra });

describe('vencimento no calendário da mesa', () => {
  it('N dias vira uma data concreta', () => {
    const st = statusComVencimento(veneno(), HOJE, 3);
    expect(st.vence_em).toEqual({ dia: 14, mes: 11, ano: 1500 });
  });

  it('sem prazo fica sem data — só sai quando o Mestre tirar', () => {
    expect(statusComVencimento(veneno(), HOJE, null).vence_em).toBeNull();
  });

  /* Mesa recém-criada não tem data. Perder o status por causa disso seria
     pior do que mantê-lo — mesmo critério de magiasAtivasVigentes. */
  it('mesa sem data definida devolve o status sem vencimento', () => {
    expect(statusComVencimento(veneno(), null, 3).vence_em).toBeNull();
  });

  it('o resto do status atravessa intacto — é o mesmo objeto da batalha', () => {
    const st = statusComVencimento(veneno(), HOJE, 1);
    expect(st).toMatchObject({ id: 'veneno:a', nome: 'Envenenado', rodadas_rest: 3,
      efeito: { tipo: 'dano_por_rodada', valor: 2 } });
  });
});

describe('vencimento preguiçoso — expira na leitura, não por rotina', () => {
  const comPrazo = veneno({ vence_em: { dia: 14, mes: 11, ano: 1500 } });

  it('vale no dia anterior', () => {
    expect(statusVigentes([comPrazo], { dia: 13, mes: 11, ano: 1500 })).toHaveLength(1);
  });

  /* Vence NO DIA: quem vence em 14 já não vale no 14. Mesma regra das magias
     de calendário, para as duas não divergirem por um dia. */
  it('e já não vale no dia do vencimento', () => {
    expect(statusVigentes([comPrazo], { dia: 14, mes: 11, ano: 1500 })).toHaveLength(0);
  });

  it('quem não tem prazo nunca cai', () => {
    const eterno = veneno({ vence_em: null });
    expect(statusVigentes([eterno], { dia: 999, mes: 12, ano: 3000 })).toHaveLength(1);
  });

  it('sem data da mesa, nada vence', () => {
    expect(statusVigentes([comPrazo], null)).toHaveLength(1);
  });

  it('lista ausente não quebra', () => {
    expect(statusVigentes(null, HOJE)).toEqual([]);
    expect(statusVigentes(undefined, HOJE)).toEqual([]);
  });
});

describe('o que atravessa o fim da batalha', () => {
  it('quem ainda contava rodadas vence no dia seguinte', () => {
    const fora = statusAoEncerrarBatalha([veneno()], HOJE);
    expect(fora).toHaveLength(1);
    expect(fora[0].vence_em).toEqual({ dia: 12, mes: 11, ano: 1500 });
  });

  /* rodadas_rest null é "até o fim da batalha" — e o fim chegou. */
  it('quem durava até o fim da batalha não atravessa', () => {
    expect(statusAoEncerrarBatalha([veneno({ rodadas_rest: null })], HOJE)).toHaveLength(0);
  });

  it('nem quem já zerou as rodadas', () => {
    expect(statusAoEncerrarBatalha([veneno({ rodadas_rest: 0 })], HOJE)).toHaveLength(0);
  });

  it('e o status que atravessa ainda vale no mesmo dia da luta', () => {
    const fora = statusAoEncerrarBatalha([veneno()], HOJE);
    expect(statusVigentes(fora, HOJE)).toHaveLength(1);
    // O Mestre avança um dia e ele cai.
    expect(statusVigentes(fora, { dia: 12, mes: 11, ano: 1500 })).toHaveLength(0);
  });

  it('sem status nenhum, lista vazia', () => {
    expect(statusAoEncerrarBatalha(null, HOJE)).toEqual([]);
  });
});

/* "Um mesmo personagem pode acumular mais de um status ao mesmo tempo, sem
   restrição. Mas nunca acumular o mesmo mais de uma vez." (usuário,
   17/09/2026)

   A dedupe era por `id`, e o id traz sufixo aleatório — dois "Envenenado"
   aplicados pelo Mestre tinham ids diferentes e conviviam. Passou a ser por
   TIPO, que é o prefixo do id. */
describe('acrescentar e remover', () => {
  it('status de tipos diferentes convivem — "sem restrição"', () => {
    const lista = comStatusPersistente([veneno()], { id: 'ferido:b', nome: 'Ferido' });
    expect(lista.map((s) => s.id)).toEqual(['veneno:a', 'ferido:b']);
  });

  it('e três tipos diferentes também', () => {
    let lista = comStatusPersistente([veneno()], { id: 'ferido:b', nome: 'Ferido' });
    lista = comStatusPersistente(lista, { id: 'caido:c', nome: 'Caído' });
    expect(lista).toHaveLength(3);
  });

  it('o mesmo TIPO nunca acumula, mesmo com id novo', () => {
    const lista = comStatusPersistente([veneno()], veneno({ id: 'veneno:OUTRO', nome: 'Envenenado forte' }));
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('Envenenado forte');
    expect(lista[0].id).toBe('veneno:OUTRO');
  });

  it('e reaplicar renova o prazo em vez de empilhar', () => {
    const antes = statusComVencimento(veneno(), HOJE, 2);
    const depois = statusComVencimento(veneno({ id: 'veneno:novo' }), HOJE, 9);
    const lista = comStatusPersistente([antes], depois);
    expect(lista).toHaveLength(1);
    expect(lista[0].vence_em).toEqual({ dia: 20, mes: 11, ano: 1500 });
  });

  it('o mesmo id substitui em vez de duplicar', () => {
    const lista = comStatusPersistente([veneno()], veneno({ nome: 'Envenenado forte' }));
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('Envenenado forte');
  });

  it('remove por id', () => {
    expect(semStatusPersistente([veneno()], 'veneno:a')).toEqual([]);
  });

  it('remover o que não existe não mexe na lista', () => {
    expect(semStatusPersistente([veneno()], 'nada')).toHaveLength(1);
  });
});

/* O cardápio do controle da ficha tem que casar com os tipos que
   statusAplicadoPeloMestre (12-batalha) reconhece — um tipo a mais aqui viraria
   um status sem efeito nenhum. */
describe('o cardápio do Mestre', () => {
  /* Eram quatro até 20/09/2026, quando desmaiado e morto entraram no cardápio
     ("falta adicionar todos os status possíveis na ficha"). A ordem importa: é
     a ordem da lista na tela. Ver 01-core/status-desmaiado-morto.test.js. */
  it('traz os seis tipos que a batalha sabe montar', () => {
    expect(STATUS_MESTRE_TIPOS.map((t) => t.tipo)).toEqual(
      ['veneno', 'sangramento', 'ferido', 'caido', 'desmaiado', 'morto']
    );
  });

  /* Caído, desmaiado e morto não têm número: não existe "dano por rodada" em
     estar inconsciente. Veneno, sangramento e ferido têm. */
  it('caído, desmaiado e morto dispensam um valor', () => {
    const semValor = STATUS_MESTRE_TIPOS.filter((t) => t.semValor).map((t) => t.tipo);
    expect(semValor).toEqual(['caido', 'desmaiado', 'morto']);
  });
});
