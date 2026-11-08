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
   21 humanoides de armadura (criaturas-armadura-2026-11-06.sql).

   RODADA DE 07/11/2026 (usuário: "Mostre uma rodada nova no testes de
   combate"): a criatura soma o atributo de ajuste × 2 no L/M/P
   (criaturas-ajuste-x2-2026-11-07.sql) e a defesa da armadura caiu por peça
   (armaduras-defesa-2026-11-07.sql; conjunto completo Leve 23 → 8, Média
   14 → 4, Pesada 5 → 1). `armadura` é a rodada de 06/11, com armadura;
   `x2`, só o atributo × 2; `agora`, as duas mudanças juntas.

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
   "rod": 2.5,
   "lutas": [
    {
     "v": true,
     "rod": 2,
     "caidos": []
    },
    {
     "v": true,
     "rod": 3,
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
     "rod": 4,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 3,
     "caidos": []
    }
   ],
   "comb": [
    {
     "nome": "Nihil",
     "pj": true,
     "ataques": 2.4,
     "acerto": 86,
     "danoAtaque": 18.7,
     "fc": 4,
     "fora": 0,
     "morto": 0
    },
    {
     "nome": "Eco",
     "pj": true,
     "ataques": 1.6,
     "acerto": 54,
     "danoAtaque": 3.6,
     "fc": 5,
     "fora": 31,
     "morto": 0
    },
    {
     "nome": "Yuldrous",
     "pj": true,
     "ataques": 1.8,
     "acerto": 65,
     "danoAtaque": 14.7,
     "fc": 5,
     "fora": 1,
     "morto": 0
    },
    {
     "nome": "Orc",
     "pj": false,
     "ataques": 1.5,
     "acerto": 39,
     "danoAtaque": 4.9,
     "fc": 18,
     "fora": 100,
     "morto": 10
    },
    {
     "nome": "Esqueleto",
     "pj": false,
     "ataques": 0.7,
     "acerto": 28,
     "danoAtaque": 3.8,
     "fc": 33,
     "fora": 100,
     "morto": 20
    },
    {
     "nome": "Goblin",
     "pj": false,
     "ataques": 0.1,
     "acerto": 36,
     "danoAtaque": 2.9,
     "fc": 24,
     "fora": 100,
     "morto": 30
    }
   ],
   "armadura": {
    "vit": 100,
    "acertoGrupo": 66,
    "acertoCri": 30,
    "fc": 30
   },
   "x2": {
    "vit": 100,
    "acertoGrupo": 67,
    "acertoCri": 30,
    "fc": 30
   },
   "agora": {
    "vit": 100,
    "acertoGrupo": 71,
    "acertoCri": 35,
    "fc": 23
   }
  },
  {
   "id": "iguais",
   "nome": "Mesmo estágio",
   "estagio": "Estágio 5",
   "inimigos": "Orc Capitão, Goblin Rei e Ogro",
   "n": 1000,
   "vit": 873,
   "rod": 7.1,
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
     "rod": 6,
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
     "rod": 5,
     "caidos": []
    },
    {
     "v": true,
     "rod": 6,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 5,
     "caidos": [
      "Eco†"
     ]
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
     "rod": 5,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": true,
     "rod": 7,
     "caidos": [
      "Eco†"
     ]
    },
    {
     "v": true,
     "rod": 4,
     "caidos": [
      "Eco†"
     ]
    }
   ],
   "comb": [
    {
     "nome": "Nihil",
     "pj": true,
     "ataques": 5.8,
     "acerto": 71,
     "danoAtaque": 15.9,
     "fc": 6,
     "fora": 27,
     "morto": 0
    },
    {
     "nome": "Eco",
     "pj": true,
     "ataques": 1.7,
     "acerto": 55,
     "danoAtaque": 3.6,
     "fc": 5,
     "fora": 95,
     "morto": 13
    },
    {
     "nome": "Orc Capitão",
     "pj": false,
     "ataques": 4.5,
     "acerto": 39,
     "danoAtaque": 5.6,
     "fc": 20,
     "fora": 90,
     "morto": 19
    },
    {
     "nome": "Goblin Rei",
     "pj": false,
     "ataques": 2.4,
     "acerto": 47,
     "danoAtaque": 6.9,
     "fc": 13,
     "fora": 95,
     "morto": 29
    },
    {
     "nome": "Yuldrous",
     "pj": true,
     "ataques": 6.4,
     "acerto": 55,
     "danoAtaque": 11.2,
     "fc": 9,
     "fora": 14,
     "morto": 0
    },
    {
     "nome": "Ogro",
     "pj": false,
     "ataques": 5.9,
     "acerto": 41,
     "danoAtaque": 2.5,
     "fc": 16,
     "fora": 88,
     "morto": 19
    }
   ],
   "armadura": {
    "vit": 79,
    "acertoGrupo": 46,
    "acertoCri": 30,
    "fc": 29
   },
   "x2": {
    "vit": 77,
    "acertoGrupo": 46,
    "acertoCri": 31,
    "fc": 29
   },
   "agora": {
    "vit": 87,
    "acertoGrupo": 62,
    "acertoCri": 41,
    "fc": 17
   }
  },
  {
   "id": "fortes",
   "nome": "Mais fortes",
   "estagio": "Estágio 7 e 8",
   "inimigos": "Centauro, Dragoniano Guerreiro e Ogro Líder",
   "n": 1000,
   "vit": 114,
   "rod": 5.1,
   "lutas": [
    {
     "v": false,
     "rod": 5,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": false,
     "rod": 4,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": false,
     "rod": 3,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": false,
     "rod": 4,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": false,
     "rod": 7,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": false,
     "rod": 6,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": false,
     "rod": 4,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": false,
     "rod": 5,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    },
    {
     "v": true,
     "rod": 8,
     "caidos": [
      "Eco"
     ]
    },
    {
     "v": false,
     "rod": 3,
     "caidos": [
      "Nihil",
      "Eco",
      "Yuldrous"
     ]
    }
   ],
   "comb": [
    {
     "nome": "Dragoniano Guerreiro",
     "pj": false,
     "ataques": 8.3,
     "acerto": 61,
     "danoAtaque": 9.2,
     "fc": 9,
     "fora": 17,
     "morto": 5
    },
    {
     "nome": "Centauro",
     "pj": false,
     "ataques": 4.4,
     "acerto": 52,
     "danoAtaque": 6.1,
     "fc": 11,
     "fora": 14,
     "morto": 1
    },
    {
     "nome": "Nihil",
     "pj": true,
     "ataques": 2.4,
     "acerto": 81,
     "danoAtaque": 18.8,
     "fc": 5,
     "fora": 93,
     "morto": 0
    },
    {
     "nome": "Eco",
     "pj": true,
     "ataques": 0.2,
     "acerto": 54,
     "danoAtaque": 3.7,
     "fc": 5,
     "fora": 100,
     "morto": 10
    },
    {
     "nome": "Ogro Líder",
     "pj": false,
     "ataques": 2.7,
     "acerto": 56,
     "danoAtaque": 6,
     "fc": 7,
     "fora": 49,
     "morto": 24
    },
    {
     "nome": "Yuldrous",
     "pj": true,
     "ataques": 4.1,
     "acerto": 60,
     "danoAtaque": 12.9,
     "fc": 7,
     "fora": 89,
     "morto": 0
    }
   ],
   "armadura": {
    "vit": 60,
    "acertoGrupo": 53,
    "acertoCri": 32,
    "fc": 28
   },
   "x2": {
    "vit": 52,
    "acertoGrupo": 52,
    "acertoCri": 34,
    "fc": 26
   },
   "agora": {
    "vit": 11,
    "acertoGrupo": 67,
    "acertoCri": 58,
    "fc": 9
   }
  }
 ],
 "colunas": [
  {
   "nome": "Orc",
   "arma": "Espada",
   "nihil": -8,
   "eco": -4,
   "yuldrous": -3
  },
  {
   "nome": "Esqueleto",
   "arma": "Espada",
   "nihil": -12,
   "eco": -8,
   "yuldrous": -7
  },
  {
   "nome": "Goblin",
   "arma": "Punhal",
   "nihil": -8,
   "eco": -4,
   "yuldrous": -7
  },
  {
   "nome": "Orc Capitão",
   "arma": "Espada Longa",
   "nihil": -6,
   "eco": -2,
   "yuldrous": 1
  },
  {
   "nome": "Goblin Rei",
   "arma": "Espada Longa",
   "nihil": -4,
   "eco": 0,
   "yuldrous": 3
  },
  {
   "nome": "Ogro",
   "arma": "Porrete",
   "nihil": -4,
   "eco": 0,
   "yuldrous": -3
  },
  {
   "nome": "Centauro",
   "arma": "Arco Composto",
   "nihil": -2,
   "eco": 2,
   "yuldrous": 3
  },
  {
   "nome": "Dragoniano Guerreiro",
   "arma": "Montante",
   "nihil": 0,
   "eco": 4,
   "yuldrous": 7
  },
  {
   "nome": "Ogro Líder",
   "arma": "Espada",
   "nihil": -1,
   "eco": 3,
   "yuldrous": 4
  }
 ],
 "grupo": [
  {
   "nome": "Nihil",
   "arma": "Lança Alabarda",
   "def": "L9",
   "min": 5,
   "max": 11
  },
  {
   "nome": "Eco",
   "arma": "Necroptum",
   "def": "L5",
   "min": 1,
   "max": 7
  },
  {
   "nome": "Yuldrous",
   "arma": "Martelo de Guerra",
   "def": "M6",
   "min": -1,
   "max": 5
  }
 ],
 "defesas": [
  {
   "nome": "Orc",
   "def": "L2"
  },
  {
   "nome": "Esqueleto",
   "def": "L0"
  },
  {
   "nome": "Goblin",
   "def": "L1"
  },
  {
   "nome": "Orc Capitão",
   "def": "L4"
  },
  {
   "nome": "Goblin Rei",
   "def": "L6"
  },
  {
   "nome": "Ogro",
   "def": "L1"
  },
  {
   "nome": "Centauro",
   "def": "L4"
  },
  {
   "nome": "Dragoniano Guerreiro",
   "def": "M4"
  },
  {
   "nome": "Ogro Líder",
   "def": "L3"
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
          da mesa, com as fichas e o bestiário de <b>07/11/2026</b>. As porcentagens vêm de
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
            A coluna é o L/M/P de quem ataca menos a defesa de quem apanha
            ({TC_DADOS.grupo.map((g) => `${g.nome} ${g.def}`).join(', ')}), e a tabela trava
            em <b>−7</b>. Nessa coluna, 1 a 6 no d20 é Falha Crítica e 7 a 14 é erro. Com a defesa
            nova, só as criaturas de estágio 1 ainda batem no piso; as mais fortes atacam entre
            −2 e +7. O grupo ataca de {tcNum(Math.min(...TC_DADOS.grupo.map((g) => g.min)))} a
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
            <h3 className="tc-sec-titulo">O que mudou em 07/11</h3>
          </div>
          <p className="tc-nota">
            A criatura passou a somar o atributo de ajuste da arma <b>× 2</b> no L/M/P, como o
            personagem. E a <b>defesa da armadura</b> caiu por peça: o conjunto completo Leve foi de
            23 para 8, o Médio de 14 para 4 e o Pesado de 5 para 1. Absorção e resistência não
            mudaram: a Leve defende, a Média dura e a Pesada segura o golpe, mas defende pouco e
            quebra com o tempo.
          </p>
          <div className="tc-rolagem">
            <div className="tc-tabela" role="table" aria-label="Vitórias e acertos antes e depois das mudanças">
              <div className="mn-quadro-linha tc-linha tc-linha--mudou tc-linha--cabeca" role="row">
                {['Grupo', 'Vitórias: 06/11 → × 2 → defesa nova', 'Acerto do grupo', 'Acerto das criaturas'].map((r, i) => (
                  <span key={r} role="columnheader" className={'mn-rotulo' + (i ? ' mn-quadro-num' : '')}>{r}</span>
                ))}
              </div>
              {TC_DADOS.cenarios.map((c) => (
                <div className="mn-quadro-linha tc-linha tc-linha--mudou" role="row" key={c.id}>
                  <span role="cell">{c.nome}</span>
                  <span role="cell" className={'mn-quadro-num' + (c.agora.vit < c.armadura.vit - 20 ? ' tc-brasa' : '')}>{c.armadura.vit}% → {c.x2.vit}% → {Math.round((100 * c.vit) / c.n)}%</span>
                  <span role="cell" className="mn-quadro-num">{c.armadura.acertoGrupo}% → {c.agora.acertoGrupo}%</span>
                  <span role="cell" className="mn-quadro-num">{c.armadura.acertoCri}% → {c.agora.acertoCri}%</span>
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
            <li>Regras de 06/11: técnicas um nível mais fáceis e autodano da Falha Crítica em um terço. A Sagração das peças segue como está: o Yuldrous soma +5 de absorção em cada uma.</li>
          </ul>
        </section>
      </div>
    </ModalShell>
  );
}

Object.assign(window, { TestesCombateModal, TC_DADOS });
