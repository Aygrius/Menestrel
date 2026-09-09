# Técnicas de combate — efeitos mecânicos nas rodadas (Fase 1)

**Data:** 2026-09-09
**Escopo:** as técnicas de combate deixam de ser texto narrativo e passam a
produzir efeito mecânico nas rodadas de batalha. Fase 1 cobre as 24 técnicas
cujo efeito é *um número somado a um stat por N rodadas*. Inclui a correção dos
pontos de ação de Guerreiro/Ladino.

---

## 1. Problema

A tabela `tecnicas` tem 58 linhas, cada uma com um campo `efeito` em prosa
descrevendo o que acontece em combate. Hoje esse texto é **exibido e logado, e
nada mais**: `aplicarAcao` grava `tecnica_efeito` no log (`batalha.jsx:2367`) e
a aba Técnica rola um d20 que não muda nada no estado da batalha
(`aplicarTeste`, `batalha.jsx:2428`).

O cabeçalho do próprio arquivo já registra a lacuna como trabalho pendente,
desde 06/07/2026:

> PRÓXIMO PROJETO (…): automatizar os efeitos hoje apenas narrativos —
> (a) fórmula do bônus de TÉCNICA anexada ao ataque de arma; (b) efeitos da
> CRITICOS_TABELA.

### O que já existe e funciona

O motor de efeito por rodada está pronto e testado. Não é preciso construir
nada disso:

| Peça | Onde | O que faz |
|---|---|---|
| `status_temp[]` | formato do snapshot | `{ id, nome, icone, rodadas_rest, efeito: { tipo, valor } }` |
| `somaEfeitosStatus(p, tipo)` | `batalha.jsx:1609` | soma os `valor` de um tipo |
| `statusTemEfeito(p, tipo)` | `batalha.jsx:1614` | efeito sem valor (ex.: `sem_acoes`) |
| `decrementarStatusTemp` | `batalha.jsx:1693` | −1 por virada; `rodadas_rest: null` persiste |
| `processarViradaDeRodada` | `batalha.jsx:1667` | reset de PA → dano por rodada → decremento |
| `processarDanoPorRodada` | `batalha.jsx:1656` | aplica `dano_por_rodada` direto na EF |
| `vbEfetivo(p)` | `batalha.jsx:1618` | `vb` + `mod_vb`, sem persistir |
| `totalTecnica(t, obj, atr)` | `game-data.jsx:738` | nível comprado + atributo de `ajuste` (−7 + atr se não comprada) |
| `D20_QUALIDADE_MINIMA` | `dado-d20.jsx:278` | dificuldade → q mínimo em `RESULTADOS_ACAO` |
| `tecnicasCompativeisComArma` | `batalha.jsx:706` | filtro por `grupo_armas` (já usado no dropdown do ataque) |

Cinco tipos de `efeito` existem hoje: `mod_coluna`, `mod_defesa`, `mod_vb`,
`sem_acoes`, `dano_por_rodada` — todos produzidos pela Falha Crítica
(`FC_EFEITOS`, `batalha.jsx:1598`) e, no caso de `mod_vb`, também pelas magias
de apoio.

### A lacuna

Nenhuma técnica produz `status_temp`. O caminho da técnica termina no log.

---

## 2. Análise das 58 técnicas

O campo `efeito` tem exatamente duas formas gramaticais, e a forma determina se
há teste de dado.

**Família A — "Seu total de X é adicionado/subtraído a…" (24 técnicas).** Sem
teste. O valor é `totalTecnica()`. Duração explícita no texto.

**Família B — "Um teste de X (Dificuldade) …" (34 técnicas).** Rola d20 contra
`D20_QUALIDADE_MINIMA[dificuldade]`; só aplica no sucesso.

### Corte da Fase 1

A Fase 1 leva **as técnicas cujo efeito é um modificador numérico persistente
em um stat** — reusam o `status_temp` quase inteiro. As que reescrevem a
*resolução do golpe* ficam para a Fase 2.

