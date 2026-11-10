(() => {
  "use strict";

  const FAV_KEY = "xingtang-wallpaper-favs-v1";
  const WEEK = "日一二三四五六";
  const HOME_APPS = [
    ["电话", "#34c759", "☎"],
    ["信息", "#30d158", "✉"],
    ["相机", "#8e8e93", "◉"],
    ["相册", "#ffd60a", "▣"],
    ["音乐", "#ff2d55", "♫"],
    ["天气", "#64d2ff", "☼"],
    ["日历", "#ff453a", "📅"],
    ["时钟", "#ff9f0a", "◷"],
    ["备忘", "#ffd60a", "✎"],
    ["设置", "#8e8e93", "⚙"],
    ["星糖", "#c9a0ff", "✧"],
    ["商店", "#0a84ff", "bag"]
  ];
  const HOME_DOCK = [
    ["电话", "#34c759", "☎"],
    ["信息", "#30d158", "✉"],
    ["浏览", "#0a84ff", "◎"],
    ["相机", "#8e8e93", "◉"]
  ];

  const state = {
    data: null,
    view: "discover",
    cat: "all",
    favs: new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")),
    current: null,
    mode: "lock",
    clockTimer: 0,
    dailyId: null
  };

  const $ = (id) => document.getElementById(id);
  const catName = (id) =>
    (state.data.categories.find((c) => c.id === id) || { name: id }).name;

  function saveFavs() {
    localStorage.setItem(FAV_KEY, JSON.stringify([...state.favs]));
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 2400);
  }

  function byId(id) {
    return state.data.wallpapers.find((w) => w.id === id);
  }

  function dailyItem() {
    const list = state.data.wallpapers;
    const now = new Date();
    const key = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    let h = key;
    h = ((h << 13) ^ h) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return list[h % list.length];
  }

  function filtered() {
    const all = state.data.wallpapers;
    if (state.cat === "all") return all;
    if (state.cat === "fav") return all.filter((w) => state.favs.has(w.id));
    return all.filter((w) => w.category === state.cat);
  }

  function renderDaily() {
    const item = dailyItem();
    state.dailyId = item.id;
    $("daily").innerHTML = `
      <img src="${item.thumb}" alt="${item.name}" width="390" height="168">
      <div class="daily-mask">
        <p class="kicker">每日一图</p>
        <h2>${item.name}</h2>
        <div class="daily-actions">
          <button type="button" data-open="${item.id}">查看预览</button>
          <button type="button" class="alt" data-fav="${item.id}">${state.favs.has(item.id) ? "已收藏" : "收藏"}</button>
        </div>
      </div>`;
  }

  function renderCats() {
    const cats = [{ id: "all", name: "全部" }, ...state.data.categories, { id: "fav", name: "收藏" }];
    $("cats").innerHTML = cats
      .map(
        (c) =>
          `<button type="button" data-cat="${c.id}" class="${state.cat === c.id ? "on" : ""}">${c.name}</button>`
      )
      .join("");
  }

  function cardHtml(w) {
    const loved = state.favs.has(w.id);
    return `<article class="card" data-open="${w.id}">
      <img src="${w.thumb}" alt="${w.name}" width="180" height="390" loading="lazy" decoding="async">
      <div class="meta">${w.name}</div>
      <button type="button" class="star ${loved ? "on" : ""}" data-fav="${w.id}" aria-label="${loved ? "取消收藏" : "收藏"}">${loved ? "★" : "☆"}</button>
    </article>`;
  }

  function renderGrid() {
    const list = filtered();
    $("grid").innerHTML = list.map(cardHtml).join("");
  }

  function renderThemes() {
    const html = state.data.wallpapers
      .map((w) => {
        const swatches = (w.colors || [w.accent])
          .slice(0, 4)
          .map((c) => `<i style="background:${c}" title="${c}"></i>`)
          .join("");
        return `<article class="theme" data-open="${w.id}">
          <img src="${w.thumb}" alt="${w.themeName || w.name}" width="86" height="168" loading="lazy" decoding="async">
          <div>
            <h3>${w.themeName || w.name}</h3>
            <p class="tag">${catName(w.category)}</p>
            <div class="swatches">${swatches}</div>
            <button type="button" class="go" data-open="${w.id}">预览主题</button>
          </div>
        </article>`;
      })
      .join("");
    $("themes").innerHTML = html;
  }

  function renderFavs() {
    const list = state.data.wallpapers.filter((w) => state.favs.has(w.id));
    $("fav-grid").innerHTML = list.map(cardHtml).join("");
    $("fav-empty").hidden = list.length > 0;
    $("fav-count").textContent = list.length ? `共 ${list.length} 张` : "";
  }

  function setView(view) {
    state.view = view;
    $("view-discover").hidden = view !== "discover";
    $("view-themes").hidden = view !== "themes";
    $("view-favs").hidden = view !== "favs";
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.view === view);
    });
    if (view === "favs") renderFavs();
    if (view === "themes") renderThemes();
    window.scrollTo(0, 0);
  }

  function toggleFav(id, ev) {
    if (ev) ev.stopPropagation();
    if (state.favs.has(id)) state.favs.delete(id);
    else state.favs.add(id);
    saveFavs();
    if (state.view === "discover") {
      renderDaily();
      renderGrid();
    } else if (state.view === "favs") renderFavs();
    else if (state.view === "themes") renderThemes();
    if (state.current && state.current.id === id) syncFavButton();
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tickClock() {
    const now = new Date();
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const date = `${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`;
    const t1 = $("lock-time");
    const t2 = $("lock-date");
    const t3 = $("home-time");
    if (t1) t1.textContent = time;
    if (t2) t2.textContent = date;
    if (t3) t3.textContent = time;
  }

  function paintHome() {
    const cell = (name, color, glyph) =>
      `<div class="home-app"><div class="glyph" style="background:${color}">${glyph === "bag" ? "◇" : glyph}</div><span>${name}</span></div>`;
    $("home-grid").innerHTML = HOME_APPS.map((a) => cell(...a)).join("");
    $("home-dock").innerHTML = HOME_DOCK.map((a) => {
      return `<div class="glyph" style="background:${a[1]}">${a[2]}</div>`;
    }).join("");
  }

  function setMode(mode) {
    state.mode = mode;
    $("ov-lock").hidden = mode !== "lock";
    $("ov-home").hidden = mode !== "home";
    document.querySelectorAll(".mode").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.mode === mode);
    });
  }

  function syncFavButton() {
    const loved = state.current && state.favs.has(state.current.id);
    const btn = $("btn-fav");
    btn.textContent = loved ? "已收藏" : "收藏";
    btn.classList.toggle("loved", !!loved);
  }

  function openPreview(id) {
    const item = byId(id);
    if (!item) return;
    state.current = item;
    const img = $("pv-img");
    img.alt = item.name;
    img.src = item.thumb;
    const full = new Image();
    full.onload = () => {
      if (state.current && state.current.id === item.id) img.src = item.file;
    };
    full.src = item.file;
    $("pv-name").textContent = item.name;
    $("pv-cat").textContent = catName(item.category);
    syncFavButton();
    setMode(state.mode || "lock");
    tickClock();
    $("preview").hidden = false;
    document.body.style.overflow = "hidden";
    clearInterval(state.clockTimer);
    state.clockTimer = setInterval(tickClock, 1000);
  }

  function closePreview() {
    $("preview").hidden = true;
    document.body.style.overflow = "";
    clearInterval(state.clockTimer);
  }

  async function downloadCurrent() {
    const item = state.current;
    if (!item) return;
    const filename = `星糖壁纸-${item.name}.webp`;
    try {
      const res = await fetch(item.file);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast("已开始下载。请到相册里设为壁纸。苹果手机若没有开始下载，请长按图片保存。");
    } catch (err) {
      toast("下载失败，请长按图片保存到相册。");
    }
  }

  function onClick(ev) {
    const favBtn = ev.target.closest("[data-fav]");
    if (favBtn) {
      toggleFav(favBtn.dataset.fav, ev);
      return;
    }
    const openBtn = ev.target.closest("[data-open]");
    if (openBtn) {
      openPreview(openBtn.dataset.open);
      return;
    }
    const catBtn = ev.target.closest("[data-cat]");
    if (catBtn) {
      state.cat = catBtn.dataset.cat;
      renderCats();
      renderGrid();
      return;
    }
    const tab = ev.target.closest("[data-view]");
    if (tab) {
      setView(tab.dataset.view);
      return;
    }
    const mode = ev.target.closest("[data-mode]");
    if (mode) {
      setMode(mode.dataset.mode);
    }
  }

  async function init() {
    paintHome();
    const res = await fetch("./data/manifest.json");
    state.data = await res.json();
    renderDaily();
    renderCats();
    renderGrid();
    document.body.addEventListener("click", onClick);
    $("btn-close").addEventListener("click", closePreview);
    $("btn-fav").addEventListener("click", () => {
      if (state.current) toggleFav(state.current.id);
    });
    $("btn-dl").addEventListener("click", downloadCurrent);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("preview").hidden) closePreview();
    });
    if ("serviceWorker" in navigator && !/scene=/.test(location.search)) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
    await runDemoScene();
  }

  async function waitImages(root) {
    const imgs = [...(root || document).querySelectorAll("img")];
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 4000);
        });
      })
    );
  }

  async function runDemoScene() {
    const params = new URLSearchParams(location.search);
    const scene = params.get("scene");
    if (!scene) {
      document.documentElement.dataset.ready = "1";
      return;
    }
    if (scene === "themes") {
      setView("themes");
    } else if (scene === "favs") {
      ["warm-town", "whale-dusk", "sunrise-peak", "foxfire-gown", "sakura-torii", "star-castle"].forEach((id) =>
        state.favs.add(id)
      );
      saveFavs();
      setView("favs");
    } else if (scene === "lock" || scene === "home" || scene === "plain") {
      const id = params.get("id") || "whale-dusk";
      openPreview(id);
      setMode(scene === "plain" ? "plain" : scene);
      await new Promise((r) => setTimeout(r, 400));
    }
    await waitImages();
    await new Promise((r) => setTimeout(r, 200));
    document.documentElement.dataset.ready = "1";
  }

  init();
})();
