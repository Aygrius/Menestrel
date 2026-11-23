$ErrorActionPreference = 'Stop'
# Aplica tagmar/infernal-continente.json (gerado por infernal-continente.mjs: a espiral que desce) no
# tagmar/mapa-infernal.cdr aberto no Corel. Recria todas as camadas desenhadas; a "Rocha" do Fundo fica.
# NÃO salva: conferir no Corel e salvar à mão (Ctrl+S).
$J = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '..\..\tagmar\infernal-continente.json') | ConvertFrom-Json
$app = New-Object -ComObject CorelDRAW.Application
$d = $app.ActiveDocument; $d.Unit = 3
# trava: só no arquivo próprio do plano infernal (mexer em camadas do mapa.cdr estragou a página 1 em 22–23/11/2026)
if ($d.FullFileName -notlike '*mapa-infernal.cdr') { throw "Documento ativo não é o mapa-infernal.cdr: $($d.FullFileName)" }
$pg = $d.Pages.Item(1); $pg.Activate()
$Ly = @{}; foreach ($l in $pg.Layers) { $Ly[$l.Name] = $l; $l.Editable = $true }
foreach ($n in 'Fundo','Reinos','Desertos','Pântanos','Florestas secas','Relevo','Vulcões','Lava','Rios','Vapores','Fronteiras') {
  if (-not $Ly[$n]) { $Ly[$n] = $pg.CreateLayer($n) }
}
"antes: " + (($pg.Layers | % { "$($_.Name)=$($_.Shapes.Count)" }) -join ', ')

function Nova-Multi($layer, $listas, $fechada = $true) {
  $c = $d.CreateCurve()
  foreach ($pts in $listas) { $sp = $c.CreateSubPath([double]$pts[0][0], [double]$pts[0][1])
    for ($i = 1; $i -lt $pts.Count; $i++) { $sp.AppendLineSegment([double]$pts[$i][0], [double]$pts[$i][1]) | Out-Null }
    if ($fechada) { $sp.Closed = $true } }
  return $layer.CreateCurve($c)
}
function Limpar($layer, $nomes) { foreach ($s in @($layer.Shapes)) { if (-not $nomes -or $nomes -contains $s.Name) { $s.Delete() } } }
# cada tipo vira uma curva só (Combine), como na página 1 do mapa material
function Grupo($layer, $lista, $nome, $r, $g, $b, $transp) {
  if (-not $lista -or $lista.Count -eq 0) { return }
  $s = Nova-Multi $layer $lista; $s.Fill.UniformColor.RGBAssign($r, $g, $b); $s.Outline.SetNoOutline(); $s.Name = $nome
  if ($transp) { $s.Transparency.ApplyUniformTransparency($transp) | Out-Null }
}

# Fundo: a rocha (fica) e as fendas
Limpar $Ly['Fundo'] @('Borda do abismo', 'Parede de rocha', 'Fendas')
$f = Nova-Multi $Ly['Fundo'] $J.fendas $false; $f.Fill.ApplyNoFill(); $f.Outline.Width = 0.5; $f.Outline.Color.RGBAssign(42, 34, 30); $f.Name = 'Fendas'

# Reinos: o continente, um chão só; a parede escura é o contorno atrás do preenchimento
Limpar $Ly['Reinos']
$t = Nova-Multi $Ly['Reinos'] $J.litoral; $t.Fill.UniformColor.RGBAssign(156, 106, 85)
$t.Outline.Width = 3; $t.Outline.Color.RGBAssign(30, 21, 18); $t.Outline.BehindFill = $true; $t.Name = 'Continente'

