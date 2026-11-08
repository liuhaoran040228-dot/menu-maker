/* 资料 + 聊天外观（外部模型首稿 llm/appear_out.md；DOM 部分人工重写：supabase-js rpc 返回 {data,error} 不抛、网格须列全 8/6/6、
   render(nodes,row,opts) 参数顺序、匿名/失败时不得清空帖子列表）。只用单例 StarSocialClient；只读主体 StarChatCosmetics。 */
(function (root, factory) {
  'use strict';
  var Core = factory();
  if (typeof module === 'object' && module.exports) module.exports = Core;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.StarSocialAppearanceCore = Core;
  var CATS = ['bubble', 'chat_effect', 'avatar_frame'], CAT_NAME = { bubble: '气泡', chat_effect: '发言特效', avatar_frame: '头像框' };
  var token = 0, pfToken = 0, ccToken = 0, lastList = null, shop = null, cur = 'bubble', pick = { bubble: 'default', chat_effect: 'default', avatar_frame: 'default' };
  function $(id) { return document.getElementById(id); }
  function text(el, v) { if (el) el.textContent = v == null ? '' : String(v); }
  function mk(tag, t, cls) { var e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; }
  function anon() { return Core.isAnonHash(window.location && window.location.hash); }
  function cc() { var c = window.StarChatCosmetics; return c && typeof c.render === 'function' && Array.isArray(c.catalog) ? c : null; }
  async function rpc(name, params) {   // 统一为 {data, error}；客户端缺失视为未接入
    var sb = null; try { sb = window.StarSocialClient && window.StarSocialClient.get(); } catch (_) {}
    if (!sb || typeof sb.rpc !== 'function') return { data: null, error: { code: 'CLIENT_UNAVAILABLE', message: 'client unavailable' } };
    try { var r = await sb.rpc(name, params); return { data: r && r.data, error: r && r.error }; } catch (e) { return { data: null, error: e || { message: 'network' } }; }
  }
  function errText(e, what) { return e && e.code === 'CLIENT_UNAVAILABLE' ? what + '未接入（客户端不可用）' : Core.isUndeployed(e) ? what + '未接入' : (e && (e.code === '42501' || /JWT|auth/i.test(e.message || '')) ? '请先登录' : what + '读取失败'); }

  // 1) 本人资料：get_public_profile(null)
  function clearProfile(state) {
    ['pf-nick', 'pf-sign', 'pf-level', 'pf-vip', 'pf-medals'].forEach(function (id) { text($(id), ''); });
    if ($('sig-input')) $('sig-input').value = ''; if ($('sig-save')) $('sig-save').disabled = true; text($('pf-state'), state || '');
  }
  async function loadProfile() {
    var my = ++pfToken; clearProfile(anon() ? '' : '读取中…');   // 先清上一账号资料，失败也不残留
    if (anon()) return;
    var r = await rpc('get_public_profile', { p_public_id: null });
    if (my !== pfToken) return;   // 过期响应（账号变化/重载）丢弃
    if (r.error) { text($('pf-state'), errText(r.error, '资料接口')); $('sig-save') && ($('sig-save').disabled = true); return; }
    if (r.data == null) { text($('pf-state'), '尚未建立社区资料'); return; }
    var v = Core.profileView(r.data); if (!v) { text($('pf-state'), '资料不可见'); return; }
    text($('pf-nick'), v.nickname || '未设置'); text($('pf-sign'), v.signature || '未设置签名');
    text($('pf-level'), Core.levelText(v.level)); text($('pf-vip'), Core.vipText(v.vip_tier));
    text($('pf-medals'), v.medals.length ? '徽章：' + v.medals.map(function (m) { return 'VIP' + m.slice(3); }).join('、') : '徽章：暂无');
    text($('pf-state'), '资料来自服务端'); if ($('sig-save')) $('sig-save').disabled = false;
    if ($('sig-input') && !$('sig-input').value) $('sig-input').value = v.signature || '';
  }
  var SIG_TEXT = { SIGNATURE_REJECTED: '签名未通过审核，未保存', SIGNATURE_LENGTH: '签名最多 60 字', PROFILE_REQUIRED: '请先创建社区资料', RATE_LIMITED: '修改太频繁，请稍后再试', SAVE_FAILED: '保存失败', INVALID_INPUT: '签名无效' };
  async function saveSignature() {
    var input = $('sig-input'); if (!input) return;
    var c = Core.validateSignature(input.value);
    if (!c.ok) { text($('pf-state'), c.code === 'SIGNATURE_LENGTH' ? '签名最多 60 字' : '签名含不允许的字符'); return; }
    if (!window.confirm('确认把签名改为：「' + c.value + '」？')) return;
    $('sig-save').disabled = true;
    var my = pfToken;
    var r = await rpc('set_my_signature_v1', { p_signature: c.value });   // 只走审核+持久命中日志的 v1；不回退旧入口
    $('sig-save').disabled = false;
    if (my !== pfToken) return false;   // 期间账号变化：丢弃
    if (r.error) { text($('pf-state'), Core.isUndeployed(r.error) ? '签名审核接口待接入，未保存' : errText(r.error, '签名接口') + '，未保存'); return false; }
    if (!r.data || r.data.ok !== true) { var code = r.data && r.data.error && r.data.error.code; text($('pf-state'), SIG_TEXT[code] || '未保存'); return false; }
    r = { data: r.data.profile || {} }; if (typeof r.data.signature !== 'string') r.data.signature = c.value;
    text($('pf-sign'), typeof r.data.signature === 'string' ? r.data.signature : c.value); text($('pf-state'), '签名已保存'); return true;
  }

  // 2) 聊天外观：拥有/装备只信服务端 get_shop_state；本机预览不代表他人看到的装备
  function renderCC() {
    var C = cc(), grid = $('cc-grid'), eq = $('cc-equip'); if (!grid || !eq) return;
    grid.replaceChildren();
    if (!C) { text($('cc-state'), '外观渲染器未加载'); eq.disabled = true; return; }
    var own = Core.chatOwned(shop || {}, C);
    Array.prototype.forEach.call(($('cc-tabs') || { querySelectorAll: function () { return []; } }).querySelectorAll('[data-cc-cat]'), function (b) { b.setAttribute('aria-selected', String(b.dataset.ccCat === cur)); });
    C.catalog.filter(function (x) { return x.category === cur; }).forEach(function (it) {
      var info = own[cur], st = !shop ? '' : info.equipped === it.id ? '已装备' : info.owned.has(it.id) ? '已拥有' : '未拥有';
      var b = mk('button', null, 'sg-ghost cc-item'); b.type = 'button'; b.dataset.ccId = it.id; b.setAttribute('aria-pressed', String(pick[cur] === it.id));
      b.append(mk('b', it.id === 'default' ? '默认（取消装备）' : it.name), mk('small', st ? ' · ' + st : '', 'sg-muted'));
      b.addEventListener('click', function () { pick[cur] = it.id; renderCC(); });
      grid.appendChild(b);
    });
    var id = pick[cur], info2 = own[cur];
    eq.disabled = !shop || id === info2.equipped || !info2.owned.has(id);
    eq.textContent = !shop ? '装备（接口未接入）' : id === info2.equipped ? '已装备' : !info2.owned.has(id) ? '未拥有（去商城获取）' : id === 'default' ? '使用默认（取消装备）' : '装备' + CAT_NAME[cur];
    var pv = $('cc-preview');
    if (pv) { var msg = mk('span', '本机预览：今天也有星光', 'sg-appearance-demo-msg'), av = mk('span', '★', 'sg-appearance-demo-avatar'), bd = mk('span', null, 'sg-appearance-demo-badges');
      var row = { bubble: pick.bubble, chat_effect: pick.chat_effect, avatar_frame: pick.avatar_frame, vip_badge: null, level_badge: null };
      C.render({ message: msg, avatar: av, badges: bd }, row, { context: 'dm', animate: false }); pv.replaceChildren(av, msg, bd); }
    text($('cc-preview-note'), '本机预览，不代表他人看到的实际装备');
  }
  async function loadCC() {
    var my = ++ccToken; shop = null; pick = { bubble: 'default', chat_effect: 'default', avatar_frame: 'default' };
    if ($('cc-grid')) $('cc-grid').replaceChildren(); if ($('cc-preview')) $('cc-preview').replaceChildren(); if ($('cc-equip')) $('cc-equip').disabled = true;
    if (anon()) { text($('cc-state'), ''); return; }
    text($('cc-state'), '读取中…');
    var r = await rpc('get_shop_state', {});
    if (my !== ccToken) return;
    if (r.error || !r.data || !Array.isArray(r.data.inventory)) { text($('cc-state'), r.error ? errText(r.error, '外观接口') : '请先登录'); renderCC(); return; }
    shop = { inventory: r.data.inventory, equipped: r.data.equipped || {} };
    var own = Core.chatOwned(shop, cc() || { catalog: [] }); CATS.forEach(function (c) { pick[c] = own[c].equipped; });
    text($('cc-state'), '拥有与装备以服务端为准'); renderCC();
  }
  async function equip() {
    if (!shop) return false; var cat = cur, id = pick[cat];
    if (!window.confirm('确认装备' + CAT_NAME[cat] + '「' + id + '」？只影响之后的新发言。')) return false;
    $('cc-equip').disabled = true;
    var my = ccToken;
    var r = await rpc('equip_chat_cosmetic', { p_category: cat, p_id: id });
    if (my !== ccToken) return false;   // 期间账号变化/重载：不回填
    if (r.error || !Core.equipConfirmed(cat, id, r.data)) { text($('cc-state'), r.error ? errText(r.error, '装备接口') + '，未装备' : '服务端未确认装备'); renderCC(); return false; }
    shop = { inventory: Array.isArray(r.data.inventory) ? r.data.inventory : shop.inventory, equipped: r.data.equipped || {} };
    text($('cc-state'), '已装备（服务端确认）'); renderCC(); return true;
  }

  // 3) 公开广场作者外观：按帖子 id 授权（public_feed），≤30/批；匿名/失败只清外观，不动列表
  function nodes(card) { return { message: card.querySelector('.sq-body'), avatar: card.querySelector('.sq-avatar'), badges: card.querySelector('.sq-badges') }; }
  async function applyFeedAppearance(listEl) {
    var C = cc(); if (!listEl || !C) return;
    lastList = listEl;
    var cards = Array.prototype.slice.call(listEl.querySelectorAll('[data-post-id]'));
    cards.forEach(function (card) { try { C.render(nodes(card), null, { context: 'public_feed' }); } catch (_) {} });
    var my = ++token;
    if (anon()) return;
    var batches = Core.feedBatches(cards.map(function (c) { return c.getAttribute('data-post-id'); }));
    for (var i = 0; i < batches.length; i++) {
      var r = await rpc('get_equipped_chat_cosmetics', { p_public_ids: [], p_context: 'public_feed', p_conversation_id: null, p_feed_post_ids: batches[i] });
      if (my !== token || anon()) return;   // 切匿名/离开广场/账号变化/重绘后到达的旧响应丢弃
      if (r.error || !Array.isArray(r.data)) continue;   // 未部署/错误：保持默认外观
      Core.feedRowsFor(r.data, batches[i]).forEach(function (row) {
        var card = cards.filter(function (c) { return c.getAttribute('data-post-id') === row.post_id && listEl.contains(c); })[0];
        if (card) try { C.render(nodes(card), row, { context: 'public_feed', animate: false }); } catch (_) {}
      });
    }
  }
  // 4) 好友资料：最小公开字段，权限由服务端（自己/已接受且未拉黑好友/可发现）
  async function openFriendProfile(publicId, target) {
    if (!target) return; target.replaceChildren();
    if (anon() || !Core.profileView({ public_id: publicId }).public_id) { text(target, '资料不可见'); return; }
    var r = await rpc('get_public_profile', { p_public_id: publicId });
    if (r.error) { text(target, errText(r.error, '资料接口')); return; }
    var v = Core.profileView(r.data); if (!v) { text(target, '资料不可见'); return; }
    target.append(mk('b', v.nickname || '星糖旅人'), mk('p', v.signature || '未设置签名'), mk('small', Core.levelText(v.level) + ' · ' + Core.vipText(v.vip_tier), 'sg-muted'));
  }
  function clearFeedAppearance() {   // 使所有在途请求失效并清掉已渲染外观（不保留作者缓存）
    token++; var C = cc(); if (!lastList || !C) return;
    Array.prototype.forEach.call(lastList.querySelectorAll('[data-post-id]'), function (card) { try { C.render(nodes(card), null, { context: 'public_feed' }); } catch (_) {} });
  }
  function onAccountChange() { clearFeedAppearance(); loadProfile(); loadCC(); }
  function boot() {
    window.addEventListener('starshopchange', function () { loadCC(); });
    window.addEventListener('hashchange', function () { var h = window.location && window.location.hash; if (anon() || (h && h !== '#square' && h !== '#following')) clearFeedAppearance(); });
    window.addEventListener('sg-tab', function (e) { if (e && e.detail !== 'square') clearFeedAppearance(); });
    try { var sb = window.StarSocialClient && window.StarSocialClient.get(); var last;
      if (sb && sb.auth && typeof sb.auth.onAuthStateChange === 'function') sb.auth.onAuthStateChange(function (ev, session) { var u = session && session.user && session.user.id || null; if (last !== undefined && u !== last) onAccountChange(); last = u; });
    } catch (_) {}
    if ($('sig-save')) $('sig-save').addEventListener('click', saveSignature);
    if ($('sig-form')) $('sig-form').addEventListener('submit', function (e) { e.preventDefault(); });
    if ($('sig-input')) $('sig-input').addEventListener('input', function () { text($('sig-count'), Array.from($('sig-input').value.trim()).length + '/60'); });
    if ($('cc-equip')) $('cc-equip').addEventListener('click', equip);
    if ($('cc-tabs')) $('cc-tabs').addEventListener('click', function (e) { var b = e.target && e.target.closest && e.target.closest('[data-cc-cat]'); if (b && CATS.indexOf(b.dataset.ccCat) >= 0) { cur = b.dataset.ccCat; renderCC(); } });
    window.addEventListener('starshopchange', loadCC);
    loadProfile(); loadCC();
  }
  window.StarSocialAppearance = { applyFeedAppearance: applyFeedAppearance, clearFeedAppearance: clearFeedAppearance, onAccountChange: onAccountChange, openFriendProfile: openFriendProfile, saveSignature: saveSignature, equip: equip, reload: function () { return Promise.all([loadProfile(), loadCC()]); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var FEED_ID = /^[1-9][0-9]{0,18}$/;
  function chars(s) { return Array.from(String(s == null ? '' : s)); }
  function isUndeployed(err) {
    if (!err) return false;
    return err.code === 'PGRST202' || String(err.message || '').indexOf('Could not find the function') >= 0;
  }
  function isAnonHash(h) { return /^#(?:tree|treehole|feed)(?:[/?#].*)?$/i.test(String(h || '')); }
  function profileView(p) {
    if (!p || typeof p !== 'object') return null;
    var level = Number.isInteger(p.level) && p.level >= 1 && p.level <= 100 ? p.level : null;
    var vip = Number.isInteger(p.vip_tier) && p.vip_tier >= 0 && p.vip_tier <= 8 ? p.vip_tier : null;
    var medals = Array.isArray(p.medals) ? p.medals.filter(function (m) { return typeof m === 'string' && /^vip[1-8]$/.test(m); }).slice(0, 8) : [];
    return {
      public_id: typeof p.public_id === 'string' && UUID.test(p.public_id) ? p.public_id : null,
      nickname: typeof p.nickname === 'string' ? chars(p.nickname).slice(0, 16).join('') : '',
      signature: typeof p.signature === 'string' ? chars(p.signature).slice(0, 60).join('') : '',
      level: level, vip_tier: vip, medals: medals
    };
  }
  function levelText(v) { return v == null ? '等级：未公开' : '等级：' + v; }
  function vipText(t) { return t == null ? 'VIP：未公开' : t === 0 ? 'VIP：无' : 'VIP：' + t; }
  function validateSignature(s) {
    var value = String(s == null ? '' : s).trim(), n = chars(value).length;
    if (n > 60) return {ok:false, code:'SIGNATURE_LENGTH'};
    if (/[<>]|[\u0000-\u001f\u007f-\u009f]/u.test(value)) return {ok:false, code:'SIGNATURE_CHARS'};
    return {ok:true, value:value};
  }
  function chatOwned(shopState, catalog) {
    var cats = ['bubble','chat_effect','avatar_frame'], out = {};
    var inventory = shopState && Array.isArray(shopState.inventory) ? shopState.inventory : [];
    var list = catalog && Array.isArray(catalog.catalog) ? catalog.catalog : [];
    cats.forEach(function (cat) {
      var ids = list.filter(function (x) { return x && x.category === cat && typeof x.id === 'string'; }).map(function (x) { return x.id; });
      var owned = new Set(['default']);
      inventory.forEach(function (id) { if (ids.indexOf(id) >= 0) owned.add(id); });
      var equipped = shopState && shopState.equipped ? shopState.equipped[cat] : null;
      if (typeof equipped !== 'string' || ids.indexOf(equipped) < 0 || !owned.has(equipped)) equipped = 'default';
      out[cat] = {owned:owned, equipped:equipped};
    });
    return out;
  }
  function equipConfirmed(category, id, resultState) {
    if (!resultState || !resultState.equipped) return false;
    var equipped = resultState.equipped[category];
    return equipped === id || (id === 'default' && (equipped == null || equipped === 'default'));
  }
  function feedBatches(ids) {
    var seen = {}, out = [], batch = [];
    (ids || []).forEach(function (id) {
      var s = typeof id === 'number' ? (Number.isSafeInteger(id) && id > 0 ? String(id) : null) : id;   // 不安全 Number 拒绝，不吞精度
      if (typeof s !== 'string' || !FEED_ID.test(s) || seen[s]) return;
      seen[s] = true; batch.push(s);
      if (batch.length === 30) { out.push(batch); batch = []; }
    });
    if (batch.length) out.push(batch);
    return out;
  }
  function feedRowsFor(rows, batch) {
    var allowed = {}, seen = {}, out = [];
    (batch || []).forEach(function (id) { allowed[id] = true; });
    (rows || []).forEach(function (row) {
      if (!row || typeof row.post_id !== 'string' || !allowed[row.post_id] || seen[row.post_id]) return;
      seen[row.post_id] = true; out.push(row);
    });
    return out;
  }
  return {isUndeployed:isUndeployed, isAnonHash:isAnonHash, profileView:profileView,
    levelText:levelText, vipText:vipText, validateSignature:validateSignature,
    chatOwned:chatOwned, equipConfirmed:equipConfirmed, feedBatches:feedBatches, feedRowsFor:feedRowsFor};
});
