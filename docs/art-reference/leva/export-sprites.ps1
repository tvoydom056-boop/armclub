param(
  [string]$SourceDirectory = 'docs/art-reference/leva/raw',
  [string]$AssetDirectory = 'public/art/opponents/leva',
  [string]$OverviewPath = 'docs/art-reference/leva/overview.png'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sizes = [ordered]@{}
foreach ($expression in @('calm','strain','telegraph','tired','lose','win','press')) {
  $sizes["head_$expression.png"] = @(600,700)
}
$sizes['torso_motion.png'] = @(1572,1001)
$sizes['arm_free.png'] = @(560,620)
$sizes['cuff.png'] = @(151,151)
$sizes['arms_motion.png'] = @(1670,941)
New-Item -ItemType Directory -Path $AssetDirectory -Force | Out-Null
function Draw-Contained($graphics, $image, [int]$x, [int]$y, [int]$width, [int]$height) {
  $factor = [Math]::Min($width / $image.Width, $height / $image.Height)
  $drawWidth = [int][Math]::Round($image.Width * $factor)
  $drawHeight = [int][Math]::Round($image.Height * $factor)
  $rectangle = [System.Drawing.Rectangle]::new($x + [int](($width-$drawWidth)/2), $y + [int](($height-$drawHeight)/2), $drawWidth, $drawHeight)
  $graphics.DrawImage($image, $rectangle)
}
foreach ($name in $sizes.Keys) {
  $sourcePath = (Resolve-Path -LiteralPath (Join-Path $SourceDirectory $name)).Path
  $destination = Join-Path (Resolve-Path -LiteralPath $AssetDirectory).Path $name
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
  $size = $sizes[$name]
  if ($source.Width -eq $size[0] -and $source.Height -eq $size[1]) {
    $source.Dispose()
    Copy-Item -LiteralPath $sourcePath -Destination $destination
    continue
  }
  $bitmap = [System.Drawing.Bitmap]::new($size[0],$size[1],[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
  $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $graphics.DrawImage($source,[System.Drawing.Rectangle]::new(0,0,$size[0],$size[1]),0,0,$source.Width,$source.Height,[System.Drawing.GraphicsUnit]::Pixel,$attributes)
  $graphics.Dispose(); $attributes.Dispose(); $source.Dispose()
  $bitmap.Save($destination,[System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}
# A separate contact sheet; exported transparent sprites are never flattened.
$sheet = [System.Drawing.Bitmap]::new(1680,1220)
$canvas = [System.Drawing.Graphics]::FromImage($sheet)
$canvas.Clear([System.Drawing.Color]::FromArgb(33,22,25))
$canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font = [System.Drawing.Font]::new('Segoe UI',16)
$titleFont = [System.Drawing.Font]::new('Segoe UI',24,[System.Drawing.FontStyle]::Bold)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(244,232,205))
$panel = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(58,40,45))
$canvas.DrawString('LEVA - FULL SPRITE SET',$titleFont,$ink,24,12)
$expressions = @('calm','strain','telegraph','tired','lose','win','press')
for ($index=0; $index -lt 7; $index++) {
  $x = $index * 240
  $canvas.FillRectangle($panel,$x+6,64,228,300)
  $image = [System.Drawing.Bitmap]::FromFile((Join-Path $AssetDirectory "head_$($expressions[$index]).png"))
  Draw-Contained $canvas $image ($x+10) 72 220 250
  $image.Dispose()
  $canvas.DrawString($expressions[$index],$font,$ink,$x+30,326)
}
$canvas.DrawString('9 arm positions - 3 x 3 atlas',$font,$ink,24,390)
$canvas.FillRectangle($panel,12,432,1144,750)
$image = [System.Drawing.Bitmap]::FromFile((Join-Path $AssetDirectory 'arms_motion.png'))
Draw-Contained $canvas $image 24 444 1120 720
$image.Dispose()
$parts = @('torso_motion.png','arm_free.png','cuff.png')
$positions = @(@(1180,420,470,300),@(1180,746,330,390),@(1500,950,150,170))
for ($index=0; $index -lt 3; $index++) {
  $position = $positions[$index]
  $image = [System.Drawing.Bitmap]::FromFile((Join-Path $AssetDirectory $parts[$index]))
  Draw-Contained $canvas $image $position[0] $position[1] $position[2] $position[3]
  $image.Dispose()
  $canvas.DrawString($parts[$index],$font,$ink,$position[0],$position[1]+$position[3]+5)
}
$canvas.Dispose(); $font.Dispose(); $titleFont.Dispose(); $ink.Dispose(); $panel.Dispose()
$sheet.Save((Join-Path (Get-Location).Path $OverviewPath),[System.Drawing.Imaging.ImageFormat]::Png)
$sheet.Dispose()
Write-Output 'Exported 11 transparent sprites and contact sheet.'
