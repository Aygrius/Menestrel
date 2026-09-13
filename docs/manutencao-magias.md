# Manutenção dos catálogos de combate

**Para quem edita magias, técnicas e itens pelo admin.** Responde uma pergunta: *mudei o texto —
o efeito mudou junto, ou preciso mexer no motor?*

---

## A regra curta

> **Número muda sozinho. Forma precisa de código. Nome e chave são identidade.**

---

## 1. O que você edita e já vale

Estes campos são lidos **a cada conjuração**. Editou, valeu na próxima magia
lançada na mesa — sem build, sem deploy, sem me chamar.

| Campo | Exemplo | Efeito |
|---|---|---|
| número no `nivel_N` | `Causa 12 de dano` → `Causa 20 de dano` | passa a causar 20 |
| `duracao` | `10 rodadas` → `5 rodadas` | passa a durar 5 |
| `evocacao` | `Instantânea` → `3 rodadas` | passa a canalizar 3 rodadas |
| `alcance` | `20 metros` → `50 metros` | alcance novo (e o raio da aura junto) |
| escala entre níveis | reescrever `nivel_1`…`nivel_9` | curva de poder nova |
| `descricao` com *"teste de resistência mágica"* | — | passa a exigir rolagem do alvo |

**É de propósito.** O registro em código não guarda número nenhum, justamente
para equilibrar magia ser trabalho de banco.

### O padrão que o leitor entende

```
verbo + número + unidade
```

**Verbos:**

| Sentido | Formas aceitas |
|---|---|
| bônus | `Aumenta/Aumente`, `Adiciona/Adicione`, `Recebe/Recebem/Recebendo` |
| penalidade | `Reduz/Reduza`, `Diminui/Diminua` |
| restaurar poço | `Restaura`, `Recupera/Recupere/Recuperam/Recuperando`, `Cure` |
| causar dano | `Causa/Cause` |

Verbo fora dessa lista faz o leitor **não entender nada** da frase, e a magia
vira efeito zero em silêncio. Foi o que aconteceu ao trocar "Aumente" por
"Recupera" no Véu de Maira — o verificador pegou.

**Unidades:** `coluna(s) de ataque`, `de energia heroica`, `de energia física`,
`de resistência física`, `de resistência mágica`, `de velocidade`, `de defesa`,
`de dano`, `de dano máximo`, `de Saúde`, `níveis da magia`, `no atributo
<Força|Físico|Intelecto|Carisma|Aura|Agilidade|Percepção>`.

**Elementos** — são **seis**, e só estes:

> Celestial · Ar · Fogo · Água · Terra · Infernal

Escreva `dano elemental de fogo` (os quatro do meio) ou `dano elemental
celestial` / `dano infernal` (os dois adjetivos). *Luz* era o nome antigo do
Celestial: os textos do banco foram alinhados em 12/09/2026, e a forma velha
segue sendo lida como sinônimo para não quebrar nada escrito antes.

Quatro regras que parecem detalhe e não são:

- **Use DÍGITO, nunca por extenso.** `"Reduz 5 colunas"` funciona;
  `"Reduz cinco colunas"` não é lido. Aconteceu de verdade com o Ruído. A única
  exceção é o **prazo de cura** (`"o tempo de cura é de duas semanas"`), que
  aceita por extenso: prazo não lido some da tela, enquanto efeito não lido
  vira zero em silêncio.
- **Deixe espaço depois do verbo.** `"Reduza5 colunas"` não é lido — a
  fronteira de palavra exige o espaço. Mordeu Ruído e Ruído Extenuante.
- **O número vem ANTES da unidade.** `"5 de velocidade"` é modificador;
  `"velocidade de 5 metros"` é descrição e o motor ignora — de propósito,
  senão Telecinese viraria um buff de +5.
- **O verbo governa até o próximo verbo.** Em `"Aumenta 1 coluna e 5 de
  energia heroica"`, os dois números são bônus. Em `"Aumenta 1 coluna e reduz
  2 de defesa"`, o segundo é penalidade.

---

## 2. O que precisa de código

