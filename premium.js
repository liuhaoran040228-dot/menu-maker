/* Premium presentation is driven by the account-state RPC, never user metadata. */
window.StarPremium=(()=>{'use strict';
const root=new URL('.',document.currentScript.src).href;
const thresholds=[1,3,6,12,24,36,60,96];
const titles=['星海初绽','月汐流光','银河逐梦','幻夜星冠','晶海绮梦','月神华章','极光圣翼','星穹帝冕'];
const themes=[
{id:'default',name:'经典星糖',file:'',tier:0,level:1},
{id:'level-moon',name:'月光花园',file:'bg-moon.webp',tier:0,level:5},
{id:'level-forest',name:'秘境森林',file:'bg-forest.webp',tier:0,level:10},
{id:'ocean',name:'鲸落海城',file:'bg-undersea.webp',tier:1},
{id:'sakura',name:'樱色约定',file:'bg-sakura.webp',tier:2},
{id:'galaxy',name:'银河来信',file:'bg-space.webp',tier:3},
{id:'neon',name:'霓虹夜航',file:'bg-neon.webp',tier:4},
{id:'crystal',name:'晶海绮梦',file:'vip-crystal.webp',tier:5},
{id:'lunar',name:'月神花庭',file:'vip-lunar.webp',tier:6},
{id:'aurora',name:'极光天轨',file:'vip-aurora.webp',tier:7},
{id:'palace',name:'星穹帝宫',file:'vip-palace.webp',tier:8}];
let state=null,handlers={},lastThemeKey='',lastUser=null,themeDialog,perksDialog,toast;
function glyph(t=1){return `<svg class="vip-jewel prestige-art" viewBox="0 0 240 160" aria-hidden="true"><image href="${root}assets/vip-emblem-${t}.webp" x="0" y="0" width="240" height="150" preserveAspectRatio="xMidYMid meet"/><rect x="88" y="130" width="64" height="23" rx="9" fill="#39254f" stroke="#ffe7ac" stroke-width="1" opacity=".93"/><text x="120" y="146" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="900" fill="#ffedb6">VIP${t}</text></svg>`;}
function badge(t,large=false){return `<span class="vip-emblem tier-${t}${large?' large':''}">${glyph(t)}<strong>VIP${t}</strong><i>${titles[t-1]}</i></span>`;}
function levelIcon(l){return l>=40?'♛':l>=20?'☀':l>=10?'☾':l>=5?'✦':'★';}
function attach(dialog,h){handlers=h;
const member=dialog.querySelector('#account-member');
const level=document.createElement('section');level.className='account-level-card';level.id='account-level-card';member.querySelector('.account-user').after(level);
const actions=document.createElement('div');actions.className='premium-shortcuts';actions.innerHTML='<button type="button" id="premium-themes">✧ 专属背景</button><button type="button" id="premium-perks">♛ 等级权益</button>';member.querySelector('.account-perks').after(actions);
const identity=member.querySelector('.account-user>div');const mark=document.createElement('div');mark.id='profile-vip-mark';identity.append(mark);
for(const id of ['premium-themes','premium-perks'])member.querySelector('#'+id).onclick=()=>open(id==='premium-themes'?'themes':'perks');
themeDialog=document.createElement('dialog');themeDialog.className='premium-dialog';themeDialog.id='premium-themes-dialog';themeDialog.setAttribute('aria-label','专属背景与壁纸');document.body.append(themeDialog);
perksDialog=document.createElement('dialog');perksDialog.className='premium-dialog';perksDialog.id='premium-perks-dialog';perksDialog.setAttribute('aria-label','VIP与账号等级权益');document.body.append(perksDialog);
for(const d of [themeDialog,perksDialog])d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
toast=document.createElement('div');toast.className='premium-xp-toast';toast.setAttribute('role','status');document.body.append(toast);
}
function open(which){if(!state)return;renderPopups();(which==='themes'?themeDialog:perksDialog).showModal();}
function applyBackground(s,userId,active){
let id=s?.profile?.background_id||'default';const theme=themes.find(x=>x.id===id);if(!userId||(theme?.tier&&!active))id='default';
const key=userId+':'+id;if(key===lastThemeKey)return;lastThemeKey=key;
const chosen=themes.find(x=>x.id===id);document.body.classList.toggle('premium-site-theme',!!chosen?.file);document.body.dataset.siteTheme=id;
const account=document.getElementById('star-account');if(account)account.style.setProperty('--account-bg',`url("${root}assets/${chosen?.file||'bg-undersea.webp'}")`);
if(chosen?.file)document.documentElement.style.setProperty('--premium-bg',`url("${root}assets/${chosen.file}")`);else document.documentElement.style.removeProperty('--premium-bg');
}
function render({data,user,active,button,rotateButton}){
 state=data;const tier=active?Number(data?.vip?.tier||0):0,l=Number(data?.profile?.level||1),frame=active?Number(data?.entitlements?.frame_rank||0):(l>=20?4:l>=10?2:l>=5?1:0);
 document.body.dataset.vipTier=tier;document.body.dataset.accountLevel=l;
 for(const b of [button,rotateButton]){
 b.dataset.tier=tier;b.classList.toggle('premium-account',tier>0);
 if(!tier&&b.querySelector('svg')?.dataset.tier){b.querySelector('svg').outerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></svg>';}
 if(tier){const svg=b.querySelector('svg');if(svg&&svg.dataset.tier!==String(tier)){svg.outerHTML=glyph(tier).replace('<svg ','<svg data-tier="'+tier+'" ');}const caption=b.querySelector('span');if(caption)caption.textContent='VIP'+tier;}
 }
 applyBackground(data,user?.id,active);
 const profile=document.getElementById('profile-vip-mark'),lv=document.getElementById('account-level-card');
 if(!profile||!lv)return;
 const mark=tier?badge(tier):'<span class="free-traveler">星糖旅人 · 免费账号</span>';if(profile.innerHTML!==mark)profile.innerHTML=mark;
 const account=document.getElementById('star-account');account.dataset.tier=tier;account.dataset.frame=frame;
 const xp=Number(data?.profile?.xp||0),floor=Number(data?.profile?.level_floor||0),next=Number(data?.profile?.next_level_xp||100),pct=Math.max(0,Math.min(100,(xp-floor)/(next-floor)*100));
 const html=`<div class="level-top"><span class="level-symbol level-${Math.min(4,Math.floor(l/5))}">${levelIcon(l)}</span><b>Lv.${l} <small>${l>=20?'星曜领航':l>=10?'月辉旅者':l>=5?'星芒冒险家':'初星旅人'}</small></b><em>${xp} XP</em></div><div class="level-track"><span style="width:${pct}%"></span></div><div class="level-meta"><span>下一级 ${Math.max(0,next-xp)} XP</span><span>今日游戏 ${data?.daily?.play_awards||0}/${data?.entitlements?.max_play_awards||10}</span></div>`;
 if(lv.innerHTML!==html)lv.innerHTML=html;
 const card=account.querySelector('.account-vip-card');card.classList.toggle('premium-vip-card',tier>0);
 if(tier){account.querySelector('#account-vip-title').textContent=`VIP${tier} · ${titles[tier-1]}`;}
 lastUser=user?.id||null;
 if(themeDialog?.open||perksDialog?.open)renderPopups();
}
function renderPopups(){if(!themeDialog||!state)return;const allowed=state.entitlements?.background_ids||['default'],current=state.profile?.background_id||'default',tier=state.vip?.active?state.vip.tier:0;
 themeDialog.innerHTML=`<header class="premium-modal-head"><span>EXCLUSIVE COLLECTION</span><h2>把星海，换成喜欢的样子</h2><p>背景跟随账号同步 · 游戏地图保持原场景</p><button type="button" class="premium-close" aria-label="关闭背景选择">×</button></header><div class="premium-modal-body"><div class="theme-grid">${themes.map(t=>`<button type="button" class="theme-choice ${t.id===current?'selected':''} ${allowed.includes(t.id)?'':'locked'}" data-theme="${t.id}" ${allowed.includes(t.id)?'':'disabled'} style="${t.file?'--preview:url('+root+'assets/'+t.file+')':''}"><span class="theme-preview">${t.id===current?'<i>使用中</i>':!allowed.includes(t.id)?'<i>♢ 未解锁</i>':''}</span><b>${t.name}</b><small>${t.tier?'VIP'+t.tier+' · 专属壁纸':t.level>1?'Lv.'+t.level+' · 成长解锁':'免费基础背景'}</small></button>`).join('')}</div><p class="premium-info">VIP等级越高，专属背景与壁纸收藏越丰富。会员到期自动恢复基础背景，续期后保留已保存的选择。</p><button type="button" id="premium-download" ${allowed.includes(current)&&current!=='default'?'':'disabled'}>↓ 保存当前已解锁壁纸</button><p id="premium-theme-feedback" role="status"></p></div>`;
 themeDialog.querySelector('.premium-close').onclick=()=>themeDialog.close();
 for(const btn of themeDialog.querySelectorAll('[data-theme]'))btn.onclick=async()=>{btn.disabled=true;try{await handlers.setBackground(btn.dataset.theme);}catch(e){const f=themeDialog.querySelector('#premium-theme-feedback');if(f)f.textContent=e.message;}finally{btn.disabled=false;}};
 themeDialog.querySelector('#premium-download').onclick=async()=>{const t=themes.find(x=>x.id===current);if(!t?.file||!allowed.includes(t.id))return;const b=await fetch(root+'assets/'+t.file).then(r=>r.blob()),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='星糖宇宙-'+t.name+'.webp';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const unlocks=['鲸落海城壁纸 · 樱糖粉皮肤','樱色约定壁纸 · 跑酷生命 +1','银河来信壁纸 · 星河蓝皮肤','霓虹夜航壁纸 · 跑酷生命 +2','晶海绮梦壁纸 · 晶辉铭牌','月神花庭壁纸 · 跑酷生命 +3','极光天轨壁纸 · 冰翼流光','星穹帝宫壁纸 · 幻彩帝冕'];
 perksDialog.innerHTML=`<header class="premium-modal-head"><span>STAR CANDY · PRESTIGE</span><h2>每一颗星，都值得闪耀</h2><p>累计兑换月数升级 · 年卡计 12 月 · 权益逐级累加</p><button type="button" class="premium-close" aria-label="关闭等级权益">×</button></header><div class="premium-modal-body"><div class="tier-ladder">${thresholds.map((n,i)=>`<article class="tier-row ${tier===i+1?'current':''}"><div>${badge(i+1)}<small>累计 ${n} 月</small></div><section><b>${unlocks[i]}</b><p>共 ${i+1} 款专属背景/壁纸 · ${(1+(i+1)/10).toFixed(1)}× 经验</p><span>VIP${i+1}专属头像挂件 · ${i>=6?'流光羽翼':i>=4?'冠冕':'星钻'}徽章 · ${i>=5?'渐变':'星辉'}昵称</span></section></article>`).join('')}</div><h3>账号成长也有礼物</h3><div class="level-perk-list"><p><b>Lv.1</b> 每日登录 +10 基础经验；游戏活跃每 60 秒 +5 基础经验，每日10次。</p><p><b>Lv.5</b> 解锁月光花园背景、星芒头像框；游戏每日上限12次。</p><p><b>Lv.10</b> 解锁秘境森林背景、月辉头像框；游戏每日上限14次。</p><p><b>Lv.15</b> 游戏每日上限16次，之后不再增加。</p><p><b>Lv.20 / 40</b> 太阳 / 皇冠成长图标，解锁曜日华章 / 星王冠冕挂件。</p></div><p class="premium-info">经验加成由服务器计算并取整；重登不重复领取。活跃时长、每日上限与背景解锁均由后台校验。历史永久会员保留权益，按 VIP8 展示。VIP1–VIP8各有专属头像框与悬挂徽章；Lv.5/10/20/40成长挂件无需会员。到期隐藏VIP挂件，续期恢复原选择。游戏皮肤是静态网页内的便捷门槛，不是防破解 DRM。</p></div>`;
 perksDialog.querySelector('.premium-close').onclick=()=>perksDialog.close();
}
function xpToast(gain){if(!gain||!toast)return;toast.textContent='✦ +'+gain+' XP · 星光成长';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600);}
return {attach,render,xpToast,badge,themes,thresholds,open};
})();
