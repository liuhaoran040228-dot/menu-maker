(function (root, factory) {
  const Core = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  if (typeof window !== 'undefined') window.StarSocialLibsCore = Core;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // 修复：UMD 外层参数 root 在工厂内不可见（嘟嘟浏览器报 root is not defined）→ 工厂内自取全局
  const root = typeof window !== 'undefined' ? window : globalThis;
  const VENDOR = '../vendor/';

  function stickerSafe(s) {
    if (!s || typeof s !== 'object') return null;
    const id = s.id;
    const caption = s.caption;
    if (typeof id !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(id)) return null;
    if (s.file !== `assets/stickers/pack1/${id}.webp`) return null;
    if (typeof caption !== 'string' || caption.length > 8) return null;
    return { id, caption, file: s.file };
  }

  function stickerList(json) {
    const stickers = json && Array.isArray(json.stickers) ? json.stickers : [];
    return stickers.map(stickerSafe).filter(Boolean).slice(0, 16).map(s => ({
      id: s.id,
      caption: s.caption,
      src: '../' + s.file
    }));
  }

  function insertEmoji(value, selStart, selEnd, emoji, max) {
    const text = typeof value === 'string' ? value : '';
    const insert = typeof emoji === 'string' ? emoji : '';
    const start = Math.max(0, Math.min(text.length, Number(selStart) || 0));
    const end = Math.max(start, Math.min(text.length, Number(selEnd) || 0));
    if (!insert || text.length + insert.length > max) {
      return { value: text, caret: start };
    }
    const result = text.slice(0, start) + insert + text.slice(end);
    return { value: result, caret: start + insert.length };
  }

  function nsfwVerdict(predictions) {
    if (!Array.isArray(predictions)) return 'unknown';
    try {
      const p = {};
      predictions.forEach(x => {
        if (x && typeof x.className === 'string') {
          p[x.className] = (p[x.className] || 0) + Number(x.probability || 0);
        }
      });
      const adult = (p.Porn || 0) + (p.Hentai || 0);
      if (adult >= 0.6) return 'block';
      if ((p.Sexy || 0) >= 0.7 || adult >= 0.3) return 'warn';
      return 'ok';
    } catch (_) {
      return 'unknown';
    }
  }

  function compressOpts() {
    return {
      strict: true,
      checkOrientation: true,
      retainExif: false,
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 0.85,
      mimeType: 'image/webp',
      convertSize: Infinity
    };
  }

  function lightboxItems(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
      if (!item || typeof item.src !== 'string') return false;
      if (!Number.isInteger(item.width) || !Number.isInteger(item.height)) return false;
      if (item.width <= 0 || item.height <= 0 || item.width > 8192 || item.height > 8192) return false;
      if (item.kind === 'local-preview') return item.src.indexOf('blob:') === 0;
      if (item.kind === 'approved') {
        return item.src.indexOf('//') !== 0 &&
          (item.src.charAt(0) === '/' || item.src.indexOf('../') === 0);
      }
      return false;
    });
  }

  function failure(code) {
    return { ok: false, code: code || 'invalid-file' };
  }

  function mimeOf(value) {
    if (typeof value === 'string') return value.toLowerCase();
    if (value && typeof value.type === 'string') return value.type.toLowerCase();
    return '';
  }

  function failureCode(result, fallback) {
    if (result && typeof result === 'object' && result.code) return result.code;
    if (typeof result === 'string') return result;
    return fallback;
  }

  async function prepareImage(file) {
    try {
      if (!file || !root.SocialMedia) return failure('media-unavailable');
      const validation = await root.SocialMedia.validateFile(file);
      if (validation === false) return failure('invalid-file');
      if (validation && validation.ok === false) return failure(failureCode(validation, 'invalid-file'));

      const M = root.SocialMedia;
      const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
      const mime = mimeOf(M.sniffMime(head));
      if (['image/webp', 'image/jpeg', 'image/png'].indexOf(mime) < 0 || mime !== mimeOf(file.type)) return failure('MIME_MISMATCH');
      const dimensions = M.readDimensions(head);   // 解码前读头部尺寸，读不出即拒（防像素炸弹）
      if (!dimensions) return failure('DIMENSIONS_UNKNOWN');
      const fitted = M.fitSize(dimensions.width, dimensions.height);
      if (!fitted || fitted.ok === false) return failure(failureCode(fitted, 'invalid-dimensions'));

      let blob = null, width = fitted.width, height = fitted.height;
      if (typeof root.Compressor === 'function') {
        blob = await new Promise(resolve => { try { new root.Compressor(file, Object.assign(compressOpts(mime), { success: resolve, error: () => resolve(null) })); } catch (_) { resolve(null); } });
      }
      if (!blob) { const r = await M.reencode(file); if (!r || !r.ok) return failure(failureCode(r, 'reencode-failed')); blob = r.blob; width = r.width; height = r.height; }
      if (!blob || typeof blob.size !== 'number') return failure('reencode-failed');
      if (blob.size > 2 * 1024 * 1024) return failure('file-too-large');
      const resultMime = mimeOf(M.sniffMime(new Uint8Array(await blob.slice(0, 64).arrayBuffer())));
      if (['image/webp', 'image/jpeg', 'image/png'].indexOf(resultMime) < 0) return failure('unsupported-mime');
      return { ok: true, blob, width, height, mime: resultMime };
    } catch (_) {
      return failure('processing-failed');
    }
  }

  // nsfwjs 4.4 浏览器包不含权重：须先以 <script> 自托管加载 model.min.js（→ window.model）与
  // group1-shard1of1.min.js（→ window.group1_shard1of1），再 nsfwjs.load('MobileNetV2')；库从全局取，不发网络请求。
  // 任一本地文件缺失/全局未出现 → 失败（不回退 CDN/registry，不当作审核通过）。
  const NSFW_DIR = 'nsfwjs@4.4.0/';
  const NSFW_FILES = [
    ['models/mobilenet_v2/model.min.js', 'model'],
    ['models/mobilenet_v2/group1-shard1of1.min.js', 'group1_shard1of1'],
    ['nsfwjs.min.js', 'nsfwjs']
  ];
  function loadLocalScript(rel, globalName) {
    if (root[globalName]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = VENDOR + NSFW_DIR + rel;
      script.dataset.sgVendor = 'nsfw';
      const timer = setTimeout(() => reject(new Error('nsfw-timeout:' + rel)), 20000);
      script.onload = () => { clearTimeout(timer); root[globalName] ? resolve() : reject(new Error('nsfw-missing-global:' + globalName)); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('nsfw-load-failed:' + rel)); };
      document.head.appendChild(script);
    });
  }
  let nsfwPromise = null;
  function loadNsfw() {
    if (nsfwPromise) return nsfwPromise;
    nsfwPromise = NSFW_FILES.reduce((p, f) => p.then(() => loadLocalScript(f[0], f[1])), Promise.resolve())
      .then(() => {
        const nsfw = root.nsfwjs;
        if (!nsfw || typeof nsfw.load !== 'function' || !root.model || !root.group1_shard1of1) throw new Error('nsfw-unavailable');
        return nsfw.load('MobileNetV2', { size: 224 });
      })
      .catch(e => { nsfwPromise = null; throw e; });
    return nsfwPromise;
  }

  async function prescreen(blob) {
    try {
      const model = await loadNsfw();
      if (!model || typeof model.classify !== 'function') return { verdict: 'unavailable', reason: 'nsfw-unavailable' };
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { verdict: 'unavailable' };
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close && bitmap.close();
      const predictions = await model.classify(canvas);
      return { verdict: nsfwVerdict(predictions) };
    } catch (e) {
      try { console.warn('[星糖] 本地图片预检不可用（不视为通过）:', e && e.message); } catch (_) {}
      return { verdict: 'unavailable', reason: String(e && e.message || 'nsfw-unavailable').slice(0, 120) };
    }
  }

  function openLightbox(items, index) {
    const filtered = lightboxItems(items);
    if (!filtered.length || !root.PhotoSwipe) return null;
    const safeIndex = Math.max(0, Math.min(filtered.length - 1, Number(index) || 0));
    return new root.PhotoSwipe({
      dataSource: filtered,
      index: safeIndex,
      showHideAnimationType: 'none'
    }).init();
  }

  if (typeof document !== 'undefined') {
    root.StarSocialLibs = { prepareImage, prescreen, openLightbox };

    // 草稿目标：由打开弹层的入口决定（大厅工具栏 → lobby；会话表单按钮 → 当前 DM 会话）。
    // 插入前复核：会话目标须仍是同一会话且可见/可用，否则丢弃并关闭弹层（防止插进旧会话或已失权会话）。
    let target = null;
    function convNow() { try { return root.StarSocialConv && root.StarSocialConv.current && root.StarSocialConv.current(); } catch (_) { return null; } }
    function makeTarget(scene) {
      if (scene === 'conv') { const c = convNow(); return c ? { scene, convId: c.conversation_id, input: document.getElementById('conv-input'), form: document.getElementById('conv-form') } : null; }
      return { scene: 'lobby', input: document.getElementById('lobby-input'), form: document.getElementById('lobby-form') };
    }
    function targetValid(t) {
      if (!t || !t.input || !t.form || t.form.hidden || t.input.disabled) return false;
      if (t.scene === 'conv') { const c = convNow(); const view = document.getElementById('conv-view'); return !!(c && c.conversation_id === t.convId && view && !view.hidden); }
      return true;
    }
    // 弹层互斥：同一时间只开一个（含 social.js 的 emoji/topic 面板）；切 tab / hashchange / Escape / 外点关闭；
    // 打开时定位到输入区上方，不遮挡工具按钮。
    const POPS = [['emoji-more-btn', 'emoji-pop'], ['sticker-btn', 'sticker-pop'], ['emoji-btn', 'emoji-panel'], ['topic-btn', 'topic-panel']];
    function closePops(except) {
      POPS.forEach(([b, p]) => { const pe = document.getElementById(p), be = document.getElementById(b);
        if (pe && pe !== except && !pe.hidden) { pe.hidden = true; if (be) be.setAttribute('aria-expanded', 'false'); } });
    }
    function placePop(pop) {   // 锚定到当前目标表单上方；表单太靠上（小屏/键盘）时改为顶部展示，保证可见
      const form = target && target.form;
      pop.dataset.anchor = target ? target.scene : '';
      if (!form || form.hidden || !form.getBoundingClientRect) return;
      const top = form.getBoundingClientRect().top, vh = root.innerHeight || 0;
      if (!(vh > 0)) return;
      if (top >= 176) { pop.style.top = ''; pop.style.bottom = Math.max(8, vh - top + 8) + 'px'; pop.style.maxHeight = (top - 16) + 'px'; }
      else { pop.style.bottom = ''; pop.style.top = '8px'; pop.style.maxHeight = Math.max(160, Math.round(vh * 0.5)) + 'px'; }
    }
    function togglePop(btn, pop, force, scene) {
      const open = typeof force === 'boolean' ? force : pop.hidden;
      closePops(open ? pop : null);
      if (open) { target = makeTarget(scene || 'lobby'); if (!targetValid(target)) { target = null; return; } }
      pop.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { placePop(pop); updateStickerLabel(); } else target = null;
    }
    ['emoji-btn', 'topic-btn'].forEach(id => { const b = document.getElementById(id);   // social.js 面板打开时关掉我们的弹层
      if (b) b.addEventListener('click', () => ['emoji-pop', 'sticker-pop'].forEach(p => { const pe = document.getElementById(p); if (pe && !pe.hidden) { pe.hidden = true; const be = document.getElementById(p === 'emoji-pop' ? 'emoji-more-btn' : 'sticker-btn'); if (be) be.setAttribute('aria-expanded', 'false'); } })); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePops(null); });
    document.addEventListener('click', e => {
      const t = e.target; if (!t || !t.closest) return;
      if (t.closest('.sg-pop, .sg-panel, #emoji-more-btn, #sticker-btn, #emoji-btn, #topic-btn, #conv-sticker-btn, #conv-emoji-btn')) return;
      ['emoji-pop', 'sticker-pop'].forEach(p => { const pe = document.getElementById(p); if (pe && !pe.hidden) togglePop(document.getElementById(p === 'emoji-pop' ? 'emoji-more-btn' : 'sticker-btn') || pe, pe, false); });
    });
    root.addEventListener('sg-tab', () => closePops(null));
    root.addEventListener('hashchange', () => closePops(null));
    root.addEventListener('sg-conv-change', () => { if (target && target.scene === 'conv') { closePops(null); target = null; } });
    const emojiButton = document.getElementById('emoji-more-btn');
    const emojiPop = document.getElementById('emoji-pop');
    const picker = document.getElementById('emoji-picker');

    if (picker) {
      picker.dataSource = VENDOR + 'emoji-picker-element-data@1.8.0/zh/cldr-native/data.json';
      picker.locale = 'zh';
      import(VENDOR + 'emoji-picker-element@1.29.1/i18n/zh_CN.js')
        .then(module => { picker.i18n = module.default; })
        .catch(() => {});
      picker.addEventListener('emoji-click', event => {
        if (!targetValid(target)) { closePops(null); target = null; return; }   // 目标失效：不插入
        const input = target.input, max = target.scene === 'conv' ? 500 : 300;
        const emoji = event.detail && event.detail.unicode;
        const result = insertEmoji(input.value, input.selectionStart, input.selectionEnd, emoji, max);
        input.value = result.value;
        input.setSelectionRange(result.caret, result.caret);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    if (emojiButton && emojiPop) {
      emojiButton.addEventListener('click', e => { e && e.stopPropagation && e.stopPropagation(); togglePop(emojiButton, emojiPop, undefined, 'lobby'); });
      const convEmoji = document.getElementById('conv-emoji-btn');   // 会话表情：只插入当前会话草稿，不自动发送
      if (convEmoji) convEmoji.addEventListener('click', e => { e && e.stopPropagation && e.stopPropagation(); togglePop(convEmoji, emojiPop, undefined, 'conv'); });
    }

    const stickerButton = document.getElementById('sticker-btn');
    const stickerPop = document.getElementById('sticker-pop');
    const stickerPreview = document.getElementById('sticker-preview');
    function setPreview(sticker) {
      if (!stickerPreview) return;
      stickerPreview.replaceChildren();
      const img = document.createElement('img');
      img.src = sticker.src;
      img.alt = sticker.caption;
      img.width = 64;
      img.height = 64;
      const label = document.createElement('span');
      label.id = 'sticker-preview-label';
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = '关闭';
      close.addEventListener('click', () => stickerPreview.replaceChildren());
      const send = document.createElement('button'); send.type = 'button'; send.id = 'sticker-send'; send.textContent = '发送到当前会话';
      send.hidden = true;   // 由 updateStickerLabel 按场景/能力决定；用户点击才发送
      send.addEventListener('click', () => { if (!targetValid(target) || target.scene !== 'conv') { updateStickerLabel(); return; } root.dispatchEvent(new CustomEvent('sg-sticker-send', { detail: { id: sticker.id, conversation_id: target.convId } })); });
      stickerPreview.append(img, label, send, close);
      updateStickerLabel();
    }
    // 贴纸文案/发送按钮按实际场景与能力：大厅=仅预览（大厅贴纸消息未支持）；会话=能力探测（待接/可发）
    function updateStickerLabel() {
      const label = document.getElementById('sticker-preview-label'), send = document.getElementById('sticker-send');
      const cap = root.StarSocialChat && root.StarSocialChat.capability ? root.StarSocialChat.capability() : 'unknown';
      let txt, canSend = false;
      if (!target || target.scene !== 'conv') txt = '预览 · 大厅暂不支持贴纸消息，仅本机预览';
      else if (!targetValid(target)) txt = '预览 · 会话已变化，未发送';
      else if (cap === 'ready') { txt = '预览 · 点「发送到当前会话」才会发送'; canSend = true; }
      else if (cap === 'undeployed') txt = '预览 · 会话贴纸发送接口待接入，未发送';
      else txt = '预览 · 正在确认发送能力，暂未发送';
      if (label) label.textContent = txt;
      if (send) { send.hidden = !canSend; send.onclick = null; }
    }
    root.addEventListener('sg-chat-capability', updateStickerLabel);
    if (stickerButton && stickerPop) {
      const convSticker = document.getElementById('conv-sticker-btn');
      if (convSticker) convSticker.addEventListener('click', e => { e && e.stopPropagation && e.stopPropagation(); togglePop(convSticker, stickerPop, undefined, 'conv'); });
      stickerButton.addEventListener('click', e => { e && e.stopPropagation && e.stopPropagation(); togglePop(stickerButton, stickerPop, undefined, 'lobby'); });
      fetch('../assets/stickers/pack1/pack1.json', { cache: 'force-cache' })
        .then(r => { if (!r.ok) throw new Error('sticker-load'); return r.json(); })
        .then(json => {
          const grid = document.createElement('div');
          stickerList(json).forEach(sticker => {
            const button = document.createElement('button');
            button.type = 'button';
            const img = document.createElement('img');
            img.src = sticker.src;
            img.alt = sticker.caption;
            img.width = 64;
            img.height = 64;
            img.loading = 'lazy';
            button.appendChild(img);
            button.addEventListener('click', () => setPreview(sticker));
            grid.appendChild(button);
          });
          stickerPop.appendChild(grid);
        })
        .catch(() => {
          const message = document.createElement('p');
          message.textContent = '贴纸包加载失败';
          stickerPop.appendChild(message);
        });
    }
  }

  return {
    VENDOR,
    stickerSafe,
    stickerList,
    insertEmoji,
    nsfwVerdict,
    compressOpts,
    lightboxItems
  };
});
