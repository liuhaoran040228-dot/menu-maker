(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.StarSocialFeedCore = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function deployState(err) {
    const code = String(err?.code || err?.error?.code || '');
    const msg = String(err?.message || err?.error?.message || '');
    if (code === 'PGRST202' || code === '42883' || msg.includes('Could not find the function')) return 'undeployed';
    if (code === '42501' || code === '401' || /JWT/i.test(msg)) return 'auth';
    if (code === 'NETWORK' || err?.name === 'TypeError' || /network|fetch/i.test(msg)) return 'network';
    return 'error';
  }

  function codeText(code) {
    return ({
      NOT_ALLOWED: '内容不符合社区规范',
      CONTACT_OR_LINK: '不能包含联系方式或链接',
      RATE_LIMITED: '操作太频繁，稍后再试',
      EMPTY: '内容不能为空',
      TOO_LONG: '内容过长',
      POST_UNAVAILABLE: '内容不可用',
      USER_UNAVAILABLE: '用户不可用',
      CANNOT_FOLLOW_SELF: '不能关注自己',
      INVALID_MEDIA: '图片不可用',
      TOO_MANY_MEDIA: '最多4张',
      UPLOAD_DISABLED: '图片上传暂未开放'
    })[code] || '操作失败';
  }

  function clientKey() {
    const bytes = new Uint8Array(16);
    const c = globalThis.crypto;
    if (c?.getRandomValues) c.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  // bigint id：只接受规范十进制字符串（1..2^63-1）；Number 仅当安全整数；不安全 Number 拒绝（不 String() 吞精度）
  const MAX_I8 = 9223372036854775807n;
  function idStr(v) {
    if (typeof v === 'number') return Number.isSafeInteger(v) && v > 0 ? String(v) : null;
    if (typeof v !== 'string' || !/^[1-9][0-9]{0,18}$/.test(v)) return null;
    return BigInt(v) <= MAX_I8 ? v : null;
  }
  function mergePage(old, rows) {
    const map = new Map();
    (old || []).concat(rows || []).forEach(row => {
      const id = row && idStr(row.post_id);
      if (id) map.set(id, Object.assign({}, row, { post_id: id }));
    });
    return Array.from(map.values()).sort((a, b) => Number(BigInt(b.post_id) - BigInt(a.post_id)));
  }

  function nextCursor(rows, limit) {
    if (!Array.isArray(rows) || rows.length < limit) return null;
    return String(rows.reduce((m, r) => BigInt(r.post_id) < BigInt(m) ? r.post_id : m, rows[0].post_id));
  }

  function str(v, max = 2000) {
    return typeof v === 'string' ? v.slice(0, max) : '';
  }
  function bool(v) { return v === true; }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function publicId(v) { return typeof v === 'string' && /^[0-9a-f]{10}$/.test(v) ? v : null; }

  function normPost(row) {
    const pid = row && idStr(row.post_id);
    if (!pid) return null;
    let repost = null;
    if (row.repost?.available === false) repost = { available: false };
    else if (row.repost?.available === true && !idStr(row.repost.post_id)) repost = { available: false };
    else if (row.repost?.available === true) repost = {
      available: true,
      post_id: idStr(row.repost.post_id),
      body: str(row.repost.body),
      author_public_id: publicId(row.repost.author_public_id),
      author_nick: str(row.repost.author_nick, 200)
    };
    return {
      post_id: pid,
      author_public_id: publicId(row.author_public_id),
      author_nick: str(row.author_nick, 200),
      body: str(row.body),
      media_ids: Array.isArray(row.media_ids) ? row.media_ids.filter(x => typeof x === 'string').slice(0, 4) : [],
      created_at: str(row.created_at, 100),
      pending: bool(row.pending),
      mine: bool(row.mine),
      like_count: num(row.like_count),
      comment_count: num(row.comment_count),
      repost_count: num(row.repost_count),
      liked_by_me: bool(row.liked_by_me),
      reposted_by_me: bool(row.reposted_by_me),
      repost,
      author_badge: row.author_badge == null ? null : true
    };
  }

  function postNotice(res) {
    if (res?.status === 'pending') return '已提交，审核通过后公开';
    if (res?.masked) return '已发布（部分词语已替换）';
    return '已发布';
  }

  function isAnonCtx(hash) {
    const h = String(hash || '');
    return h === '#tree' || h === '#treehole' || h === '#feed';
  }

  return { deployState, codeText, clientKey, mergePage, nextCursor, normPost, postNotice, isAnonCtx, idStr };
});

