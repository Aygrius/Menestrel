/* ============================================================
   globais-tabuleiro.test.js — contrato de globais entre os dois arquivos
   ============================================================
   batalha.jsx e tabuleiro.jsx são módulos ES separados. Uma `function`
   declarada em tabuleiro.jsx NÃO vaza para o escopo global — só existe
   para batalha.jsx o que for pendurado em `window`.

   Em 30/08/2026 isso quebrou o tabuleiro inteiro em produção: a camada
   pura só estava exposta dentro de `window.MotorTabuleiro`, mas
   batalha.jsx chamava `celulaOcupada(...)`, `moverParticipante(...)` e
   `motivoMovimento(...)` por nome nu. Cada clique estourava
   ReferenceError DENTRO do onClick — silencioso na tela, só visível no
   console — e o sintoma era "não consigo colocar avatar no tabuleiro"
   e "não consigo mover ninguém".

   Este teste lê o FONTE de batalha.jsx, acha toda chamada nua a um nome
   da camada pura e exige que ele esteja em window. Assim, quem adicionar
   uma chamada nova sem exportar quebra aqui, não em produção.
   ============================================================ */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../01-core/helpers.jsx';
import '../01-core/inventario-helpers.jsx';
import '../01-core/game-data.jsx';
import './batalha.jsx';
import './tabuleiro.jsx';

const aqui = dirname(fileURLToPath(import.meta.url));

let fonte, nomesDaCamadaPura;
beforeAll(() => {
  fonte = readFileSync(resolve(aqui, 'batalha.jsx'), 'utf8');
  nomesDaCamadaPura = Object.keys(window.MotorTabuleiro || {})
    .filter((k) => typeof window.MotorTabuleiro[k] === 'function');
  expect(nomesDaCamadaPura.length).toBeGreaterThan(5);
});

// Chamada NUA = `nome(` sem `.` nem caractere de identificador antes.
const chamadaNua = (src, nome) =>
  new RegExp('(^|[^.\\w$])' + nome + '\\s*\\(', 'm').test(src);

describe('camada pura do tabuleiro usada por nome nu em batalha.jsx', () => {
  it('toda função chamada sem prefixo está em window', () => {
    const faltando = nomesDaCamadaPura
      .filter((nome) => chamadaNua(fonte, nome))
      .filter((nome) => typeof window[nome] !== 'function');
    expect(faltando).toEqual([]);
  });

  it('as que quebraram em 30/08/2026 continuam expostas', () => {
    for (const nome of ['celulaOcupada', 'moverParticipante', 'motivoMovimento',
                        'posValida', 'movimentoBase', 'preservarPosicoes',
                        'alcanceDaAcao', 'distanciaEntre', 'alvoNoAlcance']) {
      expect(typeof window[nome], nome + ' precisa estar em window').toBe('function');
    }
  });

  it('os componentes do tabuleiro também estão em window', () => {
    expect(typeof window.TabuleiroBatalha).toBe('function');
    expect(typeof window.TabuleiroToken).toBe('function');
  });

  it('o global e a entrada em MotorTabuleiro são a MESMA função', () => {
    // Divergirem significaria duas cópias com regras diferentes — o teste
    // da camada pura passaria enquanto a UI usaria outra coisa.
    for (const nome of nomesDaCamadaPura) {
      if (typeof window[nome] === 'function') {
        expect(window[nome], nome).toBe(window.MotorTabuleiro[nome]);
      }
    }
  });
});

