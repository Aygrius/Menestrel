/* ============================================================
   motivo-bloqueio.test.jsx — técnica e magia dizem por que não dá
   ============================================================
   "Na hora de usar técnica e magia, não está avisando o motivo de não poder
    usar. Se a restrição for de tipo da arma, avise." (usuário, 13/09/2026)

   Antes:
     • aba Arma: o seletor de técnica mostrava só as compatíveis com a arma;
       as outras SUMIAM (e com nenhuma compatível, o seletor inteiro sumia);
     • aba Técnica: "Exige arma do grupo: CP, EP." — sem dizer que arma está
       na mão nem de que grupo ela é;
     • abas desativadas (Arma, Técnica, Habilidade) ficavam cinza, mudas;
     • o SelectPill da batalha ignorava `disabled` nas opções (a magia de
       Ritual, que devia vir desativada, podia ser escolhida).
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../01-core/copy.jsx';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import '../01-core/tecnicas-efeito.jsx';
import '../01-core/magias-efeito.jsx';
import '../02-shell/dado-d20.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

let AcaoPanel, M;
beforeAll(() => { AcaoPanel = window.AcaoPanel; M = window.MotorBatalha; });
afterEach(cleanup);

// Victor: Chicote de Armas (CM) na mão.
const CHICOTE = { slug: 'chicote', nome: 'Chicote de Armas', dano: 27, dano_l: 0, dano_m: 2, dano_p: 0,
  grupo_armas: 'CM', ajuste_atributo: 'PER', alcance: 10 };
const TECNICAS = {
  golpe_duplo: { key: 'golpe_duplo', nome: 'Golpe Duplo', uso: 'Intermitente', ajuste: 'agilidade',
    grupo_armas: 'CP, EP', grupo_armaduras: 'L, M', efeito: 'Ataca duas vezes.' },
  posicionamento: { key: 'posicionamento', nome: 'Posicionamento', uso: 'Intermitente', ajuste: 'percepcao',
    grupo_armas: 'Livre', grupo_armaduras: 'L', efeito: 'Subtrai do dano.' },
  desviar: { key: 'desviar', nome: 'Desviar', uso: 'Intermitente', ajuste: 'agilidade',
    grupo_armas: 'Livre', grupo_armaduras: 'L, M', efeito: 'Ignora 50%.' },
};
const PJ = {
  id: 67, nome: 'Victor', raca: 'Humano', reino: 'Verrogar', profissao: 'Guerreiro',
  intelecto_base: 1, aura_base: 1, carisma_base: 1, forca_base: 2, fisico_base: 2, agilidade_base: 3, percepcao_base: 3,
  experiencia: 40, habilidades: {}, habilidades_bonus: {}, magias: {},
  tecnicas: { golpe_duplo: 2, posicionamento: 3, desviar: 1 },
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: { CM: 2 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ instanceId: 'c1', slug: 'chicote', slot: 'mao_d', equipado: true, quantidade: 1 }] },
};
const ATOR = {
  tipo: 'pj', ref_id: 67, inst_id: 'pj:67', nome: 'Victor Beaufort', ordem: 1, status: 'ativo', atual: true,
  vb: 20, pa_max: 1, pa_rest: 1, ef: 30, ef_max: 30, eh: 20, eh_max: 20, ar: 0, ar_max: 0, karma: 0, karma_max: 0,
  rf: 8, rm: 6, defesa_sigla: 'L', defesa_valor: 12, status_temp: [], tecnicas_usadas: [], condicoes: {},
};
const ALVO = { tipo: 'criatura', ref_id: 1, inst_id: 'c:1', nome: 'Haalin', ordem: 2, status: 'ativo', vb: 30,
  pa_max: 1, pa_rest: 1, ef: 30, ef_max: 30, eh: 10, eh_max: 10, ar: 0, ar_max: 0, defesa_sigla: 'M', defesa_valor: 10,
  rf: 8, rm: 6, status_temp: [], tecnicas_usadas: [] };
const CATS = { pjById: { 67: PJ }, catalogoBySlug: { chicote: CHICOTE }, magiasByKey: {}, tecnicasByKey: TECNICAS };

const montar = (ator = ATOR) => render(
  <div className="menestrel-ui">
    <AcaoPanel ator={ator} participantes={[ator, ALVO]} catalogos={CATS} lang="pt"
      onAplicar={() => {}} onAplicarTeste={() => {}} onAplicarItem={() => {}} onAplicarApoio={() => {}}
      onCancel={() => {}} onRolagemPendenteChange={() => {}} rolagemSalva={null} onRolagemSalvaChange={() => {}}
      abrirTip={() => {}} fecharTip={() => {}} />
  </div>
);
const pillPorRotulo = (rotulo) => Array.from(document.querySelectorAll('.motor-field'))
  .find((w) => (w.querySelector('span')?.textContent || '') === rotulo);
const abrirPill = (rotulo) => { fireEvent.click(pillPorRotulo(rotulo).querySelector('.select-pill-btn')); };
const itens = () => Array.from(document.querySelectorAll('.select-pill-drop li'));

describe('motivoArmaTecnica — o texto da restrição de arma', () => {
  it('diz os grupos exigidos, com nome, e a arma na mão com o grupo dela', () => {
    const arma = { slug: 'chicote', nome: 'Chicote de Armas' };
    expect(M.motivoArmaTecnica(TECNICAS.golpe_duplo, arma, CATS, false))
      .toBe('Exige arma do grupo CP (Corte Pesado) ou EP (Esmagamento Pesado) — Chicote de Armas é do grupo CM (Corte Médio).');
  });
  it('sem arma na mão, diz isso', () => {
    expect(M.motivoArmaTecnica(TECNICAS.golpe_duplo, null, CATS, false))
      .toBe('Exige arma do grupo CP (Corte Pesado) ou EP (Esmagamento Pesado) — nenhuma arma empunhada.');
  });
  it('técnica Livre não tem restrição de arma', () => {
    expect(M.motivoArmaTecnica(TECNICAS.posicionamento, { slug: 'chicote' }, CATS, false)).toBeNull();
  });
});

describe('aba Arma — técnica que exige outra arma aparece desativada, com o motivo', () => {
  it('Golpe Duplo aparece na lista, desativado, dizendo o grupo exigido', () => {
    montar();
    abrirPill('Técnica (opcional)');
    const golpe = itens().find((li) => li.textContent.includes('Golpe Duplo'));
    expect(golpe, 'a técnica incompatível não pode sumir').toBeTruthy();
    expect(golpe.classList.contains('disabled')).toBe(true);
    expect(golpe.textContent).toMatch(/exige arma CP, EP/);
  });

  it('clicar na opção desativada não a escolhe', () => {
    montar();
    abrirPill('Técnica (opcional)');
    fireEvent.click(itens().find((li) => li.textContent.includes('Golpe Duplo')));
    expect(pillPorRotulo('Técnica (opcional)').querySelector('.select-pill-btn').textContent).not.toMatch(/Golpe Duplo/);
  });

  it('as compatíveis continuam escolhíveis', () => {
    montar();
    abrirPill('Técnica (opcional)');
    const desviar = itens().find((li) => li.textContent.includes('Desviar'));
    expect(desviar.classList.contains('disabled')).toBe(false);
    fireEvent.click(desviar);
    expect(pillPorRotulo('Técnica (opcional)').querySelector('.select-pill-btn').textContent).toMatch(/Desviar/);
  });
});

describe('aba Técnica — o bloqueio por arma diz a arma na mão', () => {
  it('Golpe Duplo com chicote', () => {
    montar();
    fireEvent.click(screen.getAllByRole('button').find((b) => b.textContent.trim() === 'Técnica'));
    abrirPill('Técnica');
    fireEvent.click(itens().find((li) => li.textContent.includes('Golpe Duplo')));
    expect(document.body.textContent).toMatch(/Chicote de Armas é do grupo CM \(Corte Médio\)/);
  });
});

describe('abas desativadas dizem por quê', () => {
  it('Técnica bloqueada por status (sem_tecnicas) traz o motivo', () => {
    montar({ ...ATOR, status_temp: [{ id: 'x', nome: 'Atordoado', rodadas_rest: 1, efeito: { tipo: 'sem_tecnicas' } }] });
    const aba = screen.getAllByRole('button').find((b) => b.textContent.trim() === 'Técnica');
    expect(aba.disabled).toBe(true);
    expect(aba.closest('[data-motivo]').getAttribute('data-motivo')).toBe('Este lutador está impedido de usar técnicas agora.');
  });

  it('Habilidade sem habilidades traz o motivo', () => {
    montar();
    const aba = screen.getAllByRole('button').find((b) => b.textContent.trim() === 'Habilidade');
    expect(aba.disabled).toBe(true);
    expect(aba.closest('[data-motivo]').getAttribute('data-motivo')).toBe('Este lutador não tem habilidades.');
  });

  it('aba habilitada não carrega motivo', () => {
    montar();
    const aba = screen.getAllByRole('button').find((b) => b.textContent.trim() === 'Arma');
    expect(aba.closest('[data-motivo]')).toBeNull();
  });
});
