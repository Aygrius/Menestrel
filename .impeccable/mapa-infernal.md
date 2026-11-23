# Mapa do Plano Infernal — andamento

Arquivo: `tagmar/mapa.cdr`, **página 2 "Plano Infernal"**, 750 × 596,3 mm
(1/4 da área do plano material, que mede 1500 × 1192,6 mm = viewBox 5905,5 × 4695,1).
Automação: COM `New-Object -ComObject CorelDRAW.Application` (o Corel 2018 não
está no ROT; `GetActiveObject` falha). Scripts `.ps1` precisam de UTF-8 **com BOM**,
senão os acentos viram "Ã£". `doc.Unit = 3` (mm), origem no canto inferior esquerdo.
Backup antes da página: `tagmar/mapa (antes do plano infernal 2026-11-22).cdr`.

**Incidente (descoberto em 23/11/2026):** o Corel tinha aberta uma versão mais
velha do mapa.cdr; o primeiro Save desta frente apagou da página 1 as montanhas
de 22/11, 17 fronteiras, os icebergs e a floresta de Lar. Restaurado em 23/11
copiando o backup acima sobre o mapa.cdr (com autorização) e recriando a página
2 (`infernal-pagina-corel.ps1` + `infernal-fronteiras-corel.ps1`, que NÃO salva
mais sozinho). Na recriação, a página 1 PERDEU AS MESMAS PEÇAS DE NOVO só por criar a página 2
e mexer nas camadas dela — a causa é o script, não uma versão velha aberta. Não
foi salvo; o mapa.cdr no disco está íntegro (só a página 1). **Decisão: o plano
infernal mora num arquivo próprio, `tagmar/mapa-infernal.cdr`; o mapa.cdr nunca
mais é tocado por esta frente.** O .ps1 de aplicação recusa rodar se o documento
ativo não for o mapa-infernal.cdr e desenha na página 1 dele. O Corel recusa
SaveAs por script: o documento novo (sem nome, página "Plano Infernal" com as
camadas) ficou aberto para o usuário salvar à mão como tagmar/mapa-infernal.cdr.

Para refazer tudo: `node scripts/mapa/infernal-fronteiras.mjs` (prévia em
`tagmar/infernal-bloco2.svg`; screenshot com Edge headless) e depois
`scripts/mapa/infernal-fronteiras-corel.ps1` com o Corel aberto no mapa.cdr.
O .ps1 já tem BOM; não acrescentar outro.

Fonte: `tagmar/principes.pdf`. Geografia linear: estrada única do 1º ao 13º reino.

| nº | Reino | Pecado | Terreno (do livro) | centro (mm) |
|---|---|---|---|---|
| 1 | Ricutatis | perversos | cidade bela de fachada (Farzelo) | 95, 490 |
| 2 | Mocna | ira | planalto árido, solo rachado, espinheiros | 235, 455 |
| 3 | Antredom | avareza | cidadela sobre montanha, vale de "plantações" (Alhino) | 370, 505 |
| 4 | Diatrimis | traição | muralha, acampamento militar, arenas (Calganazo) | 515, 460 |
| 5 | Ekisis | discórdia | deserto imenso, labirinto (Barciano) | 662, 478 |
| 6 | Heldrom | corrupção | terras patrulhadas, ferrugem e sangue (Ribalicor) | 640, 320 |
| 7 | Seinoniz | preguiça | cratera (Draganazo) | 490, 292 |
| 8 | Vouxiz | ganância | lago profundo, floresta de brumas, torre (Garfiniane) | 340, 330 |
| 9 | Udoviom | contaminação | vale rochoso de lodo, chuva (Crinato) | 170, 285 |
| 10 | Anasmadis | luxúria | muralhas que suam sebo (Malacoda) | 120, 140 |
| 11 | Branaxis | assassinato | necrópole, pedreira, tumbas flutuantes (Rubiniate) | 285, 112 |
| 12 | Fulvina | vaidade | florestas sombrias e sangrentas (Escarmegelo) | 450, 150 |
| 13 | Morrigalti | genocídio | montanhas, vulcões, rios de lava (Simaricane) | 640, 118 |

## Blocos

- [x] **1 — esqueleto** (22/11/2026): página, camadas (Fundo, Reinos, Desertos,
  Pântanos, Florestas secas, Relevo, Vulcões, Lava, Rios, Vapores, Estradas,
  Cidades, Nomes), chão de basalto, 13 manchas provisórias com nome e pecado,
  Estrada dos Condenados em serpentina 1 → 13.