| Situação | Por quê |
|---|---|
| **Magia nova** que deva ter efeito | Sem entrada no registro ela é narrativa: aparece na ficha, não faz nada em combate |
| **Trocar a unidade** — `1 coluna de ataque` → `1 de defesa` | O registro aponta para `coluna`; o leitor não acha mais |
| **Trocar alvo** — inimigo ↔ aliado | Alvo é semântica, o texto não diz |
| **Trocar o sinal** — buff ↔ debuff | Idem: `"A área reduz 1 coluna"` e `"Aumenta 1 coluna"` dão o mesmo número |
| **Trocar nº de alvos** — 1 ↔ 3 | Vem da descrição, que o leitor não interpreta |
| **Unidade nova** — `"3 de sorte"` | O leitor precisa aprender a unidade |

Nesses casos o painel de verificação (§4) acusa, e são poucas linhas.

---

## 3. Os dois campos que são IDENTIDADE

Estes **não** são conteúdo. Mudá-los quebra referências, em silêncio.

### `key`
É por ela que **`personagens.magias`** referencia. Trocar a chave apaga a magia
da ficha de todo PJ que a comprou. O editor já a trava depois da criação.

Desde 12/09/2026 a `key` **deriva do nome** em todas as 238 — seis divergiam
(Aeroproteção era `protecao_animal`, Hidroproteção era `protecao_elemental`) e
foram alinhadas por `scripts/sql/magias-key-alinha-nome.sql`, que renomeou
também `personagens.magias`. Se criar magia nova, deixe o editor gerar a chave.

### `nome`
É por ele que **`criaturas.magia`** referencia — aquele campo é texto com os
nomes separados por vírgula. Renomear *"Piromanipulação"* quebra as **10
criaturas** que a citam.

> É a armadilha mais fácil de cair, porque `nome` *parece* conteúdo editável.
> Se precisar renomear, atualize `criaturas.magia` junto — e confira no painel
> de criaturas (§4).

---

## 4. Como conferir que você acertou

Três painéis no bestiário, só para admin — Magias, Criaturas e Técnicas. Todos
fechados por padrão; só acendem
quando há problema.

### Verificação do catálogo — na aba **Magias**

Roda a mesma leitura do motor contra o banco, agora.

| Estado | Significa | O que fazer |
|---|---|---|
| **ok** | está no motor e todas as unidades são lidas | nada |
| **quebrada** | está no motor e **parou de ser lida** | desfazer a edição — ele diz qual unidade sumiu |
| **ambígua** | número que ele não entende, ou campo escrito duas vezes | revisar o texto |
| **órfã** | tem número legível e o motor ignora | ou é narrativa mesmo, ou falta registro |
| **narrativa** | sem número, sem registro | nada |

As **órfãs** vêm agrupadas pelo *motivo* de estarem fora, e o primeiro grupo é
o único acionável:

| Grupo | Significa |
|---|---|
| **✓ Pronta para entrar** | a pendência era no texto e **você já resolveu** — me avise para ligar |
| **Falta uma decisão sua** | o motor daria conta; falta escolher a regra (o item diz qual) |
| **Falta um sistema** | precisa de algo que o combate não tem (karma, parede no terreno…) |
| **Ritual ou fora de combate** | nada a fazer |
| **Sem motivo registrado** | candidata esquecida — vale perguntar |

### O botão *Conferir novamente*

Salvou pelo editor, a verificação recalcula sozinha. Mudou o catálogo por fora
— outro admin, SQL direto — clique em **Conferir novamente** na própria faixa:
ele busca o catálogo de novo, sem recarregar a tela.

### Verificação das magias de criatura — na aba **Criaturas**

| Estado | Significa |
|---|---|
| **nome sem correspondência** | o nome em `criaturas.magia` não existe mais no catálogo |
| **sem nível** | `magia_n` vazio; o motor cai no nível 1 |
| **só narrativas** | os nomes casam, mas nenhuma tem efeito no motor |

---

## 5. Os dois fluxos do dia a dia

