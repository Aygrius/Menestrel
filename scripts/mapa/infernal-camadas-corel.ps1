$ErrorActionPreference = 'Stop'
# A BASE DO PLANO INFERNAL NO COREL (23/11/2026). O usuário desenha as montanhas à mão ("Eu vou fazer o
# desenho"); este script põe todo o resto no tagmar/mapa-infernal.cdr aberto, cada coisa na sua camada,
# a partir de tagmar/infernal-continente.json (node scripts/mapa/infernal-continente.mjs), nas cores do
# Google Maps/mapa material. Cria a camada vazia "Montanhas" para o desenho dele.
# NÃO salva (o Corel 2018 de avaliação recusa Save/Import/Export por script): conferir e salvar à mão.
$J = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '..\..\tagmar\infernal-continente.json') | ConvertFrom-Json
$app = New-Object -ComObject CorelDRAW.Application
$d = $app.ActiveDocument; $d.Unit = 3
if ($d.FullFileName -notlike '*mapa-infernal.cdr') { throw "Documento ativo não é o mapa-infernal.cdr: $($d.FullFileName)" }
$pg = $d.Pages.Item(1); $pg.Activate()
$t0 = Get-Date
function Ly($nome) { $l = $pg.Layers | Where-Object { $_.Name -eq $nome } | Select-Object -First 1; if (-not $l) { $l = $pg.CreateLayer($nome) }; $l.Editable = $true; $l.Visible = $true; return $l }
function Limpar($layer) { foreach ($s in @($layer.Shapes)) { $s.Delete() } }
function Nova-Multi($layer, $listas, $fechada = $true) {
  $c = $d.CreateCurve()
  foreach ($pts in $listas) { if ($pts.Count -lt 2) { continue }
    $sp = $c.CreateSubPath([double]$pts[0][0], [double]$pts[0][1])
    for ($i = 1; $i -lt $pts.Count; $i++) { $sp.AppendLineSegment([double]$pts[$i][0], [double]$pts[$i][1]) | Out-Null }
    if ($fechada) { $sp.Closed = $true } }
  return $layer.CreateCurve($c)
}
# cor "#RRGGBB" e opacidade (0–1) → preenchimento chapado com transparência uniforme
function Mancha($layer, $listas, $nome, $hex, $opac = 1) {
  if (-not $listas -or $listas.Count -eq 0) { return }
  $s = Nova-Multi $layer $listas; $s.Name = $nome; $s.Outline.SetNoOutline()
  $s.Fill.UniformColor.RGBAssign([Convert]::ToInt32($hex.Substring(1, 2), 16), [Convert]::ToInt32($hex.Substring(3, 2), 16), [Convert]::ToInt32($hex.Substring(5, 2), 16))
  if ($opac -lt 1) { $s.Transparency.ApplyUniformTransparency([int][math]::Round((1 - $opac) * 100)) | Out-Null }
}
function Traco($layer, $listas, $nome, $hex, $larg, $opac = 1) {
  if (-not $listas -or $listas.Count -eq 0) { return }
  $s = Nova-Multi $layer $listas $false; $s.Name = $nome; $s.Fill.ApplyNoFill(); $s.Outline.Width = $larg
  $s.Outline.Color.RGBAssign([Convert]::ToInt32($hex.Substring(1, 2), 16), [Convert]::ToInt32($hex.Substring(3, 2), 16), [Convert]::ToInt32($hex.Substring(5, 2), 16))
  try { $s.Outline.LineCaps = 1; $s.Outline.LineJoin = 1 } catch {}
  if ($opac -lt 1) { $s.Transparency.ApplyUniformTransparency([int][math]::Round((1 - $opac) * 100)) | Out-Null }
  return $s
}
function Passo($msg) { "{0,5:N0}s  {1}" -f ((Get-Date) - $t0).TotalSeconds, $msg }
"antes: " + (($pg.Layers | % { "$($_.Name)=$($_.Shapes.Count)" }) -join ', ')

# Fundo: só a rocha marrom (as fendas saíram)
$fundo = Ly 'Fundo'; foreach ($s in @($fundo.Shapes)) { if ($s.Name -ne 'Rocha') { $s.Delete() } }
foreach ($s in @($fundo.Shapes)) { $s.Fill.UniformColor.RGBAssign(62, 52, 46) }
# camadas antigas que não existem mais no desenho
foreach ($n in 'Vapores', 'Vulcões', 'Florestas secas') { $l = $pg.Layers | Where-Object { $_.Name -eq $n } | Select-Object -First 1; if ($l) { Limpar $l; $l.Delete() } }

