/* 社交页唯一 Supabase 客户端。只含公开 publishable key（与 account.js 相同项目）。
   不加载 account.js / vip.js：本页面只有这一个 createClient，避免同页多客户端争用同一 storageKey。
   storageKey 与存储适配器与 account.js 一致，因此可读取站点已登录会话（跨页共享，同源 localStorage）。 */
(() => {
  'use strict';
  const URL = 'https://tfuxfdvkbpnaazylgtux.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_se9_UP4SyegIDwvEXF8IkQ_dDAZduep';
  const STORAGE_KEY = 'star-account-session-v1';
  // 本地演示：自行重算主机名（不信任任何 window 标志）。demo 下只返回内存 mock；mock 不可用则返回 null，绝不回落真实服务。
  const H = location.hostname, D = new URLSearchParams(location.search).getAll('demo');
  const DEMO = (H === '127.0.0.1' || H === 'localhost') && D.length === 1 && D[0] === '1';
  function make() {
    if (DEMO) { const d = window.StarSocialDemo; return d && d.ok === true && d.client && d.client.__demo === true ? d.client : null; }
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
