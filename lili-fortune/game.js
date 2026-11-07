// 栗栗今日小运势 - game.js
(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: false, logicalH: 1170});

// === STATE ===
let currentSel = null;
let gameMode = null;
let drawState = null;
let drawPhase = 0;
let drawPhaseTime = 0;
let catchScore = 0;
let catchTimer = 0;
let catchCombo = 0;
let catchComboTimer = 0;
let basket = null;
let fallingObjs = [];
let albumPanel = null;
let selectedCard = null;
let pointerX = null;

const store = FX.store('lili-fortune', {
  totalDraws: 0,
  streak: 0,
  lastDrawDate: null,
  album: [],
  catchBest: 0,
  catchPlaysToday: 0,
  catchPlayDate: null
});

// === FORTUNE DATA ===
const RARITIES = [
  {name: '大吉', rarity: 'SSR', color: '#ffd700', weight: 0.05},
  {name: '中吉', rarity: 'SR', color: '#ff69b4', weight: 0.12},
  {name: '小吉', rarity: 'R', color: '#66ddff', weight: 0.23},
  {name: '吉', rarity: 'N', color: '#aaaaaa', weight: 0.30},
  {name: '平稳', rarity: 'N', color: '#999999', weight: 0.20},
  {name: '小确幸', rarity: 'R', color: '#ffcc99', weight: 0.10}
];

const COLORS = [
  {name: '栗子棕', hex: '#a0522d'},
  {name: '奶油白', hex: '#fffacd'},
  {name: '薄荷绿', hex: '#98ff98'},
  {name: '蜜桃粉', hex: '#ffc0cb'},
  {name: '雾霾蓝', hex: '#87ceeb'},
  {name: '柠檬黄', hex: '#ffff99'},
  {name: '焦糖橙', hex: '#ff9966'}
];

const THINGS = [
  '热可可', '散步十分钟', '整理书桌', '给朋友发消息', '早睡一小时',
  '听一首老歌', '吃点甜的', '看一部喜欢的动画', '写日记', '和家人聊天',
  '伸一个懒腰', '闻一闻鲜花', '拍一张好看的照片', '整理一下房间', '喝一杯温水',
  '看窗外风景', '做个鬼脸', '换个发型', '穿喜欢的衣服', '买束花'
];

const ADVICES = [
  '慢慢来，比较快。', '今天的你，值得一颗糖。', '小事做好，就是大事。',
  '好运正在排队来找你。', '先照顾好自己，再照顾世界。', '有点累就歇一下，没关系。',
  '你笑起来的时候，运气最好。', '每一天都是新开始。', '相信自己，会有惊喜的。',
  '做喜欢的事，就是最好的运气。', '温柔待己，善待他人。', '一点点进步，就是成功。',
  '今天比昨天更闪亮。', '命运掌握在自己手中。', '小小的梦想，也能闪闪发光。',
  '你值得最好的一切。', '坚持下去，会看见彩虹。', '今天的困难，明天的笑话。',
  '给自己一个微笑吧。', '幸运总是在不期而遇。', '让心情也休息一下。',
  '微笑是最好的回应。', '你已经很努力了。', '未来会更好的。',
  '珍惜当下的美好。', '相信直觉，大胆去做。', '失败也没关系，继续就赢了。',
  '今天的投资是明天的回报。', '慢下来，感受生活。', '你比自己想象的更强大。',
  '今天也要元气满满。', '小确幸就在身边。', '做自己就是最好的。',
  '时间会证明一切。', '坚持自己的梦想。', '生活本就美好。',
  '今天是新的开始。', '幸福很简单。', '享受当下的每一刻。', '你一定可以的。'
];

