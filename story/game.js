// 丢失的第六颗星 (lost-star) - game.js
(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: false});

// === STATE ===
let state = {
  chapter: 0,
  line: 0,
  done: [],
  flags: [],
  currentText: '',
  typedChars: 0,
  typeTimer: 0,
  typeSpeed: 0.03,
  typed: false,
  reply: null,
  showChoices: false,
  autoPlay: false,
  autoTimer: 0,
  skipType: false,
  portrait: {x: W/2, y: H*0.35, alpha: 0, scale: 0.9, target: 1},
  bg: {scale: 1, offsetX: 0, offsetY: 0, targetScale: 1.05},
  kenBurnsT: 0,
  dialogY: H - 280,
  backlogOpen: false,
  choices: []
};

const store = FX.store('lost-star-vn', {bestChapter: 0, flags: [], done: []});
state.done = store.done || [];
state.flags = store.flags || [];
state.chapter = Math.min(Math.max(0, store.bestChapter || 0), window.A2?.story?.chapters?.length - 1 || 0);

let currentSel = null;
let data = null;

// === HELPERS ===
function chapter() {
  return data?.chapters?.[state.chapter];
}

function line() {
  const ch = chapter();
  if (!ch) return null;
  if (state.reply) return state.reply;
  return ch.lines?.[state.line];
}

function character(id) {
  return window.A2?.characters?.find(c => c.id === id) || {
    id: 'narrator',
    name: '旁白',
    role: '',
    color: '#ffffff'
  };
}

function allowed(ch) {
  if (!ch) return false;
  if (ch.ready === false) return false;
  if (ch.vip && !(window.VIP?.active?.())) return false;
  return true;
}

function persist() {
  store.bestChapter = Math.max(store.bestChapter || 0, state.chapter);
  store.done = [...new Set([...store.done, ...state.done])];
  store.flags = [...new Set([...store.flags, ...state.flags])];
  store.save();
}

// === SCENE MAPPING ===
const sceneMap = {
  town: 'bg-sakura',
  garden: 'bg-garden',
  night: 'bg-moon',
  forest: 'bg-forest',
  neon: 'bg-neon',
  sky: 'bg-sky'
};

function sceneBg(name) {
  return sceneMap[name] || 'bg-sakura';
}

// === RENDER LINE ===
function renderLine() {
  const ln = line();
  if (!ln) return complete();
  
  const char = character(ln.who);
  
  state.currentText = ln.text;
  state.typedChars = 0;
  state.typed = false;
  state.typeTimer = 0;
  state.showChoices = false;
  state.autoTimer = 0;
  
  state.portrait.target = 1;
  state.portrait.alpha = 0;
  
  FX.banner(char.name);
  
  if (ln.mood === 'happy') {
    state.portrait.scale = 1.05;
  } else if (ln.mood === 'sad') {
    state.portrait.scale = 0.95;
  } else if (ln.mood === 'surprised') {
    FX.shake(4);
    state.portrait.scale = 1.1;
  } else {
    state.portrait.scale = 1.0;
  }
  
  persist();
}

// === ADVANCE ===
function advance() {
  if (state.showChoices) return;
  
  if (!state.typed && !state.skipType) {
    state.typed = true;
    state.typedChars = state.currentText.length;
    return;
  }
  
  const ln = line();
  if (!ln) return;
  
  if (ln.choice && ln.choice.length > 0 && !state.reply) {
    state.showChoices = true;
    state.choices = ln.choice;
    state.autoTimer = 0;
    return;
  }
  
  if (state.reply) {
    state.reply = null;
    state.line++;
  } else {
    state.line++;
  }
  
  const ch = chapter();
  if (!ch || state.line >= ch.lines.length) {
    complete();
    return;
  }
  
  renderLine();
}

