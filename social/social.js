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
  const errText = e => (e && e.message) ? e.message.replace(/^.*?:\s*/, '') : '操作失败';
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
    if (!sb) { status('off', '未连接'); banner('服务尚未启用：Supabase SDK 未能加载，请检查网络后刷新。'); lobbyState('../assets/lan-chibi.webp', '暂时无法连接大厅'); return; }
    const { data: { session } = {} } = await sb.auth.getSession().catch(() => ({ data: {} }));
    if (!session) { status('off', '未登录'); banner('登录后即可在大厅聊天。', { href: '../tools.html', text: '回到星糖宇宙登录 →' }); lobbyState('../assets/li-chibi.webp', '请先登录星糖宇宙账号'); return; }
    me = session.user.id;
    const { data, error } = await sb.rpc('social_service_status');
    if (error || !data?.enabled) { status('off', '未启用'); banner('服务尚未启用：大厅后端尚未部署，当前页面仅供预览，不会发送或保存任何内容。'); lobbyState('../assets/mo-chibi.webp', '大厅服务尚未启用'); return; }
    ready = true; banner(''); status('ok', '在线'); setEnabled(true);
    sb.auth.onAuthStateChange((_e, s) => { if (!s) location.reload(); });

    initLobby(); initComm(); loadOwnLook(true); loadPosts(true); loadProfile(); loadBlocks(); subscribeInbox(); initAdmin();
    setInterval(() => { if (visible() && $('friends-fold').open) loadFriends(); }, 60000);
  }

  // ---------- 导航 ----------
  document.querySelectorAll('.sg-nav button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sg-nav button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    let title = '';
    document.querySelectorAll('.sg-tab').forEach(t => { t.hidden = t.dataset.tab !== b.dataset.go; if (!t.hidden) title = t.dataset.title; });
    $('sg-heading').textContent = title; $('lobby-form').hidden = b.dataset.go !== 'lobby';
    if (b.dataset.go === 'lobby' && ready) lobbyRefresh(true);
    if (ready) syncRead();
  }));
  $('friends-fold').addEventListener('toggle', e => { if (e.target.open && ready) loadFriends(); });

  document.addEventListener('visibilitychange', () => { if (ready && visible()) syncRead(); });
  $('conv-lobby').addEventListener('click', () => document.querySelector('.sg-nav [data-go="lobby"]').click());

  // ---------- 会话搜索：仅已加载的本地消息（服务端已过滤隐藏/拉黑）；不发网络请求 ----------
  $('chat-search').addEventListener('input', e => {
    const q = e.target.value, box = $('search-result'); box.hidden = !q.trim();
    if (!q.trim()) return box.replaceChildren();
    const hits = Core.searchMsgs(msgs, q, 30);
    if (!hits.length) return empty(box, '已加载的大厅消息里没有找到');
    box.replaceChildren(...hits.map(m => el('button', { type: 'button', class: 'sg-conv', onclick: () => { document.querySelector('.sg-nav [data-go="lobby"]').click(); setTimeout(() => { const n = log.querySelector(`.sg-msg[data-id="${CSS.escape(String(m.id))}"]`); if (n) { n.scrollIntoView({ block: 'center' }); n.classList.add('sg-hit'); setTimeout(() => n.classList.remove('sg-hit'), 1600); } }, 60); } },
      el('span', { class: 'sg-conv-main' }, el('b', { text: m.mine ? '我' : m.nickname }), el('small', { class: 'sg-muted', text: `${hhmm(m.created_at)} · ${m.body}` })))));
  });

  // ---------- 好友私信 / 公会频道（主体 FRIENDS-GUILD-API.md 提案；只读接入，未部署则降级） ----------
  // 唯一来源：主体 public RPC（服务端 auth.uid() 鉴权）。不查表、不跨账号缓存（仅内存，退出即 reload 清空）。
  const comm = { dm: { state: 'unknown', items: [], cursor: null }, guild: { state: 'unknown', items: [], cursor: null } };
  const convScope = Core.createScope();
  let conv = null; // {kind,id,conversation_id,title,msgs,nextBefore}
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
    finally { c.busy = false; renderCommList(kind); }
  }
  $('dm-more').addEventListener('click', () => loadComm('dm'));
  $('guild-more').addEventListener('click', () => loadComm('guild'));
  function closeConv(reason) {
    convScope.leave(); conv = null; $('conv-log').replaceChildren(); $('conv-view').hidden = true; $('conv-list').hidden = false; $('chat-search').parentElement.hidden = false;
    if (reason) toast(reason);
  }
  function dropRevoked(kind, id, e) {
    comm[kind].items = comm[kind].items.filter(x => x.id !== id); renderCommList(kind);
    closeConv(({ NOT_FRIEND: '你们已不是好友', BLOCKED: '已屏蔽，无法查看', NOT_MEMBER: '你已不在该公会', FORBIDDEN: '无权查看', AUTH_REQUIRED: '请重新登录' })[e.kind] || '无权查看');
  }
  function renderConv() {
    if (!conv) return;
    const lg = $('conv-log'), stick = lg.scrollHeight - lg.scrollTop - lg.clientHeight < 60;
    lg.replaceChildren(...(conv.msgs.length ? conv.msgs.map(m => el('div', { class: 'sg-msg' + (m.mine ? ' me' : '') }, el('div', { class: 'sg-msg-body' }, el('div', { class: 'sg-meta-line' }, ...(m.nickname && !m.mine ? [el('b', { text: m.nickname })] : []), el('time', { datetime: m.created_at, text: hhmm(m.created_at) })), el('div', { class: 'sg-bubble', text: m.body })))) : [el('div', { class: 'sg-empty', text: '暂无消息' })]));
    $('conv-older').hidden = conv.nextBefore == null;
    if (stick) lg.scrollTop = lg.scrollHeight;
    maybeMarkRead();
  }
  async function loadConvPage(t, before) {
    const d = await commRpc('community_chat_messages', { p_conversation_id: conv.conversation_id, p_before_seq: before ?? null, p_limit: 30 });
    if (!convScope.isCurrent(t)) return;                 // 已切换会话：丢弃，防止闪现他人消息
    conv.msgs = Core.mergeBySeq(conv.msgs, (d?.items || []).map(m => Core.normMsg(conv.kind, m, me, null)).filter(Boolean));
    conv.nextBefore = Number.isSafeInteger(Number(d?.next_before_seq)) && d?.next_before_seq != null ? Number(d.next_before_seq) : null;
    renderConv();
  }
  async function openConv(x) {
    const t = convScope.enter(x.kind + ':' + x.id);
    conv = { kind: x.kind, id: x.id, conversation_id: x.kind === 'dm' ? x.id : null, title: x.title, msgs: [], nextBefore: null, readSent: 0 };
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
  function initComm() { loadComm('dm', true); loadComm('guild', true); }

  // ---------- 输入：表情 / 破冰话题（只插草稿） / 字数 / IME ----------
  const input = $('lobby-input'), MAXLEN = 300;
  const updCount = () => { $('lobby-count').textContent = `${input.value.length}/${MAXLEN}`; };
  function insertText(t) {
    const r = Core.insertAt(input.value, input.selectionStart, input.selectionEnd, t, MAXLEN);
    input.value = r.value; input.focus(); try { input.setSelectionRange(r.caret, r.caret); } catch {} updCount();
    if (r.truncated) toast('已达 300 字上限');
  }
  function togglePanel(btn, panel, open) {
    const on = open ?? panel.hidden; panel.hidden = !on; btn.setAttribute('aria-expanded', String(on));
    for (const [b2, p2] of [[$('emoji-btn'), $('emoji-panel')], [$('topic-btn'), $('topic-panel')]]) if (p2 !== panel && on) { p2.hidden = true; b2.setAttribute('aria-expanded', 'false'); }
  }
  $('emoji-panel').replaceChildren(...Core.EMOJI.map(e => el('button', { type: 'button', class: 'sg-emoji', text: e, 'aria-label': '插入表情 ' + e, onclick: () => insertText(e) })));
  $('topic-panel').replaceChildren(el('small', { class: 'sg-muted', text: '点一下放进输入框，确认后再发送' }), ...Core.ICEBREAKERS.map(t => el('button', { type: 'button', class: 'sg-chip-btn', text: t, onclick: () => { if (input.value.trim() && !confirm('替换当前草稿？')) return; input.value = ''; insertText(t); togglePanel($('topic-btn'), $('topic-panel'), false); } })));
  $('emoji-btn').addEventListener('click', () => togglePanel($('emoji-btn'), $('emoji-panel')));
  $('topic-btn').addEventListener('click', () => togglePanel($('topic-btn'), $('topic-panel')));
  $('image-btn').addEventListener('click', () => toast('图片功能准备中：需要存储权限、图片审核与元数据清理后才会开放'));
  input.addEventListener('input', updCount);
  input.addEventListener('keydown', e => { if (Core.isImeEnter(e)) { e.preventDefault(); e.stopPropagation(); } if (e.key === 'Escape') { togglePanel($('emoji-btn'), $('emoji-panel'), false); togglePanel($('topic-btn'), $('topic-panel'), false); } });
  let composing = false;
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { setTimeout(() => { composing = false; }, 0); });
  $('lobby-form').addEventListener('submit', e => { if (composing) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

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
  log.addEventListener('scroll', () => { if (nearBottom()) { unseen = 0; $('lobby-newpill').hidden = true; syncRead(); } if (log.scrollTop < 40 && hasOlder) loadOlder(); }, { passive: true });
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
    const anchor = (!stick && keep) ? [...log.querySelectorAll('.sg-msg[data-id]')].find(n => n.offsetTop + n.offsetHeight > log.scrollTop) : null;
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
      const { data, error } = await sb.rpc('lobby_send', { p_body: job.body, p_client_id: job.clientId }).abortSignal(ctl.signal);
      if (error) throw error;
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
    input.value = ''; $('lobby-count').textContent = `0/300`; sendJob(Core.makeJob(v));
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
      $('look-state').textContent = me ? (me.appearance_public ? '公开展示：开' : '公开展示：关') : '未读取到';
      $('look-state').classList.toggle('sg-off', !(me && me.appearance_public));
    } catch { document.body.dataset.theme = 'starry'; $('look-state').textContent = '外观服务暂不可用'; $('look-state').classList.add('sg-off'); }
  }
  window.addEventListener('starshopchange', () => loadOwnLook(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadOwnLook(false); });

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
    else meta.append(el('button', { type: 'button', text: '举报', onclick: () => report('social_report', { p_type: 'post', p_target: String(p.id) }) }));
    return card;
  }
  async function loadComments(postId, box) {
    try {
      const { data, error } = await sb.from('tree_comments').select('id,body,created_at').eq('post_id', postId).order('id').limit(100); if (error) throw error;
      box.replaceChildren(...data.map(c => el('div', {}, document.createTextNode('匿名：' + c.body + ' '), el('button', { type: 'button', class: 'sg-ghost', text: '举报', onclick: () => report('social_report', { p_type: 'comment', p_target: String(c.id) }) }))));
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
    if (data) { myNick = data.nickname; $('nick').value = data.nickname; $('discoverable').checked = data.discoverable; tagBox.querySelectorAll('input').forEach(i => { i.checked = data.interests.includes(i.value); }); }
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
  let chatWith = null, inboxChannel = null, matchTimer = null;
  async function loadFriends() {
    try {
      const reqs = await rpc('friend_pending'); const rl = $('req-list');
      if (!reqs.length) empty(rl, '暂无新的好友请求'); else rl.replaceChildren(...reqs.map(r => person(r.nickname, null,
        el('button', { type: 'button', class: 'sg-primary', text: '接受', onclick: e => guarded(e.target, async () => { await rpc('friend_respond', { p_request: r.request_id, p_accept: true }); loadFriends(); }) }),
        el('button', { type: 'button', text: '拒绝', onclick: e => guarded(e.target, async () => { await rpc('friend_respond', { p_request: r.request_id, p_accept: false }); loadFriends(); }) }))));
      const fr = await rpc('friend_list'); const fl = $('friend-list');
      if (!fr.length) empty(fl, '还没有好友，可以在大厅点昵称申请'); else fl.replaceChildren(...fr.map(f => person(f.nickname, f.online,
        el('button', { type: 'button', class: 'sg-primary', text: '私信', onclick: () => openChat(f) }),
        el('button', { type: 'button', text: '拉黑', onclick: e => { if (confirm('拉黑后将解除好友，双方无法私信。确定？')) guarded(e.target, async () => { await rpc('social_block', { p_user: f.user_id }); if (chatWith?.user_id === f.user_id) closeChat(); loadFriends(); loadBlocks(); }); } }))));
    } catch (e) { empty($('friend-list'), '加载失败：' + errText(e)); }
  }
  function bubble(m) { const mine = m.sender_id === me; const b = el('div', { class: 'sg-msg' + (mine ? ' me' : '') }, el('div', { class: 'sg-msg-body' }, el('div', { class: 'sg-bubble', text: m.body }), mine ? null : el('button', { type: 'button', class: 'sg-retry', text: '举报', onclick: () => report('social_report', { p_type: 'message', p_target: String(m.id) }) }))); return b; }
  async function openChat(f) {
    chatWith = f; $('chat').hidden = false; $('chat-title').textContent = '与 ' + f.nickname + ' 私信';
    const cl = $('chat-log'); cl.replaceChildren();
    const { data, error } = await sb.from('dm_messages').select('id,sender_id,recipient_id,body,created_at')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${f.user_id}),and(sender_id.eq.${f.user_id},recipient_id.eq.${me})`).order('id', { ascending: false }).limit(50);
    if (error) return empty(cl, '加载失败：' + errText(error));
    data.reverse().forEach(m => cl.append(bubble(m))); cl.scrollTop = cl.scrollHeight;
  }
  function closeChat() { chatWith = null; $('chat').hidden = true; }
  function subscribeInbox() {
    inboxChannel = sb.channel('dm-inbox-' + me).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: 'recipient_id=eq.' + me }, ({ new: m }) => {
      if (chatWith && m.sender_id === chatWith.user_id) { const cl = $('chat-log'); cl.append(bubble(m)); cl.scrollTop = cl.scrollHeight; } else toast('收到一条新私信');
    }).subscribe();
  }
  $('chat-close').addEventListener('click', closeChat);
  $('chat-form').addEventListener('submit', e => { e.preventDefault(); const btn = e.submitter; guarded(btn, async () => {
    const v = $('chat-input').value.trim(); if (!v || !chatWith) return;
    const id = await rpc('dm_send', { p_to: chatWith.user_id, p_body: v }); $('chat-input').value = '';
    const cl = $('chat-log'); cl.append(bubble({ id, sender_id: me, body: v })); cl.scrollTop = cl.scrollHeight;
  }); });
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
