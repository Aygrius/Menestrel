# Velocidade em batalha — iniciativa, movimento e ação extra

**Data:** 2026-09-01
**Escopo:** magias que alteram a velocidade passam a valer mecanicamente em
batalha. A velocidade efetiva reordena a iniciativa, muda o passo no tabuleiro
e concede ação extra acima de 30.

> **Esta spec substitui a primeira versão do mesmo dia.** A investigação dos
> dados reais inverteu duas decisões iniciais (campo estruturado → leitura do
> texto; "nunca rola dado" → a magia diz quando rola) e revelou duas mecânicas
> que não estavam no radar (concentração e ação extra). O histórico das
> reversões está na seção 2.

---

## 1. Problema

Um combatente que recebe uma magia de aceleração — ou de lentidão — deveria
passar a agir antes (ou depois) dos demais nas rodadas seguintes. Hoje isso é
impossível.

### O que já existe e funciona

A engrenagem "velocidade efetiva reordena a iniciativa" está pronta e testada
em `src/12-batalha/batalha.jsx`:

| Peça | Onde | O que faz |
|---|---|---|
| `status_temp[].efeito` | formato do snapshot | `{ tipo: 'mod_vb', valor: N }` |
| `somaEfeitosStatus(p, tipo)` | `batalha.jsx:1375` | soma os `valor` de um tipo |
| `vbEfetivo(p)` | `batalha.jsx:1384` | `p.vb` + soma dos `mod_vb`, sem persistir |
| `ordenarIniciativaEfetiva` | `batalha.jsx:1395` | ordena pela VB efetiva, preserva o `vb` real |
| `montarNovaRodada` | `batalha.jsx:1454` | chama a reordenação a cada virada de rodada |

Cobertura viva: `motor-batalha.test.js:395`.

### A lacuna

`mod_vb` tem **um único produtor**: `FC_EFEITOS[6]` (`batalha.jsx:1369`), a
Falha Crítica q6. Magias não conseguem criar esse efeito —
`magiasOfensivasDoAtor` descarta tudo que não causa dano:
*"não-ofensiva → fora desta fase (cura/buff vêm depois)"* (`batalha.jsx:542`).

**Falta o produtor, não o consumidor.**

---

## 2. Decisões, e o que mudou de ideia no caminho

| # | Decisão final | Como chegou aqui |
|---|---|---|
| 1 | Efeito vem do **catálogo**, automático ao usar | direto |
| 2 | Lido do **texto de `nivel_N`**, como o dano já é | **invertida**: primeiro foi escolhido campo `jsonb` estruturado; ao saber que o valor muda por nível (5 valores por magia), preencher à mão passou a pesar mais que o risco do texto |
| 3 | Rolagem **quando a magia disser**; a frase é `"teste de resistência mágica"` | **revisada**: a resposta inicial foi "nunca rola"; a regra real é por magia |
| 4 | Duração vem da coluna **`duracao`** | direto |
| 5 | VB efetiva governa **iniciativa e movimento** | direto |
| 6 | UI: aba nova **"Apoio"** | direto — ver ressalva em 4.5 |
| 7 | Escopo: **só magias** | itens e habilidades não têm nenhum dado de velocidade hoje |
| 8 | `"Variável"` = **concentração** | mecânica nova, ver 4.3 |
| 9 | VB efetiva > 30 = **ação extra**, regra geral | achado tardio na descrição da magia Velocidade |

---

## 3. Os dados reais

Levantamento no banco de produção (`kaxbdpdutentlrobuqyu`), 238 magias.

### 3.1 Doze magias citam velocidade; nove são modificadores

| Magia | nível 1 | nível 9 | duração | teste? |
|---|---|---|---|---|
| Canção do Ânimo | `Aumente 1 de velocidade e 5 de energia heroica.` | +9 | Variável | não |
| Coordenação | `Aumente 1 coluna de ataque e 2 de velocidade.` | +18 | 1 ano e 1 dia | não |
| Distração | `Reduza 4 pontos de velocidade.` | −20 | 2 rodadas | **sim** |
| Forçar Disputa | `Aumente 2 de velocidade.` | +6 | 1 hora | **sim** |
| Perspicácia | `Aumente 1 de velocidade, 1 de defesa e 1 coluna de ataque.` | +5 | 6 horas | não |
| Região Inviolável | `Reduza 12 de velocidade.` | −28 | 2 rodadas | **sim** |
| Ruído Extenuante | `Reduza 1 coluna de ataque e 8 de velocidade.` | −24 | Variável | não |
| Tensão | `Aumente 1 de defesa, velocidade e coluna de ataque.` | +5 | 1 hora | **sim** |
| Velocidade | `Aumente 2 de velocidade.` | +10 | 30 minutos | não |

