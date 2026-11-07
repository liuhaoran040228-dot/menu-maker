/* Accounts + server VIP. Only a PUBLIC Supabase key belongs in this file. */
window.StarAccount = (() => {
  'use strict';
  const URL = 'https://tfuxfdvkbpnaazylgtux.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_se9_UP4SyegIDwvEXF8IkQ_dDAZduep';
  const root = new window.URL('.', document.currentScript.src).href;
  const CACHE_KEY = 'star-vip-server-v1', LEGACY_KEY = 'lili-vip-v1';
  const MAX_CACHE_AGE = 15 * 60 * 1000;
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const write = (key, value) => { try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  let client, user = null, status = null, verifiedAt = 0, mode = 'login', ready = false, busy = false, confirmEmail = true, emailEnabled = true, networkError = false, accountState = null, claimedDay = '', initialization;
  const isValid = s => !!s && (s.kind === 'P' || (['M','Y'].includes(s.kind) && Date.parse(s.expires_at) > Date.now()));
  const normalize = s => String(s || '').trim().toUpperCase().replace(/\s+/g, '');
  const legacy = () => { const s = read(LEGACY_KEY); return s && window.VIP_LEGACY_HASHES?.includes(s.hash) && (s.kind === 'P' || (s.kind === 'M' && Number.isFinite(s.expires) && s.expires > Date.now())) ? s : null; };
  function active() { return user ? isValid(status) && Date.now() - verifiedAt < MAX_CACHE_AGE : ready && !!legacy(); }
  function emit() { render(); window.dispatchEvent(new Event('vipchange')); }
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2M3 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'vip-btn account-trigger'; button.innerHTML = icon + '<span>我的账号</span>'; button.setAttribute('aria-label', '我的账号与 VIP');
  const slot = document.querySelector('.vip-slot'); (slot || document.body).append(button); if (!slot) button.classList.add('float');
  const rotateButton = button.cloneNode(true); rotateButton.classList.add('account-rotate'); document.body.append(rotateButton);
  function moveButton() { const nav = document.querySelector('.play-nav'); if (nav && button.parentElement !== nav) { nav.insertBefore(button, nav.querySelector('.menu-toggle')); button.classList.remove('float'); } }
  new MutationObserver(moveButton).observe(document.body, { childList: true, subtree: true }); moveButton();
  const dialog = document.createElement('dialog'); dialog.id = 'star-account'; dialog.setAttribute('aria-labelledby', 'account-title');
  dialog.style.setProperty('--account-bg', `url("${root}assets/bg-undersea.webp")`);
  dialog.innerHTML = `<div class="account-hero"><button type="button" class="account-close" aria-label="关闭账号窗口">×</button><div class="account-eyebrow">STAR CANDY · YOUR UNIVERSE</div><h2 id="account-title">星糖通行证</h2><p>收藏每一份星光<br>让你的冒险，在每台设备继续</p><img src="${root}assets/whale-idle.webp" alt="原创鲸鱼萌娘蓝蓝"></div>
    <div class="account-body"><section id="account-guest"><div class="account-tabs" role="tablist" aria-label="账号操作"><button type="button" role="tab" data-mode="login" aria-selected="true">登录账号</button><button type="button" role="tab" data-mode="signup" aria-selected="false">创建账号</button></div>
    <form id="account-auth-form"><label for="account-name">用户名 / 邮箱</label><input id="account-name" name="username" autocomplete="username" maxlength="254" placeholder="你的昵称，或常用邮箱" required><label for="account-password">密码</label><input id="account-password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" placeholder="至少 8 位，请牢记密码" required><p id="account-signup-note" class="account-subtle" hidden>用户名支持 2–24 位中文、字母、数字和 _ -。用户名账号无法通过邮箱找回，请妥善保管密码。</p><p id="account-config-note" class="account-notice warning" hidden>当前暂开放邮箱注册；用户名注册等待站长完成后台设置。已有账号仍可正常登录。</p><button class="account-primary" id="account-submit" type="submit">登录，回到星糖宇宙 ✦</button></form></section>
    <section id="account-member" hidden><div class="account-user"><img class="account-avatar" src="${root}assets/lan-chibi.webp" alt="账号头像"><div><strong id="account-display-name"></strong><small>云端账号 · 换设备登录即可同步会员</small></div></div><div class="account-vip-card"><b id="account-vip-title">普通旅人</b><p id="account-vip-expiry">激活会员，解锁更多星糖惊喜</p></div><div class="account-perks"><span>✧ 专属背景</span><span>✧ 等级装扮</span><span>✧ 成长加成</span></div><div id="account-bind" class="account-notice" hidden>发现旧版本地会员记录。请在下方输入原激活码，绑定当前账号；以后换设备不用再输。<button type="button" id="account-bind-focus">绑定旧版激活码 ↓</button></div><form id="account-redeem-form"><label for="account-code">兑换激活码</label><div class="account-code-row"><input id="account-code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="100" placeholder="M-… / Y-…" required><button type="submit" id="account-redeem">绑定</button></div></form><p class="account-subtle">月卡 30 天，年卡 365 天，可叠加续期；年卡累计 12 个月成长。历史永久会员权益保留。每个激活码仅绑定一个账号，不支持转移。</p><div class="account-actions"><button type="button" id="account-refresh" class="account-secondary">↻ 同步会员</button><button type="button" id="account-logout" class="account-secondary">退出登录</button></div></section>
    <div id="account-legacy" class="account-notice" hidden>旧版本地 VIP 仍可在本浏览器使用。登录后可用原激活码绑定账号，跨设备同步。</div><p id="account-feedback" class="account-feedback" role="status" aria-live="polite"></p><p class="account-subtle">游戏进度暂存当前浏览器，账号同步会员、等级、背景、头像与挂件。内置浏览器清理数据后需重新登录，但不用重复激活。</p></div><div class="account-footer">✦ 原创萌娘 · 星糖宇宙 · 云端守护 ✦</div>`;
  document.body.append(dialog);
  const $ = id => dialog.querySelector('#' + id);
  window.StarPremium?.attach(dialog,{setBackground:async background_id=>{if(!user)throw Error('请先登录账号');const {data,error}=await client.rpc('set_account_background',{background_id});if(error)throw error;acceptState(data);}});
  window.StarAppearance?.attach(dialog,{
    setPreset:async preset_id=>{if(!user)throw Error('请先登录');const {data,error}=await client.rpc('set_account_avatar',{preset_id,use_upload:false});if(error)throw error;acceptState(data);},
    equip:async pendant_id=>{if(!user)throw Error('请先登录');const {data,error}=await client.rpc('equip_account_pendant',{pendant_id});if(error)throw error;acceptState(data);},
    avatarURL:async(path,version)=>{if(!user||path!==user.id+'/avatar.webp')throw Error('头像路径无效');const {data,error}=await client.storage.from('account-avatars').createSignedUrl(path,3600);if(error)throw error;return data.signedUrl+'&v='+Number(version||0);},
    upload:async blob=>{if(!user)throw Error('请先登录');if(blob.type!=='image/webp'||blob.size>262144)throw Error('头像类型或大小不符合限制');const path=user.id+'/avatar.webp';const {error}=await client.storage.from('account-avatars').upload(path,blob,{upsert:true,contentType:'image/webp',cacheControl:'3600'});if(error)throw error;const r=await client.rpc('set_account_avatar',{preset_id:null,use_upload:true});if(r.error)throw r.error;acceptState(r.data);},
    deleteUpload:async()=>{if(!user)throw Error('请先登录');const {error}=await client.storage.from('account-avatars').remove([user.id+'/avatar.webp']);if(error)throw error;const r=await client.rpc('set_account_avatar',{preset_id:accountState?.profile?.avatar_preset||'whale',use_upload:false});if(r.error)throw r.error;acceptState(r.data);}
  });
  function feedback(text, good = false) { $('account-feedback').textContent = text; $('account-feedback').classList.toggle('good', good); }
  function render() {
    $('account-guest').hidden = !!user; $('account-member').hidden = !user;
    $('account-legacy').hidden = !!user || !legacy(); $('account-bind').hidden = !user || !legacy();
    $('account-config-note').hidden = emailEnabled && (mode !== 'signup' || !confirmEmail);
    $('account-config-note').textContent = !emailEnabled ? '邮箱登录与注册当前被后台关闭，请站长先启用 Email 登录。用户名注册还需关闭 Confirm email。' : '当前暂开放邮箱注册；用户名注册等待站长完成后台设置。已有账号仍可正常登录。';
    $('account-signup-note').hidden = mode !== 'signup';
    $('account-password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    $('account-submit').textContent = busy ? '连接星海中…' : mode === 'login' ? '登录，回到星糖宇宙 ✦' : '创建我的星糖账号 ✧';
    button.classList.toggle('on', active()); const caption=button.querySelector('span'); if(caption) caption.textContent = user ? (active() ? 'VIP 账号' : '我的账号') : '登录 / VIP';
    for (const btn of dialog.querySelectorAll('button:not(.account-close):not([data-mode])')) btn.disabled = busy;
    for (const tab of dialog.querySelectorAll('[data-mode]')) { tab.setAttribute('aria-selected', String(tab.dataset.mode === mode)); tab.disabled = busy; }
    if (user) {
      const email = user.email || '';
      $('account-display-name').textContent = user.user_metadata?.display_name || (email.endsWith('@users.local') ? '星糖旅人' : email);
      const valid = isValid(status);
      $('account-vip-title').textContent = valid ? (status.kind === 'P' ? '✦ 永久星糖 VIP' : '✦ 星糖月卡 VIP') : status ? '会员已到期' : '普通旅人';
      $('account-vip-expiry').textContent = valid && status.kind === 'P' ? '永久有效 · 愿星光与你同在' : status?.expires_at ? '到期：' + new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Vladivostok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(status.expires_at)) + '（海参崴 UTC+10）' : '激活会员，解锁更多星糖惊喜';
      if (networkError && verifiedAt) $('account-vip-expiry').textContent += ' · 离线缓存，联网后同步';
    }
    window.StarPremium?.render({data:accountState,user,active:active(),button,rotateButton});
    window.StarAppearance?.render({data:accountState,user,active:active(),button,rotateButton});
  }
  function open() { moveButton(); render(); if (!dialog.open) dialog.showModal(); if (!ready) feedback('正在连接账号服务…'); }
  button.onclick = rotateButton.onclick = open; dialog.querySelector('.account-close').onclick = () => dialog.close();
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  // Stop gameplay hotkeys while entering names, passwords or activation codes.
  for (const event of ['keydown','keyup','keypress']) dialog.addEventListener(event, e => e.stopPropagation());
  for (const tab of dialog.querySelectorAll('[data-mode]')) tab.onclick = () => { mode = tab.dataset.mode; feedback(''); render(); };
  async function identity(input) {
    const value = input.trim().normalize('NFC').toLowerCase();
    if (value.includes('@')) { if (value.endsWith('@users.local') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw Error('请输入有效邮箱，或不带 @ 的用户名'); return {email:value, name:value, username:false}; }
    if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(value)) throw Error('用户名为 2–24 位中文、字母、数字、_ 或 -');
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    const hash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
    return {email:'u'+hash+'@users.local',name:input.trim().normalize('NFC'),username:true};
  }
  function friendly(error) { const m = error?.message || String(error); return /Invalid login credentials/i.test(m) ? '账号或密码不正确，请检查后重试' : /Email not confirmed/i.test(m) ? '请先完成邮箱验证再登录' : /rate limit|too many/i.test(m) ? '操作太频繁，请稍后再试' : /already registered/i.test(m) ? '账号已注册，请切换登录' : /Failed to fetch|NetworkError|fetch failed/i.test(m) ? '网络暂时连接不上，请稍后重试' : /password.*(least|short)/i.test(m) ? '密码太短，请至少设置 8 位' : m; }
  async function run(action) { if (busy) return; busy = true; render(); feedback(''); try { await initialization; if (!client) throw Error('账号组件加载失败，请检查网络后刷新页面'); await action(); } catch (e) { feedback(friendly(e)); } finally { busy = false; render(); } }
  function acceptState(data) {
    accountState=data;status=data?.vip||null;verifiedAt=Date.now();networkError=false;
    if(user)write(CACHE_KEY,{user_id:user.id,status,accountState,verifiedAt});
    emit();if(data?.earned_xp)window.StarPremium?.xpToast(data.earned_xp);
  }
  async function activity(action,game_id=null){
    if(!client||!user)return;const id=user.id;
    const {data,error}=await client.rpc('account_activity',{action,game_id});
    if(user?.id!==id)return;if(error)throw error;acceptState(data);return data;
  }
  async function sync() {
    if (!client || !user) return;
    const id = user.id;
    const {data,error} = await client.rpc('get_account_state');
    if (user?.id !== id) return;
    if (error) { networkError = true; emit(); throw error; }
    acceptState(data);
  }
  async function applySession(session) {
    const next = session?.user || null;
    if (user?.id !== next?.id) { status = null; accountState=null; claimedDay=''; verifiedAt = 0; }
    user = next;
    if (!user) { status = null; accountState=null; claimedDay=''; verifiedAt = 0; write(CACHE_KEY,null); ready = true; emit(); return; }
    const cache = read(CACHE_KEY);
    if (cache?.user_id === user.id && Date.now() - cache.verifiedAt < MAX_CACHE_AGE) { status = cache.status; accountState=cache.accountState||null; verifiedAt = cache.verifiedAt; }
    ready = true; emit();
    try { await sync(); const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vladivostok'}).format(new Date());if(claimedDay!==day){claimedDay=day;await activity('login');} } catch { feedback('会员同步失败，请检查网络；不会丢失云端激活记录。'); }
  }
  $('account-auth-form').onsubmit = e => { e.preventDefault(); run(async () => {
    if (!emailEnabled) throw Error('邮箱登录与注册已在后台关闭，请联系站长启用 Email 登录');
    const id = await identity($('account-name').value), password = $('account-password').value;
    if (password.length < 8) throw Error('密码至少 8 位');
    if (mode === 'signup') {
      await loadSettings();
      if (id.username && confirmEmail) throw Error('用户名注册尚待站长关闭邮箱确认。暂时可用真实邮箱注册，或稍后再来。');
      const {data,error} = await client.auth.signUp({email:id.email,password,options:{data:{display_name:id.name},emailRedirectTo:new window.URL('tools.html',root).href}});
      if (error) throw error;
      $('account-password').value = '';
      if (data.session) { await applySession(data.session); feedback('注册成功，欢迎来到星糖宇宙 ✧',true); }
      else feedback('请查看验证邮件，点击链接后再登录。若未收到，请联系站长。',true);
    } else {
      const {data,error} = await client.auth.signInWithPassword({email:id.email,password}); if (error) throw error;
      $('account-password').value = ''; await applySession(data.session); feedback('登录成功，会员已从云端同步 ✦',true);
    }
  }); };
  $('account-redeem-form').onsubmit = e => { e.preventDefault(); run(async () => {
    if (!user) throw Error('请先登录账号'); const code = normalize($('account-code').value);
    if (!/^[MYP]-[A-Z0-9-]+$/.test(code)) throw Error('激活码格式不正确');
    const {data,error} = await client.rpc('redeem_code',{code}); if (error) throw error;
    status = data; verifiedAt = Date.now(); write(CACHE_KEY,{user_id:user.id,status,verifiedAt});
    // Remove the legacy record only if this exact original code was successfully bound.
    const old = read(LEGACY_KEY);
    if (old) { const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)); const hash = Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join(''); if (old.hash === hash) write(LEGACY_KEY,null); }
    $('account-code').value = ''; await sync(); feedback(data.already_redeemed ? '这张卡已在你的账号中，不会重复扣卡或续期。' : '绑定成功！以后换设备登录即可，无需重复激活 ✧',true);
  }); };
  $('account-bind-focus').onclick = () => $('account-code').focus();
  $('account-refresh').onclick = () => run(async () => { await sync(); feedback('会员状态已同步',true); });
  $('account-logout').onclick = () => run(async () => { const {error} = await client.auth.signOut(); if (error) throw error; await applySession(null); feedback('已退出，云端会员不会丢失',true); });
  async function loadSettings() { try { const res = await fetch(URL+'/auth/v1/settings',{headers:{apikey:PUBLIC_KEY},signal:AbortSignal.timeout(8000)}); if (res.ok) { const settings = await res.json(); confirmEmail = !settings.mailer_autoconfirm; emailEnabled = settings.external?.email !== false; render(); } } catch {} }
  initialization = (async () => {
    try {
      if (!window.supabase?.createClient) throw Error('SDK 加载失败');
      // Memory fallback keeps this page usable when an in-app browser refuses storage entirely.
      const memory = new Map(); const storage = {getItem(k){try{return localStorage.getItem(k) || memory.get(k) || null;}catch{return memory.get(k)||null;}},setItem(k,v){memory.set(k,v);try{localStorage.setItem(k,v);}catch{}},removeItem(k){memory.delete(k);try{localStorage.removeItem(k);}catch{}}};
      client = window.supabase.createClient(URL,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage,storageKey:'star-account-session-v1'}});
      client.auth.onAuthStateChange((_event,session) => { setTimeout(() => {applySession(session);},0); });
      const {data,error} = await client.auth.getSession(); if (error) throw error; await applySession(data.session); await loadSettings();
    } catch { ready = true; feedback('账号服务暂时不可用，请联网后刷新。旧版本地会员不受影响。'); emit(); }
  })();
  window.addEventListener('online', () => {if (user) sync().catch(()=>{}); loadSettings();});
  window.addEventListener('storage', e => {if (e.key === LEGACY_KEY) emit();});
  document.addEventListener('visibilitychange', () => {if (!document.hidden && user) sync().catch(()=>{});});
  setInterval(() => {emit(); if (user) sync().catch(()=>{});},60000);
  // Send only recent foreground game interactions; server enforces elapsed time and daily caps.
  const gameId=location.pathname.split('/').filter(Boolean).find(x=>['space-shooter','snake','fighter','monster-loot','moe-runner','survivor','td','lili-merge','lili-match','lili-2048','lili-fortune','lili-dressup','xiuxian','story'].includes(x));
  let lastInput=0,trackingUser=null,lastHeartbeat=0;
  function engaged(e){if(!gameId||!user||document.hidden||document.querySelector('dialog[open]')||e.target.closest?.('.account-trigger'))return;lastInput=Date.now();if(trackingUser!==user.id){trackingUser=user.id;lastHeartbeat=Date.now();activity('start',gameId).catch(()=>{trackingUser=null;});}}
  document.addEventListener('pointerdown',engaged,{passive:true});document.addEventListener('keydown',engaged);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){trackingUser=null;lastInput=0;}});
  setInterval(()=>{if(document.querySelector('dialog[open]')){trackingUser=null;return;}if(gameId&&user&&trackingUser===user.id&&!document.hidden&&!document.querySelector('dialog[open]')&&Date.now()-lastInput<70000&&Date.now()-lastHeartbeat>=61000){lastHeartbeat=Date.now();activity('tick',gameId).catch(()=>{});}},5000);
  render();
  return {shopRequest:async(name,args={})=>{await initialization;if(!client||!user)throw Error('请先登录账号');if(!['get_shop_state','claim_daily','redeem_currency_code','buy_item','equip_item','get_tasks','report_task_event','claim_task','get_gacha_pool','get_gacha_state','draw_gacha','get_public_appearance','set_public_appearance'].includes(name))throw Error('商城操作无效');const requestedUser=user.id;const {data,error}=await client.rpc(name,args);if(user?.id!==requestedUser)throw Error('账号已切换，请刷新商城');if(error)throw Error(friendly(error));return data;},shopCatalog:async()=>{await initialization;if(!client)throw Error('账号组件未就绪');const {data,error}=await client.from('shop_catalog').select('id,name,category,price,min_tier,preview,asset_key,active').order('price');if(error)throw Error('商城还未开放或加载失败，请稍后重试');return data||[];},active,open,ready:initialization,refresh:sync,tier:()=>active()?Number(accountState?.vip?.tier||1):0,level:()=>Number(accountState?.profile?.level||1),perks:()=>accountState?.entitlements||{},state:()=>accountState};
})();
