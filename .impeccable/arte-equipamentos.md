# Arte dos equipamentos — progresso

Pedido do usuário (23/10/2026): pinturas no estilo de ícone de inventário de
RPG para todos os slots equipáveis, três versões de cada. Aprovado com as
amostras do elmo ("Ficou perfeito. É exatamente isso que eu quero.").

- Gerador: Figma `generate_image`, modelo `gemini-3.1-flash-image`, 1024×1024.
- Arquivo Figma: https://www.figma.com/design/m74WBFVXcmW6du8H6xT4Tt
- Imagens baixadas em `preview/equip-arte/` (as URLs do Figma expiram em 7 dias).
- Versão escolhida no sistema:
  - armas e armaduras: pelo `tipo_armadura` do catálogo (L leve, M médio, P pesado; sem tipo = médio);
  - joias e roupas: pelo valor do item (simples, ornado, nobre).
- Se o limite do Figma estourar: parar, marcar aqui o que falta e continuar depois.

## Estado (23/10/2026, 22:50)

O usuário assinou o Figma Professional (assento Full, mesmo time "A equipe de Richard Rossati"): 3.000 créditos de IA por mês. Retomado no mesmo arquivo e terminados TODOS os equipamentos novos (colar-ornado até anel-nobre). O usuário pediu para PERGUNTAR antes de seguir ("Quando terminar os itens do slot, vou te dar outra tarefa. Me pergunte antes.").

Falta: as 4 peças ↻ para refazer (ombreiras leve/médio/pesado e bracos-leve, como peça única), as 10 condições (cond-*) e os 6 fundos de batalha (fundo-*).

Detalhe: luvas-pesado saiu em par na primeira tentativa e foi refeita (uma luva só) — o prompt de peça em par precisa dizer "ONE single … (only one, not a pair)".

**Ordem (usuário, 23/10/2026):** primeiro os equipamentos ☐ na ordem da lista, depois as condições (cond-*), depois os fundos de batalha (fundo-*) e, **por último**, as peças ↻ para refazer.

## Peças em par: desenhar UMA só (usuário, 23/10/2026)

"As imagens de itens que são pares, tipo botas, luvas, etc, o desenho pode ser
de uma bota só, uma luva só... pro desenho ficar mais bonito."

Vale para botas, luvas, braçadeiras, ombreiras, brincos e as grevas de pernas-pesado:
o prompt pede "a single …" (uma peça), não "a pair of". As linhas abaixo já
estão corrigidas. ombreiras-leve/medio/pesado e bracos-leve foram feitas em PAR,
antes deste pedido — refazer como peça única quando houver créditos (estão
marcadas ↻).

## Molde do prompt