$L = Ly 'Reinos'; Limpar $L; Mancha $L $J.litoral 'Continente' '#F2E6C6'; Passo 'reinos'
$L = Ly 'Desertos'; Limpar $L
$i = 0; foreach ($k in 'borda', 'meio', 'centro') { Mancha $L @(,$J.deserto.$k) "Ekisis $($i + 1)" '#E6CF9C' (@(0.38, 0.5, 0.65)[$i]); $i++ }
for ($n = 0; $n -lt 3; $n++) { Mancha $L $J.biomas.mocna[$n] "Mocna $($n + 1)" '#E6CF9C' (@(0.38, 0.5, 0.65)[$n]) }
Passo 'desertos'
$L = Ly 'Florestas'; Limpar $L; $FL = @('#BEF1D4', '#B6EFCD', '#99E4C1')
for ($n = 0; $n -lt 3; $n++) { Mancha $L $J.biomas.fulvina[$n] "Fulvina $($n + 1)" $FL[$n]; Mancha $L $J.biomas.vouxiz[$n] "Vouxiz $($n + 1)" $FL[$n]; Mancha $L $J.florestaSeca[$n] "Mocna (floresta seca) $($n + 1)" $FL[$n] }
Passo 'florestas'
$L = Ly 'Pântanos'; Limpar $L; $LD = @('#D3E6D2', '#C2DCC6', '#AED0B6')
for ($n = 0; $n -lt 3; $n++) { Mancha $L $J.biomas.udoviom[$n] "Udoviom $($n + 1)" $LD[$n] }
Passo 'pântanos'
$L = Ly 'Terreno queimado'; Limpar $L
Mancha $L $J.queimado.cinza 'cinza' '#B9A68E' 0.35; Mancha $L $J.queimado.basalto 'basalto' '#6F625A' 0.30; Mancha $L $J.queimado.crestado 'crestado' '#8A6A55' 0.35
Passo 'terreno queimado'
$L = Ly 'Textura'; Limpar $L
Mancha $L $J.textura.escura 'textura escura' '#52645B' 0.08; Mancha $L $J.textura.clara 'textura clara' '#EBE0BF' 0.35
Passo 'textura'
$L = Ly 'Relevo'; Limpar $L
Mancha $L $J.relevo.sombra1 'sombra 1' '#52645B' 0.12; Passo 'relevo: sombra 1'
Mancha $L $J.relevo.sombra2 'sombra 2' '#52645B' 0.16; Mancha $L $J.relevo.sombra3 'sombra 3' '#3F4F47' 0.20; Passo 'relevo: sombras'
Mancha $L $J.relevo.luz 'luz' '#FFFFFF' 0.40
Mancha $L $J.relevo.cume1 'cume 1' '#DCE4D4' 0.65; Mancha $L $J.relevo.cume2 'cume 2' '#E9EAE2' 0.75; Mancha $L $J.relevo.cume3 'cume 3' '#FFFFFF' 0.90
Passo 'relevo'
$L = Ly 'Rios'; Limpar $L; Mancha $L $J.lagoVouxiz[0] 'Lago de Vouxiz' '#83D6EA'
$L = Ly 'Lava'; Limpar $L
for ($c = 0; $c -lt $J.lava.Count; $c++) { Traco $L $J.lava[$c] "vale $($c + 1)" '#F7B79A' ([double]$J.larguras[$c] * 3 + 0.9) 0.45 | Out-Null }
for ($c = 0; $c -lt $J.lava.Count; $c++) { Traco $L $J.lava[$c] "lava $($c + 1)" '#F0663A' ([double]$J.larguras[$c]) | Out-Null }
Mancha $L $J.lagoLava 'Lago de Simaricane' '#F0663A'; Mancha $L $J.bocas 'bocas dos vulcões' '#F0663A'
Passo 'lava'
$L = Ly 'Fronteiras'; Limpar $L
$fr = Traco $L $J.fronteiras 'fronteiras' '#8C9196' 0.28; if ($fr) { try { $fr.Outline.Style = $d.OutlineStyles.Item(3) } catch {} }
Passo 'fronteiras'
# a camada do desenho do usuário: vazia, logo acima do Fundo (a terra dos reinos cobre o que passar)
$M = Ly 'Montanhas'
try { $M.MoveBelow((Ly 'Reinos')) } catch {}
# ordem de cima para baixo
$ordem = 'Fronteiras', 'Lava', 'Rios', 'Relevo', 'Textura', 'Terreno queimado', 'Pântanos', 'Florestas', 'Desertos', 'Reinos', 'Montanhas', 'Fundo'
for ($k = $ordem.Count - 2; $k -ge 0; $k--) { try { (Ly $ordem[$k]).MoveAbove((Ly $ordem[$k + 1])) } catch {} }
(Ly 'Fundo').Editable = $false
Passo 'pronto'
"depois: " + (($pg.Layers | % { "$($_.Name)=$($_.Shapes.Count)" }) -join ', ')