**Três NÃO são modificadores** e precisam ser rejeitadas pelo leitor:

- Telecinese — `"em uma velocidade de 5 metros por rodada"`
- Unidade Natural — `"Se move por 25 metros com velocidade 20"`
- Olhar de Predador — `"revele sua velocidade"` (e `"o alvo perde a iniciativa"`,
  mecânica distinta, fora de escopo)

**O discriminador é a posição do número:** modificador é sempre
`número + "de velocidade"`. Descrição é `"velocidade" + número`, ou sem número.

> **Conferido contra o catálogo real em 01/09/2026, depois da correção de dados.**
> A regra do leitor, aplicada por SQL às 238 magias, lê as **nove** acima nos
> cinco níveis cada (45 leituras, sinais e escalas corretos) e rejeita as três
> descritivas com zero leituras. Nenhuma magia inesperada entra ou sai.

### 3.2 Correções de dado necessárias

1. **Tensão** — `"Aumente 1 de defesa, velocidade e coluna de ataque."` tem um
   número servindo a três coisas, e nenhum número junto de "velocidade".
   **Decisão: reescrever o texto** nos cinco níveis, para
   `"Aumente 1 de defesa, 1 de velocidade e 1 coluna de ataque."` — cai no
   padrão de todas as outras, sem regra especial no leitor.
2. **Ruído Extenuante** — níveis 5 e 9 têm `"Reduza5 colunas"`, sem espaço
   depois do verbo. A parte da velocidade ainda lê, mas é erro de digitação e
   deve ser corrigido.

### 3.3 A frase do teste é 100% consistente

As quatro magias que exigem rolagem dizem, todas, literalmente
**`"teste de resistência mágica"`** na `descricao`. As outras quatro não
mencionam teste algum.

**Alerta metodológico:** um padrão largo (`teste|resist|falh|passar`) deu
falso positivo na magia Velocidade, casando o `"passar"` dentro de
`"ultrapassar 30"`. O leitor **deve** ancorar na frase exata
`teste de resistência (mágica|física)`, nunca em palavras soltas.

### 3.4 A coluna `duracao` é heterogênea

| Valor no banco | Tradução |
|---|---|
| `"2 rodadas"`, `"10 rodadas"` | N rodadas |
| `"30 minutos"`, `"1 hora"`, `"6 horas"`, `"1 ano e 1 dia"` | mais longo que qualquer batalha → dura até o fim do combate |
| `"Variável"` | **concentração** (ver 4.3) |

---

## 4. Arquitetura

### 4.1 Leitura do catálogo (puro)

Funções novas em `batalha.jsx`, exportadas em `MotorBatalha`, no molde de
`danoMagiaNoNivel` (`batalha.jsx:516`), que já faz exatamente isto para dano:

```
modVelocidadeNoNivel(magia, nivelEfetivo) → number     // 0 = sem efeito
duracaoEmRodadas(magia)   → { rodadas: N|null, concentracao: bool }
exigeResistencia(magia)   → 'rm' | 'rf' | null
magiasDeApoioDoAtor(ator, catalogos) → [...]           // espelha magiasOfensivasDoAtor
```

`modVelocidadeNoNivel` lê `magia['nivel_' + nivelEfetivo]` e aplica:

- número imediatamente antes de `de velocidade` / `pontos de velocidade`;
- sinal pelo verbo que abre a frase: `Aumente` → `+`, `Reduza` → `−`
  (tolerando `Reduza5`, sem espaço);
- **rejeita** número que venha depois da palavra `velocidade`;
- sem casamento → `0`, e a magia não entra na lista de apoio.

### 4.2 Aplicação do efeito

`aplicarEfeitosBatalha(participante, efeitos, origem)` converte cada efeito num
`status_temp` no formato que `somaEfeitosStatus`/`vbEfetivo` já consomem:

```js
{ id: `mag:<key>:<rand>`, nome: magia.nome, icone: '🌀',
  rodadas_rest: rodadas,            // null = até o fim da batalha
  concentracao: { ator: inst_id, magia_key },   // só quando duracao='Variável'
  efeito: { tipo: 'mod_vb', valor: N } }
```

Não toca o `vb` do snapshot — só `status_temp`, como `aplicarFalhaCritica` já
faz (`batalha.jsx:1491`).

**Empilhamento:** duas aplicações somam, porque `somaEfeitosStatus` reduz por
soma. Consequência do formato existente, não código novo.

### 4.3 Concentração — mecânica nova

Duração `"Variável"` significa que o conjurador sustenta a magia: ele não pode
fazer mais nada além de continuar evocando. Se fizer, a magia e todos os seus
efeitos acabam **na hora**, inclusive nos alvos.