if (typeof document !== 'undefined') {
  'use strict';
  const Core = window.StarSocialFeedCore;
  const $ = id => document.getElementById(id);
  const make = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = String(text);
    if (cls) node.className = cls;
    return node;
  };
  const btn = (text, action, id) => {
    const b = make('button', text, 'sq-action');
    b.type = 'button'; b.dataset.action = action; if (id != null) b.dataset.id = String(id);
    return b;
  };

  const state = {
    sb: null, session: null, tab: 'recommend', rows: [], cursor: null,
    loading: false, undeployed: false, auth: false, comments: new Map(), previews: []
  };

  function setText(node, text) { if (node) node.textContent = text == null ? '' : String(text); }
  function rpc(name, args) {
    const sb = state.sb;
    if (!sb) return Promise.reject({ code: 'PGRST202' });
    const method = sb.rpc?.[name];
    let p;
    if (typeof method === 'function') p = method.call(sb.rpc, args);
    else if (typeof sb.rpc === 'function') p = sb.rpc(name, args);
    else return Promise.reject({ code: 'PGRST202' });
    // supabase-js 返回 {data,error} 不抛错：error 转抛；返回表（数组）包装为 {ok,rows}
    return Promise.resolve(p).then(r => {
      if (r && typeof r === 'object' && ('error' in r || 'data' in r) && !('ok' in r)) {
        if (r.error) throw r.error;
        return Array.isArray(r.data) ? { ok: true, rows: r.data } : r.data;
      }
      return r;
    });
  }
  function errorInfo(err) {
    const code = err?.code || err?.error?.code || '';
    return { code, text: Core.codeText(code), deploy: Core.deployState(err) };
  }
  function rpcResult(res) {
    if (!res || res.ok !== true) throw res?.error || { code: 'UNKNOWN' };
    return res;
  }
  function refreshDisabled() {
    const disabled = state.undeployed || !state.auth;
    const submit = $('sq-submit');
    if (submit) submit.disabled = disabled || state.loading;
    const text = $('sq-text');
    if (text) text.disabled = disabled;
  }
  function showState(text) { setText($('sq-state'), text); }

  async function loadFeed(reset = false) {
    if (state.loading) return;
    if (reset) { state.rows = []; state.cursor = null; state.comments.clear(); }
    state.loading = true;
    const more = $('sq-more');
    if (more) more.disabled = true;
    showState(state.rows.length ? '加载中…' : '正在加载公开广场…');
    try {
      const res = await rpc('feed_list', {
        p_tab: state.tab,
        p_before: state.cursor || null,
        p_limit: 20
      });
      rpcResult(res);
      const rows = (res.rows || res.data || []).map(Core.normPost).filter(Boolean);
      state.rows = Core.mergePage(state.rows, rows);
      state.cursor = Core.nextCursor(rows, 20);
      render();
      if (!state.rows.length) showState('暂时没有公开动态');
      else showState('');
    } catch (err) {
      const info = errorInfo(err);
      if (info.deploy === 'undeployed') { state.undeployed = true; showState('公开广场服务尚未部署'); }
      else if (info.deploy === 'auth') { state.auth = false; showState('登录后才能使用公开广场'); }
      else showState('加载失败：' + info.text);
      refreshDisabled();
    } finally {
      state.loading = false;
      if (more) more.disabled = !state.cursor;
    }
  }

  function timeText(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
  }

  function render() {
    const list = $('sq-list');
    if (!list) return;
    list.replaceChildren();
    state.rows.forEach(post => list.appendChild(renderPost(post)));
    window.StarSocialAppearance?.applyFeedAppearance?.(list);
    const more = $('sq-more');
    if (more) {
      more.disabled = !state.cursor || state.loading;
      more.hidden = !state.cursor;
    }
  }

  function renderPost(post) {
    const card = make('article', null, 'sq-card');
    card.dataset.postId = String(post.post_id);   // 外观按帖子 id 授权（public_feed）
    const head = make('div', null, 'sq-card-head');
    if (!Core.isAnonCtx(location.hash)) {
      head.appendChild(make('span', null, 'sq-avatar'));
      head.appendChild(make('strong', post.author_nick || '星糖用户'));
      head.appendChild(make('span', null, 'sq-badges'));
      if (post.author_public_id) head.appendChild(make('span', ' @' + post.author_public_id));
    }
    const time = make('time', timeText(post.created_at));
    if (post.created_at) time.dateTime = post.created_at;
    head.appendChild(time);
    if (post.pending) head.appendChild(make('span', ' 审核中·仅自己可见', 'sq-pending'));
    card.appendChild(head);
    if (post.body) card.appendChild(make('p', post.body, 'sq-body'));

    if (post.repost) {
      const repost = make('div', null, 'sq-repost');
      if (!post.repost.available) repost.appendChild(make('span', '原内容已不可见'));
      else {
        if (!Core.isAnonCtx(location.hash)) {
          repost.appendChild(make('strong', post.repost.author_nick || '星糖用户'));
          if (post.repost.author_public_id) repost.appendChild(make('span', ' @' + post.repost.author_public_id));
        }
        if (post.repost.body) repost.appendChild(make('p', post.repost.body));
      }
      card.appendChild(repost);
    }
    (post.media_ids || []).forEach(() => card.appendChild(make('div', '图片待接入', 'sq-media-placeholder')));

    const actions = make('div', null, 'sq-actions');
    actions.appendChild(btn('赞 ' + post.like_count, 'like', post.post_id));
    actions.appendChild(btn('评论 ' + post.comment_count, 'comments', post.post_id));
    actions.appendChild(btn('转发 ' + post.repost_count, 'repost', post.post_id));
    if (!post.mine && post.author_public_id && !Core.isAnonCtx(location.hash)) {
      const follow = btn('关注', 'follow', post.author_public_id);
      follow.dataset.on = '1';
      actions.appendChild(follow);
    }
    if (post.mine) actions.appendChild(btn('删除', 'delete-post', post.post_id));

    const reportWrap = make('span', null, 'sq-report');
    const reason = make('select');
    reason.appendChild(make('option', '请选择举报原因'));
    ['垃圾广告', '不友善内容', '侵权', '其他'].forEach(x => reason.appendChild(make('option', x)));
    reportWrap.appendChild(reason);
    const report = btn('举报', 'report', post.post_id);
    report.dataset.type = 'post';
    reportWrap.appendChild(report);
    actions.appendChild(reportWrap);
    card.appendChild(actions);

    const commentBox = make('div', null, 'sq-comment-box');
    commentBox.hidden = true;
    card.appendChild(commentBox);
    return card;
  }

  async function toggleComments(postId, box, force) {
    const shown = !box.hidden;
    box.hidden = force === true ? false : shown;
    if (box.hidden) return;
    box.replaceChildren(make('p', '评论加载中…'));
    try {
      const res = rpcResult(await rpc('feed_comments', { p_post: postId, p_before: null, p_limit: 50 }));
      const rows = (res.rows || res.data || []).map(r => Object.assign({}, r, { comment_id: Core.idStr(r && r.comment_id) })).filter(r => r.comment_id);
      box.replaceChildren();
      if (!rows.length) box.appendChild(make('p', '暂无评论'));
      rows.forEach(row => {
        const line = make('div', null, 'sq-comment');
        if (!Core.isAnonCtx(location.hash)) {
          line.appendChild(make('strong', row.author_nick || '星糖用户'));
          if (/^[0-9a-f]{10}$/.test(row.author_public_id || '')) line.appendChild(make('span', ' @' + row.author_public_id));
        }
        line.appendChild(make('span', '：' + String(row.body || '')));
        if (row.pending) line.appendChild(make('span', ' 审核中'));
        if (row.mine) line.appendChild(btn('删除', 'delete-comment', row.comment_id));
        box.appendChild(line);
      });
      const form = make('form', null, 'sq-comment-form');
      const input = make('input');
      input.type = 'text'; input.maxLength = 2000; input.placeholder = '写下评论…';
      const send = make('button', '发送'); send.type = 'submit';
      form.append(input, send); box.appendChild(form);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) { showState(Core.codeText('EMPTY')); return; }
        send.disabled = true;
        try {
          rpcResult(await rpc('feed_comment', { p_post: postId, p_text: text, p_client_key: Core.clientKey() }));
          input.value = ''; showState('评论已提交'); await toggleComments(postId, box, true);
        } catch (err) { showState(errorInfo(err).text); }
        finally { send.disabled = false; }
      });
    } catch (err) { box.replaceChildren(make('p', errorInfo(err).text)); }
  }

  async function writeAction(button, name, args, onDone) {
    button.disabled = true;
    showState('处理中…');
    try {
      const res = rpcResult(await rpc(name, args));
      showState(onDone ? onDone(res) : '操作成功');
      await loadFeed(true);
    } catch (err) {
      const info = errorInfo(err);
      if (info.deploy === 'undeployed') state.undeployed = true;
      if (info.deploy === 'auth') state.auth = false;
      showState(info.text);
      refreshDisabled();
    } finally { button.disabled = false; }
  }

  let store = null;
  const getStore = () => { if (!store && window.SocialMedia?.PreviewStore) store = new window.SocialMedia.PreviewStore(); return store; };
  function revokeAll() {   // 发布/切 tab/pagehide 时释放全部 blob URL（PreviewStore 记录并释放）
    try { getStore()?.revokeAll(); } catch (_) {}
    state.previews = [];
    $('sq-previews')?.replaceChildren();
  }

  async function addFiles(files) {
    const media = window.SocialMedia, libs = window.StarSocialLibs, st = getStore();
    if (!media?.validateFile || !st) { showState(Core.codeText('INVALID_MEDIA')); return; }
    for (const file of Array.from(files || [])) {
      if (state.previews.length >= 4) { showState(Core.codeText('TOO_MANY_MEDIA')); break; }
      try {
        const valid = media.validateFile(file);
        if (!valid?.ok) { showState(Core.codeText('INVALID_MEDIA')); continue; }
        // 真实类型/尺寸/像素上限 + 重编码去元数据（compressorjs 或回退 canvas）；不是可信净化，服务端必须再处理
        const prep = libs?.prepareImage ? await libs.prepareImage(file) : await media.reencode(file);
        if (!prep?.ok || !prep.blob) { showState(Core.codeText('INVALID_MEDIA') + (prep?.code ? '（' + prep.code + '）' : '')); continue; }
        const url = st.create(prep.blob);
        if (!url || !String(url).startsWith('blob:')) { showState(Core.codeText('INVALID_MEDIA')); continue; }
        const item = { id: 'local-' + state.previews.length + '-' + Date.now(), url: String(url), blob: prep.blob, width: prep.width || 0, height: prep.height || 0 };
        state.previews.push(item);
        const wrap = make('div', null, 'sq-preview');
        const img = make('img'); img.src = item.url; img.alt = '本地图片预览';
        img.addEventListener('click', () => libs?.openLightbox?.(state.previews.map(p => ({ src: p.url, width: p.width || 1024, height: p.height || 1024, kind: 'local-preview' })), state.previews.indexOf(item)));
        const note = make('small', '本地预检中…', 'sg-muted');
        const remove = make('button', '移除'); remove.type = 'button';
        remove.addEventListener('click', () => { try { st.revoke(item.url); } catch (_) {} state.previews = state.previews.filter(p => p !== item); wrap.remove(); });
        wrap.append(img, note, remove); $('sq-previews')?.appendChild(wrap);
        (libs?.prescreen ? libs.prescreen(prep.blob) : Promise.resolve({ verdict: 'unavailable' })).then(r => {
          const v = r?.verdict;
          note.textContent = v === 'block' ? '本地预检：疑似违规，请勿发布' : v === 'warn' ? '本地预检：可能敏感' : v === 'ok' ? '本地预检通过（最终以服务端审核为准）' : '本地预检模型未加载，最终以服务端审核为准';
          if (v === 'block') item.blocked = true;
        }).catch(() => { note.textContent = '本地预检模型未加载，最终以服务端审核为准'; });
      } catch (_) { showState(Core.codeText('INVALID_MEDIA')); }
    }
    const file = $('sq-file');
    if (file) file.value = '';
  }

  function updateCount() {
    const n = ($('sq-text')?.value || '').length;
    setText($('sq-count'), n + '/2000');
  }

  function bind() {
    $('sq-pick')?.addEventListener('click', () => $('sq-file')?.click());
    $('sq-file')?.addEventListener('change', e => addFiles(e.target.files));
    $('sq-text')?.addEventListener('input', updateCount);
    $('sq-tree-entry')?.addEventListener('click', () => { location.hash = '#treehole'; });

    document.querySelectorAll('#sq-seg [data-sq-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        state.tab = tab.dataset.sqTab === 'following' ? 'following' : 'recommend';
        document.querySelectorAll('#sq-seg [data-sq-tab]').forEach(x => x.setAttribute('aria-selected', String(x === tab)));
        loadFeed(true);
      });
    });

    $('sq-more')?.addEventListener('click', () => loadFeed(false));
    $('sq-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const text = $('sq-text').value.trim();
      if (!text) { showState(Core.codeText('EMPTY')); return; }
      if (state.previews.length && window.SocialMedia?.UPLOAD_ENABLED !== true) {
        showState(Core.codeText('UPLOAD_DISABLED')); return;
      }
      const submit = $('sq-submit'); submit.disabled = true; showState('发布中…');
      try {
        const res = rpcResult(await rpc('feed_create_post', {
          p_text: text, p_client_key: Core.clientKey(),
          p_media_ids: state.previews.map(p => p.serverId).filter(id => /^m_[0-9a-f]{20}$/.test(id || ''))  // 仅服务端签发且已审核的媒体 id；本地预览永不提交
        }));
        $('sq-text').value = ''; updateCount(); revokeAll();
        showState(Core.postNotice(res)); await loadFeed(true);
      } catch (err) {
        const info = errorInfo(err);
        if (info.deploy === 'undeployed') state.undeployed = true;
        if (info.deploy === 'auth') state.auth = false;
        showState(info.text);
      } finally { refreshDisabled(); }
    });

    $('sq-list')?.addEventListener('click', e => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      const action = button.dataset.action, id = button.dataset.id;
      const post = state.rows.find(p => p.post_id === id);
      if (action === 'like' && post) writeAction(button, 'feed_like', { p_post: id, p_on: !post.liked_by_me });
      else if (action === 'repost' && post) writeAction(button, 'feed_repost', { p_post: id });
      else if (action === 'follow' && post) writeAction(button, 'feed_follow', { p_public_id: id, p_on: button.dataset.on !== '1' });
      else if (action === 'delete-post' && confirm('确定删除这条动态？')) writeAction(button, 'feed_delete_own', { p_type: 'post', p_id: id });
      else if (action === 'delete-comment' && confirm('确定删除这条评论？')) writeAction(button, 'feed_delete_own', { p_type: 'comment', p_id: id });
      else if (action === 'report') {
        const select = button.parentElement.querySelector('select');
        if (!select?.value) { showState('请选择举报原因'); return; }
        writeAction(button, 'feed_report', { p_type: button.dataset.type || 'post', p_id: id, p_reason: select.value });
      } else if (action === 'comments') {
        const box = button.closest('.sq-card')?.querySelector('.sq-comment-box');
        if (box) toggleComments(id, box);
      }
    });

    window.addEventListener('sg-tab', e => {
      if (e.detail !== 'square') { revokeAll(); state.rows = []; render(); return; }
      revokeAll(); loadFeed(true);
    });
    window.addEventListener('pagehide', revokeAll);
  }

  async function init() {
    bind();
    state.sb = window.StarSocialClient?.get?.() || null;
    if (!state.sb) { state.undeployed = true; showState('公开广场服务尚未部署'); refreshDisabled(); return; }
    try {
      const gs = await state.sb.auth.getSession();
      state.session = gs && gs.data && 'session' in gs.data ? gs.data.session : gs;
      state.auth = Boolean(state.session?.user || state.session?.access_token || state.session?.public_id);
    } catch (_) { state.auth = false; }
    if (!state.auth) showState('登录后才能使用公开广场');
    refreshDisabled();
    loadFeed(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
