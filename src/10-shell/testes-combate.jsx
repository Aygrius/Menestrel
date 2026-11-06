/* ============================================================
   testes-combate.jsx — [Testes de combate] a simulação, para o Mestre
   ============================================================
   Pedido do usuário em 06/11/2026: "Insira entre os menus Paleta e Imagens
   do mestre no menu principal, a página com os testes de combate."

   O que a página mostra é o resultado de uma simulação feita FORA do app em
   06/11/2026: Eco, Yuldrous e Nihil contra três grupos de três criaturas,
   lutando no motor de batalha de verdade (montarSnapshots + MotorBatalha,
   as mesmas funções da mesa), 1.000 lutas por grupo. Os números já são os
   de depois da correção do mesmo dia: L/M/P da criatura com o estágio e as
   110 criaturas de ataque natural com a arma natural equipada
   (scripts/sql/criaturas-arma-natural-estagio-2026-11-06.sql), e depois as
   21 humanoides de armadura (criaturas-armadura-2026-11-06.sql). `antes` é a
   simulação com as regras de antes de 06/11; `semArmadura`, a do estágio e
   da arma natural; `agora`, a com armadura.

   Os dados são uma FOTOGRAFIA daquele dia, guardada aqui (TC_DADOS) — a
   página não roda a simulação. Para refazer, rode a simulação de novo e troque
   o bloco inteiro.
   ============================================================ */

const { useState } = React;

