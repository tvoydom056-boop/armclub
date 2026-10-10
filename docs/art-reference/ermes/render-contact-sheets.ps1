param([string]$AssetDirectory = 'public/art/opponents/ermes', [string]$OutputDirectory = 'docs/art-reference/ermes')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$outPath = (Resolve-Path -LiteralPath $OutputDirectory).Path
function New-Preview($Width,$Height) {
  $bitmap = [System.Drawing.Bitmap]::new($Width,$Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#513631'))
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @($bitmap,$graphics)
}
$headKeys = @('calm','strain','telegraph','tired','lose','win','press')
$labels = @('Calm','Strain','Technique change','Tired','Lose','Win','Press')
$pair = New-Preview 1400 290
$bitmap = $pair[0]; $graphics = $pair[1]
$font = [System.Drawing.Font]::new('Segoe UI',12)
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#F5E6C8'))
for ($i=0;$i -lt $headKeys.Count;$i++) {
  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath (Join-Path $AssetDirectory ('head_'+$headKeys[$i]+'.png'))).Path)
  $graphics.DrawImage($source,[System.Drawing.Rectangle]::new($i*200+10,10,180,245))
  $graphics.DrawString($labels[$i],$font,$brush,[single]($i*200+10),[single]260)
  $source.Dispose()
}
$graphics.Dispose(); $bitmap.Save((Join-Path $outPath 'faces-preview.png'),[System.Drawing.Imaging.ImageFormat]::Png); $bitmap.Dispose()
$partKeys = @('torso_motion','arm_free','cuff','concept')
$pair = New-Preview 1400 340
$bitmap = $pair[0]; $graphics = $pair[1]
for ($i=0;$i -lt $partKeys.Count;$i++) {
  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath (Join-Path $AssetDirectory ($partKeys[$i]+'.png'))).Path)
  $scale = [Math]::Min(320.0/$source.Width,290.0/$source.Height)
  $w=[int]($source.Width*$scale);$h=[int]($source.Height*$scale)
  $graphics.DrawImage($source,[System.Drawing.Rectangle]::new($i*350+[int]((350-$w)/2),10,$w,$h))
  $graphics.DrawString($partKeys[$i],$font,$brush,[single]($i*350+15),[single]310)
  $source.Dispose()
}
$graphics.Dispose(); $bitmap.Save((Join-Path $outPath 'parts-preview.png'),[System.Drawing.Imaging.ImageFormat]::Png); $bitmap.Dispose()
$brush.Dispose();$font.Dispose()
Write-Output 'Saved faces-preview.png and parts-preview.png'