// === HELPERS ===
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function getFortuneForToday(name, seed) {
  const baseSeed = seed !== undefined ? seed : hash((name || 'lili') + today());
  
  const rnd = (idx) => {
    return ((((baseSeed * 73856093) ^ (idx * 19349663)) >>> 0) % 10000) / 10000;
  };
  
  let rarityRoll = rnd(0);
  let rarity = RARITIES[0];
  let cumWeight = 0;
  for (let i = 0; i < RARITIES.length; i++) {
    const r = RARITIES[i];
    cumWeight += r.weight;
    if (rarityRoll < cumWeight) {
      rarity = r;
      break;
    }
  }
  
  const colorIdx = Math.floor(rnd(1) * COLORS.length);
  const color = COLORS[colorIdx];
  const adviceIdx = Math.floor(rnd(2) * ADVICES.length);
  const advice = ADVICES[adviceIdx];
  const itemIdx = Math.floor(rnd(3) * THINGS.length);
  const item = THINGS[itemIdx];
  const luckNumber = Math.floor(rnd(4) * 9) + 1;
  
  return {
    name: rarity.name,
    rarity: rarity.rarity,
    rarityColor: rarity.color,
    color: color.name,
    colorHex: color.hex,
    advice,
    item,
    luckNumber,
    seed: baseSeed
  };
}

function getAllPossibleCards() {
  const cards = [];
  for (let seed = 0; seed < 50; seed++) {
    cards.push(getFortuneForToday('lili', seed));
  }
  return cards;
}

function recordDrawInAlbum(fortune) {
  const entry = {
    date: today(),
    fortune: fortune.name,
    rarity: fortune.rarity,
    color: fortune.color,
    colorHex: fortune.colorHex,
    item: fortune.item,
    advice: fortune.advice,
    luckNumber: fortune.luckNumber,
    rarityColor: fortune.rarityColor,
    seed: fortune.seed
  };
  
  const album = store.album || [];
  album.push(entry);
  store.album = album;
  store.save();
}

// === ALBUM UI ===
function openAlbumPanel() {
  if (albumPanel) return;
  
  const panel = document.createElement('div');
  panel.className = 'album-panel';
  panel.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, #ffeef8 0%, #fff5e6 100%);
    overflow-y: auto;
    z-index: 10000;
    padding: 20px;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding: 10px;
    background: rgba(255,255,255,0.8);
    border-radius: 12px;
  `;
  
  const title = document.createElement('div');
  title.textContent = '📖 卡片收藏';
  title.style.cssText = `
    font-size: 28px;
    font-weight: bold;
    color: #333;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    width: 44px;
    height: 44px;
    border: none;
    background: #ff6b9d;
    color: white;
    font-size: 24px;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  closeBtn.onclick = closeAlbumPanel;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);
  
  const album = store.album || [];
  const allCards = getAllPossibleCards();
  
  const stats = document.createElement('div');
  stats.style.cssText = `
    padding: 15px;
    background: rgba(255,255,255,0.9);
    border-radius: 12px;
    margin-bottom: 20px;
    text-align: center;
    font-size: 18px;
    color: #666;
  `;
  stats.textContent = `已收集 ${album.length} / ${allCards.length} 张卡片`;
  panel.appendChild(stats);
  
  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(4, minmax(0,1fr)); box-sizing:border-box; width:100%;
    gap: 12px;
    padding-bottom: 40px;
  `;
  
  const collectedSeeds = new Set(album.map(c => c.seed));
  
  for (let i = 0; i < allCards.length; i++) {
    const card = allCards[i];
    const isCollected = collectedSeeds.has(card.seed);
    const collectedCard = isCollected ? album.find(c => c.seed === card.seed) : null;
    
    const cardEl = document.createElement('div');
    cardEl.style.cssText = `
      aspect-ratio: 3/4;
      background: ${isCollected ? 'white' : 'rgba(100,100,100,0.3)'};
      border: 3px solid ${card.rarityColor};
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    `;
    
    if (isCollected) {
      const fortune = document.createElement('div');
      fortune.textContent = card.name;
      fortune.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: ${card.rarityColor};
        margin-bottom: 6px;
      `;
      
      const rarity = document.createElement('div');
      rarity.textContent = card.rarity;
      rarity.style.cssText = `
        font-size: 12px;
        color: ${card.rarityColor};
        margin-bottom: 6px;
      `;
      
      const color = document.createElement('div');
      color.textContent = card.color;
      color.style.cssText = `
        font-size: 10px;
        color: #666;
        margin-top: auto;
      `;
      
      cardEl.appendChild(fortune);
      cardEl.appendChild(rarity);
      cardEl.appendChild(color);
      
      cardEl.onclick = () => showCardDetail(collectedCard || card);
    } else {
      const placeholder = document.createElement('div');
      placeholder.textContent = '?';
      placeholder.style.cssText = `
        font-size: 48px;
        color: rgba(255,255,255,0.5);
        font-weight: bold;
      `;
      
      const rarity = document.createElement('div');
      rarity.textContent = card.rarity;
      rarity.style.cssText = `
        font-size: 12px;
        color: rgba(255,255,255,0.6);
        margin-top: 8px;
      `;
      
      cardEl.appendChild(placeholder);
      cardEl.appendChild(rarity);
    }
    
    grid.appendChild(cardEl);
  }
  
  panel.appendChild(grid);
  
  const stage = document.querySelector('.fx-stage');
  if (stage) {
    stage.appendChild(panel);
    albumPanel = panel;
  }
}

