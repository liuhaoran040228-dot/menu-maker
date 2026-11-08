// 会话游戏邀请（14 号）：结构化卡片归一/渲染、用户点击发送、只读返回解析。
// 能力只以服务端 chat_invite_capability_v1 探测为准（PGRST202 → 待接入禁用）；不读任何 window 开关当授权。
// 卡片只取白名单字段；链接只由 game_id 本地映射 ../<id>/?invite=<uuid>；绝不使用服务端/用户提供的 URL；不展示 uid。
(function (factory) {
  const Core = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  if (typeof window !== 'undefined') window.StarSocialInviteCore = Core;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  let cap = 'unknown', capGames = [], probing = null, busy = false, picked = null, mode = 'lobby';
  const pend = new Map();   // conversation_id|game_id → nonce：未确认前重试沿用同一 nonce（服务端同载荷去重）
  const sb = () => { try { return window.StarSocialClient && window.StarSocialClient.get(); } catch (_) { return null; } };
  const conv = () => window.StarSocialConv && window.StarSocialConv.current && window.StarSocialConv.current();
  const ready = () => cap === 'ready';
  function probe() {
    if (probing) return probing; const c = sb(); if (!c) { cap = 'unknown'; return Promise.resolve(); }
    probing = Promise.resolve(c.rpc('chat_invite_capability_v1', {})).then(r => {
      if (r && r.error) { cap = r.error.code === 'PGRST202' ? 'undeployed' : 'unknown'; return; }
      const g = r && r.data && r.data.ok === true && Array.isArray(r.data.games) ? r.data.games.filter(Core.isInviteGame) : [];
      cap = g.length ? 'ready' : 'undeployed'; capGames = g;
    }).catch(() => { cap = 'unknown'; }).finally(() => { if (cap === 'unknown') probing = null; ui(); try { window.dispatchEvent(new CustomEvent('sg-invite-capability')); } catch (_) {} });
    return probing;
  }
  function ui() {
    const c = conv(), b = $('conv-game-btn');
    if (b) { b.disabled = !(c && c.conversation_id) || !ready(); b.title = ready() ? '邀请好友一起玩' : cap === 'undeployed' ? '游戏邀请待接入' : '正在确认邀请能力'; }
    const s = $('invite-send'), note = $('invite-note');
    const can = mode === 'conv' && ready() && !!picked && !!(c && c.conversation_id) && !busy;
    if (s) { s.disabled = !can; s.setAttribute('aria-disabled', String(!can)); s.textContent = mode !== 'conv' ? '发送邀请（请在私信/公会会话中）' : !ready() ? (cap === 'undeployed' ? '发送邀请（待接入）' : '发送邀请（确认中）') : busy ? '发送中…' : '发送邀请'; }
    if (note && !busy) note.textContent = mode !== 'conv' ? '大厅内只能预览；请在私信或公会会话里用「+游戏」发送邀请。' : ready() ? '点击发送才会发出；分数仅为自报，不计奖励/排行。' : cap === 'undeployed' ? '游戏邀请接口待接入，当前只能预览，不会发送。' : '正在确认邀请能力…';
  }
  function openSheet(m) {
    mode = m; picked = null; const el = (t, a, ...k) => { const e = document.createElement(t); Object.entries(a || {}).forEach(([x, v]) => x === 'text' ? e.textContent = v : x === 'onclick' ? e.addEventListener('click', v) : e.setAttribute(x, v)); e.append(...k); return e; };
    const list = m === 'conv' ? (ready() ? Core.INVITE_GAMES.filter(g => capGames.includes(g.id)) : []) : Core.INVITE_GAMES;
    $('game-pick').replaceChildren(...list.map(g => el('button', { type: 'button', class: 'sg-ghost', 'data-game': g.id, 'aria-pressed': 'false', text: g.name, onclick: e => {
      picked = g.id; $('game-pick').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === e.currentTarget)));
      const box = $('invite-preview'); box.hidden = false; box.replaceChildren(el('span', { class: 'sg-preview-flag', text: '预览 · 未发送' }), el('b', { text: '来玩「' + g.name + '」吧' }), el('small', { class: 'sg-muted', text: '分数：自报，暂无' })); ui();
    } })));
    $('invite-preview').hidden = true; ui(); const d = $('game-sheet'); if (d && !d.open && d.showModal) d.showModal();
  }
  async function send() {
    const c = conv(), client = sb(); if (mode !== 'conv' || !ready() || !picked || !c || !c.conversation_id || !client || busy) return false;
    const key = c.conversation_id + '|' + picked; const job = Core.inviteJob(c.conversation_id, picked, pend.get(key)); if (!job.ok) return false;
    pend.set(key, job.job.p_client_nonce); busy = true; ui(); const note = $('invite-note'); if (note) note.textContent = '发送中…';
    let res; try { res = await client.rpc('community_chat_send_invite', job.job); } catch (e) { res = { error: e || { message: 'network' } }; }
    busy = false; const out = Core.interpretSend(res, c.conversation_id);
    if (out.status === 'ok') { pend.delete(key); if (note) note.textContent = '已发送'; const d = $('game-sheet'); if (d && d.open) d.close(); window.StarSocialConv && window.StarSocialConv.refresh && window.StarSocialConv.refresh(); }
    else if (out.status === 'undeployed') { cap = 'undeployed'; probing = null; pend.delete(key); }
    else if (out.status === 'retry') { if (note) note.textContent = '网络异常：再次点击发送会沿用同一请求，不会重复'; }
    else { pend.delete(key); if (note) note.textContent = Core.errorText(out.code); }
    ui(); if (note && out.status !== 'ok' && out.status !== 'undeployed') note.textContent = out.status === 'retry' ? '网络异常：再次点击发送会沿用同一请求，不会重复' : Core.errorText(out.code);
    return out.status === 'ok';
  }
  // 只读返回：?game_invite_return=<uuid>#messages → get_invite → 打开原会话；不写库，参数处理后即从地址栏移除
  async function restoreReturn() {
    const id = Core.returnId(location.search); if (id === undefined) return null;
    try { const u = new URL(location.href); u.searchParams.delete('game_invite_return'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (_) {}
    const toast = m => { const s = $('conv-note') || $('toast'); if (s) s.textContent = m; };
    if (id === null) { toast('返回链接无效'); return null; }
    const client = sb(); if (!client) { toast('登录后可回到邀请会话'); return null; }
    await probe(); if (!ready()) { toast('游戏邀请接口待接入'); return null; }
    let r; try { r = await client.rpc('community_chat_get_invite', { p_invite_id: id, p_game_id: null }); } catch (_) { r = null; }
    const v = Core.interpretResolve(r && !r.error ? r.data : null, id);
    if (!v) { toast('邀请不可用或无权查看'); return null; }
    if (window.StarSocialConv && window.StarSocialConv.open) await window.StarSocialConv.open(v.conversation);
    return v;
  }
  function boot() {
    // 每次打开前重新探测（不永久缓存能力）；探测完成后才按服务端返回的游戏渲染列表
    const b = $('conv-game-btn'); if (b) b.addEventListener('click', async () => { if (cap === 'ready') probing = null; await probe(); openSheet('conv'); });
    const g = $('game-btn'); if (g) g.addEventListener('click', () => openSheet('lobby'), true);
    const s = $('invite-send'); if (s) s.addEventListener('click', () => send());
    window.addEventListener('sg-conv-change', () => { if (conv()) probe(); ui(); });
    window.addEventListener('sg-session', () => { probing = null; probe().then(() => restoreReturn()); });
    ui();
  }
  window.StarSocialInvite = { probe, capability: () => cap, renderCard: (c) => Core.renderCard(document, c), _send: send, restoreReturn, _pick: id => { picked = Core.isInviteGame(id) ? id : null; ui(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(function () {
  // 邀请专用白名单（与 game-invite-v0.js 一致）；射击/格斗/怪物/跑酷仅不可邀请，普通入口不变；无 watermelon
  const INVITE_GAMES = Object.freeze([{ id: 'lili-match', name: '萌娘森林消消' }, { id: 'lili-2048', name: '萌娘伙伴 2048' }, { id: 'snake', name: '贪吃蓝蓝' }, { id: 'lili-merge', name: '栗栗合成大栗子' },
    { id: 'gomoku', name: '星弈 · 五子棋' }, { id: 'draw-guess', name: '绘梦 · 你画我猜' }, { id: 'whos-spy', name: '星语 · 谁是卧底' }].map(Object.freeze));
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = x => typeof x === 'string' && UUID.test(x);
  const isInviteGame = id => typeof id === 'string' && INVITE_GAMES.some(g => g.id === id);
  const gameName = id => (INVITE_GAMES.find(g => g.id === id) || {}).name || null;
  const inviteHref = (id, invite) => isInviteGame(id) && isUuid(invite) ? '../' + id + '/?invite=' + invite.toLowerCase() : null;
  const score = n => Number.isSafeInteger(n) && n >= 0 && n <= 1e9 ? n : null;
  const nick = s => typeof s === 'string' && s.trim() ? s.trim().slice(0, 24) : '星糖旅人';
  function nonce() { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); throw new Error('NO_CRYPTO'); }
  function normInvite(c) {
    if (!c || typeof c !== 'object' || c.kind !== 'game_invite' || c.version !== 1 || !isUuid(c.invite_id) || !isInviteGame(c.game_id) || c.score_trust !== 'self_reported') return null;
    const status = ['open', 'expired', 'hidden'].includes(c.status) ? c.status : 'hidden';
    const results = (Array.isArray(c.results) ? c.results : []).slice(0, 50).map(r => r && r.player && score(r.score) !== null && r.score_trust === 'self_reported'
      ? { key: isUuid(r.player.public_id) ? r.player.public_id : null, nickname: nick(r.player.nickname), mine: r.player.mine === true, score: r.score } : null).filter(Boolean);
    return Object.freeze({ invite_id: c.invite_id.toLowerCase(), game_id: c.game_id, name: gameName(c.game_id), score: score(c.score), status, mine: c.mine === true,
      sender: nick(c.sender && c.sender.nickname), results, total: Number.isSafeInteger(c.results_total) && c.results_total >= results.length ? c.results_total : results.length, href: status === 'open' ? inviteHref(c.game_id, c.invite_id) : null });
  }
  function renderCard(doc, raw) {
    const v = raw && raw.invite_id && raw.href !== undefined ? raw : normInvite(raw); if (!v) return null;
    const mk = (t, cls, text) => { const e = doc.createElement(t); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const box = mk('div', 'sg-bubble sg-invite-card'); box.setAttribute('data-invite', v.invite_id); box.setAttribute('data-status', v.status);
    box.append(mk('b', null, (v.mine ? '我' : v.sender) + ' 邀请一起玩「' + v.name + '」'), mk('small', 'sg-muted', '发起分数（自报，未验证）：' + (v.score === null ? '暂无' : v.score)));
    // 同名玩家附 public_id 短后缀以区分；超过 50 条时显示总数（服务端只投影前 50）
    const dup = n => v.results.filter(x => !x.mine && x.nickname === n).length > 1;
    if (v.results.length) { const ul = mk('ul', 'sg-invite-results'); v.results.forEach(r => { const li = mk('li', r.mine ? 'mine' : null, (r.mine ? '我' : r.nickname + (dup(r.nickname) && r.key ? ' #' + r.key.slice(0, 4) : '')) + '：' + r.score + '（自报）'); if (r.key) li.setAttribute('data-player', r.key); ul.append(li); }); box.append(ul); if (v.total > v.results.length) box.append(mk('small', 'sg-muted', '共 ' + v.total + ' 人回发，仅显示前 ' + v.results.length + ' 位')); }
    if (v.href) { const a = mk('a', 'sg-ghost', '去玩'); a.href = v.href; box.append(a); } else box.append(mk('small', 'sg-muted', v.status === 'expired' ? '邀请已过期' : '邀请不可用'));
    return box;
  }
  function inviteJob(cid, game, prev) {
    if (!isUuid(cid)) return { ok: false, code: 'NO_CONVERSATION' }; if (!isInviteGame(game)) return { ok: false, code: 'INVALID_INPUT' };
    return { ok: true, job: { p_conversation_id: cid, p_game_id: game, p_score: null, p_client_nonce: isUuid(prev) ? prev : nonce() } };
  }
  function interpretSend(res, cid) {
    const e = res && res.error;
    if (e) { if (e.code === 'PGRST202' || /Could not find the function/i.test(e.message || '')) return { status: 'undeployed' }; if (!e.code || /network|fetch|timeout/i.test(e.message || '')) return { status: 'retry' }; return { status: 'error', code: 'SEND_FAILED' }; }
    const d = res && res.data; if (d && d.ok === true && normInvite(d.invite)) return { status: 'ok', invite: normInvite(d.invite) };
    if (d && d.ok === false && d.error) return { status: 'error', code: String(d.error.code || 'SEND_FAILED') };
    return { status: 'error', code: 'SEND_FAILED' };
  }
  function interpretResolve(d, id) {
    if (!d || d.ok !== true) return null; const inv = normInvite(d.invite); if (!inv || inv.invite_id !== String(id).toLowerCase()) return null;
    const c = d.conversation; if (!c || !['dm', 'guild'].includes(c.kind) || !isUuid(c.id)) return null;
    return { invite: inv, conversation: { kind: c.kind, id: c.id, title: nick(c.title) } };
  }
  // 返回参数：未出现 → undefined；出现但非唯一合法 uuid → null
  function returnId(search) { const v = new URLSearchParams(search || '').getAll('game_invite_return'); if (!v.length) return undefined; return v.length === 1 && isUuid(v[0]) ? v[0].toLowerCase() : null; }
  const TEXT = { INVALID_INPUT: '游戏不可邀请', FORBIDDEN: '无权在此会话发送邀请', NOT_FRIEND: '对方不是你的好友或已屏蔽', RATE_LIMITED: '邀请太频繁，请稍后再试', NONCE_REUSED: '重复请求已拦截，请重新选择发送', NOT_READY: '邀请不可用', NO_CONVERSATION: '请先打开会话', SEND_FAILED: '发送失败' };
  const errorText = c => TEXT[c] || TEXT.SEND_FAILED;
  return { INVITE_GAMES, isInviteGame, inviteHref, normInvite, renderCard, inviteJob, interpretSend, interpretResolve, returnId, errorText };
});
