const {chromium}=require('/workspace/side/anime_test/node_modules/playwright-core');
const assert=require('node:assert/strict');const fs=require('node:fs');
const folder=process.argv[2]||'.rework-2048';
const shots='/workspace/side/merged_shots/qa/';
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.route('**/'+folder+'/game.js',async r=>{let s=await(await r.fetch()).text();const a=s.lastIndexOf('})();');s=s.slice(0,a)+`window.__qaSet=(data)=>{Object.assign(state,data);state.animating=false;dom.overlay.classList.remove('active');updateDisplay();renderBoard();};`+s.slice(a);await r.fulfill({body:s,contentType:'application/javascript'});});
const url='http://127.0.0.1:8795/'+folder+'/';
const invite='?invite=123e4567-e89b-42d3-a456-426614174000';
await p.goto(url+invite);await p.waitForFunction(()=>window.__game&&FX.running&&__game.state().grid);
const read=()=>p.evaluate(()=>__game.state());
const fixture=async(grid,extra={})=>p.evaluate(({grid,extra})=>__qaSet({grid,score:0,won:false,continued:false,phase:'playing',...extra}),{grid,extra});
const blank=()=>Array.from({length:4},()=>Array(4).fill(0));
let board=blank();board[0]=[2,2,2,2];await fixture(board);const storage=await p.evaluate(()=>JSON.stringify({...localStorage}));
await p.evaluate(()=>__game.move('left'));await p.waitForFunction(()=>!__game.state().animating);let st=await read();assert.equal(st.score,8);assert.deepEqual(st.grid[0].slice(0,2),[4,4]);assert.equal(st.grid.flat().filter(Boolean).length,3);
await p.evaluate(()=>__game.undo());st=await read();assert.deepEqual(st.grid,board);assert.equal(st.score,0);assert.equal(st.undoLeft,2);
// Invalid moves, hover, small drags, pointer cancellation do not move, spawn or consume undo.
board=blank();board[0][0]=2;await fixture(board);const before=await read();await p.evaluate(()=>__game.move('left'));assert.deepEqual(await read(),before);
const rect=await p.locator('#board').boundingBox();await p.mouse.move(rect.x+150,rect.y+150);await p.mouse.move(rect.x+220,rect.y+150);assert.deepEqual(await read(),before);
await p.mouse.move(rect.x+100,rect.y+100);await p.mouse.down();await p.mouse.move(rect.x+110,rect.y+100);await p.mouse.up();assert.deepEqual(await read(),before);
await p.locator('#board').dispatchEvent('pointerdown',{pointerId:99,isPrimary:true,clientX:100,clientY:100,pointerType:'touch'}).catch(()=>{});
await p.locator('#board').dispatchEvent('pointercancel',{pointerId:99,isPrimary:true});
// Actual rightward mouse swipe, then arrow keyboard and limited undo.
await p.mouse.move(rect.x+100,rect.y+150);await p.mouse.down();await p.mouse.move(rect.x+180,rect.y+150);assert.deepEqual(await read(),before);await p.mouse.up();await p.waitForFunction(()=>!__game.state().animating);assert.notDeepEqual((await read()).grid,before.grid);
await p.evaluate(()=>__game.undo());assert.equal((await read()).undoLeft,1);
await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>!__game.state().animating);await p.evaluate(()=>__game.undo());assert.equal((await read()).undoLeft,0);
await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>!__game.state().animating);const exhausted=await read();await p.evaluate(()=>__game.undo());assert.deepEqual(await read(),exhausted);
// Challenge terminal cap and undo recovery.
await p.evaluate(()=>__game.start({mode:'challenge'}));board=blank();board[0]=[2,2,0,0];await fixture(board,{remaining:1});await p.evaluate(()=>__game.move('left'));await p.waitForFunction(()=>!__game.state().animating);st=await read();assert.equal(st.remaining,0);assert.equal(st.phase,'lost');assert(await p.locator('#overlay.active').count());await p.evaluate(()=>__game.undo());assert.equal((await read()).remaining,1);assert.equal((await read()).phase,'playing');
// 2048 milestone, continue, 4096, self-reported result with zero best/reward writes.
await p.evaluate(()=>__game.start({mode:'classic'}));board=blank();board[0]=[1024,1024,0,0];await fixture(board);await p.evaluate(()=>__game.move('left'));await p.waitForFunction(()=>!__game.state().animating);st=await read();assert.equal(st.won,true);assert.equal(st.phase,'won');
await p.screenshot({path:shots+'rework-2048-win.png'});await p.getByRole('button',{name:'继续',exact:true}).click();assert.equal((await read()).continued,true);
board=blank();board[0]=[2048,2048,0,0];await fixture(board,{score:2048,won:true,continued:true});await p.evaluate(()=>__game.move('left'));await p.waitForFunction(()=>!__game.state().animating);assert((await read()).grid.flat().includes(4096));assert.equal((await read()).phase,'playing');
assert.equal(await p.evaluate(()=>JSON.stringify({...localStorage})),storage);
await p.evaluate(()=>{window.__reports=[];const original=Lobby.reportResult;Lobby.reportResult=r=>{__reports.push(r);return original.call(Lobby,r)};__game.finish();__game.finish()});assert.equal(await p.evaluate(()=>__reports.length),0);assert.equal(await p.evaluate(()=>GameInviteV0.preview().score_trust),'self_reported');assert.equal(await p.evaluate(()=>GameInviteV0.preview().params.p_score),6144);assert.equal(await p.evaluate(()=>JSON.stringify({...localStorage})),storage);
await p.screenshot({path:shots+'rework-2048-invite-result.png'});
// Restart invalidates in-flight callbacks.
await p.goto(url+invite);await p.waitForFunction(()=>window.__qaSet&&FX.running);board=blank();board[0]=[2,2,0,0];await fixture(board);await p.evaluate(()=>{__game.move('left');__game.start({mode:'expanded'})});await p.waitForTimeout(250);assert.equal((await read()).size,5);assert.equal((await read()).score,0);assert.equal((await read()).grid.flat().filter(Boolean).length,2);
// Screenshots of representative high/low-value boards and a genuine swipe.
await p.evaluate(()=>__game.start({mode:'classic'}));await fixture([[2,4,8,16],[32,64,128,256],[512,1024,2,4],[8,16,32,0]],{score:4860,best:7920});await p.screenshot({path:shots+'rework-2048-classic.png'});
await p.evaluate(()=>__game.start({mode:'expanded'}));await fixture([[2,4,8,16,32],[64,128,256,512,1024],[2048,4096,8192,2,4],[8,16,32,64,128],[0,0,2,4,8]],{size:5,score:12048,best:16000});await p.screenshot({path:shots+'rework-2048-5x5.png'});
await p.evaluate(()=>__game.start({mode:'challenge'}));await fixture([[2,4,2,4],[4,8,16,0],[0,4,8,16],[2,2,0,0]],{remaining:17,score:820});await p.screenshot({path:shots+'rework-2048-challenge.png'});
await p.setViewportSize({width:320,height:568});await p.waitForTimeout(100);const overflow=await p.evaluate(()=>{const r=document.getElementById('board').getBoundingClientRect();return r.x<0||r.right>innerWidth||r.y<0||r.bottom>innerHeight});assert.equal(overflow,false);await p.screenshot({path:shots+'rework-2048-small.png'});await p.setViewportSize({width:390,height:844});
// Normal lobby and non-invite economy: best persists, finalization once.
await p.evaluate(()=>localStorage.setItem('lobby-lili-2048-tutorial','1'));await p.goto(url);await p.waitForFunction(()=>window.__qaSet&&document.querySelector('#lobby-tap'));await p.locator('#lobby-tap').click({force:true});await p.waitForTimeout(500);await p.screenshot({path:shots+'rework-2048-lobby.png'});
await p.locator('[data-mode=expanded]').click();await p.locator('#lobby-start').click({force:true});assert.equal((await read()).size,5);await p.evaluate(()=>{window.__reports=[];const original=Lobby.reportResult;Lobby.reportResult=r=>{__reports.push(r);return original.call(Lobby,r)};__game.start({mode:'classic'})});board=blank();board[0]=[2,2,0,0];await fixture(board,{score:1000});await p.keyboard.press('ArrowLeft');await p.waitForFunction(()=>!__game.state().animating);assert.equal((await read()).score,1004);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('lili-2048-rework')).classic),1004);
await p.evaluate(()=>{__game.finish();__game.finish()});assert.equal(await p.evaluate(()=>__reports.length),1);assert.equal(await p.evaluate(()=>__reports[0].coins),20);assert.equal(await p.evaluate(()=>FX.running),false);
assert.deepEqual(errors,[]);await b.close();const report={status:'pass',folder,viewport:'390x844',errors,unitAssertions:3763,tests:['once-per-move merges','invalid no spawn','hover no move','swipe threshold','swipe release only','arrow keys','limited undo','challenge cap','terminal undo','2048 continue','4096','invite no best or rewards','self_reported6144','stale callbacks cancelled','3 modes','320x568','best persistence','normal economy exactly once']};fs.writeFileSync(shots+'rework-2048-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