function closeAlbumPanel() {
  if (albumPanel) {
    albumPanel.remove();
    albumPanel = null;
  }
  if (selectedCard) {
    selectedCard.remove();
    selectedCard = null;
  }
}

function showCardDetail(card) {
  if (selectedCard) {
    selectedCard.remove();
  }
  
  const detail = document.createElement('div');
  detail.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 85%;
    max-width: 400px;
    background: white;
    border: 5px solid ${card.rarityColor};
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 11000;
    animation: cardFlip 0.5s ease;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cardFlip {
      0% { transform: translate(-50%, -50%) rotateY(90deg) scale(0.5); }
      100% { transform: translate(-50%, -50%) rotateY(0deg) scale(1); }
    }
  `;
  document.head.appendChild(style);
  
  detail.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: ${card.rarityColor}; margin-bottom: 15px;">
        ${card.fortune}
      </div>
      <div style="font-size: 20px; color: #888; margin-bottom: 25px;">
        [ ${card.rarity} ]
      </div>
      <div style="font-size: 18px; color: ${card.colorHex}; margin-bottom: 20px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 8px;">
        幸运色：${card.color}
      </div>
      <div style="font-size: 16px; color: #333; margin-bottom: 15px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 8px;">
        宜：${card.item}
      </div>
      <div style="font-size: 16px; color: #333; margin-bottom: 25px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 8px;">
        幸运数字：${card.luckNumber}
      </div>
      <div style="font-size: 15px; color: #666; font-style: italic; line-height: 1.8; margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.5); border-radius: 8px; border-left: 3px solid ${card.rarityColor};">
        ${card.advice}
      </div>
      <div style="font-size: 12px; color: #aaa;">
        ${card.date || '珍藏'}
      </div>
    </div>
  `;
  
  detail.onclick = () => {
    detail.remove();
    selectedCard = null;
  };
  
  document.body.appendChild(detail);
  selectedCard = detail;
}

// === DRAW MODE ===
function startDraw(sel) {
  currentSel = sel;
  gameMode = 'draw';
  drawState = null;
  drawPhase = 0;
  drawPhaseTime = 0;
  
  const fortune = getFortuneForToday(sel.char || 'li');
  drawState = fortune;
  
  store.totalDraws = (store.totalDraws || 0) + 1;
  
  const lastDate = store.lastDrawDate;
  if (lastDate === today()) {
    store.streak = (store.streak || 1);
  } else {
    store.streak = 1;
  }
  store.lastDrawDate = today();
  store.save();
  
  recordDrawInAlbum(fortune);
  
  FX.banner('🎰 准备抽卡...');
  FX.shake(8);
  FX.burst(W/2, H/2, {n: 40, color: '#ffd700', speed: 200, life: 1, size: 8, glow: true});
  
  updateDrawHUD();
  
  FX.running = true;
  FX.loop(updateDraw, drawDraw);
}

let albumBtn = null;
let catchBtn = null;