> Hand-painted digital painting of a single medieval {OBJETO}. Classic fantasy
> RPG inventory icon style (like Diablo II / Baldur's Gate item art): one object
> alone, centered, three-quarter view, filling about 75% of the square frame.
> Painterly brushwork, rich detail, dramatic warm rim light from the upper left,
> soft gold highlights. Background: flat very dark warm brown-black (#17110A)
> with a subtle vignette, no texture, no floor, no shadow plate. No text, no
> border, no frame, no hands, no character.

## Lista (✔ feita · ☐ falta · ↻ refazer)

| Arquivo | Objeto |
|---|---|
| ✔ elmo-leve | brown leather cap with laced leather coif and ear flaps |
| ✔ elmo-medio | conical iron nasal helm (spangenhelm), bronze bands, mail aventail |
| ✔ elmo-pesado | closed steel great helm, eye slits, brass cross, breathing holes |
| ↻ ombreiras-leve | single boiled leather pauldron with stitched edges and buckled straps |
| ↻ ombreiras-medio | single riveted iron pauldron layered over mail, bronze trim |
| ↻ ombreiras-pesado | single articulated steel plate pauldron, raised haute-piece, gold-etched border |
| ✔ peitoral-leve | brown leather jerkin over a quilted padded gambeson, laces |
| ✔ peitoral-medio | chainmail hauberk shirt with short sleeves and a leather belt |
| ✔ peitoral-pesado | polished steel plate cuirass, central ridge, fauld lames, gold trim |
| ↻ bracos-leve | single laced leather bracer with tooled patterns |
| ✔ bracos-medio | single iron splinted vambrace with leather straps |
| ✔ bracos-pesado | single steel plate vambrace with elbow couter, gold-etched |
| ✔ luvas-leve | single soft brown leather glove |
| ✔ luvas-medio | single leather gauntlet with mail backing and iron knuckle studs |
| ✔ luvas-pesado | single articulated steel plate gauntlet |
| ✔ pernas-leve | pair of brown leather trousers with knee patches |
| ✔ pernas-medio | pair of chainmail chausses (mail leggings) |
| ✔ pernas-pesado | pair of full plate armor legs shaped like trousers (refeita 23/10: "a calça de placas, não a parte da coxa") |
| ✔ botas-leve | single soft leather boot |
| ✔ botas-medio | single brown leather boot reinforced with steel toe cap, shin plates and heel guard (refeita 23/10: "couro com detalhes em aço") |
| ✔ botas-pesado | single all-steel plate boot ending at the ankle, no greave/knee (refeita 23/10: "só a bota de aço sem a joelheira") |
| ✔ escudo-leve | small round wooden buckler with an iron boss |
| ✔ escudo-medio | wooden heater shield with iron rim and a faded painted lion |
| ✔ escudo-pesado | large steel tower shield with riveted bands and a gold emblem |
| ✔ arma-leve | dagger with a leather-wrapped grip |
| ✔ arma-medio | longsword with cross guard and leather grip |
| ✔ arma-pesado | two-handed great axe with a broad steel blade |
| ✔ brincos-simples | single simple small bronze hoop earring |
| ✔ brincos-ornado | single silver earring with a small blue gemstone |
| ✔ brincos-nobre | single ornate gold drop earring with rubies |
| ✔ colar-simples | leather cord necklace with a carved bone pendant |
| ✔ colar-ornado | silver chain necklace with a sapphire amulet |
| ✔ colar-nobre | ornate gold filigree necklace with emeralds |
| ✔ capa-simples | folded plain brown wool travel cloak with hood |
| ✔ capa-ornado | dark green cloak with embroidered edges and a bronze clasp |
| ✔ capa-nobre | deep crimson velvet cloak with fur collar and a gold brooch |
| ✔ roupa-simples | plain linen tunic shirt |
| ✔ roupa-ornado | embroidered wool tunic |
| ✔ roupa-nobre | noble silk doublet with gold embroidery |
| ✔ cinto-simples | plain leather belt with an iron buckle |
| ✔ cinto-ornado | tooled leather belt with a bronze buckle and small pouches |
| ✔ cinto-nobre | ornate belt with gold plates and a gem-set buckle |
| ✔ anel-simples | simple iron band ring |
| ✔ anel-ornado | silver signet ring |
| ✔ anel-nobre | gold ring set with a large emerald |

## Condições: pinturas no lugar dos ícones (usuário, 23/10/2026)

"Registre que eu quero imagens feitas no Figma substituindo os ícones da barra
de condições." As 10 condições do Resumo (Doença, Sono, Sede, Fome, Frio,
Calor, Vício, Loucura, Desonra, Pesado) ganham pinturas do mesmo gerador, para
a face dos medalhões (proposta "tubos e medalhões", preview/resumo3.html).
Fazer DEPOIS das peças de equipamento, com o mesmo molde trocando o objeto por
um emblema: fundo escuro #17110A, objeto centrado, sem texto, tom místico.
Converter para `public/cond/*.webp` (240px) e acrescentar a chave em ARTE_COND (src/11-ficha/ficha.jsx).

**Decisão (usuário, 23/10/2026): OBJETOS, não personagens.** Testei retratos de um personagem genérico doente e com sono (guardados em preview/cond-arte/retratos/); o usuário preferiu voltar aos objetos. No prompt, além do molde: "mystical mood" e "compact, filling about 65% of the square frame so it fits inside a round medallion". Feitas: doença, sono, sede, fome — o usuário vai aprovar antes das outras 6.

| Arquivo | Objeto |
|---|---|
| ✔ cond-doenca | sickly green plague flask with a skull etched on the glass |
| ✔ cond-sono | glowing full moon |
| ✔ cond-sede | glass flask full of clear fresh water |
| ✔ cond-fome | rustic round loaf of bread |
| ✔ cond-frio | large ornate ice snowflake crystal |
| ✔ cond-calor | blazing hot sun with flame rays |
| ✔ cond-vicio | wooden tankard of foaming beer |
| ✔ cond-loucura | wide-open bulging bloodshot eye |
| ✔ cond-desonra | gold medal of honor on a crimson ribbon |
| ✔ cond-pesado | heavy stuffed leather travel bag |

**Objetos definidos pelo usuário (23/10/2026):** Doença = manter (frasco), Sono = lua cheia, Sede = frasco com água, Alimentação = pão, Frio = floco de neve, Calor = sol quente, Vício = cerveja, Sanidade = olho esbugalhado, Reputação = medalha, Peso = bolsa. Todas feitas e ligadas em ARTE_COND. As versões anteriores (lua sobre a vela, odre, tigela) ficaram em preview/cond-arte/antigas/.

## Campo de batalha: 6 fundos de ambiente (usuário, 23/10/2026)

"Adicione nas tarefas quando o Figma voltar, criar 6 imagens de fundo para usar
no campo de batalha simulando o ambiente: Floresta, Castelo, Cidade, Montanha,
Estrada, Deserto." Visão de cima (top-down), como um mapa de mesa pintado, para
ficar SOB a grade do tabuleiro: sem personagens, sem texto, sem grade
desenhada; tom escuro e quente, para os marcadores lerem por cima. Formato
paisagem (o tabuleiro é 50×35 casas, ≈ 10:7). Converter para
`public/batalha/*.webp` (~1600px de largura).

**24/10/2026: geradas e EXCLUÍDAS** ("Exclua as imagens da batalha, ficaram ruins. Depois voltamos nela."). Nós do Figma, public/batalha e preview/batalha-arte apagados; o seletor SeletorAmbiente saiu do trilho (o código e a coluna batalhas.ambiente ficam, inertes). Refazer quando o usuário pedir, com outra abordagem.

| Arquivo | Ambiente |
|---|---|
| ☐ fundo-floresta | top-down painted battle map of a dense old forest clearing, tree canopies, roots, moss, a narrow dirt trail |
| ☐ fundo-castelo | top-down painted battle map of a castle courtyard, flagstone floor, walls and a gatehouse at the edges |
| ☐ fundo-cidade | top-down painted battle map of a medieval town square, cobblestones, market stalls and rooftops at the edges |
| ☐ fundo-montanha | top-down painted battle map of a rocky mountain pass, boulders, cliffs, scree and patches of snow |
| ☐ fundo-estrada | top-down painted battle map of a dirt road through grassland, wagon ruts, low stone walls, shrubs |
| ☐ fundo-deserto | top-down painted battle map of desert dunes with wind ripples, scattered rocks and a dry riverbed |

## Consumíveis: os 20 mais comuns (usuário, 23/10/2026)

"Vamos fazer os 20 itens mais comuns do jogo (os consumíveis) e aplicar."
Escolhidos pelo número de personagens que têm o item no inventário
(personagens.inventario->itens). Mesmo molde dos equipamentos, ~70% do
quadro. Titânico = dracônico (vermelho e ouro), Profano = infernal (preto e
brasa), Sagrado = celestial (branco e ouro). Imagens em preview/itens-arte/,
convertidas para public/itens/<slug>.webp (240px) e ligadas em ARTE_ITEM_SLUG
(src/11-ficha/ficha.jsx), que o inventário, a loja e o estoque usam via
window.arteDoItem / ItemIcone.

✔ agua · racao · pederneira · tocha · flecha · lenha · hidromel · pena_draconica ·
couro_demoniaco · oleo_draconico · sangue_draconico · pena_demoniaca ·
marfim_demoniaca · oleo_demoniaco · couro_draconico · marfim_draconica ·
pena_celestial · carne_draconica · cogumelo · erva

`cogumelo` e `erva` eram `cogumelo_aria` e `erva_rubashi`, uma pintura por slug
— e por isso só um cogumelo e uma erva tinham imagem. Desde 28/10/2026 são
pinturas de TIPO (pedido do usuário: "todas as ervas devem ter a mesma imagem,
todos os cogumelos devem ter a mesma imagem"), como Livro e Manual.

**Mais 20 (24/10/2026),** os seguintes na contagem: ✔ alforge · cantil ·
equipamento_de_viagem · odre · algibeira · algibeira_grande · bolsa · moeda_cobre ·
moeda_latao · moeda_prata · moeda_ouro · frasco · aljava · aljava_reforcada ·
pergaminho · bainha · cachimbo · carne_demoniaca (Carne Profana) · lamparina ·
sandalias (uma só). Têm prioridade sobre o mapeamento por slot (ARTE_ITEM_SLUG
é conferido primeiro).

**Peças ↻:** o usuário decidiu não refazer ("não precisa refazer peça", 24/10/2026).

## Arreamento de montaria: as 8 que faltavam (27/10/2026 — 8 pinturas)

Pedido do usuário: "Crie os itens no sistema e no figma para a montaria. Os
animais que podem ser montados, podem usar os itens de montaria."

As treze peças já existiam desde 05/10/2026; o que faltava era a arte. Das
doze casas do boneco do bicho (ARREIO_REGIOES), só quatro tinham pintura —
sela, arreio, alforje e atrelado. Gualdrapa e Manta tomavam emprestada a do
Arreio (três casas com a mesma imagem) e seis peças ficavam no glifo.

| Arquivo | Objeto |
|---|---|
| ✔ cabecada | leather horse bridle with reins, browband, bit and brass buckles, in a loose coil |
| ✔ manta | folded quilted wool saddle blanket with woven stripes and tasselled corners |
| ✔ gualdrapa | heraldic caparison, draped embroidered cloth trapper with scalloped edges and a lion crest |
| ✔ peitoral-montaria | curved steel horse breastplate (peytral), riveted bronze bands, hanging straps |
| ✔ crinum | horse neck armor (crinet), column of overlapping articulated steel lames |
| ✔ chanfron | steel horse head armor with eye cups and a short forehead spike |
| ✔ caneleiras-montaria | ONE single horse leg guard, boiled leather with riveted steel strips |
| ✔ barda | full horse barding, flank and crupper plates over mail, gold borders |

No prompt, além do molde: **"no horse, no animal"**. Sem isso o gerador veste
a peça num cavalo em vez de pintar o objeto sozinho.

**A LIGAÇÃO SÃO TRÊS LUGARES, não um.** Esquecer qualquer um devolve o glifo
sem erro nenhum — e foi o que aconteceu na primeira tentativa, com a casa
VAZIA já mostrando a silhueta e a casa CHEIA ainda no glifo:

1. o arquivo em `public/itens/<base>.webp` (240px, como as outras de item);
2. a **base** na família Montaria (`01-core/bases-item.jsx`) e `itens.base`
   no banco — é ela que liga o item do catálogo à pintura;
3. o **registro** `ARTE_ITEM_NOVA` (`11-ficha/ficha.jsx`): `arteDaBase` só
   devolve caminho para arquivo registrado. `ARTE_ARREIO_VAZIO` monta o
   caminho direto e NÃO passa por ele — daí a casa vazia funcionar sozinha e
   esconder a falta.

Contrato em `11-ficha/arte-arreamento.test.jsx`, que trava os três de uma vez.

Os sufixos `-montaria` existem porque Peitoral e Caneleiras já são peça de
gente: a barda do cavalo e a couraça do cavaleiro não são a mesma base.

## Créditos (Figma Professional, desde 23/10/2026 22:40)

Contagem de imagens geradas no plano Pro (o saldo exato só aparece nas
configurações do time no Figma): 63 até os 20 consumíveis; 69 com os 6 fundos de batalha (excluídos); 89 com os 20 itens seguintes (24/10/2026); 110 com as 21 das regiões novas (26/10/2026); 130 com as 20 pinturas de TIPO de item (26/10/2026); 138 com as 8 do arreamento de montaria (27/10/2026); 142 com as 3 calças de
pano (28/10/2026 — 4 chamadas, uma refeita).

## Regiões novas do boneco de armar (26/10/2026 — proposta de slots aprovada)

A ficha ganhou 17 regiões (modelo aprovado, artifact c6dbd3d6) e o catálogo
~38 tipos novos (scripts/sql/slots-e-status-2026-10-26.sql).

### Pintadas em 26/10/2026 — 21 imagens, 7 famílias × 3

A nomenclatura mudou junto: a família nova é nomeada pelo **tipo e pelo
material**, não mais por simples/ornado/nobre. "Brinco Nobre não existe mais,
agora é Brinco de Ouro" (usuário). Os arquivos antigos (brincos-*, colar-*,
anel-*, capa-*, roupa-*, cinto-*) ficam com o nome de sempre; só o rótulo na
tela passou a dizer o metal.

- **coroa** (cabeça) — ouro · prata · cobre
- **tiara** (cabeça) — ouro · prata · cobre
- **broche** (peito) — ouro · prata · cobre
- **medalha** (peito) — ouro · prata · cobre
- **pingente** (peito/pescoço) — ouro · prata · cobre (serve os Amuletos)
- **capuz** (rosto) — seda · couro · algodão
- **mascara** (rosto) — porcelana (Nobre) · couro (Selvagem) · ferro (Decorativa,
  e o Olhar da Infâmia)

Quem escolhe é `ARTE_TIPO_FAMILIAS` / `arteDoTipo` em 11-ficha/ficha.jsx: a
base vem da palavra do tipo no nome do item e a versão vem da palavra do
material; sem material no nome (Coroa Abad'Dorim, Amuleto da Brasa), decide o
preço, como em `versaoDaArte`. Contrato fixado em 11-ficha/arte-por-tipo.test.jsx.

### Ainda faltam

A lista de verdade não mora mais aqui: a página **Imagens** (menu do usuário,
só Mestre — 10-shell/galeria-imagens.jsx) passa cada item do catálogo por
`window.arteDoItem` e mostra quem fica sem pintura, agrupado por região. Item
novo no catálogo aparece lá sozinho. Em 26/10/2026 a lista era:

- **luva de pano** (pulso) — 3 versões (luvas-*.webp são as manoplas de armadura)
- ~~**calça de pano**~~ — ✔ feita em 28/10/2026, e na região certa: a base
  estava em `cintura` e foi para `perna` (ver abaixo)
- **estojo** (alforje) — uma (bainha/aljava/algibeira/alforge já têm arte de item)

Pintura emprestada, que funciona mas podia ser própria: chapéu usa o elmo,
dragona usa as ombreiras, cachecol e lenço usam o colar, gargantilha usa o
colar, piercing usa o brinco, bracelete usa o anel, casaco usa o traje.

Enquanto a pintura não existe, a casa vazia da região mostra o glifo Tabler
(rosto: ti-masks-theater · pulso: ti-diamond · canela: ti-shield · alforje:
ti-briefcase — ver FP_REGION_ICON em 11-ficha/ficha.jsx).

### Baixar o que o Figma gerou

`curl` falha nos links de asset do Figma ("Connection was reset"). O que
funciona é o PowerShell:

```powershell
Invoke-WebRequest -Uri $url -OutFile "<destino>.png" -UseBasicParsing -TimeoutSec 60
```

Depois, PNG → WebP de 320px (Pillow), que é o formato das pinturas antigas.
Os links de asset expiram em 7 dias.

## A pintura de ITEM pelo tipo (26/10/2026 — 20 pinturas)

Pedido do usuário: "Vamos criar as próximas 20 imagens do Figma, uma imagem
apenas para livro." Até aqui a arte de item era por SLUG — uma imagem por
entrada do catálogo — e isso não escala: só de "Livro de …" e "Manual do …"
são quase 160 entradas, todas do mesmo objeto.

As 20 (arquivos em `public/itens/<tipo>.webp`), com o que cada uma cobre:

| pintura | cobre | ≈ itens |
|---|---|---|
| livro | Livro de … e Manual do … | 160 |
| equipamento | Equipamento de … (kits de profissão) | 29 |
| casa | propriedades (casa, castelo, taverna…) | 23 |
| elixir | Elixir de … | 17 |
| gema | pedras preciosas | 16 |
| minerio | metais e pedras brutas | 16 |
| cavalo | cavalos e pôneis | 15 |
| barco | barco, canoa, caravela, nau, veleiro, Pérola Fantasma | 9 |
| arreio | arreio, cabeçada, gualdrapa, manta de sela | 5 |
| carroca | carroça, carruagem, charrete, carro de boi, trenó | 5 |
| quadro | Quadro … | 7 |
| bau | baú, arca, caixa | 6 |
| estatua | estátuas e bustos | 6 |
| virote | virotes | 4 |
| dardo | dardos | 4 |
| barril | barril e tonel | 4 |
| sela | selas | 3 |
| jarra | jarra e urna | 2 |
| mochila | mochila | 1 |
| saco | saco | 1 |

A tabela que liga nome → tipo é `ARTE_ITEM_TIPO` (11-ficha/ficha.jsx). Ela é
**ordenada** — a primeira que casa vence — e só vale para item SEM região
(`slot_equip` nulo), para não roubar a pintura de um "Anel Dourado". Ela
também empresta pinturas que já existiam: `Pergaminho …` → pergaminho,
`Frasco …` → frasco, `Flecha …` → flecha, ração/refeição/banquete → racao,
vinho/licor/cerveja → hidromel, cabaca/caramanhola → cantil, moedas antigas →
moeda do metal. Contrato em 11-ficha/arte-de-item-por-tipo.test.jsx.

A pintura aparece em três lugares: a casa do boneco (Ficha), o painel do item
(inventário e loja) e, desde 26/10/2026, a **janela do Livro de Regras** —
"ao clicar no menu de livro de regras e abrir um item, eu quero ver a imagem
dele dentro do modal" (usuário).

## A BASE do item manda, não o nome do exemplar (26/10/2026)

Correção de modelagem pedida pelo usuário, depois de ver "Máscara Decorativa"
na legenda de uma pintura:

> "Existe a base do item, por exemplo 'Máscara de Ouro', e existe o exemplar
> do item, 'Máscara Decorativa', 'Máscara Verrogari', etc — ou seja, as duas
> podem ser uma 'Máscara de Ouro'. Isso vale para todos os itens. No caso dos
> livros, todo livro com as magias dos deuses são 'Livro de Milagres'. Isso
> precisa estar presente na criação/edição do item, e também na hora de
> visualizar o item."

Tudo o que veio antes disto escolhia a pintura por **regex no nome do
exemplar** — e nome de exemplar não diz material nenhum: "Verrogari" não
revela se a máscara é de ouro ou de couro, e dois exemplares de nomes
completamente diferentes podem ser a mesma base.

Como ficou:

- **`src/01-core/bases-item.jsx`** é o vocabulário das bases (~170). Cada uma
  tem `slug`, `nome` ("Máscara de Ferro"), `familia`, as regiões (`slots`) ou
  os grupos (`grupos`) onde cabe e, quando existe, a `arte`. **Uma base pode
  não ter pintura** — aí a casa mostra o glifo da região e a base segue
  classificando. E **várias bases podem dividir a mesma pintura**: todos os
  tipos de livro usam `itens/livro.webp`.
- **`itens.base`** guarda o slug (migração `scripts/sql/base-do-item-2026-10-26.sql`).
  952 dos 1162 itens foram semeados pela inferência antiga; o resto fica para
  o Mestre.
- **O editor** mostra o campo "Base" com as opções filtradas pela região (ou
  pelo grupo) do item — `opcoesDe` no descritor, suporte novo em
  `catalogo-editor.jsx`.
- **A ficha do item** abre com a frase "**Livro de Maira** é um **Livro de
  Milagres**." (`BestItemBase`, 09-bestiario/bestiario.jsx).
- **`arteDoItem`** consulta a base primeiro. O palpite pelo nome continua
  logo abaixo, como rede para quem ainda não tem base; base conhecida mas sem
  pintura vai para o glifo, e não para um chute.
- **A página Imagens** é desenhada a partir do vocabulário: a legenda é o nome
  da base, e "Bases sem pintura" é a próxima encomenda do Figma, ordenada por
  quantos itens do catálogo cada uma cobre.

Contratos em `01-core/bases-item.test.jsx` e `10-shell/galeria-imagens.test.jsx`.


## As três pedras da Energia (27/10/2026 — 3 pinturas)

Pedido do usuário, em duas mensagens: "eu quero mudar as barras de energias, é
possível transformá-las em pedras (gemas preciosas) animadas? Seria uma pedra
rubi, uma pedra esmeralda e uma pedra safira" e, vendo as facetas vetoriais que
eu tinha feito antes, "você pode fazer o desenho das gemas no Figma e usar a
animação?".

As três substituem os TUBOS de alquimista de 23/10 no cartão Energias das duas
fichas (personagem e companheiro animal).

| Arquivo | Objeto |
|---|---|
| ✔ gema-rubi | large ruby, round brilliant cut, viewed perfectly face-up |
| ✔ gema-esmeralda | large emerald, emerald cut (step cut), upright octagon, face-up |
| ✔ gema-safira | large sapphire, pear cut (teardrop, point up), face-up |

Molde do prompt (difere do dos equipamentos em dois pontos: **de frente, não em
três quartos** — é a silhueta do talhe que distingue uma pedra da outra —, e
**sem engaste**, que apareceria como metal solto no meio do cartão):

> Hand-painted digital painting of a single large {PEDRA}, {TALHE}, viewed
> perfectly face-up from directly above. Classic fantasy RPG inventory icon
> style (like Diablo II / Baldur's Gate item art): one object alone, centered,
> perfectly symmetrical, filling about 92% of the square frame. {COR} crystal
> with clearly defined facets, inner fire glowing from the heart of the stone,
> crisp specular highlights along the facet edges. Painterly brushwork, rich
> detail, dramatic warm rim light from the upper left. Background: flat very
> dark warm brown-black (#17110A), no texture, no floor, no shadow plate, no
> metal setting, no ring, no claws, no jewelry mount. No text, no border, no
> frame, no hands, no character.

**Fundo recortado, ao contrário de todas as outras.** As pinturas de item vivem
dentro de uma casa quadrada, e por isso ficam com o fundo `#17110A` do prompt.
A pedra fica solta no cartão: o quadrado apareceria. O recorte é um
preenchimento por inundação a partir das bordas (`scripts/` não tem isto; foi
Pillow em script avulso, descrito aqui para quem precisar refazer):

1. reduzir para 512×512;
2. inundar a partir das quatro bordas tudo o que estiver a uma distância de cor
   ≤ 46 do pixel do canto — **inundação, e não limiar**, para as facetas
   escuras do meio da pedra não serem comidas junto;
3. desfocar o alfa 1,1px, recortar na caixa do conteúdo, centrar num quadrado;
4. 448×448, webp qualidade 92.

Destino: `public/energia/gema-*.webp`. Ligação em `ARTE_GEMA`
(11-ficha/ficha.jsx), por chave da energia: `ef` rubi, `eh` esmeralda, `ka`
safira. Quem não tiver pintura cai no **talhe vetorial** de reserva (`gemaTalhe`,
no mesmo arquivo), do mesmo jeito que a condição sem pintura cai no ícone.

Contrato em `11-ficha/tubos-medalhoes.test.jsx` — inclusive a existência dos
três arquivos em `public/`.


## A calça de pano (28/10/2026 — 3 pinturas)

Pergunta do usuário: "Nós criamos as vestimentas para usar na perna? Acho que
não, só criamos as vestimentas que vão no peito. Crie as vestimentas para irem
na perna, com descrição, e crie as imagens."

**O diagnóstico foi melhor que o palpite.** As calças de pano existiam, com
descrição — mas a base `trio('calca', …)` nascera em `cintura`, a região do
cinto. Por isso a perna parecia não ter vestimenta nenhuma e a cintura ficava
com cinto e calça disputando a mesma casa. O cinto segura a calça; quem a veste
é a perna. A base mudou de região e as três linhas do catálogo com ela.

| Arquivo | Objeto |
|---|---|
| ✔ calca-algodao | ONE pair of simple undyed cotton trousers, coarse homespun weave, drawstring waist, slightly frayed hems |
| ✔ calca-couro | ONE pair of brown leather trousers, folded flat, laced waistband with brass eyelets, saddle stitching |
| ✔ calca-seda | ONE pair of courtly silk trousers, deep wine-red, gold embroidery at hems and waistband, slender gold cord |

**A calça pede "FOLDED and laid flat".** Sem isso o gerador desenha a peça
encolhida e ela sai lendo como bota ou luva — foi o que aconteceu com a
primeira tentativa de `calca-couro`, refeita. O que corrige é descrever a
COMPOSIÇÃO, não só o objeto: "the laced waistband across the top, and the two
long trouser legs folded over each other below it", mais um "These are
TROUSERS, not boots, not shoes" explícito. Mesma família de problema do
`luvas-pesado` que saiu em par.

Ligação no sistema: `ARTE_PINTADA` em `11-ficha/ficha.jsx` (a base é
`calca-<tecido>` e o arquivo tem o mesmo nome) e `trio('calca', 'Calça',
['perna'], TECIDO)` em `01-core/bases-item.jsx`. `pernas-*.webp` continua
sendo a armadura de perna — são coisas diferentes na mesma região.

Catálogo: as três que existiam saíram de `cintura` para `perna` e ganharam
base; entraram Calça de Linho, Bombacha de Algodão e Bombacha de Couro, para
a perna ter a mesma largura de escolha que o peito (seis peças, de 450 a 4000
latões).
