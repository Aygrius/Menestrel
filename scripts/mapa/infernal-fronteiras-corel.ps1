$ErrorActionPreference = 'Stop'
# Aplica tagmar/infernal-bloco2.json (gerado por infernal-fronteiras.mjs) na página "Plano Infernal" do mapa.cdr aberto.
# Recria: borda do abismo (Fundo), Reinos (com becos soldados), Lava, lago (Rios), lodo (Pântanos) e a estrada.
$J = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '..\..\tagmar\infernal-bloco2.json') | ConvertFrom-Json
$app = New-Object -ComObject CorelDRAW.Application
$d = $app.ActiveDocument; $d.Unit = 3
# trava: só trabalha no arquivo próprio do plano infernal (mexer em camadas de outra página do mapa.cdr estragou a página 1 em 22–23/11/2026)
if ($d.FullFileName -notlike '*mapa-infernal.cdr') { throw "Documento ativo não é o mapa-infernal.cdr: $($d.FullFileName)" }
$pg = $d.Pages.Item(1); $pg.Activate()
$Ly = @{}; foreach ($l in $pg.Layers) { $Ly[$l.Name] = $l; $l.Editable = $true }
function Nova-Curva($layer, $pts, $fechada = $true) {
  $c = $d.CreateCurve(); $sp = $c.CreateSubPath([double]$pts[0][0], [double]$pts[0][1])
  for ($i = 1; $i -lt $pts.Count; $i++) { $sp.AppendLineSegment([double]$pts[$i][0], [double]$pts[$i][1]) | Out-Null }
  if ($fechada) { $sp.Closed = $true }; return $layer.CreateCurve($c)
}
function Nova-Multi($layer, $listas, $fechada = $true) {
  $c = $d.CreateCurve()
  foreach ($pts in $listas) { $sp = $c.CreateSubPath([double]$pts[0][0], [double]$pts[0][1])
    for ($i = 1; $i -lt $pts.Count; $i++) { $sp.AppendLineSegment([double]$pts[$i][0], [double]$pts[$i][1]) | Out-Null }
    if ($fechada) { $sp.Closed = $true } }
  return $layer.CreateCurve($c)
}
function Limpar($layer, $nomes) { foreach ($s in @($layer.Shapes)) { if (-not $nomes -or $nomes -contains $s.Name) { $s.Delete() } } }

# borda do abismo + becos
# fora do caminho só há rocha (22/11/2026): o antigo "Vazio" vira "Rocha", com fendas
foreach ($s in @($Ly['Fundo'].Shapes)) { if ($s.Name -eq 'Vazio' -or $s.Name -eq 'Rocha') { $s.Name = 'Rocha'; $s.Fill.UniformColor.RGBAssign(62, 52, 46) } }
Limpar $Ly['Fundo'] @('Borda do abismo', 'Parede de rocha', 'Fendas')
if ($J.fendas.Count) {
  $f = Nova-Multi $Ly['Fundo'] $J.fendas $false; $f.Fill.ApplyNoFill(); $f.Outline.Width = 0.3; $f.Outline.Color.RGBAssign(42, 34, 30); $f.Name = 'Fendas'
}
$b = Nova-Curva $Ly['Fundo'] $J.borda
foreach ($x in $J.becos) { $e = Nova-Curva $Ly['Fundo'] $x.borda; $b = $b.Weld($e) }
$b.Fill.UniformColor.RGBAssign(30, 21, 18); $b.Outline.SetNoOutline(); $b.Name = 'Parede de rocha'

# reinos + becos
Limpar $Ly['Reinos']
$n = 0
foreach ($k in $J.reinos) {
  $s = Nova-Curva $Ly['Reinos'] $k.pts
  foreach ($x in $J.becos) { if ($x.reino -eq $n) { $e = Nova-Curva $Ly['Reinos'] $x.terra; $s = $s.Weld($e) } }
  $s.Fill.UniformColor.RGBAssign(156, 106, 85); $s.Outline.SetNoOutline()   # um chão só, como a página 1
  $n++; $s.Name = "Reino $n - $($k.nome)"
}