function updateDrawHUD() {
  FX.hud(`
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">✨ 栗栗</span>
    <span class="chip">📊 ${store.totalDraws} 次</span>
    <span class="chip">🔥 ${store.streak} 天</span>
    <span class="grow"></span>
  `);
  
  if (!albumBtn) {
    albumBtn = FX.button({
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm0 2v16h12V4H6zm2 2h8v2H8V6zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>',
      color: '#ff69b4',
      size: 70,
      right: 20,
      bottom: 220,
      key: 'KeyB',
      onPress: () => {
        if (FX.running && !FX.paused && gameMode !== 'catch') {
          openAlbumPanel();
        }
      }
    });
  }
  
  if (!catchBtn) {
    catchBtn = FX.button({
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 12l3-3 3 3-3 3-3-3zm7 0l3-3 3 3-3 3-3-3zm7 0l3-3 3 3-3 3-3-3z"/></svg>',
      color: '#66ddff',
      size: 70,
      right: 20,
      bottom: 130,
      key: 'KeyC',
      onPress: () => {
        if (FX.running && !FX.paused && gameMode !== 'catch') {
          closeAlbumPanel();
          startCatch(currentSel);
        }
      }
    });
  }
}

function updateDraw(dt) {
  if (FX.paused) return;
  
  drawPhaseTime += dt;
  
  if (drawPhase === 0 && drawPhaseTime < 1.5) {
    FX.shake(Math.sin(drawPhaseTime * Math.PI * 4) * 5);
  } else if (drawPhase === 0 && drawPhaseTime >= 1.5) {
    drawPhase = 1;
    drawPhaseTime = 0;
    FX.banner('🎊 好运来了！');
    FX.burst(W/2, H/2, {n: 60, color: drawState.rarityColor, speed: 250, life: 1.2, size: 10, glow: true});
    FX.ring(W/2, H/2, {color: drawState.rarityColor, r: 200, life: 1});
  }
}