| Primitiva | Técnicas | Duração |
|---|---|---|
| `mod_ataque` | Mira | 1 |
| | Ricochetear | 1 |
| | Pugilato (só com arma do grupo CD) | 1 |
| | Ajustar Disparo | 2 |
| | Resguardar (− no adversário) | 2 |
| | Postura Ofensiva (+) | 3 |
| | Postura Defensiva (−) | 3 |
| | Explorar Fraqueza (parcial, ver 2.1) | 1 |
| `mod_defesa` | Defletir Ataque | 3 |
| | Imprevisibilidade | 3 |
| | Postura Defensiva (+) | 3 |
| | Postura Ofensiva (−) | 3 |
| | Pressionar Oponente (− no alvo) | 3 |
| `mod_vb` | Atirar em Movimento | 2 |
| | Expectativa (− no adversário) | 3 |
| | Disparo Rápido | 5 |
| | Voz de Comando (+ em 4 alvos) | 10 |
| `mod_eh_temp` | Animosidade | 2 |
| | Heroísmo | 5 |
| | Segundo Fôlego | 10 |
| `mod_rf` | Resistência à Dor | 5 |
| `mod_rm` | Resistência Extrema | 5 |
| `mod_dano_max` | Posicionamento (− no adversário) | 3 |
| `dano_por_rodada` | Sangramento (1 EF, teste Difícil) | 5 |
| **combinadas** | Centaurizar → `mod_ataque` + `mod_vb` | 2 |
| | Fúria → `mod_ataque` + `mod_eh_temp` + `mod_rf` + `mod_rm` | 5 |

Sangramento é a única da Família B na Fase 1, porque `dano_por_rodada` já
existe pronto.

### 2.1 Casos que a Fase 1 não fecha inteiros

- **Explorar Fraqueza** — "+total à coluna de ataque **e ignora a armadura do
  adversário**". A metade do ataque entra agora; `ignora_armadura` é Fase 2. O
  log marca a metade pendente, para o Mestre não supor que a armadura foi
  ignorada.
- **Remover Debilitação** — "+total à habilidade Escapar". Não é stat de
  rodada; fica narrativa.
- **Concentração, Luta às Cegas, Provocar, Conduzir Oponente** — narrativas ou
  de tabuleiro (metros). Continuam só no log, em qualquer fase.

### 2.2 Fase 2 (registrada, fora deste spec)

As ~21 restantes exigem reescrever a resolução do golpe: `ignora_eh`
(6 técnicas), dano extra % (5), dano recebido % (3), ataque duplo (3), impedir
ataque/técnicas (3), `ignora_armadura`, multi-alvo, dano em equipamento, anular
golpe, derrubar, redirecionar defesa, EH de montaria.

---

## 3. Decisões

Tomadas com o usuário em 09/09/2026:

1. **A aba Técnica vira a ativação.** Aplicar uma técnica é uma ação própria
   que custa 1 PA. O dropdown de técnica colado no ataque de arma continua
   narrativo nesta fase.
2. **O mapeamento mora em código**, chaveado por `tecnicas.key`, no molde do
   `EFEITO_CONDICAO_MAP`. O campo `efeito` do banco segue sendo a fonte
   human-readable exibida na UI.
3. **Duas fases**, esta é a primeira.
4. **Bônus de EH é temporário por cima do teto:** sobe `eh` e `eh_max`; na
   expiração devolve os dois, com piso 0 em `eh`.
5. **A duração conta a rodada da ativação.** É o que `decrementarStatusTemp` já
   faz com os status da Falha Crítica.
6. **`uso: 'Único'` = uma vez por batalha.**
7. **Reaplicar não acumula.** Reativar a mesma técnica no mesmo alvo **renova**
   `rodadas_rest` e mantém um único `status_temp`; não soma um segundo
   modificador. Fecha o loop de empilhar 5 Miras na mesma coluna.

8. **A restrição por equipamento entra na Fase 1.** Correção do usuário em
   09/09/2026: os dados já existem em `tecnicas.grupo_armas` e
   `tecnicas.grupo_armaduras`. Não é trabalho futuro — é regra a aplicar.

### 3.1 Restrição por arma e armadura

`grupo_armas` já é usado por `tecnicasCompativeisComArma` (`batalha.jsx:706`)
para filtrar o dropdown colado no ataque. `grupo_armaduras` **nunca virou regra
em lugar nenhum** — só é exibido no bestiário (`bestiario.jsx:721`) e na ficha
(`personagens.jsx:2779`).

A Fase 1 passa a exigir os dois na **ativação** da técnica, e a levar a
restrição de arma para dentro do efeito:

- **Ativação** — a técnica só aparece habilitada na aba Técnica se a arma
  empunhada estiver em `grupo_armas` e a armadura vestida em `grupo_armaduras`.
  O snapshot já carrega `defesa_sigla` (`L`/`M`/`P`, `batalha.jsx:875`), que é
  exatamente a granularidade de `grupo_armaduras`.
- **Aplicação** — o `mod_ataque` carrega a lista de `grupo_armas` da técnica e
  só entra na coluna quando a arma daquele golpe pertence à lista. Sem isso,
  ativar Mira com um arco e trocar para uma espada manteria o bônus.