- [x] **2 — contornos** (22/11/2026): a terra é uma faixa sinuosa (meia-largura
  ~50 ± 9 mm) ao longo de uma Catmull-Rom pelos 13 centros; cada reino é o trecho
  da faixa entre os pontos médios de seus vizinhos, então só reinos consecutivos
  se tocam (as viradas são em Ekisis→Heldrom e Udoviom→Anasmadis). Bordas
  entortadas por ruído fbm (±11 mm), aplicado igual nos dois lados de cada
  fronteira. Fundo virou "Vazio" (18,10,9) com "Borda do abismo" (faixa +8 mm,
  58,33,25). Gerador: `node scripts/mapa/infernal-fronteiras.mjs` → JSON e prévia
  SVG em `tagmar/`; aplicar com `scripts/mapa/infernal-fronteiras-corel.ps1` (grupos viram uma curva com vários subcaminhos, `Nova-Multi`; polígono único em `Grupo` vai como `@(,$x)`)
  (apaga e recria a camada Reinos e a borda). Prévia: Edge headless
  `--screenshot` sobre o SVG (o Export do Corel via PowerShell falha).
- [x] **2b — forma variada** (pedido em 22/11/2026: "o mapa não precisa ser um
  caminho largo só, podemos ter partes mais estreitas, outras confusas como
  labirintos, etc. Mas sempre com uma única direção"). Plano: largura por reino
  (planalto de Mocna e deserto de Ekisis largos, Morrigalti amplo); gargalos
  nas fronteiras de portão (3|4 muralha de Diatrimis, 9|10 portão de Anasmadis,
  12|13 entradas de Morrigalti); linha central serpenteando estreita em
  Udoviom (vale sem saída), Branaxis (escadas tortas) e Heldrom; becos sem
  saída (dedos de terra, soldados no Corel com Weld) em Vouxiz (floresta de
  brumas) e Branaxis. Estrada refeita sobre a nova linha central.
  Gerador pronto e conferido em prévia (tabela `R` no topo do .mjs: meia-largura,
  serpenteio, gargalo, nº de becos por reino). Aplicado no Corel em 22/11/2026 (becos soldados com `Weld` no reino e na borda).
- [x] **3 — lava e água** (22/11/2026): camada Lava com "Mar de Brasas" (vão entre a
  2ª e a 3ª fileira) e "Mar de Lava do Sul" (embaixo de Morrigalti), recortados
  pela borda (`Trim`) e pela página (`Intersect` com o Vazio); três rios de lava
  saindo de Morrigalti para o mar do sul (Rio de Lava Sangrento, Rio das Treze
  Portas, Braço de Simaricane). Camada Rios: Lago de Vouxiz. Camada Pântanos: 9
  poças de lodo ao longo do vale de Udoviom. Estrada dos Condenados refeita sobre
  a linha central (tracejada). O vão entre a 1ª e a 2ª fileira ficou como abismo
  (sem lava), de propósito: contraste vazio × lava. As nascentes dos rios em
  Morrigalti (≈ 618,150 · 664,146 · 640,160) são onde entram os vulcões no bloco 4.
- [x] **3b — correções** (pedido 22/11/2026): "os rios de lavas não saem do
  caminho" → rios nascem nos vulcões de Morrigalti e correm por dentro do reino
  até Simaricane (cortados no contorno do reino); remover os becos de Vouxiz
  (ficam só os de Branaxis).
- [x] **4 — relevo** (aplicado no Corel em 22/11/2026; cada tipo combinado numa curva só): cordilheira em anel dentro de Morrigalti com a passagem da
  estrada a oeste (vinda de Fulvina); 3 vulcões no anel, de onde nascem os rios
  de lava, que correm até Simaricane; montanha da cidadela de Antredom; cratera
  de Seinoniz; mesa (planalto) de Mocna com escarpa; rochedos nas margens do
  vale de Udoviom. Estilo da página 1: base, topo, sombra (deslocada para
  sudeste, semitransparente) e luz (noroeste). Morros soltos em Diatrimis e
  Heldrom foram testados e tirados (pareciam seixos; Diatrimis é planície).
- [x] **4b — rocha em volta** (ideia do usuário em 22/11/2026: "no plano material o
  que cobre o mundo é água, no plano infernal o que cobre o mundo é rocha, ou
  seja, fora do mapa há apenas rocha"). O Vazio vira "Rocha" com fendas; a
  borda vira a parede escura onde a rocha desce até o caminho; os mares de lava
  de fora saem (lava só dentro do caminho).
- [x] **4c — como o mapa material** (pedido 22/11/2026: "Porque há textos no mapa?
  Porque há terrenos com cores? Siga o exemplo do mapa do mundo material"): sem
  textos no .cdr (os nomes moram no app, como na página 1); um chão só para
  todos os reinos; divisões só como linhas na camada Fronteiras (como a página 1).
- [x] **5 — biomas** (aplicado no Corel em 22/11/2026; o planalto e a cratera
  foram refeitos, antes saíam degenerados): deserto de Ekisis em três tons (deserto-borda/meio/deserto,
  como a página 1); florestas secas em Vouxiz (brumas ao redor do lago) e
  Fulvina, com manchas densas; solo rachado em Mocna; vapores (fumarolas
  semitransparentes) perto de lava, cratera, lodo e espalhados. Tudo preso ao
  contorno do reino (`prende`).
- [ ] **6 — estradas e cidades**: como na página 1, NÃO entram no .cdr — moram no
  app (catalogo_mundo). A linha central do gerador (`C`/`estrada`) serve de base.
- [x] **7 — acabamento** (23/11/2026): vapores viraram fiapos que sobem e entortam
  (antes pareciam seixos); os três rios de lava se encontram num ponto só em
  Simaricane. Exportar a página por script NÃO funciona (PowerShell e VBScript
  dão "tipos incompatíveis" em Export/ExportEx/ExportBitmap; talvez a versão de
  avaliação): conferir pela prévia do gerador. Nomes ficam no app, não no .cdr.
- [ ] ~~8 — levar ao app~~ — recusado em 23/11/2026: "está muito longe de estar
  pronto. A geometria ainda parece uma salsicha, não parece um mapa."
- [ ] **9 — refazer a geometria: câmaras ligadas** (escolha do usuário em
  23/11/2026). Cada reino é uma câmara de forma e tamanho próprios (Ekisis e
  Morrigalti enormes, Udoviom um corredor), contorno recortado em várias escalas
  (fractal), ligadas por passagens estreitas e tortas; traçado livre pela página,
  sem fileiras. A fronteira é uma linha no meio de cada passagem. Novo gerador:
  `scripts/mapa/infernal-camaras.mjs` (mesmo JSON; o .ps1 aplica igual).
  **Estado em 23/11/2026 — só em prévia, NÃO aplicado no Corel** (o .cdr ainda
  tem a geometria de faixa). Prévia: `tagmar/infernal-camaras-previa.png`.
  Feito: câmaras maiores com 2–3 lóbulos cada (silhueta irregular), contorno
  fractal, passagens curtas com largura própria (tabela `R`, última coluna),
  conferência automática (menor distância entre reinos não consecutivos: 22 mm,
  Diatrimis–Vouxiz; nada fora da página). Pendências antes de aplicar:
  1) Udoviom (vale em faixa sinuosa, `lobulos` i===8) sai sem a parede escura e
  com pontas cortadas retas, e o lodo vaza para fora — investigar o polígono da
  borda (índice 30 em `bordas`). 2) Ainda lembra "contas num cordão": falta
  variedade — reinos vizinhos poderiam se fundir em massas maiores com o
  gargalo só na fronteira, e passagens mais largas em alguns trechos.
  3) O .ps1 precisa usar `J.bordas` (lista) e `J.reinos[i].pecas` (soldar com
  Weld) em vez de `J.borda`/becos.

