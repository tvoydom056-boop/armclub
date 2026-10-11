import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {PNG} from 'pngjs';
import {artWarnings, keyMagenta, sliceGrid, exerciseIds} from '../../../../tools/importTrainingArt.mjs';

const base = resolve(import.meta.dirname, '..');
const src = resolve(import.meta.dirname, 'import');
const read = (name) => PNG.sync.read(readFileSync(resolve(src,name)));
const write = (rel,png) => {const out=resolve(base,rel);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,PNG.sync.write(png));};
const report={backgrounds:[],sprites:[],pairs:[],warnings:[]};
for(const name of ['map_base.png','room_home.png','room_gym.png','room_shop.png','run_street.png']){
  copyFileSync(resolve(src,name),resolve(base,name));
  const png=read(name);report.backgrounds.push({file:name,width:png.width,height:png.height});
}
for(const name of ['shopkeeper.png','shopkeeper_happy.png','shopkeeper_doubt.png','dog.png','weight_stack.png']){
  const png=keyMagenta(read(name));write(name,png);
  report.sprites.push({file:name,width:png.width,height:png.height});
  const issues=artWarnings(png);if(issues.length)report.warnings.push({file:name,issues});
}
for(const [name,cols,rows,names] of [
  ['map_buildings.png',2,2,['home','shop','gym','bar']],
  ['map_marks.png',3,2,['chain','shutter','player','star','steam','sign']]
]){
  sliceGrid(keyMagenta(read(name)),cols,rows).forEach((png,i)=>{
    const file='map/'+names[i]+'.png';write(file,png);
    report.sprites.push({file,width:png.width,height:png.height});
    const issues=artWarnings(png);if(issues.length)report.warnings.push({file,issues});
  });
}
copyFileSync(resolve(base,'stamps/level.png'),resolve(base,'levelup_badge.png'));
for(const id of exerciseIds()){
  const pair=['rest','peak'].map(p=>PNG.sync.read(readFileSync(resolve(base,'games',id+'_'+p+'.png'))));
  if(pair[0].width!==pair[1].width||pair[0].height!==pair[1].height)throw Error('Размеры пары: '+id);
  let transparent=pair.map(p=>{let n=0;for(let i=3;i<p.data.length;i+=4)if(p.data[i]===0)n++;return n;});
  let difference=0;for(let i=0;i<pair[0].data.length;i++)if(pair[0].data[i]!==pair[1].data[i])difference++;
  if(!difference)throw Error('Одинаковые кадры: '+id);
  if(transparent.some(n=>n===0))throw Error('Нет альфа-фона: '+id);
  report.pairs.push({id,width:pair[0].width,height:pair[0].height,transparentPixels:transparent,differentChannels:difference});
}
const road=read('run_street.png');
let sum=0,max=0;
for(let x=0;x<road.width;x++)for(let c=0;c<3;c++){
 const d=Math.abs(road.data[x*4+c]-road.data[((road.height-1)*road.width+x)*4+c]);sum+=d;max=Math.max(max,d);
}
report.roadEdges={meanChannelDifference:sum/(road.width*3),maxChannelDifference:max};
writeFileSync(resolve(import.meta.dirname,'asset-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({backgrounds:report.backgrounds.length,extraSprites:report.sprites.length+1,exercisePairs:report.pairs.length,warnings:report.warnings,roadEdges:report.roadEdges},null,2));
