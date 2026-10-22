/* milagres.test.js — quem não usa, não aprende, nem recebe milagre (22/10/2026)
   "Um personagem vampiro, lobisomem ou sem religião não pode usar ou ser alvo
   de milagres. Uma criatura de elemento 'escuridão' não pode usar milagres."
   Decisões: Escuridão vale para todo ator (o Mago também); criatura não tem
   religião e não é barrada por isso; Licantropia temporária só barra o uso. */
import { describe, it, expect, beforeAll } from 'vitest';
import './inventario-helpers.jsx';
import './game-data.jsx';

let G;
beforeAll(() => { G = window; });

const pj = (x) => ({ profissao: 'Sacerdote', deus: 'Lena', subraca: null, estado_atual: {}, ...x });

describe('bloqueioMilagre — personagem', () => {
  it('Sacerdote de Lena: livre', () => {
    expect(G.bloqueioMilagre(G.atorMilagreDePj(pj()))).toBeNull();
  });
  it.each([
    [{ subraca: 'Vampiro' }, 'milagre_vampiro'],
    [{ subraca: 'Lobisomem' }, 'milagre_lobisomem'],
    [{ deus: null }, 'milagre_sem_religiao'],
    [{ deus: '  ' }, 'milagre_sem_religiao'],
    [{ profissao: 'Mago' }, 'milagre_escuridao'],
  ])('%j → %s', (x, motivo) => {
    expect(G.bloqueioMilagre(G.atorMilagreDePj(pj(x))).motivo).toBe(motivo);
  });
  it('vampiro vem antes de sem religião', () => {
    expect(G.bloqueioMilagre(G.atorMilagreDePj(pj({ subraca: 'Vampiro', deus: null }))).motivo).toBe('milagre_vampiro');
  });
  it('permanente ignora a sub-raça temporária e olha só a fixa', () => {
    const ator = { tipo: 'pj', deus: 'Lena', subraca: 'Lobisomem', subraca_fixa: null, elementos: ['luz'] };
    expect(G.bloqueioMilagre(ator).motivo).toBe('milagre_lobisomem');
    expect(G.bloqueioMilagre(ator, { permanente: true })).toBeNull();
  });
});

describe('bloqueioMilagre — criatura', () => {
  const cri = (x) => G.atorMilagreDeCriatura({ elemento: 'Luz', subtipo: null, ...x });
  it('criatura comum: livre (sem religião não conta)', () => {
    expect(G.bloqueioMilagre(cri())).toBeNull();
  });
  it.each([
    [{ elemento: 'Escuridão' }, 'milagre_escuridao'],
    [{ elemento: 'Fogo, Escuridão' }, 'milagre_escuridao'],
    [{ subtipo: 'Vampiro' }, 'milagre_vampiro'],
    [{ subtipo: 'Lobisomem' }, 'milagre_lobisomem'],
  ])('%j → %s', (x, motivo) => {
    expect(G.bloqueioMilagre(cri(x)).motivo).toBe(motivo);
  });
});

describe('alvoDeMilagreBloqueado', () => {
  it('vampiro, lobisomem e sem religião não recebem', () => {
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDePj(pj({ subraca: 'Vampiro' }))).motivo).toBe('alvo_milagre_vampiro');
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDePj(pj({ deus: null }))).motivo).toBe('alvo_milagre_sem_religiao');
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDeCriatura({ subtipo: 'Lobisomem' })).motivo).toBe('alvo_milagre_lobisomem');
  });
  it('Escuridão recebe (só não conjura)', () => {
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDePj(pj({ profissao: 'Mago' })))).toBeNull();
    expect(G.alvoDeMilagreBloqueado(G.atorMilagreDeCriatura({ elemento: 'Escuridão' }))).toBeNull();
  });
});

describe('bloqueioAprenderMagia com milagre', () => {
  const CURA = { key: 'cura', nome: 'Cura', custo: 1, tipo: 'Básica', classe: 'Milagre', nivel_1: 'a' };
  const LUZ = { key: 'luz', nome: 'Luz', custo: 1, tipo: 'Básica', classe: 'Feitiço', nivel_1: 'a' };
  const base = { experiencia: 100000, intelecto_base: 3, aura_base: 2, magias: {}, estado_atual: {} };
  it('sem deus não aprende milagre', () => {
    expect(G.bloqueioAprenderMagia(CURA, { ...base, profissao: 'Sacerdote', deus: null }, [CURA]).motivo).toBe('milagre_sem_religiao');
  });
  it('Mago não aprende milagre, aprende feitiço', () => {
    const mago = { ...base, profissao: 'Mago', deus: 'Lena' };
    expect(G.bloqueioAprenderMagia(CURA, mago, [CURA]).motivo).toBe('milagre_escuridao');
    expect(G.bloqueioAprenderMagia(LUZ, mago, [LUZ])).toBeNull();
  });
});

describe('motivoMilagreLabel', () => {
  it('textos', () => {
    expect(G.motivoMilagreLabel('milagre_vampiro', false)).toBe('Vampiros não usam milagres.');
    expect(G.motivoMilagreLabel('milagre_escuridao', true)).toBe('Darkness cannot cast miracles.');
    expect(G.motivoMilagreLabel('alvo_milagre_sem_religiao', false)).toBe('Sem religião, não recebe milagres.');
  });
});

describe('o rótulo do Aprender conhece os motivos de milagre', () => {
  it('motivoAprenderLabel delega a motivoMilagreLabel', async () => {
    await import('./copy.jsx'); await import('./constants.jsx'); await import('./helpers.jsx');
    await import('../10-shell/shell.jsx'); await import('../07-inventario/inventario.jsx');
    expect(window.motivoAprenderLabel('milagre_sem_religiao', false)).toBe('Sem religião, não há milagre.');
  });
});