### Equilibrar magia existente
1. Edite os números no `nivel_N`.
2. Abra **Verificação do catálogo**.
3. Deve continuar **ok**. Se virou **quebrada**, você mexeu na forma sem
   querer — desfaça.

### Criar magia nova
1. Crie no editor, seguindo o padrão `verbo + número + unidade`.
2. Abra **Verificação do catálogo**.
   - Apareceu como **órfã** → o texto está legível, falta só a entrada no
     registro. Me diga o nome; são três linhas.
   - Apareceu como **narrativa** e você queria efeito → o texto não segue o
     padrão. Compare com uma magia parecida que já funciona.

### Renomear magia
1. Mude o `nome`.
2. Atualize `criaturas.magia` em toda criatura que a citava.
3. Abra **Verificação das magias de criatura** e confirme zero órfãos.

---

## 6. Por que é assim

O motor lê o **número** do texto e a **semântica** de um registro em código
(`src/01-core/magias-efeito.jsx`).

A alternativa seria pôr tudo no código — mas a magia tem cinco textos por
nível, e seriam ~125 números digitados à mão que sairiam de sincronia no
primeiro UPDATE pelo admin. A outra alternativa seria ler tudo da prosa — mas
prosa não diz semântica: não distingue *"A barreira reduz 1 coluna de ataque"*
(defesa própria) de *"A área reduz 1 coluna de ataque"* (penalidade no
inimigo), nem diz que Dardos de Gelo pega 3 alvos.

Decisão registrada em
`docs/superpowers/specs/2026-09-11-magias-efeitos-combate-design.md` §5.

---

## 7. Estado atual do catálogo

### A reforma pelo perfil de cada profissão (12/09/2026, fim da noite)

```
235 magias · 106 no motor · 0 quebradas · 0 ambíguas
```

Aplicada por `scripts/sql/magias-reforma-perfis.sql`, com o estado anterior
guardado em `backup.magias_20260912` (e os três vizinhos: personagens, criaturas
e itens). O que muda para quem edita:

- **25 magias novas**, todas no motor: seis ataques de colégio, Cadência Veloz,
  treze curas de ordem, Égide Celestial, Selo Abismal e as três finais de
  dificuldade que não existiam (Dom das Línguas, Sombra, Graça Felina).
- **28 magias fundidas** em outras e **Teriantropia excluída**. As chaves antigas
  não existem mais; `personagens.magias`, `criaturas.magia` e `itens.magia`
  foram migrados no mesmo script (§3: nome e chave são identidade).
- **Uma chave renomeada**: `recuperecao_fisica` → `recuperacao_fisica`.
- **Elemento no texto**: Relâmpago e Raio Elétrico são ar, Toque Gélido e
  Putrefação são infernal, Fogo Divino é celestial, Feixes Incandescentes é
  fogo. Selo Abismal passa a cortar os dois infernais.

O que foi decidido e o que ficou em aberto está em *Sugestões de magias* e no
*Estudo* desta página.

### A varredura das magias que nenhum personagem conhecia (12/09/2026, noite)

A validação anterior olhou as magias que os personagens da mesa conhecem. As
**111 restantes** foram lidas uma a uma, com o objetivo de mecanizar o efeito
em batalha e fora dela. Verificação contra o banco depois da varredura:

```
238 magias · 95 no motor · 0 quebradas · 0 ambíguas · 111 fora do motor, TODAS com motivo · 32 narrativas
```

As 111 de fora aparecem no painel agrupadas — nenhuma em *"sem motivo
registrado"*:

| Grupo | Quantas | Exemplo |
|---|---|---|
| Falta uma decisão sua | 8 | Alucinação, Dominação Animal, Rastreamento: número **por extenso** ("um nível") |
| Falta um sistema | 45 | karma como alvo, porcentagem de poço, bônus preso a um alvo, invisibilidade |
| Narrativa | 20 | Leitura, Mutação, Levitação — o Mestre resolve na mesa |
| Ritual | 30 | Análise, Runas, Retorno do Mártir |
| Invocado | 8 | Criação, Conjuração Demoníaca |