**Quebra a concentração:**

| Evento | Onde entra |
|---|---|
| Atacar, lançar outra magia, usar item | `aplicarAcao` / `aplicarTeste` / `aplicarItem` (e os espelhos do Jogador) |
| Andar no tabuleiro | `moverNoTabuleiro` |
| Levar dano **que chegue na EF** | `aplicarDanoCascata` — só se a EF baixar |
| Desmaiar, morrer ou desistir | transição de status |

**NÃO quebra:** passar a vez sem agir — é assim que se sustenta. E dano
inteiramente absorvido por EH ou AR também não quebra: a cascata é EH → AR → EF,
e a regra é "dano na EF".

Função pura: `quebrarConcentracao(participantes, atorInstId)` → remove de
**todos** os participantes os `status_temp` cujo `concentracao.ator` bate.
Chamada de todos os pontos acima. Um combatente só sustenta uma magia por vez:
lançar a segunda derruba a primeira (é uma ação, e ação quebra).

### 4.4 Iniciativa, movimento e ação extra

**Iniciativa — nada a fazer.** `montarNovaRodada` já chama
`ordenarIniciativaEfetiva`, então a reordenação acontece na virada da rodada —
exatamente a semântica pedida ("para as próximas rodadas").

**Movimento e ação extra** — uma alteração em `processarViradaDeRodada`
(`batalha.jsx:1437`):

```diff
- ? { ...p, pa_rest: p.pa_max, mov_rest: movimentoBase(p.vb), moveu_na_rodada: false }
+ ? { ...p, pa_rest: p.pa_max + (vbEfetivo(p) > 30 ? 1 : 0),
+          mov_rest: movimentoBase(vbEfetivo(p)), moveu_na_rodada: false }
```

Os dois recalculam na virada, junto da iniciativa — os três andam sempre juntos.

Três consequências registradas:

1. **A Falha Crítica q6 muda de alcance.** Hoje a "Velocidade −5" só afeta a
   ordem; passa a encurtar o passo. Coerente com a decisão 5.
2. **Piso de 5 células.** `movimentoBase` é `max(5, floor(VB × 5/20))`
   (`tabuleiro.jsx:43`): debuff grande atrasa a iniciativa mas nunca derruba o
   movimento abaixo de 5. É o piso que já existe.
3. **A ação extra vale para todos**, não só para quem usou a magia Velocidade —
   inclusive para quem já nasce com VB > 30. Regra geral, por decisão 9.

### 4.5 UI — aba "Apoio"

Aba nova no `AcaoPanel`, visível quando `magiasDeApoioDoAtor(ator)` não é vazia.
Conteúdo: seletor de magia, seletor de alvo (a lista `alvos` mais o próprio
ator), prévia do efeito no nível efetivo (*"Velocidade +6 · 2 rodadas"*), e o
custo em PA e karma.

Quando `exigeResistencia(magia)` devolve `'rm'`, o alvo rola resistência antes
do efeito valer — reaproveitando o fluxo que a aba Resistência já tem
(`resolverResistencia`, força de ataque × força de defesa, regra de empate).
Quando devolve `null`, aplica direto, sem dado.

> **Ressalva a revisar.** A aba separada foi escolhida quando o escopo incluía
> itens e habilidades — o argumento era isolar um fluxo de três fontes do código
> de combate testado. Com o escopo reduzido a magias, uma aba "Apoio" contendo
> só magias fica estranha ao lado de uma aba "Magia". A alternativa é
> `magiasDeApoioDoAtor` alimentar a própria aba Magia, num sub-modo. **Mantenho
> a aba separada** porque o isolamento de risco continua valendo (fluxo com alvo
> e resistência, contra fluxo de ataque com d20 obrigatório), mas vale sua
> confirmação.

### 4.6 As duas telas

Mestre (`ConduzirBatalhaView`) e Jogador (`BatalhaJogadorView`) compartilham o
`AcaoPanel` mas têm handlers espelhados. O efeito entra nos dois —
`aplicarApoio` / `handleApoio` — ambos debitando PA e karma, aplicando o efeito
no alvo, chamando `autoPassarSeNecessario`, gravando no `log` e disparando
`registrar_evento_mesa` com `tipo: 'magia'` (valor já aceito pelo CHECK de
`mesa_log`).

O `MotorBatalha` no meio é o que mantém os dois lados idênticos — mesmo padrão
que `montarNovaRodada` estabeleceu.

---

## 5. Testes

**Puros** — `src/12-batalha/velocidade-magia.test.js`:

- `modVelocidadeNoNivel` contra **as nove magias reais**, nos cinco níveis:
  as oito de padrão limpo mais a Tensão já corrigida;