Isso generaliza o caso especial que o Pugilato pedia (`grupo: 'CD'`): a
restrição passa a vir do banco para as 58, em vez de ser codificada por técnica
no registro.

`'Livre'` significa "sem restrição" nas duas colunas.

### 3.2 Dois defeitos encontrados no caminho

**Bug vivo, independente desta feature.** `tecnicasCompativeisComArma`
(`batalha.jsx:712`) testa `if (!t.grupo_armas) return true` para decidir se a
técnica é genérica. Mas `'Livre'` é truthy, então a execução cai no
`lista.includes(grupoArma)`, e `['Livre'].includes('CM')` é falso. **As 31
técnicas com `grupo_armas = 'Livre'` — mais da metade da tabela — nunca
aparecem no dropdown de técnica do ataque.** O comentário imediatamente acima
da função diz que deveriam aparecer, então é defeito, não desenho. Corrigido na
Fase 1 porque a mesma função passa a servir a aba Técnica.

**Dado corrompido.** `resistencia_extrema.grupo_armas = 'Intermitente'` — o
valor da coluna `uso` vazou para `grupo_armas` em algum import. As técnicas
irmãs (Fúria, Heroísmo, Resistência à Dor, Animosidade) são todas `'Livre'`, e
o `uso` da própria Resistência Extrema é `'Único'`. Corrigido por UPDATE, com o
script versionado em `scripts/sql/`.

---

## 4. Primitivas novas

A Fase 1 usa oito primitivas. Três já existem e são reusadas sem tocar —
`mod_defesa`, `mod_vb`, `dano_por_rodada`. As cinco novas:

| Primitiva | Onde morde | Nota |
|---|---|---|
| `mod_ataque` | coluna de ação **só** nas abas arma/magia (`batalha.jsx:4186` e o espelho do Jogador) | Separada de `mod_coluna` de propósito: o −7 da Falha Crítica pune toda ação; "coluna de ataque" da técnica não deve afetar teste de habilidade nem de técnica |
| `mod_eh_temp` | `eh` e `eh_max` do snapshot | Único efeito que **muda o snapshot** em vez de ser lido on-the-fly. Ver 4.1 |
| `mod_rf` / `mod_rm` | resolução de resistência | Somam sobre `p.rf` / `p.rm` |
| `mod_dano_max` | dano final, depois de `danoNoTier` | Piso 0 — não vira cura |

### 4.1 Ciclo de vida do `mod_eh_temp`

É o único caso com estado persistido, e por isso o único que precisa de
tratamento na expiração:

- **Aplicação:** `eh_max += valor`, `eh += valor`.
- **Consumo:** nenhuma regra especial — o dano come da EH somada, como sempre.
- **Expiração:** `eh_max -= valor`, e `eh = max(0, min(eh, eh_max))`. Quem já
  gastou o bônus não é punido duas vezes.
- **Ordem na virada:** a expiração roda **depois** de `processarDanoPorRodada` e
  junto do `decrementarStatusTemp`, dentro de `processarViradaDeRodada`.
- `statusPorPools` roda ao fim, porque zerar a EH derruba.

---

## 5. O registro

Arquivo novo: `src/01-core/tecnicas-efeito.jsx`.

```js
const TECNICA_EFEITO_MAP = {
  mira:        { modo: 'total', alvo: 'self',    rodadas: 1, icone: '🎯',
                 efeitos: [{ tipo: 'mod_ataque', sinal: +1 }] },
  expectativa: { modo: 'total', alvo: 'inimigo', rodadas: 3, icone: '👁️',
                 efeitos: [{ tipo: 'mod_vb', sinal: -1 }] },
  furia:       { modo: 'total', alvo: 'self',    rodadas: 5, icone: '😤',
                 efeitos: [{ tipo: 'mod_ataque',  sinal: +1 },
                           { tipo: 'mod_eh_temp', sinal: +1 },
                           { tipo: 'mod_rf',      sinal: +1 },
                           { tipo: 'mod_rm',      sinal: +1 }] },
  sangramento: { modo: 'teste', alvo: 'inimigo', rodadas: 5, icone: '🩸',
                 dificuldade: 'dificil',
                 efeitos: [{ tipo: 'dano_por_rodada', valor: 1 }] },
  // …24 entradas
};
```

- `modo: 'total'` → valor = `totalTecnica()` × `sinal`. Sem dado.
- `modo: 'teste'` → rola d20 contra `D20_QUALIDADE_MINIMA[dificuldade]`; aplica
  `valor` fixo só no sucesso.
- `alvo`: `'self'` | `'inimigo'` | `'aliados'` (Voz de Comando, até 4).
- Técnica **sem entrada no mapa** continua narrativa — o comportamento de hoje é
  o fallback, não um erro.

