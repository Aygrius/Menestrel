# Técnicas de combate — estatística, sugestões novas e adaptações

**Levantado em 12/09/2026** a partir do catálogo de produção (58 técnicas) e do
registro do motor (`src/01-core/tecnicas-efeito.jsx`). Nada aqui foi aplicado:
são propostas para você decidir.

> **Lembrete da regra que se inverte:** na técnica, o número (bônus, rodadas,
> dificuldade) mora no **código**, não no texto do banco. Cada sugestão abaixo
> traz o texto para o catálogo **e** a linha do registro — as duas precisam
> entrar juntas.

---

## 1. O que o catálogo mostra

```
58 técnicas · 56 no motor · 2 resolvidas pelo Mestre (Provocar, Conduzir Oponente)
Uso: Intermitente 34 · Único 16 · Livre 8
```

### Por função (as 56 do motor)

| Função | Quantas | Exemplos |
|---|---|---|
| Ataque | **24** | Mira, Golpe Letal, Golpe Duplo, Brutalizar |
| Controle e debuff | 10 | Inibir Ataque, Desequilibrar, Pressionar Oponente |
| Defesa e posturas | 8 | Aparar, Desviar, Esquiva, Postura Defensiva |
| Resistência e fôlego | 6 | Heroísmo, Segundo Fôlego, Resistência à Dor |
| Utilidade | 4 | Concentração, Luta às Cegas, Combate Não Letal |
| Mobilidade | **2** | Atirar em Movimento, Disparo Rápido |
| Apoio a aliados | **2** | Voz de Comando, Escolta |

### Por profissão

| Profissão | Técnicas | Exclusivas de especialização |
|---|---|---|
| Guerreiro | 57 | 31 (as quatro Academias) |
| Ladino | 33 | 14 (as três Guildas) |
| Bardo | 17 | **0** |
| Rastreador | 17 | **0** |
| Sacerdote | 14 | **0** |
| Mago | 9 | **0** |

### Os desequilíbrios que saltam

1. **Vinte e cinco especializações não têm nenhuma técnica própria.** Só as
   Academias e as Guildas têm; Trilhas, Confrarias, Ordens e Colégios pegam o
   que a profissão inteira pega. Chegar ao estágio 5 não muda nada no combate
   delas.
2. **Quase ninguém ajuda o grupo.** São duas técnicas de apoio no catálogo
   inteiro, e as duas são de Guerreiro/Rastreador/Bardo.
3. **Ataque é quase metade do motor** (24 de 56), e mobilidade é quase nada (2).
4. **O Mago tem 9 técnicas, todas genéricas** — nenhuma conversa com evocação.

---

## 2. Técnicas novas sugeridas

Todas usam primitivas que o motor já tem. O formato do texto é o do catálogo
(*"Seu total de X é adicionado…"* para bônus direto; *"Um teste de X (Médio)…"*
para as de teste).

### Para as Trilhas do Rastreador

**Emboscada** · Trilha de Caçadores · Intermitente · custo 1 · Percepção
> Um teste de Emboscada (Médio) ignora a armadura do alvo por 1 rodada.

Registro: `modo: 'teste'`, inimigo, 1 rodada, `ignora_armadura`. *O caçador
ataca onde a presa não protege.*

**Guardar Posição** · Trilha de Guardiões · Único · custo 2 · Físico
> Seu total de Guardar Posição é adicionado à sua defesa, e subtraído da sua
> velocidade por 3 rodadas.

Registro: `modo: 'total'`, self, 3 rodadas, `mod_defesa +1` e `mod_vb −1` (o
molde das posturas, trocando ataque por velocidade).

**Terreno Conhecido** · Trilha de Exploradores · Intermitente · custo 2 · Agilidade
> Seu total de Terreno Conhecido é adicionado à sua velocidade e à sua defesa
> por 2 rodadas.

Registro: `modo: 'total'`, self, 2 rodadas, `mod_vb +1` e `mod_defesa +1`.
*Também dá à mobilidade a terceira técnica do catálogo.*

### Para as Confrarias do Bardo

**Grito de Guerra** · Confraria de Arautos · Único · custo 2 · Carisma
> Seu total de Grito de Guerra é adicionado à coluna de ataque de 3 alvos por
> 2 rodadas.

Registro: `modo: 'total'`, `alvo: 'aliados'`, `maxAlvos: 3`, 2 rodadas,
`mod_ataque +1`. *Terceira técnica de apoio a aliados.*

**Floreio** · Confraria de Artistas · Intermitente · custo 1 · Agilidade
> Seu total de Floreio é subtraído da coluna de ataque do adversário por 2
> rodadas.

Registro: `modo: 'total'`, inimigo, 2 rodadas, `mod_ataque −1` (o molde de
Resguardar, sem a restrição de arco).