// === CHOICE ===
function choose(idx) {
  const choice = state.choices[idx];
  if (!choice) return;
  
  state.flags = [...new Set([...state.flags, choice.flag])];
  
  const ln = line();
  state.reply = {
    who: choice.speaker || ln.who,
    text: choice.reply
  };
  
  state.showChoices = false;
  renderLine();
  
  FX.burst(W/2, H*0.6, {n: 30, color: '#ffd700', speed: 200, life: 0.8, size: 6, glow: true});
}

// === COMPLETE CHAPTER ===
function complete() {
  const ch = chapter();
  if (!ch) return;
  
  state.done = [...new Set([...state.done, ch.id])];
  persist();
  try { if (window.Lobby && Lobby.reportFinished) { Lobby.reportFinished(); Lobby.newRound(); } } catch (e) {}
  
  FX.banner('✓ ' + ch.title);
  FX.flash('#ffffff', 0.3);
  FX.burst(W/2, H/2, {n: 50, color: '#ffdd88', speed: 250, life: 1, size: 8, glow: true});
  
  const nextCh = data.chapters[state.chapter + 1];
  const hasNext = nextCh && allowed(nextCh);
  
  setTimeout(() => {
    FX.overlay({
      title: ch.title + ' · 完',
      text: ch.vip ? '这场茶话会，留在你的星糖手账里。' : (hasNext ? '下一站：' + nextCh.title : '我们的下一次相遇'),
      hero: 'lan-chibi',
      html: ch.game ? `<a href="${ch.game}" class="fx-icon" style="display:inline-block;margin:10px 0;padding:10px 20px;background:#6a4a7a;color:#fff;border-radius:12px;text-decoration:none">试玩 ${ch.gameName} →</a>` : '',
      button: hasNext ? '继续下一章' : '回到章节选择',
      onStart: () => {
        if (hasNext) {
          state.chapter++;
          state.line = 0;
          state.reply = null;
          renderLine();
        }
        FX.hideOverlay();
      }
    });
  }, 1000);
}

// === BUTTONS (moved to top-right below HUD) ===
const autoBtn = FX.button({
  icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
  color: '#ff66aa',
  size: 56,
  right: 20,
  top: 80,
  onPress: () => {
    state.autoPlay = !state.autoPlay;
    if (state.autoPlay && state.typed) {
      state.autoTimer = 2.5;
    }
  }
});

const skipBtn = FX.button({
  icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
  color: '#66aaff',
  size: 56,
  right: 90,
  top: 80,
  onPress: () => {
    state.skipType = !state.skipType;
  }
});

const backBtn = FX.button({
  icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
  color: '#aaaaaa',
  size: 56,
  right: 160,
  top: 80,
  onPress: () => {
    state.reply = null;
    state.line = Math.max(0, state.line - 1);
    renderLine();
  }
});

// === TOUCH ===
cv.addEventListener('pointerdown', e => {
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width * W;
  const py = (e.clientY - rect.top) / rect.height * H;
  
  if (state.showChoices) {
    const btnH = 80;
    const gap = 20;
    const startY = H*0.5 - (state.choices.length * (btnH + gap) - gap) / 2;
    
    for (let i = 0; i < state.choices.length; i++) {
      const by = startY + i * (btnH + gap);
      if (py >= by && py <= by + btnH && px >= 40 && px <= W - 40) {
        choose(i);
        return;
      }
    }
  } else if (py > H*0.5) {
    advance();
  }
});

