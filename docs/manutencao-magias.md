# Manutenção do catálogo de magias

**Para quem edita magias pelo admin.** Responde uma pergunta: *mudei o texto —
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
| bônus | `Aumenta/Aumente`, `Adiciona/Adicione` |
| penalidade | `Reduz/Reduza`, `Diminui/Diminua` |
| restaurar poço | `Restaura`, `Recupera/Recupere/Recuperam/Recuperando`, `Cure` |
| causar dano | `Causa/Cause` |

Verbo fora dessa lista faz o leitor **não entender nada** da frase, e a magia
vira efeito zero em silêncio. Foi o que aconteceu ao trocar "Aumente" por
"Recupera" no Véu de Maira — o verificador pegou.

**Unidades:** `coluna(s) de ataque`, `de energia heroica`, `de energia física`,
`de resistência física`, `de resistência mágica`, `de velocidade`, `de defesa`,
`de dano`, `de dano máximo`, `níveis da magia`, `no atributo <Força|Físico|
Intelecto|Carisma|Aura|Agilidade|Percepção>`.

Duas regras que parecem detalhe e não são:

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

Dois painéis no bestiário, só para admin. Ambos fechados por padrão; só acendem
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

Medido em 12/09/2026, depois da varredura das órfãs:

```
238 magias · 65 no motor · 0 quebradas · 0 ambíguas · 11 órfãs · 162 narrativas
```

As **11 órfãs** que sobraram ficaram de fora por motivo registrado, não por
esquecimento — o comentário no fim do `MAGIA_EFEITO_MAP` lista cada uma com a
razão. Quatro são candidatas a **correção de texto**, não a código:

| Magia | Problema no texto |
|---|---|
| Garras | `alcance: Pessoal`, mas causa dano em inimigo |
| Lâmina de Luz | idem |
| Auxílio Natural | *"Cause 4 de dano máximo"* — no motor, dano máximo é o teto do alvo, não dano causado |
| Tensão | buff de defesa/velocidade/coluna que **exige teste de resistência** — buff que o alvo resiste não faz sentido |

Ajustando esses quatro textos, elas entram no motor sem código novo.

As outras sete precisam de sistemas que o combate não tem (objeto de arte como
alvo, doenças por atributo, karma, parede no terreno, teste de atributo) ou são
de fora de combate.
