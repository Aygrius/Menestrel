# O relógio desgasta o personagem — clima, hora e condições

Data: 20/09/2026
Estado: aprovado no desenho, aguardando plano de implementação

## O problema

A mesa já tem um relógio (`historias.data_jogo_atual.hora`, 0–23, derivando dia
e noite) e já tem clima em três trilhas (água, vento, temperatura). Os dois
pintam o fundo do console e não fazem mais nada: passar a noite inteira num
temporal gelado custa o mesmo que uma tarde amena.

Este documento descreve como o tempo passa a **escrever** no estado dos
personagens — fome, sede, sono e temperatura — e como o clima passa a ter
consequência mecânica.

## O modelo de tempo

**Data e hora são uma linha do tempo só.** Não existe "a hora" separada de "o
dia": existe um instante, e ele só anda para frente.

- Escolher na lista uma hora MENOR que a atual **avança o calendário em um
  dia**. Às 22h, escolher 2h significa 2h de amanhã — quatro horas depois, não
  vinte horas antes.
- Para voltar no tempo, o Mestre usa o calendário. O relógio não anda para trás.
- Mexer na data conta horas igual: avançar três dias são 72 horas de desgaste.

**Tempo para trás não desfaz nada.** Corrigir o calendário para um dia anterior
não devolve comida, água nem sono — apenas re-ancora (ver Âncora). Fome que
passou, passou.

## O motor de desgaste

Uma função pura, `decaimentoPorHoras(condicoes, horas, tempo, horaInicial)`, que
recebe o estado e devolve o estado novo. Não fala com o banco, não conhece
React, e é onde mora toda a regra.

Por **cada hora cruzada**:

| barra (chave) | regra |
|---|---|
| Alimentação (`nutricao`) | −1 |
| Hidratação (`hidratacao`) | −1, **somado** a −5 em calor leve ou −10 em calor extremo |
| Temperatura (`termorregulacao`) | frio extremo −10 · frio leve −5 · agradável 0 · calor leve +5 · calor extremo +10 |
| Sono (`animo`) | −2, **somente** nas horas 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6 e 7 |

Três coisas que o quadro esconde e que a implementação não pode errar:

