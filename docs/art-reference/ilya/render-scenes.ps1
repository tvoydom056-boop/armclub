param([string]$AssetDirectory='public/art/opponents/ilya',[string]$OutputDirectory='docs/art-reference/ilya')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$images=@{}
foreach($p in Get-ChildItem -LiteralPath $AssetDirectory -Filter '*.png') { $images[$p.BaseName]=[System.Drawing.Bitmap]::FromFile($p.FullName) }
foreach($name in @('bg','table','pad_opp','pin_opp','pin_me')) { $images[$name]=[System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath ('public/art/scene/'+$name+'.png')).Path) }
$images['our_free']=[System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath 'public/art/me/free_idle.png').Path)
function Place($g,$img,$x,$y,$w,$h) {
 $g.DrawImage($img,[System.Drawing.RectangleF]::new([single]$x,[single]$y,[single]$w,[single]$h))
}
$poses=@(
 @(210,195,294,470,131,136,123,266,.957),
 @(250,140,384,425,160,145,187,260,.943),
 @(310,120,464,390,159,150,176,267,.958),
 @(300,110,539,370,153,144,194,282,.981),
 @(300,110,614,365,170,145,205,285,1),
 @(320,110,689,370,158,144,203,281,1.007),
 @(415,105,779,390,149,114,217,251,1.135),
 @(425,125,869,430,162,117,232,248,1.135),
 @(420,135,959,470,158,113,222,244,1.1)
)
$sceneImages=@()
for($i=0;$i -lt 9;$i++) {
 $p=$poses[$i];$s=1.0/$p[8];$cx=$p[2];$cy=$p[3]
 $sx=$cx+($p[4]-$p[0])*$s;$sy=$cy+($p[5]-$p[1])*$s
 $bs=.3289;$left=$sx-215*$bs;$top=$sy-472.8*$bs
 $bmp=[System.Drawing.Bitmap]::new(1280,720,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[System.Drawing.Graphics]::FromImage($bmp)
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 Place $g $images['bg'] 0 0 1280 720
 $fx=$left+1060*$bs;$fy=$top+295*$bs
 $turn=([Math]::Atan2(550-$fy,1112-$fx)-[Math]::Atan2(448,441))*180/[Math]::PI
 $fs=[Math]::Sqrt([Math]::Pow(1112-$fx,2)+[Math]::Pow(550-$fy,2))/[Math]::Sqrt(441*441+448*448)
 Place $g $images['table'] 0 350 1280 380
 Place $g $images['pin_opp'] 210 443 150 150
 Place $g $images['pin_me'] 910 443 150 150
 $state=$g.Save();$g.TranslateTransform([single]$fx,[single]$fy);$g.RotateTransform([single]$turn)
 Place $g $images['arm_free'] (-60*$fs) (-45*$fs) (560*$fs) (620*$fs)
 $g.Restore($state)
 $state=$g.Save();$g.SetClip([System.Drawing.Rectangle]::new(0,0,1280,401))
 Place $g $images['torso_motion'] $left $top (1572*$bs) (1001*$bs)
 $g.Restore($state)
 $nx=$left+752*$bs;$ny=$top+200*$bs;$hs=.35
 $face=if($i -eq 6 -or $i -eq 7){'head_press'}else{'head_calm'}
 Place $g $images[$face] ($nx-300*$hs) ($ny-660*$hs) (600*$hs) (700*$hs)
 $ex=$cx+($p[6]-$p[0])*$s;$ey=$cy+($p[7]-$p[1])*$s
 Place $g $images['pad_opp'] ($ex-100) ($ey-94*.42) 200 94
 $sheet=$images['arms_motion'];$col=$i%3;$row=[int][Math]::Floor($i/3)
 $ax=[int][Math]::Round($col*$sheet.Width/3);$ay=[int][Math]::Round($row*$sheet.Height/3)
 $aw=[int][Math]::Round(($col+1)*$sheet.Width/3)-$ax;$ah=[int][Math]::Round(($row+1)*$sheet.Height/3)-$ay
 $g.DrawImage($sheet,[System.Drawing.RectangleF]::new([single]($cx-$p[0]*$s),[single]($cy-$p[1]*$s),[single]($aw*$s),[single]($ah*$s)),[System.Drawing.RectangleF]::new($ax,$ay,$aw,$ah),[System.Drawing.GraphicsUnit]::Pixel)
 Place $g $images['our_free'] 0 460 280 260
 $g.Dispose()
 $bmp.Save((Join-Path (Resolve-Path -LiteralPath $OutputDirectory).Path ('pose-'+$i+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $sceneImages+=$bmp
}
$sheet=[System.Drawing.Bitmap]::new(1920,1080)
$g=[System.Drawing.Graphics]::FromImage($sheet)
for($i=0;$i -lt 9;$i++) { $g.DrawImage($sceneImages[$i],[System.Drawing.Rectangle]::new(($i%3)*640,[int][Math]::Floor($i/3)*360,640,360));$sceneImages[$i].Dispose() }
$g.Dispose();$sheet.Save((Join-Path (Resolve-Path -LiteralPath $OutputDirectory).Path 'poses-preview.png'),[System.Drawing.Imaging.ImageFormat]::Png);$sheet.Dispose()
foreach($img in $images.Values) {$img.Dispose()}
Write-Output 'Saved 9 static pose previews and contact sheet; source sprites remain unchanged.'