**Apontar Fraqueza** · Confraria de Eruditos · Único · custo 2 · Intelecto
> Seu total de Apontar Fraqueza é subtraído da defesa de 1 alvo por 2 rodadas.

Registro: `modo: 'total'`, inimigo, 2 rodadas, `mod_defesa −1`. *O erudito lê
o estilo do adversário e o grupo inteiro aproveita.*

### Para o Sacerdote e as Ordens

**Fé Inabalável** · Sacerdote · Único · custo 2 · Aura
> Seu total de Fé Inabalável é adicionado à resistência mágica de 3 alvos por
> 3 rodadas.

Registro: `modo: 'total'`, `alvo: 'aliados'`, `maxAlvos: 3`, 3 rodadas,
`mod_rm +1`.

**Fúria Sagrada** · Ordem de Blator · Intermitente · custo 2 · Força
> Um teste de Fúria Sagrada (Difícil) adiciona 25% de dano por 2 rodadas.

Registro: `modo: 'teste'`, self, 2 rodadas, `dano_pct 25`, dificuldade
`dificil`.

**Sentença** · Ordem de Crizagom · Único · custo 2 · Carisma
> Um teste de Sentença (Muito Difícil) impede que 1 alvo ataque por 1 rodada.

Registro: `modo: 'teste'`, inimigo, 1 rodada, `sem_atacar`. *O justiceiro
condena, e o réu hesita.*

### Para o Mago

**Recuo Arcano** · Mago · Intermitente · custo 1 · Agilidade
> Seu total de Recuo Arcano é adicionado à sua defesa, e subtraído da sua
> coluna de ataque por 2 rodadas.

Registro: `modo: 'total'`, self, 2 rodadas, `mod_defesa +1`, `mod_ataque −1`.
*O mago recua para evocar em segurança — é a postura de quem não luta no corpo
a corpo.*

**Toque Funesto** · Colégio Necromântico · Intermitente · custo 2 · Aura
> Um teste de Toque Funesto (Médio) causa 1 de dano na energia física em 1 alvo
> por 3 rodadas.

Registro: `modo: 'teste'`, inimigo, 3 rodadas, `dano_por_rodada 1` (o molde do
Sangramento, com arma desarmada — `grupo_armas = CD`).

### Para as Guildas (que já têm, mas pouco apoio)

**Golpe Baixo** · Guilda de Ladrões · Intermitente · custo 1 · Agilidade
> Um teste de Golpe Baixo (Difícil) permite derrubar 1 alvo por 1 rodada.

Registro: `modo: 'teste'`, inimigo, 1 rodada, `derrubado`. *Irmã de
Desequilibrar (Muito Difícil, só Gladiadores e Piratas), mais fácil e com arma
leve.*

---

## 3. Adaptações das técnicas existentes

### 3.1 Texto com erro

| Técnica | Hoje | Sugestão |
|---|---|---|
| **Carga de Arremesso** | "Um teste de **Carga** (Médio)…" | "Um teste de Carga de Arremesso (Médio)…" |
| **Carga Montada** | "Um teste de **Carga** (Médio)…" | "Um teste de Carga Montada (Médio)…" |
| **Centaurizar** | "Seu total de Centaurizar **é adiciona** à coluna…" | "…é adicionado à coluna de ataque e à velocidade…" |
| **Imprevisibilidade** | "Seu total de **Imprevisilibidade**…" | "Seu total de Imprevisibilidade…" |

### 3.2 Técnicas repetidas

- **Mira** e **Ricochetear** fazem exatamente o mesmo (total na coluna de ataque
  por 1 rodada, com arma de disparo). Sugestão: Ricochetear passa a **ignorar a
  defesa de escudo** — ou vira "total na coluna de ataque contra 2 alvos",
  com `alvos_extras`.
- **Carga**, **Carga de Arremesso** e **Carga Montada** são todas "ignora a
  energia heroica". A diferença é só a arma e a montaria; vale dar à Montada
  algo que só cavalo dá (por exemplo, `+25% de dano`).
- **Inibir Ataque** (Soldados) e **Intimidar** (Bardo, Gladiadores) são o mesmo
  efeito com dificuldades diferentes. Está bem assim, mas Intimidar poderia
  pegar **2 alvos**, que é o que diferencia um grito de uma finta.

### 3.3 Nome em conflito

**Heroísmo** é técnica **e** magia, com a mesma chave (`heroismo`) nas duas
tabelas. Não quebra nada hoje — são tabelas diferentes —, mas na mesa as duas
aparecem com o mesmo nome e efeitos diferentes. Sugestão: a técnica vira
**Ímpeto Heroico**.

### 3.4 As que dependem de montaria

**Combate Montado**, **Carga Montada** e **Centaurizar** só fazem sentido
montado. O motor já sabe da montaria; sugiro que o painel da técnica fique
**desabilitado sem montaria**, em vez de rolar e aplicar zero.