## Virada de 23/11/2026 — continente, não linguiça

O usuário: "Está parecendo uma linguiça. Olha o mapa do plano material, como sua
forma parece um mapa de verdade." Lição (vale para qualquer retomada): o mapa
material é UM continente grande, de litoral orgânico (baías, penínsulas, ilhas),
e os reinos são REGIÕES dentro dele; o caráter vem das cordilheiras compridas,
rios e manchas de bioma. Fazer a linearidade com a forma da terra (faixa, contas
num cordão) sempre vira linguiça.

Bloco 10 — continente com muralhas: a terra é um campo escalar (distância a uma
espinha pelos 13 centros, largura por reino e ruído fractal em 3 escalas), cujo
contorno (marching squares) dá o litoral; reinos = rótulo do ponto mais próximo
da espinha (com distorção) numa grade; ONDE DOIS REINOS NÃO CONSECUTIVOS SE
TOCAM, a fronteira vira muralha de montanhas intransponível — assim o caminho
continua único (1 → 13) sem a terra ser um tubo. Gerador:
`scripts/mapa/infernal-continente.mjs`.

Estado do bloco 10 em 23/11/2026 (só prévia, não aplicado no mapa-infernal.cdr):
`node scripts/mapa/infernal-continente.mjs` gera em ~1 s `tagmar/infernal-continente.json`,
a prévia `infernal-continente.svg` (e `-rotulos.svg` com os números dos reinos,
só para conferir). Conferências impressas: vizinhos consecutivos sem fronteira
(nenhum) e pares com muralha (3-7, 4-6, 6-12, 8-10, 8-11). Ajustes já feitos:
litoral com mais ruído de baixa frequência (baías de rocha entre as "fileiras"),
muralhas em 2–3 fileiras de picos. Pendências: o contorno geral ainda ocupa a
página como um retângulo — faltam penínsulas e um recorte maior; o deserto de
Ekisis ganha um dente onde `prende` puxa a bolha; falta escrever o .ps1 que
aplica este JSON (litoral com contorno escuro atrás do preenchimento, Combine
dos grupos; a trava do mapa-infernal.cdr continua).

