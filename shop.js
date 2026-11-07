/* 星糖商城. LOCAL_PREVIEW is intentional. Enable live only after migration + security review.
   Mock has isolated memory only; no real codes, accounts, RPCs or persistent balances. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), params=new URLSearchParams(location.search);
 const mock=params.get('mock')==='1', live=!mock&&window.STAR_SHOP_LIVE===true;
 const daily=[0,20,30,40,55,70,90,115,150];
 const categories=[['all','✧','精选'],['outfit','♧','服饰套装'],['background','▧','背景'],['avatar','♡','头像'],['bubble','☁','聊天气泡'],['pendant','♛','挂件']];
 const labels={avatar:'原创头像',bubble:'聊天气泡',pendant:'华丽挂件',background:'整屏皮肤',outfit:'整套服饰'};
 let connected=false,visitKey;
 let catalog=window.StarShopCatalog||[], category='all', busy=false, selected=null, timer, loading=false, requestSerial=0;
 let state={balance:0,tier:0,claimed:false,vip_claimed:false,inventory:[],equipped:{}};
 if(mock) state={...state,balance:1280,tier:Math.max(0,Math.min(8,Number(params.get('mockTier')||4)||0))};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('visible'),3600);}
 function tier(){if(mock||live)return state.tier;return window.StarAccount?.tier?.()||window.VIP?.tier?.()||0;}
 function imageURL(path){return /^(assets\/[a-z0-9-]+\.webp)$/.test(path)?path:'';}
 function preview(item){
  if(item.category==='bubble')return `<div class="preview bubble paid-bubble"><img class="bubble-skin-art" src="${imageURL(item.preview)}" alt="${escape(item.name)}原创气泡边框" loading="lazy"><span class="paid-bubble-text">今天也要闪闪发光呀 ✧</span></div>`;
  const src=imageURL(item.preview);
  return `<div class="preview ${escape(item.category)}">${src?`<img src="${src}" alt="${escape(item.name)}预览" loading="lazy">`:'<span>✧</span>'}</div>`;
 }
 function render(){
  const t=tier();$('balance').textContent=state.balance.toLocaleString('zh-CN');
  $('dailyHint').textContent=t?`签到 +5 · VIP${t} 每日 +${daily[t]} 星糖`:'普通签到 +5 星糖 · VIP 额外领取专属星糖';
  const done=state.claimed&&(t===0||state.vip_claimed);
  $('claimBtn').textContent=busy?'正在处理…':done?'今日已领取 ✓':'领取今日星糖';
  $('claimBtn').disabled=busy||done;
  $('accountBtn').textContent=mock?`VIP${t} 演示`:'账号';
  $('ownedOnly').disabled=loading;
  $('appearancePublic').checked=Boolean(state.sharing);$('appearancePublic').disabled=busy||(!mock&&!connected);
  $('tabs').innerHTML=categories.map(([id,icon,name])=>`<button type="button" data-category="${id}" class="${category===id?'active':''}" aria-pressed="${category===id}">${icon} ${name}</button>`).join('');
  const visible=catalog.filter(x=>(category==='all'||x.category===category)&&(!$('ownedOnly').checked||state.inventory.includes(x.id)));
  $('catalogCount').textContent=`${$('ownedOnly').checked?'已收藏':'为你挑选'} ${visible.length} 件心动好物`;
  $('products').innerHTML=visible.length?visible.map(x=>{
   const own=state.inventory.includes(x.id), wearing=state.equipped[x.category]===x.id,locked=!own&&t<x.min_tier;
   return `<article class="product">${preview(x)}<span class="product-badge ${x.min_tier?'vip':''}">${x.min_tier?'VIP'+x.min_tier+' 限购':'永久收藏'}</span><div class="product-body"><h3>${escape(x.name)}</h3><span class="product-desc">${labels[x.category]} · ${own?'已收藏，永久拥有':'原创精选 / 购买后永久拥有'}</span><div class="purchase-row"><span class="price">${own?'✓ 已拥有':`✦ ${x.price} <small>星糖</small>`}</span><button type="button" class="buy-btn ${wearing?'equipped':''}" data-item="${escape(x.id)}" ${busy||wearing?'disabled':''}>${wearing?'已选用':own?'选用':locked?'VIP'+x.min_tier+' 限定':'兑换'}</button></div></div></article>`;
  }).join(''):'<div class="empty"><span>✧</span>这里还没有收藏的小星光<br>去精选里挑一份心动吧。</div>';
  $('redeemForm').querySelector('button').disabled=busy;
 }
 function unavailable(){toast(mock?'这是独立演示，不会操作真实账号':'商城仍在本地预览，尚未开放真实领取与兑换');}
 function ensureAction(){if(!mock&&!live){unavailable();return false;}return true;}
 async function api(name,args={}){
  if(!live)throw Error('商城尚未开放');
  if(!window.StarAccount?.shopRequest)throw Error('账号组件未就绪，请稍后重试');
  return window.StarAccount.shopRequest(name,args);
 }
 function accept(next){
  if(!next||next.error)throw Error(next?.error||'服务暂时不可用');
  state={...state,...next,inventory:Array.isArray(next.inventory)?next.inventory:state.inventory,equipped:next.equipped||state.equipped};
 }
 async function transaction(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){toast(e?.message||'操作失败，请稍后重试');}finally{busy=false;render();}}
 $('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;render();}});
 $('ownedOnly').addEventListener('change',render);
 $('appearancePublic').onchange=()=>{const enabled=$('appearancePublic').checked;if(mock){state.sharing=enabled;toast('仅演示公开展示设置，不会修改真实账号');return;}const previous=Boolean(state.sharing);state.sharing=enabled;transaction(async()=>{try{const r=await api('set_public_appearance',{enabled});state.sharing=r.enabled;toast(r.enabled?'已公开展示头像与装扮，可随时关闭':'已关闭公开展示');}catch(e){state.sharing=previous;throw e;}});};
 $('claimBtn').onclick=()=>{if(!ensureAction())return;transaction(async()=>{
  let credit=0;
  if(mock){if(!state.claimed){credit=5;state.claimed=true;}if(state.tier&&!state.vip_claimed){credit+=daily[state.tier];state.vip_claimed=true;}state.balance+=credit;}
  else{const next=await api('claim_daily');credit=next.credited||0;accept(next);}
  toast(credit?`已收好 ${credit} 星糖${mock?' · 仅演示':''}`:'今天已领取，明天再来呀');
 });};
 $('products').addEventListener('click',e=>{const b=e.target.closest('[data-item]');if(!b||busy)return;const item=catalog.find(x=>x.id===b.dataset.item);if(!item)return;if(!ensureAction())return;
  if(state.inventory.includes(item.id)){transaction(async()=>{
   if(mock)state.equipped[item.category]=item.id;else accept(await api('equip_item',{item_id:item.id}));
   toast(`已选用「${item.name}」${mock?' · 仅演示':' · 已保存至商城装扮'}`);
   window.dispatchEvent(new CustomEvent('starshopchange',{detail:{equipped:{...state.equipped},mock}}));
  });return;}
  if(tier()<item.min_tier){toast(`购买需要 VIP${item.min_tier}，拥有后不再受VIP期限限制`);return;}
  if(state.balance<item.price){toast('星糖还差一点，先领今日福利再来看看吧');return;}
  selected=item;$('purchasePreview').innerHTML=preview(item);$('purchaseName').textContent=item.name;
  $('purchaseCost').textContent=`✦ ${item.price} 星糖 · 兑换后剩余 ${(state.balance-item.price).toLocaleString('zh-CN')}`;
  $('confirmPurchase').textContent=mock?'演示兑换':'确认兑换';$('purchaseDialog').showModal();
 });
 $('cancelPurchase').onclick=()=>$('purchaseDialog').close();
 $('purchaseDialog').addEventListener('click',e=>{if(e.target!==$('purchaseDialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();});
 $('confirmPurchase').onclick=()=>{if(!selected||busy)return;const item=selected;selected=null;$('purchaseDialog').close();transaction(async()=>{
  if(mock){if(!state.inventory.includes(item.id)){if(state.balance<item.price)throw Error('星糖余额不足');if(state.tier<item.min_tier)throw Error('VIP等级不足');state.balance-=item.price;state.inventory.push(item.id);}}
  else accept(await api('buy_item',{item_id:item.id}));
  toast(`「${item.name}」已加入收藏${mock?' · 仅演示':''}`);
 });};
 $('redeemForm').onsubmit=e=>{e.preventDefault();if(!ensureAction()){$('currencyCode').value='';return;}
  if(mock){$('currencyCode').value='';toast('演示模式不验证兑换码，也不发放真实星糖');return;}
  const code=$('currencyCode').value.trim();$('currencyCode').value='';if(!code){toast('请先输入星糖兑换码');return;}
  transaction(async()=>{const next=await api('redeem_currency_code',{code});accept(next);toast(`已到账 ${next.credited||0} 星糖`);});
 };
 $('accountBtn').onclick=()=>{if(mock){unavailable();return;}if(window.StarAccount?.open)window.StarAccount.open();else unavailable();};
 async function refresh(){
  if(!live)return;connected=false;loading=true;const serial=++requestSerial;
  // Clear old account data before refresh; never leak previous account wallet in a shared session.
  state={balance:0,tier:window.StarAccount?.tier?.()||0,claimed:false,vip_claimed:false,inventory:[],equipped:{}};render();
  try{const rows=await window.StarAccount.shopCatalog();if(serial!==requestSerial)return;
   const next=await api('get_shop_state');if(serial!==requestSerial)return;catalog=rows;accept(next);const appearance=await api('get_public_appearance');if(serial!==requestSerial)return;state.sharing=Boolean(appearance[0]?.appearance_public);connected=true;
   try{const key='star-shop-visit-'+next.day;visitKey=sessionStorage.getItem(key)||crypto.randomUUID();sessionStorage.setItem(key,visitKey);}catch(_){visitKey=visitKey||crypto.randomUUID();}await api('report_task_event',{event_type:'visit_shop',idempotency_key:visitKey});if(serial!==requestSerial)return;
   $('catalogStatus').textContent='余额与收藏已从账号同步';$('retryBtn').hidden=true;
  }catch(e){if(serial!==requestSerial)return;$('catalogStatus').textContent=e?.message||'加载失败，请重试';$('retryBtn').hidden=false;}
  finally{if(serial===requestSerial){loading=false;render();}}
 }
 $('retryBtn').onclick=refresh;
 document.addEventListener('visibilitychange',()=>{if(live&&!document.hidden&&!busy)refresh();});
 window.addEventListener('vipchange',()=>{if(live)refresh();else render();});
 $('modeNotice').textContent=mock?'独立演示 · 余额与商品操作仅在当前页面有效，不连接账号':live?'星糖商城 · 账号同步 · 星糖仅限站内使用':'本地预览 · 商城未开放，暂不领取或扣款';
 render();
 if(live){const script=document.createElement('script');script.src='vip.js';script.onerror=()=>{$('catalogStatus').textContent='账号组件加载失败，请刷新重试';};script.onload=()=>{if(window.StarAccount)refresh();};document.body.append(script);}
 // Deliberately do not load account SDK in mock/preview: all QA is offline and zero-write.
 window.StarShop={mode:mock?'mock':live?'live':'preview',refresh,getState:()=>JSON.parse(JSON.stringify(state))};
})();
