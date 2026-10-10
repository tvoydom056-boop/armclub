param([string]$AssetDirectory = 'public/art/opponents/venya')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sizes = @{
  'head_calm.png' = @(600,700); 'head_strain.png' = @(600,700)
  'head_telegraph.png' = @(600,700); 'head_tired.png' = @(600,700)
  'head_lose.png' = @(600,700); 'head_win.png' = @(600,700)
  'head_press.png' = @(600,700); 'torso_motion.png' = @(1572,1001)
  'arm_free.png' = @(560,620); 'cuff.png' = @(151,151)
  'arms_motion.png' = @(1670,941)
}
foreach ($name in $sizes.Keys) {
  $assetPath = Join-Path $AssetDirectory $name
  if (!(Test-Path -LiteralPath $assetPath)) { continue }
  $size = $sizes[$name]
  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $assetPath).Path)
  if ($source.Width -eq $size[0] -and $source.Height -eq $size[1]) { $source.Dispose(); continue }
  $bitmap = New-Object System.Drawing.Bitmap($size[0], $size[1], [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0,0,$size[0],$size[1]), 0,0,$source.Width,$source.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
  $source.Dispose(); $graphics.Dispose(); $attributes.Dispose()
  $bitmap.Save((Join-Path (Resolve-Path -LiteralPath $AssetDirectory).Path $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  Write-Output ('Exported {0}: {1}x{2}' -f $name,$size[0],$size[1])
}