// === UPDATE ===
function update(dt) {
  if (FX.paused) return;
  
  state.portrait.alpha = FX.lerp(state.portrait.alpha, state.portrait.target, dt * 3);
  state.portrait.scale = FX.lerp(state.portrait.scale, 1, dt * 2);
  
  state.kenBurnsT += dt * 0.15;
  const kbProgress = (Math.sin(state.kenBurnsT) + 1) / 2;
  state.bg.targetScale = 1.02 + kbProgress * 0.06;
  state.bg.scale = FX.lerp(state.bg.scale, state.bg.targetScale, dt * 0.3);
  state.bg.offsetX = FX.lerp(state.bg.offsetX, (kbProgress - 0.5) * 40, dt * 0.3);
  state.bg.offsetY = FX.lerp(state.bg.offsetY, (0.5 - kbProgress) * 20, dt * 0.3);
  
  if (!state.typed && !state.skipType) {
    state.typeTimer += dt;
    while (state.typeTimer >= state.typeSpeed) {
      state.typeTimer -= state.typeSpeed;
      state.typedChars++;
      if (state.typedChars >= state.currentText.length) {
        state.typed = true;
        if (state.autoPlay) {
          state.autoTimer = 2.5;
        }
      }
    }
  } else if (!state.typed && state.skipType) {
    state.typed = true;
    state.typedChars = state.currentText.length;
  }
  
  if (state.autoPlay && state.typed && !state.showChoices) {
    state.autoTimer -= dt;
    if (state.autoTimer <= 0) {
      advance();
    }
  }
  
  FX.hud(`
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">${chapter()?.subtitle || ''}</span>
    <span class="chip">第 ${state.line + 1} 句</span>
    ${state.autoPlay ? '<span class="chip">⏵ 自动</span>' : ''}
    ${state.skipType ? '<span class="chip">⏭ 速读</span>' : ''}
    <span class="grow"></span>
  `);
}

// === DRAW ===
function draw(ctx) {
  const ch = chapter();
  if (!ch) return;
  
  const bgImg = FX.img(sceneBg(ch.scene));
  const scale = Math.max(W / bgImg.width, H / bgImg.height) * state.bg.scale;
  const drawW = bgImg.width * scale;
  const drawH = bgImg.height * scale;
  const drawX = W/2 - drawW/2 + state.bg.offsetX;
  const drawY = H/2 - drawH/2 + state.bg.offsetY;
  
  ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
  
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, W, H);
  
  FX.motes(ctx, '#ffffff');
  
  const ln = line();
  if (ln) {
    const char = character(ln.who);
    const portraitImg = FX.img(char.id + '-portrait');
    
    if (state.portrait.alpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = state.portrait.alpha;
      
      if (currentSel?.skin?.filter && currentSel.skin.filter !== 'none') {
        ctx.filter = currentSel.skin.filter;
      }
      
      const portraitH = H * 0.7;
      const portraitY = H - 280 - 20;
      
      FX.drawSprite(ctx, portraitImg, state.portrait.x, portraitY, portraitH, {
        sx: state.portrait.scale,
        sy: state.portrait.scale
      });
      
      ctx.filter = 'none';
      ctx.restore();
    }
  }
  
  ctx.save();
  ctx.fillStyle = 'rgba(20,20,40,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;
  const dialogBox = {x: 30, y: state.dialogY, w: W - 60, h: 220};
  ctx.beginPath();
  ctx.roundRect(dialogBox.x, dialogBox.y, dialogBox.w, dialogBox.h, 20);
  ctx.fill();
  ctx.restore();
  
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(dialogBox.x, dialogBox.y, dialogBox.w, dialogBox.h, 20);
  ctx.stroke();
  
  if (ln) {
    const char = character(ln.who);
    
    ctx.fillStyle = char.color || '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(char.name, dialogBox.x + 25, dialogBox.y + 35);
    
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '16px sans-serif';
    ctx.fillText(char.role, dialogBox.x + 25 + ctx.measureText(char.name).width + 15, dialogBox.y + 35);
    
    const displayText = state.currentText.slice(0, state.typedChars);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    
    const lines = [];
    const words = displayText.split('');
    let currentLine = '';
    const maxWidth = dialogBox.w - 50;
    
    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    let textY = dialogBox.y + 70;
    for (const lineText of lines.slice(0, 4)) {
      ctx.fillText(lineText, dialogBox.x + 25, textY);
      textY += 30;
    }
    
    if (state.typed && !state.showChoices) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '16px sans-serif';
      ctx.fillText('轻点继续　▸', W - 120, state.dialogY + 200);
    }
  }
  
  if (state.showChoices) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    
    const btnW = W - 80;
    const btnH = 80;
    const gap = 20;
    const totalH = state.choices.length * (btnH + gap) - gap;
    let btnY = H*0.5 - totalH/2;
    
    for (let i = 0; i < state.choices.length; i++) {
      const choice = state.choices[i];
      
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 15;
      
      const grad = ctx.createLinearGradient(40, btnY, 40, btnY + btnH);
      grad.addColorStop(0, '#6a4a7a');
      grad.addColorStop(1, '#4a2a5a');
      ctx.fillStyle = grad;
      
      ctx.beginPath();
      ctx.roundRect(40, btnY, btnW, btnH, 15);
      ctx.fill();
      
      ctx.strokeStyle = '#aa88bb';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(choice.text, W/2, btnY + btnH/2);
      
      btnY += btnH + gap;
    }
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

