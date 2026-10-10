param([string]$AssetDirectory='public/art/opponents/ermes',[string]$OutputDirectory='docs/art-reference/ermes')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$rig=Get-Content -LiteralPath (Join-Path $OutputDirectory 'rig.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$images=@{}
foreach($p in Get-ChildItem -LiteralPath $AssetDirectory -Filter '*.png') { $images[$p.BaseName]=[System.Drawing.Bitmap]::FromFile($p.FullName) }
foreach($name in @('table','pad_opp','pin_opp','pin_me')) { $images[$name]=[System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath ('public/art/scene/'+$name+'.png')).Path) }
$images['bg']=[System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath 'public/art/scene/bg.png').Path)
$images['our_free']=[System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath 'public/art/me/free_idle.png').Path)
function Place($g,$img,$x,$y,$w,$h,$ox=0,$oy=0,$degrees=0) {
  $state=$g.Save()
  $g.TranslateTransform([single]$x,[single]$y)
  $g.RotateTransform([single]$degrees)
  $g.DrawImage($img,[System.Drawing.RectangleF]::new([single](-$ox*$w),[single](-$oy*$h),[single]$w,[single]$h))
  $g.Restore($state)
}
function Run($img,$row) {
  $left=0;$right=0;$start=-1
  for($x=0;$x -le $img.Width;$x++) {
    $on=$x -lt $img.Width -and $img.GetPixel($x,$row).A -gt 200
    if($on -and $start -lt 0) { $start=$x }
    if(!$on -and $start -ge 0) { if($x-$start -gt $right-$left) {$left=$start;$right=$x};$start=-1 }
  }
  return @($left,$right)
}
$sceneImages=@()
for($i=0;$i -lt 9;$i++) {
  $pose=$rig.poses[$i]
  $sheet=$images['arms_motion']
  $col=$i%3;$row=[int][Math]::Floor($i/3)
  $sx=[int][Math]::Round($col*$sheet.Width/3);$sy=[int][Math]::Round($row*$sheet.Height/3)
  $cw=[int][Math]::Round(($col+1)*$sheet.Width/3)-$sx;$ch=[int][Math]::Round(($row+1)*$sheet.Height/3)-$sy
  $cell=$sheet.Clone([System.Drawing.Rectangle]::new($sx,$sy,$cw,$ch),[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $low=$ch-1
  for(;$low -gt 22;$low--) {
    $run=Run $cell $low;$len=$run[1]-$run[0]
    if($len -lt 40 -or $run[0] -lt 1 -or $run[1] -ge $cw-1) {continue}
    $q=[int][Math]::Floor($len/4);$sum=0
    for($x=$run[0]+$q;$x -lt $run[1]-$q;$x++) {$c=$cell.GetPixel($x,$low);$sum+=$c.R+$c.G+$c.B}
    if($sum/($len-2*$q) -gt 380) {break}
  }
  $cut=$low-4;$a=Run $cell $cut;$b=Run $cell ($cut-16)
  $slope=($a[0]-$b[0]+$a[1]-$b[1])/32.0
  $bandL=[Math]::Max(0,$a[0]-2);$bandR=[Math]::Min($cw,$a[1]+2)
  $ew=[int][Math]::Max($cw,[Math]::Ceiling($bandR+[Math]::Max(0,$slope)*380))
  $eh=$cut+381
  $extended=[System.Drawing.Bitmap]::new($ew,$eh,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $eg=[System.Drawing.Graphics]::FromImage($extended)
  $eg.DrawImage($cell,[System.Drawing.Rectangle]::new(0,0,$cw,$cut+1),0,0,$cw,$cut+1,[System.Drawing.GraphicsUnit]::Pixel)
  for($k=1;$k -le 380;$k++) {$eg.DrawImage($cell,[System.Drawing.RectangleF]::new([single]($bandL+$slope*$k),[single]($cut+$k),[single]($bandR-$bandL),1),[System.Drawing.RectangleF]::new([single]$bandL,[single]$cut,[single]($bandR-$bandL),1),[System.Drawing.GraphicsUnit]::Pixel)}
  $eg.Dispose();$cell.Dispose()
  $bmp=[System.Drawing.Bitmap]::new(1280,720,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  Place $g $images['bg'] 0 0 1280 720
  Place $g $images['table'] 640 730 1280 380 .5 1
  Place $g $images['pin_opp'] 285 518 150 150 .5 .5
  Place $g $images['pin_me'] 985 518 150 150 .5 .5
  $scale=1.0/$pose.size;$cx=$pose.center.x;$cy=$pose.center.y+$rig.drop
  $shoulderX=$cx+($pose.shoulder.x-$pose.grip.x)*$scale
  $shoulderY=$cy+($pose.shoulder.y-$pose.grip.y)*$scale
  $shiftX=$shoulderX-$rig.workingShoulder.x;$shiftY=$shoulderY-$rig.workingShoulder.y
  $tx=$rig.torso.x+$shiftX;$ty=$rig.torso.y+$shiftY
  $nx=$tx+($rig.neck.x-$rig.torso.origin.x*1100)*$rig.torso.scale
  $ny=$ty+($rig.neck.y-$rig.torso.origin.y*700)*$rig.torso.scale
  $fx=$tx+($rig.free.shoulder.x-$rig.torso.origin.x*1100)*$rig.torso.scale
  $fy=$ty+($rig.free.shoulder.y-$rig.torso.origin.y*700)*$rig.torso.scale
  $rx=$rig.free.grip.x-$rig.free.origin.x*560;$ry=$rig.free.grip.y-$rig.free.origin.y*620
  $turn=([Math]::Atan2($rig.free.peg.y-$fy,$rig.free.peg.x-$fx)-[Math]::Atan2($ry,$rx))*180/[Math]::PI
  Place $g $images['arm_free'] $fx $fy (560*$rig.free.scale) (620*$rig.free.scale) $rig.free.origin.x $rig.free.origin.y $turn
  # Match game depth: the free shoulder attachment stays behind the torso and head.
  $state=$g.Save();$g.SetClip([System.Drawing.Rectangle]::new(0,0,1280,401))
  Place $g $images['torso_motion'] $tx $ty (1100*$rig.torso.scale) (700*$rig.torso.scale) $rig.torso.origin.x $rig.torso.origin.y
  $g.Restore($state)
  Place $g $images['head_calm'] $nx $ny (600*$rig.head.scale) (700*$rig.head.scale) $rig.head.origin.x $rig.head.origin.y
  $ex=$cx+($pose.elbow.x-$pose.grip.x)*$scale;$ey=$cy+($pose.elbow.y-$pose.grip.y)*$scale
  Place $g $images['pad_opp'] $ex $ey (200*$scale) (94*$scale) .5 .42
  Place $g $extended ($cx-$pose.grip.x*$scale) ($cy-$pose.grip.y*$scale) ($ew*$scale) ($eh*$scale)
  Place $g $images['cuff'] $shoulderX $shoulderY (151*$scale*1.2) (151*$scale*1.2) (87/151.0) (91/151.0)
  Place $g $images['our_free'] 0 720 280 260 0 1
  $g.Dispose();$extended.Dispose()
  $bmp.Save((Join-Path (Resolve-Path -LiteralPath $OutputDirectory).Path ('pose-'+$i+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
  $sceneImages+=$bmp
}
$sheet=[System.Drawing.Bitmap]::new(1920,1080)
$g=[System.Drawing.Graphics]::FromImage($sheet)
for($i=0;$i -lt 9;$i++) { $g.DrawImage($sceneImages[$i],[System.Drawing.Rectangle]::new(($i%3)*640,[int][Math]::Floor($i/3)*360,640,360));$sceneImages[$i].Dispose() }
$g.Dispose();$sheet.Save((Join-Path (Resolve-Path -LiteralPath $OutputDirectory).Path 'poses-preview.png'),[System.Drawing.Imaging.ImageFormat]::Png);$sheet.Dispose()
foreach($img in $images.Values) { $img.Dispose() }
Write-Output 'Saved nine pose previews and poses-preview.png'

