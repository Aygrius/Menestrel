# CORTA A PINTURA DO MAPA EM LADRILHOS (15/11/2026)
#
# Uso (na raiz do projeto):
#   powershell -ExecutionPolicy Bypass -File scripts/mapa/cortar.ps1
#   node scripts/mapa/subir.mjs
#
# Le tagmar/mapa_oriental.png e escreve preview/mapa/ladrilhos/<nivel>/<x>_<y>.png
# mais mapa.json. Nivel 0 = os pixels do arquivo, sem perda; cada nivel acima e
# a metade do anterior. Cada ladrilho tem 512 px e leva 2 px REAIS do vizinho em
# cada lado (13-diario/mapa.jsx conta com isso: MAPA_LADO e MAPA_SOBRA).
#
# TROCAR A PINTURA: salve a nova por cima de tagmar/mapa_oriental.png, COM O
# MESMO TAMANHO (10050 x 16750), e rode os dois comandos acima. O que o Mestre
# desenhou esta em unidades do mapa, nao em pixels: nada sai do lugar.
#
# Cuidado de PowerShell: nomes de variavel nao distinguem maiuscula de
# minuscula. Um "T" (lado) e um "t" (ladrilho) eram a mesma variavel, e o
# primeiro corte saiu com 660 ladrilhos iguais.
param(
  [string]$origem = "tagmar\mapa_oriental.png",
  [string]$saida = "preview\mapa\ladrilhos"
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$origem = (Resolve-Path $origem).Path
if (Test-Path $saida) { Remove-Item -Recurse -Force $saida }
New-Item -ItemType Directory -Force $saida | Out-Null
$saida = (Resolve-Path $saida).Path

$lado = 512
$sobra = 2
$png = [System.Drawing.Imaging.ImageFormat]::Png
$f24 = [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
$px = [System.Drawing.GraphicsUnit]::Pixel

function Copia($de, $w, $h, $suave) {
  $n = New-Object System.Drawing.Bitmap($w, $h, $f24)
  $g = [System.Drawing.Graphics]::FromImage($n)
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $alvo = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  if ($suave) {
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $at = New-Object System.Drawing.Imaging.ImageAttributes
    $at.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    $g.DrawImage($de, $alvo, 0, 0, $de.Width, $de.Height, $px, $at)
    $at.Dispose()
  } else {
    # copia exata, pixel por pixel
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.DrawImage($de, $alvo, 0, 0, $de.Width, $de.Height, $px)
  }
  $g.Dispose()
  return ,$n
}

$arq = New-Object System.Drawing.Bitmap($origem)
$arq.SetResolution(96, 96)
# decodifica uma vez para a memoria; dai em diante os recortes sao rapidos
$cur = Copia $arq $arq.Width $arq.Height $false
$arq.Dispose()
Write-Output "pintura: $($cur.Width) x $($cur.Height)"
$niveis = @()
for ($z = 0; $z -le 3; $z++) {
  if ($z -gt 0) {
    $w = [int][math]::Ceiling($cur.Width / 2); $h = [int][math]::Ceiling($cur.Height / 2)
    $menor = Copia $cur $w $h $true
    $cur.Dispose(); $cur = $menor
  }
  $dir = Join-Path $saida $z
  New-Item -ItemType Directory -Force $dir | Out-Null
  $cols = [int][math]::Ceiling($cur.Width / $lado); $rows = [int][math]::Ceiling($cur.Height / $lado)
  for ($y = 0; $y -lt $rows; $y++) {
    for ($x = 0; $x -lt $cols; $x++) {
      $x0 = [math]::Max(0, $x * $lado - $sobra); $y0 = [math]::Max(0, $y * $lado - $sobra)
      $tw = [math]::Min($cur.Width, ($x + 1) * $lado + $sobra) - $x0
      $th = [math]::Min($cur.Height, ($y + 1) * $lado + $sobra) - $y0
      $peca = $cur.Clone((New-Object System.Drawing.Rectangle($x0, $y0, $tw, $th)), $f24)
      $peca.Save((Join-Path $dir "$($x)_$($y).png"), $png)
      $peca.Dispose()
    }
  }
  $niveis += "{`"z`":$z,`"w`":$($cur.Width),`"h`":$($cur.Height),`"cols`":$cols,`"rows`":$rows}"
  Write-Output "nivel $z ok: $($cur.Width) x $($cur.Height), $cols x $rows ladrilhos"
}
$cur.Dispose()
# versao vazia = ladrilhos locais (a previa); o envio grava a versao de verdade
Set-Content -Path (Join-Path $saida "mapa.json") -Value ("{`"versao`":`"`",`"niveis`":[" + ($niveis -join ",") + "]}") -Encoding ascii
Write-Output "fim: $saida"
