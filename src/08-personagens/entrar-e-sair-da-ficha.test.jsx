/* ============================================================
   entrar-e-sair-da-ficha.test.jsx — escolher é entrar, sair é escolher outro
   ============================================================
   "Remova o botão 'selecionar personagem', pois clicar na ficha já é
    selecionar ele. Sempre que clicar no menu 'personagens' vai entrar na ficha
    direto. Adicionar um botão dentro da ficha, ao lado de loja, chamado
    'sair' para escolher outro personagem." (usuário, 17/09/2026)

   Os três pedidos são o mesmo movimento: a lista de personagens deixa de ser
   um lugar onde se mora e vira uma passagem. Antes havia quatro estados para o
   jogador (lista sem ativo, lista com ativo marcado, ficha aberta, ficha
   fechada mas ativo) e dois botões diferentes para andar entre eles. Agora há
   dois: ou você está na ficha do seu personagem, ou está escolhendo um.

   A consequência que não é óbvia: SAIR passa a DESATIVAR. Enquanto sair era só
   navegação local, voltava-se à lista com o PJ ainda ativo — e como a seção
   agora entra direto na ficha do ativo, o clique seguinte no menu devolveria o
   jogador à mesma ficha. Não haveria como trocar de personagem.
   ============================================================ */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/copy.jsx';
import '../01-core/constants.jsx';
import '../01-core/helpers.jsx';
import '../01-core/game-data.jsx';
import '../10-shell/shell.jsx';
import './personagens.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(resolve(aqui, 'personagens.jsx'), 'utf8');
const fonteFicha = readFileSync(resolve(aqui, '..', '11-ficha', 'ficha.jsx'), 'utf8');

let PersonagemCard;
beforeAll(() => { PersonagemCard = window.PersonagemCard; });
afterEach(cleanup);

const PJ = { id: 'pj-1', user_id: 'u-1', nome: 'Thalia', sobrenome: 'de Auren', experiencia: 40, nivel_visto: 4 };
const montar = (props) => render(
  <PersonagemCard p={PJ} isMaster={false} isOwn lang="pt" playerName="Richard"
    onEdit={() => {}} onDelete={() => {}} {...props} />
);

describe('o botão "Selecionar personagem" saiu do card', () => {
  it('não há botão — o alvo é o card', () => {
    const { container } = montar({ onAtivar: () => {} });
    expect(screen.queryByRole('button', { name: /Selecionar/ })).toBeNull();
    expect(container.querySelector('.pj-card-selecionar')).toBeNull();
    expect(container.querySelector('.pj-card-foot')).toBeNull();
  });

  it('e o clique no card é que escolhe', () => {
    let ativou = 0;
    const { container } = montar({ onAtivar: () => { ativou++; } });
    container.querySelector('.pj-card').click();
    expect(ativou).toBe(1);
  });

  /* O card do bloqueado continua sem ação nenhuma: há outro ativo. */
  it('o bloqueado segue inerte', () => {
    let ativou = 0;
    const { container } = montar({ bloqueadoPorOutroAtivo: true, onAtivar: () => { ativou++; } });
    container.querySelector('.pj-card').click();
    expect(ativou).toBe(0);
  });
});

/* PersonagensList só monta com banco; o que se afirma é o contrato no fonte —
   mesmo caminho de log-eventos.test.jsx. */
describe('escolher já abre a ficha', () => {
  it('ativar marca o perfil E abre a ficha, no mesmo gesto', () => {
    const i = fonte.indexOf('const ativarPj = async (pjId) => {');
    const trecho = fonte.slice(i, fonte.indexOf('\n  };', i));
    expect(trecho).toMatch(/setPjAtivoNoPerfil\(pjId\)/);
    expect(trecho).toMatch(/setPjAtivoIdLocal\(pjId\)/);
    expect(trecho).toMatch(/persistirPjAtivo\(pjId\)/);
  });

  /* O perfil chega assíncrono e os useState iniciais só rodam uma vez — sem
     este efeito o jogador com PJ ativo cairia na lista, que é o contrário do
     pedido. */
  it('e o PJ ativo do perfil abre a ficha mesmo chegando depois do render', () => {
    const i = fonte.indexOf('const pjAtivoDoServidor = useRef');
    expect(i, 'falta a sincronia com o perfil').toBeGreaterThan(0);
    const trecho = fonte.slice(i, i + 700);
    expect(trecho).toMatch(/userProfile\?\.pj_ativo_id/);
    expect(trecho).toMatch(/setPjAtivoIdLocal\(doServidor\)/);
  });

  /* A ref guarda o valor do SERVIDOR: sem ela, o efeito reabriria a ficha
     logo depois de um "Sair", porque o prop ainda traz o id antigo. */
  it('mas não desfaz um "Sair" local com um prop velho', () => {
    const i = fonte.indexOf('const pjAtivoDoServidor = useRef');
    expect(fonte.slice(i, i + 700)).toMatch(/pjAtivoDoServidor\.current === doServidor\) return/);
  });
});

