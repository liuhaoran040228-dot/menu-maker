/* Invite bridge: mock by default. Existing-client RPC adapter requires STAR_GAME_INVITE_REAL === true. No clients/keys created. */
(function(){'use strict';
const games=new Set(['lili-match','lili-2048','snake','lili-merge','gomoku','draw-guess','whos-spy']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const values=new URLSearchParams(location.search).getAll('invite'),requested=values.length>0;
const inviteId=values.length===1&&uuid.test(values[0])?values[0].toLowerCase():null;
let active=false,result=null,panel=null,game=null,key=null,adapter=null,storageOK=false,busy=false,verified=false;
const clone=x=>x?JSON.parse(JSON.stringify(x)):null;
const REAL_TEXT=Object.freeze({AUTH_REQUIRED:'请先登录，再从聊天邀请卡片进入。',FORBIDDEN:'当前无权访问此邀请，请返回聊天。',NOT_FRIEND:'好友关系已变化或存在屏蔽，邀请不可用。',NOT_FOUND:'邀请不存在、已隐藏或无权查看。',EXPIRED:'邀请已过期，请返回聊天重新邀请。',INVALID_INPUT:'邀请或游戏信息无效。',RATE_LIMITED:'操作太频繁，请稍后用原请求重试。',NONCE_REUSED:'请求标识冲突，未确认回发；请返回聊天查看。',ALREADY_SUBMITTED:'此前已提交结果，暂未确认；请返回聊天查看。',SEND_FAILED:'回发失败，请保留原标识重试。',RPC_UNAVAILABLE:'邀请接口尚未接入，请稍后再试。',CLIENT_UNAVAILABLE:'游戏页没有现成的已登录客户端，邀请暂不可用。',CLIENT_CHANGED:'登录客户端已切换，请刷新后重新进入邀请。',FLAG_OFF:'邀请连接已关闭，未发送。',INVALID_RESPONSE:'服务器未确认结果，未标记成功。',NETWORK:'网络暂不可用，请用原请求重试。',TIMEOUT:'请求超时，结果未确认；重试前会先只读核对。'});
function realCode(e){let c=e?.code;if(typeof e?.details==='string'){try{const d=JSON.parse(e.details);if(REAL_TEXT[d.code])c=d.code}catch(_){}}
 if(c==='PGRST202'||c==='42883')return 'RPC_UNAVAILABLE';if(['PGRST301','PGRST302','PGRST303'].includes(c))return 'AUTH_REQUIRED';if(c==='42501'||e?.status===403)return 'FORBIDDEN';if(e?.status===401)return 'AUTH_REQUIRED';if(e?.message==='LOCAL_TIMEOUT')return 'TIMEOUT';return REAL_TEXT[c]?c:'NETWORK'}
const realText=e=>REAL_TEXT[typeof e==='string'?e:realCode(e)]||REAL_TEXT.INVALID_RESPONSE;
const existingClient=()=>window.StarGameInviteClient||window.__starSocialClient||null;
async function createRealTransport(){
 if(!window.StarGameInviteClient&&window.StarInviteBridgeReady)await window.StarInviteBridgeReady;
 const client=existingClient();
 if(!client||typeof client.rpc!=='function'||typeof client.auth?.getUser!=='function')throw {code:'CLIENT_UNAVAILABLE'};
 const ensureFlag=()=>{if(window.STAR_GAME_INVITE_REAL!==true)throw {code:'FLAG_OFF'};if(existingClient()!==client)throw {code:'CLIENT_CHANGED'}};
 async function who(){ensureFlag();let r;try{r=await client.auth.getUser()}catch(_){throw {code:'NETWORK'}};if(r?.error)throw {code:r.error.status===0||r.error.status>=500?'NETWORK':'AUTH_REQUIRED'};const id=r?.data?.user?.id;if(!uuid.test(id||''))throw {code:'AUTH_REQUIRED'};return id}
 const actor=await who();
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(actor));
 const contextKey='real_'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
 async function raw(name,args){ensureFlag();if(await who()!==actor)throw {code:'AUTH_REQUIRED'};
  if(!['chat_invite_capability_v1','community_chat_get_invite','community_chat_send_invite_result'].includes(name))throw {code:'INVALID_INPUT'};
  let r;try{r=await client.rpc(name,args)}catch(e){throw {code:realCode(e)}};
  if(r?.error)throw {code:realCode(r.error)};
  if(!r?.data||r.data.ok!==true)throw {code:REAL_TEXT[r?.data?.error?.code]?r.data.error.code:'INVALID_RESPONSE'};
  return r.data;
 }
 const cap=await raw('chat_invite_capability_v1',{});
 // Registry disables NEW invitations only; existing unexpired invites may still resolve.
 if(cap.version!==1||!Array.isArray(cap.games))throw {code:'RPC_UNAVAILABLE'};
 return {mode:'real',contextKey,async resolve(id,g){try{return await raw('community_chat_get_invite',{p_invite_id:id,p_game_id:g})}catch(e){return {ok:false,error:{code:realCode(e)}}}},async rpc(name,args){try{return await raw(name,args)}catch(e){return {ok:false,error:{code:realCode(e)}}}}};
}
function fatalReal(code){return ['AUTH_REQUIRED','FORBIDDEN','NOT_FRIEND','NOT_FOUND','EXPIRED','INVALID_INPUT','NONCE_REUSED','RPC_UNAVAILABLE','CLIENT_UNAVAILABLE','CLIENT_CHANGED','FLAG_OFF'].includes(code)}

function close(){panel?.remove();panel=null}
function get(){try{const d=JSON.parse(localStorage.getItem(key));return d&&d.rpc==='community_chat_send_invite_result'&&d.params?.p_invite_id===inviteId&&uuid.test(d.params?.p_client_nonce||'')&&Number.isInteger(d.params.p_score)&&d.params.p_score>=0&&d.params.p_score<=1e9&&['ready','sending','sent'].includes(d.status)?d:null}catch(_){return null}}
function put(d){try{localStorage.setItem(key,JSON.stringify(d));storageOK=true;return true}catch(_){storageOK=false;return false}}
function button(text,id,fn){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=text;b.style.cssText='font:inherit;border-radius:16px;padding:12px 16px;color:inherit;background:#ffffff16;border:1px solid #ffffff44;min-height:44px';b.onclick=fn;return b}
function goChat(){const u=new URL('../social/',location.href);if(inviteId)u.searchParams.set('game_invite_return',inviteId);u.hash='messages';location.assign(u.href)}
async function timed(fn){let t;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error('LOCAL_TIMEOUT')),8000)})])}finally{clearTimeout(t)}}
function ui(title,note,allow=false){close();panel=document.createElement('section');panel.id='game-invite-result';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','邀请对局');panel.style.cssText='position:fixed;inset:0;z-index:20000;background:#111a36f5;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:26px;text-align:center;font:16px/1.7 system-ui';const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.id='invite-status';p.textContent=note;panel.append(h,p);
if(result){const score=document.createElement('p');score.textContent='自报分数（未验证）：'+result.params.p_score+' · 不发奖励、不计排行/任务';panel.append(score);const send=button(result.status==='sent'?'已回发':'回发到会话','invite-send',submit);send.disabled=!allow||busy||result.status==='sent';panel.append(send)}
panel.append(button('返回聊天','invite-back',goChat),button('返回普通大厅','invite-lobby',()=>{active=false;close();history.replaceState(null,'',location.pathname);if(window.FX)FX.running=false;window.Lobby?.show()}));document.body.append(panel)}
function showResult(note){ui('邀请对局结果',note||(result.status==='sent'?'结果已确认回发，可返回聊天查看卡片。':verified?'点击回发并确认后才发送。':'后端未接入：仅本页预览，未发送。'),verified&&storageOK&&!!navigator.locks)}
function confirmed(res,d){const r=res?.result;return res?.ok===true&&r?.invite_id===inviteId&&r?.game_id===game&&r?.score===d.params.p_score&&r?.score_trust==='self_reported'}
async function submit(){if(!verified||!adapter||!storageOK||!navigator.locks||busy||!result)return;busy=true;try{
await navigator.locks.request(key,async()=>{let saved=get();if(!saved){showResult('本地结果丢失，未发送。');return}result=saved;if(saved.status==='sent'){showResult();return}
if(!window.confirm('将本局自报分数 '+saved.params.p_score+' 回发到邀请会话？不发放奖励。'))return;
// Revalidate membership/status at submission, not just at launch.
const check=await timed(()=>adapter.resolve(inviteId,game));if(check?.ok!==true||check.invite?.status!=='open'||check.invite?.game_id!==game||check.invite?.invite_id!==inviteId){if(adapter.mode==='real')verified=false;ui('邀请已不可用',adapter.mode==='real'?realText(check?.invite?.status==='expired'?'EXPIRED':check?.error?.code||'INVALID_RESPONSE'):'邀请过期或权限失效，未发送。');return}
const remote=check.result;if(remote?.invite_id===inviteId&&remote?.game_id===game&&remote?.score_trust==='self_reported'&&Number.isInteger(remote.score)&&remote.score>=0&&remote.score<=1e9){saved.params.p_score=remote.score;saved.status='sent';put(saved);result=saved;showResult('已查到此前回发的结果，没有重复提交。');return}
saved.status='sending';if(!put(saved)){showResult('无法保存幂等标识，未发送。');return}showResult('回发中…');
try{const res=await timed(()=>adapter.rpc('community_chat_send_invite_result',clone(saved.params)));if(confirmed(res,saved)){saved.status='sent';put(saved);result=saved;showResult('已回发，自报分数已更新到邀请卡片。')}else{saved.status='ready';put(saved);result=saved;
if(adapter.mode==='real'){
 const code=res?.error?.code||'INVALID_RESPONSE';
 if(code==='ALREADY_SUBMITTED'){const q=await timed(()=>adapter.resolve(inviteId,game));const r=q?.result;if(q?.ok===true&&r?.invite_id===inviteId&&r?.game_id===game&&r?.score_trust==='self_reported'&&Number.isInteger(r.score)&&r.score>=0&&r.score<=1e9){saved.params.p_score=r.score;saved.status='sent';put(saved);result=saved;showResult('已查到此前回发的结果，没有重复提交。');return}}
 if(fatalReal(code))verified=false;showResult(realText(code));
}else showResult('回发未确认：'+String(res?.error?.code||'INVALID_RESPONSE')+'。可用原标识重试。')}}catch(e){saved.status='ready';put(saved);result=saved;showResult(adapter.mode==='real'?realText(e):'回发未确认，请使用原标识重试。')}
});}catch(e){showResult(adapter?.mode==='real'?realText(e):'校验暂不可用，未发送。')}finally{busy=false;if(panel&&result&&panel.querySelector('#invite-send'))panel.querySelector('#invite-send').disabled=!verified||!storageOK||!navigator.locks||result.status==='sent'}}
function finish(score){if(!active)return false;const n=Number(score);if(!Number.isFinite(n))return true;if(window.FX)FX.running=false;window.GameAudio?.stop();if(!result){const existing=get();result=existing||{rpc:'community_chat_send_invite_result',params:{p_invite_id:inviteId,p_score:Math.min(1e9,Math.max(0,Math.floor(n))),p_client_nonce:crypto.randomUUID()},score_trust:'self_reported',status:'ready'};if(existing)storageOK=true;else if(key)put(result)}showResult();return true}
async function resolveAndStart(start){if(!inviteId){ui('邀请无效','邀请标识格式错误或重复；未开始游戏、未发送结果。');return}
const candidate=window.GameInviteTransport;adapter=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&candidate?.mode==='local-mock'&&/^[a-zA-Z0-9_-]{1,64}$/.test(candidate.contextKey||'')?candidate:null;
if(!adapter&&window.STAR_GAME_INVITE_REAL===true){try{adapter=await timed(createRealTransport)}catch(e){ui('邀请暂不可用',realText(e));return}}
key='invite-v1:'+(adapter?.contextKey||'preview')+':'+inviteId+':'+game;
if(adapter){ui('校验邀请',adapter.mode==='real'?'正在校验邀请…':'正在通过本地模拟适配器校验…');let r;try{r=await timed(()=>adapter.resolve(inviteId,game))}catch(e){ui('邀请暂不可用',adapter.mode==='real'?realText(e):'校验失败，请返回聊天重试。');return}
const i=r?.invite;if(r?.ok!==true||i?.kind!=='game_invite'||i?.version!==1||i?.invite_id!==inviteId||i?.game_id!==game||i?.status!=='open'||i?.score_trust!=='self_reported'){ui('邀请已失效',adapter.mode==='real'?realText(i?.status==='expired'?'EXPIRED':r?.error?.code||'INVALID_RESPONSE'):'邀请无效、已过期或无权限；不会启动或提交。');return}verified=true;result=get();
if(r.result&&r.result.invite_id===inviteId&&r.result.game_id===game&&Number.isInteger(r.result.score)&&r.result.score>=0&&r.result.score<=1e9&&r.result.score_trust==='self_reported'){result={rpc:'community_chat_send_invite_result',params:{p_invite_id:inviteId,p_score:r.result.score,p_client_nonce:result?.params.p_client_nonce||crypto.randomUUID()},score_trust:'self_reported',status:'sent'};put(result)}
if(result){storageOK=true;showResult();return}
}else{verified=false;ui('邀请服务未接入','无法校验邀请；未启动对局、未发送结果。可返回普通大厅自行游玩。');return}
close();const selection=Object.assign({},window.Lobby?.selection?.()||{},{mode:'story',stage:0,stageId:'s0'});window.Lobby?.hide();start(selection)}
window.addEventListener('storage',e=>{if(key&&e.key===key&&result){const d=get();if(d){result=d;showResult()}}});
window.GameInviteV0=Object.freeze({requested:()=>requested,id:()=>inviteId,active:()=>active,preview:()=>clone(result),games:()=>[...games],launch(gameId,start){if(!requested)return false;if(!games.has(gameId))return false;active=true;game=gameId;window.Lobby?.hide();resolveAndStart(start).catch(()=>ui('邀请暂不可用','无法校验邀请，请返回聊天。'));return true},finish});
})();
