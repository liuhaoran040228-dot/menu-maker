(()=>{'use strict';
const STORAGE_PREFIX='starcandy_platform_';
const STORAGE_KEYS={profile:'profile',settings:'settings',notifications:'notifications',search:'search',feedback:'feedback'};
const NOTIFICATION_ANNOUNCEMENTS=[{id:'welcome-2026',title:'欢迎来到星糖宇宙',content:'发现原创游戏、创作工具与换装系统。',time:'2026-11-08'},{id:'update-1-0',title:'平台功能预览',content:'设置、搜索与资料工具正在本地预览；以已发布版本为准。',time:'2026-11-08'}];
const GAME_TOOLS_ROUTES=[{name:'云阙问仙',path:'xiuxian/',category:'games'},{name:'太空射手',path:'space-shooter/',category:'games'},{name:'贪吃蛇',path:'snake/',category:'games'},{name:'格斗大师',path:'fighter/',category:'games'},{name:'怪物掠夺',path:'monster-loot/',category:'games'},{name:'萌宠跑酷',path:'moe-runner/',category:'games'},{name:'莉莉合并',path:'lili-merge/',category:'games'},{name:'莉莉配对',path:'lili-match/',category:'games'},{name:'莉莉 2048',path:'lili-2048/',category:'games'},{name:'莉莉财运',path:'lili-fortune/',category:'games'},{name:'我的衣橱',path:'lili-dressup/',category:'games'},{name:'故事模式',path:'story/',category:'games'},{name:'幸存者',path:'survivor/',category:'games'},{name:'塔防',path:'td/',category:'games'},{name:'菜单海报',path:'index.html',category:'tools'},{name:'封面卡片',path:'cover-maker/',category:'tools'},{name:'价目海报',path:'price-poster/',category:'tools'},{name:'九宫格切图',path:'grid-cut/',category:'tools'},{name:'标题灵感',path:'xhs-title/',category:'tools'},{name:'文本整理',path:'text-clean/',category:'tools'}];

function storage(key,value){try{if(value===undefined){const v=JSON.parse(localStorage.getItem(STORAGE_PREFIX+key)||'null');return v&&typeof v==='object'||typeof v==='boolean'?v:null;}localStorage.setItem(STORAGE_PREFIX+key,JSON.stringify(value));return true;}catch{if(value!==undefined)throw Error('浏览器不允许保存，操作未完成');return null;}}
window.addEventListener('error',e=>{if(e.message.includes('浏览器不允许保存')){e.preventDefault();const target=document.querySelector('[role="status"],.form-status');if(target)target.textContent='浏览器不允许保存，操作未完成';}});
function confirmInline(button,action){if(button.dataset.confirming==='yes'){delete button.dataset.confirming;button.textContent=button.dataset.original;action();return;}button.dataset.original=button.textContent;button.dataset.confirming='yes';button.textContent='再次点击确认（5秒内）';setTimeout(()=>{if(button.dataset.confirming){delete button.dataset.confirming;button.textContent=button.dataset.original;}},5000);}


function showStatus(el,msg,type='info',duration=3000){if(!el)return;el.textContent=msg;el.className='form-status '+type;if(duration>0)setTimeout(()=>{el.textContent=''},duration)}

function getCurrentPage(){return location.pathname.split('/').pop().replace('.html','')||'tools'}

// Profile Page
if(getCurrentPage()==='profile'||location.pathname.includes('profile.html')){const nicknameInput=document.getElementById('profileNickname');const bioInput=document.getElementById('profileBio');const privacyCheckbox=document.getElementById('profilePrivacy');const avatarOptions=document.querySelectorAll('.avatar-option');const saveBtn=document.getElementById('profileSave');const resetBtn=document.getElementById('profileReset');const status=document.getElementById('profileStatus');

function loadProfile(){const data=storage(STORAGE_KEYS.profile)||{nickname:'',bio:'',avatar:'whale',privacy:false};nicknameInput.value=data.nickname||'';bioInput.value=data.bio||'';privacyCheckbox.checked=data.privacy||false;avatarOptions.forEach(btn=>{btn.classList.toggle('selected',btn.dataset.avatar===data.avatar)})}

function saveProfile(){if(!nicknameInput.value.trim()){showStatus(status,'昵称不能为空','error');return}
const selected=document.querySelector('.avatar-option.selected');const data={nickname:nicknameInput.value.trim(),bio:bioInput.value.trim(),avatar:(selected?.dataset.avatar||'whale'),privacy:privacyCheckbox.checked};storage(STORAGE_KEYS.profile,data);showStatus(status,'✓ 档案已保存到本地浏览器','success');window.dispatchEvent(new Event('profilechange'))}

function resetProfile(){if(true){nicknameInput.value='';bioInput.value='';privacyCheckbox.checked=false;avatarOptions.forEach(btn=>btn.classList.remove('selected'));document.querySelector('.avatar-option[data-avatar="whale"]')?.classList.add('selected');showStatus(status,'已重置','info')}}

avatarOptions.forEach(btn=>{btn.addEventListener('click',()=>{avatarOptions.forEach(b=>b.classList.remove('selected'));btn.classList.add('selected')})});
saveBtn?.addEventListener('click',saveProfile);
resetBtn?.addEventListener('click',()=>confirmInline(resetBtn,resetProfile));
loadProfile()}

// Settings Page
if(getCurrentPage()==='settings'||location.pathname.includes('settings.html')){const themeRadios=document.querySelectorAll('input[name="theme"]');const soundCheckbox=document.getElementById('soundEnabled');const soundVolume=document.getElementById('soundVolume');const volumeControl=document.getElementById('volumeControl');const notificationCheckbox=document.getElementById('notificationEnabled');const clearCacheBtn=document.getElementById('clearCache');const logoutBtn=document.getElementById('logoutBtn');const status=document.getElementById('settingsStatus');

function loadSettings(){const data=storage(STORAGE_KEYS.settings)||{theme:'system',soundEnabled:true,soundVolume:70,notificationEnabled:true};const validTheme=['light','dark','system'].includes(data.theme)?data.theme:'system';const themeRadio=document.querySelector(`input[name="theme"][value="${validTheme}"]`);if(themeRadio)themeRadio.checked=true;soundCheckbox.checked=data.soundEnabled;soundVolume.value=data.soundVolume;volumeControl.hidden=!data.soundEnabled;document.getElementById('volumeValue').textContent=data.soundVolume+'%';notificationCheckbox.checked=data.notificationEnabled;applyTheme(data.theme)}

function saveSettings(){const data={theme:document.querySelector('input[name="theme"]:checked')?.value||'system',soundEnabled:soundCheckbox.checked,soundVolume:parseInt(soundVolume.value),notificationEnabled:notificationCheckbox.checked};storage(STORAGE_KEYS.settings,data);applyTheme(data.theme);showStatus(status,'✓ 设置已保存','success')}

function applyTheme(theme){document.documentElement.dataset.platformTheme=theme==='dark'||theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}

function clearCache(){confirmInline(clearCacheBtn,()=>{try{localStorage.removeItem(STORAGE_PREFIX+'search');showStatus(status,'已清理可丢弃搜索缓存，资料、设置、草稿、账号及游戏存档保留','success')}catch{showStatus(status,'缓存清理失败','error')}})}

themeRadios.forEach(r=>r.addEventListener('change',saveSettings));
soundCheckbox?.addEventListener('change',()=>{const data=storage(STORAGE_KEYS.settings)||{};data.soundEnabled=soundCheckbox.checked;storage(STORAGE_KEYS.settings,data);volumeControl.hidden=!soundCheckbox.checked;saveSettings()});
soundVolume?.addEventListener('input',()=>{document.getElementById('volumeValue').textContent=soundVolume.value+'%';saveSettings()});
notificationCheckbox?.addEventListener('change',saveSettings);
clearCacheBtn?.addEventListener('click',clearCache);
logoutBtn?.addEventListener('click',()=>{window.VIP?.open()});
loadSettings()}

// Notifications Page
if(getCurrentPage()==='notifications'||location.pathname.includes('notifications.html')){const list=document.getElementById('notificationList');const empty=document.getElementById('notificationEmpty');const markAllBtn=document.getElementById('markAllRead');

function loadNotifications(){if(storage('settings')?.notificationEnabled===false){list.replaceChildren();empty.hidden=false;empty.textContent='已关闭本地平台公告提示，可在设置中重新开启。聊天通知不受此开关影响。';return;}const data=storage(STORAGE_KEYS.notifications)||{read:[]};if(!Array.isArray(data.read))data.read=[];let html='';NOTIFICATION_ANNOUNCEMENTS.forEach(ann=>{const isRead=(Array.isArray(data.read)?data.read:[]).includes(ann.id);html+=`<div class="notification-item ${isRead?'':'unread'}" data-id="${ann.id}"><b>${ann.title}</b><small>${ann.content}</small><time>${new Date(ann.time).toLocaleDateString('zh-CN')}</time></div>`});if(html){list.innerHTML=html;empty.hidden=true;list.querySelectorAll('.notification-item').forEach(item=>{item.addEventListener('click',()=>{markAsRead(item.dataset.id,item)})})}else{list.innerHTML='';empty.hidden=false}}

function markAsRead(id,el){const data=storage(STORAGE_KEYS.notifications)||{read:[]};if(!Array.isArray(data.read))data.read=[];if(!(Array.isArray(data.read)?data.read:[]).includes(id))data.read.push(id);storage(STORAGE_KEYS.notifications,data);if(el)el.classList.remove('unread')}

function markAllRead(){const data=storage(STORAGE_KEYS.notifications)||{read:[]};if(!Array.isArray(data.read))data.read=[];NOTIFICATION_ANNOUNCEMENTS.forEach(ann=>{if(!(Array.isArray(data.read)?data.read:[]).includes(ann.id))data.read.push(ann.id)});storage(STORAGE_KEYS.notifications,data);loadNotifications()}

markAllBtn?.addEventListener('click',markAllRead);
loadNotifications()}

// Search Page
if(getCurrentPage()==='search'||location.pathname.includes('search.html')){const searchInput=document.getElementById('searchInput');const filterTags=document.querySelectorAll('.filter-tag');const results=document.getElementById('searchResults');const empty=document.getElementById('searchEmpty');const banner=document.getElementById('offlineBanner');

let currentCategory='all';

function performSearch(){const query=searchInput.value.toLowerCase();const filtered=query?GAME_TOOLS_ROUTES.filter(item=>{const matchesQuery=item.name.toLowerCase().includes(query);const matchesCategory=currentCategory==='all'||item.category===currentCategory;return matchesQuery&&matchesCategory}):currentCategory==='all'?GAME_TOOLS_ROUTES:GAME_TOOLS_ROUTES.filter(i=>i.category===currentCategory);renderResults(filtered)}

function renderResults(items){if(items.length){results.innerHTML=items.map(item=>`<a href="${item.path}" class="search-result"><div class="result-icon">🎮</div><b>${item.name}</b><small>${item.category==='games'?'游戏':'工具'}</small></a>`).join('');empty.hidden=true}else{results.innerHTML='';empty.hidden=false}}

const params=new URLSearchParams(location.search);const qParam=params.get('q');if(qParam)searchInput.value=qParam;performSearch();if(banner){const sync=()=>{banner.hidden=navigator.onLine};sync();window.addEventListener('online',sync);window.addEventListener('offline',sync)}

searchInput?.addEventListener('input',performSearch);
filterTags.forEach(tag=>{tag.addEventListener('click',()=>{filterTags.forEach(t=>t.classList.remove('active'));tag.classList.add('active');currentCategory=tag.dataset.category;performSearch()})})}

// Feedback Page
if(getCurrentPage()==='feedback'||location.pathname.includes('feedback.html')){const typeSelect=document.getElementById('feedbackType');const titleInput=document.getElementById('feedbackTitle');const contentInput=document.getElementById('feedbackContent');const contextInput=document.getElementById('feedbackContext');const saveBtn=document.getElementById('feedbackSave');const copyBtn=document.getElementById('feedbackCopy');const exportBtn=document.getElementById('feedbackExport');const clearBtn=document.getElementById('feedbackClear');const status=document.getElementById('feedbackStatus');

function getContext(){const ua=navigator.userAgent;const timestamp=new Date().toLocaleString('zh-CN',{timeZone:'Asia/Vladivostok'})+' (Asia/Vladivostok UTC+10)';return `时间: ${timestamp}\n浏览器: ${ua}\n平台: ${navigator.platform}`}

function loadFeedback(){const data=storage(STORAGE_KEYS.feedback)||{type:'',title:'',content:''};typeSelect.value=data.type||'';titleInput.value=data.title||'';contentInput.value=data.content||''}

function saveFeedback(){if(!typeSelect.value){showStatus(status,'请选择反馈类型','error');return}
if(!titleInput.value.trim()){showStatus(status,'请输入标题','error');return}
const data={type:typeSelect.value,title:titleInput.value,content:contentInput.value};storage(STORAGE_KEYS.feedback,data);showStatus(status,'✓ 草稿已保存到本地浏览器','success')}

function copyContent(){const text=`【${typeSelect.options[typeSelect.selectedIndex].text}】\n标题: ${titleInput.value}\n内容: ${contentInput.value}\n\n${getContext()}`;navigator.clipboard.writeText(text).then(()=>showStatus(status,'✓ 已复制到剪贴板','success')).catch(()=>showStatus(status,'复制失败','error'))}

function exportTxt(){const filename=`feedback-${new Date().getTime()}.txt`;const text=`【${typeSelect.options[typeSelect.selectedIndex].text}】\n标题: ${titleInput.value}\n内容: ${contentInput.value}\n\n${getContext()}`;const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);showStatus(status,'✓ TXT 已下载','success')}

function clearForm(){if(true){typeSelect.value='';titleInput.value='';contentInput.value='';storage(STORAGE_KEYS.feedback,null);showStatus(status,'已清空','info')}}

contextInput.value=getContext();
contextInput.readOnly=true;
saveBtn?.addEventListener('click',saveFeedback);
copyBtn?.addEventListener('click',copyContent);
exportBtn?.addEventListener('click',exportTxt);
clearBtn?.addEventListener('click',()=>confirmInline(clearBtn,clearForm));
loadFeedback()}

// Me Page - Login CTA
if(getCurrentPage()==='me'||location.pathname.includes('me.html')){const loginCta=document.getElementById('meLoginCta');const meContent=document.getElementById('meContent');

function updateMePage(){const loggedIn=!!window.StarAccount?.state?.();if(loggedIn){meContent.hidden=false;loginCta.hidden=true}else{loginCta.hidden=false;meContent.hidden=false}}

window.addEventListener('vipchange',updateMePage);
updateMePage()}

// Profile avatar sync & notification badge
window.addEventListener('profilechange',()=>{const profile=storage(STORAGE_KEYS.profile);if(profile?.avatar&&['whale','fox','lunar','pearl','pink','raven','silver','forest'].includes(profile.avatar)){const avatarImg=document.querySelector('.profile-avatar');if(avatarImg)avatarImg.src=`assets/avatar-${profile.avatar}.webp`}});

// Update notification badge on me.html
function updateNotificationBadge(){const notif=storage(STORAGE_KEYS.notifications)||{read:[]};const unreadCount=storage('settings')?.notificationEnabled===false?0:NOTIFICATION_ANNOUNCEMENTS.filter(a=>!(Array.isArray(notif.read)?notif.read:[]).includes(a.id)).length;const badge=document.getElementById('notificationBadge');if(badge)badge.textContent=unreadCount>0?`(${unreadCount} 条未读)`:'已读'}

window.addEventListener('vipchange',updateNotificationBadge);
if(getCurrentPage()==='me')updateNotificationBadge();

// Onboarding (injection into tools.html)
function maybeShowOnboarding(){if(document.querySelector('.hub-v3')||window.__replayOnboarding){const shown=storage('onboarding_shown');if(!shown||window.__replayOnboarding){const onboarding=document.createElement('dialog');onboarding.className='onboarding-overlay';onboarding.innerHTML=`<div class="onboarding-dialog" role="dialog" aria-labelledby="onboardingTitle"><button type="button" class="onboarding-close" aria-label="关闭">×</button><div class="onboarding-content"><h2 id="onboardingTitle">欢迎来到星糖宇宙 👋</h2><div class="onboarding-step"><b>第 1 步：账号与云端</b><p>登录你的账号以保存 VIP 权益、等级与装扮；游戏进度仍保存在当前浏览器。账号由 Supabase 安全管理。</p></div><div class="onboarding-step"><b>第 2 步：本地数据</b><p>游戏存档、个人档案、平台设置均保存在你的浏览器本地。不会由本资料编辑器上传；公开聊天请勿透露隐私。</p></div><div class="onboarding-step"><b>第 3 步：安全提示</b><p>不要在公共电脑上登录。勿清理浏览器全部数据，以免丢失本地游戏进度。会员仅用激活码，不提供充值、站外收款或二维码。反馈与草稿仅本地保存。</p></div><div class="onboarding-actions"><button type="button" class="onboarding-skip">跳过</button><button type="button" class="onboarding-next">我明白了</button></div></div></div>`;document.body.append(onboarding);onboarding.showModal();onboarding.addEventListener('cancel',()=>storage('onboarding_shown',true));const close=()=>{onboarding.remove();storage('onboarding_shown',true)};onboarding.querySelector('.onboarding-close').addEventListener('click',close);onboarding.querySelector('.onboarding-skip').addEventListener('click',close);onboarding.querySelector('.onboarding-next').addEventListener('click',close);}}};
window.StarOnboarding={open:()=>{window.__replayOnboarding=true;maybeShowOnboarding();window.__replayOnboarding=false;}};const savedSettings=storage('settings')||{};document.documentElement.dataset.platformTheme=savedSettings.theme==='dark'||savedSettings.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',maybeShowOnboarding)}else{maybeShowOnboarding()}})();/* Profile preview is browser-only; never used for account authorization. */
(()=>{if(!location.pathname.endsWith('/me.html'))return;let p;try{p=JSON.parse(localStorage.getItem('starcandy_platform_profile')||'null')}catch{}if(!p||typeof p!=='object')return;const section=document.createElement('section');section.className='rule-panel';const title=document.createElement('h2');title.textContent=String(p.nickname||'旅人').slice(0,32)+' · 本地资料';const bio=document.createElement('p');bio.textContent=p.privacy?'简介预览已隐藏（不改变云端权限）':String(p.bio||'还没有写下简介').slice(0,200);section.append(title,bio);document.querySelector('main')?.prepend(section);})();
