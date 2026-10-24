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
pena_celestial · carne_draconica · cogumelo_aria · erva_rubashi

**Mais 20 (24/10/2026),** os seguintes na contagem: ✔ alforge · cantil ·
equipamento_de_viagem · odre · algibeira · algibeira_grande · bolsa · moeda_cobre ·
moeda_latao · moeda_prata · moeda_ouro · frasco · aljava · aljava_reforcada ·
pergaminho · bainha · cachimbo · carne_demoniaca (Carne Profana) · lamparina ·
sandalias (uma só). Têm prioridade sobre o mapeamento por slot (ARTE_ITEM_SLUG
é conferido primeiro).

**Peças ↻:** o usuário decidiu não refazer ("não precisa refazer peça", 24/10/2026).

## Créditos (Figma Professional, desde 23/10/2026 22:40)

Contagem de imagens geradas no plano Pro (o saldo exato só aparece nas
configurações do time no Figma): 63 até os 20 consumíveis; 69 com os 6 fundos de batalha (excluídos); 89 com os 20 itens seguintes (24/10/2026).
