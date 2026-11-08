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
    SSR: { color: '#fbbf24', glow: 'rgba(251,191,36,0.8)' },
    UR: { color: '#ff4fd8', glow: 'rgba(255,79,216,0.9)' }
  };

  const CUTE_LINES = [
    '今天也要加油哦！', '一起玩吧～', '欸嘿嘿～', 
    '主人好厉害！', '我会保护你的！', '开心开心～'
  ];

  // ==================== Audio System ====================
  const Audio = {
    ctx: null,
    init() {
      if (window.GameAudio) return; // Adopted games use the shared Howler engine.
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) {
        console.warn('AudioContext not available');
      }
    },
    play(freq, duration = 80, type = 'sine') {
      if (window.GameAudio) {
        if (state.settings.sound) GameAudio.sfx(freq >= 1100 ? 'levelup' : 'button');
        return;
      }
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
      position: fixed; inset: 0; z-index: 9000;
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
      backdrop-filter: blur(14px);
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    .lobby-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 24px; border-radius: 16px; border: none;
      background: linear-gradient(135deg, #a855f7, #ec4899);
      color: white; font-size: clamp(14px, 3vw, 16px); font-weight: 600;
      cursor: pointer; transition: all 250ms cubic-bezier(0.2, 0.9, 0.3, 1.2);
      min-width: 52px; min-height: 44px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;
      box-shadow: 0 4px 20px rgba(168,85,247,0.4);
    }
    .lobby-btn:active { transform: scale(0.94); }
    .lobby-btn.secondary {
      background: linear-gradient(135deg, rgba(100,100,120,0.6), rgba(80,80,100,0.6));
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .lobby-btn.gold {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      box-shadow: 0 4px 20px rgba(251,191,36,0.5);
    }

    .lobby-icon-btn {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(139,92,246,0.2);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 250ms;
      font-size: 24px;
      flex-shrink: 0;
    }
    .lobby-icon-btn:active { transform: scale(0.94); }

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
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 300ms;
      z-index: 100;
      overscroll-behavior: contain;
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
    .lobby-rarity-frame.ur { box-shadow: 0 0 18px #ff4fd8, 0 0 34px #7af3ff; animation: urGlow 2.4s linear infinite; }
    .lobby-rarity-frame.ur::before { background: conic-gradient(from 0deg, #ff4fd8, #ffd76a, #7af3ff, #b38cff, #ff4fd8) !important; }
    @keyframes urGlow { 0%,100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(40deg) brightness(1.15); } }
    .lobby-rarity-frame.ur::after, .lobby-rarity-frame.ssr::after {
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

    .lobby-top-bar {
      position: absolute;
      top: env(safe-area-inset-top, 0);
      left: env(safe-area-inset-left, 0);
      right: env(safe-area-inset-right, 0);
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 max(12px, env(safe-area-inset-left, 12px)) 0 max(12px, env(safe-area-inset-right, 12px));
      background: linear-gradient(180deg, rgba(0,0,0,0.4), transparent);
      backdrop-filter: blur(8px);
      z-index: 20;
    }

    .lobby-player-info {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 0 1 auto;
    }

    .lobby-player-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      object-fit: cover;
      flex-shrink: 0;
    }

    .lobby-player-name {
      font-size: 14px;
      font-weight: 600;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
    }

    .lobby-player-level {
      font-size: 11px;
      padding: 2px 6px;
      background: linear-gradient(135deg, #a855f7, #ec4899);
      border-radius: 8px;
      color: white;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .lobby-currency-hud {
      display: flex;
      gap: 6px;
      align-items: center;
      flex: 0 1 auto;
      min-width: 0;
      max-width: 50%;
    }

    .lobby-currency-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      font-size: clamp(11px, 2.5vw, 13px);
      font-weight: 600;
      color: white;
      white-space: nowrap;
      min-width: 0;
    }

    .lobby-currency-item img {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .lobby-currency-item span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lobby-currency-add {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      font-size: 12px;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 200ms;
    }
    .lobby-currency-add:active { transform: scale(0.9); }

    .lobby-side-column {
      position: absolute;
      top: calc(env(safe-area-inset-top, 0) + 60px);
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 15;
    }

    .lobby-side-column.left {
      left: max(12px, env(safe-area-inset-left, 12px));
    }

    .lobby-side-column.right {
      right: max(12px, env(safe-area-inset-right, 12px));
    }

    .lobby-side-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      position: relative;
    }

    .lobby-side-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(139,92,246,0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      transition: all 250ms;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .lobby-side-item:active .lobby-side-icon { transform: scale(0.94); }

    .lobby-side-label {
      font-size: 10px;
      color: white;
      font-weight: 600;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      white-space: nowrap;
    }

    .lobby-character-showcase {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 5;
    }
    .lobby-character-showcase::before {
      content: '';
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      width: 250px;
      height: 30px;
      background: radial-gradient(ellipse, rgba(0,0,0,0.5), transparent);
      filter: blur(15px);
    }
    .lobby-character-showcase::after {
      content: '';
      position: absolute;
      inset: -40px;
      background: radial-gradient(circle at center, rgba(168,85,247,0.2), transparent 70%);
      pointer-events: none;
      animation: pulse 3s infinite;
    }

    .lobby-char-nameplate {
      margin-top: 16px;
      padding: 8px 20px;
      background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3));
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.2);
      font-size: 16px;
      font-weight: 600;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    .lobby-bottom-bar {
      position: absolute;
      bottom: env(safe-area-inset-bottom, 0);
      left: env(safe-area-inset-left, 0);
      right: env(safe-area-inset-right, 0);
      height: 64px;
      background: linear-gradient(180deg, transparent, rgba(0,0,0,0.6));
      backdrop-filter: blur(14px);
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 max(12px, env(safe-area-inset-left, 12px)) 0 max(12px, env(safe-area-inset-right, 12px));
      z-index: 20;
    }

    .lobby-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 4px 8px;
      min-width: 48px;
      transition: all 200ms;
    }
    .lobby-nav-item:active { transform: scale(0.94); }

    .lobby-nav-icon {
      font-size: 22px;
      transition: transform 200ms;
    }
    .lobby-nav-item.active .lobby-nav-icon {
      transform: scale(1.2);
    }

    .lobby-nav-label {
      font-size: 10px;
      color: rgba(255,255,255,0.7);
      font-weight: 600;
    }
    .lobby-nav-item.active .lobby-nav-label {
      color: #a855f7;
    }

    .lobby-start-btn {
      position: absolute;
      bottom: calc(env(safe-area-inset-bottom, 0) + 76px);
      right: max(20px, env(safe-area-inset-right, 20px));
      min-width: 140px;
      height: 60px;
      padding: 0 24px;
      border-radius: 30px;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      border: none;
      font-size: 18px;
      font-weight: 700;
      color: white;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(251,191,36,0.6);
      animation: pulse 2s infinite;
      z-index: 18;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .lobby-start-btn:active { transform: scale(0.94); animation: none; }

    .lobby-start-text {
      font-size: 18px;
      font-weight: 700;
    }

    .lobby-start-stage {
      font-size: 11px;
      opacity: 0.9;
      font-weight: 500;
    }

    .lobby-mode-toggle {
      position: absolute;
      bottom: calc(env(safe-area-inset-bottom, 0) + 148px);
      right: max(20px, env(safe-area-inset-right, 20px));
      display: flex;
      gap: 8px;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      padding: 4px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      z-index: 17;
    }

    .lobby-mode-chip {
      padding: 8px 16px;
      border-radius: 16px;
      background: transparent;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 250ms;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: rgba(255,255,255,0.7);
      font-weight: 600;
      white-space: nowrap;
    }
    .lobby-mode-chip.active {
      background: linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.3));
      border-color: #a855f7;
      color: white;
      box-shadow: 0 0 20px rgba(168,85,247,0.5);
    }
    .lobby-mode-chip:active { transform: scale(0.94); }

    .lobby-close {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 100;
    }

    .lobby-panel-header {
      position: sticky;
      top: 0;
      background: linear-gradient(180deg, rgba(10,10,15,0.95), rgba(10,10,15,0.8));
      backdrop-filter: blur(10px);
      padding: 16px 48px 12px 16px;
      margin: -24px -24px 16px -24px;
      border-radius: 22px 22px 0 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      z-index: 10;
    }

    .lobby-panel-title {
      font-size: 22px;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .lobby-panel-tabs {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .lobby-tab {
      padding: 8px 16px;
      border-radius: 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.6);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 250ms;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .lobby-tab.active {
      background: linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.3));
      border-color: #a855f7;
      color: white;
    }
    .lobby-tab:active { transform: scale(0.94); }

    .lobby-panel-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      padding: 0 0 24px 0;
    }

    @media (orientation: portrait) {
      .lobby-side-column {
        flex-direction: row !important;
        top: auto !important;
        bottom: calc(env(safe-area-inset-bottom, 0) + 76px);
        left: 50% !important;
        right: auto !important;
        transform: translateX(-50%);
        max-width: calc(100vw - 160px);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      .lobby-character-showcase {
        top: 40%;
      }

      .lobby-start-btn {
        bottom: calc(env(safe-area-inset-bottom, 0) + 76px);
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        min-width: 70%;
        max-width: calc(100vw - 40px);
      }

      .lobby-mode-toggle {
        bottom: calc(env(safe-area-inset-bottom, 0) + 148px);
        left: 50%;
        right: auto;
        transform: translateX(-50%);
      }
    }

    @media (max-width: 440px) {
      .lobby-currency-item {
        font-size: 11px;
        padding: 3px 6px;
      }
      .lobby-currency-item img {
        width: 16px;
        height: 16px;
      }
      .lobby-player-name {
        max-width: 60px;
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
      const skin = (config.skins || []).find(s => s.id === state.selectedSkin && (!s.char || s.char === char.id));

      const charImg = createElement('img', '', container);
      const HERO = ['lan','mo','li','xing','hu'].includes(char.id) && !(skin && skin.img) ? char.id + '-hero' : null;
      charImg.className = 'lobby-hero-img';
      charImg.src = `../assets/${HERO || (skin && skin.img) || char.img}.webp`;
      if (HERO) charImg.onerror = () => { charImg.onerror = null; charImg.src = `../assets/${char.img}.webp`; };
      charImg.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        filter: ${skin?.filter || 'none'} var(--hero-rim, drop-shadow(0 0 0 transparent)) drop-shadow(0 14px 18px rgba(0,0,0,0.35));
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
    const currencies = (config.currency || []).slice(0, 3);
    currencies.forEach(curr => {
      const item = createElement('div', 'lobby-currency-item', hud);
      
      const icon = createElement('img', '', item);
      icon.src = `../assets/${curr.icon}.webp`;
      
      const amount = createElement('span', '', item);
      amount.textContent = formatNumber(state.currency[curr.id] || 0);
      amount.dataset.currencyId = curr.id;
      
      const add = createElement('div', 'lobby-currency-add', item);
      add.textContent = '+';
      add.onclick = (e) => {
        e.stopPropagation();
        Audio.tap();
        vibrate();
        openPanel('shop');
      };
    });
  }

  update();
  return { update };
}

  // ==================== Side Menu ====================
function createSideMenu(parent) {
  // Deprecated - now using side columns in showLobby
  return null;
}

  // ==================== Mode Toggle ====================
function createModeToggle(parent) {
  const container = createElement('div', 'lobby-mode-toggle', parent);

  (config.modes || []).forEach(mode => {
    const chip = createElement('div', 'lobby-mode-chip', container);
    chip.dataset.mode = mode.id;
    
    const icon = createElement('img', '', chip);
    icon.src = `../assets/${mode.icon}.webp`;
    icon.style.cssText = 'width: 20px; height: 20px;';
    
    const label = createElement('span', '', chip);
    label.textContent = mode.name || mode.id;
    
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
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  state.selectedMode = state.selectedMode || (config.modes && config.modes[0]?.id);
  updateModeSelection();

  return { update: updateModeSelection };
}

  // ==================== Stage Button ====================
function createStageButton(parent) {
  const btn = createElement('button', 'lobby-start-btn', parent);
  btn.id = 'lobby-start';

  function update() {
    clearChildren(btn);
    
    const currentStage = (config.stages || []).find(x => x.id === state.selectedStage) || (config.stages || [])[0];
    
    const text = createElement('div', 'lobby-start-text', btn);
    text.textContent = '开始';
    
    if (currentStage) {
      const stage = createElement('div', 'lobby-start-stage', btn);
      stage.textContent = currentStage.name || '关卡';
    }
  }

  btn.onclick = () => {
    Audio.claim();
    vibrate(20);
    
    const selection = getSelection();
    if (config.onStart) {
      Lobby.hide();
      (newRoundKey(), config.onStart(selection));
    }
  };

  update();
  return { update };
}

  // ==================== Main Lobby ====================
function showLobby() {
  setScreen('lobby');
  clearChildren(root);
  document.documentElement.classList.add('fx-in-lobby');

  const screen = createElement('div', 'lobby-screen active', root);

  createParallaxScene(screen);

  // Top bar
  const topBar = createElement('div', 'lobby-top-bar', screen);
  
  const playerInfo = createElement('div', 'lobby-player-info', topBar);
  
  const avatar = createElement('img', 'lobby-player-avatar', playerInfo);
  const char = config.chars.find(c => c.id === state.selectedChar) || config.chars[0];
  avatar.src = `../assets/${char.chibi}.webp`;
  
  const name = createElement('div', 'lobby-player-name', playerInfo);
  name.textContent = char.name || '旅行者';
  
  const level = createElement('div', 'lobby-player-level', playerInfo);
  level.textContent = 'Lv.1';

  const currencyHUD = createCurrencyHUD(topBar);

  const settingsBtn = createElement('div', 'lobby-icon-btn', topBar);
  settingsBtn.textContent = '⚙';
  settingsBtn.style.flexShrink = '0';
  settingsBtn.onclick = () => {
    Audio.tap();
    vibrate();
    openPanel('settings');
  };

  // Left side column
  const leftColumn = createElement('div', 'lobby-side-column left', screen);
  [
    { icon: '📜', label: '任务', name: 'missions', badge: state.missions?.some(m => m.progress >= m.target && !m.claimed) },
    { icon: '🎁', label: '签到', name: 'daily', badge: state.dailyClaimDate !== new Date().toDateString() },
    { icon: '👥', label: '角色', name: 'chars' },
    { icon: '🗺', label: '关卡', name: 'stages' }
  ].forEach(item => {
    const sideItem = createElement('div', 'lobby-side-item', leftColumn);
    sideItem.dataset.open = item.name;
    
    const icon = createElement('div', 'lobby-side-icon', sideItem);
    icon.textContent = item.icon;
    if (item.badge) createElement('div', 'lobby-badge', icon);
    
    const label = createElement('div', 'lobby-side-label', sideItem);
    label.textContent = item.label;
    
    sideItem.onclick = () => {
      Audio.tap();
      vibrate();
      openPanel(item.name);
    };
  });

  // Right side column
  const rightColumn = createElement('div', 'lobby-side-column right', screen);
  [
    { icon: '👑', label: 'VIP', name: 'vip' },
    { icon: '🛒', label: '商店', name: 'shop' },
    { icon: '🎒', label: '背包', name: 'bag', hide: !config.slots },
    { icon: '👗', label: '衣橱', name: 'wardrobe' }
  ].filter(i => !i.hide).forEach(item => {
    const sideItem = createElement('div', 'lobby-side-item', rightColumn);
    sideItem.dataset.open = item.name;
    
    const icon = createElement('div', 'lobby-side-icon', sideItem);
    icon.textContent = item.icon;
    
    const label = createElement('div', 'lobby-side-label', sideItem);
    label.textContent = item.label;
    
    sideItem.onclick = () => {
      Audio.tap();
      vibrate();
      openPanel(item.name);
    };
  });

  // Character showcase
  const showcase = createCharacterShowcase(screen);

  // Mode toggle
  if (config.modes && config.modes.length > 1) {
    createModeToggle(screen);
  }

  // Start button
  createStageButton(screen);

  // Bottom nav bar
  const bottomBar = createElement('div', 'lobby-bottom-bar', screen);
  [
    { icon: '🏠', label: '大厅', name: 'lobby' },
    { icon: '👥', label: '角色', name: 'chars' },
    { icon: '👗', label: '衣橱', name: 'wardrobe' },
    { icon: '🎒', label: '背包', name: 'bag', hide: !config.slots },
    { icon: '🛒', label: '商店', name: 'shop' }
  ].filter(i => !i.hide).forEach((item, idx) => {
    const navItem = createElement('div', 'lobby-nav-item', bottomBar);
    if (idx === 0) navItem.classList.add('active');
    
    const icon = createElement('div', 'lobby-nav-icon', navItem);
    icon.textContent = item.icon;
    
    const label = createElement('div', 'lobby-nav-label', navItem);
    label.textContent = item.label;
    
    navItem.onclick = () => {
      Audio.tap();
      vibrate();
      
      bottomBar.querySelectorAll('.lobby-nav-item').forEach(n => n.classList.remove('active'));
      navItem.classList.add('active');
      
      if (item.name !== 'lobby') {
        openPanel(item.name);
      }
    };
  });

  try { setupImmersion(screen, showcase); } catch (e) {}
  screen._showcase = showcase;
  screen._currencyHUD = currencyHUD;
}


  // ==================== Scene immersion (lobbyhero) ====================
  const SCENE_TONE = {
    'bg-arena':  {sun:'left', rim:'#ffb37a', grade:'rgba(255,140,90,.16)', shaft:'rgba(255,214,150,.22)', fg:'prop-coral', bub:true,  wave:true},
    'bg-undersea':{rim:'#8fe9ff', grade:'rgba(60,170,255,.14)', shaft:'rgba(180,240,255,.22)', fg:'prop-coral', bub:true, wave:false},
    'bg-space':  {rim:'#b9a4ff', grade:'rgba(90,80,220,.14)',  shaft:'rgba(190,170,255,.16)', fg:'prop-crystal', bub:false, wave:false},
    'bg-rail':   {rim:'#ffc6e8', grade:'rgba(220,120,220,.12)', shaft:'rgba(255,220,240,.2)', fg:'prop-sakura', bub:false, wave:false},
    'lobbybg-story':  {sun:'right', rim:'#ffe3a8', grade:'rgba(90,80,200,.14)', shaft:'rgba(255,236,190,.16)', fg:'prop-lantern', bub:false, wave:false},
    'lobbybg-snake':  {sun:'right', rim:'#fff0c8', grade:'rgba(255,190,140,.10)', shaft:'rgba(255,250,220,.2)', fg:'prop-coral', bub:true, wave:false},
    'lobbybg-td':     {sun:'left',  rim:'#fff4c0', grade:'rgba(120,200,120,.10)', shaft:'rgba(255,250,210,.22)', fg:'prop-flowers', bub:false, wave:false},
    'lobbybg-survivor':{sun:'left', rim:'#c8a8ff', grade:'rgba(90,50,180,.18)', shaft:'rgba(200,170,255,.14)', fg:'prop-crystal', bub:false, wave:false},
    'lobbybg-lili-merge':{sun:'right', rim:'#ffd0e4', grade:'rgba(255,150,200,.10)', shaft:'rgba(255,235,245,.2)', fg:'prop-flowers', bub:true, wave:false},
    'lobbybg-lili-match':{sun:'left', rim:'#ffcf8a', grade:'rgba(200,120,50,.12)', shaft:'rgba(255,220,150,.24)', fg:'prop-pine', bub:false, wave:false},
    'lobbybg-lili-2048':{sun:'right', rim:'#ffc878', grade:'rgba(255,150,70,.13)', shaft:'rgba(255,215,150,.22)', fg:'prop-lantern', bub:false, wave:false},
    'lobbybg-lili-fortune':{sun:'left', rim:'#ffc08a', grade:'rgba(150,80,170,.14)', shaft:'rgba(255,200,170,.18)', fg:'prop-flowers', bub:false, wave:false},
    'bg-forest': {rim:'#c9a6ff', grade:'rgba(60,40,140,.16)',  shaft:'rgba(200,255,220,.16)', fg:'prop-flowers', bub:false, wave:false}
  };
  function setupImmersion(screen, showcase) {
    const bg = (config.bg && config.bg[0]) || 'bg-space';
    const T = SCENE_TONE[bg] || SCENE_TONE['bg-space'];
    screen.classList.add('lobby-immersive');
    showcase = screen.querySelector('.lobby-character-showcase'); if (!showcase) return;
        const fx = createElement('div', 'lobby-amb', screen);
    fx.innerHTML = `<div class="lobby-grade" style="background:linear-gradient(180deg,transparent 30%,${T.grade})"></div>`
      + [0,1,2].map(i => `<div class="lobby-shaft" style="left:${12 + i*22}%;animation-delay:${-i*2.3}s;background:linear-gradient(180deg,${T.shaft},transparent 80%)"></div>`).join('')
      + (T.wave ? '<div class="lobby-wave w1"></div><div class="lobby-wave w2"></div>' : '');
    // contact shadow + AO under hero feet
    createElement('div', 'lobby-contact', showcase);
    // scene-light tint & sun-side rim, masked to the sprite silhouette
    const sunL = (T.sun || 'left') === 'left';
    const syncTint = () => {
      const im = showcase.querySelector('img.lobby-hero-img'); if (!im) return;
      let t = showcase.querySelector('.lobby-hero-tint');
      if (!t) { t = createElement('div', 'lobby-hero-tint', showcase); }
      const u = `url("${im.src}")`;
      t.style.cssText = `-webkit-mask-image:${u};mask-image:${u};background:linear-gradient(${sunL ? '100deg' : '260deg'},${T.rim}cc 0%,${T.rim}33 28%,transparent 55%),linear-gradient(180deg,transparent 55%,${T.grade.replace(/[\d.]+\)$/, '.55)')})`;
      t.style.animation = getComputedStyle(im).animation;
    };
    new MutationObserver(syncTint).observe(showcase, {childList: true, subtree: true, attributes: true, attributeFilter: ['src']});
    syncTint();
    screen.style.setProperty('--hero-rim', `drop-shadow(${sunL ? -2 : 2}px -1px 2px ${T.rim}bb) drop-shadow(0 0 6px ${T.rim}44)`);
    // foreground props on the sides only, never over the hero
    const fg = createElement('div', 'lobby-fg', screen);
    fg.innerHTML = `<img src="../assets/${T.fg}.webp" class="l" alt=""><img src="../assets/${T.fg}.webp" class="r" alt="">`;
    fg.querySelectorAll('img').forEach(im => im.onerror = () => im.remove());
    // bubbles / sparkles in front of the scene but light and sparse
    const cv = createElement('canvas', 'lobby-fgp', screen);
    const ctx = cv.getContext('2d'); let W, H;
    const fit = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; fit(); addEventListener('resize', fit);
    const P = Array.from({length: 26}, () => ({x: Math.random(), y: Math.random(), r: 1 + Math.random() * (T.bub ? 4 : 2), v: .0006 + Math.random() * .0012, ph: Math.random() * 6}));
    (function loop(t) {
      if (!cv.isConnected) return;
      ctx.clearRect(0, 0, W, H);
      P.forEach(p => {
        p.y -= p.v; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        const x = (p.x + Math.sin(t * .001 + p.ph) * .01) * W, y = p.y * H, a = .35 + .3 * Math.sin(t * .003 + p.ph);
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283);
        if (T.bub) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = `rgba(255,255,255,${a*.25})`; ctx.fill(); }
        else { ctx.fillStyle = `rgba(255,250,220,${a})`; ctx.fill(); }
      });
      requestAnimationFrame(loop);
    })(0);
    // gentle parallax with pointer / tilt
    const layers = screen.querySelectorAll(':scope > div:first-child > div');
    const move = (nx, ny) => {
      layers.forEach((l, i) => l.style.translate = `${nx * (6 + i*8)}px ${ny * (4 + i*5)}px`);
      fg.style.translate = `${nx * 22}px ${ny * 8}px`;
      showcase.style.translate = `${nx * 10}px 0`;
    };
    screen.addEventListener('pointermove', e => move(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5));
    addEventListener('deviceorientation', e => { if (e.gamma != null) move(Math.max(-1, Math.min(1, e.gamma / 30)) * .5, Math.max(-1, Math.min(1, (e.beta - 40) / 30)) * .3); });
  }

  // ==================== Panel System ====================
function openPanel(name) {
  const overlay = createElement('div', 'lobby-overlay', root);
  
  const panel = createElement('div', 'lobby-panel', overlay);
  panel.style.cssText = `
    max-width: min(90vw, 800px);
    max-height: min(90vh, calc(100dvh - 40px));
    width: ${['wardrobe', 'bag', 'shop'].includes(name) ? '800px' : '600px'};
    padding: 24px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideInUp 400ms cubic-bezier(0.2, 0.9, 0.3, 1);
  `;

  const closeBtn = createElement('button', 'lobby-icon-btn lobby-close', panel);
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => {
    Audio.tap();
    overlay.remove();
  };

  const header = createElement('div', 'lobby-panel-header', panel);
  const title = createElement('h2', 'lobby-panel-title', header);
  const titleMap = {
    wardrobe: '衣橱', bag: '背包', chars: '角色', missions: '任务',
    daily: '签到', settings: '设置', stages: '关卡', shop: '商店', vip: 'VIP'
  };
  title.textContent = titleMap[name] || name;

  const content = createElement('div', 'lobby-panel-content', panel);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      Audio.tap();
      overlay.remove();
    }
  };

  switch(name) {
    case 'wardrobe': renderWardrobePanel(content, overlay, panel, header); break;
    case 'bag': renderBagPanel(content, panel, header); break;
    case 'chars': renderCharsPanel(content, header); break;
    case 'missions': renderMissionsPanel(content, header); break;
    case 'daily': renderDailyPanel(content, header); break;
    case 'settings': renderSettingsPanel(content, header); break;
    case 'stages': renderStagesPanel(content, overlay, header); break;
    case 'shop': renderShopPanel(content, header); break;
    case 'vip': renderVipPanel(content, header); break;
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
      
      previewImg.src = `../assets/${(skin && skin.img) || char.img}.webp`;
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

    const tabs = createElement('div', 'lobby-style-tabs', grid);
    tabs.style.cssText = 'grid-column: 1 / -1; display: flex; gap: 8px; flex-wrap: wrap;';
    const styleF = renderWardrobePanel._style || 'all';
    [['all','🌈'],['cute','🎀'],['glam','✨'],['elegant','👑'],['cool','🕶']].forEach(([k, ic]) => {
      const b = createElement('button', 'lobby-icon-btn', tabs);
      b.textContent = ic; b.dataset.style = k;
      b.style.cssText = `width:48px;height:48px;font-size:22px;border-radius:50%;${k === styleF ? 'box-shadow:0 0 0 3px #fbbf24,0 0 16px #fbbf24;' : 'opacity:.75;'}`;
      b.onclick = (e) => { e.stopPropagation(); Audio.tap(); renderWardrobePanel._style = k; clearChildren(parent); renderWardrobePanel(parent, overlay, panel); };
    });
    const charSkins = (config.skins || []).filter(s => (!s.char || s.char === state.selectedChar) && (styleF === 'all' || s.style === styleF));
    
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
      chibiImg.src = `../assets/${skin.img || char.chibi}.webp`;
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
function renderMissionsPanel(parent, header) {
  const tabs = createElement('div', 'lobby-panel-tabs', header);
  ['每日', '成就'].forEach((t, i) => {
    const tab = createElement('div', 'lobby-tab', tabs);
    tab.textContent = t;
    if (i === 0) tab.classList.add('active');
    tab.onclick = () => {
      Audio.tap();
      tabs.querySelectorAll('.lobby-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      clearChildren(parent);
      i === 0 ? renderDailyMissions(parent) : renderAchievements(parent);
    };
  });

  renderDailyMissions(parent);
}

function renderDailyMissions(parent) {
  const container = createElement('div', '', parent);
  container.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

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
      display: flex; align-items: center; gap: 12px; padding: 12px;
      opacity: ${mission.claimed ? 0.5 : 1};
    `;

    const info = createElement('div', '', card);
    info.style.cssText = 'flex: 1; min-width: 0;';

    const name = createElement('div', '', info);
    name.textContent = mission.name;
    name.style.cssText = 'color: white; font-weight: 600; margin-bottom: 6px; font-size: 14px;';

    const progressBar = createElement('div', 'lobby-stat-bar', info);
    const fill = createElement('div', 'lobby-stat-bar-fill', progressBar);
    fill.style.width = `${Math.min(mission.progress / mission.target * 100, 100)}%`;

    const progressText = createElement('div', '', info);
    progressText.textContent = `${mission.progress} / ${mission.target}`;
    progressText.style.cssText = 'font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 4px;';

    const rewardDiv = createElement('div', '', card);
    rewardDiv.style.cssText = 'display: flex; gap: 6px; align-items: center; flex-shrink: 0;';

    Object.entries(mission.reward || {}).forEach(([currId, amount]) => {
      const curr = (config.currency || []).find(c => c.id === currId);
      if (curr) {
        const icon = createElement('img', '', rewardDiv);
        icon.src = `../assets/${curr.icon}.webp`;
        icon.style.cssText = 'width: 20px; height: 20px;';

        const amountSpan = createElement('span', '', rewardDiv);
        amountSpan.textContent = '+' + amount;
        amountSpan.style.cssText = 'color: #fbbf24; font-weight: 600; font-size: 12px;';
      }
    });

    const btn = createElement('button', 'lobby-btn secondary', card);
    btn.style.cssText = 'min-width: 64px; min-height: 36px; padding: 6px 12px; font-size: 13px;';
    
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
        renderDailyMissions(parent);
      };
    } else {
      btn.textContent = '进行中';
      btn.disabled = true;
    }
  });
}

function renderAchievements(parent) {
  const text = createElement('div', '', parent);
  text.textContent = '成就系统开发中...';
  text.style.cssText = 'text-align: center; color: rgba(255,255,255,0.5); padding: 40px 0;';
}

  // ==================== Daily Gift Panel ====================
function renderDailyPanel(parent, header) {
  const container = createElement('div', '', parent);
  container.style.cssText = 'display: flex; flex-direction: column; gap: 24px; align-items: center; padding: 24px 0;';

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
        font-size: 18px; color: #fbbf24; font-weight: 600;
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
    font-size: 16px; font-weight: 600;
  `;
}

  // ==================== Settings Panel ====================
function renderSettingsPanel(parent, header) {
  const tabs = createElement('div', 'lobby-panel-tabs', header);
  ['控制', '音效', '账号'].forEach((t, i) => {
    const tab = createElement('div', 'lobby-tab', tabs);
    tab.textContent = t;
    if (i === 0) tab.classList.add('active');
    tab.onclick = () => {
      Audio.tap();
      tabs.querySelectorAll('.lobby-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      clearChildren(parent);
      if (i === 0) renderSettingsControl(parent);
      else if (i === 1) renderSettingsSound(parent);
      else renderSettingsAccount(parent);
    };
  });

  renderSettingsControl(parent);
}

function renderSettingsControl(parent) {
  const container = createElement('div', '', parent);
  container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  const controlMode = createElement('div', 'lobby-card', container);
  controlMode.style.cssText = 'padding: 16px;';
  
  const modeLabel = createElement('div', '', controlMode);
  modeLabel.textContent = '移动方式';
  modeLabel.style.cssText = 'color: white; font-weight: 600; margin-bottom: 12px;';

  const modeOptions = createElement('div', '', controlMode);
  modeOptions.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

  [
    { value: 'drag', label: '浮动摇杆（触摸任意位置）' },
    { value: 'stick', label: '固定摇杆' }
  ].forEach(opt => {
    const option = createElement('label', '', modeOptions);
    option.style.cssText = 'display: flex; align-items: center; gap: 12px; cursor: pointer;';

    const radio = createElement('input', '', option);
    radio.type = 'radio';
    radio.name = 'control-mode';
    radio.value = opt.value;
    radio.checked = (state.settings.control || 'drag') === opt.value;
    radio.style.cssText = 'width: 20px; height: 20px;';
    
    const text = createElement('span', '', option);
    text.textContent = opt.label;
    text.style.cssText = 'color: white; font-size: 14px;';

    radio.onchange = () => {
      Audio.tap();
      state.settings.control = opt.value;
      if (window.FX && FX.setControl) FX.setControl(opt.value);
      saveState();
    };
  });

  const joySizeCard = createElement('div', 'lobby-card', container);
  joySizeCard.style.cssText = 'padding: 16px;';

  const sizeLabel = createElement('div', '', joySizeCard);
  sizeLabel.textContent = '摇杆大小';
  sizeLabel.style.cssText = 'color: white; font-weight: 600; margin-bottom: 12px;';

  const sizeSlider = createElement('div', '', joySizeCard);
  sizeSlider.style.cssText = 'display: flex; gap: 12px; align-items: center;';

  const slider = createElement('input', '', sizeSlider);
  slider.type = 'range';
  slider.min = '0';
  slider.max = '2';
  slider.value = { s: 0, m: 1, l: 2 }[state.settings.joySize || 'm'];
  slider.style.cssText = 'flex: 1;';

  const sizeText = createElement('span', '', sizeSlider);
  sizeText.textContent = { s: '小', m: '中', l: '大' }[state.settings.joySize || 'm'];
  sizeText.style.cssText = 'color: white; font-weight: 600; min-width: 24px;';

  slider.oninput = () => {
    const sizes = ['s', 'm', 'l'];
    const size = sizes[slider.value];
    state.settings.joySize = size;
    sizeText.textContent = { s: '小', m: '中', l: '大' }[size];
    document.documentElement.style.setProperty('--joy', { s: .8, m: 1, l: 1.25 }[size]);
    saveState();
  };
}

function renderSettingsSound(parent) {
  const container = createElement('div', '', parent);
  container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  [
    { key: 'sound', label: '音效', icon: '🔊' },
    { key: 'music', label: '音乐', icon: '🎵' },
    { key: 'vibration', label: '震动', icon: '📳' }
  ].forEach(setting => {
    const row = createElement('div', 'lobby-card', container);
    row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 16px;';

    const label = createElement('div', '', row);
    label.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    
    const icon = createElement('span', '', label);
    icon.textContent = setting.icon;
    icon.style.fontSize = '24px';

    const text = createElement('span', '', label);
    text.textContent = setting.label;
    text.style.cssText = 'color: white; font-weight: 600;';

    const toggle = createElement('div', '', row);
    toggle.style.cssText = `
      width: 52px; height: 28px; border-radius: 14px;
      background: ${state.settings[setting.key] !== false ? '#10b981' : 'rgba(255,255,255,0.2)'};
      position: relative; cursor: pointer; transition: background 250ms;
    `;

    const knob = createElement('div', '', toggle);
    knob.style.cssText = `
      width: 24px; height: 24px; border-radius: 50%; background: white;
      position: absolute; top: 2px;
      left: ${state.settings[setting.key] !== false ? '26px' : '2px'};
      transition: left 250ms;
    `;

    toggle.onclick = () => {
      Audio.tap();
      state.settings[setting.key] = state.settings[setting.key] === false;
      toggle.style.background = state.settings[setting.key] !== false ? '#10b981' : 'rgba(255,255,255,0.2)';
      knob.style.left = state.settings[setting.key] !== false ? '26px' : '2px';
      saveState();
    };
  });
}

function renderSettingsAccount(parent) {
  const container = createElement('div', '', parent);
  container.style.cssText = 'display: flex; flex-direction: column; gap: 16px; align-items: center; padding: 24px 0;';

  const vipBtn = createElement('button', 'lobby-btn gold', container);
  vipBtn.textContent = '账号 / VIP';
  vipBtn.style.width = '100%';
  vipBtn.style.maxWidth = '300px';
  vipBtn.onclick = () => {
    Audio.tap();
    if (window.VIP && VIP.open) {
      VIP.open();
    } else {
      const t = document.querySelector('.account-trigger');
      if (t) t.click();
    }
  };
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
            (newRoundKey(), config.onStart(selection));
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
    max-width: min(90vw, 500px);
    max-height: min(92dvh, calc(100dvh - 40px));
    width: 500px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    animation: slideInUp 600ms cubic-bezier(0.2, 0.9, 0.3, 1);
  `;

  const scrollContent = createElement('div', '', panel);
  scrollContent.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  `;

  const _lose = result && (result.win === false || (result.win === undefined && !result.stars));
  
  const title = createElement('h1', '', scrollContent);
  title.textContent = (result && result.title) || (_lose ? '挑战失败…' : '挑战成功！');
  title.style.cssText = `
    margin: 0;
    font-size: clamp(24px, 6vw, 32px);
    font-weight: 700;
    background: linear-gradient(135deg, #fbbf24, #ec4899);
    ${_lose ? 'filter: hue-rotate(-40deg) saturate(.8);' : ''}
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
  `;

  if (!_lose && result.stars) {
    const starsDiv = createElement('div', '', scrollContent);
    starsDiv.style.cssText = 'font-size: 48px; display: flex; gap: 8px;';
    
    for (let i = 0; i < 3; i++) {
      const star = createElement('span', '', starsDiv);
      star.textContent = i < result.stars ? '⭐' : '☆';
      star.style.cssText = `
        display: inline-block;
        animation: starReveal 600ms ${i * 200}ms both;
      `;
    }
  }

  const statsGrid = createElement('div', '', scrollContent);
  statsGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    width: 100%;
  `;

  const statItems = [
    { key: 'score', label: '得分', icon: '🎯' },
    { key: 'distance', label: '距离', icon: '📏', unit: '米' },
    { key: 'kills', label: '击败', icon: '⚔' },
    { key: 'time', label: '时间', icon: '⏱', unit: '秒' },
    { key: 'combo', label: '连击', icon: '💫', format: (v) => result.maxCombo ? `${v}/${result.maxCombo}` : v },
    { key: 'wave', label: '波次', icon: '🌊' },
    { key: 'level', label: '等级', icon: '⭐' }
  ];

  statItems.forEach(({ key, label, icon, unit, format }) => {
    if (result[key] !== undefined) {
      const card = createElement('div', 'lobby-card', statsGrid);
      card.style.cssText = 'padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px;';
      
      const iconDiv = createElement('div', '', card);
      iconDiv.textContent = icon;
      iconDiv.style.fontSize = '24px';
      
      const value = createElement('div', '', card);
      value.textContent = format ? format(result[key]) : result[key] + (unit || '');
      value.style.cssText = 'font-size: 18px; font-weight: 700; color: white;';
      
      const labelDiv = createElement('div', '', card);
      labelDiv.textContent = label;
      labelDiv.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.7);';
    }
  });

  if (result.stats && typeof result.stats === 'object') {
    Object.entries(result.stats).forEach(([label, value]) => {
      const card = createElement('div', 'lobby-card', statsGrid);
      card.style.cssText = 'padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px;';
      
      const valueDiv = createElement('div', '', card);
      valueDiv.textContent = value;
      valueDiv.style.cssText = 'font-size: 18px; font-weight: 700; color: white;';
      
      const labelDiv = createElement('div', '', card);
      labelDiv.textContent = label;
      labelDiv.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.7);';
    });
  }

  if (result.stage && state.stageProgress[result.stage]) {
    const bestKey = 'best-' + result.stage;
    const prevBest = state[bestKey] || 0;
    const currentScore = result.score || 0;
    
    if (currentScore > prevBest) {
      state[bestKey] = currentScore;
      saveState();
      
      const bestRow = createElement('div', '', scrollContent);
      bestRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      
      const bestLabel = createElement('span', '', bestRow);
      bestLabel.textContent = `最佳得分: ${currentScore}`;
      bestLabel.style.cssText = 'color: white; font-weight: 600;';
      
      const newBadge = createElement('span', '', bestRow);
      newBadge.textContent = '新纪录!';
      newBadge.style.cssText = `
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        animation: pulse 1s infinite;
      `;
    }
  }

  if (result.coins || result.gems) {
    const rewardsDiv = createElement('div', '', scrollContent);
    rewardsDiv.style.cssText = 'width: 100%; display: flex; flex-direction: column; gap: 12px;';

    const rewardsLabel = createElement('div', '', rewardsDiv);
    rewardsLabel.textContent = '奖励';
    rewardsLabel.style.cssText = 'color: rgba(255,255,255,0.7); font-size: 14px; text-align: center;';

    const rewardsRow = createElement('div', '', rewardsDiv);
    rewardsRow.style.cssText = 'display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;';

    const vipBonus = state._vipCoinBonus || 0;

    if (result.coins) {
      const coinDiv = createElement('div', '', rewardsRow);
      coinDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px;';
      
      const coinIcon = createElement('img', '', coinDiv);
      coinIcon.src = '../assets/item-chest.webp';
      coinIcon.style.cssText = 'width: 48px; height: 48px;';
      
      const coinAmount = createElement('div', '', coinDiv);
      coinAmount.style.cssText = 'font-size: 20px; font-weight: 600; color: #fbbf24;';
      animateCount(coinAmount, 0, result.coins);
      
      if (vipBonus > 0) {
        const bonusText = createElement('div', '', coinDiv);
        bonusText.textContent = `VIP加成 +${vipBonus}%`;
        bonusText.style.cssText = 'font-size: 11px; color: #fbbf24; font-weight: 600;';
      }
    }

    if (result.gems) {
      const gemDiv = createElement('div', '', rewardsRow);
      gemDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px;';
      
      const gemIcon = createElement('img', '', gemDiv);
      gemIcon.src = '../assets/item-star.webp';
      gemIcon.style.cssText = 'width: 48px; height: 48px;';
      
      const gemAmount = createElement('div', '', gemDiv);
      gemAmount.style.cssText = 'font-size: 20px; font-weight: 600; color: #a855f7;';
      animateCount(gemAmount, 0, result.gems);
    }
  }

  const actions = createElement('div', '', panel);
  actions.style.cssText = `
    display: flex;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
    flex-shrink: 0;
  `;

  const retryBtn = createElement('button', 'lobby-btn secondary', actions);
  retryBtn.textContent = '重试';
  retryBtn.style.flex = '1';
  retryBtn.style.minWidth = '100px';
  retryBtn.onclick = () => {
    Audio.tap();
    vibrate();
    overlay.remove();
    
    const selection = getSelection();
    if (config.onStart) {
      (newRoundKey(), config.onStart(selection));
    }
  };

  if (!_lose && result.stage) {
    const stageIndex = (config.stages || []).findIndex(s => s.id === result.stage);
    const nextStage = (config.stages || [])[stageIndex + 1];
    
    if (nextStage) {
      const nextBtn = createElement('button', 'lobby-btn gold', actions);
      nextBtn.textContent = '下一关';
      nextBtn.style.flex = '1';
      nextBtn.style.minWidth = '100px';
      nextBtn.onclick = () => {
        Audio.tap();
        vibrate();
        state.selectedStage = nextStage.id;
        saveState();
        overlay.remove();
        
        const selection = getSelection();
        if (config.onStart) {
          (newRoundKey(), config.onStart(selection));
        }
      };
    }
  }

  const lobbyBtn = createElement('button', 'lobby-btn gold', actions);
  lobbyBtn.textContent = '大厅';
  lobbyBtn.style.flex = '1';
  lobbyBtn.style.minWidth = '100px';
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
  document.querySelectorAll('.fx-banner').forEach(e => e.style.opacity = 0);
  if (root) { root.style.display = 'block'; root.dataset.pauseBg = root.style.background; root.style.background = 'transparent'; }
  const __hideRoot = () => { if (root) { root.style.background = root.dataset.pauseBg || '#0a0a0f'; if (!document.documentElement.classList.contains('fx-in-lobby')) root.style.display = 'none'; } };
  setScreen('pause');
  
  try {
    if (window.FX) FX.paused = true;
  } catch(e) {}

  const overlay = createElement('div', 'lobby-overlay', root);
  
  const panel = createElement('div', 'lobby-panel', overlay);
  panel.style.cssText = `
    width: 400px; max-width: 90vw; padding: 32px;
    animation: slideInUp 300ms;
  `;

  const title = createElement('h2', '', panel);
  title.textContent = '暂停';
  title.style.cssText = 'margin: 0 0 24px 0; color: white; font-size: 24px; text-align: center; font-weight: 700;';

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
          overlay.remove(); __hideRoot();
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

  // ---- Platform task events (low-trust, capped server-side). In-game items/currency stay local. ----
  function newRoundKey() {
    try { const k = (window.StarEconomy && StarEconomy.createEventKey) ? StarEconomy.createEventKey() : (crypto.randomUUID ? crypto.randomUUID() : ''); sessionStorage.setItem('se-round-' + config.id, k); } catch (e) {}
  }
  function reportGameFinished() {
    let k = null; try { k = sessionStorage.getItem('se-round-' + config.id); } catch (e) {}
    if (!k || !window.StarEconomy || !StarEconomy.enabled || !StarEconomy.enabled()) return;
    const attempt = (n) => StarEconomy.reportTaskEvent('game_finished', k).then(() => { try { sessionStorage.removeItem('se-round-' + config.id); } catch (e) {} })
      .catch(() => { if (n < 2) setTimeout(() => attempt(n + 1), 3000 * (n + 1)); });
    attempt(0);
  }

function renderShopPanel(parent, header) {
  const tabs = createElement('div', 'lobby-panel-tabs', header);
  ['道具', '兑换'].forEach((t, i) => {
    const tab = createElement('div', 'lobby-tab', tabs);
    tab.textContent = t;
    if (i === 0) tab.classList.add('active');
    tab.onclick = () => {
      Audio.tap();
      tabs.querySelectorAll('.lobby-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      clearChildren(parent);
      if (i === 0) renderShopItems(parent);
      else renderShopExchange(parent);
    };
  });

  renderShopItems(parent);
}

function renderShopItems(parent) {
  const container = createElement('div', '', parent);
  container.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;';

  const shopItems = (config.shop || [
    { id: 'hp_pot', name: '生命药水', icon: 'item-chest', price: 50, currency: 'coin', consumable: true },
    { id: 'speed_boost', name: '加速道具', icon: 'item-ice', price: 100, currency: 'coin', consumable: true }
  ]);

  shopItems.forEach(item => {
    const card = createElement('div', 'lobby-card', container);
    card.style.cssText = 'display: flex; flex-direction: column; align-items: center; padding: 16px; cursor: pointer;';

    const icon = createElement('img', '', card);
    icon.src = `../assets/${item.icon}.webp`;
    icon.style.cssText = 'width: 64px; height: 64px; margin-bottom: 8px;';

    const name = createElement('div', '', card);
    name.textContent = item.name;
    name.style.cssText = 'font-size: 14px; font-weight: 600; color: white; text-align: center; margin-bottom: 8px;';

    const price = createElement('div', '', card);
    const curr = (config.currency || []).find(c => c.id === item.currency);
    price.textContent = `${item.price} ${({coin:"金币",coins:"金币",gem:"钻石",gems:"钻石"})[item.currency] || ((config.currency||[]).find(c => c.id === item.currency)||{}).name || item.currency}`;
    price.style.cssText = 'font-size: 12px; color: #fbbf24;';

    card.onclick = () => {
      Audio.tap();
      if ((state.currency[item.currency] || 0) >= item.price) {
        Audio.claim();
        vibrate(15);
        state.currency[item.currency] -= item.price;
        if (item.consumable) {
          state.inventory.push({
            uid: Math.max(0, ...state.inventory.map(i => i.uid)) + 1,
            id: item.id,
            icon: item.icon,
            name: item.name,
            consumable: true,
            new: true
          });
        }
        saveState();
        const lobbyScreen = root.querySelector('[data-lobby-screen="lobby"]');
        if (lobbyScreen && lobbyScreen._currencyHUD) lobbyScreen._currencyHUD.update();
      }
    };
  });
}

function renderShopExchange(parent) {
  const container = createElement('div', '', parent);
  container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  const exchanges = [
    { from: 'gem', fromAmount: 10, to: 'coin', toAmount: 500 },
    { from: 'gem', fromAmount: 50, to: 'coin', toAmount: 3000 }
  ];

  exchanges.forEach(ex => {
    const card = createElement('div', 'lobby-card', container);
    card.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 16px; cursor: pointer;';

    const fromDiv = createElement('div', '', card);
    fromDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    const fromCurr = (config.currency || []).find(c => c.id === ex.from);
    if (fromCurr) {
      const fromIcon = createElement('img', '', fromDiv);
      fromIcon.src = `../assets/${fromCurr.icon}.webp`;
      fromIcon.style.cssText = 'width: 32px; height: 32px;';
      const fromAmount = createElement('span', '', fromDiv);
      fromAmount.textContent = ex.fromAmount;
      fromAmount.style.cssText = 'color: white; font-weight: 600;';
    }

    const arrow = createElement('div', '', card);
    arrow.textContent = '→';
    arrow.style.cssText = 'font-size: 24px; color: rgba(255,255,255,0.5);';

    const toDiv = createElement('div', '', card);
    toDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    const toCurr = (config.currency || []).find(c => c.id === ex.to);
    if (toCurr) {
      const toIcon = createElement('img', '', toDiv);
      toIcon.src = `../assets/${toCurr.icon}.webp`;
      toIcon.style.cssText = 'width: 32px; height: 32px;';
      const toAmount = createElement('span', '', toDiv);
      toAmount.textContent = ex.toAmount;
      toAmount.style.cssText = 'color: #fbbf24; font-weight: 600;';
    }

    card.onclick = () => {
      Audio.tap();
      if ((state.currency[ex.from] || 0) >= ex.fromAmount) {
        Audio.claim();
        vibrate(15);
        state.currency[ex.from] -= ex.fromAmount;
        state.currency[ex.to] = (state.currency[ex.to] || 0) + ex.toAmount;
        saveState();
        const lobbyScreen = root.querySelector('[data-lobby-screen="lobby"]');
        if (lobbyScreen && lobbyScreen._currencyHUD) lobbyScreen._currencyHUD.update();
      }
    };
  });
}
function renderVipPanel(content, header) {
  const container = createElement('div', '', content);
  container.style.cssText = 'display: flex; flex-direction: column; gap: 24px; align-items: center;';

  const tier = vipTier();
  
  const badge = createElement('div', '', container);
  badge.style.cssText = `
    width: 120px; height: 120px; border-radius: 50%;
    background: ${tier ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.1)'};
    display: flex; align-items: center; justify-content: center;
    font-size: 48px; font-weight: 700; color: white;
    box-shadow: ${tier ? '0 0 40px rgba(251,191,36,0.6)' : 'none'};
  `;
  badge.textContent = tier ? `VIP${tier}` : '🔒';

  if (!tier) {
    const lockText = createElement('div', '', container);
    lockText.textContent = '开通VIP解锁专属特权';
    lockText.style.cssText = 'font-size: 16px; color: rgba(255,255,255,0.7);';

    const openBtn = createElement('button', 'lobby-btn gold', container);
    openBtn.textContent = '开通VIP';
    openBtn.onclick = () => {
      Audio.tap();
      if (window.VIP && VIP.open) VIP.open();
      else {
        const t = document.querySelector('.account-trigger');
        if (t) t.click();
      }
    };
  } else {
    const perks = createElement('div', '', container);
    perks.style.cssText = 'width: 100%; display: flex; flex-direction: column; gap: 12px;';

    const perkList = [
      { icon: '💰', text: `收益加成 +${Math.min(tier * 5, 25)}%` },
      { icon: '🎁', text: `每日礼包 ${200 * tier}金币 + ${5 * tier}钻石` },
      { icon: '👗', text: 'VIP专属外观' }
    ];

    perkList.forEach(perk => {
      const row = createElement('div', 'lobby-card', perks);
      row.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px;';
      
      const icon = createElement('span', '', row);
      icon.textContent = perk.icon;
      icon.style.fontSize = '24px';
      
      const text = createElement('span', '', row);
      text.textContent = perk.text;
      text.style.cssText = 'color: white; font-weight: 600;';
    });

    if (!state._vipPerkClaimedKeys) {
      state._vipPerkClaimedKeys = [];
    }

    const claimBtn = createElement('button', 'lobby-btn gold', container);
    claimBtn.textContent = '🎁 领取今日礼包';
    claimBtn.disabled = false;

    const statusDiv = createElement('div', '', container);
    statusDiv.style.cssText = 'font-size: 11px; color: rgba(255,255,255,0.5); text-align: center; min-height: 14px;';

    claimBtn.onclick = async () => {
      claimBtn.disabled = true;
      claimBtn.textContent = '领取中...';
      statusDiv.textContent = '服务端校验';

      let resultOk = false;
      let resultAlreadyClaimed = false;
      let resultReward = { coin: 0, gem: 0, coin_bonus_pct: 0, exclusive_skin_ids: [] };
      let claimKeyId = null;
      let errorMsg = null;

      if (window.StarEconomy && typeof StarEconomy.claimVipPerk === 'function') {
        try {
          const resp = await StarEconomy.claimVipPerk(config.id);
          
          if (resp) {
            resultOk = resp.ok === true;
            resultAlreadyClaimed = resp.already_claimed === true;
            
            if (resp.reward && typeof resp.reward === 'object') {
              resultReward.coin = Math.max(0, resp.reward.coin || 0);
              resultReward.gem = Math.max(0, resp.reward.gem || 0);
              resultReward.coin_bonus_pct = Math.max(0, Math.min(25, resp.reward.coin_bonus_pct || 0));
              if (Array.isArray(resp.reward.exclusive_skin_ids)) {
                resultReward.exclusive_skin_ids = resp.reward.exclusive_skin_ids;
              }
            }
            
            if (resp.result_id) {
              claimKeyId = resp.result_id;
            }
          }
        } catch (e) {
          console.warn('VIP perk claim error:', e);
          errorMsg = e.code || 'unknown_error';
        }
      } else {
        errorMsg = 'rpc_unavailable';
      }

      if (errorMsg) {
        claimBtn.disabled = false;
        claimBtn.textContent = '🎁 领取今日礼包';
        statusDiv.textContent = 'VIP 福利服务暂不可用，稍后再试';
        return;
      }

      if (!resultOk) {
        claimBtn.disabled = false;
        claimBtn.textContent = '🎁 领取今日礼包';
        if (resultAlreadyClaimed) {
          statusDiv.textContent = '今日已领取';
        } else {
          statusDiv.textContent = 'VIP 福利服务暂不可用，稍后再试';
        }
        return;
      }

      const keyToStore = claimKeyId || (new Date().toISOString().split('T')[0] + '-' + config.id);
      if (state._vipPerkClaimedKeys.includes(keyToStore)) {
        claimBtn.disabled = false;
        claimBtn.textContent = '🎁 领取今日礼包';
        statusDiv.textContent = '今日已领取';
        return;
      }

      state._vipPerkClaimedKeys.push(keyToStore);

      Audio.claim();
      vibrate(20);

      state.currency.coin = (state.currency.coin || 0) + resultReward.coin;
      state.currency.gem = (state.currency.gem || 0) + resultReward.gem;
      
      if (resultReward.coin_bonus_pct > 0) {
        state._vipCoinBonus = resultReward.coin_bonus_pct;
      }

      if (Array.isArray(resultReward.exclusive_skin_ids) && resultReward.exclusive_skin_ids.length > 0) {
        state.ownedSkins = [...new Set([...(state.ownedSkins || []), ...resultReward.exclusive_skin_ids])];
      }

      saveState();

      claimBtn.textContent = '今日已领取';
      claimBtn.disabled = true;
      statusDiv.textContent = '服务端校验';

      const lobbyScreen = root.querySelector('[data-lobby-screen="lobby"]');
      if (lobbyScreen && lobbyScreen._currencyHUD) {
        lobbyScreen._currencyHUD.update();
      }
    };
  }
}

function vipTier() {
  try {
    if (window.VIP && VIP.active && VIP.active()) {
      return (VIP.tier && VIP.tier()) || 1;
    }
  } catch (e) {}
  return 0;
}

function runTutorial() {
  if (localStorage.getItem('lobby-' + config.id + '-tutorial')) return;

  const steps = [
    { target: '#lobby-start', text: '点击开始游戏！', pos: 'left' },
    { target: '[data-open="wardrobe"]', text: '在这里可以更换外观', pos: 'right' },
    { target: '[data-open="missions"]', text: '完成任务获得奖励', pos: 'right' },
    { target: '.lobby-character-showcase', text: '触摸任意位置移动角色', pos: 'top' }
  ];

  let currentStep = 0;

  function showStep() {
    if (currentStep >= steps.length) {
      localStorage.setItem('lobby-' + config.id + '-tutorial', '1');
      return;
    }

    const step = steps[currentStep];
    const target = document.querySelector(step.target);
    if (!target) {
      currentStep++;
      showStep();
      return;
    }

    const overlay = createElement('div', '', root);
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
    `;

    const rect = target.getBoundingClientRect();
    const highlight = createElement('div', '', overlay);
    highlight.style.cssText = `
      position: absolute;
      left: ${rect.left - 8}px;
      top: ${rect.top - 8}px;
      width: ${rect.width + 16}px;
      height: ${rect.height + 16}px;
      border: 3px solid #fbbf24;
      border-radius: 16px;
      box-shadow: 0 0 40px rgba(251,191,36,0.6);
      pointer-events: none;
    `;

    const tooltip = createElement('div', '', overlay);
    tooltip.style.cssText = `
      position: absolute;
      background: white;
      color: #0a0a0f;
      padding: 16px 20px;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 600;
      max-width: 250px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      z-index: 201;
    `;
    tooltip.textContent = step.text;

    const positions = {
      top: { left: rect.left + rect.width / 2, top: rect.top - 80, transform: 'translateX(-50%)' },
      bottom: { left: rect.left + rect.width / 2, top: rect.bottom + 20, transform: 'translateX(-50%)' },
      left: { left: rect.left - 270, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' },
      right: { left: rect.right + 20, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' }
    };

    const pos = positions[step.pos] || positions.bottom;
    Object.assign(tooltip.style, pos);

    overlay.onclick = () => {
      Audio.tap();
      overlay.remove();
      currentStep++;
      setTimeout(showStep, 300);
    };
  }

  setTimeout(() => showStep(), 1000);
}



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
      _map: (() => { const m = {}; if (skin && skin.img && window.FX) { [char.chibi || char.id + '-chibi', char.id + '-portrait'].concat(char.id === 'lan' ? ['whale-idle','whale-run','whale-jump','whale-attack','whale-cast','whale-ride'] : []).forEach(n => m[n] = skin.img); } try { if (window.FX) { FX.skinMap = m; if (skin && skin.img && FX.load) FX.load([skin.img]); } } catch (e) {} return undefined; })(),
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
    const defaultSkins = (config.skins || []).filter(s => s.rarity === 'N' || s.rarity === 'R' || (s.img && !s.vip));
    state.ownedSkins = [...new Set([...state.ownedSkins, ...defaultSkins.map(s => s.id)])];
    saveState();
  }

  // ==================== Public API ====================
  const Lobby = {
    init(cfg) {
      config = cfg;
      const RR = ['N','R','SR','SSR','UR'];
      const ART = {'space-shooter':'bg-space','moe-runner':'bg-rail','monster-loot':'bg-forest','fighter':'bg-arena','story':'lobbybg-story','snake':'lobbybg-snake','td':'lobbybg-td','survivor':'lobbybg-survivor','lili-merge':'lobbybg-lili-merge','lili-match':'lobbybg-lili-match','lili-2048':'lobbybg-lili-2048','lili-fortune':'lobbybg-lili-fortune'};
      const fromPath = location.pathname.split('/').filter(Boolean).slice(-1)[0];
      let bgs = (Array.isArray(config.bg) ? config.bg : [config.bg]).map(b => typeof b === 'string' ? b : (b && (b.img || b.bg))).filter(Boolean);
      const art = ART[config.id] || ART[fromPath] || 'bg-space';
      bgs = bgs.filter(b => !b.startsWith('bg-'));
      config.bg = art.startsWith('lobbybg-') ? [art] : [art, ...bgs.slice(0, 1)];
      const MI = ['item-star','item-ice','item-weapon','item-shield'];
      config.modes = (config.modes && config.modes.length ? config.modes : [{id:'story'},{id:'endless'}]).map((m, i) => Object.assign({}, m, { icon: (typeof m.icon === 'string' && !m.icon.includes(' ')) ? m.icon : MI[i % 4] }));
      const STY = [['cute','甜心','R'],['glam','华彩','SSR'],['elegant','典雅','SR'],['cool','酷飒','SR']];
      config.chars.forEach(ch => {
        if (!['lan','mo','li','xing','hu'].includes(ch.id)) return;
        STY.forEach(([st, nm, r]) => {
          const id = ch.id + '-' + st;
          const SF = { cute: 'saturate(1.25) brightness(1.06)', glam: 'saturate(1.3) drop-shadow(0 0 6px #ffd76a)', elegant: 'sepia(.15) saturate(1.1)', cool: 'contrast(1.12) saturate(.85) hue-rotate(-10deg)' };
          if (!config.skins.some(k => k.id === id)) config.skins.push({ id, char: ch.id, name: nm, style: st, rarity: r, filter: SF[st], img: 'skin-' + ch.id + '-' + st, vip: false });
        });
        const URN = { lan: '沧海神姬', mo: '春樱妖精后', li: '星糖公主', xing: '银河女帝', hu: '九尾狐火' };
        if (!config.skins.some(k => k.id === ch.id + '-ur')) config.skins.push({ id: ch.id + '-ur', char: ch.id, name: URN[ch.id], style: 'glam', rarity: 'UR', vip: true, img: 'vip-' + ch.id, filter: 'saturate(1.35) drop-shadow(0 0 10px #ff9bf0) drop-shadow(0 0 4px #fff)' });
      });
      config.skins.sort((a, b) => RR.indexOf(b.rarity) - RR.indexOf(a.rarity) || 0);
      config.skins.forEach(k => { if (!k.style) k.style = k.rarity === 'SSR' ? 'glam' : k.rarity === 'SR' ? 'elegant' : 'cute'; });
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

      loadState(); try { if (state.settings && state.settings.joySize) document.documentElement.style.setProperty("--joy", { s: .8, m: 1, l: 1.25 }[state.settings.joySize]); } catch (e) {}

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
      root.style.display = 'block'; document.documentElement.classList.add('fx-in-lobby');
      showLobby();
    },

    hide() {
      if (!root) return;
      root.style.display = 'none'; document.documentElement.classList.remove('fx-in-lobby');
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

    reportFinished() { reportGameFinished(); },
    newRound() { newRoundKey(); },
    reportResult(result) {
      result = Object.assign({}, result);
      try { const lost = result.win === false || (result.win === undefined && !result.stars); if (!lost) reportGameFinished(); } catch (e) {}
      if (typeof result.stage === 'number') { 
        const st = (config.stages || [])[result.stage]; 
        result.stage = st ? st.id : String(result.stage); 
      }
      
      if (result.stage) {
        const currentStars = state.stageProgress[result.stage] || 0;
        state.stageProgress[result.stage] = Math.max(currentStars, result.stars || 0);
      }

      if (result.coins) {
        const __vb = Math.max(0, Math.min(25, state._vipCoinBonus || 0)); if (__vb > 0) { result.vipBonusCoins = Math.floor(result.coins * __vb / 100); result.coins += result.vipBonusCoins; }
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

  document.addEventListener('click', e => { const c = e.target.closest && e.target.closest('.lobby-close'); if (c && !c.onclick) { const o = c.closest('.lobby-overlay'); if (o) o.remove(); } }, true);

  (function(){ const st=document.createElement('style'); st.textContent=`
    .lobby-root .lobby-panel-header{position:relative!important;z-index:3;margin-bottom:12px!important;flex:0 0 auto}
    .lobby-root .lobby-panel-tabs,.lobby-root .lobby-tabs{position:relative;z-index:3;flex:0 0 auto}
    .lobby-root .lobby-side-column{gap:8px!important;max-height:calc(100dvh - 60px - 84px - env(safe-area-inset-bottom,0px));overflow:visible}
    @media (orientation: portrait){ .lobby-root .lobby-side-column{flex-direction:column!important;top:calc(env(safe-area-inset-top,0px) + 60px)!important;bottom:auto!important;transform:none!important;max-width:none!important;overflow:visible!important}
      .lobby-root .lobby-side-column.left{left:max(10px,env(safe-area-inset-left,0px))!important;right:auto!important}
      .lobby-root .lobby-side-column.right{right:max(10px,env(safe-area-inset-right,0px))!important;left:auto!important} }
    @media (orientation: portrait){ .lobby-root .lobby-start-btn{left:15%!important;right:15%!important;transform:none;min-width:0!important} .lobby-root .lobby-mode-toggle{left:0!important;right:0!important;margin:0 auto;width:max-content;transform:none!important} }
    @media (max-height: 480px){ .lobby-root .lobby-side-column{top:calc(env(safe-area-inset-top,0px) + 50px)!important;gap:4px!important}
      .lobby-root .lobby-side-icon{width:40px!important;height:40px!important;font-size:18px!important} .lobby-root .lobby-side-label{font-size:9px!important} }

    .lobby-root .lobby-immersive .lobby-amb{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}
    .lobby-root .lobby-grade{position:absolute;inset:0;mix-blend-mode:soft-light}
    .lobby-root .lobby-shaft{position:absolute;top:-10%;width:14%;height:85%;transform:skewX(-18deg);filter:blur(10px);mix-blend-mode:screen;animation:lobbyShaft 7s ease-in-out infinite;opacity:.0}
    @keyframes lobbyShaft{0%,100%{opacity:.15}50%{opacity:.65}}
    .lobby-root .lobby-wave{position:absolute;left:-10%;right:-10%;height:7%;bottom:30%;background:repeating-linear-gradient(90deg,transparent 0 40px,rgba(255,240,220,.35) 40px 70px,transparent 70px 120px);filter:blur(2px);mix-blend-mode:screen;animation:lobbyWave 6s linear infinite;-webkit-mask:linear-gradient(transparent,#000 50%,transparent);mask:linear-gradient(transparent,#000 50%,transparent)}
    .lobby-root .lobby-wave.w2{bottom:35%;opacity:.6;animation-duration:9s;animation-direction:reverse}
    @keyframes lobbyWave{from{transform:translateX(0)}to{transform:translateX(120px)}}
    .lobby-root .lobby-immersive .lobby-character-showcase{z-index:6!important;top:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 40px)!important;transform:translateX(-50%)!important;height:min(76dvh,620px)!important;width:min(42vw,420px)!important;justify-content:flex-end!important}
    .lobby-root .lobby-immersive .lobby-character-showcase::before{display:none}
    .lobby-root .lobby-immersive .lobby-hero-img{transform-origin:50% 100%}
    .lobby-root .lobby-hero-tint{position:absolute;left:0;right:0;bottom:0;top:0;z-index:2;pointer-events:none;-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:50% 100%;mask-position:50% 100%;mix-blend-mode:overlay;opacity:.85;transform-origin:50% 100%}
    .lobby-root .lobby-immersive .lobby-hero-img{max-height:100%!important;height:100%!important;width:100%!important;object-fit:contain!important;-webkit-mask-image:linear-gradient(180deg,#000 92%,rgba(0,0,0,.88));opacity:.98;object-position:50% 100%}
    .lobby-root .lobby-contact{position:absolute;left:50%;bottom:-2px;width:62%;height:22px;bottom:-8px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at 50% 45%,rgba(25,10,20,.85),rgba(40,15,30,.4) 40%,transparent 72%);filter:blur(2px);z-index:0;pointer-events:none}
    .lobby-root .lobby-immersive .lobby-char-nameplate{display:none}
    .lobby-root .lobby-fg{position:absolute;inset:0;pointer-events:none;z-index:7}
    .lobby-root .lobby-fg img{position:absolute;bottom:-4%;height:34%;filter:brightness(.7) saturate(1.1) blur(1.2px);opacity:.92}
    .lobby-root .lobby-fg img.l{left:-4%}
    .lobby-root .lobby-fg img.r{right:-4%;transform:scaleX(-1)}
    @media (orientation: portrait){
      .lobby-root .lobby-immersive .lobby-character-showcase{bottom:calc(env(safe-area-inset-bottom,0px) + 205px)!important;height:min(54dvh,520px)!important;width:min(70vw,360px)!important}
      .lobby-root .lobby-fg img{height:15%!important;bottom:-2%!important}
      .lobby-root .lobby-fg img.l{left:-14%!important} .lobby-root .lobby-fg img.r{right:-14%!important}
    }
    .lobby-root .lobby-fgp{position:absolute;inset:0;pointer-events:none;z-index:8}
    .lobby-root .lobby-immersive .lobby-top-bar{background:linear-gradient(180deg,rgba(20,10,40,.35),transparent)!important;border:0!important}
    .lobby-root .lobby-immersive .lobby-bottom-bar{background:linear-gradient(180deg,transparent,rgba(20,10,40,.38))!important;border-top:0!important;backdrop-filter:blur(4px)!important;-webkit-mask:linear-gradient(transparent,#000 35%);mask:linear-gradient(transparent,#000 35%)}
    .lobby-root .lobby-immersive .lobby-side-icon{background:rgba(255,255,255,.14)!important;border:1px solid rgba(255,255,255,.28)!important;backdrop-filter:blur(6px)}
    .lobby-root .lobby-immersive .lobby-currency-item{background:rgba(20,10,40,.28)!important;border:1px solid rgba(255,255,255,.18)!important}
    .lobby-root .lobby-immersive .lobby-side-column,.lobby-root .lobby-immersive .lobby-top-bar,.lobby-root .lobby-immersive .lobby-bottom-bar,.lobby-root .lobby-immersive .lobby-start-btn,.lobby-root .lobby-immersive .lobby-mode-toggle{z-index:20}
  `; (document.head||document.documentElement).appendChild(st); })();
  window.Lobby = Lobby;
})();