23/11/2026, rodada 2 do bloco 10 (usuário: "Melhorou, mas pode melhorar mais"):
22 acidentes de litoral (gaussianas alongadas na normal da espinha: penínsulas
+80, baías −60), margem de rocha irregular (34 ± 22 mm), ruído de baixa
frequência mais forte, reinos do sudoeste mais finos. Muralhas agora em 8 pares
(1-8, 3-6, 3-7, 6-11, 6-12, 7-11, 8-10, 8-11). Próximas ideias se ainda parecer
bloco: abrir um "mar" de rocha grande no meio ou num canto (o mapa material é
um C em volta de um mar), e mover a espinha para o desenho não seguir a página.
Ainda não aplicado no Corel.

23/11/2026, rodada 3 do bloco 10 — pedido: "Não conecte os reinos, faça partes
mais estreitas e outras mais largas, mantenha formatos irregulares." Mudança:
nada de massa única com muralhas; um canal de rocha separa automaticamente
reinos não consecutivos (o campo da terra cai onde a espinha de um reino não
vizinho está quase tão perto quanto a do próprio). Larguras bem variadas por
reino e gargalos nas fronteiras entre consecutivos. O litoral irregular
(fractal, penínsulas e baías) continua.
Resultado da rodada 3: zero muralhas (nenhum par não consecutivo se toca),
todos os consecutivos com fronteira; corredor mínimo garantido ao longo da
espinha (`v = max(v, 9 + ruído − d)`), borda do canal de rocha com ruído (sem
retas), gargalos com meia-largura mínima de 14 mm. Larguras por reino na tabela
`R` (4ª coluna) e gargalos em `GARGALO`. Ainda só em prévia; próximo passo:
o .ps1 que aplica `infernal-continente.json` no mapa-infernal.cdr.
Rodada 4 (23/11/2026) — pedido: "O reino 9 ficou ruim, faça os reinos mais
cumpridos." Cada reino serpenteia no próprio trecho (`SERPENTE`, amplitude por
reino; some nas fronteiras), larguras ~25% menores (formas alongadas), Udoviom
com meia-largura 30 e sem penínsulas sobre ele. Ainda só em prévia.
Rodada 5 (23/11/2026) — pedido: "Aproveite melhor os espaços da tela, fazendo
curvas melhores." O traçado virou uma ESPIRAL QUE DESCE: volta de fora pelas
bordas (1–4 em cima, Ekisis no canto, Heldrom à direita, 7–9 embaixo,
Anasmadis no canto, Branaxis subindo à esquerda), Fulvina entra e Morrigalti
fica no centro, como o fundo do inferno. Larguras maiores e serpenteio maior.
Ainda só em prévia.