# lava: mares recortados pela borda, rios por cima
Limpar $Ly['Lava']
foreach ($m in $J.mares) {
  $s = Nova-Curva $Ly['Lava'] $m.pts
  $s = $b.Trim($s, $true, $false)
  $vz = $Ly['Fundo'].Shapes | Where-Object { $_.Name -eq 'Vazio' } | Select-Object -First 1
  $s = $vz.Intersect($s, $true, $false); $s.MoveToLayer($Ly['Lava'])
  $s.Fill.UniformColor.RGBAssign(200, 70, 26); $s.Outline.Width = 0.5; $s.Outline.Color.RGBAssign(255, 150, 50); $s.Name = $m.nome
}
foreach ($r in $J.rios) {
  $s = Nova-Curva $Ly['Lava'] $r.pts $false
  $s.Fill.ApplyNoFill(); $s.Outline.Width = 1.4; $s.Outline.Color.RGBAssign(240, 110, 30); $s.Name = $r.nome
}
# água e lodo
Limpar $Ly['Rios']
foreach ($m in $J.lagos) { $s = Nova-Curva $Ly['Rios'] $m.pts; $s.Fill.UniformColor.RGBAssign(34, 52, 60); $s.Outline.Width = 0.3; $s.Outline.Color.RGBAssign(90, 122, 134); $s.Name = $m.nome }
Limpar $Ly['Pântanos']
$i = 1; foreach ($p in $J.lodo) { $s = Nova-Curva $Ly['Pântanos'] $p; $s.Fill.UniformColor.RGBAssign(52, 60, 32); $s.Outline.SetNoOutline(); $s.Name = "Lodo $i"; $i++ }
# como a página 1: sem textos e sem estradas no .cdr (nomes e caminhos moram no app)
Limpar $Ly['Nomes']
# fronteiras: linhas tracejadas, mesmo contorno da camada Fronteiras da página 1
if (-not $Ly['Fronteiras']) { $Ly['Fronteiras'] = $pg.CreateLayer('Fronteiras') }
Limpar $Ly['Fronteiras']
$fr = Nova-Multi $Ly['Fronteiras'] $J.fronteiras $false; $fr.Fill.ApplyNoFill(); $fr.Name = 'fronteiras'
$fr.Outline.Width = 0.28; $fr.Outline.Color.RGBAssign(58, 42, 36)   # mesma espessura da camada Fronteiras do mapa material
try { $fr.Outline.Style = $d.OutlineStyles.Item(3) } catch {}
Limpar $Ly['Estradas']
<#
$s = Nova-Curva $Ly['Estradas'] $J.estrada $false
$s.Fill.ApplyNoFill(); $s.Outline.Width = 1.1; $s.Outline.Color.RGBAssign(214, 150, 74); $s.Name = 'Estrada dos Condenados'
try { $s.Outline.Style = $d.OutlineStyles.Item(3) } catch {}
#>

# relevo: cada tipo vira uma curva só (Combine), como na página 1
function Grupo($layer, $lista, $nome, $r, $g, $b, $transp) {
  if (-not $lista -or $lista.Count -eq 0) { return }
  $s = Nova-Multi $layer $lista; $s.Fill.UniformColor.RGBAssign($r, $g, $b); $s.Outline.SetNoOutline(); $s.Name = $nome
  if ($transp) { $s.Transparency.ApplyUniformTransparency($transp) | Out-Null }
}
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

# bloco 5 — biomas (manchas em tons, como a camada Biomas da página 1)
Limpar $Ly['Desertos']
Grupo $Ly['Desertos'] @(,$J.deserto.borda) 'deserto-borda' 176 138 98 0
Grupo $Ly['Desertos'] @(,$J.deserto.meio) 'deserto-meio' 196 158 112 0
Grupo $Ly['Desertos'] @(,$J.deserto.centro) 'deserto' 212 176 128 0
$rach = Nova-Multi $Ly['Desertos'] $J.rachas $false; $rach.Fill.ApplyNoFill(); $rach.Outline.Width = 0.25; $rach.Outline.Color.RGBAssign(110, 74, 60); $rach.Name = 'solo-rachado'
Limpar $Ly['Florestas secas']
Grupo $Ly['Florestas secas'] $J.florestas 'florestas-secas' 110 84 64 0
Grupo $Ly['Florestas secas'] $J.florestasDensas 'florestas-densas' 78 58 46 0
Limpar $Ly['Vapores']
Grupo $Ly['Vapores'] $J.vapores 'vapores' 216 204 192 60

$Ly['Fundo'].Editable = $false
$d.Save()
"ok: " + (($pg.Layers | % { "$($_.Name)=$($_.Shapes.Count)" }) -join ', ')
