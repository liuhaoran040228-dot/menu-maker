/* 大厅纯逻辑（无 DOM/网络），浏览器挂 window.StarSocialCore，Node 下 module.exports，供离线单元测试。 */
(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.StarSocialCore = api; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // 按 id 去重合并并升序（id 为服务端 identity 单调分配，作稳定游标）；incoming 覆盖同 id 旧值。
  function mergeById(list, incoming) {
    const map = new Map();
    for (const m of list || []) map.set(String(m.id), m);
    for (const m of incoming || []) if (m && m.id != null) map.set(String(m.id), m);
    return [...map.values()].sort((a, b) => Number(a.id) - Number(b.id));
  }
  // 全量重拉窗口：至少 80，至多 200，尽量覆盖已加载的历史，以便隐藏/拉黑后的旧缓存被替换失效。
  const refetchLimit = loaded => Math.min(200, Math.max(80, loaded | 0));
  // 增量拉取起点：回退若干条以覆盖并发事务中晚提交但 id 较小的消息（结果按 id 去重）。
  function incrementalAfter(list, overlap = 20) { if (!list || !list.length) return 0; const i = Math.max(0, list.length - 1 - overlap); return Number(list[i].id) - 1; }
  // 有限指数退避（含抖动），上限 30s。
  function backoffDelay(attempt, rand = Math.random, base = 1000, max = 30000) { const d = Math.min(max, base * Math.pow(2, Math.max(0, attempt))); return Math.round(d * (0.5 + 0.5 * rand())); }
  // 代际：全量刷新开始时 bump；增量请求返回时代际已变则丢弃，避免旧响应把已隐藏消息加回。
  function createGen() { let g = 0; return { bump: () => ++g, current: () => g, isCurrent: n => n === g }; }
  // 错误分类：rule=内容/权限问题不可重试；rate=稍后可重试；network/timeout=可用同一 key 安全重试。
  function classifyError(e) {
    if (!e) return 'unknown';
    if (e.name === 'AbortError' || /timeout|timed out|aborted/i.test(e.message || '')) return 'timeout';
    if (e.hint === 'rate_limited' || /太频繁/.test(e.message || '')) return 'rate';
    if (e.hint === 'idempotency_mismatch') return 'rule';
    if (['22023', 'P0001', '42501', '28000', 'P0002'].includes(e.code)) return 'rule';
    if (/fetch|network|Failed to fetch|NetworkError|Load failed/i.test(e.message || '') || e.status === 0) return 'network';
    return 'unknown';
  }
  function uuid(cryptoObj) {
    const c = cryptoObj || (typeof crypto !== 'undefined' ? crypto : null);
    if (c && c.randomUUID) return c.randomUUID();
    const b = new Uint8Array(16); c.getRandomValues(b); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  // 发送任务：key 与正文绑定，重试必须同 key 同正文。
  function makeJob(body, id = uuid()) { return Object.freeze({ clientId: id, body: String(body).trim() }); }
  // 只允许白名单 tier/气泡进入渲染。
  // 固定资产映射（shop/ADAPTER.md §A + catalog.json）。只接受白名单 id，绝不使用服务端/客户端给出的 URL。
  const PAID = ['peach', 'mint', 'lavender', 'amber'];
  const BUBBLE_IDS = PAID.map(x => 'paid-bubble-' + x);
  const PENDANT_IDS = PAID.map(x => 'paid-pendant-' + x);
  const PRESETS = ['whale', 'lunar', 'forest', 'fox', 'silver', 'pink', 'raven', 'pearl'];
  const paidIdx = (id, kind) => { const m = /^paid-([a-z]+)-([a-z]+)$/.exec(id || ''); return m && m[1] === kind ? PAID.indexOf(m[2]) + 1 : 0; };
  function avatarSrc(id) {
    if (PRESETS.includes(id)) return `../assets/avatar-${id}.webp`;
    const n = paidIdx(id, 'avatar'); return n ? `../assets/shop-paid-avatar-${n}.webp` : null;
  }
  function safeLook(m) {
    m = m || {};
    const t = Number(m.badge_tier);
    const pn = PENDANT_IDS.includes(m.pendant_id) ? paidIdx(m.pendant_id, 'pendant') : 0;
    const vp = /^vip([1-8])$/.exec(typeof m.pendant_id === 'string' ? m.pendant_id : '');
    return { tier: Number.isInteger(t) && t >= 1 && t <= 8 ? t : 0,
      bubble: BUBBLE_IDS.includes(m.bubble_id) ? m.bubble_id : 'default',
      pendant: pn ? `../assets/shop-paid-pendant-${pn}.webp` : vp ? `../assets/vip-emblem-${vp[1]}.webp` : null,
      avatar: avatarSrc(m.avatar_id) };
  }
  // 本人背景 → data-theme 值（CSS 中固定映射）；未知一律 starry
  // 依 shop/appearance-ids.json v1：VIP 背景 id → skin-N 资源；skin-N 本身不是合法 id。
  const VIP_BG = ['ocean', 'sakura', 'galaxy', 'neon', 'crystal', 'lunar', 'aurora', 'palace'];
  function themeFor(bg) {
    if (bg === 'level-moon' || bg === 'level-forest') return bg;
    const v = VIP_BG.indexOf(bg); if (v >= 0) return 'skin-' + (v + 1);
    const n = paidIdx(bg, 'background'); if (n) return 'paid-' + n;
    const l = /^limited-background-([1-4])$/.exec(typeof bg === 'string' ? bg : ''); return l ? 'limited-' + l[1] : 'starry';
  }
  // ---------- 会话/未读（纯逻辑；last-read 按 登录用户+会话 隔离，仅存本机） ----------
  const readKey = (uid, conv) => (typeof uid === 'string' && /^[0-9a-f-]{36}$/i.test(uid) && /^[a-z0-9:_-]{1,40}$/.test(conv)) ? `star-social-read-v1:${uid}:${conv}` : null;
  function unreadCount(list, lastReadId) {
    const r = Number(lastReadId) || 0; let n = 0;
    for (const m of list || []) if (m && !m.mine && Number(m.id) > r) n++;
    return n;
  }
  const maxId = list => (list || []).reduce((a, m) => Math.max(a, Number(m && m.id) || 0), 0);
  // 只前进不后退，防止旧响应回退已读位置
  const advanceRead = (prev, next) => Math.max(Number(prev) || 0, Number(next) || 0);
  // ---------- 输入 ----------
  function insertAt(value, start, end, text, max) {
    value = String(value || ''); start = Math.max(0, Math.min(start ?? value.length, value.length)); end = Math.max(start, Math.min(end ?? start, value.length));
    const room = Math.max(0, (max || Infinity) - (value.length - (end - start)));
    const ins = Array.from(String(text || '')).reduce((acc, ch) => (acc.length + ch.length <= room ? acc + ch : acc), '');
    return { value: value.slice(0, start) + ins + value.slice(end), caret: start + ins.length, truncated: ins.length < String(text || '').length };
  }
  // IME 组字中的回车（含 Safari keyCode 229）不得触发发送
  const isImeEnter = e => !!e && e.key === 'Enter' && (e.isComposing === true || e.keyCode === 229);
  // 原创固定表情（Unicode，无外部资源）
  const EMOJI = ['✨','🌙','⭐','🍬','🌸','💫','🎮','🎧','📚','🍰','🐱','🐰','🦊','🐳','😊','🥰','😆','🤔','😴','🥺','👍','🙌','💖','🎉'];
  // 原创二次元破冰话题：只插入草稿，不自动发送
  const ICEBREAKERS = ['最近在追哪部番？','你的本命角色是谁？','推荐一首最近单曲循环的歌～','如果能穿越进一部作品，你选哪部？','今天有什么开心的小事吗？','周末想去哪里探险？','你更喜欢猫系还是犬系角色？','最近在玩什么游戏？'];
  // 会话内搜索：只搜已加载、服务端已过滤（隐藏/拉黑不会下发）的本地消息
  function searchMsgs(list, q, limit) {
    q = String(q || '').normalize('NFKC').trim().toLowerCase(); if (!q || q.length > 50) return [];
    const out = [];
    for (let i = (list || []).length - 1; i >= 0 && out.length < (limit || 50); i--) {
      const m = list[i]; if (!m || m.hidden) continue;
      const hay = (String(m.body || '') + ' ' + String(m.nickname || '')).normalize('NFKC').toLowerCase();
      if (hay.includes(q)) out.push(m);
    }
    return out;
  }
  // ---------- 好友/公会会话适配（shop/FRIENDS-GUILD-API.md 提案；未部署时降级） ----------
  const COMMUNITY_CODES = ['AUTH_REQUIRED','NOT_FRIEND','BLOCKED','NOT_MEMBER','FORBIDDEN','RATE_LIMITED','NOT_READY'];
  // 'missing' = 接口未部署（PostgREST PGRST202 / 42883 / 404）；不当作空列表
  function communityError(e) {
    if (!e) return 'unknown';
    // 主体 v3：业务类别在 error.details 的 JSON.code（字符串）；优先使用，仅接受已知码
    if (typeof e.details === 'string' && e.details.length < 300 && e.details.trim().startsWith('{')) {
      try { const c = JSON.parse(e.details).code; if (c === 'BANNED') return 'BANNED'; if (c === 'INVALID_INPUT') return 'INVALID_INPUT'; if (COMMUNITY_CODES.includes(c)) return c; } catch {}
    }
    const code = String(e.code || ''), msg = String(e.message || '') + ' ' + String(e.details || '') + ' ' + String(e.hint || '');
    if (code === 'PGRST202' || code === '42883' || e.status === 404 || /Could not find the function/i.test(msg)) return 'missing';
    for (const c of COMMUNITY_CODES) if (msg.includes(c)) return c;
    if (/fetch|network/i.test(msg) || e.name === 'TypeError') return 'network';
    return 'unknown';
  }
  const REVOKED = new Set(['NOT_FRIEND', 'BLOCKED', 'NOT_MEMBER', 'FORBIDDEN', 'AUTH_REQUIRED']);
  const isRevoked = k => REVOKED.has(k);
  // 按 key（会话/公会）隔离的请求代际：切换会话后旧响应一律丢弃
  function createScope() {
    let key = null, n = 0;
    return { enter(k) { key = k; n++; return { key: k, n }; }, isCurrent(t) { return !!t && t.key === key && t.n === n; }, leave() { key = null; n++; }, get key() { return key; } };
  }
  const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  // 会话消息页：按 seq 去重升序；丢弃形状不合法项
  function mergeBySeq(list, rows) {
    const map = new Map();
    for (const m of [...(list || []), ...(rows || [])]) {
      if (!m || !Number.isSafeInteger(Number(m.seq)) || Number(m.seq) <= 0 || typeof m.body !== 'string') continue;
      map.set(Number(m.seq), m);
    }
    return [...map.values()].sort((a, b) => Number(a.seq) - Number(b.seq));
  }
  // 只读会话消息归一：公会仅用 public_id+昵称（主体 v5 不再返回 sender_id），不保留任何 uid；去重只按 seq
  function normMsg(kind, m, me, myPublicId) {
    if (!m || typeof m.body !== 'string') return null;
    const seq = Number(m.seq ?? m.id); if (!Number.isSafeInteger(seq) || seq <= 0) return null;
    let mine = false, nickname;
    if (kind === 'guild') {
      const pid = m.public_id || m.sender_public_id;
      mine = !!(myPublicId && isUuid(pid) && pid === myPublicId);
      nickname = String(m.nickname || m.sender_nickname || '星糖旅人').slice(0, 32);
    } else {
      mine = !!(me && m.sender_id === me);
      nickname = mine ? '我' : '';
    }
    return { id: seq, seq, body: m.body.slice(0, 500), created_at: m.created_at, mine, nickname };
  }
  // 主体 v6：关系 RPC 业务失败以 data={ok:false,error:{code}} 返回；先判传输 error，再判 ok===false，绝不把无 error 当成功
  function actionResult(data, error) {
    if (error) return { ok: false, kind: communityError(error) };
    if (!data || typeof data !== 'object' || data.ok !== true) {
      const c = data && data.error && data.error.code;
      return { ok: false, kind: COMMUNITY_CODES.includes(c) || c === 'BANNED' || c === 'INVALID_INPUT' ? c : 'unknown' };
    }
    return { ok: true };
  }
  const maxSeq = list => (list || []).reduce((a, m) => Math.max(a, Number(m && m.seq) || 0), 0);
  // 规范化列表项：只取展示必要字段
  function normDm(x) {
    if (!x || !isUuid(x.conversation_id)) return null;
    const lm = x.last_message && typeof x.last_message.body === 'string' ? { body: x.last_message.body.slice(0, 80), created_at: x.last_message.created_at, mine: false } : null;
    const u = Number(x.unread_count);
    return { id: x.conversation_id, kind: 'dm', title: String((x.peer && x.peer.nickname) || '好友').slice(0, 32), avatar: x.peer && x.peer.avatar_preset, last: lm, unread: Number.isSafeInteger(u) && u > 0 ? u : 0, updated_at: x.updated_at };
  }
  function normGuild(x) {
    if (!x || !isUuid(x.id)) return null;
    return { id: x.id, kind: 'guild', title: String(x.name || '公会').slice(0, 32), role: ['owner','admin','member'].includes(x.role) ? x.role : 'member', count: Number(x.member_count) || 0 };
  }
  return { mergeById, refetchLimit, incrementalAfter, backoffDelay, createGen, classifyError, uuid, makeJob, safeLook, avatarSrc, themeFor, BUBBLE_IDS, readKey, unreadCount, maxId, advanceRead, insertAt, isImeEnter, EMOJI, ICEBREAKERS, searchMsgs, communityError, isRevoked, createScope, isUuid, mergeBySeq, normMsg, actionResult, maxSeq, normDm, normGuild };
});