**PAUSA em 23/11/2026 (créditos acabaram).** Para retomar: 1) `node
scripts/mapa/infernal-continente.mjs` regera JSON e prévias em ~2 s; 2) mostrar a
prévia ao usuário (`tagmar/infernal-continente-previa.png`; a versão com
números dos reinos é `infernal-continente-rotulos.svg`); 3) se aprovada,
escrever o .ps1 de aplicação no `tagmar/mapa-infernal.cdr` (já existe, vazio, só
a rocha) a partir do `infernal-fronteiras-corel.ps1` (trava por nome de
arquivo; usar `litoral` combinado em vez de reinos e borda; contorno escuro
atrás do preenchimento). Ideia pendente: estreitar os canais de rocha dentro da
espiral para ocupar mais a página. Os geradores antigos (infernal-fronteiras.mjs
= faixa, infernal-camaras.mjs = contas) ficam só como histórico.

**Retomado em 23/11/2026 (tarde): espiral APLICADA no mapa-infernal.cdr.** O usuário
escolheu aplicar a forma como está (sem estreitar os canais). Script:
`scripts/mapa/infernal-continente-corel.ps1` (BOM, trava pelo nome do arquivo, NÃO
salva sozinho). Recria Fendas (Fundo), Continente (Reinos: um chão só, contorno de
3 mm atrás do preenchimento = parede escura), Desertos, Florestas secas, Rios (lago),
Pântanos (lodo), Relevo, Vulcões, Lava (3 rios), Vapores e Fronteiras. Contagem
depois: Fundo=2, Reinos=1, Desertos=4, Pântanos=1, Florestas secas=2, Relevo=9,
Vulcões=3, Lava=3, Rios=1, Vapores=1, Fronteiras=1. Falta o usuário conferir no
Corel e salvar à mão.

**Bloco 8 — levar ao app: FEITO em 23/11/2026.** Escala real (escolha do usuário):
mesma régua de km do material, 1/4 da área, no meio da tela; fora dele só rocha,
com as fendas repetidas em ladrilho. `node scripts/mapa/infernal-continente.mjs &&
node scripts/mapa/infernal-app.mjs` gera `public/mapa/infernal.svg` (~470 KB) e
imprime o recorte, que vai em `MAPA_RECORTE.infernal` (13-diario/mapa.jsx). O plano
infernal abre enquadrado no recorte e o botão "mapa inteiro" volta para ele. Nomes de
reinos, cidades e estradas entram pelo app (ferramentas Nomes/Cidade/Caminho do
Imperador, camada `mundo-infernal`), como no material — é o bloco 6.

## Bloco 11 — relevo e lava no nível do mapa material (23/11/2026)

Usuário, depois de ver no app: "Não! O desenho não está finalizado. Há MUITOS ajustes para
fazer. As montanhas não parecem montanhas, os rios de lavas não parecem rios. Eu não vou
aceitar menos detalhes do que fizemos no plano material." (O chão no app fica parado até o
desenho ser aprovado.)