**Peça nova: dificuldade de habilidade.** A forma mais comum do catálogo fora
de dano e cura — *"Reduza 1 nível de dificuldade da habilidade Furtividade"* —
não tinha primitiva. Agora tem (`mod_dificuldade`), e **17 magias entraram**
por ela: Ausência, Avaliação, Camuflagem, Conhecimento, Conhecimento
Linguístico, Conhecimento Natural, Convocação, Deslocamento Natural, Detectar
Intenção, Escrita, Faro, Habilidade Animal, Linguagem, Malabarismo, Mestre da
Forja, Orientação e Sexto Sentido. Mais três com peças que já existiam:
Corrente e Fascínio (impedem o alvo de agir) e Dueto Mágico (níveis das
magias na área).

Como escrever para o leitor entender:

| Forma | Exemplo |
|---|---|
| uma habilidade | `Reduza 2 níveis de dificuldade da habilidade Furtividade.` |
| várias | `... da habilidade Equilibrar, Nadar e Escalar.` (ou `Equilibrar ou Prestidigitação` — vale nas duas) |
| grupo inteiro | `... de habilidades do grupo Profissional.` |
| mais difícil | `Aumenta 1 nível de dificuldade da habilidade Sentidos.` |

- **Dígito, não por extenso.** "um nível" não é lido — são exatamente as três
  pendências de texto do grupo *decisão*. Troque por "1 nível" e a magia vai
  sozinha para *"pronta para entrar"*.
- **O nome da habilidade é o do catálogo**, sem acento e caixa importando.
  Plural é tolerado ("Idiomas" casa com "Idioma").

Como ela vale:

- **Na batalha**, na aba *Habilidade*: o Mestre escolhe a dificuldade como
  sempre, e a tela mostra *"Com magia ativa: Médio → Fácil"*. O veredito usa a
  deslocada.
- **Na ficha**, no *Usar* de uma habilidade: a mesma conta, e o log da mesa
  diz *"(Médio → Fácil)"*.
- **Duração Instantânea** (Avaliação, Faro, Escrita…) = *"a magia e a
  habilidade devem ser usadas juntas"*: fica em *Magias ativas* como **"até o
  próximo teste"** e some depois do teste daquela habilidade.
- **Duração de horas** (Camuflagem, Conhecimento…) = magia ativa até vencer no
  calendário, como qualquer outra.

**Consertado no caminho:** quando o Mestre aprovava uma evocação no colega, só
o efeito instantâneo pousava — a magia de calendário não virava ativa na ficha
do alvo. Ficha e aprovação passaram a usar a mesma porta
(`aplicarMagiaNoEstado`).

> ⚠️ **Força Sagrada** ficou de fora de propósito: o texto já é legível, mas
> atributo de combate (`mod_atributo`) ainda não tem consumidor no motor — é a
> mesma pendência da Licantropia Lupina. Ligar agora a faria aparecer "no
> motor" sem fazer nada.

### Antes da varredura

Rodando a verificação contra o banco em 12/09/2026, no fim do dia:

```
238 magias · 74 no motor · 0 quebradas · 0 ambíguas · 6 órfãs · 158 narrativas
```

**Zero quebradas e zero ambíguas**: nenhum texto do catálogo está ilegível para
o motor hoje.

**O grupo "Falta uma decisão sua" está VAZIO**, e esse é o estado saudável: não
há nenhuma magia legível cuja regra ninguém tenha decidido. Seis fecharam esse
ciclo em 12/09/2026 — Garras e Lâmina de Luz (alcance *"Pessoal"* → *"Toque"*),
Auxílio Natural (*"dano máximo"* → *"dano"*), e as três últimas por decisão
direta sua: o bônus de **Forçar Disputa** é do adversário, a **Parede de
Cristal** vale numa área a partir de quem conjura, e **Tensão** entrou junto com
a regra geral abaixo.

> **Resistir é escolha de quem recebe.** Toda magia evocada por terceiros pode
> ser resistida, se o alvo quiser. Exigir teste de resistência **não** é sinal
> de que a magia é debuff — foi o que segurou Tensão fora do motor por engano.