const TC_DADOS = {
 "cenarios": [
  {
   "id": "fracos",
   "nome": "Mais fracos",
   "estagio": "Estágio 1",
   "inimigos": "Orc, Esqueleto e Goblin",
   "n": 1000,
   "vit": 1000,
   "rod": 2.6,
   "lutas": [
    {
     "v": true,
     "rod": 5,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 2,
     "caidos": []
    },
    {
     "v": true,
     "rod": 2,
     "caidos": []
    },
    {
     "v": true,
     "rod": 2,
     "caidos": []
    },
    {
     "v": true,
     "rod": 2,
     "caidos": []
    },
    {
     "v": true,
     "rod": 2,
     "caidos": []
    },
    {
     "v": true,
     "rod": 5,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 2,
     "caidos": []
    },
    {
     "v": true,
     "rod": 3,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 2,
     "caidos": []
    }
   ],
   "comb": [
    {
     "nome": "Nihil",
     "pj": true,
     "ataques": 2.6,
     "acerto": 77,
     "danoAtaque": 15.7,
     "fc": 5,
     "fora": 1,
     "morto": 0
    },
    {
     "nome": "Eco",
     "pj": true,
     "ataques": 1.7,
     "acerto": 54,
     "danoAtaque": 3.7,
     "fc": 6,
     "fora": 33,
     "morto": 0
    },
    {
     "nome": "Yuldrous",
     "pj": true,
     "ataques": 2,
     "acerto": 61,
     "danoAtaque": 13.2,
     "fc": 5,
     "fora": 1,
     "morto": 0
    },
    {
     "nome": "Orc",
     "pj": false,
     "ataques": 1.6,
     "acerto": 32,
     "danoAtaque": 4.5,
     "fc": 29,
     "fora": 100,
     "morto": 11
    },
    {
     "nome": "Esqueleto",
     "pj": false,
     "ataques": 0.8,
     "acerto": 27,
     "danoAtaque": 3.8,
     "fc": 30,
     "fora": 100,
     "morto": 18
    },
    {
     "nome": "Goblin",
     "pj": false,
     "ataques": 0.1,
     "acerto": 35,
     "danoAtaque": 2.3,
     "fc": 31,
     "fora": 100,
     "morto": 22
    }
   ],
   "antes": {
    "vit": 100,
    "acertoGrupo": 74,
    "acertoCri": 31,
    "fc": 27
   },
   "agora": {
    "vit": 100,
    "acertoGrupo": 66,
    "acertoCri": 30,
    "fc": 30
   },
   "semArmadura": {
    "vit": 100,
    "acertoGrupo": 73,
    "acertoCri": 31,
    "fc": 30
   }
  },
  {
   "id": "iguais",
   "nome": "Mesmo estágio",
   "estagio": "Estágio 5",
   "inimigos": "Orc Capitão, Goblin Rei e Ogro",
   "n": 1000,
   "vit": 793,
   "rod": 7.3,
   "lutas": [
    {
     "v": true,
     "rod": 3,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 3,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 4,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 8,
     "caidos": [
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": true,
     "rod": 4,
     "caidos": []
    },
    {
     "v": true,
     "rod": 14,
     "caidos": [
      "Eco†"
     ]
    },
    {
     "v": true,
     "rod": 6,
     "caidos": []
    },
    {
     "v": true,
     "rod": 7,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 8,
     "caidos": [
      "Nihil",
      "Eco†"
     ]
    },
    {
     "v": true,
     "rod": 9,
     "caidos": [
      "Eco"
     ]
    }
   ],
   "comb": [
    {
     "nome": "Nihil",
     "pj": true,
     "ataques": 6.3,
     "acerto": 52,
     "danoAtaque": 11.3,
     "fc": 12,
     "fora": 30,
     "morto": 0
    },
    {
     "nome": "Eco",
     "pj": true,
     "ataques": 2.4,
     "acerto": 53,
     "danoAtaque": 4,
     "fc": 7,
     "fora": 83,
     "morto": 17
    },
    {
     "nome": "Orc Capitão",
     "pj": false,
     "ataques": 4.8,
     "acerto": 30,
     "danoAtaque": 4.5,
     "fc": 29,
     "fora": 84,
     "morto": 24
    },
    {
     "nome": "Goblin Rei",
     "pj": false,
     "ataques": 3,
     "acerto": 30,
     "danoAtaque": 4.8,
     "fc": 30,
     "fora": 91,
     "morto": 29
    },
    {
     "nome": "Yuldrous",
     "pj": true,
     "ataques": 5.3,
     "acerto": 36,
     "danoAtaque": 7.7,
     "fc": 25,
     "fora": 35,
     "morto": 0
    },
    {
     "nome": "Ogro",
     "pj": false,
     "ataques": 5.5,
     "acerto": 31,
     "danoAtaque": 2.1,
     "fc": 29,
     "fora": 84,
     "morto": 11
    }
   ],
   "antes": {
    "vit": 99,
    "acertoGrupo": 72,
    "acertoCri": 29,
    "fc": 30
   },
   "agora": {
    "vit": 79,
    "acertoGrupo": 46,
    "acertoCri": 30,
    "fc": 29
   },
   "semArmadura": {
    "vit": 99,
    "acertoGrupo": 73,
    "acertoCri": 30,
    "fc": 30
   }
  },
  {
   "id": "fortes",
   "nome": "Mais fortes",
   "estagio": "Estágio 7 e 8",
   "inimigos": "Centauro, Dragoniano Guerreiro e Ogro Líder",
   "n": 1000,
   "vit": 603,
   "rod": 7.3,
   "lutas": [
    {
     "v": true,
     "rod": 4,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 7,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 7,
     "caidos": [
      "Nihil",
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 8,
     "caidos": [
      "Eco†",
      "Yuldrous"
     ]
    },
    {
     "v": true,
     "rod": 7,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 5,
     "caidos": []
    },
    {
     "v": true,
     "rod": 7,
     "caidos": [
      "Nihil",
      "Eco†"
     ]
    },
    {
     "v": true,
     "rod": 6,
     "caidos": []
    },
    {
     "v": true,
     "rod": 2,
     "caidos": []
    },
    {
     "v": true,
     "rod": 6,
     "caidos": []
    }
   ],
   "comb": [
    {
     "nome": "Dragoniano Guerreiro",
     "pj": false,
     "ataques": 9,
     "acerto": 31,
     "danoAtaque": 5,
     "fc": 28,
     "fora": 68,
     "morto": 14
    },
    {
     "nome": "Centauro",
     "pj": false,
     "ataques": 5.9,
     "acerto": 32,
     "danoAtaque": 3.7,
     "fc": 28,
     "fora": 66,
     "morto": 2
    },
    {
     "nome": "Nihil",
     "pj": true,
     "ataques": 4.7,
     "acerto": 64,
     "danoAtaque": 14.9,
     "fc": 5,
     "fora": 54,
     "morto": 0
    },
    {
     "nome": "Eco",
     "pj": true,
     "ataques": 1.1,
     "acerto": 53,
     "danoAtaque": 4,
     "fc": 6,
     "fora": 94,
     "morto": 24
    },
    {
     "nome": "Ogro Líder",
     "pj": false,
     "ataques": 3.2,
     "acerto": 33,
     "danoAtaque": 3.7,
     "fc": 27,
     "fora": 85,
     "morto": 30
    },
    {
     "nome": "Yuldrous",
     "pj": true,
     "ataques": 6.2,
     "acerto": 45,
     "danoAtaque": 10,
     "fc": 15,
     "fora": 42,
     "morto": 0
    }
   ],
   "antes": {
    "vit": 71,
    "acertoGrupo": 65,
    "acertoCri": 29,
    "fc": 30
   },
   "agora": {
    "vit": 60,
    "acertoGrupo": 53,
    "acertoCri": 32,
    "fc": 28
   },
   "semArmadura": {
    "vit": 64,
    "acertoGrupo": 65,
    "acertoCri": 32,
    "fc": 28
   }
  }
 ],
 "colunas": [
  {
   "nome": "Orc",
   "arma": "Espada",
   "nihil": -19,
   "eco": -13,
   "yuldrous": -11
  },
  {
   "nome": "Esqueleto",
   "arma": "Espada",
   "nihil": -21,
   "eco": -15,
   "yuldrous": -13
  },
  {
   "nome": "Goblin",
   "arma": "Punhal",
   "nihil": -18,
   "eco": -12,
   "yuldrous": -14
  },
  {
   "nome": "Orc Capitão",
   "arma": "Espada Longa",
   "nihil": -17,
   "eco": -11,
   "yuldrous": -7
  },
  {
   "nome": "Goblin Rei",
   "arma": "Espada Longa",
   "nihil": -16,
   "eco": -10,
   "yuldrous": -6
  },
  {
   "nome": "Ogro",
   "arma": "Porrete",
   "nihil": -14,
   "eco": -8,
   "yuldrous": -10
  },
  {
   "nome": "Centauro",
   "arma": "Arco Composto",
   "nihil": -13,
   "eco": -7,
   "yuldrous": -5
  },
  {
   "nome": "Dragoniano Guerreiro",
   "arma": "Montante",
   "nihil": -13,
   "eco": -7,
   "yuldrous": -3
  },
  {
   "nome": "Ogro Líder",
   "arma": "Espada",
   "nihil": -12,
   "eco": -6,
   "yuldrous": -4
  }
 ],
 "grupo": [
  {
   "nome": "Yuldrous",
   "arma": "Martelo de Guerra",
   "def": "M13",
   "min": -8,
   "max": 3
  },
  {
   "nome": "Nihil",
   "arma": "Lança Alabarda",
   "def": "L19",
   "min": -2,
   "max": 9
  },
  {
   "nome": "Eco",
   "arma": "Necroptum",
   "def": "L13",
   "min": -6,
   "max": 5
  }
 ],
 "defesas": [
  {
   "nome": "Orc",
   "def": "L4"
  },
  {
   "nome": "Esqueleto",
   "def": "L2"
  },
  {
   "nome": "Goblin",
   "def": "L2"
  },
  {
   "nome": "Orc Capitão",
   "def": "L13"
  },
  {
   "nome": "Goblin Rei",
   "def": "L12"
  },
  {
   "nome": "Ogro",
   "def": "L2"
  },
  {
   "nome": "Centauro",
   "def": "L7"
  },
  {
   "nome": "Dragoniano Guerreiro",
   "def": "M10"
  },
  {
   "nome": "Ogro Líder",
   "def": "L8"
  }
 ]
};

// Coluna como a tabela lê: abaixo de −7 trava em −7.
const tcNum = (v) => String(v).replace('.', ',').replace('-', '−');
const tcCol = (v) => (v < -7 ? `${tcNum(v)} → −7` : tcNum(v));
const tcIniciais = (caidos) => caidos.map((n) => n[0] + (n.endsWith('†') ? '†' : '')).join(' ');

/* Um grupo: o passe com o placar das 1.000 lutas e a fileira das 10 primeiras. */
function TcGrupo({ c }) {
  const pct = Math.round((100 * c.vit) / c.n);
  return (
    <section className="tc-grupo">
      <div className="mn-passe tc-passe">
        <div className="mn-celula">
          <span className="mn-rotulo">{c.estagio}</span>
          <span className="mn-celula-valor">{c.nome}</span>
          <span className="tc-inimigos">{c.inimigos}</span>
        </div>
        <div className="mn-celula">
          <span className="mn-rotulo">Vitórias</span>
          <span className={'mn-celula-valor ' + (pct < 80 ? 'mn-celula-valor--alerta' : 'mn-celula-valor--vivo')}>{pct}%</span>
        </div>
        <div className="mn-celula">
          <span className="mn-rotulo">Rodadas</span>
          <span className="mn-celula-valor">{tcNum(c.rod)}</span>
        </div>
      </div>
      <ol className="tc-lutas" aria-label={`As 10 primeiras lutas contra ${c.inimigos}`}>
        {c.lutas.map((l, i) => (
          <li
            key={i}
            className={'tc-luta ' + (l.v ? 'is-vitoria' : 'is-derrota')}
            aria-label={`Luta ${i + 1}: ${l.v ? 'vitória' : 'derrota'} na rodada ${l.rod}${l.caidos.length ? '. Caíram: ' + l.caidos.join(', ') : ''}`}
          >
            <b>{l.v ? 'V' : 'D'}</b>
            <span>{l.rod}</span>
            <span className="tc-luta-caidos">{tcIniciais(l.caidos)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TestesCombateModal({ lang = 'pt', onClose }) {
  const [grupo, setGrupo] = useState('fortes');
  const atual = TC_DADOS.cenarios.find((c) => c.id === grupo) || TC_DADOS.cenarios[0];

  return (
    <ModalShell
      title={lang === 'en' ? 'Combat tests' : 'Testes de combate'}
      lang={lang}
      size="full"
      extraClass="modal-testes-combate"
      onClose={onClose}
    >
      <div className="tc">
        <p className="tc-intro">
          <b>Eco, Yuldrous e Nihil</b> contra três grupos de três criaturas, no motor de batalha
          da mesa, com as fichas e o bestiário de <b>06/11/2026</b>. As porcentagens vêm de
          1.000 lutas por grupo; as 10 primeiras aparecem uma a uma: <b>V</b> vitória,
          <b> D</b> derrota, a rodada em que terminou e quem do grupo caiu
          (E Eco, N Nihil, Y Yuldrous; † morreu).
        </p>

        <div className="tc-grupos">
          {TC_DADOS.cenarios.map((c) => <TcGrupo key={c.id} c={c} />)}
        </div>

        {/* ── cada combatente ── */}
        <section className="tc-sec">
          <div className="mn-quadro-cabeca tc-cabeca">
            <h3 className="tc-sec-titulo">Cada combatente</h3>
            <div className="best-chips" role="group" aria-label="Grupo de criaturas">
              {TC_DADOS.cenarios.map((c) => (
                <button
                  key={c.id} type="button"
                  className={'best-chip tc-chip' + (grupo === c.id ? ' is-active' : '')}
                  aria-pressed={grupo === c.id}
                  onClick={() => setGrupo(c.id)}
                >{c.nome}</button>
              ))}
            </div>
          </div>
          <div className="tc-rolagem">
            <div className="tc-tabela" role="table" aria-label={`Combatentes contra ${atual.inimigos}`}>
              <div className="mn-quadro-linha tc-linha tc-linha--cabeca" role="row">
                {['Combatente', 'Ataques por luta', 'Acerto', 'Dano por ataque', 'Falha Crítica', 'Fora de combate', 'Morto'].map((r, i) => (
                  <span key={r} role="columnheader" className={'mn-rotulo' + (i ? ' mn-quadro-num' : '')}>{r}</span>
                ))}
              </div>
              {atual.comb.map((k) => (
                <div className="mn-quadro-linha tc-linha" role="row" key={k.nome}>
                  <span role="cell" className={k.pj ? 'tc-pj' : ''}>{k.nome}</span>
                  <span role="cell" className="mn-quadro-num">{tcNum(k.ataques)}</span>
                  <span role="cell" className={'mn-quadro-num' + (k.acerto < 40 ? ' tc-brasa' : '')}>{k.acerto}%</span>
                  <span role="cell" className="mn-quadro-num">{tcNum(k.danoAtaque)}</span>
                  <span role="cell" className={'mn-quadro-num' + (k.fc >= 20 ? ' tc-brasa' : '')}>{k.fc}%</span>
                  <span role="cell" className={'mn-quadro-num' + (k.pj && k.fora >= 50 ? ' tc-brasa' : '')}>{k.fora}%</span>
                  <span role="cell" className={'mn-quadro-num' + (k.pj && k.morto > 0 ? ' tc-brasa' : '')}>{k.morto}%</span>
                </div>
              ))}
            </div>
          </div>
          <p className="tc-nota">
            Falha Crítica é a parte dos ataques que tirou Falha Crítica no primeiro dado. Fora de
            combate soma desmaiados e mortos ao fim da luta.
          </p>
        </section>

        {/* ── a coluna de ataque ── */}
        <section className="tc-sec">
          <div className="mn-quadro-cabeca">
            <h3 className="tc-sec-titulo">A coluna de ataque</h3>
          </div>
          <p className="tc-nota">
            A coluna é o L/M/P de quem ataca menos a defesa de quem apanha (Nihil L19, Eco L13,
            Yuldrous M13), e a tabela trava em <b>−7</b>. Nessa coluna, 1 a 6 no d20 é Falha Crítica
            e 7 a 14 é erro. Por isso as criaturas acertam cerca de 3 golpes em 10. Com a armadura
            delas, o grupo também desceu: ataca de {tcNum(Math.min(...TC_DADOS.grupo.map((g) => g.min)))} a
            +{Math.max(...TC_DADOS.grupo.map((g) => g.max))} contra elas (defesas:{' '}
            {TC_DADOS.defesas.map((d) => `${d.nome} ${d.def}`).join(', ')}).
          </p>
          <div className="tc-rolagem">
            <div className="tc-tabela" role="table" aria-label="Coluna de ataque das criaturas contra o grupo">
              <div className="mn-quadro-linha tc-linha tc-linha--col tc-linha--cabeca" role="row">
                {['Criatura', 'Contra Nihil', 'Contra Eco', 'Contra Yuldrous'].map((r, i) => (
                  <span key={r} role="columnheader" className={'mn-rotulo' + (i ? ' mn-quadro-num' : '')}>{r}</span>
                ))}
              </div>
              {TC_DADOS.colunas.map((c) => (
                <div className="mn-quadro-linha tc-linha tc-linha--col" role="row" key={c.nome}>
                  <span role="cell">{c.nome} <span className="tc-arma">{c.arma}</span></span>
                  {[c.nihil, c.eco, c.yuldrous].map((v, i) => (
                    <span role="cell" key={i} className={'mn-quadro-num' + (v <= -7 ? ' tc-brasa' : '')}>{tcCol(v)}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── o que mudou ── */}
        <section className="tc-sec">
          <div className="mn-quadro-cabeca">
            <h3 className="tc-sec-titulo">O que mudou em 06/11</h3>
          </div>
          <p className="tc-nota">
            O L/M/P da criatura passou a somar o <b>estágio</b>, como o personagem soma o nível no
            grupo de armas, e as 110 criaturas sem dano receberam a <b>arma natural</b> do catálogo.
            Depois, 21 humanoides receberam <b>armadura</b> do catálogo, mais peças quanto mais alto
            o posto (o Orc veste um colete; o Orc Capitão, cinco peças). Dragões, cobras e bichos
            seguem sem.
          </p>
          <div className="tc-rolagem">
            <div className="tc-tabela" role="table" aria-label="Vitórias e acertos antes e depois das mudanças">
              <div className="mn-quadro-linha tc-linha tc-linha--mudou tc-linha--cabeca" role="row">
                {['Grupo', 'Vitórias: antes → estágio → armadura', 'Acerto do grupo', 'Acerto das criaturas'].map((r, i) => (
                  <span key={r} role="columnheader" className={'mn-rotulo' + (i ? ' mn-quadro-num' : '')}>{r}</span>
                ))}
              </div>
              {TC_DADOS.cenarios.map((c) => (
                <div className="mn-quadro-linha tc-linha tc-linha--mudou" role="row" key={c.id}>
                  <span role="cell">{c.nome}</span>
                  <span role="cell" className="mn-quadro-num">{c.antes.vit}% → {c.semArmadura.vit}% → {Math.round((100 * c.vit) / c.n)}%</span>
                  <span role="cell" className={'mn-quadro-num' + (c.agora.acertoGrupo < c.antes.acertoGrupo ? ' tc-brasa' : '')}>{c.antes.acertoGrupo}% → {c.agora.acertoGrupo}%</span>
                  <span role="cell" className="mn-quadro-num">{c.antes.acertoCri}% → {c.agora.acertoCri}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── como ── */}
        <section className="tc-sec">
          <div className="mn-quadro-cabeca">
            <h3 className="tc-sec-titulo">Como a luta foi simulada</h3>
          </div>
          <ul className="tc-metodo">
            <li>Todos começam com a vida cheia e as condições zeradas.</li>
            <li>Cada um ataca com a arma de maior dano; o Eco lança Bola de Fogo enquanto tem karma. O alvo é sempre o inimigo de pé mais perto de cair.</li>
            <li>Ficaram de fora as técnicas, as curas e os milagres, as magias de uma rodada e o tabuleiro: todos alcançam todos.</li>
            <li>Regras de 06/11: técnicas um nível mais fáceis e autodano da Falha Crítica em um terço.</li>
          </ul>
        </section>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { TestesCombateModal, TC_DADOS });
