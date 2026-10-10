param([string]$AssetDirectory = 'public/art/opponents/olya')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetExportSizes = @{
  'head_calm.png' = @(600,700); 'head_strain.png' = @(600,700)
  'head_telegraph.png' = @(600,700); 'head_tired.png' = @(600,700)
  'head_lose.png' = @(600,700); 'head_win.png' = @(600,700)
  'head_press.png' = @(600,700); 'torso_motion.png' = @(1572,1001)
  'arm_free.png' = @(560,620); 'cuff.png' = @(151,151)
  'arms_motion.png' = @(1670,941); 'bg_police.png' = @(1672,941)
}
foreach ($assetExportName in $assetExportSizes.Keys) {
  $assetExportPath = Join-Path $AssetDirectory $assetExportName
  if (!(Test-Path -LiteralPath $assetExportPath)) { continue }
  $assetExportSize = $assetExportSizes[$assetExportName]
  $assetExportSource = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $assetExportPath).Path)
  if ($assetExportSource.Width -eq $assetExportSize[0] -and $assetExportSource.Height -eq $assetExportSize[1]) {
    $assetExportSource.Dispose()
    continue
  }
  $assetExportBitmap = New-Object System.Drawing.Bitmap($assetExportSize[0], $assetExportSize[1], [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $assetExportGraphics = [System.Drawing.Graphics]::FromImage($assetExportBitmap)
  $assetExportGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $assetExportGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $assetExportGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $assetExportAttributes = New-Object System.Drawing.Imaging.ImageAttributes
  $assetExportAttributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $assetExportGraphics.DrawImage($assetExportSource, [System.Drawing.Rectangle]::new(0,0,$assetExportSize[0],$assetExportSize[1]), 0,0,$assetExportSource.Width,$assetExportSource.Height, [System.Drawing.GraphicsUnit]::Pixel, $assetExportAttributes)
  $assetExportSource.Dispose()
  $assetExportGraphics.Dispose()
  $assetExportAttributes.Dispose()
  $assetExportBitmap.Save((Join-Path (Resolve-Path -LiteralPath $AssetDirectory).Path $assetExportName), [System.Drawing.Imaging.ImageFormat]::Png)
  $assetExportBitmap.Dispose()
  Write-Output ('Exported {0}: {1}x{2}' -f $assetExportName,$assetExportSize[0],$assetExportSize[1])
}
