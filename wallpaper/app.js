(() => {
  "use strict";

  const FAV_KEY = "yuanjing-wallpaper-favs-v1";
  const FAV_KEY_OLD = "xingtang-wallpaper-favs-v1";
  const DL_KEY = "yuanjing-wallpaper-dls-v1";
  const HIS_KEY = "yuanjing-wallpaper-history-v1";
  const THEME_KEY = "yuanjing-wallpaper-theme-v1";
  const WEEK = "日一二三四五六";
  const ASSET_V = "20261110f";
  const HOME_APPS = [
    ["电话", "#34c759", "☎"],
    ["信息", "#30d158", "✉"],
    ["相机", "#8e8e93", "◉"],
    ["相册", "#ffd60a", "▣"],
    ["音乐", "#ff2d55", "♫"],
    ["天气", "#64d2ff", "☼"],
    ["日历", "#ff453a", "历"],
    ["时钟", "#ff9f0a", "◷"],
    ["备忘", "#ffd60a", "✎"],
    ["设置", "#8e8e93", "⚙"],
    ["元境", "#c9a0ff", "✧"],
    ["商店", "#0a84ff", "◇"]
  ];
  const HOME_DOCK = [
    ["电话", "#34c759", "☎"],
    ["信息", "#30d158", "✉"],
    ["浏览", "#0a84ff", "◎"],
    ["相机", "#8e8e93", "◉"]
  ];
  const PACK_ICONS = [
    ["电话", "☎"], ["信息", "✉"], ["相机", "◉"], ["相册", "▣"], ["浏览器", "◎"],
    ["设置", "⚙"], ["音乐", "♫"], ["日历", "历"], ["时钟", "◷"], ["商店", "◇"]
  ];
  const CAT_TAGS = {
    dream: ["风景", "暖色", "城堡", "花灯"],
    xiuxian: ["古风", "仙山", "夜景"],
    flower: ["樱花", "风景", "海滨", "城堡"],
    scroll: ["少女", "星空", "夜景"],
    glam: ["少女", "华裳"],
    stage: ["舞台", "星空", "风景"]
  };
  const COLOR_CHIPS = [
    { id: "pink", name: "粉", color: "#e8a0b4" },
    { id: "orange", name: "暖橙", color: "#e08a4a" },
    { id: "gold", name: "金", color: "#d4b06a" },
    { id: "green", name: "绿", color: "#7aa86a" },
    { id: "cyan", name: "青", color: "#4fc3c8" },
    { id: "blue", name: "蓝", color: "#5a8fd8" },
    { id: "purple", name: "紫", color: "#8b6ad4" },
    { id: "night", name: "夜色", color: "#3a3558" }
  ];
  const HOT_IDS = ["moonlit-castle", "whale-dusk", "crystal-palace", "lava-mountain", "flower-road", "ice-palace", "star-stage", "rose-garden"];
  const PICK_IDS = ["warm-town", "sakura-torii", "aurora-road", "amethyst-realm", "golden-gown", "blue-shore", "thunder-sky", "candy-land"];
  const ALL_TAGS = ["少女", "古风", "夜景", "樱花", "城堡", "星空", "暖色", "粉色", "海滨", "华裳", "风景", "花灯", "仙山", "舞台"];

  const state = {
    data: null,
    view: "home",
    sheet: null,
    cat: null,
    themeId: null,
    mlist: null,
    query: "",
    tag: "",
    color: "",
    favs: new Set(loadJson(FAV_KEY, loadJson(FAV_KEY_OLD, []))),
    downloads: loadJson(DL_KEY, []),
    history: loadJson(HIS_KEY, []),
    themeMode: loadTheme(),
    current: null,
    mode: "lock",
    list: [],
    clockTimer: 0,
    dailyId: null,
    carouselTimer: 0,
    carouselIndex: 0
  };

  const $ = (id) => document.getElementById(id);
  const catName = (id) =>
    ((state.data && state.data.categories.find((c) => c.id === id)) || { name: id }).name;

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  }
  function applyTheme(mode) {
    state.themeMode = mode;
    document.documentElement.dataset.theme = mode;
    const meta = $("meta-theme-color");
    if (meta) meta.setAttribute("content", mode === "light" ? "#f3eee8" : "#16111f");
    localStorage.setItem(THEME_KEY, mode);
    document.querySelectorAll("[data-theme-set]").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.themeSet === mode);
    });
  }
  function saveFavs() {
    localStorage.setItem(FAV_KEY, JSON.stringify([...state.favs]));
  }
  function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
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
  function packOf(id) {
    return state.data.categories.find((c) => c.id === id);
  }
  function inPack(id) {
    return state.data.wallpapers.filter((w) => w.category === id);
  }
  function tagsOf(w) {
    const tags = (CAT_TAGS[w.category] || []).slice();
    const fam = colorFamily(w);
    if (fam === "pink") tags.push("粉色");
    if (fam === "orange" || fam === "gold" || fam === "pink") {
      if (!tags.includes("暖色")) tags.push("暖色");
    }
    return tags;
  }
  function hexToHsl(hex) {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6) return [0, 0, 0.5];
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    let s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue *= 60;
    }
    return [hue, s, l];
  }
  function colorFamily(w) {
    const [h, s, l] = hexToHsl(w.accent);
    if (l < 0.22) return "night";
    if (s < 0.18) return "night";
    if (h < 20 || h >= 340) return "pink";
    if (h < 45) return "orange";
    if (h < 70) return "gold";
    if (h < 160) return "green";
    if (h < 200) return "cyan";
    if (h < 255) return "blue";
    return "purple";
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
  function itemsByIds(ids) {
    return ids.map(byId).filter(Boolean);
  }
  function newestItems(n) {
    const list = state.data.wallpapers;
    return list.slice(-n).reverse();
  }
  function featuredSlides() {
    const daily = dailyItem();
    state.dailyId = daily.id;
    const extras = ["star-castle", "candy-castle", "sunrise-peak", "sakura-torii", "foxfire-gown"]
      .map(byId)
      .filter((w) => w && w.id !== daily.id);
    return [daily, ...extras].slice(0, 5);
  }

  function cardHtml(w, opts) {
    const compact = opts && opts.compact;
    const loved = state.favs.has(w.id);
    const star = opts && opts.star
      ? `<button type="button" class="star ${loved ? "on" : ""}" data-fav="${w.id}" aria-label="${loved ? "取消收藏" : "收藏"}">${loved ? "★" : "☆"}</button>`
      : "";
    const cls = compact ? "hcard" : "card";
    const size = compact ? 'width="112" height="242"' : 'width="180" height="390"';
    return `<article class="${cls}" data-open="${w.id}">
      <img src="${w.thumb}" alt="${w.name}" ${size} loading="lazy" decoding="async">
      <div class="meta">${w.name}</div>
      ${star}
    </article>`;
  }

  function renderCarousel() {
    const slides = featuredSlides();
    const track = $("carousel-track");
    track.innerHTML = slides
      .map((w, i) => `<button type="button" class="slide" data-open="${w.id}">
        <img src="${w.thumb}" alt="${w.name}" width="390" height="180" ${i === 0 ? "" : 'loading="lazy"'} decoding="async">
        <div class="slide-mask">
          <p class="kicker">${w.id === state.dailyId ? "每日一图" : "精选推荐"}</p>
          <h2>${w.name}</h2>
        </div>
      </button>`)
      .join("");
    $("carousel-dots").innerHTML = slides.map((_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("");
    state.carouselIndex = 0;
    startCarousel();
  }
  function startCarousel() {
    const track = $("carousel-track");
    clearInterval(state.carouselTimer);
    state.carouselTimer = setInterval(() => {
      if (state.view !== "home" || state.sheet || document.hidden) return;
      const slides = track.children;
      if (!slides.length) return;
      state.carouselIndex = (state.carouselIndex + 1) % slides.length;
      track.scrollTo({ left: slides[state.carouselIndex].offsetLeft, behavior: "smooth" });
    }, 4200);
    track.onchange = null;
    if (startCarousel._bound) track.removeEventListener("scroll", startCarousel._bound);
    startCarousel._bound = () => {
      const i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      state.carouselIndex = i;
      $("carousel-dots").querySelectorAll("i").forEach((el, idx) => el.classList.toggle("on", idx === i));
    };
    track.addEventListener("scroll", startCarousel._bound, { passive: true });
  }

  function renderHome() {
    renderCarousel();
    $("row-hot").innerHTML = itemsByIds(HOT_IDS).map((w) => cardHtml(w, { compact: true, star: true })).join("");
    $("row-new").innerHTML = newestItems(8).map((w) => cardHtml(w, { compact: true, star: true })).join("");
    $("row-pick").innerHTML = itemsByIds(PICK_IDS).map((w) => cardHtml(w, { compact: true, star: true })).join("");
    $("topics").innerHTML = state.data.categories
      .map((c) => {
        const list = inPack(c.id);
        const cover = list[0];
        if (!cover) return "";
        return `<button type="button" class="topic" data-cat="${c.id}">
          <img src="${cover.thumb}" alt="${c.name}" width="366" height="110" loading="lazy" decoding="async">
          <div class="mask"><h3>${c.name}</h3><p>${list.length} 张壁纸 · ${c.desc}</p></div>
        </button>`;
      })
      .join("");
  }

  function renderCats() {
    $("cat-grid").innerHTML = state.data.categories
      .map((c) => {
        const list = inPack(c.id);
        const cover = list[0];
        if (!cover) return "";
        return `<button type="button" class="cat-card" data-cat="${c.id}">
          <img src="${cover.thumb}" alt="${c.name}" width="180" height="150" loading="lazy" decoding="async">
          <div class="mask"><h3>${c.name}</h3><p>${list.length} 张</p></div>
        </button>`;
      })
      .join("");
  }

  function renderThemes() {
    $("themes").innerHTML = state.data.categories
      .map((c) => {
        const list = inPack(c.id);
        const cover = list[0];
        if (!cover) return "";
        const swatches = (cover.colors || [cover.accent])
          .slice(0, 4)
          .map((col) => `<i style="background:${col}"></i>`)
          .join("");
        const icons = PACK_ICONS.slice(0, 4)
          .map((a, i) => {
            const col = (cover.colors || [cover.accent])[i % (cover.colors || [cover.accent]).length];
            return `<b style="background:${col}">${a[1]}</b>`;
          })
          .join("");
        return `<button type="button" class="theme" data-theme-open="${c.id}">
          <img src="${cover.thumb}" alt="${c.name}" width="86" height="168" loading="lazy" decoding="async">
          <div>
            <h3>${c.name}</h3>
            <p class="tag">${list.length} 张壁纸 · 主题色与图标预览</p>
            <div class="swatches">${swatches}</div>
            <div class="mini-icons">${icons}</div>
          </div>
        </button>`;
      })
      .join("");
  }

  function iconTint(base, i) {
    const palette = [base, "#34c759", "#0a84ff", "#ff9f0a", "#ff2d55", "#64d2ff", "#8e8e93", "#ffd60a", "#af52de", "#30d158"];
    return palette[i % palette.length];
  }

  function renderThemeDetail(id) {
    const pack = packOf(id);
    const list = inPack(id);
    const cover = list[0];
    if (!pack || !cover) return;
    state.themeId = id;
    const swatches = (cover.colors || [cover.accent])
      .slice(0, 4)
      .map((col) => `<i style="background:${col}"></i>`)
      .join("");
    const icons = PACK_ICONS.map((a, i) => {
      const color = i === 0 || i === 9 ? cover.accent : iconTint(cover.accent, i);
      return `<div class="mini-app"><div class="glyph" style="background:${color}">${a[1]}</div><span>${a[0]}</span></div>`;
    }).join("");
    const thumbs = list.map((w) => cardHtml(w, { compact: true })).join("");
    $("theme-detail").innerHTML = `
      <div class="phone" data-open="${cover.id}">
        <img src="${cover.thumb}" alt="${cover.name}" width="210" height="420">
        <div class="ov ov-lock">
          <div class="lock-status"><span>元境</span><span>●●● ☾</span></div>
          <div class="lock-clock">
            <div class="lock-time" id="td-time">12:00</div>
            <div class="lock-date" id="td-date"></div>
          </div>
          <div class="lock-dock">
            <span class="lock-btn lock-flash"></span>
            <span class="lock-btn lock-cam"></span>
          </div>
        </div>
      </div>
      <div class="td-block">
        <h3>主题色</h3>
        <div class="swatches">${swatches}</div>
      </div>
      <div class="td-block">
        <h3>图标预览</h3>
        <div class="icon-gallery">${icons}</div>
      </div>
      <div class="td-block">
        <h3>含 ${list.length} 张壁纸</h3>
        <div class="hrow">${thumbs}</div>
      </div>
      <div class="pack-bar"><button type="button" class="btn primary btn-pack" id="btn-pack" data-pack="${id}">下载主题包</button></div>`;
    tickClock();
  }

  function renderMine() {
    $("mine-stats").innerHTML = `
      <button type="button" class="stat" data-mlist="favs"><b>${state.favs.size}</b><span>收藏</span></button>
      <button type="button" class="stat" data-mlist="downloads"><b>${state.downloads.length}</b><span>下载</span></button>
      <button type="button" class="stat" data-mlist="history"><b>${state.history.length}</b><span>浏览</span></button>`;
    document.querySelectorAll("[data-theme-set]").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.themeSet === state.themeMode);
    });
  }

  function listFromMlist(kind) {
    const ids = kind === "favs"
      ? [...state.favs]
      : (kind === "downloads" ? state.downloads : state.history).map((x) => (typeof x === "string" ? x : x.id));
    const unique = [...new Set(ids)];
    return unique.map(byId).filter(Boolean);
  }

  function renderMlist(kind) {
    state.mlist = kind;
    const list = listFromMlist(kind);
    $("mlist-grid").innerHTML = list.map((w) => cardHtml(w, { star: true })).join("");
    const empty = $("mlist-empty");
    empty.hidden = list.length > 0;
    empty.textContent = kind === "favs"
      ? "还没有收藏。在预览页点收藏，喜欢的壁纸会出现在这里。"
      : kind === "downloads"
        ? "还没有下载记录。"
        : "还没有浏览记录。打开一张壁纸后会记在这里。";
  }

  function renderSearch() {
    const tags = $("tag-chips");
    if (!tags.dataset.ready) {
      tags.innerHTML = `<button type="button" data-tag="" class="on">全部</button>` +
        ALL_TAGS.map((t) => `<button type="button" data-tag="${t}">${t}</button>`).join("");
      $("color-chips").innerHTML = COLOR_CHIPS.map((c) =>
        `<button type="button" data-color="${c.id}" style="--swatch:${c.color}" title="${c.name}" aria-label="${c.name}"></button>`
      ).join("");
      tags.dataset.ready = "1";
    }
    tags.querySelectorAll("[data-tag]").forEach((btn) => btn.classList.toggle("on", (btn.dataset.tag || "") === state.tag));
    $("color-chips").querySelectorAll("[data-color]").forEach((btn) =>
      btn.classList.toggle("on", btn.dataset.color === state.color)
    );
    const list = state.data.wallpapers.filter((w) => {
      if (state.tag && !tagsOf(w).includes(state.tag)) return false;
      if (state.color && colorFamily(w) !== state.color) return false;
      const q = state.query.trim();
      if (!q) return true;
      const blob = `${w.name} ${w.themeName || ""} ${catName(w.category)} ${tagsOf(w).join(" ")}`;
      return blob.toLowerCase().includes(q.toLowerCase());
    });
    $("search-grid").innerHTML = list.map((w) => cardHtml(w, { star: true })).join("");
    $("search-empty").hidden = list.length > 0;
  }

  function setHeader(title, sub, isSub) {
    $("top-title").textContent = title;
    $("top-sub").textContent = sub || "";
    $("top").classList.toggle("subpage", !!isSub);
    $("btn-back").hidden = !isSub;
    $("btn-search").hidden = isSub && state.sheet === "search" ? true : false;
    if (state.sheet === "search") $("btn-search").hidden = true;
  }

  const SHEETS = ["page-cat", "page-theme", "page-mlist", "page-guide", "page-search"];

  function closeSheets() {
    SHEETS.forEach((id) => $(id).classList.remove("on"));
    SHEETS.forEach((id) => $(id).setAttribute("aria-hidden", "true"));
    state.sheet = null;
    document.body.classList.remove("sheet-open");
    if ($("preview").hidden) document.body.style.overflow = "";
    syncHeader();
  }

  function openSheet(name) {
    SHEETS.forEach((id) => {
      const on = id === `page-${name}`;
      $(id).classList.toggle("on", on);
      $(id).setAttribute("aria-hidden", on ? "false" : "true");
    });
    state.sheet = name;
    document.body.classList.add("sheet-open");
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    $(`page-${name}`).scrollTop = 0;
    syncHeader();
  }

  function syncHeader() {
    if (state.sheet === "search") setHeader("搜索", "", true);
    else if (state.sheet === "guide") setHeader("安卓设置教程", "", true);
    else if (state.sheet === "cat" && state.cat) setHeader(catName(state.cat), "", true);
    else if (state.sheet === "theme" && state.themeId) setHeader(catName(state.themeId), "", true);
    else if (state.sheet === "mlist") {
      const title = state.mlist === "favs" ? "我的收藏" : state.mlist === "downloads" ? "下载记录" : "浏览历史";
      setHeader(title, "", true);
    } else {
      setHeader("元境", "二次元 · 元宇宙 · 原创插画", false);
    }
  }

  function setView(view) {
    if (state.sheet) closeSheets();
    if (!$("preview").hidden) closePreview(true);
    state.view = view;
    $("view-home").hidden = view !== "home";
    $("view-cats").hidden = view !== "cats";
    $("view-themes").hidden = view !== "themes";
    $("view-mine").hidden = view !== "mine";
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.view === view);
    });
    if (view === "cats") renderCats();
    if (view === "themes") renderThemes();
    if (view === "mine") renderMine();
    syncHeader();
    window.scrollTo(0, 0);
  }

  function openCat(id) {
    state.cat = id;
    const list = inPack(id);
    $("cat-list").innerHTML = list.map((w) => cardHtml(w, { star: true })).join("");
    $("cat-empty").hidden = list.length > 0;
    openSheet("cat");
  }
  function openTheme(id) {
    renderThemeDetail(id);
    openSheet("theme");
  }
  function openMlist(kind) {
    renderMlist(kind);
    openSheet("mlist");
  }
  function openSearch() {
    if (!$("preview").hidden) closePreview(true);
    openSheet("search");
    renderSearch();
    if (!new URLSearchParams(location.search).get("scene")) {
      setTimeout(() => $("search-input").focus(), 280);
    }
  }
  function openGuide() {
    openSheet("guide");
  }

  function goBack() {
    if (!$("preview").hidden) {
      closePreview();
      return;
    }
    if (state.sheet) closeSheets();
  }

  function toggleFav(id, ev) {
    if (ev) ev.stopPropagation();
    if (state.favs.has(id)) state.favs.delete(id);
    else state.favs.add(id);
    saveFavs();
    if (state.view === "home" && !state.sheet) renderHome();
    if (state.view === "mine") renderMine();
    if (state.sheet === "mlist") renderMlist(state.mlist);
    if (state.sheet === "search") renderSearch();
    if (state.sheet === "cat" && state.cat) {
      $("cat-list").innerHTML = inPack(state.cat).map((w) => cardHtml(w, { star: true })).join("");
    }
    if (state.current && state.current.id === id) syncFavButton();
  }

  function pushHistory(id) {
    state.history = [{ id, t: Date.now() }, ...state.history.filter((x) => (x.id || x) !== id)].slice(0, 100);
    saveList(HIS_KEY, state.history);
  }
  function pushDownload(id) {
    state.downloads = [{ id, t: Date.now() }, ...state.downloads.filter((x) => (x.id || x) !== id)].slice(0, 100);
    saveList(DL_KEY, state.downloads);
    if (state.view === "mine") renderMine();
    syncCounts();
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function tickClock() {
    const now = new Date();
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const date = `${now.getMonth() + 1}月${now.getDate()}日 星期${WEEK[now.getDay()]}`;
    ["lock-time", "home-time", "td-time"].forEach((id) => {
      const el = $(id);
      if (el) el.textContent = time;
    });
    const d1 = $("lock-date");
    const d2 = $("td-date");
    if (d1) d1.textContent = date;
    if (d2) d2.textContent = date;
  }

  function paintHome() {
    const cell = (name, color, glyph) =>
      `<div class="home-app"><div class="glyph" style="background:${color}">${glyph}</div><span>${name}</span></div>`;
    $("home-grid").innerHTML = HOME_APPS.map((a) => cell(...a)).join("");
    $("home-dock").innerHTML = HOME_DOCK.map((a) =>
      `<div class="glyph" style="background:${a[1]}">${a[2]}</div>`
    ).join("");
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
  function syncCounts() {
    const item = state.current;
    if (!item) return;
    const fav = state.favs.has(item.id);
    const dl = state.downloads.some((x) => (x.id || x) === item.id);
    const parts = [];
    if (fav) parts.push("已收藏");
    if (dl) parts.push("已下载到本机");
    $("pv-counts").textContent = parts.length
      ? parts.join(" · ")
      : "点图片可全屏预览，左右滑动可切换。下载后到系统相册里设为壁纸。";
  }
  function similarOf(item) {
    return state.data.wallpapers
      .filter((w) => w.id !== item.id && w.category === item.category)
      .slice(0, 10);
  }
  function currentIndex() {
    if (!state.current) return -1;
    return state.list.findIndex((w) => w.id === state.current.id);
  }


  function enterFull() {
    const pv = $("preview");
    pv.classList.add("full");
    const el = document.documentElement;
    try { if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); } catch (e) {}
    const hint = $("pv-full-hint");
    hint.classList.add("show");
    clearTimeout(state.fullHintTimer);
    state.fullHintTimer = setTimeout(() => hint.classList.remove("show"), 1800);
  }
  function exitFull() {
    $("preview").classList.remove("full");
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) {}
  }

  function openPreview(id, list) {
    const item = byId(id);
    if (!item) return;
    if (list) state.list = list;
    else if (!state.list.length) state.list = state.data.wallpapers.slice();
    state.current = item;
    pushHistory(id);
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
    $("similar-row").innerHTML = similarOf(item).map((w) => cardHtml(w, { compact: true })).join("");
    syncFavButton();
    syncCounts();
    setMode(state.mode || "lock");
    tickClock();
    $("preview").hidden = false;
    document.body.style.overflow = "hidden";
    clearInterval(state.clockTimer);
    state.clockTimer = setInterval(tickClock, 1000);
  }

  function closePreview(silent) {
    exitFull();
    $("preview").hidden = true;
    document.body.style.overflow = "";
    clearInterval(state.clockTimer);
    if (!silent && state.view === "mine") renderMine();
  }

  function stepPreview(dir) {
    const i = currentIndex();
    if (i < 0) return;
    const next = state.list[i + dir];
    if (next) openPreview(next.id, state.list);
  }

  async function downloadItem(item) {
    if (!item) return;
    const filename = `元境-${item.name}.webp`;
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
      pushDownload(item.id);
      toast("已开始下载。请到相册里设为壁纸。苹果手机若没有开始下载，请长按图片保存。");
    } catch (err) {
      toast("下载失败，请长按图片保存到相册。");
    }
  }

  async function shareCurrent() {
    const item = state.current;
    if (!item) return;
    const url = new URL(location.href);
    url.search = `?id=${encodeURIComponent(item.id)}`;
    url.hash = "";
    const payload = { title: `元境 · ${item.name}`, text: "二次元 · 元宇宙 · 原创插画", url: url.href };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url.href);
      toast("链接已复制");
    } catch (err) {
      toast("无法分享，请手动复制地址栏链接。");
    }
  }

  async function downloadPack(id) {
    const list = inPack(id);
    const pack = packOf(id);
    if (!list.length) return;
    toast(`${pack ? pack.name : "主题"}含 ${list.length} 张壁纸。完整图标包稍后提供，先为你下载封面壁纸。`);
    await downloadItem(list[0]);
  }

  function contextList() {
    if (state.sheet === "search") {
      return state.data.wallpapers.filter((w) => {
        if (state.tag && !tagsOf(w).includes(state.tag)) return false;
        if (state.color && colorFamily(w) !== state.color) return false;
        return true;
      });
    }
    if (state.sheet === "cat" && state.cat) return inPack(state.cat);
    if (state.sheet === "theme" && state.themeId) return inPack(state.themeId);
    if (state.sheet === "mlist") return listFromMlist(state.mlist);
    if (state.view === "home") return state.data.wallpapers.slice();
    return state.data.wallpapers.slice();
  }

  function onClick(ev) {
    const favBtn = ev.target.closest("[data-fav]");
    if (favBtn) {
      toggleFav(favBtn.dataset.fav, ev);
      return;
    }
    const openBtn = ev.target.closest("[data-open]");
    if (openBtn) {
      openPreview(openBtn.dataset.open, contextList());
      return;
    }
    const themeBtn = ev.target.closest("[data-theme-open]");
    if (themeBtn) {
      openTheme(themeBtn.dataset.themeOpen);
      return;
    }
    const catBtn = ev.target.closest("[data-cat]");
    if (catBtn) {
      openCat(catBtn.dataset.cat);
      return;
    }
    const mlist = ev.target.closest("[data-mlist]");
    if (mlist) {
      openMlist(mlist.dataset.mlist);
      return;
    }
    const themeSet = ev.target.closest("[data-theme-set]");
    if (themeSet) {
      applyTheme(themeSet.dataset.themeSet);
      return;
    }
    const tagBtn = ev.target.closest("[data-tag]");
    if (tagBtn && $("page-search").classList.contains("on")) {
      state.tag = tagBtn.dataset.tag || "";
      renderSearch();
      return;
    }
    const colorBtn = ev.target.closest("[data-color]");
    if (colorBtn && $("page-search").classList.contains("on")) {
      state.color = state.color === colorBtn.dataset.color ? "" : colorBtn.dataset.color;
      renderSearch();
      return;
    }
    const packBtn = ev.target.closest("[data-pack]");
    if (packBtn) {
      downloadPack(packBtn.dataset.pack);
      return;
    }
    const tab = ev.target.closest("[data-view]");
    if (tab) {
      setView(tab.dataset.view);
      return;
    }
    const mode = ev.target.closest("[data-mode]");
    if (mode) setMode(mode.dataset.mode);
  }

  function bindSwipe() {
    const stage = $("pv-stage");
    let x0 = 0;
    let y0 = 0;
    let tracking = false;
    stage.addEventListener("touchstart", (e) => {
      if (!e.changedTouches[0]) return;
      tracking = true;
      x0 = e.changedTouches[0].clientX;
      y0 = e.changedTouches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (!tracking || !e.changedTouches[0]) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) stepPreview(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  async function init() {
    applyTheme(state.themeMode);
    if (state.favs.size) saveFavs();
    paintHome();
    const res = await fetch(`./data/manifest.json?v=${ASSET_V}`);
    state.data = await res.json();
    renderHome();
    document.body.addEventListener("click", onClick);
    $("btn-back").addEventListener("click", goBack);
    $("btn-close").addEventListener("click", () => closePreview());
    $("btn-full").addEventListener("click", (e) => { e.stopPropagation(); enterFull(); });
    $("pv-stage").addEventListener("click", (e) => {
      if ($("preview").classList.contains("full")) { e.stopPropagation(); exitFull(); return; }
      if (e.target.closest("button")) return;
      enterFull();
    });
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) $("preview").classList.remove("full");
    });

    $("btn-search").addEventListener("click", openSearch);
    $("btn-guide").addEventListener("click", openGuide);
    $("btn-fav").addEventListener("click", () => {
      if (state.current) toggleFav(state.current.id);
    });
    $("btn-dl").addEventListener("click", () => downloadItem(state.current));
    $("btn-share").addEventListener("click", shareCurrent);
    $("btn-set").addEventListener("click", () => {
      openGuide();
      closePreview(true);
      toast("请先下载壁纸，再按教程在系统里设置。");
    });
    $("pv-prev").addEventListener("click", () => stepPreview(-1));
    $("pv-next").addEventListener("click", () => stepPreview(1));
    $("search-input").addEventListener("input", () => {
      state.query = $("search-input").value;
      renderSearch();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") goBack();
      if ($("preview").hidden) return;
      if (e.key === "ArrowLeft") stepPreview(-1);
      if (e.key === "ArrowRight") stepPreview(1);
    });
    bindSwipe();
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
    const id = params.get("id");
    const seed = () => {
      ["warm-town", "whale-dusk", "sunrise-peak", "foxfire-gown", "sakura-torii", "star-castle"].forEach((x) =>
        state.favs.add(x)
      );
      saveFavs();
      state.downloads = [{ id: "warm-town", t: Date.now() }, { id: "sakura-torii", t: Date.now() - 1000 }];
      saveList(DL_KEY, state.downloads);
      state.history = ["whale-dusk", "star-castle", "candy-castle", "ice-palace"].map((x, i) => ({ id: x, t: Date.now() - i }));
      saveList(HIS_KEY, state.history);
    };
    if (!scene) {
      if (id) {
        openPreview(id, state.data.wallpapers.slice());
        const mode = params.get("mode");
        if (mode) setMode(mode);
        await new Promise((r) => setTimeout(r, 300));
      }
      document.documentElement.dataset.ready = "1";
      return;
    }
    if (scene === "home") {
      setView("home");
    } else if (scene === "cats" || scene === "category") {
      setView("cats");
    } else if (scene === "cat") {
      setView("cats");
      openCat(params.get("cat") || "dream");
    } else if (scene === "themes") {
      setView("themes");
    } else if (scene === "theme" || scene === "theme-detail") {
      setView("themes");
      openTheme(params.get("theme") || "dream");
    } else if (scene === "mine" || scene === "me") {
      seed();
      setView("mine");
    } else if (scene === "favs" || scene === "downloads" || scene === "history") {
      seed();
      setView("mine");
      openMlist(scene);
    } else if (scene === "guide") {
      setView("mine");
      openGuide();
    } else if (scene === "search") {
      setView("home");
      if (params.get("tag")) state.tag = params.get("tag");
      if (params.get("color")) state.color = params.get("color");
      openSearch();
      renderSearch();
    } else if (scene === "lock" || scene === "home-prev" || scene === "plain" || scene === "detail") {
      const openId = id || "whale-dusk";
      const mode = params.get("mode") || (scene === "detail" ? "lock" : scene === "home-prev" ? "home" : scene);
      openPreview(openId, state.data.wallpapers.slice());
      setMode(mode === "home-prev" ? "home" : mode);
      await new Promise((r) => setTimeout(r, 400));
    } else if (scene === "light") {
      applyTheme("light");
      seed();
      setView("mine");
    } else if (scene === "topics" || scene === "home-topics") {
      setView("home");
    }
    const themeQ = params.get("theme");
    if (themeQ === "dark" || themeQ === "light") applyTheme(themeQ);
    await waitImages();
    if (scene === "topics" || scene === "home-topics") {
      const el = document.getElementById("topics");
      if (el) el.closest(".row-sec").scrollIntoView();
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 280));
    document.documentElement.dataset.ready = "1";
  }

  init();
})();
