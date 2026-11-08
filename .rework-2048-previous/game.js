// 栗栗的美食 2048 (lili-2048) - game.js
(function() {
'use strict';
GameAudio.mount();
GameAudio.setPauseCheck(() => FX.paused || !FX.running);

const {cv, ctx, W, H} = FX.init({landscape: false});

// === CONSTANTS ===
const TILE_COLORS = [
  '#f2e5ff','#dbefff','#ddf7ee','#ffe2e9','#fff0d1',
  '#e9d5ff','#cbe8f4','#f5cce4','#d9e6ff','#e9dbff','#fff0b8'
];

const TIER_COLORS = [
  {frame: '#e8b4f8', glow: '#d580ff'},
  {frame: '#a8d8ff', glow: '#5eb3ff'},
  {frame: '#98f0e6', glow: '#4dd9d0'},
  {frame: '#ffb3d9', glow: '#ff6eb4'},
  {frame: '#ffe8a8', glow: '#ffd966'},
  {frame: '#d4c4ff', glow: '#9f7eff'},
  {frame: '#b8dff8', glow: '#7ab8ff'},
  {frame: '#f0c4e8', glow: '#e89bd9'},
  {frame: '#c8deff', glow: '#8fb5ff'},
  {frame: '#dcc8ff', glow: '#b395ff'},
  {frame: '#fff4b8', glow: '#ffeb7a'},
  {frame: '#ffd700', glow: '#ffaa00'}
];

// === IMAGE & TILE CACHE ===
const tileImageCache = new Map();
const tileSpriteCache = new Map();

function getTileImage(value) {
  const tier = Math.min(value, 11);
  const key = `t2048-${tier}`;
  
  if (tileImageCache.has(key)) {
    return tileImageCache.get(key);
  }
  
  const img = FX.img(key);
  tileImageCache.set(key, img);
  return img;
}

function getCachedTileSprite(value, size) {
  const key = `${value}_${size}`;
  if (tileSpriteCache.has(key)) return tileSpriteCache.get(key);
  
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  
  if (value < 0) {
    c.fillStyle = '#888888';
    c.beginPath();
    c.roundRect(0, 0, size, size, 12);
    c.fill();
    c.strokeStyle = '#666666';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(size/3, size/3);
    c.lineTo(2*size/3, 2*size/3);
    c.moveTo(2*size/3, size/3);
    c.lineTo(size/3, 2*size/3);
    c.stroke();
  } else if (value === 0) {
    c.fillStyle = 'rgba(239, 227, 204, 0.4)';
    c.beginPath();
    c.roundRect(0, 0, size, size, 12);
    c.fill();
  } else {
    const tierIdx = Math.min(value, 11);
    const tierColor = TIER_COLORS[tierIdx - 1];
    
    const grad = c.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, tierColor.frame);
    grad.addColorStop(1, adjustColor(tierColor.frame, -25));
    
    c.fillStyle = grad;
    c.shadowColor = tierColor.glow;
    c.shadowBlur = 16;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 2;
    
    c.beginPath();
    c.roundRect(4, 4, size - 8, size - 8, 14);
    c.fill();
    
    c.shadowBlur = 0;
    c.shadowColor = 'transparent';
    
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    c.beginPath();
    c.roundRect(4, 4, size - 8, size * 0.25, 14);
    c.fill();
    
    const imgSize = Math.floor(size * 0.82);
    const imgX = (size - imgSize) / 2;
    const imgY = (size - imgSize) * 0.35;
    
    try {
      const tileImg = getTileImage(value);
      if (tileImg.complete || tileImg.width > 0) {
        c.drawImage(tileImg, imgX, imgY, imgSize, imgSize);
      }
    } catch (e) {
      c.fillStyle = '#cccccc';
      c.fillRect(imgX, imgY, imgSize, imgSize);
    }
    
    const pillHeight = Math.floor(size * 0.22);
    const pillY = size - pillHeight - 4;
    
    c.fillStyle = 'rgba(0, 0, 0, 0.15)';
    c.beginPath();
    c.roundRect(size * 0.1, pillY, size * 0.8, pillHeight, 8);
    c.fill();
    
    c.fillStyle = 'rgba(255, 255, 255, 0.9)';
    c.font = `bold ${Math.floor(size * 0.14)}px sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(Math.pow(2, value)), size / 2, pillY + pillHeight / 2);
  }
  
  tileSpriteCache.set(key, canvas);
  return canvas;
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// === STATE ===
let currentSel = null;
let gridSize = 4;
let grid = [];
let score = 0;
let moveHistory = [];
let targetTile = 8;
let blockers = [];
let undoUses = 3;
let bombUses = 2;
let shuffleUses = 1;

let tileAnims = [];
let mergeAnims = [];
let spawnAnims = [];
let chibiState = 'idle';
let chibiT = 0;
let comboCurrent = 0;
let comboTimer = 0;

const store = FX.store('lili-2048', {bestScore:0, bestStage:0});

// === TILE ANIMATION ===
class TileAnim {
  constructor(fromRow, fromCol, toRow, toCol, value, isMerge) {
    this.fromRow = fromRow;
    this.fromCol = fromCol;
    this.toRow = toRow;
    this.toCol = toCol;
    this.value = value;
    this.isMerge = isMerge;
    this.t = 0;
    this.duration = 0.12;
  }
  
  update(dt) {
    this.t += dt;
    return this.t >= this.duration;
  }
  
  getPos(tileSize, gridX, gridY, gap) {
    const progress = FX.ease.outCubic(Math.min(this.t / this.duration, 1));
    const fromX = gridX + this.fromCol * (tileSize + gap) + tileSize/2;
    const fromY = gridY + this.fromRow * (tileSize + gap) + tileSize/2;
    const toX = gridX + this.toCol * (tileSize + gap) + tileSize/2;
    const toY = gridY + this.toRow * (tileSize + gap) + tileSize/2;
    return {
      x: FX.lerp(fromX, toX, progress),
      y: FX.lerp(fromY, toY, progress)
    };
  }
}

class MergeAnim {
  constructor(row, col, value) {
    this.row = row;
    this.col = col;
    this.value = value;
    this.t = 0;
    this.duration = 0.2;
  }
  
  update(dt) {
    this.t += dt;
    return this.t >= this.duration;
  }
  
  getScale() {
    const t = this.t / this.duration;
    if (t < 0.5) {
      return 1 + FX.ease.outCubic(t * 2) * 0.3;
    } else {
      return 1.3 - FX.ease.outCubic((t - 0.5) * 2) * 0.3;
    }
  }
}

class SpawnAnim {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.t = 0;
    this.duration = 0.15;
  }
  
  update(dt) {
    this.t += dt;
    return this.t >= this.duration;
  }
  
  getScale() {
    const t = Math.min(this.t / this.duration, 1);
    return Math.max(0, FX.ease.outBack(t));
  }
}

// === GRID LOGIC ===
function initGrid() {
  grid = [];
  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      grid[r][c] = 0;
    }
  }
  
  blockers.forEach(b => {
    if (b.row < gridSize && b.col < gridSize) {
      grid[b.row][b.col] = -1;
    }
  });
  
  addRandomTile();
  addRandomTile();
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0) {
        empty.push({r, c});
      }
    }
  }
  
  if (empty.length === 0) return;
  
  const pos = empty[Math.floor(Math.random() * empty.length)];
  grid[pos.r][pos.c] = Math.random() < 0.9 ? 1 : 2;
  spawnAnims.push(new SpawnAnim(pos.r, pos.c));
}

function moveLine(arr) {
  const filtered = arr.filter(v => v > 0);
  const result = [];
  let i = 0;
  
  while (i < filtered.length) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1] && filtered[i] < 11) {
      const merged = filtered[i] + 1;
      result.push(merged);
      score += Math.pow(2, merged);
      comboCurrent++;
      i += 2;
    } else {
      result.push(filtered[i]);
      i++;
    }
  }
  
  while (result.length < arr.length) {
    result.push(0);
  }
  
  return result;
}

function move(direction) {
  if (!FX.running || FX.paused) return;
  if (tileAnims.length > 0) return;
  
  const oldGrid = grid.map(row => row.slice());
  const newGrid = grid.map(row => row.slice());
  tileAnims = [];
  comboCurrent = 0;
  
  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < gridSize; r++) {
      let line = newGrid[r].slice();
      if (direction === 'right') line.reverse();
      
      const positions = [];
      line.forEach((v, i) => {
        if (v > 0) positions.push({col: i, value: v});
      });
      
      const moved = moveLine(line);
      if (direction === 'right') moved.reverse();
      
      newGrid[r] = moved;
      
      if (direction === 'right') {
        positions.forEach(p => p.col = gridSize - 1 - p.col);
      }
      
      positions.forEach(p => {
        let targetCol = -1;
        for (let c = (direction === 'left' ? 0 : gridSize - 1);
             direction === 'left' ? c < gridSize : c >= 0;
             direction === 'left' ? c++ : c--) {
          if (moved[c] > 0) {
            const isMerge = moved[c] > p.value;
            if (targetCol === -1) {
              targetCol = c;
              if (p.col !== targetCol) {
                tileAnims.push(new TileAnim(r, p.col, r, targetCol, p.value, isMerge));
              }
              if (isMerge) break;
            } else {
              break;
            }
          }
        }
      });
    }
  } else {
    for (let c = 0; c < gridSize; c++) {
      let line = [];
      for (let r = 0; r < gridSize; r++) {
        line.push(newGrid[r][c]);
      }
      
      if (direction === 'down') line.reverse();
      
      const positions = [];
      line.forEach((v, i) => {
        if (v > 0) positions.push({row: i, value: v});
      });
      
      const moved = moveLine(line);
      if (direction === 'down') moved.reverse();
      
      for (let r = 0; r < gridSize; r++) {
        newGrid[r][c] = moved[r];
      }
      
      if (direction === 'down') {
        positions.forEach(p => p.row = gridSize - 1 - p.row);
      }
      
      positions.forEach(p => {
        let targetRow = -1;
        for (let r = (direction === 'up' ? 0 : gridSize - 1);
             direction === 'up' ? r < gridSize : r >= 0;
             direction === 'up' ? r++ : r--) {
          if (moved[r] > 0) {
            const isMerge = moved[r] > p.value;
            if (targetRow === -1) {
              targetRow = r;
              if (p.row !== targetRow) {
                tileAnims.push(new TileAnim(p.row, c, targetRow, c, p.value, isMerge));
              }
              if (isMerge) break;
            } else {
              break;
            }
          }
        }
      });
    }
  }
  
  const changed = JSON.stringify(oldGrid) !== JSON.stringify(newGrid);
  
  if (!changed) GameAudio.sfx('invalid');
  if (changed) {
    GameAudio.sfx('swap');
    if (comboCurrent > 0) GameAudio.sfx(comboCurrent > 1 ? 'combo' : 'merge', {rate: 1 + Math.min(comboCurrent, 6) * .08});
    moveHistory.push({grid: oldGrid, score});
    if (moveHistory.length > 10) moveHistory.shift();
    
    grid = newGrid;
    
    if (comboCurrent > 0) {
      comboTimer = 2.0;
      chibiState = comboCurrent >= 2 ? 'cheer' : 'bounce';
      chibiT = 0;
      
      if (comboCurrent >= 2) {
        FX.banner(`连击 ×${comboCurrent}！`);
      }
    }
    
    setTimeout(() => {
      grid.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val > 0 && oldGrid[r][c] !== val) {
            mergeAnims.push(new MergeAnim(r, c, val));
            
            const tileSize = Math.min((W - 80) / gridSize, 110);
            const gap = 8;
            const gridW = gridSize * tileSize + (gridSize - 1) * gap;
            const gridX = (W - gridW) / 2;
            const boardH = gridW;
            const boardY = (H - boardH) / 2 - 30;
            const gridY = boardY + 12;
            const x = gridX + c * (tileSize + gap) + tileSize / 2;
            const y = gridY + r * (tileSize + gap) + tileSize / 2;
            
            const tierColor = TIER_COLORS[Math.min(val, 11) - 1];
            FX.burst(x, y, {
              n: 12,
              color: tierColor.frame,
              speed: 120,
              life: 0.5,
              size: 6,
              glow: true
            });
            
            if (val >= targetTile) {
              FX.ring(x, y, {color: '#ffd700', r: 80, life: 0.6});
              FX.shake(6);
            }
          }
        });
      });
      
      addRandomTile();
      checkGameState();
    }, 130);
  }
}

function checkGameState() {
  const hasTarget = grid.some(row => row.some(v => v >= targetTile));
  
  if (hasTarget && currentSel.mode === 'story') {
    setTimeout(() => {
      gameWin();
    }, 500);
    return;
  }
  
  const empty = grid.some(row => row.includes(0));
  if (empty) return;
  
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] <= 0) continue;
      if (c < gridSize - 1 && grid[r][c] === grid[r][c + 1]) return;
      if (r < gridSize - 1 && grid[r][c] === grid[r + 1][c]) return;
    }
  }
  
  setTimeout(() => {
    gameOver();
  }, 500);
}

function gameWin() {
  GameAudio.sfx('win'); GameAudio.stop();
  if (GameInviteV0.active()) { FX.running = false; GameInviteV0.finish(score); return; }
  FX.running = false;
  FX.banner('🏆 目标达成！');
  
  const best = Math.max(store.bestScore, score);
  store.bestScore = best;
  store.bestStage = Math.max(store.bestStage, currentSel.stage);
  store.save();
  
  const maxTile = Math.max(...grid.flat());
  const stars = maxTile >= targetTile + 2 ? 3 : maxTile >= targetTile + 1 ? 2 : 1;
  
  Lobby.reportResult({
    stage: currentSel.stage,
    stars,
    coins: Math.floor(score / 10),
    gems: Math.floor(score / 50),
    win: true
  });
}

function gameOver() {
  GameAudio.sfx('lose'); GameAudio.stop();
  if (GameInviteV0.active()) { FX.running = false; GameInviteV0.finish(score); return; }
  FX.running = false;
  FX.banner('没有空间了！');
  
  const best = Math.max(store.bestScore, score);
  store.bestScore = best;
  store.save();
  
  Lobby.reportResult({
    stage: currentSel.stage,
    stars: 0,
    coins: Math.floor(score / 20),
    gems: Math.floor(score / 100),
    win: false
  });
}

// === POWER-UPS ===
const undoBtn = FX.button({
  icon: 'item-heart',
  color: '#ff6b9d',
  size: 70,
  right: W/2 - 105,
  bottom: 50,
  key: 'KeyZ',
  onPress: () => {
    if (undoUses <= 0) return;
    if (moveHistory.length === 0) return;
    
    const prev = moveHistory.pop();
    grid = prev.grid;
    score = prev.score;
    undoUses--; GameAudio.sfx('tap');
    
    tileAnims = [];
    mergeAnims = [];
    spawnAnims = [];
    
    FX.burst(W / 2, H / 2, {
      n: 20,
      color: '#ff6b9d',
      speed: 150,
      life: 0.6,
      size: 6,
      glow: true
    });
  }
});

const bombBtn = FX.button({
  icon: 'item-star',
  color: '#ffaa00',
  size: 70,
  right: W/2 - 5,
  bottom: 50,
  key: 'KeyX',
  onPress: () => {
    if (bombUses <= 0) return;
    
    const tiles = [];
    grid.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val > 0) tiles.push({r, c, val});
      });
    });
    
    if (tiles.length === 0) return;
    
    const target = tiles[Math.floor(Math.random() * tiles.length)];
    grid[target.r][target.c] = 0;
    bombUses--; GameAudio.sfx('power');
    
    const tileSize = Math.min((W - 80) / gridSize, 110);
    const gap = 8;
    const gridW = gridSize * tileSize + (gridSize - 1) * gap;
    const gridX = (W - gridW) / 2;
    const boardH = gridW;
    const boardY = (H - boardH) / 2 - 30;
    const gridY = boardY + 12;
    const x = gridX + target.c * (tileSize + gap) + tileSize / 2;
    const y = gridY + target.r * (tileSize + gap) + tileSize / 2;
    
    FX.burst(x, y, {
      n: 30,
      color: '#ffaa00',
      speed: 200,
      life: 0.7,
      size: 8,
      glow: true
    });
    FX.shake(8);
    FX.ring(x, y, {color: '#ff8800', r: 100, life: 0.6});
  }
});

const shuffleBtn = FX.button({
  icon: 'item-ice',
  color: '#66ccff',
  size: 70,
  right: W/2 + 95,
  bottom: 50,
  key: 'KeyC',
  onPress: () => {
    if (shuffleUses <= 0) return;
    
    const values = [];
    grid.forEach(row => {
      row.forEach(val => {
        if (val > 0) values.push(val);
      });
    });
    
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    
    let idx = 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] > 0) {
          grid[r][c] = values[idx++];
        }
      }
    }
    
    shuffleUses--; GameAudio.sfx('swap');
    
    FX.burst(W / 2, H / 2, {
      n: 40,
      color: '#66ccff',
      speed: 180,
      life: 0.6,
      size: 7,
      glow: true
    });
    FX.banner('洗牌！');
  }
});

// === INPUT ===
let touchStartX = 0;
let touchStartY = 0;
let hasSwiped = false;

cv.addEventListener('pointerdown', e => {
  const rect = cv.getBoundingClientRect();
  touchStartX = (e.clientX - rect.left) / rect.width * W;
  touchStartY = (e.clientY - rect.top) / rect.height * H;
  hasSwiped = false;
});

cv.addEventListener('pointermove', e => {
  if (hasSwiped) return;
  
  const rect = cv.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W;
  const y = (e.clientY - rect.top) / rect.height * H;
  
  const dx = x - touchStartX;
  const dy = y - touchStartY;
  const dist = Math.hypot(dx, dy);
  
  if (dist > 40) {
    hasSwiped = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
  }
});

addEventListener('keydown', e => {
  if (!FX.running || FX.paused) return;
  
  const keyMap = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    KeyA: 'left',
    KeyD: 'right',
    KeyW: 'up',
    KeyS: 'down'
  };
  
  if (keyMap[e.code]) {
    e.preventDefault();
    move(keyMap[e.code]);
  }
});

// === UPDATE ===
function update(dt) {
  if (FX.paused) return;
  
  chibiT += dt;
  
  if (chibiState === 'bounce' && chibiT > 0.3) {
    chibiState = 'idle';
  } else if (chibiState === 'cheer' && chibiT > 0.8) {
    chibiState = 'idle';
  }
  
  tileAnims = tileAnims.filter(anim => !anim.update(dt));
  mergeAnims = mergeAnims.filter(anim => !anim.update(dt));
  spawnAnims = spawnAnims.filter(anim => !anim.update(dt));
  
  if (comboTimer > 0) {
    comboTimer -= dt;
  }
  
  const usesStr = `
    <span class="chip" style="opacity:${undoUses>0?1:0.4}">↩×${undoUses}</span>
    <span class="chip" style="opacity:${bombUses>0?1:0.4}">💣×${bombUses}</span>
    <span class="chip" style="opacity:${shuffleUses>0?1:0.4}">🔀×${shuffleUses}</span>
  `;
  
  const foodIcons = ['🍙','🍰','🍓','🍊','🍇','🍑','🍋','🍉','🍒','🍍','🏆'];
  
  FX.hud(`
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">🍱 ${score}</span>
    <span class="chip">🎯 ${foodIcons[targetTile-1]}</span>
    ${usesStr}
    <span class="grow"></span>
  `);
}

// === DRAW ===
function drawTile(ctx, value, x, y, size, scale = 1) {
  const s = Math.max(0, size * scale);
  
  if (s === 0) return;
  
  const cached = getCachedTileSprite(value, size);
  
  if (scale === 1) {
    ctx.drawImage(cached, x - size/2, y - size/2);
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.drawImage(cached, -size/2, -size/2);
    ctx.restore();
  }
}

function draw(ctx) {
  const stageBg = currentSel && currentSel.stageId ? 
    (currentSel.stage === 0 ? 'bg-garden' :
     currentSel.stage === 1 ? 'bg-sakura' :
     currentSel.stage === 2 ? 'bg-forest' :
     currentSel.stage === 3 ? 'bg-neon' :
     currentSel.stage === 4 ? 'bg-snow' : 'bg-sky') : 'bg-garden';
  
  const bgImg = FX.img(stageBg);
  const bgScale = Math.max(W / 640, H / 360);
  const bgW = 640 * bgScale;
  const bgH = 360 * bgScale;
  const bgX = (W - bgW) / 2;
  const bgY = (H - bgH) / 2;
  ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  
  FX.motes(ctx, '#ffd6e8');
  
  const tileSize = Math.min((W - 80) / gridSize, 110);
  const gap = 8;
  const gridW = gridSize * tileSize + (gridSize - 1) * gap;
  const gridX = (W - gridW) / 2;
  const boardH = gridW;
  const boardY = (H - boardH) / 2 - 30;
  const gridY = boardY + 12;
  
  const chibiSize = 160;
  const chibiX = W / 2;
  const chibiY = boardY - chibiSize / 2 - 20;
  const chibiImg = FX.img('li-chibi');
  
  let chibiSy = 1;
  let chibiOffset = 0;
  
  if (chibiState === 'bounce') {
    const t = Math.min(chibiT / 0.3, 1);
    chibiSy = 1 + Math.sin(t * Math.PI) * 0.3;
    chibiOffset = -Math.sin(t * Math.PI) * 20;
  } else if (chibiState === 'cheer') {
    chibiSy = 1 + Math.sin(chibiT * 15) * 0.15;
    chibiOffset = -Math.sin(chibiT * 10) * 15;
  } else {
    chibiSy = 1 + Math.sin(FX.time * 2) * 0.05;
  }
  
  if (currentSel && currentSel.skin && currentSel.skin.filter) {
    ctx.filter = currentSel.skin.filter;
  }
  
  FX.drawSprite(ctx, chibiImg, chibiX, chibiY + chibiOffset, chibiSize, {
    sy: chibiSy,
    sx: 1 / chibiSy
  });
  
  ctx.filter = 'none';
  
  ctx.fillStyle = '#d9c7a8';
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.roundRect(gridX - 12, boardY, gridW + 24, boardH + 24, 16);
  ctx.fill();
  ctx.shadowBlur = 0;
  
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const x = gridX + c * (tileSize + gap) + tileSize / 2;
      const y = gridY + r * (tileSize + gap) + tileSize / 2;
      
      const isAnimating = tileAnims.some(a => 
        (a.toRow === r && a.toCol === c && !a.isMerge) ||
        (a.fromRow === r && a.fromCol === c)
      );
      
      const isMerging = mergeAnims.some(a => a.row === r && a.col === c);
      const isSpawning = spawnAnims.some(a => a.row === r && a.col === c);
      
      if (!isAnimating && !isMerging) {
        const scale = isSpawning ? spawnAnims.find(a => a.row === r && a.col === c).getScale() : 1;
        drawTile(ctx, grid[r][c], x, y, tileSize, scale);
      } else if (!isAnimating) {
        drawTile(ctx, grid[r][c], x, y, tileSize, 1);
      }
    }
  }
  
  tileAnims.forEach(anim => {
    const pos = anim.getPos(tileSize, gridX, gridY, gap);
    drawTile(ctx, anim.value, pos.x, pos.y, tileSize, 1);
  });
  
  mergeAnims.forEach(anim => {
    const x = gridX + anim.col * (tileSize + gap) + tileSize / 2;
    const y = gridY + anim.row * (tileSize + gap) + tileSize / 2;
    const scale = anim.getScale();
    drawTile(ctx, grid[anim.row][anim.col], x, y, tileSize, scale);
  });
  
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

// === START ===
function startRun(sel) {
  GameAudio.bgm('lili-2048');
  currentSel = sel;
  
  const stageConfig = [
    {size: 4, target: 7, blockers: []},
    {size: 4, target: 8, blockers: [{row:1,col:1}, {row:2,col:2}]},
    {size: 5, target: 8, blockers: [{row:0,col:2}, {row:4,col:2}]},
    {size: 5, target: 9, blockers: [{row:1,col:1}, {row:1,col:3}, {row:3,col:1}, {row:3,col:3}]},
    {size: 5, target: 10, blockers: [{row:2,col:0}, {row:2,col:4}, {row:0,col:2}, {row:4,col:2}]},
    {size: 5, target: 11, blockers: []}
  ];
  
  const config = sel.mode === 'story' && sel.stage < stageConfig.length
    ? stageConfig[sel.stage]
    : {size: 4, target: 11, blockers: []};
  
  gridSize = config.size;
  targetTile = config.target;
  blockers = config.blockers;
  
  score = 0;
  moveHistory = [];
  tileAnims = [];
  mergeAnims = [];
  spawnAnims = [];
  chibiState = 'idle';
  chibiT = 0;
  comboCurrent = 0;
  comboTimer = 0;
  
  undoUses = 3 + (window.VIP && VIP.active() ? 2 : 0);
  bombUses = 2;
  shuffleUses = 1;
  
  undoBtn.right = W/2 - 105;
  bombBtn.right = W/2 - 5;
  shuffleBtn.right = W/2 + 95;
  
  tileSpriteCache.clear();
  
  initGrid();
  
  FX.running = true;
  FX.loop(update, draw);
}

// === INIT ===
const assets = [
  'bg-garden','bg-sakura','bg-forest','bg-neon','bg-snow','bg-sky',
  'li-chibi',
  'item-heart','item-star','item-ice',
  't2048-1','t2048-2','t2048-3','t2048-4','t2048-5','t2048-6','t2048-7','t2048-8','t2048-9','t2048-10','t2048-11'
];

FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'lili-2048',
    title: '栗栗的美食 2048',
    orientation: 'portrait',
    bg: ['bg-garden'],
    modes: [
      {id: 'story', name: '故事', icon: 'item-star'},
      {id: 'endless', name: '无尽', icon: 'item-ice'}
    ],
    stages: [
      {id: 's0', name: '初级', bg: 'bg-garden'},
      {id: 's1', name: '入门', bg: 'bg-sakura'},
      {id: 's2', name: '进阶', bg: 'bg-forest'},
      {id: 's3', name: '挑战', bg: 'bg-neon'},
      {id: 's4', name: '困难', bg: 'bg-snow'},
      {id: 's5', name: '终极', bg: 'bg-sky'}
    ],
    chars: [
      {id: 'li', name: '栗栗', img: 'li-chibi', chibi: 'li-chibi', hp: 100, atk: 80, speed: 90}
    ],
    skins: [
      {id: 'default', char: 'li', name: '原味', filter: 'none', rarity: 'N'},
      {id: 'sakura', char: 'li', name: '樱糖', filter: 'hue-rotate(340deg) saturate(1.2)', rarity: 'R', vip: true},
      {id: 'starry', char: 'li', name: '星河', filter: 'hue-rotate(200deg) saturate(1.3) brightness(1.1)', rarity: 'SR', vip: true}
    ],
    currency: [
      {id: 'coin', icon: 'item-heart'},
      {id: 'gem', icon: 'item-star'}
    ],
    onStart: startRun,
    onQuit: () => { FX.running = false; GameAudio.stop(); },
    onSkinChange: (sel) => {
      if (currentSel) currentSel.skin = sel.skin;
    }
  });
  GameInviteV0.launch('lili-2048', startRun);
});

window.__game = {
  state: () => ({
    grid: grid.map(row => row.slice()),
    score,
    gridSize,
    targetTile,
    maxTile: Math.max(...grid.flat()),
    emptyTiles: grid.flat().filter(v => v === 0).length,
    powerups: {undo: undoUses, bomb: bombUses, shuffle: shuffleUses},
    animating: tileAnims.length > 0
  }),
  move
};

})();