function drawDraw(ctx) {
  const bgImg = FX.img('bg-sakura');
  const scale = Math.max(W / 640, H / 360);
  const bgW = 640 * scale;
  const bgH = 360 * scale;
  const bgX = (W - bgW) / 2;
  const bgY = (H - bgH) / 2;
  ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  
  FX.motes(ctx, drawState ? drawState.colorHex : '#ffb3d9');
  
  const lanternImg = FX.img('prop-lantern');
  for (let i = 0; i < 3; i++) {
    const x = W * (0.2 + i * 0.3);
    const y = 250 + Math.sin(FX.time * 2 + i * 2) * 20;
    FX.drawSprite(ctx, lanternImg, x, y, 180, {alpha: 0.8});
  }
  
  const charKey = currentSel && currentSel.char ? currentSel.char : 'li';
  const chibis = {lan: 'whale-idle', mo: 'mo-chibi', li: 'li-chibi', xing: 'xing-chibi', hu: 'hu-chibi'};
  const charImg = FX.img(chibis[charKey]);
  const bobOffset = Math.sin(FX.time * 3) * 15;
  FX.drawSprite(ctx, charImg, W/4 + 40, H * 0.6 + bobOffset, 200, {});
  
  if (!drawState) {
    FX.drawFX(ctx);
    FX.vignette(ctx);
    return;
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, W, H);
  
  const cardW = Math.min(380, W - 40);
  const cardH = 680;
  const cardX = (W - cardW) / 2;
  const cardY = (H - cardH) / 2;
  
  ctx.fillStyle = drawState.rarityColor;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(cardX - 15, cardY - 15, cardW + 30, cardH + 30);
  
  ctx.fillStyle = '#fafafa';
  ctx.globalAlpha = 1;
  ctx.fillRect(cardX, cardY, cardW, cardH);
  
  ctx.strokeStyle = drawState.rarityColor;
  ctx.lineWidth = 5;
  ctx.strokeRect(cardX, cardY, cardW, cardH);
  
  ctx.fillStyle = drawState.rarityColor;
  const cornerSize = 15;
  ctx.fillRect(cardX, cardY, cornerSize, cornerSize);
  ctx.fillRect(cardX + cardW - cornerSize, cardY, cornerSize, cornerSize);
  ctx.fillRect(cardX, cardY + cardH - cornerSize, cornerSize, cornerSize);
  ctx.fillRect(cardX + cardW - cornerSize, cardY + cardH - cornerSize, cornerSize, cornerSize);
  
  ctx.fillStyle = drawState.rarityColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(drawState.name, W/2, cardY + 90);
  
  ctx.font = '28px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('[ ' + drawState.rarity + ' ]', W/2, cardY + 160);
  
  ctx.fillStyle = drawState.colorHex;
  ctx.font = '26px sans-serif';
  ctx.fillText('幸运色：' + drawState.color, W/2, cardY + 240);
  
  ctx.fillStyle = '#333';
  ctx.font = '24px sans-serif';
  ctx.fillText('宜：' + drawState.item, W/2, cardY + 310);
  
  ctx.fillText('幸运数字：' + drawState.luckNumber, W/2, cardY + 370);
  
  ctx.font = 'italic 22px sans-serif';
  ctx.fillStyle = '#666';
  const adviceLines = drawState.advice.match(/.{1,16}/g) || [drawState.advice];
  let advY = cardY + 480;
  for (let i = 0; i < adviceLines.length; i++) {
    ctx.fillText(adviceLines[i], W/2, advY + i * 45);
  }
  
  ctx.fillStyle = '#aaa';
  ctx.font = '18px sans-serif';
  ctx.fillText('仅供娱乐 · 栗栗的小工具', W/2, cardY + cardH - 30);
  
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

// === CATCH MODE ===
let spawnCatchTimer = 0;
let difficultyTimer = 0;
let spawnRate = 0.8;

function startCatch(sel) {
  currentSel = sel;
  gameMode = 'catch';
  catchScore = 0;
  catchTimer = 45;
  catchCombo = 0;
  catchComboTimer = 0;
  fallingObjs = [];
  spawnCatchTimer = 0;
  difficultyTimer = 0;
  spawnRate = 0.8;
  pointerX = W / 2;
  
  basket = {x: W/2, y: H - 170, w: 120, h: 80, vx: 0};
  
  FX.banner('⭐ 45秒接幸运符！');
  updateCatchHUD();
  
  cv.addEventListener('pointermove', handleCatchPointer);
  cv.addEventListener('pointerdown', handleCatchPointer);
  
  FX.running = true;
  FX.loop(updateCatch, drawCatch);
}

function handleCatchPointer(e) {
  if (gameMode !== 'catch' || FX.paused) return;
  const rect = cv.getBoundingClientRect();
  pointerX = (e.clientX - rect.left) * W / rect.width;
}

function updateCatchHUD() {
  FX.hud(`
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">⭐ ${Math.floor(catchScore)}</span>
    <span class="chip">⏱ ${Math.ceil(catchTimer)}s</span>
    ${catchCombo > 1 ? `<span class="chip">🔥 ${catchCombo}连击</span>` : ''}
    <span class="grow"></span>
  `);
}

function updateCatch(dt) {
  if (FX.paused) return;
  
  catchTimer -= dt;
  difficultyTimer += dt;
  
  if (difficultyTimer > 10) {
    spawnRate = Math.max(0.3, spawnRate - 0.05);
    difficultyTimer = 0;
  }
  
  if (pointerX !== null) {
    const targetX = pointerX;
    basket.x += (targetX - basket.x) * 10 * dt;
  }
  basket.x = Math.max(basket.w/2, Math.min(W - basket.w/2, basket.x));
  
  spawnCatchTimer -= dt;
  if (spawnCatchTimer <= 0) {
    const roll = Math.random();
    let type = 'star';
    if (roll < 0.15) type = 'cloud';
    else if (roll < 0.35) type = 'heart';
    else if (roll < 0.38) type = 'charm';
    
    fallingObjs.push({
      x: Math.random() * W,
      y: -50,
      w: 50,
      h: 50,
      vy: 150 + Math.random() * 150,
      type,
      collected: false
    });
    spawnCatchTimer = spawnRate + Math.random() * 0.3;
  }
  
  catchComboTimer -= dt;
  if (catchComboTimer <= 0) {
    catchCombo = 0;
  }
  
  for (let i = 0; i < fallingObjs.length; i++) {
    const obj = fallingObjs[i];
    if (obj.collected) continue;
    
    obj.y += obj.vy * dt;
    
    if (obj.y + obj.h > basket.y - 10 && 
        obj.y < basket.y + basket.h + 10 &&
        obj.x + obj.w > basket.x - basket.w/2 &&
        obj.x < basket.x + basket.w/2) {
      
      if (obj.type === 'cloud') {
        catchScore = Math.max(0, catchScore - 15);
        catchCombo = 0;
        FX.text(obj.x, obj.y, '-15', {color: '#ff6666', size: 28});
        FX.burst(obj.x, obj.y, {n: 20, color: '#888888', speed: 180, life: 0.6, size: 6});
        FX.shake(5);
      } else {
        let value = obj.type === 'star' ? 10 : (obj.type === 'heart' ? 20 : 50);
        catchCombo++;
        catchComboTimer = 2;
        
        if (catchCombo > 2) {
          value = Math.floor(value * (1 + catchCombo * 0.1));
        }
        
        catchScore += value;
        FX.text(obj.x, obj.y, '+' + value, {color: obj.type === 'charm' ? '#ffd700' : '#ffdd00', size: obj.type === 'charm' ? 36 : 28, crit: obj.type === 'charm'});
        FX.burst(obj.x, obj.y, {n: 25, color: obj.type === 'star' ? '#ffd700' : (obj.type === 'heart' ? '#ff69b4' : '#ff8c00'), speed: 200, life: 0.7, size: 8, glow: true});
        FX.shake(obj.type === 'charm' ? 8 : 3);
      }
      
      obj.collected = true;
      updateCatchHUD();
    }
    
    if (obj.y > H + 100) obj.collected = true;
  }
  
  fallingObjs = fallingObjs.filter(obj => !obj.collected);
  
  if (catchTimer <= 0) {
    gameOver_Catch();
  }
}

function drawCatch(ctx) {
  const bgImg = FX.img('bg-sky');
  const scale = Math.max(W / 640, H / 360);
  const bgW = 640 * scale;
  const bgH = 360 * scale;
  const bgX = (W - bgW) / 2;
  const bgY = (H - bgH) / 2;
  ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  
  FX.motes(ctx, '#aaddff');
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, H - 200, W, 200);
  
  for (let i = 0; i < fallingObjs.length; i++) {
    const obj = fallingObjs[i];
    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (obj.type === 'star') {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('⭐', obj.x, obj.y + 25);
    } else if (obj.type === 'heart') {
      ctx.fillStyle = '#ff69b4';
      ctx.fillText('💖', obj.x, obj.y + 25);
    } else if (obj.type === 'charm') {
      ctx.fillStyle = '#ff8c00';
      ctx.fillText('🧧', obj.x, obj.y + 25);
    } else {
      ctx.fillStyle = '#cccccc';
      ctx.fillText('☁', obj.x, obj.y + 25);
    }
  }
  
  const liImg = FX.img('li-chibi');
  FX.drawSprite(ctx, liImg, basket.x, basket.y + basket.h, 150, {});
  
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(basket.x - basket.w/2, basket.y, basket.w, basket.h);
  
  ctx.strokeStyle = '#a0826d';
  ctx.lineWidth = 3;
  ctx.strokeRect(basket.x - basket.w/2, basket.y, basket.w, basket.h);
  
  ctx.fillStyle = '#d2b48c';
  for (let i = 0; i < 5; i++) {
    const xx = basket.x - basket.w/2 + (i + 1) * basket.w / 6;
    ctx.fillRect(xx - 2, basket.y, 4, basket.h);
  }
  
  ctx.fillStyle = catchTimer <= 10 ? '#ff6666' : '#333';
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(Math.ceil(catchTimer), W/2, 80);
  
  if (catchCombo > 1) {
    ctx.fillStyle = '#ff6b00';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('🔥 ' + catchCombo + ' 连击！', W/2, 180);
  }
  
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

function gameOver_Catch() {
  FX.running = false;
  
  cv.removeEventListener('pointermove', handleCatchPointer);
  cv.removeEventListener('pointerdown', handleCatchPointer);
  
  const stars = Math.min(3, Math.floor(catchScore / 100));
  
  store.catchBest = Math.max(store.catchBest || 0, catchScore);
  
  const playDate = store.catchPlayDate;
  if (playDate !== today()) {
    store.catchPlaysToday = 0;
    store.catchPlayDate = today();
  }
  
  const bonusDraws = Math.min(3 - (store.catchPlaysToday || 0), Math.floor(catchScore / 100));
  store.catchPlaysToday = (store.catchPlaysToday || 0) + bonusDraws;
  store.save();
  
  Lobby.reportResult({
    win: true,
    stage: 1,
    stars,
    coins: Math.floor(catchScore),
    gems: bonusDraws
  });
}

// === LOBBY INIT ===
const assets = [
  'bg-sakura', 'bg-sky', 'bg-garden',
  'li-chibi', 'mo-chibi', 'xing-chibi', 'hu-chibi', 'whale-idle',
  'prop-lantern',
  'item-star', 'item-heart', 'item-chest', 'item-weapon'
];

FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'lili-fortune',
    title: '🔮 栗栗今日小运势',
    orientation: 'portrait',
    bg: ['bg-sakura', 'bg-sky', 'bg-garden'],
    modes: [
      {id: 'draw', name: '今日运势'},
      {id: 'catch', name: '接幸运符'},
      {id: 'album', name: '卡片集'}
    ],
    stages: [
      {id: 's0', name: '今日抽卡', bg: 'bg-sakura'},
      {id: 's1', name: '接幸运符', bg: 'bg-sky'},
      {id: 's2', name: '卡片收藏', bg: 'bg-garden'}
    ],
    chars: [
      {id: 'li', name: '栗栗', img: 'li-chibi', chibi: 'li-chibi', hp: 100, atk: 80, speed: 100},
      {id: 'mo', name: '墨', img: 'mo-chibi', chibi: 'mo-chibi', hp: 90, atk: 90, speed: 110},
      {id: 'xing', name: '星', img: 'xing-chibi', chibi: 'xing-chibi', hp: 85, atk: 100, speed: 120}
    ],
    skins: [
      {name: '原始', filter: 'none'},
      {name: '樱糖', filter: 'hue-rotate(20deg) saturate(1.3)', rarity: 'SR', vip: true},
      {name: '星河', filter: 'hue-rotate(200deg) saturate(1.2) brightness(1.1)', rarity: 'SSR', vip: true}
    ],
    currency: [
      {id: 'coin', icon: 'item-chest'},
      {id: 'gem', icon: 'item-star'}
    ],
    onStart: (sel) => {
      if (sel.stage === 0 || sel.mode === 'draw') {
        startDraw(sel);
      } else if (sel.stage === 1 || sel.mode === 'catch') {
        startCatch(sel);
      } else {
        startDraw(sel);
      }
    },
    onQuit: () => {
      FX.running = false;
      closeAlbumPanel();
      if (gameMode === 'catch') {
        cv.removeEventListener('pointermove', handleCatchPointer);
        cv.removeEventListener('pointerdown', handleCatchPointer);
      }
    }
  });
});

window.__game = {
  state: () => ({
    mode: gameMode,
    totalDraws: store.totalDraws || 0,
    streak: store.streak || 0,
    albumSize: (store.album || []).length,
    catchBest: store.catchBest || 0,
    currentFortune: drawState ? {name: drawState.name, rarity: drawState.rarity} : null,
    catchScore: gameMode === 'catch' ? Math.floor(catchScore) : 0,
    catchCombo: gameMode === 'catch' ? catchCombo : 0
  }),
  open: (mode) => {
    if (mode === 'album') {
      if (!currentSel) {
        currentSel = {char: 'li', stage: 0, mode: 'draw'};
      }
      if (gameMode !== 'draw') {
        startDraw(currentSel);
      }
      openAlbumPanel();
    } else if (mode === 'catch') {
      closeAlbumPanel();
      if (!currentSel) {
        currentSel = {char: 'li', stage: 1, mode: 'catch'};
      }
      startCatch(currentSel);
    } else if (mode === 'draw') {
      closeAlbumPanel();
      if (!currentSel) {
        currentSel = {char: 'li', stage: 0, mode: 'draw'};
      }
      startDraw(currentSel);
    }
  }
};

})();