// === START ===
function startGame(sel) {
  currentSel = sel;
  
  if (!data) {
    data = window.A2?.story;
  }
  
  if (!data || !data.chapters) {
    console.error('Story data not loaded');
    return;
  }
  
  const ch = chapter();
  if (!ch || !allowed(ch)) {
    state.chapter = 0;
    state.line = 0;
  }
  
  renderLine();
  
  FX.running = true;
  FX.loop(update, draw);
}

// === INIT ===
const assets = [
  'bg-sakura', 'bg-garden', 'bg-moon', 'bg-forest', 'bg-neon', 'bg-sky',
  'lan-portrait', 'mo-portrait', 'li-portrait', 'xing-portrait', 'hu-portrait',
  'lan-chibi', 'mo-chibi', 'li-chibi', 'xing-chibi', 'hu-chibi'
];

FX.load(assets).then(() => {
  data = window.A2?.story;
  
  if (!data) {
    console.error('Story data not found in window.A2.story');
    return;
  }
  
  const stages = (data.chapters || []).map((ch, i) => ({
    id: ch.id,
    name: ch.title,
    bg: sceneBg(ch.scene),
    locked: !allowed(ch)
  }));
  
  const chars = (window.A2?.characters || []).map(c => ({
    id: c.id,
    name: c.name,
    img: c.id + '-portrait',
    chibi: c.id + '-chibi',
    stats: {hp: 100, atk: 80, def: 70, spd: 90}
  }));
  
  window.Lobby.init({
    id: 'lost-star',
    title: '丢失的第六颗星',
    orientation: 'portrait',
    bg: ['bg-moon', 'prop-flowers'],
    modes: [{id: 'story', icon: 'item-star'}],
    stages: stages,
    chars: chars,
    skins: [
      {id: 'default', name: '原始', filter: 'none', rarity: 'N'},
      {id: 'warm', name: '暖阳', filter: 'hue-rotate(10deg) saturate(1.2)', rarity: 'R'},
      {id: 'cool', name: '月光', filter: 'hue-rotate(200deg) saturate(1.1) brightness(1.05)', rarity: 'R'},
      {id: 'star', name: '星耀', filter: 'hue-rotate(280deg) saturate(1.4) brightness(1.1)', rarity: 'SR', vip: true}
    ],
    currency: [{id: 'star', icon: 'item-star'}],
    onStart: startGame,
    onQuit: () => { FX.running = false; },
    onSkinChange: sel => { currentSel = sel; }
  });
});

window.__game = {
  state: () => ({
    chapter: state.chapter,
    line: state.line,
    chapterName: chapter()?.title || '',
    character: line()?.who || '',
    text: state.currentText.slice(0, state.typedChars),
    typed: state.typed,
    choices: state.showChoices ? state.choices.map(c => c.text) : [],
    flags: state.flags.length,
    completed: state.done.length,
    autoPlay: state.autoPlay,
    skipType: state.skipType
  })
};

})();