1. **Sede e hidratação são a MESMA barra.** O pedido cita as duas separadas
   ("calor extremo diminui 10 pontos de sede por hora" e "alimentação,
   hidratação diminui 1 ponto por hora"), mas `hidratacao` é uma barra só
   (Desidratado ↔ Hidratado). Por isso o calor **soma** em cima da perda de
   base: calor extremo desidrata **−11 por hora**, não −10.

2. **A janela do sono é por hora cruzada, não pelo intervalo.** Pular de 18h
   para 10h do dia seguinte são 16 horas, das quais **12** caem na janela da
   noite: o sono cai 24 pontos, não 32. O motor percorre hora a hora e pergunta
   de cada uma se ela começa dentro da janela.

3. **Tudo é limitado a ±`COND_LIMITE` (50).** É o freio natural dos saltos
   grandes: 72 horas de fome afundam a barra até o fundo, e não além.

## Vento → Velocidade Base

O vento é a única regra que o pedido escreveu **sem** "por hora", e o tratamento
é outro: não desgasta, **penaliza enquanto sopra**.

`calcularFicha` ganha um quarto parâmetro opcional com o nível do vento, e
desconta da Velocidade Base:

| degrau | VB |
|---|---|
| ventos leves | −1 |
| ventania | −2 |
| vendaval | −3 |
| tornado | −4 |

Derivado, nunca gravado: o vento passa e a VB volta sozinha. É o mesmo mecanismo
pelo qual `animo` já mexe na VB (`game-data.jsx`, tabela de efeitos de
condição). Os nove pontos de chamada existentes seguem funcionando sem tocar em
nada — parâmetro ausente vale zero.

## O tique imediato da mudança de clima

Mudar o degrau de uma trilha **cobra na hora uma hora daquele clima**, como se
a hora tivesse passado sob a condição nova. Ligar calor extremo às 14h aplica
+10 de temperatura e −11 de hidratação imediatamente; avançar para as 15h
cobra de novo.

Isto nasceu de um teste real: o usuário mudou para desértico e calor extremo e
olhou as barras, que não mexeram. Com a regra só-por-hora, o gesto mais
natural — escolher o clima e conferir o efeito — não tinha resposta nenhuma.

Três recortes que a regra precisa respeitar:

1. **Só a trilha que mudou tique.** Fome, sede de base e sono são efeito do
   TEMPO, não do clima, e não entram aqui. Na prática o tique só tem efeito na
   trilha de temperatura, que é a única que desgasta condição: água só abastece
   a loja e vento é penalidade de VB, não acúmulo.

2. **A âncora NÃO anda.** O relógio não se moveu, então `decaimento_em` fica
   onde estava — senão a próxima virada de hora cobraria de menos. O tique é
   uma cobrança avulsa, por evento, fora da contagem de horas.

3. **O preço, aceito de olhos abertos:** corrigir um clima clicado errado cobra
   assim mesmo, e alternar o degrau duas vezes cobra duas. Não há desfazer —
   pela mesma razão que o relógio para trás não devolve fome.

A água da loja segue a mesma simetria: entrar em tempestade já põe as 2
unidades da primeira hora.

## A âncora

O relógio e o estado dos personagens são escritas separadas. Se o relógio gravar
e os personagens falharem, aquelas horas somem para sempre.

Por isso `data_jogo_atual` ganha `decaimento_em: { ano, mes, dia, hora }` — o
instante até onde o desgaste **já foi cobrado**. As horas cruzadas são a
diferença entre a âncora e o relógio novo, nunca entre o relógio velho e o novo.

Consequências:

- Falha parcial fica **pendente**, e é cobrada no próximo movimento do relógio.
- Mover o relógio duas vezes para o mesmo instante não cobra duas vezes.
- Mesa sem âncora (todas, no dia em que isto subir) ancora no relógio atual e
  começa a contar dali. Ninguém acorda devendo 500 horas de fome.

## Água na loja

A cada hora de chuva, o estoque da loja da história recebe água (slug `agua`,
grupo Consumíveis, confirmado no catálogo):

- **tempestade**: +2 unidades por hora
- **chuva fina**: +1 unidade por hora

Soma ao que já existe em `historias.estoque_loja`, criando a entrada quando não
houver. Escrita direta do Mestre, mesmo padrão do `GerenciarLojaModal`.

## Desmaiado e morto na ficha

Hoje o cardápio de status do Mestre tem quatro entradas (veneno, sangramento,
ferido, caído). Entram mais duas, sem valor numérico: **desmaiado** e **morto**.

O risco levantado no desenho era criar dois donos da mesma verdade — os dois já
são DERIVADOS da vitalidade (EF no piso é morto; EF ou EH zerada é desmaiado).
A saída **elimina o conflito em vez de arbitrá-lo**:

- a vitalidade continua derivando os dois, exatamente como hoje;
- o Mestre pode marcá-los à mão, e a marca aparece mesmo com a ficha cheia;
- quando derivado e manual dizem a mesma coisa, **um chip só** (dedupe por
  chave, no card e na ficha).

Não existe marca manual de "ativo/são", e é isso que garante que os dois nunca
se contradigam: eles só podem coincidir. Um personagem com EF zerada continua
desmaiado mesmo sem marca — consertar isso é consertar a EF, que é onde o
problema está.

## Onde roda

No `CardDataJogoAtual` (10-shell), **apenas para o Mestre** (`podeEditar`),
disparado quando ele mexe na hora ou na data. Para cada PJ em
`historia.protagonista_ids`: lê `estado_atual`, aplica o motor, grava.

A policy `personagens_update_own_or_vinculado` já autoriza o Mestre a escrever
nos PJs vinculados à sua história — **não é preciso RPC nova**. Foi verificado
em `pg_policies` antes de fechar o desenho.

Não há corrida: só o Mestre move o relógio.

## Testes

Funções puras, testadas sem montar tela:

- **motor**: cada regra isolada; o empilhamento de calor com a perda de base
  (−11/h); o teto de ±50; hora zero não muda nada.
- **tique imediato**: mudar a temperatura cobra uma hora na hora; mudar água ou
  vento não cobra nada; a âncora não se move; ligar e desligar cobra duas
  vezes (é o comportamento escolhido, não um descuido).
- **janela do sono**: as 12 horas certas; um salto que cruza a janela
  parcialmente; um salto que não a toca.
- **linha do tempo**: hora menor vira o dia; data para trás não desgasta;
  contagem de horas atravessando dias e meses do calendário fantasy.
- **âncora**: falha parcial deixa pendente; movimento repetido não cobra duas
  vezes; mesa sem âncora começa do zero.
- **vento → VB**: os quatro degraus; ausência de vento não muda a ficha; os
  chamadores antigos sem o parâmetro seguem iguais.
- **água**: soma por hora de chuva; cria a entrada quando não existe; clima seco
  não mexe no estoque.
- **dedupe**: derivado + manual do mesmo status rende um chip.

## Arquivos

| arquivo | o quê |
|---|---|
| `src/01-core/clima-desgaste.jsx` (novo) | o motor puro, a janela do sono, a contagem de horas e a âncora |
| `src/10-shell/shell.jsx` | disparo no `definirHora`/`definirDataAtual`, virada do dia, escrita nos PJs e na loja |
| `src/01-core/game-data.jsx` | quarto parâmetro de `calcularFicha` e a penalidade de VB |
| `src/01-core/status-efeito.jsx` | desmaiado e morto em `STATUS_MESTRE_TIPOS` |
| `src/08-personagens/personagens.jsx` | dedupe derivado × manual no card |
| `src/11-ficha/ficha.jsx` | dedupe derivado × manual na ficha |

## Decisões tomadas pelo usuário (20/09/2026)

Registradas aqui porque nenhuma delas é dedutível do código:

- Vento é **penalidade fixa na VB**, não desgaste acumulado — não precisa de
  barra nova.
- Salto de horas **aplica tudo de uma vez**, sem confirmação.
- Água na loja é **por hora de chuva**, com os números corrigidos de 20/10 para
  **2/1**.
- Ficha ganha **desmaiado e morto** no cardápio do Mestre.
- Data e relógio são **uma linha do tempo só**, e hora menor **vira o dia**.
- Mudar o clima **cobra uma hora imediatamente**, além do que o relógio cobra
  depois.

## Revisão de 24/09/2026

Pedido do usuário: "Calor leve -2 de hidratação por hora, e calor extremo é -5
de hidratação por hora. Frio leve -1 de saúde por hora, e frio extremo é -3 de
saúde por hora. Corrija o vento em batalha, o vento pode mudar durante a
batalha, e isso também influencia."

- O calor continua **somando** na perda de base: calor leve −3/h e calor
  extremo −6/h de hidratação no total.
- O frio passa a tirar **saúde** (`vitalidade`): −1/h no frio leve, −3/h no
  frio extremo. O tique imediato da mudança de clima cobra o mesmo.
- **Vento na batalha:** cada PJ leva `vento_vb` no snapshot, e `vbEfetivo` o
  desconta (iniciativa, ação extra acima de 30, passo). A largada usa o vento
  da mesa; cada virada de rodada carimba o vento corrente, lido pelo realtime
  de `historias` (`useVentoDaBatalha`). Mudar o vento no meio da rodada vale
  a partir da próxima. Criaturas não sofrem, como na ficha.
- A ficha e os cards passaram a ouvir o realtime de `personagens`: antes o
  desgaste gravava e a tela só mostrava depois de recarregar.

## Atividades — o descanso recupera (24/09/2026)

Pedido do usuário: um botão na ficha para escolher Dormindo, Meditando, Orando,
Estudando ou Treinando, cada um recuperando o personagem com o tempo.

| atividade | por hora | a cada 8h acumuladas |
|---|---|---|
| Dormindo | sono +5 (substitui o −2 da noite) | EH +10+Carisma · EF +1+Físico · KA +5+Aura |
| Meditando | EH +2+Carisma · KA +1+Aura | — |
| Orando | sanidade +5 | — |
| Estudando | reputação +5 | — |
| Treinando | reputação +5 | — |

Decisões do usuário (24/09/2026):

- Treinando dá reputação, igual a Estudando.
- Dormindo, o +5 de sono **substitui** o cansaço da noite.
- As horas de sono **acumulam** entre movimentos do relógio (4h + 4h fecham um
  ciclo). Trocar de atividade ou acordar zera o que sobrou.
- Jogador (no próprio PJ) e Mestre escolhem e tiram; fica ligada até alguém
  tirar.

Regras da implementação: Guerreiro e Ladino não recuperam karma; EH/EF/KA não
passam do máximo da ficha (calculado com as condições que a hora deixou);
atributo negativo encolhe o ganho, nunca abaixo de zero; a mudança de clima
sozinha não recupera nada, porque não é hora passada.

Estado: `estado_atual.atividade = { tipo, horas_sono }`. Motor puro em
`recuperacaoPorAtividade` (01-core/clima-desgaste.jsx); aplicado em
`aplicarDesgasteNosPJs` (10-shell) depois do desgaste; botão
`FichaAtividadeSeletor` (11-ficha); selo no card (08-personagens); a mudança
vai para o log da mesa ("Eco começou a dormir.").
