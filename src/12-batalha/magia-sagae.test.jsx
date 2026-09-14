/* ============================================================
   magia-sagae.test.jsx — atacar com a magia da Espada Longa Sagae
   ============================================================
   "Estou clicando em atacar usando magia da espada Sagae, não consigo clicar
    para usar PA." (usuário, 13/09/2026)

   Dados do banco: a Espada Longa Sagae (equipada na mão do Aldren) concede
   Relâmpago nível 9 — evocação "1 rodada" (canalizada), alcance "100 metros",
   "Causa 44 de dano elemental de ar." Magia de item não custa karma.
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

let AcaoPanel;
beforeAll(() => { AcaoPanel = window.AcaoPanel; expect(AcaoPanel).toBeDefined(); });
afterEach(cleanup);

const SAGAE = {
  slug: 'espada_longa_sagae', nome: 'Espada Longa Sagae', grupo: 'Armas', categoria_equip: 'arma',
  slot_equip: 'maos', magia: 'Relâmpago', nivel_magia: 9, dano: 37, alcance: 0,
  dano_l: 0, dano_m: 1, dano_p: 3, ajuste_atributo: 'FOR', grupo_armas: 'CM',
};
const RELAMPAGO = {
  key: 'relampago', nome: 'Relâmpago', alcance: '100 metros', evocacao: '1 rodada', duracao: 'Instantânea',
  descricao: 'Um raio.',
  nivel_1: 'Causa 28 de dano elemental de ar.', nivel_3: 'Causa 32 de dano elemental de ar.',
  nivel_5: 'Causa 36 de dano elemental de ar.', nivel_7: 'Causa 40 de dano elemental de ar.',
  nivel_9: 'Causa 44 de dano elemental de ar.',
};
const ALDREN_PJ = {
  id: 54, nome: 'Aldren', raca: 'Humano', reino: 'Verrogar', profissao: 'Guerreiro',
  intelecto_base: 1, aura_base: 1, carisma_base: 1, forca_base: 3, fisico_base: 2, agilidade_base: 2, percepcao_base: 1,
  experiencia: 40, habilidades: {}, habilidades_bonus: {}, magias: {}, tecnicas: {},
  aprimoramentos: {}, caracterizacao: {}, grupos_armas: { CM: 2 },
  estado_atual: { bonusArmas: {}, condicoes: {} },
  inventario: { itens: [{ instanceId: 's1', slug: 'espada_longa_sagae', slot: 'mao_d', equipado: true, quantidade: 1 }] },
};
const ALDREN = {
  tipo: 'pj', ref_id: 54, inst_id: 'pj:54', nome: 'Aldren Saravos', ordem: 1, status: 'ativo', atual: true,
  vb: 20, pa_max: 1, pa_rest: 1, mov_rest: 5, moveu_na_rodada: true,
  ef: 30, ef_max: 30, eh: 20, eh_max: 20, ar: 5, ar_max: 5, karma: 0, karma_max: 0, rf: 8, rm: 6,
  defesa_sigla: 'M', defesa_valor: 12, status_temp: [], tecnicas_usadas: [], condicoes: {},
  pos: { x: 34, y: 14 },
};
const HAALIN = {
  tipo: 'criatura', ref_id: 242, inst_id: 'criatura:242', nome: 'Haalin', ordem: 2, status: 'ativo', atual: false,
  vb: 30, pa_max: 1, pa_rest: 1, ef: 40, ef_max: 40, eh: 50, eh_max: 50, ar: 10, ar_max: 10,
  defesa_sigla: 'M', defesa_valor: 14, rf: 10, rm: 8, status_temp: [], tecnicas_usadas: [],
  pos: { x: 41, y: 13 },
};
const CATALOGOS = {
  pjById: { 54: ALDREN_PJ }, criById: {}, catalogoBySlug: { espada_longa_sagae: SAGAE },
  magiasByKey: { relampago: RELAMPAGO }, tecnicasByKey: {}, habilidadesByKey: {}, habilidadesDb: [],
};

const btn = (re) => screen.getAllByRole('button').find(
  (b) => re.test(b.textContent.trim()) || re.test(b.getAttribute('aria-label') || ''));

function montar(ator = ALDREN, alvo = HAALIN) {
  const aplicados = [];
  render(
    <div className="menestrel-ui">
      <AcaoPanel ator={ator} participantes={[ator, alvo]} catalogos={CATALOGOS} lang="pt"
        onAplicar={(p) => aplicados.push(p)} onAplicarTeste={() => {}} onAplicarItem={() => {}}
        onAplicarApoio={() => {}} onCancel={() => {}} onRolagemPendenteChange={() => {}}
        rolagemSalva={null} onRolagemSalvaChange={() => {}} />
    </div>
  );
  return aplicados;
}

/* Diagnóstico (com o código publicado E o local): o Atacar estava HABILITADO.
   O que ficava cinza era o botão do dado — Relâmpago evoca em 1 rodada, e na
   largada não se rola nada (o dado vem quando a magia sai). A tela mostrava o
   dado desativado como se fosse o próximo passo e não dizia o que apertar. */
describe('Espada Sagae — Relâmpago do item: a largada diz o que apertar', () => {
  // Aba única "Magias" desde 13/09/2026.
  const abrirMagia = () => fireEvent.click(btn(/^Magias$/));

  it('a aba Magia lista o Relâmpago da espada, no nível 9', () => {
    montar();
    abrirMagia();
    // Formato único do seletor de Magias (13/09/2026): "Nome · nível N · Item".
    expect(document.body.textContent).toMatch(/Relâmpago · nível 9 · Espada Longa Sagae/);
  });

  it('na largada não há botão de dado — ele parecia o próximo passo', () => {
    montar();
    abrirMagia();
    expect(document.querySelector('.dado-ov-trigger button')).toBeNull();
  });

  it('a instrução diz qual botão apertar, e o botão se chama Começar a evocar (1 PA)', () => {
    montar();
    abrirMagia();
    expect(document.querySelector('.magia-largada-instrucao').textContent)
      .toMatch(/clique em Começar a evocar \(1 PA\)/);
    const confirmar = document.querySelector('.atacar-confirmar');
    expect(confirmar.getAttribute('aria-label')).toBe('Começar a evocar (1 PA)');
    expect(confirmar.disabled).toBe(false);
  });

  /* O BUG DE VERDADE: o clique lia `res.d20` com res null (largada não rola)
     e morria com TypeError — nada acontecia, nenhum PA saía. */
  it('clicar começa a evocar: manda a magia e o alvo, sem dado, sem quebrar', () => {
    const aplicados = montar();
    abrirMagia();
    fireEvent.click(document.querySelector('.atacar-confirmar'));
    expect(aplicados).toHaveLength(1);
    expect(aplicados[0]).toMatchObject({ tipo: 'magia', d20: null, resultado: null, custo_karma: 0 });
    expect(aplicados[0].magia.key).toBe('relampago');
    expect(aplicados[0].alvo.nome).toBe('Haalin');
  });

  it('sem PA, o botão fica desativado', () => {
    montar({ ...ALDREN, pa_rest: 0 });
    abrirMagia();
    expect(document.querySelector('.atacar-confirmar').disabled).toBe(true);
  });
});