---

## 6. Aplicação

Função pura nova em `MotorBatalha`, no molde de `aplicarEfeitoApoio`
(`batalha.jsx:1855`), que já resolve exatamente este problema para magias:

```js
aplicarEfeitoTecnica(participante, tecnica, valor) → participante
```

Ela é a única dona da regra de não-acumular: se já existe `status_temp` com
`id === 'tec_' + key`, **substitui** aquele item renovando `rodadas_rest`, em vez
de dar push num segundo.

### Por que uma função pura

`aplicarTeste` existe em duas cópias — Mestre (`batalha.jsx:2428`) e Jogador
(`batalha.jsx:5291`). Essa duplicação já mordeu antes: a cópia do Jogador nem
decrementava `status_temp` até o fix de 07/2026 (comentário em
`batalha.jsx:5517`). Pôr a lógica numa função pura chamada pelas duas mantém a
duplicação no *call site*, não na regra.

### Mudanças na aba Técnica

- Seletor de alvo quando `alvo !== 'self'` — hoje a aba roda com `semCard`
  (`batalha.jsx:4803`).
- `modo: 'total'`: sem overlay de dado; aplica e debita 1 PA.
- `modo: 'teste'`: overlay de d20 na dificuldade do mapa; aplica só no sucesso,
  debita 1 PA nos dois casos (a técnica foi tentada).
- `uso: 'Único'` já usada na batalha → opção desabilitada, com o motivo no
  tooltip.
- Log ganha `tecnica_efeito_aplicado` com os deltas, para o Mestre auditar.

---

## 7. Pontos de ação de Guerreiro/Ladino

Correção independente, no mesmo merge por ser de uma linha.

`pontosAcaoPJ` (`batalha.jsx:721`) hoje:

```js
if (guerreiroOuLadino && pj.especializacao) return 4;
return guerreiroOuLadino ? 2 : 1;
```

Passa a ser `2` para Guerreiro/Ladino **especializado** e `1` para todo o resto —
inclusive Guerreiro/Ladino antes da especialização, que hoje já saem na frente
das demais profissões.

`motor-batalha.test.js:32-42` muda junto (4 → 2, 2 → 1).

**Efeito colateral que fica valendo:** o bônus de +1 PA por velocidade > 30
(`processarViradaDeRodada`, `batalha.jsx:1685`) não é tocado, então um
especializado veloz agirá 3 vezes por rodada, não 2.

---

## 8. Testes

TDD. Dois arquivos novos, mais a edição de um existente.

**`src/01-core/tecnicas-efeito.test.js`** — o registro contra o banco:

- as 24 entradas têm `modo`, `alvo`, `rodadas` e ao menos um efeito;
- toda `key` do mapa existe em `tecnicas` (fixture do banco);
- `modo: 'teste'` sempre traz `dificuldade` válida em `D20_QUALIDADE_MINIMA`;
- `rodadas` de cada entrada bate com o número escrito no `efeito` do banco —
  trava a divergência entre o texto exibido e a mecânica aplicada.

**`src/12-batalha/tecnica-efeitos.test.js`** — a aplicação:

- `modo: 'total'` cria `status_temp` com `valor === totalTecnica()`;
- sinal negativo em Expectativa/Resguardar/Pressionar/Posicionamento;
- Fúria cria os 4 efeitos de uma vez;
- **reaplicar renova `rodadas_rest` e não cria segundo status** (decisão 7);
- `mod_eh_temp` sobe `eh`/`eh_max` e, na expiração, devolve com piso 0 em quem
  gastou o bônus;
- `mod_ataque` entra na coluna de arma e **não** entra no teste de habilidade;
- `uso: 'Único'` bloqueia a segunda ativação na mesma batalha;
- Sangramento no `modo: 'teste'` só aplica no sucesso, e morde 1 EF por rodada
  usando o `processarDanoPorRodada` existente.

**`src/12-batalha/motor-batalha.test.js`** — PA (seção 7).

---

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Regressão no cálculo de dano — a área levou 4 fixes recentes (`bc1fa6a`…`c0eb189`) | `mod_dano_max` é a única primitiva que toca dano, e entra **depois** de `danoNoTier`, sem alterar a função |
| A cópia Jogador sair de sincronia com a do Mestre | Regra numa função pura de `MotorBatalha`; teste cobre a função, não o componente |
| Texto do banco e mecânica divergirem depois de um UPDATE | Teste que compara `rodadas` do mapa com o número escrito no `efeito` |
| Técnica sem entrada no mapa quebrar a aba | Fallback é o comportamento narrativo de hoje, não erro |
