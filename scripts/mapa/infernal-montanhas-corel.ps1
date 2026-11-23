$ErrorActionPreference = 'Stop'
# AS MONTANHAS EM VOLTA DOS REINOS (23/11/2026). Usuário: "a mesma representação de montanhas que você fez
# no arquivo corel no plano infernal será as montanhas onde está marrom" e "Adicione o fundo cinza nas
# montanhas". Lê tagmar/infernal-montanhas.json (MODELO=montanhas node scripts/mapa/infernal-continente.mjs):
# o Fundo vira a base cinza de montanha do material e a camada Relevo é refeita com o relevo inteiro
# (dentro e fora dos reinos). As outras camadas não mudam. NÃO salva: conferir e salvar à mão.
$J = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '..\..\tagmar\infernal-montanhas.json') | ConvertFrom-Json
$app = New-Object -ComObject CorelDRAW.Application
$d = $app.ActiveDocument; $d.Unit = 3
if ($d.FullFileName -notlike '*mapa-infernal.cdr') { throw "Documento ativo não é o mapa-infernal.cdr: $($d.FullFileName)" }
$pg = $d.Pages.Item(1); $pg.Activate(); $t0 = Get-Date
function Ly($nome) { $l = $pg.Layers | Where-Object { $_.Name -eq $nome } | Select-Object -First 1; if (-not $l) { throw "sem a camada $nome" }; $l.Editable = $true; return $l }
function Rgb($s, $hex) { $s.Fill.UniformColor.RGBAssign([Convert]::ToInt32($hex.Substring(1, 2), 16), [Convert]::ToInt32($hex.Substring(3, 2), 16), [Convert]::ToInt32($hex.Substring(5, 2), 16)) }
function Mancha($layer, $listas, $nome, $hex, $opac) {
  if (-not $listas -or $listas.Count -eq 0) { return }
  $c = $d.CreateCurve()
  foreach ($pts in $listas) { if ($pts.Count -lt 3) { continue }
    $sp = $c.CreateSubPath([double]$pts[0][0], [double]$pts[0][1])
    for ($i = 1; $i -lt $pts.Count; $i++) { $sp.AppendLineSegment([double]$pts[$i][0], [double]$pts[$i][1]) | Out-Null }
    $sp.Closed = $true }
  $s = $layer.CreateCurve($c); $s.Name = $nome; $s.Outline.SetNoOutline(); Rgb $s $hex
  $s.Transparency.ApplyUniformTransparency([int][math]::Round((1 - $opac) * 100)) | Out-Null
  "{0,6:N0}s  {1}" -f ((Get-Date) - $t0).TotalSeconds, $nome
}
function Linhas($layer, $listas, $nome, $hex, $opac, $larg) {
  if (-not $listas -or $listas.Count -eq 0) { return }
  $c = $d.CreateCurve()
  foreach ($pts in $listas) { if ($pts.Count -lt 2) { continue }
    $sp = $c.CreateSubPath([double]$pts[0][0], [double]$pts[0][1])
    for ($i = 1; $i -lt $pts.Count; $i++) { $sp.AppendLineSegment([double]$pts[$i][0], [double]$pts[$i][1]) | Out-Null } }
  $s = $layer.CreateCurve($c); $s.Name = $nome; $s.Fill.ApplyNoFill(); $s.Outline.Width = $larg
  $s.Outline.Color.RGBAssign([Convert]::ToInt32($hex.Substring(1, 2), 16), [Convert]::ToInt32($hex.Substring(3, 2), 16), [Convert]::ToInt32($hex.Substring(5, 2), 16))
  $s.Outline.LineCaps = 1; $s.Outline.LineJoin = 1
  $s.Transparency.ApplyUniformTransparency([int][math]::Round((1 - $opac) * 100)) | Out-Null
  "{0,6:N0}s  {1}" -f ((Get-Date) - $t0).TotalSeconds, $nome
}
"antes: " + (($pg.Layers | % { "$($_.Name)=$($_.Shapes.Count)" }) -join ', ')
$f = Ly 'Fundo'; foreach ($s in @($f.Shapes)) { Rgb $s $J.fundo; $s.Name = 'Montanhas (base)' }; $f.Editable = $false
$L = Ly 'Relevo'; foreach ($s in @($L.Shapes)) { $s.Delete() }
Mancha $L $J.relevo.sombra1 'sombra 1' '#52645B' 0.16
Mancha $L $J.relevo.sombra2 'sombra 2' '#4A5A51' 0.22
Mancha $L $J.relevo.sombra3 'sombra 3' '#3F4F47' 0.28
Mancha $L $J.relevo.sombra4 'sombra 4' '#2E3A34' 0.30
Mancha $L $J.relevo.luz 'luz' '#FFFFFF' 0.40
Mancha $L $J.relevo.cume1 'cume 1' '#DCE4D4' 0.65
Mancha $L $J.relevo.cume2 'cume 2' '#E9EAE2' 0.75
Mancha $L $J.relevo.cume3 'cume 3' '#FFFFFF' 0.90
# rios secos (usuário, 23/11: "rotas de rios secos no terreno"): traços na camada Rios, um por classe de largura
$R = Ly 'Rios'; foreach ($s in @($R.Shapes | Where-Object { $_.Name -like 'rio seco*' })) { $s.Delete() }
for ($k = 0; $k -lt $J.riosSecos.Count; $k++) { Linhas $R $J.riosSecos[$k] "rio seco $($k + 1)" '#B39A74' 0.75 ([double]$J.largurasSecos[$k]) }
"depois: " + (($pg.Layers | % { "$($_.Name)=$($_.Shapes.Count)" }) -join ', ')
