// 会话发送（文字 + 贴纸）：只走 12 号 v1 入口（服务端 nonce+载荷幂等、09 审核、好友/拉黑/封禁/限流由服务端判定）。
// 用户点击才发送；网络失败保留同一 nonce 供「重试」；接口未部署（PGRST202）则禁用，不伪造成功。
(function (factory) {
  const Core = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  if (typeof window !== 'undefined') window.StarSocialChatCore = Core;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  let pending = null, busy = false, undeployed = false, cap = 'unknown', probing = null;
  const sb = () => { try { return window.StarSocialClient && window.StarSocialClient.get(); } catch (_) { return null; } };
  const conv = () => window.StarSocialConv && window.StarSocialConv.current && window.StarSocialConv.current();
  function state(msg) { const s = $('conv-send-state'); if (s) s.textContent = msg || ''; }
  function refreshUi() {
    const c = conv(), can = !!(c && c.conversation_id) && !undeployed && cap === 'ready' && !busy;
    ['conv-input', 'conv-send'].forEach(id => { const e = $(id); if (e) e.disabled = !can; });
    const r = $('conv-retry'); if (r) r.hidden = !pending || busy;
    const s = $('sticker-send'); if (s) s.disabled = busy;
    const note = $('conv-note');
    if (note) note.textContent = !c ? '' : undeployed || cap === 'undeployed' ? '会话发送接口待接入：当前只读' : cap === 'ready' ? '' : '正在确认发送能力…';
    if (undeployed) state('会话发送接口待接入');
  }
  // 能力探测：只读 chat_stickers_v1（12 号）；PGRST202 → 待接（发送框禁用），不一概显示可发
  async function probe() {
    if (probing) return probing; const client = sb(); if (!client) { cap = 'undeployed'; return; }
    probing = Promise.resolve(client.rpc('chat_stickers_v1', {})).then(r => {
      cap = r && r.error ? (r.error.code === 'PGRST202' ? 'undeployed' : 'unknown') : 'ready';
      if (cap === 'undeployed') undeployed = true;
    }).catch(() => { cap = 'unknown'; }).finally(() => { if (cap === 'unknown') probing = null; refreshUi(); try { window.dispatchEvent(new CustomEvent('sg-chat-capability')); } catch (_) {} });
    return probing;
  }
  async function send(job) {
    const client = sb(); if (!client || busy) return false;
    busy = true; refreshUi(); state('发送中…');
    let res;
    try { res = await client.rpc(job.kind === 'sticker' ? 'chat_send_sticker_v1' : 'chat_send_text_v1', Core.args(job)); }
    catch (e) { res = { data: null, error: e || { message: 'network' } }; }
    busy = false;
    const out = Core.interpret(res);
    if (out.status === 'ok') { pending = null; state(''); if (job.kind === 'text' && $('conv-input')) $('conv-input').value = ''; window.StarSocialConv && window.StarSocialConv.refresh && window.StarSocialConv.refresh(); }
    else if (out.status === 'undeployed') { undeployed = true; pending = null; }
    else if (out.status === 'retry') { pending = job; state('网络异常，可重试（不会重复发送）'); }
    else { pending = null; state(Core.errorText(out.code)); }
    refreshUi(); return out.status === 'ok';
  }
  function boot() {
    const form = $('conv-form');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault(); const c = conv(); const v = ($('conv-input') || {}).value || '';
      const job = Core.textJob(c && c.conversation_id, v); if (!job.ok) { state(Core.errorText(job.code)); return; }
      send(job.job);
    });
    const retry = $('conv-retry'); if (retry) retry.addEventListener('click', () => { if (pending && conv() && conv().conversation_id === pending.conversation_id) send(pending); else { pending = null; refreshUi(); } });
    window.addEventListener('sg-sticker-send', e => {   // 由贴纸预览中的「发送」按钮（用户点击）触发
      const c = conv(); if (e && e.detail && e.detail.conversation_id && (!c || c.conversation_id !== e.detail.conversation_id)) { state('会话已变化，未发送'); return; }
      const job = Core.stickerJob(c && c.conversation_id, e && e.detail && e.detail.id);
      if (!job.ok) { state(Core.errorText(job.code)); return; } send(job.job);
    });
    window.addEventListener('sg-conv-change', () => { pending = null; state(''); if (conv()) probe(); refreshUi(); });
    refreshUi();
  }
  window.StarSocialChat = { refreshUi, _send: send, capability: () => (undeployed ? 'undeployed' : cap) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(function () {
  const STICKERS = Object.freeze(['wanan', 'chongya', 'tietie', 'hahaha', 'weiqu', 'shoudao', 'xiexie', 'shengqi', 'aini', 'jiayou', 'zaima', 'wuyu', 'jingya', 'moyu', 'kaixin', 'baibai']);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isSticker = id => typeof id === 'string' && STICKERS.indexOf(id) >= 0;
  const stickerAsset = id => isSticker(id) ? '../assets/stickers/pack1/' + id + '.webp' : null;   // 固定站内映射，绝不使用服务端/用户给的 URL
  function nonce() {
    const c = (typeof crypto !== 'undefined' && crypto) || null;
    if (c && c.randomUUID) return c.randomUUID();
    const b = new Uint8Array(16); c.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function textJob(cid, body) {
    if (!UUID.test(cid || '')) return { ok: false, code: 'NO_CONVERSATION' };
    const b = String(body || '').trim(); if (!b) return { ok: false, code: 'EMPTY' }; if (b.length > 500) return { ok: false, code: 'BODY_TOO_LONG' };
    return { ok: true, job: { kind: 'text', conversation_id: cid, body: b, nonce: nonce() } };
  }
  function stickerJob(cid, id) {
    if (!UUID.test(cid || '')) return { ok: false, code: 'NO_CONVERSATION' };
    if (!isSticker(id)) return { ok: false, code: 'STICKER_UNKNOWN' };
    return { ok: true, job: { kind: 'sticker', conversation_id: cid, sticker_id: id, nonce: nonce() } };
  }
  const args = j => j.kind === 'sticker' ? { p_conversation_id: j.conversation_id, p_sticker_id: j.sticker_id, p_client_nonce: j.nonce } : { p_conversation_id: j.conversation_id, p_body: j.body, p_client_nonce: j.nonce };
  function interpret(res) {
    const e = res && res.error;
    if (e) {
      if (e.code === 'PGRST202' || /Could not find the function/i.test(e.message || '')) return { status: 'undeployed' };
      if (!e.code || /network|fetch|timeout/i.test(e.message || '')) return { status: 'retry' };
      return { status: 'error', code: 'SEND_FAILED' };
    }
    const d = res && res.data;
    if (d && d.ok === true && d.message && /^[1-9][0-9]{0,18}$/.test(String(d.message.id))) return { status: 'ok', message: d.message };
    if (d && d.ok === false && d.error) return { status: 'error', code: String(d.error.code || 'SEND_FAILED') };
    return { status: 'error', code: 'SEND_FAILED' };
  }
  const TEXT = { EMPTY: '内容不能为空', TOO_LONG: '内容过长', BODY_TOO_LONG: '内容过长', TEXT_REJECTED: '内容未通过审核，未发送', NOT_FRIEND: '对方不是你的好友或已屏蔽，无法发送', FORBIDDEN: '无权在此会话发送',
    RATE_LIMITED: '发送太频繁，请稍后再试', NONCE_REUSED: '重复请求已拦截，请重新发送', STICKER_UNKNOWN: '贴纸不可用', NO_CONVERSATION: '请先打开会话', INVALID_INPUT: '参数无效', SEND_FAILED: '发送失败' };
  const errorText = c => TEXT[c] || TEXT.SEND_FAILED;
  return { STICKERS, isSticker, stickerAsset, nonce, textJob, stickerJob, args, interpret, errorText };
});
