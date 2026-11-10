/* 星糖大厅前端。用户内容一律 textContent；无后端/未登录时明确提示，不伪造数据或成功。 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Core = window.StarSocialCore;
  const INTERESTS = ['游戏','动漫','音乐','学习','运动','美食','绘画','写作','宠物','电影','旅行','手作'];
  const AVATARS = ['forest','fox','lunar','pearl','pink','raven','silver','whale'].map(n => `../assets/avatar-${n}.webp`);
  // 头像为站内占位：仅按“昵称文本”散列选图，不关联账号/VIP，不泄露身份。
  const avatarFor = nick => { let h = 0; for (const c of String(nick)) h = (h * 31 + c.codePointAt(0)) >>> 0; return AVATARS[h % AVATARS.length]; };
  const SELF_AVATAR = '../assets/avatar-whale.webp';
  let sb = null, me = null, ready = false, myNick = '星糖旅人';

  const el = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (v == null) continue; if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); } for (const c of kids) if (c) n.append(c); return n; };
  const toast = msg => { document.querySelector('.sg-toast')?.remove(); const t = el('div', { class: 'sg-toast', role: 'status', text: msg }); document.body.append(t); setTimeout(() => t.remove(), 2600); };
  const hhmm = iso => { try { return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const fmt = iso => { try { return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const empty = (box, text) => box.replaceChildren(el('div', { class: 'sg-empty', text }));
  const errText = e => (e && e.message) ? (/暂不接受好友请求/.test(e.message) ? '对方未开启“愿意被推荐”，按其隐私设置暂不接受好友申请' : e.message.replace(/^.*?:\s*/, '')) : '操作失败';
  const visible = () => document.visibilityState === 'visible';

  function status(kind, text) { const c = $('sg-status'); c.dataset.kind = kind; c.textContent = text; }
  function banner(text, link) {
    const b = $('sg-banner'); b.hidden = !text; b.replaceChildren(document.createTextNode(text || ''));
    if (link) { b.append(' '); b.append(el('a', { href: link.href, text: link.text })); }
  }
  function setEnabled(on) { document.querySelectorAll('.sg-main button, .sg-main textarea, .sg-main input, .sg-main select, #lobby-form input, #lobby-form button').forEach(n => { n.disabled = !on; }); }
  function lobbyState(img, text) { $('lobby-log').replaceChildren(el('div', { class: 'sg-state' }, el('img', { src: img, alt: '' }), el('p', { text }))); }

  async function rpc(name, args) {
    if (!ready) throw new Error('服务尚未启用');
    const { data, error } = await sb.rpc(name, args || {});
    if (error) throw error;
    return data;
  }
  async function guarded(btn, fn) { if (btn) btn.disabled = true; try { await fn(); } catch (e) { toast(errText(e)); } finally { if (btn) btn.disabled = false; } }

  // ---------- 启动 ----------
  async function boot() {
    setEnabled(false);
    sb = window.StarSocialClient?.get();
    if (!sb) { status('off', '未连接'); banner('服务尚未启用：Supabase SDK 未能加载，请检查网络后刷新。'); lobbyState('../assets/lan-chibi.webp', '暂时无法连接大厅'); offlineUI('暂时无法连接服务，联网后刷新再试'); return; }
    const { data: { session } = {} } = await sb.auth.getSession().catch(() => ({ data: {} }));
    if (!session) { status('off', '未登录'); banner('登录后即可在大厅聊天。', { href: '../tools.html', text: '回到星糖宇宙登录 →' }); lobbyState('../assets/li-chibi.webp', '请先登录星糖宇宙账号'); offlineUI(null); return; }
    me = session.user.id;
    const { data, error } = await sb.rpc('social_service_status');
    if (error || !data?.enabled) { status('off', '未启用'); banner('服务尚未启用：大厅后端尚未部署，当前页面仅供预览，不会发送或保存任何内容。'); lobbyState('../assets/mo-chibi.webp', '大厅服务尚未启用'); offlineUI('社交服务尚未启用，当前仅可预览布局'); return; }
    ready = true; banner(''); status('ok', '在线'); setEnabled(true);
    sb.auth.onAuthStateChange((_e, s) => { if (!s) location.reload(); });

    initLobby(); initComm(); loadOwnLook(true); probeProfile(); loadPosts(true); loadProfile(); loadBlocks(); subscribeInbox(); initAdmin(); window.dispatchEvent(new CustomEvent('sg-session')); queueMicrotask(syncChatroomFromDom);
    setInterval(() => { if (visible() && curTab === 'friends') loadFriends(); }, 60000);
  }

  // ---------- 导航 ----------
  // 未登录 / 不可用时的引导空态（不发任何请求，不编造好友/公会/在线）
  function guideCard(img, title, lines, links) {
    return el('div', { class: 'sg-guide' }, el('img', { src: img, alt: '' }), el('b', { text: title }), ...lines.map(t => el('p', { class: 'sg-muted', text: t })),
      el('div', { class: 'sg-row sg-guide-links' }, ...links.map(([text, onclick, href]) => href ? el('a', { class: 'sg-primary', href, text }) : el('button', { type: 'button', class: 'sg-ghost', text, onclick }))));
  }
  function offlineUI(reason) {
    const out = !reason, login = ['登录星糖宇宙', null, '../tools.html'];
    const go = [['逛逛星糖大厅', () => showTab('lobby')], ['看看匿名树洞', () => showTab('tree')]];
    $('conv-lobby-last').textContent = out ? '未登录 · 登录后可聊天' : reason;
    $('dm-list').replaceChildren(guideCard('../assets/li-chibi.webp', out ? '你还没有登录' : '暂不可用', out ? ['登录后，这里会出现你和好友的私信。', '私信仅限双方都同意的好友。'] : [reason], out ? [login, ...go] : go));
    $('guild-list').replaceChildren(el('div', { class: 'sg-empty', text: out ? '未登录：登录后显示你已加入的公会频道' : '公会频道暂不可用' }));
    $('dm-more').hidden = $('guild-more').hidden = true;
    $('req-list').replaceChildren(el('div', { class: 'sg-empty', text: out ? '未登录' : '暂不可用' }));
    $('friend-list').replaceChildren(guideCard('../assets/lan-chibi.webp', out ? '登录后查看好友' : '好友暂不可用', out ? ['可以在大厅点别人的昵称申请好友，对方同意后会出现在这里。'] : [reason], out ? [login, go[0]] : [go[0]]));
    $('discover-list').replaceChildren(); $('friend-search').disabled = true;
  }
  let curTab = 'planet';
  let chatroomKind = null, chatroomSyncing = false;
  function setChatroomMode(on, kind) {
    const want = !!on;
    const nextKind = want ? (kind || chatroomKind || 'lobby') : null;
    const prev = document.body.classList.contains('sg-in-chatroom');
    if (prev === want && chatroomKind === nextKind) return; // 幂等，避免 MutationObserver 环
    document.body.classList.toggle('sg-in-chatroom', want);
    if (!want) { document.body.classList.remove('sg-in-conversation', 'sg-conv-open'); chatroomKind = null; }
    else chatroomKind = nextKind;
    document.body.dataset.chatroom = want ? (chatroomKind || '1') : '';
    notifyPetAvoid(want);
    try { window.dispatchEvent(new CustomEvent('sg-chatroom', { detail: { on: want, kind: chatroomKind } })); } catch (_) {}
    try { measureChrome(); } catch (_) {}
  }
  const setChatroom = setChatroomMode; // 兼容旧名
  // 单一来源：根据真实可见 DOM 校准（hash/登录后重渲染/返回键兜底）
  function syncChatroomFromDom() {
    if (chatroomSyncing) return;
    chatroomSyncing = true;
    try {
      const lobby = $('tab-lobby');
      const view = $('conv-view');
      const lobbyOn = !!(lobby && !lobby.hidden);
      const convOn = !!(view && !view.hidden && document.body.classList.contains('sg-conv-open'));
      if (convOn) setChatroomMode(true, 'dm');
      else if (lobbyOn) setChatroomMode(true, 'lobby');
      else setChatroomMode(false);
    } finally { chatroomSyncing = false; }
  }
  function showTab(name) {
    const sec = document.querySelector(`.sg-tab[data-tab="${name}"]`); if (!sec) return;
    if (name !== 'chats' && conv) closeConv();
    else if (name !== 'chats') { const view = $('conv-view'); if (view) { view.hidden = true; document.body.classList.remove('sg-conv-open', 'sg-in-conversation'); } }
    curTab = name;
    document.querySelectorAll('.sg-tab').forEach(t => { t.hidden = t !== sec; });
    document.querySelectorAll('.sg-nav button').forEach(x => x.setAttribute('aria-selected', String(x.dataset.go === sec.dataset.nav)));
    $('sg-heading').textContent = sec.dataset.title; $('lobby-form').hidden = name !== 'lobby';
    if (name === 'lobby') setChatroomMode(true, 'lobby');
    else if (name === 'chats' && $('conv-view') && !$('conv-view').hidden) setChatroomMode(true, 'dm');
    else setChatroomMode(false);
    if (name === 'lobby') { maybeShowLobbyHint(); if (ready) lobbyRefresh(true); }
    if ((name === 'friends' || name === 'more') && ready) loadFriends();
    document.querySelectorAll('.sg-seg [data-go-nav]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.goNav === name)));
    if (ready) syncRead();
    window.dispatchEvent(new CustomEvent('sg-tab', { detail: name }));
    queueMicrotask(syncChatroomFromDom);
  }
  document.querySelectorAll('.sg-nav button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.go)));
  // 星球：破冰话题（仅放入大厅草稿）与游戏入口（白名单站内链接）
  $('ice-list').replaceChildren(...Core.ICEBREAKERS.map(t => el('div', { class: 'sg-ice' }, el('span', { text: t }),
    el('button', { type: 'button', class: 'sg-ghost', text: '放入草稿', onclick: () => { showTab('lobby'); const i = $('lobby-input'); if (!i.disabled) { i.value = Core.insertAt(i.value, i.value.length, i.value.length, t, 300).value; i.dispatchEvent(new Event('input')); i.focus(); } else toast('登录后才能在大厅发言'); } }))));
  $('game-grid').replaceChildren(...Core.GAMES.map(g => el('a', { class: 'sg-game', href: Core.gameHref(g.id) }, el('img', { src: '../assets/' + ({ lan: 'lan', li: 'li', mo: 'mo', hu: 'hu', xing: 'xing' }[({ 'space-shooter': 'xing', snake: 'lan', fighter: 'hu', 'monster-loot': 'li', 'moe-runner': 'lan', 'lili-merge': 'li', 'lili-match': 'mo', 'lili-2048': 'hu' })[g.id]]) + '-chibi.webp', alt: '' }), el('b', { text: g.name }), el('small', { class: 'sg-muted', text: g.desc }))));
  // +游戏：挑选/预览/发送统一由 social-invite.js 处理（邀请白名单 7 款；大厅仅预览）
  // 只读本地视图深链接：白名单映射，不读其它 hash 内容、不触发写请求
  const convScope = Core.createScope();
  let conv = null; // {kind,id,conversation_id,title,msgs,nextBefore}
  // #messages/thread=<uuid>：只作为"想打开哪段会话"的提示；须在服务端返回的会话列表中，或经服务端 community_chat_messages 成员校验通过才打开，绝不按 hash 造会话
  let pendingThread = null;
  const threadFromHash = h => { const m = /^#messages\/thread=(.*)$/.exec(h || ''); return !m ? undefined : Core.isUuid(m[1]) ? m[1].toLowerCase() : null; };
  const fromHash = () => { const th = threadFromHash(location.hash); if (th !== undefined) { showTab('chats'); if (th === null) toast('会话链接无效'); else { pendingThread = th; try { openThread(); } catch {} } return; }
    const t = Core.tabFromHash(location.hash); if (t) showTab(t); if (location.hash === '#skins') $('cc-section')?.scrollIntoView({ block: 'start' }); };
  window.addEventListener('hashchange', () => { fromHash(); queueMicrotask(syncChatroomFromDom); });
  window.addEventListener('pageshow', () => queueMicrotask(syncChatroomFromDom));
  window.addEventListener('popstate', () => queueMicrotask(syncChatroomFromDom));
  fromHash();
  queueMicrotask(syncChatroomFromDom);
  if (window.MutationObserver) {
    const mo = new MutationObserver(() => queueMicrotask(syncChatroomFromDom));
    const lobby = $('tab-lobby'), view = $('conv-view');
    if (lobby) mo.observe(lobby, { attributes: true, attributeFilter: ['hidden', 'class'] });
    if (view) mo.observe(view, { attributes: true, attributeFilter: ['hidden', 'class'] });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  document.querySelectorAll('[data-go-nav]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.goNav)));
  $('friend-search').addEventListener('input', () => filterFriends());
  function filterFriends() {
    const q = $('friend-search').value.normalize('NFKC').trim().toLowerCase();
    $('friend-list').querySelectorAll('[data-nick]').forEach(r => { r.hidden = !!q && !r.dataset.nick.toLowerCase().includes(q); });
  }

  document.addEventListener('visibilitychange', () => { if (ready && visible()) syncRead(); });
  $('conv-lobby').addEventListener('click', () => showTab('lobby'));

  // ---------- 会话搜索：仅已加载的本地消息（服务端已过滤隐藏/拉黑）；不发网络请求 ----------
  $('chat-search').addEventListener('input', e => {
    const q = e.target.value, box = $('search-result'); box.hidden = !q.trim();
    if (!q.trim()) return box.replaceChildren();
    const hits = Core.searchMsgs(msgs, q, 30);
    if (!hits.length) return empty(box, '已加载的大厅消息里没有找到');
    box.replaceChildren(...hits.map(m => el('button', { type: 'button', class: 'sg-conv', onclick: () => { showTab('lobby'); setTimeout(() => { const n = log.querySelector(`.sg-msg[data-id="${CSS.escape(String(m.id))}"]`); if (n) { n.scrollIntoView({ block: 'center' }); n.classList.add('sg-hit'); setTimeout(() => n.classList.remove('sg-hit'), 1600); } }, 60); } },
      el('span', { class: 'sg-conv-main' }, el('b', { text: m.mine ? '我' : m.nickname }), el('small', { class: 'sg-muted', text: `${hhmm(m.created_at)} · ${m.body}` })))));
  });

  // ---------- 好友私信 / 公会频道（主体 FRIENDS-GUILD-API.md 提案；只读接入，未部署则降级） ----------
  // 唯一来源：主体 public RPC（服务端 auth.uid() 鉴权）。不查表、不跨账号缓存（仅内存，退出即 reload 清空）。
  const comm = { dm: { state: 'unknown', items: [], cursor: null }, guild: { state: 'unknown', items: [], cursor: null } };
  const COMM_TEXT = { BANNED: '账号受限，仅可查看', INVALID_INPUT: '请求参数无效', missing: '接口尚未部署', network: '网络异常', AUTH_REQUIRED: '请重新登录', NOT_READY: '服务未就绪', RATE_LIMITED: '操作太频繁', unknown: '加载失败' };
  async function commRpc(name, args) { const { data, error } = await sb.rpc(name, args || {}); if (error) { const k = Core.communityError(error); const e2 = new Error(COMM_TEXT[k] || k); e2.kind = k; throw e2; } return data; }
  function commState(box, text, retry) {
    const n = el('div', { class: 'sg-empty', text });
    if (retry) n.append(' ', el('button', { type: 'button', class: 'sg-ghost', text: '重试', onclick: retry }));
    box.replaceChildren(n);
  }
  function renderCommList(kind) {
    const c = comm[kind], box = $(kind === 'dm' ? 'dm-list' : 'guild-list'), more = $(kind === 'dm' ? 'dm-more' : 'guild-more');
    more.hidden = !(c.state === 'ok' && c.cursor);
    if (c.state === 'missing') return commState(box, kind === 'dm' ? '好友私信尚未开放（接口未部署）' : '公会频道尚未开放（接口未部署）');
    if (c.state === 'error') return commState(box, '加载失败：' + c.err, () => loadComm(kind, true));
    if (c.state !== 'ok') return commState(box, '载入中…');
    if (!c.items.length) return commState(box, kind === 'dm' ? '还没有私信会话' : '你还没有加入公会');
    box.replaceChildren(...c.items.map(x => el('button', { type: 'button', class: 'sg-conv', role: 'listitem', onclick: () => openConv(x) },
      el('img', { class: 'sg-avatar', src: (x.kind === 'dm' && Core.avatarSrc(x.avatar)) || '../assets/lan-chibi.webp', alt: '' }),
      el('span', { class: 'sg-conv-main' }, el('b', { text: x.title }), el('small', { class: 'sg-muted', text: x.kind === 'dm' ? (x.last ? x.last.body : '暂无消息') : `${x.count} 位成员 · ${({ owner: '会长', admin: '管理员', member: '成员' })[x.role]}` })),
      x.kind === 'dm' && x.last && x.last.created_at ? el('time', { class: 'sg-conv-time sg-muted', datetime: x.last.created_at, text: hhmm(x.last.created_at) }) : null,
      x.unread ? el('span', { class: 'sg-unread', text: x.unread > 99 ? '99+' : String(x.unread), 'aria-label': `${x.unread} 条未读（服务端）` }) : null)));
  }
  async function loadComm(kind, reset) {
    const c = comm[kind];
    if (c.state === 'missing' || c.busy) return;   // 未部署：不重复探测
    if (reset) { c.items = []; c.cursor = null; c.state = 'loading'; renderCommList(kind); }
    c.busy = true;
    try {
      if (kind === 'dm') {
        const d = await commRpc('community_dm_list', { p_limit: 20, p_before_updated_at: c.cursor?.updated_at ?? null, p_before_id: c.cursor?.id ?? null });
        const rows = (d?.items || []).map(Core.normDm).filter(Boolean);
        c.items = [...c.items.filter(x => !rows.some(r => r.id === x.id)), ...rows];
        c.cursor = d?.next_cursor && Core.isUuid(d.next_cursor.id) ? { updated_at: d.next_cursor.updated_at, id: d.next_cursor.id } : null;
      } else {
        const d = await commRpc('community_guild_list', { p_limit: 20, p_before_id: c.cursor?.id ?? null });
        const rows = (d?.items || []).map(Core.normGuild).filter(Boolean);
        c.items = [...c.items.filter(x => !rows.some(r => r.id === x.id)), ...rows];
        c.cursor = Core.isUuid(d?.next_before_id) ? { id: d.next_before_id } : null;
      }
      c.state = 'ok';
    } catch (e) { c.state = e.kind === 'missing' ? 'missing' : 'error'; c.err = e.message; if (c.state === 'missing') { c.items = []; c.cursor = null; } }
    finally { c.busy = false; renderCommList(kind); if (kind === 'dm') openThread(); }
  }
  async function openThread() {
    const th = pendingThread; if (!th || !ready || comm.dm.busy || comm.dm.state === 'loading') return;
    pendingThread = null; if (conv && conv.kind === 'dm' && conv.id === th) return;
    const it = comm.dm.items.find(x => x.id === th);
    if (it) return openConv(it);
    try { await commRpc('community_chat_messages', { p_conversation_id: th, p_before_seq: null, p_limit: 1 }); }
    catch { return toast('会话不存在或无权查看'); }
    return openConv({ kind: 'dm', id: th, title: '私信' });
  }
  $('dm-more').addEventListener('click', () => loadComm('dm'));
  $('guild-more').addEventListener('click', () => loadComm('guild'));
  function closeConv(reason) {
    queueMicrotask(() => window.dispatchEvent(new CustomEvent('sg-conv-change')));
    convScope.leave(); conv = null; $('conv-log').replaceChildren(); $('conv-view').hidden = true; document.body.classList.remove('sg-conv-open', 'sg-in-conversation'); setChatroom(false); $('conv-list').hidden = false; $('chat-search').parentElement.hidden = false;
    if (reason) toast(reason);
  }
  function dropRevoked(kind, id, e) {
    comm[kind].items = comm[kind].items.filter(x => x.id !== id); renderCommList(kind);
    closeConv(({ NOT_FRIEND: '你们已不是好友', BLOCKED: '已屏蔽，无法查看', NOT_MEMBER: '你已不在该公会', FORBIDDEN: '无权查看', AUTH_REQUIRED: '请重新登录' })[e.kind] || '无权查看');
  }
  function renderConv() {
    if (!conv) return;
    const lg = $('conv-log'), stick = lg.scrollHeight - lg.scrollTop - lg.clientHeight < 60;
    lg.replaceChildren(...(conv.msgs.length ? conv.msgs.map(m => el('div', { class: 'sg-msg' + (m.mine ? ' me' : '') }, el('div', { class: 'sg-msg-body' }, el('div', { class: 'sg-meta-line' }, ...(m.nickname && !m.mine ? [el('b', { text: m.nickname })] : []), el('time', { datetime: m.created_at, text: hhmm(m.created_at) })), (m.invite && window.StarSocialInvite?.renderCard(m.invite)) || (m.sticker_id && window.StarSocialChatCore?.stickerAsset(m.sticker_id) ? el('div', { class: 'sg-bubble sg-sticker-msg' }, el('img', { src: window.StarSocialChatCore.stickerAsset(m.sticker_id), alt: '贴纸', width: '96', height: '96' })) : el('div', { class: 'sg-bubble', text: m.body }))))) : [el('div', { class: 'sg-empty', text: '暂无消息' })]));
    applyLooks(lg);
    $('conv-older').hidden = conv.nextBefore == null;
    if (stick) lg.scrollTop = lg.scrollHeight;
    maybeMarkRead();
  }
  let kindsUndeployed = false, cardsUndeployed = false, myPidP = null;
  // 私信气泡外观：只用服务端 get_equipped_chat_cosmetics(dm, 会话) 返回的行（服务端按好友/会话成员授权）；客户端不声明任何装备；default 不改原样式
  const getMyPid = () => myPidP || (myPidP = Promise.resolve(sb.rpc('get_public_profile', { p_public_id: null })).then(r => Core.isUuid(r?.data?.public_id) ? r.data.public_id : null).catch(() => null));
  async function loadLooks(t) {
    if (!conv || conv.kind !== 'dm' || conv.looks || !window.StarChatCosmetics) return;
    const c = conv; c.looks = {};
    const mine = await getMyPid(); const pids = [mine, c.peer_pid].filter(Core.isUuid); if (!pids.length) return;
    let r; try { r = await sb.rpc('get_equipped_chat_cosmetics', { p_public_ids: pids, p_context: 'dm', p_conversation_id: c.conversation_id, p_feed_post_ids: null }); } catch { return; }
    if (!convScope.isCurrent(t) || conv !== c || r?.error || !Array.isArray(r?.data)) return;
    const pick = pid => r.data.find(x => x && x.public_id === pid && pid) || null;
    c.looks = { me: pick(mine), peer: pick(c.peer_pid) }; renderConv();
  }
  function applyLooks(lg) {
    const C = window.StarChatCosmetics; if (!C || !conv || !conv.looks || !conv.msgs.length) return;
    [...lg.children].forEach((node, i) => { const m = conv.msgs[i]; if (!m || m.invite || m.sticker_id) return;
      const row = m.mine ? conv.looks.me : conv.looks.peer; const b = node.querySelector('.sg-bubble');
      if (!b || !row) return;
      const hasBubble = typeof row.bubble === 'string' && row.bubble !== 'default', hasFrame = typeof row.avatar_frame === 'string' && row.avatar_frame !== 'default';
      if (!hasBubble && !hasFrame) return;
      let av = null; if (hasFrame) { av = el('span', { class: 'sg-msg-av', 'aria-hidden': 'true' }); m.mine ? node.append(av) : node.prepend(av); }
      try { C.render({ message: hasBubble ? b : null, avatar: av, badges: null }, row, { context: 'dm', animate: false }); if (hasBubble) node.dataset.look = row.bubble; if (hasFrame) node.dataset.frame = row.avatar_frame; } catch {} });
  }
  async function loadConvPage(t, before) {
    const d = await commRpc('community_chat_messages', { p_conversation_id: conv.conversation_id, p_before_seq: before ?? null, p_limit: 30 });
    if (!convScope.isCurrent(t)) return;                 // 已切换会话：丢弃，防止闪现他人消息
    conv.msgs = Core.mergeBySeq(conv.msgs, (d?.items || []).map(m => Core.normMsg(conv.kind, m, me, null)).filter(Boolean));
    // 贴纸类型：仅以服务端 chat_message_kinds_v1 为准（未部署则全部按文字显示）；sticker_id 再经客户端白名单映射固定 asset
    const ids = conv.msgs.filter(m => !m.kindChecked).map(m => String(m.id)).slice(-100);
    if (ids.length && !kindsUndeployed) { try { const k = await sb.rpc('chat_message_kinds_v1', { p_conversation_id: conv.conversation_id, p_ids: ids });
      if (!convScope.isCurrent(t)) return;
      if (k?.error) { if (k.error.code === 'PGRST202') kindsUndeployed = true; throw k.error; }   // 失败不标记已检查，后续刷新可重试；未部署则停止请求，全部按文字显示
      const map = new Map((Array.isArray(k?.data) ? k.data : []).map(r => [String(r.message_id), r.sticker_id]));
      conv.msgs.forEach(m => { if (ids.includes(String(m.id))) { m.kindChecked = true; const sid = map.get(String(m.id)); if (window.StarSocialChatCore?.isSticker(sid)) m.sticker_id = sid; } });
    } catch {} }
    // 游戏邀请卡：仅以服务端 chat_message_cards_v1 投影为准；卡片消息每次刷新重取（结果合并到原卡片）；未部署则全部按文字显示
    const cids = conv.msgs.filter(m => !m.cardChecked || m.invite).map(m => String(m.id)).slice(-100);
    if (cids.length && !cardsUndeployed && window.StarSocialInviteCore) { try { const k = await sb.rpc('chat_message_cards_v1', { p_conversation_id: conv.conversation_id, p_ids: cids });
      if (!convScope.isCurrent(t)) return;
      if (k?.error) { if (k.error.code === 'PGRST202') cardsUndeployed = true; throw k.error; }
      const map = new Map((Array.isArray(k?.data) ? k.data : []).map(r => [String(r.message_id), window.StarSocialInviteCore.normInvite(r.card)]));
      conv.msgs.forEach(m => { if (cids.includes(String(m.id))) { m.cardChecked = true; const v = map.get(String(m.id)); m.invite = v && v.status !== 'hidden' ? v : null; } });
    } catch {} }
    loadLooks(t);
    conv.nextBefore = Number.isSafeInteger(Number(d?.next_before_seq)) && d?.next_before_seq != null ? Number(d.next_before_seq) : null;
    renderConv();
  }
  async function openConv(x) {
    const t = convScope.enter(x.kind + ':' + x.id);
    conv = { kind: x.kind, id: x.id, conversation_id: x.kind === 'dm' ? x.id : null, title: x.title, peer_pid: x.peer_pid || null, msgs: [], nextBefore: null, readSent: 0, looks: null };
    document.body.classList.add('sg-conv-open', 'sg-in-conversation'); setChatroom(true, 'dm');   // 全屏会话 + 桌宠避让钩子
    $('conv-title').textContent = x.title; $('conv-log').replaceChildren(el('div', { class: 'sg-empty', text: '载入中…' }));
    $('conv-list').hidden = true; $('chat-search').parentElement.hidden = true; $('search-result').hidden = true; $('conv-view').hidden = false;
    try {
      if (x.kind === 'guild') {
        const a = await commRpc('community_guild_chat_access', { p_guild_id: x.id });
        if (!convScope.isCurrent(t)) return;
        if (!a?.can_read || !Core.isUuid(a.conversation_id)) throw Object.assign(new Error('无权查看'), { kind: 'NOT_MEMBER' });
        conv.conversation_id = a.conversation_id;
      }
      await loadConvPage(t, null);
      window.dispatchEvent(new CustomEvent('sg-conv-change'));
    } catch (e) {
      if (!convScope.isCurrent(t)) return;
      if (Core.isRevoked(e.kind)) return dropRevoked(x.kind, x.id, e);
      $('conv-log').replaceChildren(el('div', { class: 'sg-empty', text: e.kind === 'missing' ? '会话消息接口尚未部署' : '加载失败：' + e.message }));
    }
  }
  $('conv-older').addEventListener('click', e => { if (!conv || conv.nextBefore == null) return; const tok = convScope.enter(convScope.key); guarded(e.target, () => loadConvPage(tok, conv.nextBefore).catch(err => { if (Core.isRevoked(err.kind)) dropRevoked(conv.kind, conv.id, err); else throw err; })); });
  $('conv-back').addEventListener('click', () => closeConv());
  // 已读：仅会话可见、页面前台、已渲染且滚到底部时上报；以服务端返回为准，失败不本地标记已读
  async function maybeMarkRead() {
    if (!conv || !visible() || $('conv-view').hidden || $('tab-chats').hidden) return;
    const lg = $('conv-log'); if (lg.scrollHeight - lg.scrollTop - lg.clientHeight >= 60) return;
    const top = Core.maxSeq(conv.msgs); if (!top || top <= conv.readSent) return;
    const c = conv; c.readSent = top;
    try {
      const r = await commRpc('community_chat_mark_read', { p_conversation_id: c.conversation_id, p_through_seq: top });
      if (conv !== c) return;
      const item = comm[c.kind].items.find(x => x.id === c.id); if (item) { const u = Number(r?.unread_count); item.unread = Number.isSafeInteger(u) && u > 0 ? u : 0; renderCommList(c.kind); }
    } catch (e) { if (conv === c) c.readSent = 0; if (Core.isRevoked(e.kind) && conv === c) dropRevoked(c.kind, c.id, e); }
  }
  $('conv-log').addEventListener('scroll', () => maybeMarkRead(), { passive: true });
  document.addEventListener('visibilitychange', () => { if (visible()) maybeMarkRead(); });
  // 供 social-chat.js：只暴露当前会话 id 与刷新（不暴露 uid/消息内容）
  window.StarSocialConv = { open: x => { if (!x || !['dm', 'guild'].includes(x.kind) || !Core.isUuid(x.id)) return Promise.resolve(); showTab('chats'); return openConv({ kind: x.kind, id: x.id, title: String(x.title || '会话').slice(0, 24) }); }, current: () => conv && conv.conversation_id ? { conversation_id: conv.conversation_id, kind: conv.kind } : null,
    refresh: () => { if (conv) { const tok = convScope.enter(convScope.key); loadConvPage(tok, null).catch(() => {}); } } };

  // —— 遮挡防护：测量真实高度 → CSS 变量；键盘 visualViewport → --kb-inset；桌宠钩子 ——
  function setVar(root, name, value) {
    if (root.style.getPropertyValue(name) === value) return false;
    root.style.setProperty(name, value);
    return true;
  }
  function measureChrome() {
    const root = document.body;
    try {
      const nav = document.querySelector('.sg-nav');
      const lobby = $('lobby-form');
      const bar = $('conv-form');
      const banner = document.getElementById('sg-demo-banner');
      const head = document.querySelector('.sg-lobby:not([hidden]) .sg-chat-head, #conv-view:not([hidden]) .sg-chat-head');
      // --nav-h = 导航内容高度（不含 safe-area；safe 由 --safe-b 另加）
      if (nav) setVar(root, '--nav-h', Math.max(44, Math.round(nav.clientHeight || 58)) + 'px');
      if (lobby && !lobby.hidden) setVar(root, '--composer-h', Math.max(48, Math.round(lobby.getBoundingClientRect().height)) + 'px');
      if (bar && (root.classList.contains('sg-in-conversation') || root.classList.contains('sg-in-chatroom'))) setVar(root, '--conv-bar-h', Math.max(44, Math.round(bar.getBoundingClientRect().height)) + 'px');
      if (banner && getComputedStyle(banner).display !== 'none') setVar(root, '--demo-banner-h', Math.max(0, Math.round(banner.getBoundingClientRect().height)) + 'px');
      else setVar(root, '--demo-banner-h', '0px');
      if (head) setVar(root, '--chat-head-h', Math.max(48, Math.round(head.getBoundingClientRect().height)) + 'px');
    } catch (_) {}
  }
  function keyboardInset() {
    const vv = window.visualViewport;
    if (!vv) return 0;
    // 手机首次绘制时 innerHeight 常大于 visualViewport（布局视口/地址栏），
    // 不能把这个差值当成键盘高度，否则底栏 padding-bottom 会把消息区挤成一条缝。
    const ae = document.activeElement;
    const typing = !!(ae && !ae.readOnly && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
    if (!typing) return 0;
    const inset = Math.max(0, Math.round(window.innerHeight - vv.height - (vv.offsetTop || 0)));
    if (inset < 80) return 0;
    const cap = Math.min(520, Math.round((vv.height || 0) * 0.75));
    if (inset > cap) return 0;
    return inset;
  }
  function syncKeyboard() {
    try {
      const inset = keyboardInset();
      const val = inset + 'px';
      if (!setVar(document.body, '--kb-inset', val)) return;
      if (inset > 40) {
        const convView = $('conv-view');
        if (convView && !convView.hidden) { const lg = $('conv-log'); if (lg) lg.scrollTop = lg.scrollHeight; }
        const lobby = $('tab-lobby');
        if (lobby && !lobby.hidden) { const lg = $('lobby-log'); if (lg) lg.scrollTop = lg.scrollHeight; }
      }
    } catch (_) { setVar(document.body, '--kb-inset', '0px'); }
  }
  let lastPetAvoid = '';
  function notifyPetAvoid(on) {
    try {
      const rects = [];
      ['conv-form', 'conv-send', 'lobby-form'].forEach(id => { const el = $(id); if (el && !el.hidden) { const r = el.getBoundingClientRect(); if (r.width && r.height) rects.push({ id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), left: Math.round(r.left) }); } });
      const nav = document.querySelector('.sg-nav'); if (nav && getComputedStyle(nav).visibility !== 'hidden') { const r = nav.getBoundingClientRect(); if (r.height > 1) rects.push({ id: 'sg-nav', x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), left: Math.round(r.left) }); }
      const key = (on ? 'edge' : 'clear') + JSON.stringify(rects);
      if (key === lastPetAvoid) return;
      lastPetAvoid = key;
      window.dispatchEvent(new CustomEvent('star-pet-avoid', { detail: { mode: on ? 'edge' : 'clear', rects } }));
    } catch (_) {}
  }
  function bootLayoutGuards() {
    const relayout = () => { measureChrome(); syncKeyboard(); };
    let roTick = 0;
    const relayoutDebounced = () => {
      if (roTick) return;
      roTick = requestAnimationFrame(() => {
        roTick = 0;
        relayout();
        notifyPetAvoid(document.body.classList.contains('sg-in-chatroom') || document.body.classList.contains('sg-in-conversation'));
      });
    };
    function onVvChange() {
      const ae = document.activeElement;
      const typing = !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
      if (!typing) { setVar(document.body, '--kb-inset', '0px'); return; }
      syncKeyboard();
    }
    relayout();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(relayoutDebounced);
      [document.querySelector('.sg-nav'), $('lobby-form'), $('conv-form'), $('lobby-hint'), document.querySelector('.sg-chat-head'), document.getElementById('sg-demo-banner')].forEach(el => el && ro.observe(el));
    }
    window.addEventListener('resize', relayoutDebounced);
    window.visualViewport?.addEventListener('resize', onVvChange);
    window.visualViewport?.addEventListener('scroll', onVvChange);
    window.addEventListener('focusin', syncKeyboard);
    window.addEventListener('focusout', () => setTimeout(syncKeyboard, 50));
    window.addEventListener('pageshow', relayout);
    requestAnimationFrame(relayout);
    setTimeout(relayout, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLayoutGuards); else bootLayoutGuards();

  function initComm() { loadComm('dm', true); loadComm('guild', true); }

  // ---------- 输入：表情 / 破冰话题（只插草稿） / 字数 / IME ----------
  const input = $('lobby-input'), MAXLEN = 300, COUNT_SHOW = 260;
  const HINT_KEY = 'sg-lobby-hint-dismissed-v1';
  function maybeShowLobbyHint() {
    const h = $('lobby-hint'); if (!h) return;
    try { if (localStorage.getItem(HINT_KEY) === '1') { h.hidden = true; return; } } catch (_) {}
    h.hidden = false;
  }
  function dismissLobbyHint() {
    const h = $('lobby-hint'); if (h) h.hidden = true;
    try { localStorage.setItem(HINT_KEY, '1'); } catch (_) {}
    measureChrome();
  }
  const updCount = () => {
    const n = input.value.length, c = $('lobby-count');
    if (!c) return;
    c.textContent = `${n}/${MAXLEN}`;
    c.hidden = n < COUNT_SHOW;
  };
  function insertText(t) {
    const r = Core.insertAt(input.value, input.selectionStart, input.selectionEnd, t, MAXLEN);
    input.value = r.value; input.focus(); try { input.setSelectionRange(r.caret, r.caret); } catch {} updCount();
    if (r.truncated) toast('已达 300 字上限');
  }
  function closeChatPops(except) {
    const pairs = [
      [$('plus-btn'), $('plus-panel')],
      [$('emoji-btn'), $('emoji-panel')],
      [$('topic-btn'), $('topic-panel')],
      [$('emoji-more-btn'), $('emoji-pop')],
      [$('sticker-btn'), $('sticker-pop')],
      [$('lobby-more-btn'), $('lobby-more-menu')],
      [$('conv-more-btn'), $('conv-more-menu')],
      [$('conv-plus-btn'), $('conv-plus-panel')]
    ];
    for (const [b, p] of pairs) {
      if (!p || p === except) continue;
      p.hidden = true; if (b) b.setAttribute('aria-expanded', 'false');
    }
  }
  function togglePanel(btn, panel, open) {
    if (!panel) return;
    const on = open ?? panel.hidden;
    if (on) closeChatPops(panel);
    panel.hidden = !on; if (btn) btn.setAttribute('aria-expanded', String(on));
  }
  $('emoji-panel') && $('emoji-panel').replaceChildren(...Core.EMOJI.map(e => el('button', { type: 'button', class: 'sg-emoji', text: e, 'aria-label': '插入表情 ' + e, onclick: () => insertText(e) })));
  $('topic-panel') && $('topic-panel').replaceChildren(el('small', { class: 'sg-muted', text: '点一下放进输入框，确认后再发送' }), ...Core.ICEBREAKERS.map(t => el('button', { type: 'button', class: 'sg-chip-btn', text: t, onclick: () => { insertText(t); togglePanel($('topic-btn'), $('topic-panel'), false); } })));
  // 聊天室控件：事件委托（重渲染/缓存错位后仍可用）
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('button, a, [data-act]');
    if (!t) {
      if (!e.target.closest('#lobby-form, #conv-form, #emoji-pop, #sticker-pop, .sg-chat-head, .sg-chat-menu, .sg-panel, .sg-pop')) closeChatPops();
      return;
    }
    const id = t.id;
    if (id === 'plus-btn') { e.preventDefault(); togglePanel($('plus-btn'), $('plus-panel')); return; }
    if (id === 'emoji-btn') { e.preventDefault(); togglePanel($('emoji-btn'), $('emoji-panel')); return; }
    if (id === 'topic-btn') { e.preventDefault(); togglePanel($('plus-btn'), $('plus-panel'), false); togglePanel($('topic-btn'), $('topic-panel')); return; }
    if (id === 'image-btn') { e.preventDefault(); toast('图片功能准备中：需要存储权限、图片审核与元数据清理后才会开放'); return; }
    if (id === 'lobby-hint-dismiss') { e.preventDefault(); dismissLobbyHint(); return; }
    if (id === 'lobby-more-btn') { e.preventDefault(); e.stopPropagation(); togglePanel($('lobby-more-btn'), $('lobby-more-menu')); return; }
    if (id === 'conv-more-btn') { e.preventDefault(); e.stopPropagation(); togglePanel($('conv-more-btn'), $('conv-more-menu')); return; }
    if (id === 'conv-plus-btn') { e.preventDefault(); togglePanel($('conv-plus-btn'), $('conv-plus-panel')); return; }
    if (id === 'lobby-rules-btn') { e.preventDefault(); togglePanel($('lobby-more-btn'), $('lobby-more-menu'), false); toast('友善聊天，禁止联系方式与链接；内容经服务端审核'); return; }
    if (t.closest('.sg-chat-menu a[href="#skins"]')) { closeChatPops(); return; }
    if (!t.closest('#lobby-form, #conv-form, #emoji-pop, #sticker-pop, .sg-chat-head, .sg-chat-menu, .sg-panel, .sg-pop')) closeChatPops();
  });
  input.addEventListener('input', updCount);
  input.addEventListener('keydown', e => {
    if (Core.isImeEnter(e)) { e.preventDefault(); e.stopPropagation(); }
    if (e.key === 'Escape') closeChatPops();
  });
  let composing = false;
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { setTimeout(() => { composing = false; }, 0); });
  $('lobby-form').addEventListener('submit', e => { if (composing) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  updCount();

  // ---------- 举报 ----------
  function askReason() { return new Promise(res => { const d = $('report-dialog'); d.returnValue = ''; d.showModal(); d.onclose = () => res(d.returnValue === 'ok' ? $('report-reason').value : null); }); }
  async function report(rpcName, args) { if (!ready) return toast('服务尚未启用'); const reason = await askReason(); if (reason) guarded(null, async () => { await rpc(rpcName, { ...args, p_reason: reason }); toast('已收到举报，感谢'); }); }

  // ---------- 大厅（可靠性：去重合并 / 代际防旧响应 / 有限退避重连 / 幂等发送） ----------
  const log = $('lobby-log');
  let msgs = [], hasOlder = true, unseen = 0, lobbyInited = false, lobbyChannel = null, rtAttempt = 0, rtTimer = null, pollTimer = null;
  const gen = Core.createGen(); let fullBusy = false, fullQueued = false, olderBusy = false;
  const jobs = new Map(); // clientId -> {job, state:'pending'|'failed'|'unknown', note}
  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  const toBottom = () => { log.scrollTop = log.scrollHeight; unseen = 0; $('lobby-newpill').hidden = true; };
  let busyTimer = 0;
  function markBusy() {
    document.body.classList.add('sg-busy');
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => document.body.classList.remove('sg-busy'), 180);
  }
  log.addEventListener('scroll', () => { markBusy(); if (nearBottom()) { unseen = 0; $('lobby-newpill').hidden = true; syncRead(); } if (log.scrollTop < 40 && hasOlder) loadOlder(); }, { passive: true });
  $('conv-log')?.addEventListener('scroll', markBusy, { passive: true });
  $('lobby-newpill').addEventListener('click', toBottom);

  function lobbyMsg(m, fresh) {
    const nick = m.mine ? myNick : m.nickname;
    const nickEl = m.mine ? el('span', { class: 'sg-nick', text: '我' }) : el('button', { type: 'button', class: 'sg-nick', text: nick, 'aria-label': `${nick}：查看操作` });
    if (!m.mine) nickEl.addEventListener('click', () => userSheet(m));
    const look = Core.safeLook(m);
    const body = el('div', { class: 'sg-msg-body' }, el('div', { class: 'sg-meta-line' }, look.tier ? el('img', { class: 'sg-vip', src: `../assets/vip-emblem-${look.tier}.webp`, alt: `VIP${look.tier}`, title: `VIP${look.tier}` }) : null, nickEl, el('time', { datetime: m.created_at, text: hhmm(m.created_at) })), el('div', { class: 'sg-bubble' + (look.bubble !== 'default' ? ' sg-bub-' + look.bubble : ''), text: m.body }));
    return el('div', { class: 'sg-msg' + (m.mine ? ' me' : '') + (fresh ? ' fresh' : ''), 'data-id': String(m.id) }, el('div', { class: 'sg-av-wrap' }, el('img', { class: 'sg-avatar', src: look.avatar || (m.mine ? SELF_AVATAR : avatarFor(nick)), alt: '', loading: 'lazy' }), look.pendant ? el('img', { class: 'sg-pendant', src: look.pendant, alt: '' }) : null), body);
  }
  function jobNode(j) {
    const n = lobbyMsg({ id: 'job', mine: true, body: j.job.body, created_at: new Date().toISOString() }, false);
    n.removeAttribute('data-id'); n.classList.add(j.state === 'pending' ? 'pending' : 'failed');
    if (j.state !== 'pending') {
      const box = n.querySelector('.sg-msg-body');
      box.append(el('div', { class: 'sg-retry', text: j.note }));
      const row = el('div', { class: 'sg-row' });
      if (j.retryable) row.append(el('button', { type: 'button', class: 'sg-retry', text: '重试', onclick: () => sendJob(j.job) }));
      row.append(el('button', { type: 'button', class: 'sg-retry', text: '编辑', onclick: () => { jobs.delete(j.job.clientId); $('lobby-input').value = j.job.body; render({ keep: true }); $('lobby-input').focus(); } }));
      row.append(el('button', { type: 'button', class: 'sg-retry', text: '删除', onclick: () => { jobs.delete(j.job.clientId); render({ keep: true }); } }));
      box.append(row);
    }
    return n;
  }
  // 由状态整体渲染；非底部时以首个可见消息为锚点保持阅读位置。
  function render({ keep = true, freshIds = null } = {}) {
    const stick = nearBottom();
    const existing = [...log.querySelectorAll('.sg-msg[data-id]')];
    const existingIds = existing.map(n => n.dataset.id);
    const msgIds = msgs.map(m => String(m.id));
    const canAppend = !jobs.size && existingIds.length && msgIds.length > existingIds.length
      && msgIds.slice(0, existingIds.length).every((id, i) => id === existingIds[i])
      && !log.querySelector('.sg-state');
    if (canAppend) {
      for (const m of msgs.slice(existingIds.length)) log.appendChild(lobbyMsg(m, freshIds?.has(String(m.id))));
      if (stick || !keep) toBottom();
      syncRead();
      return;
    }
    const anchor = (!stick && keep) ? existing.find(n => n.offsetTop + n.offsetHeight > log.scrollTop) : null;
    const anchorId = anchor?.dataset.id, anchorOff = anchor ? anchor.offsetTop - log.scrollTop : 0;
    const nodes = msgs.map(m => lobbyMsg(m, freshIds?.has(String(m.id))));
    for (const j of jobs.values()) nodes.push(jobNode(j));
    if (!nodes.length) { lobbyState('../assets/lan-chibi.webp', '大厅还没有人说话，来打个招呼吧 ✧'); return; }
    if (hasOlder && msgs.length) nodes.unshift(el('button', { type: 'button', class: 'sg-ghost sg-day', text: '加载更早的消息', onclick: loadOlder }));
    log.replaceChildren(...nodes);
    if (stick || !keep) toBottom();
    else if (anchorId) { const n = log.querySelector(`.sg-msg[data-id="${CSS.escape(anchorId)}"]`); if (n) log.scrollTop = n.offsetTop - anchorOff; }
    syncRead();
  }
  // ---------- 未读（last-read 按 uid+会话 存本机；只在：大厅页可见 + 页面可见 + 滚到底部 时前进） ----------
  const RK = () => Core.readKey(me, 'lobby');
  const getRead = () => { try { return Number(localStorage.getItem(RK())) || 0; } catch { return 0; } };
  const setRead = v => { try { localStorage.setItem(RK(), String(v)); } catch {} };
  const lobbyShown = () => !$('tab-lobby').hidden && visible();
  function syncRead() {
    if (!RK()) return;
    let r = getRead();
    if (lobbyShown() && nearBottom() && msgs.length) { const n = Core.advanceRead(r, Core.maxId(msgs)); if (n !== r) { r = n; setRead(r); } }
    const u = Core.unreadCount(msgs, r), badge = u > 99 ? '99+' : String(u);
    $('conv-lobby-unread').hidden = !u; $('conv-lobby-unread').textContent = badge; $('conv-lobby-unread').setAttribute('aria-label', `${u} 条未读`);
    $('nav-unread').hidden = !u; $('nav-unread').textContent = badge;
    const last = msgs[msgs.length - 1]; $('conv-lobby-last').textContent = last ? `${last.mine ? '我' : last.nickname}：${last.body}`.slice(0, 40) : '暂无消息';
  }
  // 全量：替换为最新窗口（覆盖已加载历史，至多 200），隐藏/拉黑/撤回的旧缓存在此失效。
  async function refreshFull() {
    if (fullBusy) { fullQueued = true; return; } fullBusy = true; const g = gen.bump();
    try {
      const lim = Core.refetchLimit(msgs.length);
      const rows = await rpc('lobby_history', { p_before_id: null, p_limit: lim });
      if (!gen.isCurrent(g)) return;
      msgs = Core.mergeById([], rows); hasOlder = rows.length >= lim; render();
    } catch (e) { if (!msgs.length && !jobs.size) lobbyState('../assets/mo-chibi.webp', '加载失败：' + errText(e)); else status('off', '同步失败，稍后自动重试'); }
    finally { fullBusy = false; if (fullQueued) { fullQueued = false; refreshFull(); } }
  }
  // 增量：从回退窗口起拉新消息并去重；期间若发生全量刷新则丢弃结果。
  async function refreshIncremental() {
    const g = gen.current();
    try {
      const rows = await rpc('lobby_feed', { p_after: Core.incrementalAfter(msgs), p_limit: 100 });
      if (!gen.isCurrent(g) || !rows.length) return;
      const before = new Set(msgs.map(m => String(m.id)));
      const fresh = new Set(rows.filter(m => !before.has(String(m.id))).map(m => String(m.id)));
      if (!fresh.size) return;
      const stick = nearBottom();
      msgs = Core.mergeById(msgs, rows); render({ freshIds: fresh });
      if (!stick) { unseen += rows.filter(m => fresh.has(String(m.id)) && !m.mine).length; if (unseen) { $('lobby-newpill').textContent = `有 ${unseen} 条新消息 ↓`; $('lobby-newpill').hidden = false; } }
    } catch { status('off', '同步失败，稍后自动重试'); }
  }
  async function loadOlder() {
    if (olderBusy || !hasOlder || !msgs.length) return; olderBusy = true; const g = gen.current();
    try {
      const rows = await rpc('lobby_history', { p_before_id: Number(msgs[0].id), p_limit: 50 });
      if (!gen.isCurrent(g)) return;
      if (rows.length < 50) hasOlder = false;
      const h = log.scrollHeight, top = log.scrollTop;
      msgs = Core.mergeById(msgs, rows); render({ keep: false }); log.scrollTop = 0;
      log.scrollTop = top + (log.scrollHeight - h);
    } catch (e) { toast('加载更早消息失败：' + errText(e)); } finally { olderBusy = false; }
  }
  // Realtime：只作信号；断开后有限指数退避重订阅（上限 30s），期间 30s 轮询兜底。
  function subscribeLobby() {
    clearTimeout(rtTimer); rtTimer = null;
    if (lobbyChannel) { sb.removeChannel(lobbyChannel); lobbyChannel = null; }
    const ch = sb.channel('lobby-' + Core.uuid()); lobbyChannel = ch;
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lobby_messages' }, () => refreshIncremental())
      .subscribe(s => {
        if (ch !== lobbyChannel) return; // 旧频道回调忽略
        if (s === 'SUBSCRIBED') { if (rtAttempt) refreshIncremental(); rtAttempt = 0; status('ok', '在线'); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          if (!navigator.onLine) { status('off', '网络已断开'); return; }
          const d = Core.backoffDelay(rtAttempt++); status('off', `实时连接中断，${Math.ceil(d / 1000)} 秒后重连（期间每 30 秒同步）`);
          if (!rtTimer) rtTimer = setTimeout(() => { rtTimer = null; subscribeLobby(); }, d);
        }
      });
  }
  function initLobby() {
    if (lobbyInited) return; lobbyInited = true;
    refreshFull(); subscribeLobby();
    pollTimer = setInterval(() => { if (visible() && !$('tab-lobby').hidden && navigator.onLine) refreshFull(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (visible() && !$('tab-lobby').hidden) refreshFull(); });
    window.addEventListener('offline', () => { status('off', '网络已断开，消息不会发送'); });
    window.addEventListener('online', () => { status('off', '网络恢复，正在重连…'); rtAttempt = 0; subscribeLobby(); refreshFull(); });
  }
  const lobbyRefresh = full => full ? refreshFull() : refreshIncremental(); // 兼容既有调用
  // 发送：同一 clientId 绑定同一正文；超时/断网可安全重试，服务端幂等不会重复。
  async function sendJob(job) {
    if (!ready) return toast('服务尚未启用');
    if (!navigator.onLine) { jobs.set(job.clientId, { job, state: 'failed', retryable: true, note: '网络已断开，未发送' }); render(); return; }
    jobs.set(job.clientId, { job, state: 'pending' }); render();
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
    try {
      // 优先 15 号 lobby_send_v1（拒绝时持久化审核日志）；仅当 v1 未部署（PGRST202）时用原 lobby_send（同样服务端审核，仅缺拒绝日志）
      let { data, error } = await sb.rpc('lobby_send_v1', { p_body: job.body, p_client_id: job.clientId }).abortSignal(ctl.signal);
      if (error && error.code === 'PGRST202') ({ data, error } = await sb.rpc('lobby_send', { p_body: job.body, p_client_id: job.clientId }).abortSignal(ctl.signal));
      if (error) throw error;
      if (data && data.ok === false) throw Object.assign(new Error(data.error?.code === 'TEXT_REJECTED' ? '内容未通过审核' : data.error?.code === 'RATE_LIMITED' ? '发送太频繁' : '发送失败'), { code: data.error?.code === 'RATE_LIMITED' ? 'P0001' : '22023', hint: data.error?.code === 'RATE_LIMITED' ? 'rate_limited' : 'banned' });
      jobs.delete(job.clientId); if (data) await refreshIncremental(); render(); toBottom();
    } catch (e) {
      const kind = Core.classifyError(e);
      const note = kind === 'timeout' ? '网络超时，结果未知：可安全重试，不会重复发送'
        : kind === 'network' ? '网络错误，未确认发送：可安全重试'
        : kind === 'rate' ? '发送太频繁，请稍后重试'
        : '未发送：' + errText(e);
      jobs.set(job.clientId, { job, state: kind === 'timeout' ? 'unknown' : 'failed', retryable: kind !== 'rule', note }); render();
    } finally { clearTimeout(t); }
  }
  $('lobby-form').addEventListener('submit', e => {
    e.preventDefault(); if (!ready) return toast('服务尚未启用');
    const input = $('lobby-input'), v = input.value.trim(); if (!v) return;
    input.value = ''; updCount(); sendJob(Core.makeJob(v));
  });
  function userSheet(m) {
    const d = $('user-sheet'); $('sheet-title').textContent = m.nickname; $('sheet-avatar').src = avatarFor(m.nickname);
    $('sheet-quote').textContent = '“' + (m.body.length > 40 ? m.body.slice(0, 40) + '…' : m.body) + '”';
    d.returnValue = ''; d.showModal();
    d.onclose = () => {
      const v = d.returnValue;
      if (v === 'friend') guarded(null, () => friendFromLobby(m.id, false));
      if (v === 'report') report('lobby_report', { p_message: m.id });
      if (v === 'block' && confirm('拉黑后双方互相看不到大厅消息，也无法私信或加好友。确定拉黑？')) guarded(null, async () => { await rpc('block_from_lobby', { p_message: m.id }); toast('已拉黑'); lobbyRefresh(true); loadBlocks(); });
    };
  }
  const FR_TEXT = { pending: '已发送好友申请，对方同意后才能私聊', already_pending: '已申请过，等待对方同意', already_friends: '你们已经是好友', accepted: '已接受对方的申请，你们成为好友了' };
  async function friendFromLobby(msgId, acceptExisting) {
    const r = await rpc('friend_request_from_lobby', { p_message: msgId, p_accept_existing: acceptExisting });
    if (r.status === 'incoming_pending') {
      // 对方已向你申请：必须再次明确确认才会接受。
      if (confirm('对方已经向你发送过好友申请。\n点“确定”将接受该申请并成为好友（可互发私信）；点“取消”不做任何操作。')) return friendFromLobby(msgId, true);
      return toast('未做更改');
    }
    toast(FR_TEXT[r.status] || '已处理');
  }


  // ---------- 外观：唯一权威 = 主体 get_public_appearance（shop/ADAPTER.md §A）。本页不保存外观，只读本人投影设置自己的背景。 ----------
  const fxKey = 'star-social-fx-v1';
  const fxOn = () => { try { return localStorage.getItem(fxKey) !== 'off'; } catch { return true; } };
  function applyFx() { document.body.classList.toggle('fx-on', fxOn()); $('fx-toggle').checked = fxOn(); }
  $('fx-toggle').addEventListener('change', e => { try { localStorage.setItem(fxKey, e.target.checked ? 'on' : 'off'); } catch {} applyFx(); });
  document.body.dataset.theme = 'starry';
  applyFx();
  let lookAt = 0;
  async function loadOwnLook(force) {
    if (!ready || (!force && Date.now() - lookAt < 60000)) return;
    lookAt = Date.now();
    try {
      const { data, error } = await sb.rpc('get_public_appearance');   // 不传参 = 只读本人
      if (error) throw error;
      const me = Array.isArray(data) ? data[0] : null;
      document.body.dataset.theme = Core.themeFor(me && me.background_id);
      const cov = Core.coverFor(document.body.dataset.theme); $('me-cover').style.backgroundImage = cov ? `url("${cov}")` : '';
      const hero = Core.heroFromLook(me);
      $('me-avatar').src = hero.avatar; $('me-vip').textContent = hero.vip; $('me-vip').className = 'sg-tag' + (hero.vipOn ? ' vip' : '');
      if (hero.pendant) { $('me-pendant').src = hero.pendant; $('me-pendant').hidden = false; } else $('me-pendant').hidden = true;
      $('me-badge').hidden = !hero.badge; $('me-badge').textContent = hero.badge || '';
      $('look-state').textContent = me ? (me.appearance_public ? '萌宠公开：开' : '萌宠公开：关') : '未读取到';
      $('look-state').classList.toggle('sg-off', !(me && me.appearance_public));
    } catch { document.body.dataset.theme = 'starry'; $('look-state').textContent = '外观服务暂不可用'; $('look-state').classList.add('sg-off'); $('me-vip').textContent = 'VIP 状态暂不可读'; $('me-vip').className = 'sg-tag unknown'; }
  }
  window.addEventListener('starshopchange', () => loadOwnLook(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadOwnLook(false); });

  // 气泡/特效/头像框：统一入口为「我」页 #cc-section（social-appearance.js，get_shop_state + equip_chat_cosmetic）；旧四气泡入口已移除。

  // ---------- 资料契约（PUBLIC-PROFILE-API，本地提案）：仅探测是否部署，未部署显示未接入；不调用写接口 ----------
  async function probeProfile() {
    try {
      const { error } = await sb.rpc('get_public_profile', { p_public_id: '00000000-0000-4000-8000-000000000000' });
      const st = Core.profileProbe(error);
      $('me-sign').textContent = st === 'deployed' ? '签名：见下方「公开资料」' : '签名：未接入（资料接口未部署）';
      $('me-level').textContent = st === 'deployed' ? '等级：见下方「公开资料」' : '等级：未接入';
    } catch { /* 保持未接入 */ }
  }

  // ---------- 树洞 ----------
  const PAGE = 20; let oldest = null;
  $('post-body').addEventListener('input', e => { $('post-count').textContent = e.target.value.length + '/500'; });
  $('post-form').addEventListener('submit', e => { e.preventDefault(); const btn = e.submitter; guarded(btn, async () => {
    const body = $('post-body').value.trim(); if (!body) return toast('写点什么吧');
    await rpc('tree_create_post', { p_body: body }); $('post-body').value = ''; $('post-count').textContent = '0/500'; toast('已匿名发布'); loadPosts(true);
  }); });
  $('post-more').addEventListener('click', () => loadPosts(false));
  async function loadPosts(reset) {
    const list = $('post-list');
    try {
      let q = sb.from('tree_posts').select('id,body,like_count,comment_count,created_at').order('id', { ascending: false }).limit(PAGE);
      if (!reset && oldest) q = q.lt('id', oldest);
      const { data, error } = await q; if (error) throw error;
      if (reset) list.replaceChildren();
      if (reset && !data.length) { empty(list, '树洞还很安静，来写第一条吧'); $('post-more').hidden = true; return; }
      const marks = data.length ? await rpc('tree_my_marks', { p_posts: data.map(p => p.id) }) : { liked: [], mine: [] };
      for (const p of data) list.append(postCard(p, marks.liked.includes(p.id), marks.mine.includes(p.id)));
      oldest = data.length ? data[data.length - 1].id : oldest; $('post-more').hidden = data.length < PAGE;
    } catch (e) { empty(list, '加载失败：' + errText(e)); }
  }
  function postCard(p, liked, mine) {
    const like = el('button', { type: 'button', 'aria-pressed': String(liked), text: (liked ? '♥ ' : '♡ ') + p.like_count });
    like.addEventListener('click', () => guarded(like, async () => { const r = await rpc('tree_toggle_like', { p_post: p.id }); like.textContent = (r.liked ? '♥ ' : '♡ ') + r.like_count; like.setAttribute('aria-pressed', String(r.liked)); }));
    const comments = el('div', { class: 'sg-comments', hidden: '' });
    const cBtn = el('button', { type: 'button', text: '💬 ' + p.comment_count });
    cBtn.addEventListener('click', () => { comments.hidden = !comments.hidden; if (!comments.hidden) loadComments(p.id, comments); });
    const meta = el('div', { class: 'sg-meta' }, el('span', { text: '匿名 · ' + fmt(p.created_at) }), like, cBtn);
    const card = el('article', { class: 'sg-post' }, el('p', { text: p.body }), meta, comments);
    if (mine) { const del = el('button', { type: 'button', text: '删除' }); del.addEventListener('click', () => { if (confirm('删除这条树洞？')) guarded(del, async () => { await rpc('tree_delete_own_post', { p_post: p.id }); card.remove(); }); }); meta.append(el('span', { text: '我发的' }), del); }
    else meta.append(el('button', { type: 'button', text: '举报', 'data-pet-avoid': '', onclick: () => report('social_report', { p_type: 'post', p_target: String(p.id) }) }));
    return card;
  }
  async function loadComments(postId, box) {
    try {
      const { data, error } = await sb.from('tree_comments').select('id,body,created_at').eq('post_id', postId).order('id').limit(100); if (error) throw error;
      box.replaceChildren(...data.map(c => el('div', {}, document.createTextNode('匿名：' + c.body + ' '), el('button', { type: 'button', class: 'sg-ghost', text: '举报', 'data-pet-avoid': '', onclick: () => report('social_report', { p_type: 'comment', p_target: String(c.id) }) }))));
      const input = el('input', { maxlength: '200', placeholder: '温柔地回应…', 'aria-label': '评论' });
      const send = el('button', { type: 'button', class: 'sg-primary', text: '评论' });
      send.addEventListener('click', () => guarded(send, async () => { const v = input.value.trim(); if (!v) return; await rpc('tree_create_comment', { p_post: postId, p_body: v }); loadComments(postId, box); }));
      box.append(el('div', { class: 'sg-row' }, input, send));
    } catch (e) { empty(box, '评论加载失败：' + errText(e)); }
  }

  // ---------- 资料 ----------
  const tagBox = $('interests');
  INTERESTS.forEach(t => tagBox.append(el('label', {}, el('input', { type: 'checkbox', value: t }), document.createTextNode(t))));
  let beat = null;
  async function loadProfile() {
    const { data } = await sb.from('social_profiles').select('nickname,interests,discoverable').eq('user_id', me).maybeSingle();
    if (data) { myNick = data.nickname; $('me-nick').textContent = data.nickname || '星糖旅人'; $('nick').value = data.nickname; $('discoverable').checked = data.discoverable; tagBox.querySelectorAll('input').forEach(i => { i.checked = data.interests.includes(i.value); }); }
    $('lobby-nick').textContent = myNick; heartbeat(data?.discoverable);
  }
  function heartbeat(on) { clearInterval(beat); if (!on) return; const tick = () => { if (visible()) rpc('social_heartbeat').catch(() => {}); }; tick(); beat = setInterval(tick, 60000); }
  $('profile-form').addEventListener('submit', e => { e.preventDefault(); const btn = e.submitter; guarded(btn, async () => {
    const ints = [...tagBox.querySelectorAll('input:checked')].map(i => i.value).slice(0, 8);
    await rpc('social_upsert_profile', { p_nickname: $('nick').value.trim(), p_interests: ints, p_discoverable: $('discoverable').checked });
    await loadProfile(); toast('已保存，新的发言将使用新昵称');
  }); });

  // ---------- 拉黑列表 ----------
  function person(name, online, ...actions) {
    return el('div', { class: 'sg-person' }, el('img', { class: 'sg-avatar', src: avatarFor(name), alt: '' }),
      el('div', { class: 'sg-grow' }, el('div', { text: name }), online == null ? null : el('small', {}, el('span', { class: 'sg-dot' + (online ? ' on' : '') }), document.createTextNode(online ? '在线' : '离线'))), ...actions);
  }
  async function loadBlocks() {
    const bl = $('block-list');
    try {
      const data = await rpc('social_block_list');
      if (!data.length) return empty(bl, '没有拉黑任何人');
      bl.replaceChildren(...data.map(b => el('div', { class: 'sg-row' }, el('span', { class: 'sg-muted', text: '已拉黑 · ' + fmt(b.created_at) }), el('button', { type: 'button', class: 'sg-ghost', text: '解除', onclick: e => guarded(e.target, async () => { await rpc('social_unblock', { p_block: b.block_id }); loadBlocks(); lobbyRefresh(true); }) }))));
    } catch (e) { empty(bl, '加载失败：' + errText(e)); }
  }

  // ---------- 好友与私信（逐步开放） ----------
  let inboxChannel = null, matchTimer = null;
  async function loadFriends() {
    try {
      const reqs = await rpc('friend_pending'); const rl = $('req-list');
      if (!reqs.length) empty(rl, '暂无新的好友请求'); else rl.replaceChildren(...reqs.map(r => person(r.nickname, null,
        el('button', { type: 'button', class: 'sg-primary', text: '接受', onclick: e => guarded(e.target, async () => { await rpc('friend_respond', { p_request: r.request_id, p_accept: true }); loadFriends(); }) }),
        el('button', { type: 'button', text: '拒绝', onclick: e => guarded(e.target, async () => { await rpc('friend_respond', { p_request: r.request_id, p_accept: false }); loadFriends(); }) }))));
      const fr = await rpc('friend_list'); const fl = $('friend-list');
      $('stat-friends').textContent = Core.statText(Array.isArray(fr) ? fr.length : null); $('stat-friends').parentElement.classList.toggle('unknown', !Array.isArray(fr));
      if (!fr.length) empty(fl, '还没有好友，可以在大厅点昵称申请'); else fl.replaceChildren(...fr.map(f => friendRow(f.nickname, f.online,
        el('button', { type: 'button', class: 'sg-primary', text: '私信', onclick: () => openChat(f) }),
        el('button', { type: 'button', text: '拉黑', onclick: e => { if (confirm('拉黑后将解除好友，双方无法私信。确定？')) guarded(e.target, async () => { await rpc('social_block', { p_user: f.user_id }); if (conv?.kind === 'dm') closeConv(); loadFriends(); loadBlocks(); }); } }))));
    } catch (e) { empty($('friend-list'), '加载失败：' + errText(e)); }
    filterFriends();
  }
  function friendRow(nick, online, ...btns) {
    const st = Core.friendStatus(online);
    const row = el('div', { class: 'sg-friend', role: 'listitem' }, el('img', { class: 'sg-avatar', src: avatarFor(nick), alt: '' }),
      el('span', { class: 'sg-conv-main' }, el('b', { text: nick }), el('small', { class: 'sg-dot-' + st.kind, text: st.text })), el('span', { class: 'sg-row' }, ...btns));
    row.dataset.nick = String(nick || '').normalize('NFKC'); return row;
  }
  // 好友侧栏「私信」统一导向 owner community DM 会话流（community_dm_open → 会话视图，发送走 12 v1）。
  // 旧 01 dm_send 可发送路径已移除；历史消息仍在同一 public.dm_messages，由 community_chat_messages 在会话视图中完整显示（不丢历史）。
  // 接口缺失时明确提示待接，不回退旧接口。
  async function openChat(f) {
    try {
      const d = await commRpc('community_dm_open', { p_peer_id: f.user_id });
      if (!Core.isUuid(d?.conversation_id)) throw Object.assign(new Error('会话打开失败'), { kind: 'UNKNOWN' });
      showTab('chats');
      await openConv({ kind: 'dm', id: d.conversation_id, title: f.nickname || '好友' });
    } catch (e) { toast(e.kind === 'missing' ? '好友私信会话接口待接入（暂不可发送）' : '无法打开私信：' + e.message); }
  }
  function subscribeInbox() {   // 仅提示与刷新当前会话；不在旧面板追加
    inboxChannel = sb.channel('dm-inbox-' + me).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: 'recipient_id=eq.' + me }, () => {
      if (conv && conv.kind === 'dm' && window.StarSocialConv) window.StarSocialConv.refresh(); else toast('收到一条新私信');
    }).subscribe();
  }
  $('discover-load').addEventListener('click', e => guarded(e.target, async () => {
    const rows = await rpc('social_discover', { p_online_only: $('online-only').checked }); const box = $('discover-list');
    if (!rows.length) return empty(box, '暂时没有可推荐的人');
    box.replaceChildren(...rows.map(r => person(r.nickname + (r.interests.length ? ' · ' + r.interests.join('/') : ''), r.online,
      el('button', { type: 'button', class: 'sg-primary', text: '加好友', onclick: ev => addFriend(ev.target, r.user_id, false) }))));
  }));
  async function addFriend(btn, uid, acceptExisting) { await guarded(btn, async () => {
    const r = await rpc('friend_request', { p_to: uid, p_accept_existing: acceptExisting });
    if (r.status === 'incoming_pending') { if (confirm('对方已经向你发送过好友申请。\n点“确定”将接受该申请并成为好友；点“取消”不做任何操作。')) return addFriend(btn, uid, true); return toast('未做更改'); }
    toast(FR_TEXT[r.status] || '已处理'); loadFriends();
  }); }
  function stopMatch() { clearInterval(matchTimer); matchTimer = null; $('match-join').hidden = false; $('match-leave').hidden = true; }
  $('match-join').addEventListener('click', e => guarded(e.target, async () => {
    const out = $('match-result'); const started = Date.now();
    const tryOnce = async () => {
      const r = await rpc('social_match_join');
      if (r.status === 'matched') { stopMatch(); out.replaceChildren(person('匹配到：' + r.nickname, null, el('button', { type: 'button', class: 'sg-primary', text: '加好友', onclick: ev => addFriend(ev.target, r.user_id, false) }))); return; }
      out.textContent = '匹配中…（' + Math.round((Date.now() - started) / 1000) + 's）';
      if (Date.now() - started > 110000) { stopMatch(); out.textContent = '暂时没有匹配到，稍后再试'; }
    };
    $('match-join').hidden = true; $('match-leave').hidden = false;
    await tryOnce(); if (!matchTimer && $('match-join').hidden) matchTimer = setInterval(() => tryOnce().catch(err => { stopMatch(); toast(errText(err)); }), 15000);
  }));
  $('match-leave').addEventListener('click', e => guarded(e.target, async () => { stopMatch(); await rpc('social_match_leave'); $('match-result').textContent = '已取消匹配'; }));

  // ---------- 管理员审核（仅 admin_whoami 为真时显示；授权在每个 admin RPC 服务端校验） ----------
  const TYPE_NAME = { post: '树洞帖', comment: '树洞评论', lobby: '大厅消息', message: '私信', user: '用户', guild_message: '公会消息', guild: '公会' };
  async function initAdmin() { try { if (await rpc('admin_whoami')) $('admin-fold').hidden = false; } catch {} }
  async function loadQueue() {
    const box = $('admin-list'); const rows = await rpc('admin_report_queue', { p_status: 'open', p_limit: 50 });
    if (!rows.length) return empty(box, '审核队列为空');
    box.replaceChildren(...rows.map(r => {
      const c = r.content || {}; const text = c.body || c.name || c.nickname || '（内容已不存在）';
      const act = (label, fn) => el('button', { type: 'button', text: label, onclick: e => guarded(e.target, async () => { await fn(); loadQueue(); }) });
      return el('div', { class: 'sg-admin-item' },
        el('div', { class: 'sg-muted', text: `${TYPE_NAME[r.target_type] || r.target_type} #${r.target_id} · 举报 ${r.report_count} · 系统 ${r.system_flags}` + (r.categories.length ? ' · ' + r.categories.join('/') : '') + (c.hidden ? ' · 已隐藏' : '') }),
        el('pre', { text }),
        el('div', { class: 'sg-row' },
          act('隐藏', () => rpc('admin_resolve', { p_type: r.target_type, p_target: r.target_id, p_action: 'hide', p_note: '' })),
          act('恢复', () => rpc('admin_resolve', { p_type: r.target_type, p_target: r.target_id, p_action: 'restore', p_note: '' })),
          act('驳回', () => rpc('admin_resolve', { p_type: r.target_type, p_target: r.target_id, p_action: 'dismiss', p_note: '' })),
          act('封禁24h', async () => { const why = prompt('封禁原因'); if (why) await rpc('admin_ban_target', { p_type: r.target_type, p_target: r.target_id, p_reason: why, p_hours: 24 }); }),
          act('永久封禁', async () => { const why = prompt('永久封禁原因（请谨慎）'); if (why && confirm('确认永久封禁该作者？')) await rpc('admin_ban_target', { p_type: r.target_type, p_target: r.target_id, p_reason: why, p_hours: null }); })));
    }));
  }
  async function loadBans() {
    const box = $('admin-list'); const rows = await rpc('admin_ban_list', { p_active: true });
    if (!rows.length) return empty(box, '当前没有生效的封禁');
    box.replaceChildren(...rows.map(b => el('div', { class: 'sg-admin-item' }, el('div', { text: `封禁 #${b.ban_id} · ${b.reason}` }), el('div', { class: 'sg-muted', text: '至 ' + (b.until ? fmt(b.until) : '永久') }),
      el('button', { type: 'button', text: '解封', onclick: e => guarded(e.target, async () => { await rpc('admin_unban', { p_ban: b.ban_id, p_note: '' }); loadBans(); }) }))));
  }
  $('admin-refresh').addEventListener('click', e => guarded(e.target, loadQueue));
  $('admin-bans').addEventListener('click', e => guarded(e.target, loadBans));

  window.addEventListener('pagehide', () => { clearTimeout(rtTimer); clearInterval(pollTimer); if (inboxChannel) sb?.removeChannel(inboxChannel); if (lobbyChannel) sb?.removeChannel(lobbyChannel); });
  boot().catch(e => { status('off', '未启用'); banner('服务尚未启用：' + errText(e)); });
})();