Estudo do material (`public/mapa/tagmar.svg`): o relevo é sombreado de um campo de altura em
7 faixas (3 sombras #52645B/#3F4F47 a 12–20%, luz branca 40%, 3 camadas de "neve" 65–90%),
~1000 subcaminhos por faixa; os rios são 8 classes de largura (0,4 a 2,4) com ~1500 trechos,
afluentes que se juntam, e um vale claro em volta.

Novo módulo `scripts/mapa/infernal-relevo.mjs`, chamado pelo gerador:
- grade fina de 0,625 mm; campo de altura = chão quase plano + cordilheiras (polilinha, meia-
  largura e altura; cristas por ridged multifractal em coordenadas do MUNDO com domínio torcido —
  a versão em coordenadas da serra fazia listras retas) + cones dos 3 vulcões com sulcos e boca
  + mesa de Mocna + anel da cratera de Seinoniz + dunas de Ekisis + leve subida junto à rocha;
- sombreado com luz do noroeste, recortado em sombra1–3, luz, cume1–3 (cinza vulcânico);
- lava: Dijkstra a partir do lago de lava de Simaricane (subir custa caro), 60 nascentes (bocas
  dos vulcões e encostas DENTRO do anel), caminhos que se juntam, largura por fluxo em 8 classes;
  desenho = vale incandescente 16% + corpo + núcleo quente nos braços grossos; lago com crosta.
Prévias: tagmar/infernal-continente-previa.png, infernal-previa-morrigalti.png,
infernal-previa-udoviom.png. Lagos e lodo vão por cima do relevo.
Pendente: o .ps1 do Corel e o infernal-app.mjs ainda esperam o JSON antigo (montanhas/vulcoes/
rios) — atualizar quando o desenho for aprovado.

Rodada 2 do bloco 11 (23/11/2026). Pedidos: tirar os "pêlos" (eram os vapores) e o efeito da
rocha (fendas) — feitos; Mocna, Fulvina, Vouxiz e Udoviom em faixas como Ekisis (bioma(): campo
"miolo" do reino + elipse + ruído, três níveis; Vouxiz com o lago em dois tons); sem texto no
.cdr (nunca teve — os números eram só da prévia; prévias agora sem rótulos).
Rodada 3: sem a borda preta do litoral; lava com 12 larguras (0,3 → 4,3 mm), meandros que crescem
com o rio (pontas presas nas junções), crosta escura + lava + núcleo quente, brilho em dois
níveis, pontas finas apagadas, lago com miolo quente e crosta; floresta de árvores secas em Mocna
(faixas cinza-acastanhadas em volta do planalto, que encolheu, e troncos secos de 2–3 galhos).
Prévias: tagmar/infernal-previa-inteiro-2.png, -mocna.png, -morrigalti.png.

**Virada de 23/11/2026 — paleta do Google Maps.** Usuário: "Não ficou bom, remova. A principal
característica do nosso mapa é ser parecido com o Google Maps. Use as cores do google maps, veja o
deserto do saara para definir a cor de uma área árida. A floresta não é representada com pequenas
árvores. Vamos seguir o mesmo padrão já feito no mapa do plano material."
Feito: troncos secos removidos (a floresta seca é só a mancha); cores = as do material
(`COR` no gerador): rocha #C3C6C0 no lugar do mar, terra árida #F2E6C6, Saara #E6CF9C em três
opacidades (.38/.50/.65), floresta #BEF1D4/#B6EFCD/#99E4C1, lodo verde-acinzentado, água
#9EDFEF/#83D6EA, relevo #52645B/#3F4F47 translúcido + luz branca + cumes #DCE4D4/#E9EAE2/#FFF,
fronteira #8C9196 tracejada 0,28 mm, textura de planície como o grupo "planicies". Lava na régua
dos rios do material (0,1 → 0,56 mm), cor chapada #F0663A com vale #F7B79A; lago chapado.
Prévias: tagmar/infernal-previa-google.png e -google-morrigalti.png.
Rodada seguinte (23/11/2026): rocha de fora voltou ao marrom-escuro #3E342E ("não quero o cinza");
lago de Vouxiz num tom só (#83D6EA, "não temos lagos com dois tons de azul"); Mocna virou VALE
PROFUNDO ("é um vale profundo, não uma colina"): o chão afunda pela distância à borda do reino
(rocha OU reino vizinho — senão vira degrau na fronteira), paredes com ravinas (ridged multifractal),
floresta seca no fundo e o árido nas bordas de cima. Prévias: infernal-previa-google-2.png e
infernal-previa-mocna-vale.png.
Modelo "montanhas em volta" (23/11/2026, usuário: "Faça um modelo onde o campo marrom representado
por paredes fosse montanhas"): `MODELO=montanhas node scripts/mapa/infernal-continente.mjs` gera
tagmar/infernal-modelo-montanhas.svg (não grava o JSON). A rocha vira maciço: altura sobe com a
distância à terra, cristas em duas escalas (espinhaço 34 mm + contrafortes 11 mm), base #D6D9D2
(áreas de montanha do material). Prévias: infernal-modelo-montanhas.png e -perto.png. Correções que
valem para os dois: fronteira só sobre terra; curvas de nível abertas são descartadas (o Z fechava
com um traço reto atravessando o mapa).
"Borda no terreno" (23/11/2026): a luz mudava de golpe em cada encosta e as faixas viravam
contornos finos. Corrigido para os dois modelos: luz suavizada (blur 4 ≈ 2,5 mm), faixas mais
espaçadas (−0,04/−0,16/−0,32; luz +0,1), cumes em placas (altura + ruído; 0,38/0,47/0,53), sem a
subida junto ao litoral e rampa do maciço irregular. Prévias: infernal-modelo-montanhas-2.png,
-perto-2.png e infernal-previa-google-3.png.
Rodada 23/11 (tarde) — "Alguns reinos ficaram sem as montanhas ao redor. O efeito das montanhas ainda
não ficou como no plano material. Adicione os efeitos no terreno ao redor do rio e lago de lava."
- Margem: a terra nunca chega a menos de 16 mm da borda da página (sobra maciço em volta de todos);
  o maciço começa logo no litoral (rampa de ~4 mm, borda irregular).
- Crista nova `crista()`: três direções FIXAS misturadas por pesos que variam devagar (girar as
  coordenadas fazia redemoinhos "impressão digital"), ridged esticado 15×4,6 mm + 5,5×2,2 mm,
  recortado por ruído de quebra; vale para as serras e para o maciço. ATENÇÃO: o fbm do gerador vai
  de −1 a 1 (a primeira versão deu NaN por supor 0..1).
- Maciço com estrutura: cordilheiras mais altas e terras mais baixas (massa por fbm de 55 mm).
- Lava: chão queimado por distância à lava — crestado (#8A6A55 .35, ~2,4 mm), halo de cinza
  (#B9A68E .35, ~5,5 mm) e basalto (#6F625A .30) perto das bocas; bordas manchadas.
Prévias: infernal-modelo-montanhas-3.png, -perto-3.png, infernal-modelo-lava-perto.png.
Rodada 23/11 (noite) — "Ainda há reinos sem montanhas em volta. As montanhas estão fora do nosso
padrão. Estão com um fundo cinza e com o relevo diferente." Causas e correções:
- As prévias cortavam 100 px à direita (janela 1400, SVG 1500) — Ekisis e Heldrom pareciam sem
  maciço. Captura corrigida (1500×1193).
- Fundo: no material a montanha é relevo sobre a cor da terra; o modelo usa COR.terra (sem cinza).
- Relevo: cristas maiores (22×7 mm), menos grão (detalhe 9×3,4 mm, quebra 16 mm), maciço mais baixo
  (cume só nas cristas altas). Comparação na mesma escala: material-montanhas-perto.png ×
  infernal-modelo-montanhas-perto-4.png.
Caminho 1 (reaproveitar as montanhas do material) — tentativa de 23/11/2026, `MODELO=material`,
scripts/mapa/infernal-relevo-material.mjs: lê as 7 camadas do grupo "relevo" de public/mapa/tagmar.svg
(só m/l/z relativos), escolhe janelas densas e carimba em células Voronoi (divisas onduladas, giro
alinhado aos canais de rocha por PCA × gradiente da distância à terra). Resultado: colcha de retalhos
— o relevo do material são FAIXAS de serra com planícies entre elas (e o maciço do sudeste tem um
campo de neve que é do grupo "base", não do relevo), então qualquer recorte traz buracos e emendas.
Prévia: infernal-modelo-material-carimbos.png. Aguardando decisão do usuário.

**Decisão do usuário (23/11/2026): ELE desenha as montanhas à mão** no mapa-infernal.cdr ("Nenhum
modelo que você faz me atende… O que separa um caminho de outro é justamente as montanhas. A
referência é o arquivo do mapa do Plano Material. Eu vou fazer o desenho."). Base aplicada por
`scripts/mapa/infernal-camadas-corel.ps1` (lê infernal-continente.json; ~29 min, quase tudo no
relevo; não salva): camadas de cima para baixo Fronteiras, Lava (12 vales + 12 lavas + lago de
Simaricane + bocas), Rios (lago de Vouxiz), Relevo (7 faixas, só dentro dos reinos), Textura,
Terreno queimado, Pântanos, Florestas, Desertos, Reinos (continente #F2E6C6), **Montanhas (vazia,
para o desenho dele)**, Fundo (rocha #3E342E). O Corel de avaliação recusa também Import por script
("Tipos incompatíveis"), além de Save/Export. Os modelos MODELO=montanhas/material ficam só como
histórico.
Montanhas de fora (23/11/2026, noite): o usuário pediu o mesmo padrão das de dentro e fundo cinza
(#D6D9D2); depois: "não estão parecidas com as de dentro, veja os vulcões como são muito melhores. As
montanhas parecem uma planície no alto, não há alturas definidas". Refeito como os vulcões: picos
individuais (grade 24 mm com jitter, raio 18–38 mm, mais altos longe dos reinos), cone com cume,
contrafortes radiais afiados, união pelo máximo (cada pico mantém o cume) + picos menores nos vãos.
A aplicação no Corel (scripts/mapa/infernal-montanhas-corel.ps1, lê tagmar/infernal-montanhas.json)
foi INTERROMPIDA no meio (versão antiga) — a camada Relevo pode estar incompleta; rodar de novo
depois da aprovação. Prévias: infernal-montanhas-picos.png e -perto.png.
Rodada seguinte: "as montanhas externas possuem um limite muito claro onde elas começam, ao invés de
mostrar como o relevo cresce e diminui. Eu já pedi umas 5x." — o limite vinha do fundo cinza chapado e
da rampa de 4 mm. Agora: base na cor da terra (o cinza só nos cumes, pelas faixas cume1–3, como dentro),
o relevo cresce ao longo de ~30 mm da beira (colinas no pé, picos menores perto). Prévias:
infernal-montanhas-gradual.png e -perto.png.

### Rodada 23/11 — traçado sob as montanhas e cumes variados
- Pedido: "O traçado deve mostrar a divisão dos reinos sob as montanhas. A área branca sob as montanhas precisa ter padrões diferentes entre si."
- Fronteiras (MODELO=montanhas): tiradas do rótulo L em todas as células, terra e rocha, até a beira da página (infernal-continente.mjs).
- Picos (infernal-relevo.mjs, `novoPico`): cada um sorteia o tipo (cone 30%, crista alongada 38%, maciço de 2–4 cumes 20%, mesa 12%), o rumo, o alongamento, o número e a fundura dos contrafortes, o perfil da encosta e um desvio de neve próprio (`neveFora`, ±0,11 no limiar dos cumes).
- Prévias: tagmar/infernal-montanhas-variadas.png e -perto.png.

### Rodada 23/11 — contraste nas montanhas e rios secos
- Pedido: "uma cor mais escura dando contraste nas montanhas (internas e externas), rotas de rios secos no terreno."
- Sombras mais fortes: sombra1 #52645B .16, sombra2 #4A5A51 .22, sombra3 #3F4F47 .28 e uma quarta, sombra4 #2E3A34 .30 (−luz − 0,5).
- Rios secos (`riosSecos` em infernal-relevo.mjs): inundação por prioridade a partir da beira e da lava, acumulação de área, leito a partir de 120 mm², 6 classes (0,12–0,52 mm), cor #B39A74 a .75. Terminam na lava, no lago de Vouxiz e na beira.
- Corel: infernal-montanhas-corel.ps1 passa a criar sombra 4 e os "rio seco N" na camada Rios.
- Prévias: tagmar/infernal-rios-secos.png e -perto.png.

### Rodada 23/11 — menos rios secos e muralha entre reinos
- Pedido: "diminuir a quantidade de rios secos" e "nas partes onde há montanhas externas (entre os reinos) faça-as maiores para impedir os jogadores de tentar atravessá-las".
- Rios secos: leito nasce a partir de 500 mm² (antes 120), classes [500, 1100, 2400, 5000, 10000, 20000]: ~1600 → ~450 trechos.
- Muralha (infernal-relevo.mjs): a distância à terra propaga também o reino mais próximo (`LT`); o eixo do canal é onde ele muda (até 60 mm da terra); `ent` (1 no eixo → 0 a 22 mm) aumenta raio e altura dos picos da grade, encurta a rampa do litoral (30 → 14 mm) e uma fileira de picos grandes (raio 20–40, a cada ~20 mm) corre sobre o eixo. Altura contida (0,75–1,0) para não virar planalto branco.
- Prévias: tagmar/infernal-muralhas.png e -perto.png. Ainda não aplicado no Corel (infernal-montanhas-corel.ps1, ~30 min).
- Rodada seguinte ("Ainda tem muitos rios secos. Os reinos 8 e 9 parecem conseguir ir para o reino 13"): leito a partir de 1500 mm² (classes [1500, 3000, 6000, 12000, 25000, 50000]) → ~150 trechos. Medição: o canal de rocha 9|13 tem só ~26 mm e o 8|13 ~42 mm, e a rampa do litoral deixava um corredor baixo. Agora o eixo dos canais entre reinos NÃO consecutivos (`dN`) leva uma crista contínua: piso de altura 0,62–0,84 até 26 mm do eixo, subindo em ~5 mm da beira, e picos da muralha a partir de 3 mm da terra. Entre consecutivos fica a passagem. Prévia de perto: tagmar/infernal-8-9-13.png.
- APLICADO no mapa-infernal.cdr em 23/11/2026 (infernal-montanhas-corel.ps1, ~1h45; não salvo). Depois: Relevo=8 (sombra 1–4, luz, cume 1–3), Rios=7 (lago + 6 classes de rio seco); as outras camadas iguais à leitura de antes. Falta o usuário conferir e salvar à mão.