# biomas
Limpar $Ly['Desertos']
Grupo $Ly['Desertos'] @(,$J.deserto.borda) 'deserto-borda' 176 138 98 0
Grupo $Ly['Desertos'] @(,$J.deserto.meio) 'deserto-meio' 196 158 112 0
Grupo $Ly['Desertos'] @(,$J.deserto.centro) 'deserto' 212 176 128 0
$rach = Nova-Multi $Ly['Desertos'] $J.rachas $false; $rach.Fill.ApplyNoFill(); $rach.Outline.Width = 0.4; $rach.Outline.Color.RGBAssign(110, 74, 60); $rach.Name = 'solo-rachado'
Limpar $Ly['Florestas secas']
Grupo $Ly['Florestas secas'] $J.florestas 'florestas-secas' 110 84 64 0
Grupo $Ly['Florestas secas'] $J.florestasDensas 'florestas-densas' 78 58 46 0
Limpar $Ly['Rios']
foreach ($m in $J.lagos) { $s = Nova-Multi $Ly['Rios'] @(,$m.pts); $s.Fill.UniformColor.RGBAssign(34, 52, 60); $s.Outline.Width = 0.5; $s.Outline.Color.RGBAssign(90, 122, 134); $s.Name = $m.nome }
Limpar $Ly['Pântanos']
Grupo $Ly['Pântanos'] $J.lodo 'lodo' 52 60 32 0

# relevo
Limpar $Ly['Relevo']
Grupo $Ly['Relevo'] @(,$J.planalto.escarpa) 'planalto-escarpa' 60 36 24 30
Grupo $Ly['Relevo'] @(,$J.planalto.topo) 'planalto-topo' 180 136 90 0
Grupo $Ly['Relevo'] @(,$J.cratera.borda) 'cratera-borda' 110 98 90 0
Grupo $Ly['Relevo'] @(,$J.cratera.fundo) 'cratera-fundo' 42 34 32 0
Grupo $Ly['Relevo'] @(,$J.cratera.sombra) 'cratera-sombra' 18 12 11 50
Grupo $Ly['Relevo'] @($J.montanhas | % { ,$_.sombra }) 'sombra' 26 14 11 45
Grupo $Ly['Relevo'] @($J.montanhas | % { ,$_.base }) 'altitude-1' 96 66 58 0
Grupo $Ly['Relevo'] @($J.montanhas | % { ,$_.topo }) 'altitude-2' 140 100 78 0
Grupo $Ly['Relevo'] @($J.montanhas | % { ,$_.luz }) 'luz' 210 160 120 50
Limpar $Ly['Vulcões']
Grupo $Ly['Vulcões'] @($J.vulcoes | % { ,$_.sombra }) 'vulcões-sombra' 18 10 8 40
Grupo $Ly['Vulcões'] @($J.vulcoes | % { ,$_.cone }) 'vulcões-cone' 58 38 32 0
Grupo $Ly['Vulcões'] @($J.vulcoes | % { ,$_.boca }) 'vulcões-boca' 255 122 30 0

# lava: só os rios, dos vulcões até Simaricane
Limpar $Ly['Lava']
foreach ($r in $J.rios) { $s = Nova-Multi $Ly['Lava'] @(,$r.pts) $false; $s.Fill.ApplyNoFill(); $s.Outline.Width = 1.4; $s.Outline.Color.RGBAssign(240, 110, 30); $s.Name = $r.nome }

Limpar $Ly['Vapores']
Grupo $Ly['Vapores'] $J.vapores 'vapores' 216 204 192 60

# fronteiras: tracejadas, como a camada Fronteiras da página 1
Limpar $Ly['Fronteiras']
$fr = Nova-Multi $Ly['Fronteiras'] $J.fronteiras $false; $fr.Fill.ApplyNoFill(); $fr.Name = 'fronteiras'
$fr.Outline.Width = 0.45; $fr.Outline.Color.RGBAssign(58, 42, 36)
try { $fr.Outline.Style = $d.OutlineStyles.Item(3) } catch {}

$Ly['Fundo'].Editable = $false
"depois: " + (($pg.Layers | % { "$($_.Name)=$($_.Shapes.Count)" }) -join ', ')