- rejeita as três descritivas (Telecinese, Unidade Natural, Olhar de Predador);
- tolera `"Reduza5 colunas de ataque e 16 de velocidade"`;
- `exigeResistencia` acerta as quatro com teste e as quatro sem — **incluindo
  a magia Velocidade, o falso positivo do `"ultrapassar"`**;
- `duracaoEmRodadas` traduz rodadas, tempos longos e `"Variável"`;
- `aplicarEfeitosBatalha` cria o status certo sem alterar o `vb`; duas
  aplicações empilham;
- `quebrarConcentracao` remove os efeitos de um conjurador em todos os alvos, e
  não toca nos de outro conjurador;
- `aplicarDanoCascata` quebra concentração só quando a EF baixa — dano contido
  em EH ou AR não quebra;
- `montarNovaRodada`: acelerado reordena, ganha `mov_rest` maior, e ganha
  `+1 PA` acima de 30; em 30 exato **não** ganha.

**Render** — `src/12-batalha/apoio-tab.test.jsx`, no padrão de
`softlock-acao.test.jsx` e `alvos-validos.test.jsx`:

- a aba não aparece sem magia de apoio;
- aparece e lista as magias com efeito;
- magia sem teste não oferece rolagem; magia com teste oferece.

---

## 6. Migração

**Nenhuma coluna nova.** A leitura usa `nivel_N`, `duracao` e `descricao`, que
já existem. Isso é consequência direta da decisão 2.

Um único script de correção de dado, `scripts/sql/magias-velocidade-fix.sql`:

- Tensão, cinco níveis: `"Aumente N de defesa, velocidade e ..."` →
  `"Aumente N de defesa, N de velocidade e ..."`;
- Ruído Extenuante, níveis 5 e 9: `"Reduza5"` → `"Reduza 5"`, `"Reduza9"` →
  `"Reduza 9"`.

Retrocompatível: batalhas em andamento não têm `status_temp` de magia, e
snapshots antigos seguem funcionando sem tocar em nada.

---

## 7. Fora de escopo

### 7.1 Próximo projeto, já acordado: itens e técnicas de combate

Confirmado em 01/09/2026 — **depois** desta entrega, efeitos de apoio se
estendem a **itens** e **técnicas de combate** (tabela `tecnicas`, não
`habilidades`).

**O primeiro passo desse projeto é escrever o dado, não código.** Levantamento
de hoje:

| Fonte | Situação |
|---|---|
| `itens` | Zero itens com efeito de velocidade. Os que citam a palavra citam na `descricao` em prosa (Cavalo Élfico, Puma, Cimitarra); os campos de efeito trazem outra coisa (`"100 Hidratação, 10 Sono"`) |
| `tecnicas` | 58 técnicas, **nenhuma** cita velocidade em `efeito`, `ajuste`, `uso` ou `descricao` |

Ou seja: não há nenhum exemplo real do qual deduzir o formato de escrita. Ao
contrário das magias, onde o padrão `"Aumente N de velocidade"` já existia em
oito linhas e ditou o leitor, aqui o formato terá de ser **decidido antes**, e
essa decisão é o começo do próximo ciclo de brainstorming. Itens não têm níveis,
então o mecanismo "valor por nível" das magias não se aplica diretamente a eles.

`aplicarEfeitosBatalha` e `quebrarConcentracao` já nascem agnósticos à fonte:
recebem efeitos prontos e uma origem. A extensão deve ser só um leitor novo por
fonte, sem mexer no núcleo.

### 7.2 Fora de escopo, sem plano

- **Habilidades.** Diferente de técnicas: os campos `vantagem`/`desvantagem`
  guardam nomes de deuses e profissões, não mecânica.
- **Outros efeitos das mesmas magias.** As frases também dizem "coluna de
  ataque", "defesa", "energia heroica". Só velocidade é honrada aqui; o leitor
  ignora o resto sem reclamar.
- **`"O alvo perde a iniciativa"`** (Olhar de Predador) — mecânica distinta de
  um modificador numérico.
- **Cura e dano por magia não-ofensiva.** A frase do código diz "cura/buff vêm
  depois"; este projeto entrega o buff/debuff de velocidade.

---

## 8. Pendência não relacionada, encontrada no caminho

O advisor do Supabase apontou: **`public.itens` está com RLS desabilitada**,
assim como a tabela de backup `criaturas_lmp_backup_20260830`. Com a chave anon,
qualquer pessoa lê e escreve essas tabelas. O remédio é
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, mas **não deve ser aplicado sem
criar as policies antes** — ligar RLS sem policy bloqueia o acesso do app ao
catálogo de itens. Tratar em separado.
