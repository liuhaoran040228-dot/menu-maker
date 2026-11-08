(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SocialMedia = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var UPLOAD_ENABLED = false;
  var MIME_CODES = {
    'image/jpeg': 'INVALID_MIME',
    'image/png': 'INVALID_MIME',
    'image/webp': 'INVALID_MIME'
  };

  function validateFile(file) {
    if (!file) return { ok: false, code: 'NO_FILE' };
    if (!Object.prototype.hasOwnProperty.call(MIME_CODES, file.type)) {
      return { ok: false, code: file.type === 'image/svg+xml' ? 'SVG_REJECTED' :
        file.type === 'image/gif' ? 'GIF_REJECTED' : 'INVALID_MIME' };
    }
    if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, code: 'EMPTY_FILE' };
    if (file.size > 8 * 1024 * 1024) return { ok: false, code: 'FILE_TOO_LARGE' };
    return { ok: true, code: 'OK' };
  }

  function sniffMime(bytes) {
    if (!bytes || bytes.length < 12) return null;
    var b = bytes;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
        b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
    return null;
  }

  function view(bytes, offset) {
    return ((bytes[offset] || 0) << 24) | ((bytes[offset + 1] || 0) << 16) |
      ((bytes[offset + 2] || 0) << 8) | (bytes[offset + 3] || 0);
  }

  function readPngDimensions(bytes) {
    if (bytes.length < 24) return null;
    return { width: view(bytes, 16), height: view(bytes, 20) };
  }

  function readJpegDimensions(bytes) {
    var i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i += 1; continue; }
      var marker = bytes[i + 1];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      var length = (bytes[i + 2] << 8) | bytes[i + 3];
      var sof = marker >= 0xc0 && marker <= 0xc3 ||
        marker >= 0xc5 && marker <= 0xc7 ||
        marker >= 0xc9 && marker <= 0xcb ||
        marker >= 0xcd && marker <= 0xcf;
      if (sof && i + 8 < bytes.length) {
        return { height: (bytes[i + 5] << 8) | bytes[i + 6],
          width: (bytes[i + 7] << 8) | bytes[i + 8] };
      }
      if (length < 2) return null;
      i += 2 + length;
    }
    return null;
  }

  function readWebpDimensions(bytes) {
    var chunk = String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, 12, 16));
    if (chunk === 'VP8 ') {
      if (bytes.length < 30) return null;
      return { width: ((bytes[26] | (bytes[27] << 8)) & 0x3fff),
        height: ((bytes[28] | (bytes[29] << 8)) & 0x3fff) };
    }
    if (chunk === 'VP8L') {
      if (bytes.length < 25) return null;
      var bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
      if (bytes.length < 30) return null;
      return { width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
        height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) };
    }
    return null;
  }

  function readDimensions(bytes) {
    if (!bytes) return null;
    var mime = sniffMime(bytes);
    if (mime === 'image/png') return readPngDimensions(bytes);
    if (mime === 'image/jpeg') return readJpegDimensions(bytes);
    if (mime === 'image/webp') return readWebpDimensions(bytes);
    return null;
  }

  function fitSize(w, h, maxEdge, maxPixels) {
    maxEdge = maxEdge || 2048;
    maxPixels = maxPixels || 16e6;
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return { ok: false, code: 'INVALID_DIMENSIONS' };
    }
    if (w * h > 40e6) return { ok: false, code: 'DECOMPRESSION_BOMB' };
    var scale = Math.min(1, maxEdge / w, maxEdge / h, Math.sqrt(maxPixels / (w * h)));
    return { ok: true, width: Math.max(1, Math.round(w * scale)),
      height: Math.max(1, Math.round(h * scale)), scale: scale };
  }

  function canvasFor(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
    if (typeof document !== 'undefined') {
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    throw new Error('CANVAS_UNAVAILABLE');
  }

  function canvasBlob(canvas, mime, quality) {
    if (canvas.convertToBlob) return canvas.convertToBlob({ type: mime, quality: quality });
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('ENCODING_FAILED'));
      }, mime, quality);
    });
  }

  async function reencode(file) {
    var bitmap;
    var v = validateFile(file);
    if (!v.ok) return v;
    var head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
    if (sniffMime(head) !== file.type) return { ok: false, code: 'MIME_MISMATCH' };
    // 解码前必须能从文件头读出尺寸，读不出即拒绝（防解压炸弹：不把未知尺寸交给解码器）
    var dimensions = readDimensions(head);
    if (!dimensions) return { ok: false, code: 'DIMENSIONS_UNKNOWN' };
    var fit = fitSize(dimensions.width, dimensions.height);
    if (!fit.ok) return { ok: false, code: fit.code };
    try {
      bitmap = await createImageBitmap(file);
    } catch (error) {
      return { ok: false, code: 'DECODE_FAILED' };
    }
    var fitted = fitSize(bitmap.width, bitmap.height);
    if (!fitted.ok) {
      if (bitmap.close) bitmap.close();
      return { ok: false, code: fitted.code };
    }
    var canvas = canvasFor(fitted.width, fitted.height);
    var context = canvas.getContext('2d');
    if (!context) return { ok: false, code: 'CANVAS_UNAVAILABLE' };
    context.drawImage(bitmap, 0, 0, fitted.width, fitted.height);
    if (bitmap.close) bitmap.close();

    var mime = 'image/webp';
    var blob;
    try {
      blob = await canvasBlob(canvas, mime, 0.85);
    } catch (error) {
      mime = 'image/jpeg';
      try {
        blob = await canvasBlob(canvas, mime, 0.85);
      } catch (fallbackError) {
        return { ok: false, code: 'ENCODING_FAILED' };
      }
    }
    if (blob && blob.type && blob.type !== mime) mime = blob.type;   // 不支持 webp 的浏览器会静默回退
    if (!blob || !/^image\/(webp|jpeg|png)$/.test(mime)) return { ok: false, code: 'ENCODING_FAILED' };
    if (!blob || blob.size > 2 * 1024 * 1024) return { ok: false, code: 'FILE_TOO_LARGE' };
    // 客户端去EXIF不是可信净化，服务端必须再验。
    return { ok: true, blob: blob, width: fitted.width, height: fitted.height, mime: mime };
  }

  function PreviewStore(urlApi) {
    this.urls = new Map();
    this.urlApi = urlApi || (typeof URL !== 'undefined' ? URL : null);
  }
  PreviewStore.prototype.create = function (blob) {
    if (!this.urlApi || typeof this.urlApi.createObjectURL !== 'function') {
      throw new Error('URL_API_UNAVAILABLE');
    }
    var url = this.urlApi.createObjectURL(blob);
    this.urls.set(url, blob);
    return url;
  };
  PreviewStore.prototype.revoke = function (url) {
    if (!this.urls.has(url)) return false;
    if (this.urlApi && typeof this.urlApi.revokeObjectURL === 'function') {
      this.urlApi.revokeObjectURL(url);
    }
    this.urls.delete(url);
    return true;
  };
  PreviewStore.prototype.revokeAll = function () {
    var self = this;
    Array.from(this.urls.keys()).forEach(function (url) { self.revoke(url); });
  };
  PreviewStore.prototype.size = function () { return this.urls.size; };

  async function uploadDraft(client, file, context) {
    if (!UPLOAD_ENABLED) return { ok: false, code: 'UPLOAD_DISABLED' };
    if (!client || typeof client.rpc !== 'function') return { ok: false, code: 'UPLOAD_DISABLED' };
    var valid = validateFile(file);
    if (!valid.ok) return valid;
    if (!['feed', 'chat', 'avatar'].includes(context)) return { ok: false, code: 'INVALID_CONTEXT' };

    var detected = sniffMime(new Uint8Array(await file.arrayBuffer()));
    if (!detected || detected !== file.type) return { ok: false, code: 'MIME_MISMATCH' };

    var dimensions = readDimensions(new Uint8Array(await file.arrayBuffer()));
    if (!dimensions) return { ok: false, code: 'INVALID_DIMENSIONS' };
    var fit = fitSize(dimensions.width, dimensions.height);
    if (!fit.ok) return { ok: false, code: fit.code };

    var response;
    try {
      response = await client.rpc('media_begin', {
        p_context: context,
        p_mime: file.type,
        p_bytes: file.size,
        p_width: dimensions.width,
        p_height: dimensions.height
      });
    } catch (error) {
      return { ok: false, code: 'UPLOAD_DISABLED' };
    }
    if (!response || response.error || !response.data || response.data.ok !== true) {
      return { ok: false, code: 'UPLOAD_DISABLED' };
    }
    return response.data;
  }

  return {
    UPLOAD_ENABLED: UPLOAD_ENABLED,
    validateFile: validateFile,
    sniffMime: sniffMime,
    readDimensions: readDimensions,
    fitSize: fitSize,
    reencode: reencode,
    PreviewStore: PreviewStore,
    uploadDraft: uploadDraft
  };
});