describe('fonte de verdade dos participantes no ConduzirBatalhaView', () => {
  // Bug de 30/08/2026: "os cards dos combatentes saem do tabuleiro ao
  // iniciar a batalha". iniciar() montava os snapshots a partir de
  // `batalha.participantes` (a PROP). O estado local é inicializado da prop
  // UMA vez e nunca ressincronizado, então só ele carregava o `pos` escrito
  // por posicionarNoSetup — a prop devolvia a lista sem posição e todo mundo
  // voltava para a bancada.
  //
  // No ConduzirBatalhaView a prop só pode ser lida no inicializador do
  // useState. (No BatalhaJogadorView é o oposto: lá NÃO existe estado local,
  // a prop chega pelo realtime e é a fonte correta — por isso o recorte.)
  const corpoDoConduzir = () => {
    const ini = fonte.indexOf('function ConduzirBatalhaView');
    const fim = fonte.indexOf('function BatalhaJogadorView');
    expect(ini).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(ini);
    return fonte.slice(ini, fim);
  };

  it('só o useState lê batalha.participantes', () => {
    const linhas = corpoDoConduzir().split('\n')
      .filter((l) => /batalha\s*\.\s*participantes/.test(l))
      .filter((l) => !/^\s*(\/\/|\*)/.test(l));         // ignora comentários
    expect(linhas.map((l) => l.trim())).toEqual([
      'const [participantes, setParticipantes] = useState(batalha.participantes || []);',
    ]);
  });

  it('montarSnapshots é alimentado pelo estado, não pela prop', () => {
    const corpo = corpoDoConduzir();
    expect(corpo).toMatch(/montarSnapshots\(\s*participantes/);
    expect(corpo).not.toMatch(/montarSnapshots\(\s*batalha\s*\.\s*participantes/);
  });
});

describe('a rolagem é salva quando o dado assenta, não no Confirmar', () => {
  // Bug de 31/08/2026: entre o dado parar e o clique em Confirmar havia uma
  // janela sem trava nenhuma. `temRolagemPendente` depende de `d20`, e `d20`
  // só era gravado no `onConfirmar` — então, com o resultado já na tela e o
  // d20 ainda null, dava pra trocar de token/fechar o menu, o AcaoPanel
  // desmontava, a rolagem se perdia e a mesma ação podia ser rolada de novo.
  //
  // O contrato agora: DadoOverlay reporta por `onRolou` dentro de `aoRolar`,
  // e cada overlay do AcaoPanel grava o valor por ali. `onConfirmar` só
  // fecha. Se alguém voltar a guardar o valor apenas no Confirmar, a janela
  // reabre — e é isso que estas asserções impedem.
  const corpoDoOverlay = () => {
    const ini = fonte.indexOf('function DadoOverlay');
    const fim = fonte.indexOf('function SelectPill');
    expect(ini).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(ini);
    return fonte.slice(ini, fim);
  };

  it('DadoOverlay aceita onRolou e o chama ao produzir o resultado', () => {
    const ov = corpoDoOverlay();
    expect(ov).toMatch(/function DadoOverlay\(\{[^}]*onRolou/);
    // dentro de aoRolar, depois de setResultado
    expect(ov).toMatch(/setResultado\(\{ d20, res \}\);[\s\S]{0,800}onRolou\(\{ valor: d20/);
  });

  it('o overlay não fecha sozinho por clique no fundo nem por Escape com resultado', () => {
    const ov = corpoDoOverlay();
    // Escape só antes de existir resultado — depois, a única saída é Confirmar.
    expect(ov).toContain("e.key === 'Escape' && !resultado");
    // backdrop sem onClick: clicar no fundo não descarta a rolagem
    expect(ov).not.toMatch(/dado-overlay-backdrop[\s\S]{0,240}onClick/);
  });

  it('os dois overlays do AcaoPanel gravam o valor via onRolou', () => {
    const ap = fonte.slice(fonte.indexOf('function AcaoPanel'));
    expect((ap.match(/onRolou=/g) || []).length).toBe(2);
    // Um bloco por overlay: o primário grava d20, o de crítico grava d20Critico.
    // Assertar a INTENÇÃO, não a forma da linha — a versão anterior deste teste
    // quebrou só porque o corpo virou um bloco maior ao ganhar a persistência.
    expect(ap).toMatch(/onRolou=\{[\s\S]{0,400}?setD20ComReset\(valor\)/);
    expect(ap).toMatch(/onRolou=\{[\s\S]{0,400}?setD20Critico\(valor\)/);
  });

  it('rolar também PERSISTE — sem isso a rolagem morre ao desmontar', () => {
    // O coração da correção de 31/08/2026: guardar no estado do componente não
    // basta. Cada onRolou precisa mandar a rolagem pra batalhas.rolagem_pendente,
    // senão trocar de menu ou fechar o navegador devolve o "pode rolar de novo".
    const ap = fonte.slice(fonte.indexOf('function AcaoPanel'));
    const blocos = ap.match(/onRolou=\{[\s\S]{0,500}?\n          \}\}/g) || [];
    expect(blocos.length).toBe(2);
    for (const bloco of blocos) {
      expect(bloco).toMatch(/onRolagemSalvaChange/);
    }
  });

  it('o painel semeia o d20 da rolagem salva, não sempre de null', () => {
    const ap = fonte.slice(fonte.indexOf('function AcaoPanel'));
    expect(ap).toMatch(/useState\(salva \? salva\.d20 : null\)/);
    expect(ap).toMatch(/useState\(salva \? \(salva\.d20_critico \?\? null\) : null\)/);
  });

  it('aplicar a ação zera a rolagem no MESMO update', () => {
    // Se a limpeza fosse uma escrita separada, uma falha de rede entre as duas
    // deixaria a rolagem presa e o combatente travado para sempre.
    //
    // Os dois lados limpam em lugares DIFERENTES (01/09/2026) e as duas formas
    // valem aqui: o Mestre zera a coluna (`rolagem_pendente: null`), o Jogador
    // zera o campo dentro do próprio participante (`comMinhaRolagem(next, null)`)
    // — ele não escreve em `batalhas`, só passa pela RPC
    // atualizar_batalha_jogador, que recebe participantes/log/rodada e não a
    // coluna. `rodada: novaR` cobre a virada, que limpa a rolagem de todos via
    // processarViradaDeRodada.
    const persists = fonte.match(/persistir\(\{[^}]*\}|persistJogador\(\{[^}]*\}/g) || [];
    const comLog = persists.filter((t) => /log:/.test(t));
    expect(comLog.length).toBeGreaterThan(3);
    for (const t of comLog) {
      expect(t, 'persist com log precisa limpar a rolagem: ' + t.slice(0, 70))
        .toMatch(/rolagem_pendente: null|comMinhaRolagem\([^,]+, null\)|rodada: novaR/);
    }
  });

  it('o Jogador persiste a rolagem no participante, não numa chave fantasma', () => {
    // Regressão de 01/09/2026: salvarRolagem chamava
    // persistJogador({ rolagem_pendente: r }), mas persistJogador só repassa
    // participantes/log/rodada pra RPC — a chave era descartada e a chamada
    // ainda saía sem p_participantes. A rolagem do jogador nunca sobreviveu a
    // recarregar, apesar do comentário prometer que sim.
    const jv = fonte.slice(fonte.indexOf('function BatalhaJogadorView'));
    expect(jv).not.toMatch(/persistJogador\(\{\s*rolagem_pendente/);
    expect(jv).toMatch(/salvarRolagem[\s\S]{0,200}?comMinhaRolagem\(participantes, r\)/);
    // E lê de volta do participante — senão não sobrevive ao reload.
    expect(jv).toMatch(/meuParticipante\.rolagem_pendente/);
  });

  it('nenhum onConfirmar volta a ser o único lugar que grava o d20', () => {
    const ap = fonte.slice(fonte.indexOf('function AcaoPanel'));
    expect(ap).not.toMatch(/onConfirmar=\{\([^)]*\) => \{\s*setD20ComReset/);
    expect(ap).not.toMatch(/onConfirmar=\{\([^)]*\) => \{\s*setD20Critico/);
  });

  it('a trava do menu do token é alimentada pela rolagem pendente', () => {
    // Sem isto, salvar a rolagem não impediria o combatente de sair dela.
    expect((fonte.match(/menuTravado=\{rolagemPendente\}/g) || []).length).toBe(2);
  });
});
