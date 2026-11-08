const {chromium}=require('/workspace/side/anime_test/node_modules/playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const report=[];
 for(const game of ['lili-2048','snake','lili-merge']){
  const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await context.newPage();const errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  p.on('request',r=>{if(/send_invite|rpc\//.test(r.url()))requests.push(r.url())});
  // QA-only instrumentation invokes the real private finish functions with known scores.
  await p.route('**/'+game+'/game.js',async route=>{let code=await (await route.fetch()).text();code=code.replace('function startRun(sel) {','function startRun(sel) { window.__qaSelection = {mode:sel.mode,stage:sel.stage,stageId:sel.stageId};');code=code.replace('function startRun(inviteOptions) {','function startRun(inviteOptions) { window.__qaSelection = {mode:inviteOptions.mode,stage:inviteOptions.stage,stageId:inviteOptions.stageId};');const at=code.lastIndexOf('})();');
   const finish=game==='lili-2048'?'state.score=1234;finish()':game==='snake'?'score=1234;endGame(true)':'score=1234;gameOver()';
   code=code.slice(0,at)+`window.__qaFinish=()=>{${finish}};window.__qaStart=startRun;`+code.slice(at);await route.fulfill({body:code,contentType:'application/javascript'});
  });
  const url='http://127.0.0.1:8795/'+game+'/';
  await p.goto(url+'?invite=123e4567-e89b-42d3-a456-426614174000&mode=garbage&level=999&seed=999');
  await p.waitForFunction(()=>window.GameInviteV0?.active()&&window.FX?.running);
  await p.waitForTimeout(game==='snake'?3250:350);
  assert.deepEqual(await p.evaluate(()=>window.__qaSelection),{mode:'story',stage:0,stageId:'s0'});
  await p.screenshot({path:'/workspace/side/merged_shots/qa/invite-'+game+'.png'});
  const before=await p.evaluate(()=>JSON.stringify({...localStorage}));
  await p.evaluate(()=>{window.__rewardCalls=0;Lobby.reportResult=()=>window.__rewardCalls++;Lobby.reportFinished=()=>window.__rewardCalls++;window.__qaFinish()});
  const result=await p.evaluate(()=>({preview:GameInviteV0.preview(),calls:window.__rewardCalls,storage:JSON.stringify({...localStorage}),disabled:document.querySelector('#game-invite-result button').disabled}));
  assert.equal(result.preview.params.p_score,1234);assert.equal(result.preview.score_trust,'self_reported');assert.equal(result.preview.rpc,'community_chat_send_invite_result');assert.equal(result.preview.params.p_invite_id,'123e4567-e89b-42d3-a456-426614174000');assert.equal(result.calls,0);assert.equal(result.storage,before);assert(result.disabled);assert.equal(requests.length,0);
  await p.screenshot({path:'/workspace/side/merged_shots/qa/invite-'+game+'-result.png'});
  await p.getByRole('button',{name:'返回普通大厅'}).click();assert.equal(await p.evaluate(()=>GameInviteV0.active()),false);
  await p.goto(url);await p.waitForFunction(()=>window.Lobby&&window.__qaStart&&document.querySelector('.lobby-root'));
  await p.evaluate(()=>{window.__normalReports=[];Lobby.reportResult=r=>window.__normalReports.push(r);Lobby.hide();window.__qaStart(Lobby.selection())});
  assert.equal(await p.evaluate(()=>GameInviteV0.active()),false);assert.equal(await p.evaluate(()=>FX.running),true);
  await p.evaluate(()=>window.__qaFinish());assert.equal(await p.evaluate(()=>window.__normalReports.length),1);
  await p.goto(url+'?invite=bad');await p.waitForFunction(()=>window.__qaStart);assert.equal(await p.evaluate(()=>GameInviteV0.active()),false);
  assert.deepEqual(errors,[]);report.push({game,errors,requests,result:result.preview,normalPlay:true,noRewards:true});await context.close();
 }
 console.log(JSON.stringify(report,null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
