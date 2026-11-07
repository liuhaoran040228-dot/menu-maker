(()=>{'use strict';const $=id=>document.getElementById(id),q=new URLSearchParams(location.search),mock=q.get('mock')==='1',live=!mock&&window.STAR_SHOP_LIVE===true,page=document.body.dataset.page;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let wallet=mock?1280:0,busy=false,timer;
 const art=p=>/^assets\/shop-paid-[a-z0-9-]+\.webp$/.test(p)?p:'';
 function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
 function balance(){$('balance').textContent=wallet.toLocaleString('zh-CN');}
 $('notice').textContent=mock?'独立演示 · 余额、进度与抽取均不连接真实账号':live?'星糖账号同步 · 奖励由服务器核算':'本地审核预览 · 真实任务与抽取尚未开放';balance();
 const block=()=>toast('系统仍在本地审核，暂不操作真实星糖');
 let tasks=[
 {id:'daily_signin',name:'每日签到',progress:mock?1:0,target:1,reward:5,enabled:true,claimed:false,icon:'☀',desc:'在商城完成当天普通签到后可领取'},
 {id:'daily_visit',name:'逛逛星糖商城',progress:mock?1:0,target:1,reward:5,enabled:true,claimed:false,icon:'♧',desc:'每天一次小小的心动探索'},
 {id:'daily_play',name:'完成两局小游戏',progress:mock?1:0,target:2,reward:10,enabled:true,claimed:false,icon:'✧',desc:'低信任进度，每天最多计两局'},
 {id:'daily_chat',name:'分享一条友善消息',progress:0,target:1,reward:20,enabled:false,claimed:false,icon:'☁',desc:'待聊天服务接通审核后开放'},
 {id:'weekly_signin',name:'本周签到5天',progress:mock?2:0,target:5,reward:20,enabled:true,claimed:false,icon:'☾',desc:'把喜欢的日常，连成星光'},
 {id:'weekly_play',name:'本周完成10局游戏',progress:mock?4:0,target:10,reward:20,enabled:true,claimed:false,icon:'✦',desc:'每日完成局数上限依然生效'}];
 function renderTasks(){for(const period of ['daily','weekly']){$(period+'Tasks').innerHTML=tasks.filter(t=>t.id.startsWith(period)).map(t=>`<article class="task ${t.enabled?'':'closed'}"><span class="task-icon">${t.icon||'✧'}</span><div class="task-main"><h3>${esc(t.name)}</h3><p>${esc(t.desc||'每日一点点，慢慢攒星光')}</p><div class="progress"><span style="width:${Math.min(100,100*t.progress/t.target)}%"></span></div><div class="task-tail"><small>${t.progress} / ${t.target} <b>✦ +${t.reward}</b></small><button type="button" data-task="${esc(t.id)}" ${busy||!t.enabled||t.claimed?'disabled':''}>${!t.enabled?'待开放':t.claimed?'已领取 ✓':t.progress>=t.target?'领取星糖':mock?'演示进度 +1':'去完成'}</button></div></div></article>`).join('');}}
 async function loadTasks(){try{const d=await StarEconomy.getTasks(),s=await StarEconomy.getWallet();tasks=d.tasks.map(t=>({...tasks.find(x=>x.id===t.id),...t}));wallet=s.balance;balance();renderTasks();}catch(e){toast(e.message||'同步失败，请重试');}}
 if(page==='tasks'){
  renderTasks();document.addEventListener('click',async e=>{const b=e.target.closest('[data-task]');if(!b||busy)return;const t=tasks.find(x=>x.id===b.dataset.task);if(!mock&&!live){block();return;}
   if(t.progress<t.target){if(mock){t.progress=Math.min(t.target,t.progress+1);renderTasks();toast('演示进度已更新，不代表真实完成');}else{location.href=t.id==='daily_visit'?'shop.html':'tools.html';}return;}
   busy=true;renderTasks();try{if(mock){if(!t.claimed){wallet+=t.reward;t.claimed=true;}}else{const s=await StarEconomy.claimTask(t.id);wallet=s.balance;await loadTasks();}balance();toast(mock?'演示奖励已领取，无真实星糖变动':'奖励已收好');}catch(e){toast(e.message||'领取失败');}finally{busy=false;renderTasks();}
  });if(live)bootstrap(loadTasks);
 }
 let since=Math.max(0,Math.min(59,Number(q.get('mockPity')||0)||0)),inventory=new Set(),pending=null,total=0;
 const paid=window.StarShopCatalog||[],limited=window.StarGachaLimited||[],rarities={common:paid.filter(x=>['avatar','bubble'].includes(x.category)),rare:paid.filter(x=>['background','pendant'].includes(x.category)),limited};
 function randomInt(max){const a=new Uint32Array(1);crypto.getRandomValues(a);return Math.floor(a[0]/4294967296*max);}
 function renderGacha(){balance();$('pityCount').textContent=60-since;for(const id of ['singleDraw','tenDraw'])$(id).disabled=busy;$('drawStatus').textContent=`已祈愿 ${total} 次 · 结果与收藏跟随账号${mock?'（本页为独立演示）':''}`;}
 function simulate(count){const cost=count===1?100:900;if(wallet<cost)throw Error('星糖余额不足，可以先去完成每日任务');wallet-=cost;const results=[];let refunded=0;
  for(let n=0;n<count;n++){const pity=since>=59,roll=randomInt(10000),rarity=pity||roll>=9800?'limited':roll>=8000?'rare':'common',pool=rarities[rarity],item=pool[randomInt(pool.length)],duplicate=inventory.has(item.id),refund=duplicate?({common:10,rare:25,limited:50}[rarity]):0;inventory.add(item.id);wallet+=refund;refunded+=refund;since=rarity==='limited'?0:since+1;total++;results.push({item_id:item.id,rarity,duplicate,refund,pity_triggered:pity});}
  return {results,refunded};
 }
 function showResults(data){const result=$('resultsGrid');result.classList.toggle('single-result',data.results.length===1);result.innerHTML=data.results.map(r=>{const item=[...paid,...limited].find(x=>x.id===r.item_id)||{name:'星光收藏',preview:''};return `<article class="result ${r.rarity}"><span class="result-tag">${r.rarity==='limited'?'限定':r.rarity==='rare'?'珍稀':'普通'}${r.pity_triggered?' · 保底':''}</span><img src="${art(item.preview)}" alt="${esc(item.name)}"><h3>${esc(item.name)}</h3><small>${r.duplicate?`重复转为 ${r.refund} 星糖`:'新收藏 · 永久拥有'}</small></article>`;}).join('');$('refundText').textContent=`${mock?'独立演示，不发放真实物品。 ':''}${data.refunded?'重复收藏共返还 '+data.refunded+' 星糖。':'新的星光已加入收藏。'}`;$('drawResults').showModal();}
 async function loadGacha(){try{const s=await StarEconomy.getGachaState();wallet=s.balance;since=s.since_limited;total=s.total_pulls;renderGacha();}catch(e){toast(e.message||'同步失败');}}
 if(page==='gacha'){
  $('limitedGrid').innerHTML=limited.map(x=>`<article class="limited-card"><span>LIMITED · 0.5%</span><img src="${art(x.preview)}" alt="${esc(x.name)}"><h3>${esc(x.name)}</h3><p>祈愿限定 · 原创背景皮肤</p></article>`).join('');renderGacha();
  function confirm(count){if(busy)return;if(!mock&&!live){block();return;}if(pending&&pending.count!==count){toast('上一批请求状态未确认，请先重试原来的抽取数量');return;}const cost=count===1?100:900;if(wallet<cost&&!pending){toast('星糖余额不足，可以先完成每日任务');return;}pending=pending||{count,key:crypto.randomUUID()};$('confirmText').textContent=`${count===1?'单次祈愿':'十次祈愿'} · 消耗 ${cost} 星糖${mock?'（仅演示）':''}`;$('drawConfirm').showModal();}
  $('singleDraw').onclick=()=>confirm(1);$('tenDraw').onclick=()=>confirm(10);$('cancelDraw').onclick=()=>{$('drawConfirm').close();if(!pending?.submitted)pending=null;else toast('上一批状态仍待确认，再次祈愿会重试原请求');};$('drawConfirm').addEventListener('cancel',()=>{if(!pending?.submitted)pending=null;});
  $('confirmDraw').onclick=async()=>{if(busy||!pending)return;const request=pending;request.submitted=true;$('drawConfirm').close();busy=true;renderGacha();$('wishOrb').classList.add('drawing');
   try{const result=mock?simulate(request.count):await StarEconomy.drawGacha(request.count,request.key);if(!mock){wallet=result.balance;since=result.since_limited;total=result.total_pulls;}pending=null;await new Promise(r=>setTimeout(r,matchMedia('(prefers-reduced-motion: reduce)').matches?0:1200));showResults(result);}
   catch(e){toast((e.message||'请求状态未确认')+(mock?'':'；重试原抽取会复用同一请求号'));}
   finally{busy=false;$('wishOrb').classList.remove('drawing');renderGacha();}
  };$('closeResults').onclick=()=>$('drawResults').close();if(live)bootstrap(loadGacha);
 }
 function bootstrap(done){if(window.StarAccount){done();return;}const s=document.createElement('script');s.src='vip.js';s.onerror=()=>toast('账号组件加载失败');s.onload=()=>{if(window.StarAccount)done();};document.body.append(s);let last=0;window.addEventListener('vipchange',()=>{if(Date.now()-last>500){last=Date.now();done();}});}
})();
