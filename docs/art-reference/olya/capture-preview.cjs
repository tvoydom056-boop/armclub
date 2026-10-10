const { chromium }=require('C:/Users/DPiunov/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const dir=__dirname;
 const errors=[];
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1100},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/art/'))errors.push(`${r.status()} ${r.url()}`)});
  await page.goto('http://127.0.0.1:5173/docs/art-reference/olya/preview.html');
  await page.waitForFunction(()=>document.title.startsWith('READY')||document.title.startsWith('ERROR'),{},{timeout:90000});
  assert.equal(await page.title(),'READY: Olya');
  await page.locator('#scene').screenshot({path:path.join(dir,'scene-preview.png')});
  await page.locator('#heads').screenshot({path:path.join(dir,'faces-preview.png')});
  await page.locator('#atlas').screenshot({path:path.join(dir,'arms-preview.png')});
  const results=[];
  for(const p of [-1,-.5,0,.5,1]){
   const metrics=await page.evaluate(p=>{
    const {art,frame}=window.olyaPreview;frame.p=p;art.arms.slip={x:0,y:0};
    for(let i=0;i<90;i++)art.update(frame);
    return {p,grip:{x:art.arms.object.x,y:art.arms.object.y},shoulder:art.arms.shoulder,head:art.head.objects()[0].getBounds(),torso:art.torso.getBounds()};
   },p);
   for(const n of [metrics.shoulder.x,metrics.shoulder.y,metrics.head.x,metrics.head.y,metrics.torso.x,metrics.torso.y])assert.ok(Number.isFinite(n));
   results.push(metrics);
   await page.locator('#scene').screenshot({path:path.join(dir,`pose-${String(p).replace('-','minus-')}.png`)});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(dir,'preview-validation.json'),JSON.stringify({errors,poses:results},null,2));
  console.log('Saved scene-preview.png, faces-preview.png, arms-preview.png and five pose checks. No missing textures or browser errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
