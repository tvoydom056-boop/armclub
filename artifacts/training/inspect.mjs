import { PNG } from 'pngjs';
import fs from 'node:fs';
const ids=['pushups','run','jump_rope','gripper','strap_dumbbell','medball','straight_bar','dips','tricep_rope','strap_block','fat_grip','roller','cone','eccentric','triple','multispin','gripper_pro'];
const out=new PNG({width:900,height:Math.ceil(ids.length/3)*400}); out.data.fill(235);
for(let n=0;n<ids.length;n++) for(let phase=0;phase<2;phase++) {
 const src=PNG.sync.read(fs.readFileSync(`public/art/training/games/${ids[n]}_${phase?'peak':'rest'}.png`));
 for(let y=0;y<200;y++) for(let x=0;x<300;x++) {
  const si=(Math.floor(y*src.height/200)*src.width+Math.floor(x*src.width/300))*4;
  const oi=((Math.floor(n/3)*400+phase*200+y)*out.width+(n%3)*300+x)*4;
  const a=src.data[si+3]/255;
  for(let c=0;c<3;c++) out.data[oi+c]=src.data[si+c]*a+235*(1-a); out.data[oi+3]=255;
 }
}
fs.writeFileSync('artifacts/training/frames-inspection.png',PNG.sync.write(out));
