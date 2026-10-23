# Tarefa agendada: pinturas do Menestrel no Figma

Você roda sozinho, sem ninguém olhando. Gere no Figma as pinturas que faltam para o
Menestrel (RPG de mesa) e pare quando os créditos de IA do Figma acabarem. NÃO mexa
no repositório: não edite arquivos, não faça commit, não abra PR. Todo o trabalho é
no Figma.

## Onde

- Arquivo Figma: m74WBFVXcmW6du8H6xT4Tt (https://www.figma.com/design/m74WBFVXcmW6du8H6xT4Tt).
- Use o conector do Figma. Antes de qualquer ferramenta de arquivo, chame
  `create_session` com esse fileKey e use o sessionId devolvido em todas as chamadas.
- Gerador: `generate_image`, modelo `gemini-3.1-flash-image`.

## Passo a passo

1. Leia o arquivo com `get_metadata` e liste os nomes dos frames que já existem.
   Um item da lista abaixo está FEITO se já houver um frame com exatamente o nome
   dele (ex.: `bracos-medio`). Pule os feitos — a tarefa é idempotente.
2. Para cada item que falta, na ordem da lista:
   - monte o prompt pelo molde do grupo dele (abaixo);
   - chame `generate_image` (tamanho do grupo, abaixo);
   - renomeie o frame criado para o nome do item (ex.: `bracos-medio`) com `use_figma`;
   - anote o nome, o nodeId e a `image.url` devolvidos.
3. Se `generate_image` responder "Insufficient Figma AI credits" (ou outro erro de
   crédito/limite), PARE na hora — não tente de novo nem troque de modelo.
4. Termine com um resumo curto em português: quantos itens foram feitos nesta rodada
   (nome, nodeId e image.url de cada um), quantos faltam e se parou por falta de
   crédito. Se tudo já estiver feito, diga isso e encerre.

## Moldes

**Equipamentos** (itens sem prefixo `cond-` ou `fundo-`), 1024×1024:
> Hand-painted digital painting of a single medieval {OBJETO}. Classic fantasy RPG
> inventory icon style (like Diablo II / Baldur's Gate item art): one object alone,
> centered, three-quarter view, filling about 75% of the square frame. Painterly
> brushwork, rich detail, dramatic warm rim light from the upper left, soft gold
> highlights. Background: flat very dark warm brown-black (#17110A) with a subtle
> vignette, no texture, no floor, no shadow plate. No text, no border, no frame, no
> hands, no character.

Peças em par (botas, luvas, braçadeiras, ombreiras, brincos): desenhe UMA peça só.

**Condições** (prefixo `cond-`), 1024×1024 — o mesmo molde, com o objeto como emblema
e tom místico e sombrio:
> Hand-painted digital painting of {OBJETO}, as a mystical medieval emblem. Classic
> fantasy RPG icon style: one object alone, centered, filling about 70% of the square
> frame. Painterly brushwork, dark and mystical mood, dramatic warm rim light, soft
> glow. Background: flat very dark warm brown-black (#17110A) with a subtle vignette.
> No text, no border, no frame, no character.

**Fundos de batalha** (prefixo `fundo-`), 2048×1434 (paisagem, ≈10:7):
> {OBJETO}. Seen straight from above (top-down), like a hand-painted tabletop RPG
> battle map. Painterly, rich detail, dark and warm muted palette so tokens read on
> top of it. No characters, no creatures, no text, no grid lines, no border.

## Lista (nome = objeto)

ombreiras-leve = single boiled leather pauldron with stitched edges and buckled straps
ombreiras-medio = single riveted iron pauldron layered over mail, bronze trim
ombreiras-pesado = single articulated steel plate pauldron, raised haute-piece, gold-etched border
bracos-leve = single laced leather bracer with tooled patterns
bracos-medio = single iron splinted vambrace with leather straps
bracos-pesado = single steel plate vambrace with elbow couter, gold-etched
luvas-leve = single soft brown leather glove
luvas-medio = single leather gauntlet with mail backing and iron knuckle studs
luvas-pesado = single articulated steel plate gauntlet
pernas-leve = pair of brown leather trousers with knee patches
pernas-medio = pair of chainmail chausses (mail leggings)
pernas-pesado = single steel plate leg armor (cuisse and greave with knee cop)
botas-leve = single soft leather boot
botas-medio = single tall reinforced leather boot with iron buckles
botas-pesado = single steel plate sabaton with greave
escudo-leve = small round wooden buckler with an iron boss
escudo-medio = wooden heater shield with iron rim and a faded painted lion
escudo-pesado = large steel tower shield with riveted bands and a gold emblem
arma-leve = dagger with a leather-wrapped grip
arma-medio = longsword with cross guard and leather grip
arma-pesado = two-handed great axe with a broad steel blade
brincos-simples = single simple small bronze hoop earring
brincos-ornado = single silver earring with a small blue gemstone
brincos-nobre = single ornate gold drop earring with rubies
colar-simples = leather cord necklace with a carved bone pendant
colar-ornado = silver chain necklace with a sapphire amulet
colar-nobre = ornate gold filigree necklace with emeralds
capa-simples = folded plain brown wool travel cloak with hood
capa-ornado = dark green cloak with embroidered edges and a bronze clasp
capa-nobre = deep crimson velvet cloak with fur collar and a gold brooch
roupa-simples = plain linen tunic shirt
roupa-ornado = embroidered wool tunic
roupa-nobre = noble silk doublet with gold embroidery
cinto-simples = plain leather belt with an iron buckle
cinto-ornado = tooled leather belt with a bronze buckle and small pouches
cinto-nobre = ornate belt with gold plates and a gem-set buckle
anel-simples = simple iron band ring
anel-ornado = silver signet ring
anel-nobre = gold ring set with a large emerald
cond-doenca = a sickly green plague flask with a skull etched on the glass
cond-sono = a crescent moon over a guttering candle
cond-sede = an empty cracked leather waterskin
cond-fome = a cracked empty wooden bowl with a dry crust of bread
cond-frio = a frost-covered rune stone with icicles
cond-calor = a burning sun-shaped brass amulet
cond-vicio = an ornate long pipe trailing violet smoke
cond-loucura = a shattered hand mirror with an eye staring from the shards
cond-desonra = a broken heraldic shield with a torn banner
cond-pesado = an overstuffed traveler's pack bound with iron chains
fundo-floresta = top-down painted battle map of a dense old forest clearing, tree canopies, roots, moss, a narrow dirt trail
fundo-castelo = top-down painted battle map of a castle courtyard, flagstone floor, walls and a gatehouse at the edges
fundo-cidade = top-down painted battle map of a medieval town square, cobblestones, market stalls and rooftops at the edges
fundo-montanha = top-down painted battle map of a rocky mountain pass, boulders, cliffs, scree and patches of snow
fundo-estrada = top-down painted battle map of a dirt road through grassland, wagon ruts, low stone walls, shrubs
fundo-deserto = top-down painted battle map of desert dunes with wind ripples, scattered rocks and a dry riverbed
