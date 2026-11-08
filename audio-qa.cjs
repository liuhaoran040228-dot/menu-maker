const {chromium}=require('/workspace/side/anime_test/node_modules/playwright-core');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const report=[];
for(const game of ['lili-2048','snake','lili-merge']){
 const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.route('**/'+game+'/game.js',async r=>{
  let s=await(await r.fetch()).text();s=s.replaceAll('GameAudio.sfx(', 'window.__qaSfx(');
  let action=game==='lili-2048'?"roundToken++;clearTimeout(animationTimer);state.grid=Array.from({length:4},()=>Array(4).fill(0));state.grid[0][0]=2;state.grid[0][1]=2;state.animating=false;move('left');":game==='snake'?"eatFood({type:'berry',x:2,y:2});queueTurn('up');":"dropBall();balls=[createBall(200,400,0),createBall(201,400,0)];balls.forEach(b=>b.age=6);updatePhysics(.016);";
  const pos=s.lastIndexOf('})();');s=s.slice(0,pos)+`window.__qaAction=()=>{${action}};`+s.slice(pos);
  s='window.__qaSounds=[];window.__qaSfx=(...a)=>{window.__qaSounds.push(a[0]);return GameAudio.sfx(...a)};'+s;
  await r.fulfill({body:s,contentType:'application/javascript'});
 });
 const url='http://127.0.0.1:8795/'+game+'/?invite=123e4567-e89b-42d3-a456-426614174000';
 await p.goto(url);await p.waitForFunction(()=>window.__qaAction&&FX.running);
 assert.equal(await p.evaluate(()=>GameAudio.status().unlocked),false);
 await p.keyboard.press('a');await p.waitForFunction(()=>GameAudio.status().unlocked&&Howler.ctx.state==='running');
 await p.waitForFunction(()=>GameAudio.status().musicPlaying);
 await p.evaluate(()=>{GameAudio.volumes({sfx:.48,bgm:.17});window.__qaAction()});
 await p.waitForTimeout(180);
 const actions=await p.evaluate(()=>({events:__qaSounds,game:__game.state(),status:GameAudio.status(),sources:Howler._howls.map(h=>({wav:h._src.startsWith('data:audio/wav;base64,'),loaded:h.state()}))}));
 assert(actions.events.length>0);if(game==='lili-merge')assert(actions.events.includes('merge'));if(game==='snake')assert(actions.events.includes('eat'));if(game==='lili-2048')assert(actions.events.includes('merge'));assert(actions.sources.every(h=>h.wav&&h.loaded==='loaded'));assert.equal(actions.status.sfx,.48);assert.equal(actions.status.bgm,.17);
 // Exercise all named generated assets, including lazy decoding.
 await p.evaluate(()=>{for(const n of ['tap','button','swap','invalid','match','combo','merge','eat','levelup','win','lose','jump','power','drop'])GameAudio.sfx(n)});
 await p.waitForTimeout(200);assert(await p.evaluate(()=>Howler._howls.every(h=>h.state()==='loaded')));
 const amplitude=await p.evaluate(async()=>{const offline=new OfflineAudioContext(1,22050,22050);const bytes=await(await fetch(Howler._howls[0]._src)).arrayBuffer();const buffer=await offline.decodeAudioData(bytes);const source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();return rendered.getChannelData(0).reduce((peak,n)=>Math.max(peak,Math.abs(n)),0);});assert(amplitude>0);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await p.evaluate(()=>GameAudio.status().musicPlaying),false);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await p.getByRole('button',{name:/继续/}).click();await p.waitForFunction(()=>GameAudio.status().musicPlaying);
 await p.evaluate(()=>FX.paused=true);await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>GameAudio.status().musicPlaying),false);await p.evaluate(()=>FX.paused=false);await p.waitForFunction(()=>GameAudio.status().musicPlaying);
 await p.screenshot({path:'/workspace/side/merged_shots/qa/audio-'+game+'.png'});
 await p.locator('#game-audio-toggle').tap();assert.equal(await p.evaluate(()=>GameAudio.status().muted),true);
 await p.reload();await p.waitForFunction(()=>window.__qaAction&&FX.running);assert.equal(await p.evaluate(()=>GameAudio.status().muted),true);assert.equal(await p.evaluate(()=>GameAudio.status().bgm),.17);
 await p.locator('#game-audio-toggle').tap();await p.waitForFunction(()=>GameAudio.status().unlocked&&GameAudio.status().musicPlaying);
 assert.equal(await p.evaluate(()=>GameAudio.status().muted),false);
 // Empty response simulates an unavailable Howler without a network console error.
 await p.route('**/howler.core.min.js',r=>r.fulfill({body:'/* unavailable */',contentType:'application/javascript'}));
 await p.reload();await p.waitForFunction(()=>window.__qaAction&&FX.running);await p.keyboard.press('a');await p.evaluate(()=>window.__qaAction());assert.equal(await p.evaluate(()=>GameAudio.status().available),false);
 assert.deepEqual(errors,[]);report.push({game,errors,unlock:true,mutePersists:true,visibilityPause:true,gamePause:true,amplitude,actions:actions.events,proceduralWav:true,howlerFallback:true});await context.close();
}
await b.close();fs.writeFileSync('/workspace/side/merged_shots/qa/audio-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