As **6 órfãs** restantes são **todas ritual ou fora de combate** — Aura
Ameaçadora, Campo Abençoado, Hibernar, Manjar de Lena, Melodia Zen e
Necropotência. Nada a fazer com nenhuma: são magias de meia hora de música, de
30 dias de duração, de comida.

Ou seja: **não sobrou nenhuma magia de combate fora do motor.** Os grupos
*"falta uma decisão sua"*, *"falta um sistema"* e *"sem motivo registrado"*
estão todos vazios, e é o estado saudável.

O último dia de trabalho (12/09/2026) fechou as quatro peças que faltavam — e
as quatro são **gerais**, não exclusivas da magia que as pediu:

| Peça | O que faz | Pedida por |
|---|---|---|
| `mod_condicao` | magia mexe nas **condições da ficha** (Saúde), não só nos poços de combate | Doenças |
| escalada | status cujo valor **cresce** a cada rodada | Doenças |
| cura natural | prazo do texto + **data atual do jogo** = a data em que o alvo sara | Doenças |
| teste de habilidade | o motor **rola habilidade**, não só resistência | Proteção Natural |

### Os dois testes, e quem rola cada um

| Teste | Quem rola | Para quê | Como o texto pede |
|---|---|---|---|
| **Resistência** | o **alvo** | escapar da magia | `descricao` com *"teste de resistência mágica"* |
| **Habilidade** | o **conjurador** | a magia sair | `nivel_N` com *"Com um teste da habilidade Sentidos (Absurdo)"* |

A dificuldade do teste de habilidade fica **no texto do nível**, não no código
— por isso ela pode afrouxar conforme a magia sobe (Absurdo no 1, Fácil no 9), e
você ajusta isso sem me chamar. A escala é a mesma da ficha: Fácil, Médio,
Difícil, Muito Difícil, Absurdo.

---

## 8. Os catálogos vizinhos — e a regra que se INVERTE

Em 12/09/2026 a verificação foi estendida a técnicas e itens. As três telas se
parecem, e é justamente por isso que a diferença precisa estar escrita.

### Técnicas — o número mora no CÓDIGO

> **Editar `"por 2 rodadas"` para `"por 5 rodadas"` muda o que a tela promete e
> não muda nada do que o motor faz.**

É o oposto da magia. Nas magias o parser lê o número do texto a cada
conjuração; nas técnicas a duração e a dificuldade estão no registro em código,
e o texto do banco é só o que o jogador lê.

Por isso a **Verificação do catálogo** na aba *Técnicas* procura **divergência**
— texto e motor contando números diferentes —, e não ilegibilidade. Se algo
aparecer ali, me avise: a correção é nos dois lugares ao mesmo tempo.

Estado em 12/09/2026: **54 das 58** rodam em combate; 0 divergentes. As 4 de
fora têm motivo no painel — Combate Montado (não há montaria), Luta às Cegas
(não há visibilidade), Provocar (não há alvo obrigatório) e Conduzir Oponente,
que espera uma decisão sua: *move o alvo 5 metros — para onde?*

### Itens — dois caminhos independentes

| O que o item tem | O que acontece em combate |
|---|---|
| `efeito_positivo` / `efeito_negativo` | muda condição de ficha ou poço, na aba **Item** |
| `magia` + `nivel_magia` | **concede a magia**, nas abas Magia/Apoio |

O primeiro caminho é lido do texto, como nas magias — e o catálogo inteiro
(747 itens) está limpo: nenhum rótulo desconhecido.

O segundo entrou em 12/09/2026, e vale a pena saber as regras:

- **item em uso concede**: `equipado` ou `vestido`. Anel na mochila não vale;
- **pergaminho é exceção** — não se veste, e **some depois de lido**;
- **não custa karma** — a magia está no item;
- **o nível é o do item** (`nivel_magia`), não escala com o personagem;
- magia que o personagem **sabe** ganha da que o item concede.

> ⚠️ `itens.magia` referencia a magia **pelo nome**, como `criaturas.magia`.
> Mesma armadilha do §3: um item apontava para *"Energia Primodial"* (sem o
> **r**) e nunca conjuraria nada, em silêncio.
