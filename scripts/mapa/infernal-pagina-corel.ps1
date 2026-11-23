$ErrorActionPreference = 'Stop'
# Cria o arquivo próprio tagmar/mapa-infernal.cdr (750 × 596,3 mm) com as camadas vazias.
# NUNCA no mapa.cdr: mexer em camadas de outra página dele estragou a página 1 (22–23/11/2026).
$app = New-Object -ComObject CorelDRAW.Application
$alvo = Join-Path $PSScriptRoot '....	agmarmapa-infernal.cdr' | Resolve-Path -ErrorAction SilentlyContinue
if ($alvo) { throw 'tagmar/mapa-infernal.cdr já existe; nada feito.' }
$d = $app.CreateDocument(); $d.Unit = 3
$pg = $d.Pages.Item(1); $pg.SizeWidth = 750; $pg.SizeHeight = 596.3; $pg.Name = 'Plano Infernal'; $pg.Activate()
foreach ($l in @($pg.Layers)) { if (-not $l.IsSpecialLayer -and $l.Shapes.Count -eq 0) { $l.Delete() } }
$fundo = $pg.CreateLayer('Fundo')
foreach ($n in 'Reinos','Desertos','Pântanos','Florestas secas','Relevo','Vulcões','Lava','Rios','Vapores','Estradas','Cidades','Nomes','Fronteiras') { $pg.CreateLayer($n) | Out-Null }
$r = $fundo.CreateRectangle2(0, 0, 750, 596.3); $r.Fill.UniformColor.RGBAssign(62, 52, 46); $r.Outline.SetNoOutline(); $r.Name = 'Rocha'
"página criada: " + (($pg.Layers | % { $_.Name }) -join ', ')
# O Corel 2018 (avaliação) recusa SaveAs/Export vindos de script ("tipos incompatíveis" no PowerShell e no VBScript).
# Salvar à mão: Arquivo > Salvar como > tagmar/mapa-infernal.cdr. Depois rodar infernal-fronteiras-corel.ps1.