describe('sair escolhe outro personagem', () => {
  it('sair desativa — não é só voltar para a lista', () => {
    const i = fonte.indexOf('const voltarParaLista = async');
    expect(i, 'voltarParaLista tem que desativar').toBeGreaterThan(0);
    expect(fonte.slice(i, fonte.indexOf('\n  };', i))).toMatch(/desativarPj\(\)/);
  });

  /* 'O botão de sair não precisa mostrar para o mestre, pois ele não precisa
     selecionar o personagem.' (usuário, 17/09/2026). Sair quer dizer
     'desligar este personagem para escolher outro' — gesto de quem TEM
     personagem ativo, e "quem persiste no personagem escolhido é o jogador".
     O Mestre sai pelo menu lateral; ver os testes do voltarToken logo abaixo. */
  it('o Sair é só do Jogador', () => {
    const i = fonteFicha.indexOf("{en ? 'Leave' : 'Sair'}");
    expect(fonteFicha.slice(i - 260, i)).toContain('{!isMestre && (');
  });

  /* 'O mestre ainda pode clicar no menu personagens e voltar a seleção de
     personagens, não precisa do botão de voltar.' (usuário, 17/09/2026)

     Só que clicar na seção JÁ ABERTA não fazia nada: setCurrentId recebia o
     mesmo valor e nada rerenderizava. A barra lateral passou a contar os
     toques (navToken) e a lista do Mestre fecha a ficha quando o contador
     sobe. Sem isso, tirar a seta deixaria o Mestre preso. */
  it('não há mais seta de voltar na ficha', () => {
    expect(fonteFicha).not.toContain('ti-arrow-left');
  });

  it('a barra lateral conta o toque mesmo na seção já aberta', () => {
    const shell = readFileSync(resolve(aqui, '..', '10-shell', 'shell.jsx'), 'utf8');
    // A janela vai até o fim do onClick — o comentário que explica a regra
    // ocupa boa parte dele, e uma contagem fixa de caracteres não alcança.
    const i = shell.lastIndexOf('mc-navitem');
    const trecho = shell.slice(i, shell.indexOf('aria-label={meta.label}', i));
    expect(trecho).toContain('setNavToken((t) => t + 1)');
    // E sobe TAMBÉM quando a seção já é a atual — é esse o ponto.
    expect(trecho).toContain('setCurrentId(s.id);');
  });

  /* Cada fatia vai só até o fim da PRÓPRIA tag: a linha do Jogador é longa, e
     um recorte por contagem de caracteres alcançava o ramo do Mestre. */
  it('e o token só vai para a lista do MESTRE — o PJ do Jogador persiste', () => {
    const shell = readFileSync(resolve(aqui, '..', '10-shell', 'shell.jsx'), 'utf8');
    const tag = (perfil) => {
      const i = shell.indexOf(`profile="${perfil}" currentUserId`);
      expect(i, 'não achei a lista do perfil ' + perfil).toBeGreaterThan(-1);
      return shell.slice(i, shell.indexOf('/>', i));
    };
    expect(tag('master')).toContain('voltarToken={navToken}');
    expect(tag('player')).not.toContain('voltarToken');
  });

  it('a lista do Mestre fecha a ficha quando o toque chega', () => {
    const i = fonte.indexOf('const tokenVisto = useRef(voltarToken)');
    expect(i, 'falta o efeito do token').toBeGreaterThan(0);
    const trecho = fonte.slice(i, i + 360);
    expect(trecho).toContain('if (isMaster) setFichaAbertoId(null)');
    expect(trecho, 'sem o guard, o efeito dispara na montagem').toContain('tokenVisto.current === voltarToken) return');
  });

  it('o botão "Sair" fica na fileira das abas, ao lado de Loja', () => {
    const iLoja = fonteFicha.indexOf("{en ? 'Shop' : 'Loja'}");
    const iSair = fonteFicha.indexOf("{en ? 'Leave' : 'Sair'}");
    expect(iSair, 'não achei o botão Sair').toBeGreaterThan(-1);
    expect(iSair, 'Sair tem que vir depois de Loja').toBeGreaterThan(iLoja);
    expect(fonteFicha.slice(iSair - 400, iSair)).toMatch(/onClick=\{onVoltar\}/);
  });


  /* A janela é o PRÓPRIO <button>, e não os 400 caracteres anteriores: com o
     comentário que explica a regra do Mestre, aquela fatia passou a alcançar a
     aba Loja e o role="tab" dela. */
  it('o Sair não é uma aba — não seleciona nada, sai da tela', () => {
    const i = fonteFicha.indexOf("{en ? 'Leave' : 'Sair'}");
    const abre = fonteFicha.lastIndexOf('<button', i);
    const botao = fonteFicha.slice(abre, i);
    expect(botao).toContain('fp-tab-sair');
    expect(botao).not.toMatch(/role="tab"/);
  });
});
