// lobby.js - Anime Gacha Lobby System
(function() {
  'use strict';

  // ==================== Configuration ====================
  let config = null;
  let state = {
    selectedChar: null,
    selectedSkin: null,
    equipped: {}, // {slot: itemUid}
    inventory: [], // [{uid, id, slot, icon, rarity, stats, name, new}]
    ownedSkins: [], // [skinId]
    stageProgress: {}, // {stageId: stars}
    currency: {}, // {coinId: amount}
    missions: [], // [{id, progress, target, claimed}]
    dailyClaimDate: null,
    settings: {
      sound: true,
      vibration: true,
      quality: 'high'
    }
  };

  const RARITIES = {
    N: { color: '#9ca3af', glow: 'rgba(156,163,175,0.3)' },
    R: { color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
    SR: { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },
    SSR: { color: '#fbbf24', glow: 'rgba(251,191,36,0.8)' }
  };

  const CUTE_LINES = [
    '今天也要加油哦！', '一起玩吧～', '欸嘿嘿～', 
    '主人好厉害！', '我会保护你的！', '开心开心～'
  ];

  // ==================== Audio System ====================
  const Audio = {
    ctx: null,
    init() {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) {
        console.warn('AudioContext not available');
      }
    },
    play(freq, duration = 80, type = 'sine') {
      if (!state.settings.sound || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.value = freq;
        osc.type = type;
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration/1000);
        osc.start();
        osc.stop(this.ctx.currentTime + duration/1000);
      } catch(e) {}
    },
    tap() { this.play(800, 50); },
    equip() { this.play(1200, 100); this.play(1600, 80); },
    claim() { this.play(880, 120); this.play(1100, 100); this.play(1320, 120); },
    unlock() { this.play(660, 200); this.play(880, 180); }
  };

  function vibrate(ms = 10) {
    if (state.settings.vibration && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  // ==================== Storage ====================
  function saveState() {
    if (!config) return;
    localStorage.setItem('lobby-' + config.id, JSON.stringify(state));
  }

  function loadState() {
    if (!config) return;
    try {
      const saved = localStorage.getItem('lobby-' + config.id);
      if (saved) {
        const loaded = JSON.parse(saved);
        Object.assign(state, loaded);
      }
    } catch(e) {
      console.warn('Failed to load state', e);
    }
  }

  // ==================== Image Preloader ====================
  function preloadImages(urls) {
    return Promise.race([
      Promise.all(urls.map(url => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      }))),
      new Promise(resolve => setTimeout(resolve, 4000))
    ]);
  }

  // ==================== UI Utilities ====================
  function createElement(tag, className, parent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }

  function setScreen(name) {
    root.dataset.lobbyScreen = name;
  }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return n.toString();
  }

  function animateCount(el, from, to, duration = 600) {
    const start = Date.now();
    const diff = to - from;
    function update() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(Math.floor(from + diff * eased));
      if (progress < 1) requestAnimationFrame(update);
    }
    update();
  }

  // ==================== Root Container ====================
  let root;
  function createRoot() {
    root = createElement('div', 'lobby-root');
    root.style.cssText = `
      position: fixed; inset: 0; z-index: 50;
      overflow: hidden; touch-action: none; user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', sans-serif;
      background: #0a0a0f;
    `;
    document.body.appendChild(root);
    injectStyles();
  }

  function injectStyles() {
    const style = createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0%, 100% { opacity: 0.8; transform: translateX(-100%); }
        50% { opacity: 1; transform: translateX(100%); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes breathe {
        0%, 100% { transform: scale(1) translateY(0); }
        50% { transform: scale(1.02) translateY(-5px); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
      }
      @keyframes slideInUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes slideInDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes starReveal {
        0% { transform: scale(0) rotate(-180deg); opacity: 0; }
        60% { transform: scale(1.2) rotate(10deg); opacity: 1; }
        100% { transform: scale(1) rotate(0); opacity: 1; }
      }
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 20px currentColor; }
        50% { box-shadow: 0 0 40px currentColor, 0 0 60px currentColor; }
      }
      @keyframes twirl {
        0% { transform: rotateY(0) scale(1); }
        50% { transform: rotateY(180deg) scale(1.2); }
        100% { transform: rotateY(360deg) scale(1); }
      }

      .lobby-root * { box-sizing: border-box; }
      
      .lobby-panel {
        background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15));
        backdrop-filter: blur(20px);
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      }

      .lobby-btn {
        display: inline-flex; align-items: center; justify-content: center;
        padding: 12px 24px; border-radius: 16px; border: none;
        background: linear-gradient(135deg, #a855f7, #ec4899);
        color: white; font-size: 16px; font-weight: 600;
        cursor: pointer; transition: all 250ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
        min-width: 52px; min-height: 52px;
        box-shadow: 0 4px 20px rgba(168,85,247,0.4);
      }
      .lobby-btn:active { transform: scale(0.95); }
      .lobby-btn.secondary {
        background: linear-gradient(135deg, rgba(100,100,120,0.6), rgba(80,80,100,0.6));
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .lobby-btn.gold {
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        box-shadow: 0 4px 20px rgba(251,191,36,0.5);
      }

      .lobby-icon-btn {
        width: 46px; height: 46px; border-radius: 50%;
        background: rgba(139,92,246,0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 250ms;
        font-size: 22px;
        flex-shrink: 0;
      }
      .lobby-icon-btn:active { transform: scale(0.9); }

      .lobby-card {
        background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1));
        backdrop-filter: blur(10px);
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.05);
        padding: 16px;
        transition: all 300ms;
      }
      .lobby-card:active { transform: scale(0.98); }

      .lobby-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 300ms;
        z-index: 100;
      }

      .lobby-screen {
        position: absolute; inset: 0;
        opacity: 0; pointer-events: none;
        transition: opacity 400ms;
      }
      .lobby-screen.active {
        opacity: 1; pointer-events: auto;
      }

      .lobby-rarity-frame {
        position: relative;
        border-radius: 12px;
        padding: 3px;
        overflow: hidden;
      }
      .lobby-rarity-frame::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 12px;
        padding: 2px;
        background: linear-gradient(45deg, currentColor, transparent, currentColor);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
      }
      .lobby-rarity-frame.ssr::after {
        content: '';
        position: absolute;
        inset: -100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shimmer 2s infinite;
      }

      .lobby-stat-bar {
        height: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      .lobby-stat-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #a855f7, #ec4899);
        border-radius: 4px;
        transition: width 600ms cubic-bezier(0.2, 0.9, 0.3, 1);
      }

      .lobby-badge {
        position: absolute;
        top: -4px; right: -4px;
        width: 12px; height: 12px;
        background: #ef4444;
        border-radius: 50%;
        border: 2px solid #0a0a0f;
        animation: pulse 2s infinite;
        z-index: 1;
      }

      .lobby-speech-bubble {
        position: absolute;
        bottom: 120%;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        color: #0a0a0f;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        white-space: nowrap;
        animation: slideInDown 300ms;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10;
        pointer-events: none;
      }
      .lobby-speech-bubble::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 8px solid transparent;
        border-top-color: white;
      }

      .lobby-currency-hud {
        position: absolute;
        top: max(20px, env(safe-area-inset-top, 20px));
        right: max(20px, env(safe-area-inset-right, 20px));
        display: flex;
        gap: 12px;
        z-index: 10;
      }
      .lobby-currency-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.1);
        font-size: 14px;
        font-weight: 600;
        color: white;
      }

      .lobby-start-btn {
        position: absolute;
        bottom: max(40px, env(safe-area-inset-bottom, 40px));
        right: max(40px, env(safe-area-inset-right, 40px));
        width: 80px; height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        border: none;
        font-size: 36px;
        color: white;
        cursor: pointer;
        box-shadow: 0 8px 30px rgba(251,191,36,0.6);
        animation: pulse 2s infinite;
        z-index: 10;
      }
      .lobby-start-btn:active { transform: scale(0.95); animation: none; }

      .lobby-side-menu {
        position: absolute;
        left: max(20px, env(safe-area-inset-left, 20px));
        top: calc(max(20px, env(safe-area-inset-top, 20px)) + 66px);
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 10;
        max-height: calc(100vh - 160px);
        overflow-y: auto;
      }

      .lobby-character-showcase {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .lobby-character-showcase::before {
        content: '';
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        width: 200px;
        height: 20px;
        background: radial-gradient(ellipse, rgba(0,0,0,0.4), transparent);
        filter: blur(10px);
      }
      .lobby-character-showcase::after {
        content: '';
        position: absolute;
        inset: -30px;
        background: radial-gradient(circle at center, rgba(168,85,247,0.2), transparent 70%);
        pointer-events: none;
        animation: pulse 3s infinite;
      }

      .lobby-close {
        position: absolute !important;
        top: 12px !important;
        left: 12px !important;
        z-index: 10;
      }

      @media (orientation: portrait) {
        .lobby-side-menu {
          flex-direction: row !important;
          top: auto !important;
          bottom: max(20px, env(safe-area-inset-bottom, 20px));
          left: 50% !important;
          transform: translateX(-50%);
          max-height: none;
          max-width: calc(100vw - 40px);
          overflow-x: auto;
        }
        .lobby-character-showcase {
          top: 40%;
        }
      }

      @media (max-width: 844px) {
        .lobby-side-menu {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== Title Screen ====================
  function showTitleScreen(onComplete) {
    setScreen('title');
    clearChildren(root);

    const screen = createElement('div', 'lobby-screen active', root);
    
    const bg = createElement('div', '', screen);
    bg.style.cssText = `
      position: absolute; inset: 0;
      background: url('../assets/keyvisual.webp') center/cover;
      animation: breathe 20s infinite;
      filter: brightness(0.7);
    `;

    const logoContainer = createElement('div', '', screen);
    logoContainer.style.cssText = `
      position: absolute;
      top: 25%;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      animation: slideInDown 800ms cubic-bezier(0.2, 0.9, 0.3, 1);
    `;
    
    const title = createElement('h1', '', logoContainer);
    title.textContent = config.title;
    title.style.cssText = `
      font-size: 48px;
      font-weight: 800;
      margin: 0;
      background: linear-gradient(135deg, #fbbf24, #ec4899, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 4px 20px rgba(251,191,36,0.5));
      position: relative;
    `;

    const shimmer = createElement('div', '', title);
    shimmer.style.cssText = `
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
      animation: shimmer 3s infinite;
    `;

    const loadingContainer = createElement('div', '', screen);
    loadingContainer.style.cssText = `
      position: absolute;
      bottom: 30%;
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
    `;

    const loadingBar = createElement('div', 'lobby-stat-bar', loadingContainer);
    const loadingFill = createElement('div', 'lobby-stat-bar-fill', loadingBar);
    loadingFill.style.width = '0%';

    const loadingText = createElement('div', '', loadingContainer);
    loadingText.textContent = '加载中...';
    loadingText.style.cssText = `
      text-align: center;
      margin-top: 12px;
      color: rgba(255,255,255,0.7);
      font-size: 14px;
    `;

    const imagesToLoad = [
      ...config.bg.map(name => `../assets/${name}.webp`),
      ...config.chars.map(c => `../assets/${c.img}.webp`),
      ...config.chars.map(c => `../assets/${c.chibi}.webp`),
      ...(config.stages || []).map(s => s.bg ? `../assets/${s.bg}.webp` : null).filter(Boolean),
      ...(config.currency || []).map(c => `../assets/${c.icon}.webp`)
    ];

    preloadImages(imagesToLoad).then(() => {
      loadingFill.style.width = '100%';
      loadingText.textContent = '点击开始';
      
      const tapTarget = createElement('div', '', screen);
      tapTarget.id = 'lobby-tap';
      tapTarget.textContent = '轻触屏幕开始';
      tapTarget.style.cssText = `
        position: absolute;
        bottom: 15%;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 20px;
        font-weight: 600;
        cursor: pointer;
        animation: pulse 2s infinite;
        padding: 20px;
      `;

      tapTarget.onclick = () => {
        Audio.tap();
        vibrate();
        screen.classList.remove('active');
        setTimeout(() => onComplete(), 400);
      };
    });
  }

  // ==================== Parallax Scene ====================
  function createParallaxScene(parent) {
    const scene = createElement('div', '', parent);
    scene.style.cssText = `
      position: absolute; inset: 0;
      overflow: hidden;
    `;

    config.bg.forEach((bgName, index) => {
      const layer = createElement('div', '', scene);
      layer.style.cssText = `
        position: absolute;
        inset: ${-20 - index * 10}px;
        background: url('../assets/${bgName}.webp') ${index ? 'bottom/auto 42% repeat-x' : 'center/cover no-repeat'};
        animation: float ${15 + index * 5}s infinite ease-in-out;
        animation-delay: ${index * -2}s;
        opacity: ${index ? 0.85 : 1};
      `;
    });

    const canvas = createElement('canvas', '', scene);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = 'position: absolute; inset: 0; pointer-events: none;';
    
    const ctx = canvas.getContext('2d');
    const sparkles = Array.from({length: 30}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      opacity: Math.random()
    }));

    function animateSparkles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparkles.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > canvas.width) s.vx *= -1;
        if (s.y < 0 || s.y > canvas.height) s.vy *= -1;
        s.opacity = 0.3 + Math.sin(Date.now() * 0.001 + s.x) * 0.3;
        
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animateSparkles);
    }
    animateSparkles();

    return scene;
  }

  // ==================== Character Showcase ====================
  function createCharacterShowcase(parent) {
    const container = createElement('div', 'lobby-character-showcase', parent);
    container.style.cssText += `
      width: 400px;
      height: 600px;
    `;

    function updateCharacter() {
      clearChildren(container);

      const char = config.chars.find(c => c.id === state.selectedChar) || config.chars[0];
      const skin = (config.skins || []).find(s => s.id === state.selectedSkin);

      const charImg = createElement('img', '', container);
      charImg.src = `../assets/${char.img}.webp`;
      charImg.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        filter: ${skin?.filter || 'none'} drop-shadow(0 20px 40px rgba(0,0,0,0.5));
        animation: breathe 4s infinite ease-in-out;
        position: relative;
        z-index: 1;
      `;

      container.onclick = () => {
        Audio.tap();
        vibrate(15);
        
        charImg.style.animation = 'bounce 0.5s';
        setTimeout(() => {
          charImg.style.animation = 'breathe 4s infinite ease-in-out';
        }, 500);

        const bubble = createElement('div', 'lobby-speech-bubble', container);
        bubble.textContent = CUTE_LINES[Math.floor(Math.random() * CUTE_LINES.length)];
        
        setTimeout(() => {
          if (bubble.parentNode) bubble.remove();
        }, 2000);

        if (window.FX && FX.burst) {
          const rect = container.getBoundingClientRect();
          FX.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, {
            count: 20,
            colors: ['#fbbf24', '#ec4899', '#a855f7']
          });
        }
      };
    }

    updateCharacter();
    return { update: updateCharacter };
  }

  // ==================== Currency HUD ====================
  function createCurrencyHUD(parent) {
    const hud = createElement('div', 'lobby-currency-hud', parent);

    function update() {
      clearChildren(hud);
      (config.currency || []).forEach(curr => {
        const item = createElement('div', 'lobby-currency-item', hud);
        
        const icon = createElement('img', '', item);
        icon.src = `../assets/${curr.icon}.webp`;
        icon.style.cssText = 'width: 24px; height: 24px;';
        
        const amount = createElement('span', '', item);
        amount.textContent = formatNumber(state.currency[curr.id] || 0);
        amount.dataset.currencyId = curr.id;
      });
    }

    update();
    return { update };
  }

  // ==================== Side Menu ====================
  function createSideMenu(parent) {
    const menu = createElement('div', 'lobby-side-menu', parent);

    const menuItems = [
      { icon: '👗', name: 'wardrobe', label: '换装' },
      ...(config.slots ? [{ icon: '🎒', name: 'bag', label: '背包' }] : []),
      { icon: '👥', name: 'chars', label: '角色' },
      { icon: '🗺', name: 'stages', label: '关卡' },
      { icon: '📜', name: 'missions', label: '任务' },
      { icon: '🎁', name: 'daily', label: '礼物' },
      { icon: '⚙', name: 'settings', label: '设置' }
    ];

    menuItems.forEach(item => {
      const btn = createElement('div', 'lobby-icon-btn', menu);
      btn.textContent = item.icon;
      btn.title = item.label;
      btn.dataset.open = item.name;
      btn.style.position = 'relative';
      
      if (item.name === 'daily') {
        const today = new Date().toDateString();
        if (state.dailyClaimDate !== today) {
          createElement('div', 'lobby-badge', btn);
        }
      }

      btn.onclick = () => {
        Audio.tap();
        vibrate();
        if (item.name === 'stages') {
          openPanel('stages');
        } else {
          openPanel(item.name);
        }
      };
    });

    return menu;
  }

  // ==================== Mode Toggle ====================
  function createModeToggle(parent) {
    const container = createElement('div', '', parent);
    container.style.cssText = `
      position: absolute;
      bottom: max(140px, env(safe-area-inset-bottom, 140px));
      right: max(40px, env(safe-area-inset-right, 40px));
      display: flex;
      gap: 8px;
    `;

    (config.modes || []).forEach(mode => {
      const chip = createElement('div', 'lobby-card', container);
      chip.style.cssText = `
        padding: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid transparent;
        transition: all 250ms;
        width: 52px;
        height: 52px;
      `;
      
      const icon = createElement('img', '', chip);
      icon.src = `../assets/${mode.icon}.webp`;
      icon.style.cssText = 'width: 32px; height: 32px;';
      
      chip.dataset.mode = mode.id;

      chip.onclick = () => {
        Audio.tap();
        vibrate();
        state.selectedMode = mode.id;
        updateModeSelection();
      };
    });

    function updateModeSelection() {
      container.querySelectorAll('[data-mode]').forEach(chip => {
        if (chip.dataset.mode === state.selectedMode) {
          chip.style.borderColor = '#a855f7';
          chip.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.3))';
          chip.style.boxShadow = '0 0 20px rgba(168,85,247,0.5)';
        } else {
          chip.style.borderColor = 'transparent';
          chip.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))';
          chip.style.boxShadow = 'none';
        }
      });
    }

    state.selectedMode = state.selectedMode || (config.modes && config.modes[0]?.id);
    updateModeSelection();

    return { update: updateModeSelection };
  }

  // ==================== Stage Button ====================
  function createStageButton(parent) {
    const btn = createElement('div', 'lobby-card', parent);
    btn.style.cssText = `
      position: absolute;
      bottom: calc(22px + env(safe-area-inset-bottom, 0px));
      right: calc(150px + env(safe-area-inset-right, 0px));
      padding: 10px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 150px;
    `;
    btn.dataset.open = 'stages';

    function update() {
      clearChildren(btn);
      
      const currentStage = (config.stages || []).find(x => x.id === state.selectedStage) || (config.stages || [])[0];
      if (!currentStage) return;

      const icon = createElement('div', '', btn);
      icon.textContent = '🗺';
      icon.style.cssText = 'font-size: 24px;';

      const text = createElement('div', '', btn);
      text.style.cssText = 'flex: 1;';
      
      const name = createElement('div', '', text);
      name.textContent = currentStage.name || '关卡';
      name.style.cssText = 'font-size: 16px; font-weight: 600; color: white;';

      const stars = createElement('div', '', text);
      const stageStars = state.stageProgress[currentStage.id] || 0;
      stars.textContent = '⭐'.repeat(stageStars) + '☆'.repeat(3 - stageStars);
      stars.style.cssText = 'font-size: 12px; margin-top: 4px; opacity: 0.8;';
    }

    btn.onclick = () => {
      Audio.tap();
      vibrate();
      openPanel('stages');
    };

    update();
    return { update };
  }

  // ==================== Main Lobby ====================
  function showLobby() {
    setScreen('lobby');
    clearChildren(root);

    const screen = createElement('div', 'lobby-screen active', root);

    createParallaxScene(screen);

    const backBtn = createElement('div', 'lobby-icon-btn', screen);
    backBtn.textContent = '🏠';
    backBtn.style.cssText = `
      position: absolute;
      top: max(20px, env(safe-area-inset-top, 20px));
      left: max(20px, env(safe-area-inset-left, 20px));
      z-index: 10;
    `;
    backBtn.onclick = () => {
      window.location.href = '../tools.html';
    };

    const showcase = createCharacterShowcase(screen);
    const currencyHUD = createCurrencyHUD(screen);
    createSideMenu(screen);
    const modeToggle = createModeToggle(screen);
    const stageBtn = createStageButton(screen);

    const startBtn = createElement('button', 'lobby-start-btn', screen);
    startBtn.id = 'lobby-start';
    startBtn.textContent = '▶';
    startBtn.onclick = () => {
      Audio.claim();
      vibrate(20);
      
      const selection = getSelection();
      if (config.onStart) {
        Lobby.hide();
        config.onStart(selection);
      }
    };

    screen._showcase = showcase;
    screen._currencyHUD = currencyHUD;
    screen._stageBtn = stageBtn;
    screen._modeToggle = modeToggle;
  }

  // ==================== Panel System ====================
  function openPanel(name) {
    const overlay = createElement('div', 'lobby-overlay', root);
    
    const panel = createElement('div', 'lobby-panel', overlay);
    panel.style.cssText = `
      max-width: 90vw;
      max-height: 85vh;
      width: ${name === 'wardrobe' || name === 'bag' ? '800px' : '600px'};
      padding: 24px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideInUp 400ms cubic-bezier(0.2, 0.9, 0.3, 1);
      margin-top: 70px;
    `;

    const closeBtn = createElement('button', 'lobby-icon-btn lobby-close', panel);
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => {
      Audio.tap();
      overlay.remove();
    };

    const content = createElement('div', '', panel);
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      margin-top: 40px;
    `;

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        Audio.tap();
        overlay.remove();
      }
    };

    switch(name) {
      case 'wardrobe': renderWardrobePanel(content, overlay, panel); break;
      case 'bag': renderBagPanel(content, panel); break;
      case 'chars': renderCharsPanel(content); break;
      case 'missions': renderMissionsPanel(content); break;
      case 'daily': renderDailyPanel(content); break;
      case 'settings': renderSettingsPanel(content); break;
      case 'stages': renderStagesPanel(content, overlay); break;
    }

    return overlay;
  }

  // ==================== Wardrobe Panel ====================
  function renderWardrobePanel(parent, overlay, panel) {
    const container = createElement('div', '', parent);
    container.style.cssText = 'display: flex; gap: 24px;';

    const preview = createElement('div', '', container);
    preview.style.cssText = `
      flex: 0 0 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;

    const previewImg = createElement('img', '', preview);
    previewImg.style.cssText = `
      max-width: 100%;
      max-height: 500px;
      object-fit: contain;
      animation: breathe 4s infinite;
      transition: filter 300ms;
    `;

    let selectedSkinId = state.selectedSkin;

    function updatePreview(skinId = selectedSkinId) {
      const char = config.chars.find(c => c.id === state.selectedChar) || config.chars[0];
      const skin = (config.skins || []).find(s => s.id === skinId);
      
      previewImg.src = `../assets/${char.img}.webp`;
      previewImg.style.filter = (skin?.filter || 'none') + ' drop-shadow(0 20px 40px rgba(0,0,0,0.5))';
    }

    updatePreview();

    const grid = createElement('div', '', container);
    grid.style.cssText = `
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
      align-content: start;
      max-height: 500px;
      overflow-y: auto;
    `;

    const charSkins = (config.skins || []).filter(s => !s.char || s.char === state.selectedChar);
    
    charSkins.forEach(skin => {
      const isOwned = state.ownedSkins.includes(skin.id);
      const isLocked = skin.vip && !(window.VIP && VIP.active && VIP.active());
      const isNew = skin.new && isOwned;
      const char = config.chars.find(c => c.id === state.selectedChar) || config.chars[0];

      const card = createElement('div', `lobby-rarity-frame ${skin.rarity.toLowerCase()}`, grid);
      card.style.cssText = `
        color: ${RARITIES[skin.rarity].color};
        cursor: pointer;
        position: relative;
        aspect-ratio: 3/4;
        display: flex;
        flex-direction: column;
        opacity: ${isOwned ? 1 : 0.5};
      `;

      const cardInner = createElement('div', 'lobby-card', card);
      cardInner.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 8px;
        margin: 3px;
        overflow: hidden;
      `;

      const chibiImg = createElement('img', '', cardInner);
      chibiImg.src = `../assets/${char.chibi}.webp`;
      chibiImg.style.cssText = `
        width: 64px;
        height: 64px;
        object-fit: contain;
        filter: ${skin.filter || 'none'};
        transition: filter 300ms;
      `;

      const rarityTag = createElement('div', '', cardInner);
      rarityTag.textContent = skin.rarity;
      rarityTag.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 10px;
        font-weight: 600;
        background: ${RARITIES[skin.rarity].color};
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
      `;

      const name = createElement('div', '', cardInner);
      name.textContent = skin.name;
      name.style.cssText = `
        font-size: 12px;
        text-align: center;
        margin-top: 8px;
        color: white;
      `;

      if (isLocked) {
        const lock = createElement('div', '', cardInner);
        lock.textContent = '🔒';
        lock.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 48px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        `;
      }

      if (isNew) {
        createElement('div', 'lobby-badge', card);
      }

      if (state.selectedSkin === skin.id) {
        card.style.boxShadow = `0 0 0 3px ${RARITIES[skin.rarity].color}`;
        const check = createElement('div', '', card);
        check.textContent = '✓';
        check.style.cssText = `
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
        `;
      }

      card.onclick = () => {
        if (isLocked || !isOwned) {
          Audio.tap();
          return;
        }

        Audio.tap();
        vibrate();
        
        selectedSkinId = skin.id;
        updatePreview(skin.id);

        grid.querySelectorAll('.lobby-rarity-frame').forEach(c => {
          c.style.boxShadow = '';
          const existingCheck = c.querySelector('div[style*="10b981"]');
          if (existingCheck) existingCheck.remove();
        });
        card.style.boxShadow = `0 0 0 3px ${RARITIES[skin.rarity].color}`;
      };
    });

    const equipBtn = createElement('button', 'lobby-btn gold', panel);
    equipBtn.textContent = '✔ 装备';
    equipBtn.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 24px;
    `;
    equipBtn.onclick = () => {
      Audio.equip();
      vibrate(15);

      state.selectedSkin = selectedSkinId;
      const skin = (config.skins || []).find(s => s.id === selectedSkinId);
      if (skin && skin.new) {
        skin.new = false;
      }
      saveState();

      previewImg.style.animation = 'twirl 600ms';
      setTimeout(() => {
        previewImg.style.animation = 'breathe 4s infinite';
      }, 600);

      if (window.FX && FX.burst) {
        const rect = preview.getBoundingClientRect();
        FX.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, {
          count: 30,
          colors: [skin ? RARITIES[skin.rarity].color : '#a855f7']
        });
      }

      const lobbyScreen = root.querySelector('[data-lobby-screen="lobby"]');
      if (lobbyScreen && lobbyScreen._showcase) {
        lobbyScreen._showcase.update();
      }

      setTimeout(() => {
        overlay.remove();
      }, 800);
    };
  }

  // ==================== Bag Panel ====================
  function renderBagPanel(parent, panel) {
    const container = createElement('div', '', parent);
    container.style.cssText = 'display: flex; gap: 24px;';

    const preview = createElement('div', '', container);
    preview.style.cssText = `
      flex: 0 0 250px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    `;

    const charImg = createElement('img', '', preview);
    const char = config.chars.find(c => c.id === state.selectedChar) || config.chars[0];
    charImg.src = `../assets/${char.img}.webp`;
    charImg.style.cssText = `
      width: 200px;
      height: 300px;
      object-fit: contain;
      filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));
    `;

    const slotsContainer = createElement('div', '', preview);
    slotsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    `;

    (config.slots || []).forEach(slot => {
      const slotDiv = createElement('div', 'lobby-card', slotsContainer);
      slotDiv.style.cssText = `
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        border: 2px solid rgba(255,255,255,0.1);
      `;

      const equippedUid = state.equipped[slot.id];
      const equippedItem = state.inventory.find(i => i.uid === equippedUid);

      if (equippedItem) {
        const icon = createElement('img', '', slotDiv);
        icon.src = `../assets/${equippedItem.icon}.webp`;
        icon.style.cssText = 'width: 48px; height: 48px;';
        slotDiv.style.borderColor = RARITIES[equippedItem.rarity].color;
      } else {
        const icon = createElement('img', '', slotDiv);
        icon.src = `../assets/${slot.icon}.webp`;
        icon.style.cssText = 'width: 36px; height: 36px; opacity: 0.3;';
      }

      slotDiv.onclick = () => {
        Audio.tap();
        highlightSlotItems(slot.id);
      };
    });

    const statsDiv = createElement('div', '', preview);
    statsDiv.style.cssText = 'width: 100%; display: flex; flex-direction: column; gap: 8px;';

    const stats = Lobby.stats();
    const statIcons = { atk: '⚔', def: '🛡', hp: '❤', spd: '💨' };
    Object.entries(stats).forEach(([stat, value]) => {
      const row = createElement('div', '', statsDiv);
      row.style.cssText = 'display: flex; align-items: center; gap: 8px;';

      const icon = createElement('span', '', row);
      icon.textContent = statIcons[stat] || stat;
      icon.style.fontSize = '18px';

      const val = createElement('span', '', row);
      val.textContent = value;
      val.style.cssText = 'color: white; font-weight: 600;';
    });

    const inventoryContainer = createElement('div', '', container);
    inventoryContainer.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 12px;';

    const toolbar = createElement('div', '', inventoryContainer);
    toolbar.style.cssText = 'display: flex; gap: 8px;';

    const equipBestBtn = createElement('button', 'lobby-btn secondary', toolbar);
    equipBestBtn.innerHTML = '⚡';
    equipBestBtn.title = '一键装备';
    equipBestBtn.style.width = '52px';
    equipBestBtn.style.height = '52px';
    equipBestBtn.style.padding = '0';
    equipBestBtn.style.fontSize = '24px';
    equipBestBtn.onclick = () => {
      Audio.equip();
      vibrate(15);
      equipBestItems();
      clearChildren(parent);
      renderBagPanel(parent, panel);
    };

    const grid = createElement('div', '', inventoryContainer);
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 8px;
      overflow-y: auto;
      max-height: 400px;
    `;

    state.inventory.forEach(item => {
      const card = createElement('div', `lobby-rarity-frame ${item.rarity.toLowerCase()}`, grid);
      card.style.cssText = `
        color: ${RARITIES[item.rarity].color};
        cursor: pointer;
        position: relative;
      `;

      const cardInner = createElement('div', 'lobby-card', card);
      cardInner.style.cssText = `
        padding: 8px;
        margin: 3px;
        display: flex;
        flex-direction: column;
        align-items: center;
        aspect-ratio: 1;
      `;

      const icon = createElement('img', '', cardInner);
      icon.src = `../assets/${item.icon}.webp`;
      icon.style.cssText = 'width: 48px; height: 48px;';

      const rarityTag = createElement('div', '', card);
      rarityTag.textContent = item.rarity;
      rarityTag.style.cssText = `
        position: absolute;
        top: 4px;
        right: 4px;
        font-size: 9px;
        font-weight: 600;
        background: ${RARITIES[item.rarity].color};
        color: white;
        padding: 2px 4px;
        border-radius: 3px;
      `;

      const isEquipped = Object.values(state.equipped).includes(item.uid);
      if (isEquipped) {
        const badge = createElement('div', '', card);
        badge.textContent = 'E';
        badge.style.cssText = `
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #10b981;
          color: white;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
      }

      if (item.new) {
        createElement('div', 'lobby-badge', card);
      }

      card.onclick = () => {
        Audio.tap();
        vibrate();
        showItemDetail(item, parent, panel);
      };
    });

    function highlightSlotItems(slotId) {
      grid.querySelectorAll('.lobby-rarity-frame').forEach((card, i) => {
        const item = state.inventory[i];
        if (item && item.slot === slotId) {
          card.style.transform = 'scale(1.05)';
          card.style.boxShadow = `0 0 20px ${RARITIES[item.rarity].glow}`;
        } else {
          card.style.transform = '';
          card.style.boxShadow = '';
        }
      });
    }
  }

  function showItemDetail(item, parentContainer, parentPanel) {
    const detail = createElement('div', 'lobby-overlay', root);
    
    const panel = createElement('div', 'lobby-panel', detail);
    panel.style.cssText = `
      width: 400px;
      padding: 24px;
      animation: slideInUp 300ms;
    `;

    const header = createElement('div', '', panel);
    header.style.cssText = 'text-align: center; margin-bottom: 24px;';

    const icon = createElement('img', '', header);
    icon.src = `../assets/${item.icon}.webp`;
    icon.style.cssText = 'width: 96px; height: 96px;';

    const name = createElement('div', '', header);
    name.textContent = item.name || item.id;
    name.style.cssText = `
      font-size: 20px;
      font-weight: 600;
      color: ${RARITIES[item.rarity].color};
      margin-top: 12px;
    `;

    const rarity = createElement('div', '', header);
    rarity.textContent = item.rarity;
    rarity.style.cssText = `
      font-size: 14px;
      color: ${RARITIES[item.rarity].color};
      margin-top: 4px;
    `;

    if (item.stats) {
      const statsDiv = createElement('div', '', panel);
      statsDiv.style.cssText = 'margin: 20px 0;';

      const currentEquipped = state.equipped[item.slot];
      const currentItem = state.inventory.find(i => i.uid === currentEquipped);
      const statIcons = { atk: '⚔', def: '🛡', hp: '❤', spd: '💨' };

      Object.entries(item.stats).forEach(([stat, value]) => {
        const row = createElement('div', '', statsDiv);
        row.style.cssText = 'display: flex; justify-content: space-between; margin: 8px 0; align-items: center;';

        const label = createElement('span', '', row);
        label.textContent = statIcons[stat] || stat;
        label.style.cssText = 'color: rgba(255,255,255,0.7); font-size: 18px;';

        const valueSpan = createElement('span', '', row);
        valueSpan.textContent = value;
        valueSpan.style.cssText = 'font-weight: 600; color: white;';

        if (currentItem && currentItem.stats[stat] !== undefined) {
          const diff = value - currentItem.stats[stat];
          if (diff !== 0) {
            const diffSpan = createElement('span', '', row);
            diffSpan.textContent = diff > 0 ? `▲ +${diff}` : `▼ ${diff}`;
            diffSpan.style.cssText = `
              margin-left: 8px;
              font-size: 12px;
              color: ${diff > 0 ? '#10b981' : '#ef4444'};
            `;
          }
        }
      });
    }

    const actions = createElement('div', '', panel);
    actions.style.cssText = 'display: flex; gap: 12px; margin-top: 24px;';

    const isEquipped = Object.values(state.equipped).includes(item.uid);

    if (!isEquipped) {
      const equipBtn = createElement('button', 'lobby-btn gold', actions);
      equipBtn.textContent = '装备';
      equipBtn.style.flex = '1';
      equipBtn.onclick = () => {
        Audio.equip();
        vibrate(15);
        
        state.equipped[item.slot] = item.uid;
        item.new = false;
        saveState();

        if (window.FX && FX.burst) {
          FX.burst(window.innerWidth / 2, window.innerHeight / 2, {
            count: 20,
            colors: [RARITIES[item.rarity].color]
          });
        }

        detail.remove();
        
        clearChildren(parentContainer);
        renderBagPanel(parentContainer, parentPanel);
      };
    }

    const sameItems = state.inventory.filter(i => i.id === item.id && i.rarity === item.rarity);
    if (sameItems.length >= 3 && !isEquipped) {
      const mergeBtn = createElement('button', 'lobby-btn secondary', actions);
      mergeBtn.innerHTML = '✨';
      mergeBtn.title = '合成';
      mergeBtn.style.width = '52px';
      mergeBtn.onclick = () => {
        Audio.equip();
        vibrate(15);

        const rarityOrder = ['N', 'R', 'SR', 'SSR'];
        const currentIndex = rarityOrder.indexOf(item.rarity);
        const nextRarity = currentIndex < rarityOrder.length - 1 ? rarityOrder[currentIndex + 1] : item.rarity;

        sameItems.slice(0, 3).forEach(i => {
          const idx = state.inventory.indexOf(i);
          if (idx > -1) state.inventory.splice(idx, 1);
        });

        const newItem = {
          uid: Math.max(0, ...state.inventory.map(i => i.uid)) + 1,
          id: item.id,
          slot: item.slot,
          icon: item.icon,
          rarity: nextRarity,
          stats: Object.fromEntries(Object.entries(item.stats || {}).map(([k, v]) => [k, Math.floor(v * 1.5)])),
          name: item.name,
          new: true
        };

        state.inventory.push(newItem);
        saveState();

        detail.remove();
        clearChildren(parentContainer);
        renderBagPanel(parentContainer, parentPanel);
      };
    }

    const closeBtn = createElement('button', 'lobby-btn secondary', actions);
    closeBtn.textContent = '关闭';
    closeBtn.style.flex = '1';
    closeBtn.onclick = () => {
      detail.remove();
    };

    detail.onclick = (e) => {
      if (e.target === detail) detail.remove();
    };
  }

  function equipBestItems() {
    (config.slots || []).forEach(slot => {
      const slotItems = state.inventory.filter(i => i.slot === slot.id);
      if (slotItems.length === 0) return;

      slotItems.forEach(item => {
        item._totalStats = Object.values(item.stats || {}).reduce((a, b) => a + b, 0);
      });

      slotItems.sort((a, b) => {
        const rarityOrder = { N: 0, R: 1, SR: 2, SSR: 3 };
        const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
        if (rarityDiff !== 0) return rarityDiff;
        return b._totalStats - a._totalStats;
      });

      state.equipped[slot.id] = slotItems[0].uid;
    });
    saveState();
  }

  // ==================== Characters Panel ====================
  function renderCharsPanel(parent) {
    const container = createElement('div', '', parent);
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 24px;
      align-items: center;
    `;

    const preview = createElement('div', '', container);
    preview.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    `;

    const charImg = createElement('img', '', preview);
    charImg.style.cssText = `
      width: 250px;
      height: 375px;
      object-fit: contain;
      filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5));
    `;

    const charName = createElement('div', '', preview);
    charName.style.cssText = `
      font-size: 24px;
      font-weight: 600;
      color: white;
    `;

    const statsContainer = createElement('div', '', preview);
    statsContainer.style.cssText = `
      width: 100%;
      max-width: 300px;
    `;

    function updatePreview(charId) {
      const char = config.chars.find(c => c.id === charId);
      if (!char) return;

      charImg.src = `../assets/${char.img}.webp`;
      charName.textContent = char.name;

      clearChildren(statsContainer);
      const statLabels = { atk: '攻击力', def: '防御力', hp: '生命值', spd: '速度' };
      
      Object.entries(char.stats || {}).forEach(([stat, value]) => {
        const row = createElement('div', '', statsContainer);
        row.style.cssText = 'margin: 12px 0;';

        const label = createElement('div', '', row);
        label.textContent = statLabels[stat] || stat;
        label.style.cssText = 'color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 4px;';

        const bar = createElement('div', 'lobby-stat-bar', row);
        const fill = createElement('div', 'lobby-stat-bar-fill', bar);
        fill.style.width = `${Math.min(value / 100 * 100, 100)}%`;

        const valueLabel = createElement('div', '', row);
        valueLabel.textContent = value;
        valueLabel.style.cssText = 'text-align: right; color: white; font-size: 14px; margin-top: 4px;';
      });
    }

    const list = createElement('div', '', container);
    list.style.cssText = `
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    `;

    config.chars.forEach(char => {
      const card = createElement('div', 'lobby-card', list);
      card.style.cssText = `
        width: 100px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px;
        border: 2px solid ${state.selectedChar === char.id ? '#a855f7' : 'transparent'};
      `;

      const icon = createElement('img', '', card);
      icon.src = `../assets/${char.chibi}.webp`;
      icon.style.cssText = 'width: 64px; height: 64px;';

      const name = createElement('div', '', card);
      name.textContent = char.name;
      name.style.cssText = 'font-size: 12px; color: white; margin-top: 8px; text-align: center;';

      card.onclick = () => {
        Audio.tap();
        vibrate();
        
        state.selectedChar = char.id;
        state.selectedSkin = null;
        saveState();

        list.querySelectorAll('.lobby-card').forEach(c => {
          c.style.borderColor = 'transparent';
        });
        card.style.borderColor = '#a855f7';

        updatePreview(char.id);

        const lobbyScreen = root.querySelector('[data-lobby-screen="lobby"]');
        if (lobbyScreen && lobbyScreen._showcase) {
          lobbyScreen._showcase.update();
        }
      };
    });

    updatePreview(state.selectedChar || config.chars[0].id);
  }

  // ==================== Missions Panel ====================
  function renderMissionsPanel(parent) {
    const container = createElement('div', '', parent);
    container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    const title = createElement('h2', '', container);
    title.textContent = '每日任务';
    title.style.cssText = 'margin: 0; color: white; font-size: 20px;';

    if (!state.missions || state.missions.length === 0) {
      state.missions = [
        { id: 'play_3', target: 3, progress: 0, reward: { coin: 100 }, claimed: false, name: '游玩3次' },
        { id: 'kill_50', target: 50, progress: 0, reward: { gem: 10 }, claimed: false, name: '击败50个敌人' },
        { id: 'win_1', target: 1, progress: 0, reward: { coin: 200, gem: 5 }, claimed: false, name: '获得胜利' }
      ];
    }

    state.missions.forEach(mission => {
      const card = createElement('div', 'lobby-card', container);
      card.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        opacity: ${mission.claimed ? 0.5 : 1};
      `;

      const info = createElement('div', '', card);
      info.style.cssText = 'flex: 1;';

      const name = createElement('div', '', info);
      name.textContent = mission.name;
      name.style.cssText = 'color: white; font-weight: 600; margin-bottom: 8px;';

      const progressBar = createElement('div', 'lobby-stat-bar', info);
      const fill = createElement('div', 'lobby-stat-bar-fill', progressBar);
      fill.style.width = `${Math.min(mission.progress / mission.target * 100, 100)}%`;

      const progressText = createElement('div', '', info);
      progressText.textContent = `${mission.progress} / ${mission.target}`;
      progressText.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px;';

      const rewardDiv = createElement('div', '', card);
      rewardDiv.style.cssText = 'display: flex; gap: 8px; align-items: center;';

      Object.entries(mission.reward || {}).forEach(([currId, amount]) => {
        const curr = (config.currency || []).find(c => c.id === currId);
        if (curr) {
          const icon = createElement('img', '', rewardDiv);
          icon.src = `../assets/${curr.icon}.webp`;
          icon.style.cssText = 'width: 24px; height: 24px;';

          const amountSpan = createElement('span', '', rewardDiv);
          amountSpan.textContent = '+' + amount;
          amountSpan.style.cssText = 'color: #fbbf24; font-weight: 600;';
        }
      });

      const btn = createElement('button', 'lobby-btn secondary', card);
      btn.style.cssText = 'min-width: 80px;';
      
      if (mission.claimed) {
        btn.textContent = '已领取';
        btn.disabled = true;
        btn.style.opacity = '0.5';
      } else if (mission.progress >= mission.target) {
        btn.textContent = '领取';
        btn.className = 'lobby-btn gold';
        btn.onclick = () => {
          Audio.claim();
          vibrate(15);
          
          Object.entries(mission.reward || {}).forEach(([currId, amount]) => {
            state.currency[currId] = (state.currency[currId] || 0) + amount;
          });
          
          mission.claimed = true;
          saveState();

          const lobbyScreen = root.querySelector('[data-lobby-screen="lobby"]');
          if (lobbyScreen && lobbyScreen._currencyHUD) {
            lobbyScreen._currencyHUD.update();
          }

          clearChildren(parent);
          renderMissionsPanel(parent);
        };
      } else {
        btn.textContent = '进行中';
        btn.disabled = true;
      }
    });
  }

  // ==================== Daily Gift Panel ====================
  function renderDailyPanel(parent) {
    const container = createElement('div', '', parent);
    container.style.cssText = 'display: flex; flex-direction: column; gap: 24px; align-items: center;';

    const title = createElement('h2', '', container);
    title.textContent = '每日礼物';
    title.style.cssText = 'margin: 0; color: white; font-size: 24px;';

    const today = new Date().toDateString();
    const canClaim = state.dailyClaimDate !== today;

    const giftBox = createElement('div', '', container);
    giftBox.style.cssText = `
      font-size: 120px;
      cursor: ${canClaim ? 'pointer' : 'default'};
      transition: transform 300ms;
      filter: ${canClaim ? 'none' : 'grayscale(1) opacity(0.5)'};
    `;
    giftBox.textContent = '🎁';

    if (canClaim) {
      giftBox.style.animation = 'bounce 1s infinite';
      giftBox.onclick = () => {
        Audio.claim();
        vibrate(20);

        state.dailyClaimDate = today;
        
        const rewards = [
          { coin: 500 },
          { gem: 20 },
          { coin: 300, gem: 10 }
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];

        Object.entries(reward).forEach(([currId, amount]) => {
          state.currency[currId] = (state.currency[currId] || 0) + amount;
        });

        saveState();

        const rewardDiv = createElement('div', '', container);
        rewardDiv.style.cssText = `
          font-size: 18px;
          color: #fbbf24;
          font-weight: 600;
          animation: slideInUp 500ms;
        `;
        rewardDiv.textContent = '获得: ' + Object.entries(reward).map(([k, v]) => `${v} ${k}`).join(', ');

        giftBox.style.animation = 'spin 600ms';
        giftBox.style.filter = 'grayscale(1) opacity(0.5)';
        giftBox.onclick = null;

        const lobbyScreen = root.querySelector('[data-lobby-screen="lobby"]');
        if (lobbyScreen && lobbyScreen._currencyHUD) {
          lobbyScreen._currencyHUD.update();
        }

        setTimeout(() => {
          const dailyBtn = root.querySelector('[data-open="daily"]');
          if (dailyBtn) {
            const badge = dailyBtn.querySelector('.lobby-badge');
            if (badge) badge.remove();
          }
        }, 1000);
      };
    }

    const status = createElement('div', '', container);
    status.textContent = canClaim ? '点击领取今日奖励' : '明天再来吧！';
    status.style.cssText = `
      color: ${canClaim ? '#10b981' : 'rgba(255,255,255,0.5)'};
      font-size: 16px;
    `;
  }

  // ==================== Settings Panel ====================
  function renderSettingsPanel(parent) {
    const container = createElement('div', '', parent);
    container.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';

    const title = createElement('h2', '', container);
    title.textContent = '设置';
    title.style.cssText = 'margin: 0; color: white; font-size: 20px;';

    const settings = [
      { key: 'sound', label: '音效', icon: '🔊' },
      { key: 'vibration', label: '震动', icon: '📳' },
      { key: 'quality', label: '画质', icon: '🎨', values: ['low', 'medium', 'high'] }
    ];

    settings.forEach(setting => {
      const row = createElement('div', 'lobby-card', container);
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
      `;

      const label = createElement('div', '', row);
      label.style.cssText = 'display: flex; align-items: center; gap: 12px; font-size: 16px; color: white;';
      
      const icon = createElement('span', '', label);
      icon.textContent = setting.icon;
      icon.style.fontSize = '24px';

      const text = createElement('span', '', label);
      text.textContent = setting.label;

      if (setting.values) {
        const select = createElement('select', '', row);
        select.style.cssText = `
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(139,92,246,0.2);
          color: white;
          font-size: 14px;
          cursor: pointer;
        `;
        
        setting.values.forEach(val => {
          const option = createElement('option', '', select);
          option.value = val;
          option.textContent = { low: '低', medium: '中', high: '高' }[val] || val;
          if (state.settings[setting.key] === val) option.selected = true;
        });

        select.onchange = () => {
          Audio.tap();
          state.settings[setting.key] = select.value;
          saveState();
        };
      } else {
        const toggle = createElement('div', '', row);
        toggle.style.cssText = `
          width: 52px;
          height: 28px;
          border-radius: 14px;
          background: ${state.settings[setting.key] ? '#10b981' : 'rgba(255,255,255,0.2)'};
          position: relative;
          cursor: pointer;
          transition: background 250ms;
        `;

        const knob = createElement('div', '', toggle);
        knob.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          position: absolute;
          top: 2px;
          left: ${state.settings[setting.key] ? '26px' : '2px'};
          transition: left 250ms;
        `;

        toggle.onclick = () => {
          Audio.tap();
          state.settings[setting.key] = !state.settings[setting.key];
          toggle.style.background = state.settings[setting.key] ? '#10b981' : 'rgba(255,255,255,0.2)';
          knob.style.left = state.settings[setting.key] ? '26px' : '2px';
          saveState();
        };
      }
    });
  }

  // ==================== Stage Select ====================
  function renderStagesPanel(parent, overlay) {
    const container = createElement('div', '', parent);
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 70vh;
      overflow-y: auto;
    `;

    (config.stages || []).forEach((stage, index) => {
      const prevStage = config.stages[index - 1];
      const isLocked = index > 0 && (!prevStage || !state.stageProgress[prevStage.id]);

      const card = createElement('div', 'lobby-card', container);
      card.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        cursor: ${isLocked ? 'default' : 'pointer'};
        opacity: ${isLocked ? 0.5 : 1};
        position: relative;
      `;

      const thumb = createElement('div', '', card);
      thumb.style.cssText = `
        width: 120px;
        height: 68px;
        border-radius: 8px;
        background: url('../assets/${stage.bg}.webp') center/cover;
        flex-shrink: 0;
      `;

      const info = createElement('div', '', card);
      info.style.flex = '1';

      const name = createElement('div', '', info);
      name.textContent = stage.name;
      name.style.cssText = 'color: white; font-weight: 600; font-size: 16px; margin-bottom: 8px;';

      const stars = createElement('div', '', info);
      const stageStars = state.stageProgress[stage.id] || 0;
      stars.textContent = '⭐'.repeat(stageStars) + '☆'.repeat(3 - stageStars);
      stars.style.fontSize = '16px';

      if (isLocked) {
        const lock = createElement('div', '', card);
        lock.textContent = '🔒';
        lock.style.cssText = 'position: absolute; right: 24px; font-size: 32px;';
      } else {
        const playBtn = createElement('button', 'lobby-btn gold', card);
        playBtn.textContent = '▶';
        playBtn.style.cssText = 'width: 52px; height: 52px; padding: 0; border-radius: 50%;';
        
        playBtn.onclick = (e) => {
          e.stopPropagation();
          Audio.claim();
          vibrate(20);
          
          state.selectedStage = stage.id;
          saveState();

          overlay.remove();

          const selection = getSelection();
          if (config.onStart) {
            Lobby.hide();
            config.onStart(selection);
          }
        };
      }

      if (!isLocked) {
        card.onclick = () => {
          Audio.tap();
          vibrate();
        };
      }
    });
  }

  // ==================== Results Screen ====================
  function showResultsScreen(result) {
    setScreen('result');
    
    const overlay = createElement('div', 'lobby-overlay', root);
    
    const panel = createElement('div', 'lobby-panel', overlay);
    panel.style.cssText = `
      width: 500px;
      max-width: 90vw;
      padding: 32px;
      text-align: center;
      animation: slideInUp 600ms cubic-bezier(0.2, 0.9, 0.3, 1);
    `;

    const title = createElement('h1', '', panel);
    const _lose = result && (result.win === false || (result.win === undefined && !result.stars));
    title.textContent = (result && result.title) || (_lose ? '挑战失败…再来一次！' : '关卡完成！');
    if (_lose) panel.classList.add('lobby-lose');
    title.style.cssText = `
      margin: 0 0 24px 0;
      font-size: 32px;
      background: linear-gradient(135deg, #fbbf24, #ec4899);
      ${_lose ? 'filter: hue-rotate(-40deg) saturate(.8);' : ''}
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    `;

    const starsDiv = createElement('div', '', panel);
    starsDiv.style.cssText = 'font-size: 48px; margin: 24px 0;';
    
    for (let i = 0; i < 3; i++) {
      const star = createElement('span', '', starsDiv);
      star.textContent = i < result.stars ? '⭐' : '☆';
      star.style.cssText = `
        display: inline-block;
        animation: starReveal 600ms ${i * 200}ms both;
      `;
    }

    if (result.coins || result.gems) {
      const rewardsDiv = createElement('div', '', panel);
      rewardsDiv.style.cssText = 'margin: 32px 0; display: flex; gap: 24px; justify-content: center;';

      if (result.coins) {
        const coinDiv = createElement('div', '', rewardsDiv);
        const coinIcon = createElement('img', '', coinDiv);
        coinIcon.src = '../assets/item-chest.webp';
        coinIcon.style.cssText = 'width: 48px; height: 48px;';
        
        const coinAmount = createElement('div', '', coinDiv);
        coinAmount.style.cssText = 'font-size: 24px; font-weight: 600; color: #fbbf24; margin-top: 8px;';
        animateCount(coinAmount, 0, result.coins);
      }

      if (result.gems) {
        const gemDiv = createElement('div', '', rewardsDiv);
        const gemIcon = createElement('img', '', gemDiv);
        gemIcon.src = '../assets/item-star.webp';
        gemIcon.style.cssText = 'width: 48px; height: 48px;';
        
        const gemAmount = createElement('div', '', gemDiv);
        gemAmount.style.cssText = 'font-size: 24px; font-weight: 600; color: #a855f7; margin-top: 8px;';
        animateCount(gemAmount, 0, result.gems);
      }
    }

    const actions = createElement('div', '', panel);
    actions.style.cssText = 'display: flex; gap: 16px; margin-top: 32px;';

    const retryBtn = createElement('button', 'lobby-btn secondary', actions);
    retryBtn.textContent = '↻ 重试';
    retryBtn.style.flex = '1';
    retryBtn.onclick = () => {
      Audio.tap();
      vibrate();
      overlay.remove();
      
      const selection = getSelection();
      if (config.onStart) {
        config.onStart(selection);
      }
    };

    const lobbyBtn = createElement('button', 'lobby-btn gold', actions);
    lobbyBtn.textContent = '🏠 大厅';
    lobbyBtn.style.flex = '1';
    lobbyBtn.onclick = () => {
      Audio.tap();
      vibrate();
      overlay.remove();
      Lobby.show();
    };

    setTimeout(() => {
      Audio.claim();
    }, 800);
  }

  // ==================== Pause Menu ====================
  function showPauseMenu() {
    setScreen('pause');
    
    try {
      if (window.FX) {
        FX.paused = true;
      }
    } catch(e) {}

    const overlay = createElement('div', 'lobby-overlay', root);
    
    const panel = createElement('div', 'lobby-panel', overlay);
    panel.style.cssText = `
      width: 400px;
      max-width: 90vw;
      padding: 32px;
      animation: slideInUp 300ms;
    `;

    const title = createElement('h2', '', panel);
    title.textContent = '暂停';
    title.style.cssText = 'margin: 0 0 24px 0; color: white; font-size: 24px; text-align: center;';

    const buttons = [
      { icon: '▶', text: '继续', action: 'resume' },
      { icon: '👗', text: '快速换装', action: 'wardrobe' },
      { icon: '⚙', text: '设置', action: 'settings' },
      { icon: '🏠', text: '返回大厅', action: 'lobby' }
    ];

    buttons.forEach(btn => {
      const button = createElement('button', 'lobby-btn secondary', panel);
      button.textContent = `${btn.icon} ${btn.text}`;
      button.style.cssText = 'width: 100%; margin: 12px 0;';
      
      button.onclick = () => {
        Audio.tap();
        vibrate();

        switch(btn.action) {
          case 'resume':
            try {
              if (window.FX) FX.paused = false;
            } catch(e) {}
            overlay.remove();
            break;

          case 'wardrobe':
            const wardrobePanel = openPanel('wardrobe');
            wardrobePanel.querySelector('.lobby-close').onclick = () => {
              Audio.tap();
              wardrobePanel.remove();
              
              if (config.onSkinChange) {
                config.onSkinChange(getSelection());
              }
            };
            break;

          case 'settings':
            openPanel('settings');
            break;

          case 'lobby':
            if (config.onQuit) {
              config.onQuit();
            }
            overlay.remove();
            Lobby.show();
            break;
        }
      };
    });

    return overlay;
  }

  // ==================== Helper Functions ====================
  function getSelection() {
    const char = config.chars.find(c => c.id === state.selectedChar) || config.chars[0];
    const skin = (config.skins || []).find(s => s.id === state.selectedSkin);
    
    const equip = {};
    Object.entries(state.equipped).forEach(([slot, uid]) => {
      equip[slot] = state.inventory.find(i => i.uid === uid);
    });

    const stats = { ...char.stats };
    Object.values(equip).forEach(item => {
      if (item && item.stats) {
        Object.entries(item.stats).forEach(([stat, value]) => {
          stats[stat] = (stats[stat] || 0) + value;
        });
      }
    });

    return {
      mode: state.selectedMode || ((config.modes || [])[0] || {}).id || 'story',
      stage: Math.max(0, (config.stages || []).findIndex(x => x.id === state.selectedStage)),
      stageId: state.selectedStage,
      char: char.id,
      skin: Object.assign({ id: '', name: '', filter: 'none', rarity: 'N' }, skin || {}),
      skinId: skin ? skin.id : '',
      equip,
      stats
    };
  }

  function initializeInventory() {
    if (state.inventory.length > 0) return;
    if (!config.slots || config.slots.length === 0) return;

    const rarities = ['N', 'R', 'SR'];
    let uid = 1;

    config.slots.forEach(slot => {
      for (let i = 0; i < 2; i++) {
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];
        const stats = {
          atk: Math.floor(Math.random() * 20) + 10,
          def: Math.floor(Math.random() * 15) + 5,
          hp: Math.floor(Math.random() * 50) + 20,
          spd: Math.floor(Math.random() * 10) + 5
        };

        state.inventory.push({
          uid: uid++,
          id: `${slot.id}_${rarity.toLowerCase()}_${i}`,
          slot: slot.id,
          icon: slot.icon,
          rarity,
          stats,
          name: `${slot.id} ${rarity}`,
          new: true
        });
      }
    });

    saveState();
  }

  function initializeOwnedSkins() {
    const defaultSkins = (config.skins || []).filter(s => s.rarity === 'N' || s.rarity === 'R');
    state.ownedSkins = [...new Set([...state.ownedSkins, ...defaultSkins.map(s => s.id)])];
    saveState();
  }

  // ==================== Public API ====================
  const Lobby = {
    init(cfg) {
      config = cfg;
      const RR = ['N','R','SR','SSR'];
      const ART = {'space-shooter':'bg-space','moe-runner':'bg-rail','monster-loot':'bg-forest','fighter':'bg-arena'};
      const fromPath = location.pathname.split('/').filter(Boolean).slice(-1)[0];
      let bgs = (Array.isArray(config.bg) ? config.bg : [config.bg]).map(b => typeof b === 'string' ? b : (b && (b.img || b.bg))).filter(Boolean);
      const art = ART[config.id] || ART[fromPath] || 'bg-space';
      bgs = bgs.filter(b => !b.startsWith('bg-'));
      config.bg = [art, ...bgs.slice(0, 1)];
      const MI = ['item-star','item-ice','item-weapon','item-shield'];
      config.modes = (config.modes && config.modes.length ? config.modes : [{id:'story'},{id:'endless'}]).map((m, i) => Object.assign({}, m, { icon: (typeof m.icon === 'string' && !m.icon.includes(' ')) ? m.icon : MI[i % 4] }));
      config.stages = (config.stages || []).map((st, i) => Object.assign({}, st, { id: st.id ?? ('s' + i), bg: typeof st.bg === 'string' ? st.bg : (st.bg && st.bg.img) || art }));
      config.chars = (config.chars || []).map((c, i) => Object.assign({ id: 'c' + i, name: '', stats: {} }, c, { img: c.img || ((c.id || 'lan') + '-portrait'), chibi: c.chibi || ((c.id || 'lan') + '-chibi') }));
      config.skins = (config.skins || []).map((k, i) => {
        const r = String(k.rarity || RR[i % 4]).toUpperCase();
        return Object.assign({}, k, { id: k.id || ('skin' + i), name: k.name || '', rarity: RR.includes(r) ? r : 'N', filter: k.filter || 'none', char: k.char || null });
      });

      if (!state.selectedChar) {
        state.selectedChar = config.chars[0].id;
      }

      (config.currency || []).forEach(curr => {
        if (state.currency[curr.id] === undefined) {
          state.currency[curr.id] = 0;
        }
      });

      loadState();

      Audio.init();
      initializeInventory();
      initializeOwnedSkins();

      if (!root) {
        createRoot();
      }

      showTitleScreen(() => {
        showLobby();
      });
    },

    show() {
      if (!root) return;
      root.style.display = 'block';
      showLobby();
    },

    hide() {
      if (!root) return;
      root.style.display = 'none';
    },

    addCurrency(id, amount) {
      state.currency[id] = (state.currency[id] || 0) + amount;
      saveState();

      const currencyHUD = root.querySelector('.lobby-currency-hud');
      if (currencyHUD) {
        const span = currencyHUD.querySelector(`[data-currency-id="${id}"]`);
        if (span) {
          animateCount(span, state.currency[id] - amount, state.currency[id]);
        }
      }
    },

    addItem(itemDef) {
      const uid = Math.max(0, ...state.inventory.map(i => i.uid)) + 1;
      state.inventory.push({ ...itemDef, uid, new: true });
      saveState();
    },

    reportResult(result) {
      result = Object.assign({}, result);
      if (typeof result.stage === 'number') { 
        const st = (config.stages || [])[result.stage]; 
        result.stage = st ? st.id : String(result.stage); 
      }
      
      if (result.stage) {
        const currentStars = state.stageProgress[result.stage] || 0;
        state.stageProgress[result.stage] = Math.max(currentStars, result.stars || 0);
      }

      if (result.coins) {
        state.currency.coin = (state.currency.coin || 0) + result.coins;
      }
      if (result.gems) {
        state.currency.gem = (state.currency.gem || 0) + result.gems;
      }

      if (result.missionsProgress) {
        state.missions.forEach(mission => {
          Object.entries(result.missionsProgress).forEach(([key, value]) => {
            if (mission.id.includes(key)) {
              mission.progress = Math.min((mission.progress || 0) + value, mission.target);
            }
          });
        });
      }

      saveState();

      Lobby.show();
      showResultsScreen(result);
    },

    pauseMenu() {
      return showPauseMenu();
    },

    selection() {
      return getSelection();
    },

    stats() {
      return getSelection().stats;
    }
  };

  window.Lobby = Lobby;
})();
