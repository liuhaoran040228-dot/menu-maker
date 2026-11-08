/* 社交页唯一 Supabase 客户端。只含公开 publishable key（与 account.js 相同项目）。
   不加载 account.js / vip.js：本页面只有这一个 createClient，避免同页多客户端争用同一 storageKey。
   storageKey 与存储适配器与 account.js 一致，因此可读取站点已登录会话（跨页共享，同源 localStorage）。 */
(() => {
  'use strict';
  const URL = 'https://tfuxfdvkbpnaazylgtux.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_se9_UP4SyegIDwvEXF8IkQ_dDAZduep';
  const STORAGE_KEY = 'star-account-session-v1';
  function make() {
    if (window.__starSocialClient) return window.__starSocialClient;
    if (!window.supabase?.createClient) return null;
    const memory = new Map();
    const storage = {
      getItem(k) { try { return localStorage.getItem(k) || memory.get(k) || null; } catch { return memory.get(k) || null; } },
      setItem(k, v) { memory.set(k, v); try { localStorage.setItem(k, v); } catch {} },
      removeItem(k) { memory.delete(k); try { localStorage.removeItem(k); } catch {} }
    };
    window.__starSocialClient = window.supabase.createClient(URL, PUBLIC_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage, storageKey: STORAGE_KEY }
    });
    return window.__starSocialClient;
  }
  window.StarSocialClient = { get: make };
})();
