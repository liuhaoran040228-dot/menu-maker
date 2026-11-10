/* 本地演示 mock transport（仅内存）。只在 social-demo-gate.js 判定本地 demo=1 后加载；本文件自身再次校验主机名。
   - 数据：demo-fixture.synthetic.js（本地 SQL 草案在 PGlite 生成的合成数据），不是线上数据，不是线上端到端证据。
   - 不创建 Supabase 客户端、不发任何网络请求、不读写 star-account-session-v1、无 token/service key。
   - localStorage 替换为本页内存存储：退出演示后真实站点存储不受影响。
   - 发送/关注/装备/签名等写动作只修改本页内存；刷新即恢复初始 fixture。 */
(function () {
  'use strict';
  var h = location.hostname, d = new URLSearchParams(location.search).getAll('demo');
  if (!((h === '127.0.0.1' || h === 'localhost') && d.length === 1 && d[0] === '1')) return;
  var fail = function (why) {
    window.StarSocialDemo = Object.freeze({ ok: false, error: String(why) });
    var show = function () { var b = document.createElement('div'); b.id = 'sg-demo-banner'; b.setAttribute('role', 'alert'); b.textContent = '本地演示初始化失败：演示已禁用，且未连接任何真实服务';
      b.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483000;background:#ff8a80;color:#300;font:600 13px/1.5 system-ui;padding:6px 10px;border-radius:10px'; document.body.appendChild(b); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  };   // 失败：客户端为 null，绝不回落真实服务
  try {
    // 1) 内存存储（先于其他脚本生效）
    var mem = new Map(), NOKEY = 'star-account-session-v1';   // 演示内存里也禁止该键（读恒为 null、写/删无效）
    var memStorage = { getItem: function (k) { return String(k) !== NOKEY && mem.has(String(k)) ? mem.get(String(k)) : null; }, setItem: function (k, v) { if (String(k) !== NOKEY) mem.set(String(k), String(v)); },
      removeItem: function (k) { if (String(k) !== NOKEY) mem.delete(String(k)); }, clear: function () { mem.clear(); }, key: function (i) { return Array.from(mem.keys())[i] || null; } };
    Object.defineProperty(memStorage, 'length', { get: function () { return mem.size; } });
    Object.defineProperty(window, 'localStorage', { value: memStorage, configurable: false });
    Object.defineProperty(window, 'sessionStorage', { value: memStorage, configurable: false });

    var FX = window.__SG_DEMO_FIXTURE;
    if (!FX || FX.synthetic !== true || !FX.responses) throw new Error('fixture missing');
    var clone = function (x) { return x == null ? x : JSON.parse(JSON.stringify(x)); };
    var R = clone(FX.responses), ME = FX.me.user_id, CID = FX.conversation_id;
    var S = {
      msgs: R.community_chat_messages.items.slice(), kinds: R.chat_message_kinds_v1.slice(), cards: R.chat_message_cards_v1.slice(),
      profile: R.get_public_profile, feed: R.feed_list.slice(), follows: {}, lobby: (R.lobby_history || []).slice(),
      shop: { inventory: ['default', 'paid-bubble-peach', 'frame-peach'], equipped: { bubble: 'paid-bubble-peach', avatar_frame: 'frame-peach' }, demo_note: '示例拥有（合成），非真实权益' }, writes: []
    };
    var nextId = S.msgs.reduce(function (m, x) { return Math.max(m, Number(x.id)); }, 0) + 1;
    var now = function () { return new Date().toISOString(); };
    var STICKER = { kaixin: '开心', jiayou: '加油' };
    function addMsg(body) { var id = nextId++; var m = { id: id, seq: id, body: body, sender_id: ME, created_at: now() }; S.msgs.unshift(m); return m; }
    function err(code, message) { return { data: null, error: { code: code, message: message || code } }; }
    function okd(x) { return { data: x, error: null }; }
    function log(name) { S.writes.push(name); }
    var H = {
      social_service_status: function () { return okd(R.social_service_status); },
      friend_list: function () { return okd(R.friend_list); }, friend_pending: function () { return okd(R.friend_pending); },
      social_block_list: function () { return okd(R.social_block_list); },
      community_dm_list: function () { return okd(R.community_dm_list); }, community_guild_list: function () { return okd(R.community_guild_list); },
      community_chat_messages: function (a) {
        if (a.p_conversation_id !== CID) return err('P0001', 'FORBIDDEN');   // 演示只有一段会话；其他 id 一律无权
        var items = S.msgs.filter(function (m) { return a.p_before_seq == null || m.seq < a.p_before_seq; }).slice(0, a.p_limit || 30);
        return okd({ items: clone(items), next_before_seq: null });
      },
      community_chat_mark_read: function (a) { return a.p_conversation_id === CID ? okd({ conversation_id: CID, last_read_seq: a.p_through_seq, unread_count: 0 }) : err('P0001', 'FORBIDDEN'); },
      chat_message_kinds_v1: function (a) { var ids = (a.p_ids || []).map(String); return okd(a.p_conversation_id === CID ? S.kinds.filter(function (k) { return ids.indexOf(String(k.message_id)) >= 0; }) : []); },
      chat_message_cards_v1: function (a) { var ids = (a.p_ids || []).map(String); return okd(a.p_conversation_id === CID ? clone(S.cards.filter(function (k) { return ids.indexOf(String(k.message_id)) >= 0; })) : []); },
      chat_stickers_v1: function () { return okd(R.chat_stickers_v1); }, chat_invite_capability_v1: function () { return okd(R.chat_invite_capability_v1); },
      community_chat_get_invite: function (a) {
        var c = S.cards.filter(function (k) { return k.card.invite_id === a.p_invite_id; })[0];
        if (!c) return okd({ ok: false, error: { code: 'NOT_FOUND' } });
        return okd({ ok: true, invite: clone(c.card), result: null, conversation: clone(R.community_chat_get_invite.conversation) });
      },
      get_public_profile: function (a) { return okd(a && a.p_public_id ? null : clone(S.profile)); },
      get_public_appearance: function () { return okd([]); },
      // 外观：仅 dm 上下文 + 演示会话授权；返回明确标注的示例行（我方来自演示内存装备，对方为示例）。其他上下文（大厅/广场/匿名）一律空
      get_equipped_chat_cosmetics: function (a) {
        if (a.p_context !== 'dm' || a.p_conversation_id !== CID || !Array.isArray(a.p_public_ids)) return okd([]);
        var peer = (R.community_dm_list.items.filter(function (x) { return x.conversation_id === CID; })[0] || {}).peer || {};
        var rows = [{ public_id: S.profile.public_id, bubble: S.shop.equipped.bubble || 'default', chat_effect: S.shop.equipped.chat_effect || 'default', avatar_frame: S.shop.equipped.avatar_frame || 'default', vip_badge: null, level_badge: null, demo_example: true },
          { public_id: peer.public_id, bubble: 'paid-bubble-mint', chat_effect: 'default', avatar_frame: 'frame-lunar', vip_badge: null, level_badge: null, demo_example: true }];
        return okd(rows.filter(function (r) { return r.public_id && a.p_public_ids.indexOf(r.public_id) >= 0; }));
      },
      get_shop_state: function () { return okd(clone(S.shop)); },
      feed_list: function (a) { return okd(a.p_before ? [] : clone(S.feed)); },
      feed_comments: function () { return okd([]); },
      lobby_history: function () { return okd(clone(S.lobby)); }, lobby_feed: function () { return okd([]); },
      community_dm_open: function () { return okd({ conversation_id: CID }); },
      social_heartbeat: function () { return okd(null); },
      // —— 写：只改内存
      chat_send_text_v1: function (a) { if (a.p_conversation_id !== CID) return okd({ ok: false, error: { code: 'FORBIDDEN' } }); log('text'); var m = addMsg(String(a.p_body).slice(0, 500)); return okd({ ok: true, message: { id: String(m.id), kind: 'text', body: m.body, created_at: m.created_at } }); },
      chat_send_sticker_v1: function (a) { if (a.p_conversation_id !== CID) return okd({ ok: false, error: { code: 'FORBIDDEN' } }); log('sticker'); var m = addMsg('[贴纸:' + (STICKER[a.p_sticker_id] || '贴纸') + ']'); S.kinds.push({ message_id: String(m.id), kind: 'sticker', sticker_id: a.p_sticker_id }); return okd({ ok: true, message: { id: String(m.id), kind: 'sticker', sticker_id: a.p_sticker_id, created_at: m.created_at } }); },
      community_chat_send_invite: function (a) { if (a.p_conversation_id !== CID) return okd({ ok: false, error: { code: 'FORBIDDEN' } }); log('invite');
        var m = addMsg('[游戏邀请:' + a.p_game_id + ']'); var base = clone(S.cards[0].card);
        var card = Object.assign(base, { invite_id: crypto.randomUUID(), game_id: a.p_game_id, score: null, status: 'open', mine: true, message_id: String(m.id), results: [], results_total: 0, sender: { public_id: S.profile.public_id, nickname: S.profile.nickname }, created_at: m.created_at });
        S.cards.push({ message_id: String(m.id), card: card }); return okd({ ok: true, invite: clone(card) }); },
      lobby_send_v1: function (a) { log('lobby'); var id = (S.lobby.reduce(function (m, x) { return Math.max(m, Number(x.id)); }, 0) + 1); S.lobby.unshift({ id: id, nickname: S.profile.nickname, body: String(a.p_body).slice(0, 300), created_at: now(), mine: true, bubble_id: null }); return okd({ ok: true, id: String(id) }); },
      feed_follow: function (a) { log('follow'); S.follows[a.p_public_id] = !!a.p_on; S.feed.forEach(function (p) { if (p.author_public_id === a.p_public_id) p.following = !!a.p_on; }); return okd({ ok: true, following: !!a.p_on }); },
      feed_like: function (a) { log('like'); S.feed.forEach(function (p) { if (String(p.post_id) === String(a.p_post)) { p.liked_by_me = !!a.p_on; p.like_count += a.p_on ? 1 : -1; } }); return okd({ ok: true }); },
      equip_chat_cosmetic: function (a) { if (S.shop.inventory.indexOf(a.p_id) < 0) return okd({ ok: false, error: { code: 'NOT_OWNED' } }); log('equip'); S.shop.equipped[a.p_category] = a.p_id; return okd(clone(S.shop)); },
      set_my_signature_v1: function (a) { log('signature'); S.profile.signature = String(a.p_signature).slice(0, 60); return okd({ ok: true, profile: clone(S.profile) }); }
    };
    var unknown = [];
    function thenable(p) { p.abortSignal = function () { return p; }; return p; }
    var client = {
      __demo: true,
      rpc: function (name, args) { return thenable(Promise.resolve().then(function () { var f = H[name]; if (!f) { unknown.push(name); return err('PGRST202', 'demo: ' + name + ' 不在演示 fixture 中'); } return f(args || {}); })); },
      from: function (table) {
        var q = { select: function () { return q; }, order: function () { return q; }, limit: function () { return q; }, eq: function () { return q; }, lt: function () { return q; }, gt: function () { return q; }, or: function () { return q; }, in: function () { return q; },
          maybeSingle: function () { return Promise.resolve(table === 'social_profiles' ? okd({ nickname: S.profile.nickname, interests: ['游戏'], discoverable: true }) : okd(null)); },
          then: function (res, rej) { return Promise.resolve(okd([])).then(res, rej); } };
        return q;
      },
      channel: function () { var ch = { on: function () { return ch; }, subscribe: function () { return ch; }, unsubscribe: function () { return Promise.resolve('ok'); } }; return ch; },
      removeChannel: function () { return Promise.resolve('ok'); },
      auth: {   // 合成会话：只有 user.id；无 access_token / refresh_token
        getSession: function () { return Promise.resolve({ data: { session: { user: { id: ME, is_demo: true } } }, error: null }); },
        getUser: function () { return Promise.resolve({ data: { user: { id: ME, is_demo: true } }, error: null }); },
        onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
        signOut: function () { return Promise.resolve({ error: null }); }
      },
      storage: { from: function () { return { upload: function () { return Promise.resolve(err('DEMO', '演示模式不上传')); } }; } }
    };
    window.StarSocialDemo = Object.freeze({ ok: true, client: client, synthetic: true, writes: function () { return S.writes.slice(); }, unknown: function () { return unknown.slice(); }, conversationId: CID, inviteId: FX.invite_id, freshInviteId: FX.fresh_invite_id });

    // 2) 常驻标签 + 退出 + 场景（只读展开）
    function exitUrl() { var u = new URL(location.href); u.searchParams.delete('demo'); u.searchParams.delete('scene'); u.hash = ''; return u.pathname + u.search; }
    function ui() {
      var b = document.createElement('div'); b.id = 'sg-demo-banner'; b.setAttribute('role', 'note');
      b.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483000;background:#ffd84dee;color:#3a2a00;font:600 13px/1.5 system-ui;padding:6px 10px;border-radius:10px;display:flex;gap:10px;align-items:center;justify-content:space-between;pointer-events:auto;box-shadow:0 2px 8px #0005';
      var t = document.createElement('span'); t.textContent = '本地演示 · 示例账号与数据 · 不代表线上已启用'; var a = document.createElement('a'); a.href = exitUrl(); a.id = 'sg-demo-exit'; a.textContent = '退出演示'; a.style.color = '#3a2a00';
      b.append(t, a); document.body.appendChild(b); document.documentElement.dataset.demo = 'synthetic';
      var g = document.getElementById('cc-grid'); if (g) { var n = document.createElement('p'); n.id = 'sg-demo-cc-note'; n.className = 'sg-muted'; n.textContent = '演示：外观目录为真实本地目录；“已拥有”仅为合成示例，非真实权益'; g.parentNode.insertBefore(n, g); }
      // 统计只由真实渲染器按 fixture 好友数显示；动态/公会未实现，保持“—”（演示不填任何假量）
      scene();
    }
    function scene() {
      var s = new URLSearchParams(location.search).get('scene');
      var thread = '#messages/thread=' + CID;
      var wait = function (f, cb, n) { n = n || 0; var x = f(); if (x) cb(x); else if (n < 100) setTimeout(function () { wait(f, cb, n + 1); }, 50); };
      var mark = function (el) { el.scrollIntoView({ block: 'start' }); el.style.outline = '3px solid #ffd84d'; };
      if (s === 'conv' || s === 'stickers' || s === 'invite' || s === 'result') { if (location.hash !== thread) location.hash = thread; }
      if (s === 'lobby') location.hash = '#lobby';
      if (s === 'guild') { location.hash = '#messages'; wait(function () { var b = document.getElementById('guild-more') || document.querySelector('[data-open-guild], #guild-list .sg-row, #guild-list button'); return b || document.querySelector('#guild-list'); }, function (el) { if (el && el.click) el.click(); }); }
      if (s === 'square') location.hash = '#square';
      if (s === 'me') location.hash = '#me';
      if (s === 'stickers') wait(function () { var b = document.getElementById('conv-sticker-btn'); return b && !document.getElementById('conv-view').hidden && document.querySelector('#conv-log .sg-msg') ? b : null; }, function (b) { b.click(); });   // 只展开弹层，不发送
      if (s === 'invite') wait(function () { return document.querySelector('#conv-log [data-invite="' + FX.fresh_invite_id + '"]'); }, mark);
      if (s === 'result') wait(function () { return document.querySelector('#conv-log [data-invite="' + FX.invite_id + '"]'); }, mark);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();
  } catch (e) { fail(e && e.message); }
})();
