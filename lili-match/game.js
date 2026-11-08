// 栗栗的森林消消 (lili-match) - game.js
(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: false});

// === CONSTANTS ===
const BOARD_SIZE = 8;
const TILE_TYPES = {
  '🌰': 'm3-acorn',
  '🍄': 'm3-mushroom',
  '🍁': 'm3-leaf',
  '🐿️': 'm3-squirrel',
  '🌲': 'm3-pine',
  '🍎': 'm3-apple'
};
const TILE_TYPE_IDS = Object.keys(TILE_TYPES);
const SPECIAL_TYPES = {
  ROW: 'row',
  COL: 'col',
  BOMB: 'bomb',
  COLOR: 'color'
};

// === STATE ===
let board = [];
let selectedTile = null;
let swapping = false;
let cascading = false;
let animatingTiles = [];
let combo = 0;
let score = 0;
let moves = 0;
let maxMoves = 20;
let levelGoal = {};
let currentLevel = 0;
let idleTimer = 0;
let hintTile = null;
let gameStartTime = 0;

let boosters = {
  hammer: {count: 3, icon: 'item-weapon'},
  shuffle: {count: 2, icon: 'item-chest'},
  moves: {count: 1, icon: 'item-star'}
};
let activeBoosters = {hammer: false, shuffle: false};

const levels = [
  {id: 0, name: '栗栗森林', goal: {type: 'score', target: 500}, moves: 20, types: 4, bg: 'bg-forest'},
  {id: 1, name: '松树林道', goal: {type: 'collect', target: {type: '🌰', count: 15}}, moves: 18, types: 4, bg: 'bg-forest'},
  {id: 2, name: '蘑菇小径', goal: {type: 'score', target: 800}, moves: 20, types: 5, bg: 'bg-forest'},
  {id: 3, name: '枫叶谷', goal: {type: 'collect', target: {type: '🍁', count: 20}}, moves: 16, types: 5, bg: 'bg-garden'},
  {id: 4, name: '松鼠之家', goal: {type: 'jelly', target: 25}, moves: 22, types: 5, bg: 'bg-garden'},
  {id: 5, name: '苹果园', goal: {type: 'score', target: 1500}, moves: 25, types: 6, bg: 'bg-garden'},
  {id: 6, name: '花朵草地', goal: {type: 'crates', target: 15}, moves: 20, types: 5, bg: 'bg-sakura'},
  {id: 7, name: '蜜蜂花园', goal: {type: 'collect', target: {type: '🌼', count: 25}}, moves: 18, types: 6, bg: 'bg-sakura'},
  {id: 8, name: '刺猬洞穴', goal: {type: 'jelly', target: 35}, moves: 24, types: 6, bg: 'bg-snow'},
  {id: 9, name: '胡萝卜田', goal: {type: 'score', target: 2500}, moves: 28, types: 6, bg: 'bg-snow'},
  {id: 10, name: '瓢虫乐园', goal: {type: 'crates', target: 25}, moves: 22, types: 6, bg: 'bg-neon'},
  {id: 11, name: '森林之心', goal: {type: 'score', target: 3500}, moves: 30, types: 6, bg: 'bg-neon'}
];

let currentSel = null;
const store = FX.store('lili-match', {bestLevel: 0, bestScore: 0});

// === SPRITE CACHE ===
let spriteCache = {};

function getSpriteCache(assetName, size) {
  const key = `${assetName}_${size}`;
  if (spriteCache[key]) return spriteCache[key];
  
  const offscreen = new OffscreenCanvas(size, size);
  const octx = offscreen.getContext('2d');
  
  const img = FX.img(assetName);
  octx.drawImage(img, 0, 0, size, size);
  
  spriteCache[key] = offscreen;
  return offscreen;
}

function drawTileSprite(ctx, typeId, size, x, y, hasJelly, hasCrate, special) {
  // Draw base tile
  ctx.fillStyle = '#fffdf5';
  ctx.strokeStyle = '#c9b48a';
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.beginPath();
  ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.15);
  ctx.fill();
  ctx.stroke();
  
  // Draw jelly overlay
  if (hasJelly) {
    ctx.fillStyle = 'rgba(255, 182, 193, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.15);
    ctx.fill();
  }
  
  // Draw crate pattern
  if (hasCrate) {
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
    ctx.lineWidth = Math.max(1, size * 0.04);
    const step = size * 0.3;
    for (let sx = x - size / 2 + step; sx < x + size / 2; sx += step) {
      ctx.beginPath();
      ctx.moveTo(sx, y - size / 2);
      ctx.lineTo(sx, y + size / 2);
      ctx.stroke();
    }
    for (let sy = y - size / 2 + step; sy < y + size / 2; sy += step) {
      ctx.beginPath();
      ctx.moveTo(x - size / 2, sy);
      ctx.lineTo(x + size / 2, sy);
      ctx.stroke();
    }
  }
  
  // Draw piece image
  const assetName = TILE_TYPES[typeId];
  const sprite = getSpriteCache(assetName, Math.ceil(size * 0.7));
  const spriteSize = size * 0.7;
  ctx.drawImage(sprite, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
  
  // Draw special overlay
  if (special) {
    const glowSize = size * 0.3;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = size * 0.2;
    
    if (special === SPECIAL_TYPES.ROW) {
      ctx.fillRect(x - size / 2, y - glowSize / 2, size, glowSize);
    } else if (special === SPECIAL_TYPES.COL) {
      ctx.fillRect(x - glowSize / 2, y - size / 2, glowSize, size);
    } else if (special === SPECIAL_TYPES.BOMB) {
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (special === SPECIAL_TYPES.COLOR) {
      ctx.beginPath();
      ctx.arc(x, y, glowSize * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
  }
}

// === TILE SYSTEM ===
function createTile(row, col, type, special = null) {
  return {
    row,
    col,
    type,
    special,
    y: row,
    targetY: row,
    falling: false,
    matched: false,
    jelly: false,
    crate: false,
    id: Math.random()
  };
}

function initBoard() {
  board = [];
  const level = levels[currentLevel];
  const numTypes = Math.min(level.types, TILE_TYPE_IDS.length);
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      let type;
      let attempts = 0;
      do {
        type = TILE_TYPE_IDS[Math.floor(Math.random() * numTypes)];
        attempts++;
      } while (wouldMatch(row, col, type) && attempts < 10);
      
      board[row][col] = createTile(row, col, type);
      
      // Add jelly or crate
      if (level.goal.type === 'jelly' && Math.random() < 0.35) {
        board[row][col].jelly = true;
      }
      if (level.goal.type === 'crates' && Math.random() < 0.2) {
        board[row][col].crate = true;
      }
    }
  }
}

function wouldMatch(row, col, type) {
  let hCount = 1;
  for (let c = col - 1; c >= 0 && board[row] && board[row][c] && board[row][c].type === type; c--) hCount++;
  for (let c = col + 1; c < BOARD_SIZE && board[row] && board[row][c] && board[row][c].type === type; c++) hCount++;
  
  let vCount = 1;
  for (let r = row - 1; r >= 0 && board[r] && board[r][col] && board[r][col].type === type; r--) vCount++;
  for (let r = row + 1; r < BOARD_SIZE && board[r] && board[r][col] && board[r][col].type === type; r++) vCount++;
  
  return hCount >= 3 || vCount >= 3;
}

// === BOARD COORDINATES ===
const BOARD_MARGIN = 12;
const BOARD_TOP = 160;
let TILE_SIZE = 0;

function computeTileSize() {
  TILE_SIZE = (W - BOARD_MARGIN * 2) / BOARD_SIZE;
}

function getTileScreenPos(row, col) {
  return {
    x: BOARD_MARGIN + col * TILE_SIZE + TILE_SIZE / 2,
    y: BOARD_TOP + row * TILE_SIZE + TILE_SIZE / 2
  };
}

function screenToBoard(px, py) {
  const col = Math.floor((px - BOARD_MARGIN) / TILE_SIZE);
  const row = Math.floor((py - BOARD_TOP) / TILE_SIZE);
  if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
    return {row, col};
  }
  return null;
}

// === MATCHING ===
function findMatches() {
  const matches = [];
  const checked = new Set();
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile = board[row][col];
      if (!tile || tile.matched) continue;
      
      // Horizontal match
      const hMatch = [];
      for (let c = col; c < BOARD_SIZE && board[row][c] && board[row][c].type === tile.type && !board[row][c].matched; c++) {
        hMatch.push(board[row][c]);
      }
      
      // Vertical match
      const vMatch = [];
      for (let r = row; r < BOARD_SIZE && board[r] && board[r][col] && board[r][col].type === tile.type && !board[r][col].matched; r++) {
        vMatch.push(board[r][col]);
      }
      
      if (hMatch.length >= 3) {
        hMatch.forEach(t => {
          const key = `${t.row},${t.col}`;
          if (!checked.has(key)) {
            matches.push(t);
            checked.add(key);
            if (hMatch.length >= 4) t.special = SPECIAL_TYPES.ROW;
          }
        });
      }
      
      if (vMatch.length >= 3) {
        vMatch.forEach(t => {
          const key = `${t.row},${t.col}`;
          if (!checked.has(key)) {
            matches.push(t);
            checked.add(key);
            if (vMatch.length >= 4) t.special = SPECIAL_TYPES.COL;
          }
        });
      }
      
      if (hMatch.length >= 5 && vMatch.length >= 5) {
        tile.special = SPECIAL_TYPES.COLOR;
      } else if (hMatch.length >= 4 && vMatch.length >= 4) {
        tile.special = SPECIAL_TYPES.BOMB;
      }
    }
  }
  
  return matches;
}

function processMatches(matches) {
  if (matches.length === 0) return;
  
  combo++;
  const points = matches.length * 10 * combo;
  score += points;
  
  FX.shake(Math.min(combo * 2, 10));
  
  const comboTexts = ['不错！', '真棒！', '太强了！', '无敌！', '神级连击！', '逆天！'];
  if (combo >= 3) {
    const text = comboTexts[Math.min(combo - 3, comboTexts.length - 1)];
    FX.banner(`${text} ×${combo}`);
  }
  
  matches.forEach(tile => {
    tile.matched = true;
    const pos = getTileScreenPos(tile.row, tile.col);
    
    FX.burst(pos.x, pos.y, {n: 15, color: '#90ee90', speed: 150, life: 0.6, size: 6, glow: true});
    const damageText = `+${10 * combo}`;
    FX.text(pos.x, pos.y - 20, damageText, {color: combo >= 3 ? '#ffff00' : '#90ee90', size: combo >= 3 ? 24 : 18, crit: combo >= 3});
    
    if (tile.jelly) {
      tile.jelly = false;
      if (levelGoal.type === 'jelly') levelGoal.progress++;
      FX.burst(pos.x, pos.y, {n: 10, color: '#ff69b4', speed: 100, life: 0.5, size: 5});
    }
    if (tile.crate) {
      tile.crate = false;
      if (levelGoal.type === 'crates') levelGoal.progress++;
      FX.ring(pos.x, pos.y, {color: '#8b4513', r: 40, life: 0.4});
    }
    
    if (levelGoal.type === 'collect' && tile.type === levelGoal.target.type) {
      levelGoal.progress++;
    }
    
    if (tile.special) {
      activateSpecial(tile);
    }
  });
  
  setTimeout(() => {
    matches.forEach(tile => {
      board[tile.row][tile.col] = null;
    });
    applyGravity();
  }, 150);
}

function activateSpecial(tile) {
  const pos = getTileScreenPos(tile.row, tile.col);
  
  if (tile.special === SPECIAL_TYPES.ROW) {
    FX.banner('横排爆炸！');
    FX.shake(8);
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[tile.row][c] && !board[tile.row][c].matched) {
        const p = getTileScreenPos(tile.row, c);
        FX.burst(p.x, p.y, {n: 10, color: '#ff6666', speed: 120, life: 0.5, size: 5});
        board[tile.row][c].matched = true;
      }
    }
  } else if (tile.special === SPECIAL_TYPES.COL) {
    FX.banner('竖排爆炸！');
    FX.shake(8);
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r] && board[r][tile.col] && !board[r][tile.col].matched) {
        const p = getTileScreenPos(r, tile.col);
        FX.burst(p.x, p.y, {n: 10, color: '#ff6666', speed: 120, life: 0.5, size: 5});
        board[r][tile.col].matched = true;
      }
    }
  } else if (tile.special === SPECIAL_TYPES.BOMB) {
    FX.banner('炸弹爆炸！');
    FX.shake(10);
    FX.ring(pos.x, pos.y, {color: '#ff8800', r: 120, life: 0.6});
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = tile.row + dr;
        const nc = tile.col + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] && !board[nr][nc].matched) {
          const p = getTileScreenPos(nr, nc);
          FX.burst(p.x, p.y, {n: 15, color: '#ff8800', speed: 150, life: 0.6, size: 6});
          board[nr][nc].matched = true;
        }
      }
    }
  } else if (tile.special === SPECIAL_TYPES.COLOR) {
    FX.banner('彩色炸弹！');
    FX.shake(12);
    FX.flash('#ffdd00', 0.3);
    const targetType = tile.type;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] && board[r][c].type === targetType && !board[r][c].matched) {
          const p = getTileScreenPos(r, c);
          FX.burst(p.x, p.y, {n: 12, color: '#ffd700', speed: 140, life: 0.7, size: 7, glow: true});
          board[r][c].matched = true;
        }
      }
    }
  }
}

// === GRAVITY ===
function applyGravity() {
  cascading = true;
  let moved = false;
  
  for (let col = 0; col < BOARD_SIZE; col++) {
    let emptyRow = BOARD_SIZE - 1;
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (board[row][col] && !board[row][col].matched) {
        if (row !== emptyRow) {
          board[emptyRow][col] = board[row][col];
          board[emptyRow][col].targetY = emptyRow;
          board[emptyRow][col].row = emptyRow;
          board[emptyRow][col].falling = true;
          board[row][col] = null;
          moved = true;
        }
        emptyRow--;
      }
    }
    
    // Spawn new tiles
    const level = levels[currentLevel];
    const numTypes = Math.min(level.types, TILE_TYPE_IDS.length);
    for (let row = emptyRow; row >= 0; row--) {
      const type = TILE_TYPE_IDS[Math.floor(Math.random() * numTypes)];
      board[row][col] = createTile(row, col, type);
      board[row][col].y = -5;
      board[row][col].targetY = row;
      board[row][col].falling = true;
      moved = true;
    }
  }
  
  if (moved) {
    setTimeout(() => {
      cascading = false;
      const matches = findMatches();
      if (matches.length > 0) {
        processMatches(matches);
      } else {
        combo = 0;
        if (!hasValidMoves()) {
          shuffleBoard();
          FX.banner('无法移动，自动洗牌');
        }
      }
    }, 400);
  } else {
    cascading = false;
    combo = 0;
  }
}

// === SWAP ===
function swapTiles(tile1, tile2) {
  if (swapping || cascading) return;
  
  const adjacent = Math.abs(tile1.row - tile2.row) + Math.abs(tile1.col - tile2.col) === 1;
  if (!adjacent) return;
  
  swapping = true;
  idleTimer = 0;
  hintTile = null;
  
  // Swap in board
  [board[tile1.row][tile1.col], board[tile2.row][tile2.col]] = [board[tile2.row][tile2.col], board[tile1.row][tile1.col]];
  
  // Swap positions
  const t1row = tile1.row, t1col = tile1.col;
  tile1.row = tile2.row;
  tile1.col = tile2.col;
  tile2.row = t1row;
  tile2.col = t1col;
  
  animatingTiles = [
    {tile: tile1, startRow: t1row, startCol: t1col, endRow: tile1.row, endCol: tile1.col, t: 0},
    {tile: tile2, startRow: tile2.row, startCol: tile2.col, endRow: t1row, endCol: t1col, t: 0}
  ];
  
  setTimeout(() => {
    animatingTiles = [];
    const matches = findMatches();
    
    if (matches.length > 0) {
      moves--;
      processMatches(matches);
    } else {
      // Revert swap
      [board[tile1.row][tile1.col], board[tile2.row][tile2.col]] = [board[tile2.row][tile2.col], board[tile1.row][tile1.col]];
      
      const t1r = tile1.row, t1c = tile1.col;
      tile1.row = t1row;
      tile1.col = t1col;
      tile2.row = t1r;
      tile2.col = t1c;
      
      animatingTiles = [
        {tile: tile1, startRow: t1r, startCol: t1c, endRow: tile1.row, endCol: tile1.col, t: 0},
        {tile: tile2, startRow: tile2.row, startCol: tile2.col, endRow: t1r, endCol: t1c, t: 0}
      ];
      
      setTimeout(() => {
        animatingTiles = [];
        swapping = false;
      }, 250);
      return;
    }
    
    swapping = false;
  }, 250);
}

// === VALID MOVES ===
function hasValidMoves() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 1; col++) {
      const tile1 = board[row][col];
      const tile2 = board[row][col + 1];
      if (tile1 && tile2) {
        [board[row][col], board[row][col + 1]] = [tile2, tile1];
        const hasMatch = findMatches().length > 0;
        [board[row][col], board[row][col + 1]] = [tile1, tile2];
        if (hasMatch) return true;
      }
    }
  }
  
  for (let row = 0; row < BOARD_SIZE - 1; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile1 = board[row][col];
      const tile2 = board[row + 1][col];
      if (tile1 && tile2) {
        [board[row][col], board[row + 1][col]] = [tile2, tile1];
        const hasMatch = findMatches().length > 0;
        [board[row][col], board[row + 1][col]] = [tile1, tile2];
        if (hasMatch) return true;
      }
    }
  }
  
  return false;
}

function findHint() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 1; col++) {
      const tile1 = board[row][col];
      const tile2 = board[row][col + 1];
      if (tile1 && tile2) {
        [board[row][col], board[row][col + 1]] = [tile2, tile1];
        const hasMatch = findMatches().length > 0;
        [board[row][col], board[row][col + 1]] = [tile1, tile2];
        if (hasMatch) return tile1;
      }
    }
  }
  
  for (let row = 0; row < BOARD_SIZE - 1; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile1 = board[row][col];
      const tile2 = board[row + 1][col];
      if (tile1 && tile2) {
        [board[row][col], board[row + 1][col]] = [tile2, tile1];
        const hasMatch = findMatches().length > 0;
        [board[row][col], board[row + 1][col]] = [tile1, tile2];
        if (hasMatch) return tile1;
      }
    }
  }
  
  return null;
}

// === SHUFFLE ===
function shuffleBoard() {
  const tiles = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col]) tiles.push(board[row][col].type);
    }
  }
  
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  
  let idx = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col]) {
        board[row][col].type = tiles[idx++];
      }
    }
  }
  
  FX.shake(6);
  FX.burst(W / 2, BOARD_TOP + BOARD_SIZE * TILE_SIZE / 2, {n: 40, color: '#90ee90', speed: 200, life: 0.8, size: 8, glow: true});
}

// === BOOSTERS ===
const hammerBtn = FX.button({
  icon: 'item-weapon',
  color: '#ff6699',
  size: 70,
  right: 30,
  bottom: 30,
  onPress: () => {
    if (boosters.hammer.count <= 0) {
      FX.banner('锤子用完了');
      return;
    }
    activeBoosters.hammer = !activeBoosters.hammer;
    if (activeBoosters.hammer) {
      FX.banner('选择要消除的方块');
      activeBoosters.shuffle = false;
    }
  }
});

const shuffleBtn = FX.button({
  icon: 'item-chest',
  color: '#66ccff',
  size: 70,
  right: 120,
  bottom: 30,
  onPress: () => {
    if (boosters.shuffle.count <= 0) {
      FX.banner('洗牌用完了');
      return;
    }
    boosters.shuffle.count--;
    shuffleBoard();
    activeBoosters.shuffle = false;
    activeBoosters.hammer = false;
  }
});

const movesBtn = FX.button({
  icon: 'item-star',
  color: '#ffd700',
  size: 70,
  right: 210,
  bottom: 30,
  onPress: () => {
    if (boosters.moves.count <= 0) {
      FX.banner('+5步数用完了');
      return;
    }
    boosters.moves.count--;
    moves += 5;
    maxMoves += 5;
    FX.banner('+5 步数');
    FX.burst(W / 2, 100, {n: 30, color: '#ffd700', speed: 150, life: 0.7, size: 7, glow: true});
  }
});

// === TOUCH INPUT ===
let touchStart = null;
let dragTile = null;

cv.addEventListener('pointerdown', e => {
  if (swapping || cascading) return;
  
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) * FX.W / rect.width;
  const py = (e.clientY - rect.top) * FX.H / rect.height;
  
  const pos = screenToBoard(px, py);
  if (!pos) return;
  
  const tile = board[pos.row][pos.col];
  if (!tile) return;
  
  if (activeBoosters.hammer) {
    boosters.hammer.count--;
    activeBoosters.hammer = false;
    
    const tilePos = getTileScreenPos(tile.row, tile.col);
    FX.burst(tilePos.x, tilePos.y, {n: 20, color: '#ff6699', speed: 180, life: 0.6, size: 7});
    FX.shake(8);
    
    tile.matched = true;
    score += 50;
    
    setTimeout(() => {
      board[tile.row][tile.col] = null;
      applyGravity();
    }, 100);
    
    return;
  }
  
  touchStart = {px, py, tile};
  dragTile = tile;
  selectedTile = tile;
});

cv.addEventListener('pointermove', e => {
  if (!touchStart || !dragTile) return;
  
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) * FX.W / rect.width;
  const py = (e.clientY - rect.top) * FX.H / rect.height;
  
  const dx = px - touchStart.px;
  const dy = py - touchStart.py;
  const dist = Math.hypot(dx, dy);
  
  if (dist > TILE_SIZE * 0.4) {
    const angle = Math.atan2(dy, dx);
    let targetRow = dragTile.row;
    let targetCol = dragTile.col;
    
    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
      targetCol += Math.cos(angle) > 0 ? 1 : -1;
    } else {
      targetRow += Math.sin(angle) > 0 ? 1 : -1;
    }
    
    if (targetRow >= 0 && targetRow < BOARD_SIZE && targetCol >= 0 && targetCol < BOARD_SIZE) {
      const targetTile = board[targetRow][targetCol];
      if (targetTile) {
        swapTiles(dragTile, targetTile);
        touchStart = null;
        dragTile = null;
        selectedTile = null;
      }
    }
  }
});

cv.addEventListener('pointerup', () => {
  touchStart = null;
  dragTile = null;
});

// === UPDATE ===
function update(dt) {
  if (FX.paused) return;
  
  computeTileSize();
  
  idleTimer += dt;
  if (idleTimer > 5 && !hintTile && !swapping && !cascading) {
    hintTile = findHint();
    idleTimer = 0;
  }
  
  // Update falling tiles
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile = board[row][col];
      if (!tile) continue;
      
      if (tile.falling) {
        tile.y = FX.lerp(tile.y, tile.targetY, Math.min(dt * 8, 1));
        if (Math.abs(tile.y - tile.targetY) < 0.01) {
          tile.y = tile.targetY;
          tile.falling = false;
        }
      }
    }
  }
  
  // Update animating swaps
  animatingTiles.forEach(anim => {
    anim.t += dt * 4;
    const progress = FX.ease.outCubic(Math.min(anim.t, 1));
    const startPos = getTileScreenPos(anim.startRow, anim.startCol);
    const endPos = getTileScreenPos(anim.endRow, anim.endCol);
    anim.tile.animX = FX.lerp(startPos.x, endPos.x, progress);
    anim.tile.animY = FX.lerp(startPos.y, endPos.y, progress);
  });
  
  checkWinLose();
  
  let goalText = '';
  if (levelGoal.type === 'score') {
    goalText = `分数: ${score}/${levelGoal.target}`;
  } else if (levelGoal.type === 'collect') {
    goalText = `${levelGoal.target.type}: ${levelGoal.progress}/${levelGoal.target.count}`;
  } else if (levelGoal.type === 'jelly') {
    goalText = `果冻: ${levelGoal.progress}/${levelGoal.target}`;
  } else if (levelGoal.type === 'crates') {
    goalText = `箱子: ${levelGoal.progress}/${levelGoal.target}`;
  }
  
  FX.hud(`
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">💎 ${score}</span>
    <span class="chip">🎯 ${goalText}</span>
    <span class="chip">👣 ${moves}</span>
    <span class="grow"></span>
  `);
}

// === DRAW ===
function draw(ctx) {
  computeTileSize();
  
  const level = levels[currentLevel];
  
  // Draw background
  const scale = Math.max(W / 640, H / 360);
  const bgImg = FX.img(level.bg);
  const bgW = 640 * scale;
  const bgH = 360 * scale;
  ctx.drawImage(bgImg, (W - bgW) / 2, (H - bgH) / 2, bgW, bgH);
  
  FX.motes(ctx, '#90ee90');
  
  // Draw props
  for (let i = 0; i < 3; i++) {
    const propX = (i * 200 + FX.time * 20) % W;
    const propY = H - 100 + Math.sin(i + FX.time) * 20;
    const propImg = FX.img('prop-flowers');
    FX.drawSprite(ctx, propImg, propX, propY, 80, {alpha: 0.6});
  }
  
  // Draw board background
  ctx.fillStyle = 'rgba(232, 240, 220, 0.95)';
  const boardW = W - BOARD_MARGIN * 2;
  const boardH = BOARD_SIZE * TILE_SIZE;
  ctx.fillRect(BOARD_MARGIN, BOARD_TOP, boardW, boardH);
  
  // Draw grid
  ctx.strokeStyle = 'rgba(200,180,138,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= BOARD_SIZE; i++) {
    const x = BOARD_MARGIN + i * TILE_SIZE;
    const y = BOARD_TOP + i * TILE_SIZE;
    ctx.beginPath();
    ctx.moveTo(x, BOARD_TOP);
    ctx.lineTo(x, BOARD_TOP + boardH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(BOARD_MARGIN, y);
    ctx.lineTo(BOARD_MARGIN + boardW, y);
    ctx.stroke();
  }
  
  // Draw tiles
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile = board[row][col];
      if (!tile) continue;
      
      let drawY = tile.y;
      if (tile.animY !== undefined) {
        drawY = tile.animY;
      }
      
      const pos = getTileScreenPos(drawY, col);
      const size = TILE_SIZE * 0.85;
      
      const isHint = hintTile === tile;
      const isSelected = selectedTile === tile;
      
      if (isHint) {
        const pulse = 1 + Math.sin(FX.time * 6) * 0.15;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur = 20 * pulse;
      } else if (isSelected) {
        ctx.shadowColor = 'rgba(102, 204, 255, 0.8)';
        ctx.shadowBlur = 15;
      }
      
      drawTileSprite(ctx, tile.type, size, pos.x, pos.y, tile.jelly, tile.crate, tile.special);
      
      ctx.shadowBlur = 0;
    }
  }
  
  // Draw character
  if (currentSel && currentSel.char) {
    const chibiImg = FX.img(`${currentSel.char}-chibi`);
    if (currentSel.skin && currentSel.skin.filter) {
      ctx.filter = currentSel.skin.filter;
    }
    FX.drawSprite(ctx, chibiImg, W - 80, H - 120, 100, {});
    ctx.filter = 'none';
  }
  
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

// === WIN/LOSE ===
function checkWinLose() {
  if (swapping || cascading) return;
  
  let won = false;
  if (levelGoal.type === 'score' && score >= levelGoal.target) won = true;
  if (levelGoal.type === 'collect' && levelGoal.progress >= levelGoal.target.count) won = true;
  if (levelGoal.type === 'jelly' && levelGoal.progress >= levelGoal.target) won = true;
  if (levelGoal.type === 'crates' && levelGoal.progress >= levelGoal.target) won = true;
  
  if (won) {
    FX.running = false;
    
    const stars = moves >= maxMoves * 0.7 ? 3 : moves >= maxMoves * 0.4 ? 2 : 1;
    
    if (currentLevel >= store.bestLevel) {
      store.bestLevel = currentLevel + 1;
      store.save();
    }
    if (score > store.bestScore) {
      store.bestScore = score;
      store.save();
    }
    
    Lobby.reportResult({
      stage: currentLevel,
      stars: stars,
      coins: Math.floor(score / 10),
      gems: stars * 5,
      win: true,
      score: score,
      combo: combo,
      level: currentLevel + 1
    });
  }
  
  if (moves <= 0 && !won) {
    FX.running = false;
    
    Lobby.reportResult({
      stage: currentLevel,
      stars: 0,
      coins: Math.floor(score / 20),
      gems: 0,
      win: false,
      score: score,
      level: currentLevel + 1
    });
  }
}

// === START ===
function startRun(sel) {
  currentSel = sel;
  currentLevel = sel.stage;
  
  const level = levels[currentLevel];
  score = 0;
  moves = level.moves;
  maxMoves = level.moves;
  combo = 0;
  idleTimer = 0;
  hintTile = null;
  gameStartTime = FX.time;
  
  if (level.goal.type === 'score') {
    levelGoal = {type: 'score', target: level.goal.target, progress: 0};
  } else if (level.goal.type === 'collect') {
    levelGoal = {type: 'collect', target: level.goal.target, progress: 0};
  } else if (level.goal.type === 'jelly') {
    levelGoal = {type: 'jelly', target: level.goal.target, progress: 0};
  } else if (level.goal.type === 'crates') {
    levelGoal = {type: 'crates', target: level.goal.target, progress: 0};
  }
  
  initBoard();
  
  boosters.hammer.count = 3;
  boosters.shuffle.count = 2;
  boosters.moves.count = 1;
  
  selectedTile = null;
  activeBoosters.hammer = false;
  activeBoosters.shuffle = false;
  
  spriteCache = {};
  
  FX.running = true;
  FX.loop(update, draw);
}

const assets = [
  'bg-forest', 'bg-garden', 'bg-sakura', 'bg-snow', 'bg-neon',
  'prop-flowers', 'prop-sakura', 'prop-pine', 'prop-crystal', 'prop-coral',
  'lan-chibi', 'mo-chibi', 'li-chibi', 'xing-chibi', 'hu-chibi',
  'item-weapon', 'item-chest', 'item-star', 'item-shield', 'item-heart',
  'm3-acorn', 'm3-mushroom', 'm3-leaf', 'm3-squirrel', 'm3-pine', 'm3-apple'
];

FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'lili-match',
    title: '栗栗的森林消消',
    orientation: 'portrait',
    bg: ['bg-forest', 'prop-flowers'],
    modes: [{id: 'story', icon: 'item-star'}],
    stages: levels.map((l, i) => ({id: `s${i}`, name: l.name, bg: l.bg})),
    chars: [
      {id: 'lan', name: '蓝蓝', img: 'whale-idle', chibi: 'lan-chibi', stats: {atk: 80, def: 70, hp: 100, spd: 90}},
      {id: 'mo', name: '小模', img: 'mo-chibi', chibi: 'mo-chibi', stats: {atk: 85, def: 75, hp: 95, spd: 95}},
      {id: 'li', name: '栗栗', img: 'li-chibi', chibi: 'li-chibi', stats: {atk: 75, def: 80, hp: 105, spd: 85}},
      {id: 'xing', name: '星眠', img: 'xing-chibi', chibi: 'xing-chibi', stats: {atk: 90, def: 65, hp: 90, spd: 100}},
      {id: 'hu', name: '橙铃', img: 'hu-chibi', chibi: 'hu-chibi', stats: {atk: 80, def: 85, hp: 100, spd: 80}}
    ],
    skins: [
      {id: 'default', name: '原色', filter: 'none', rarity: 'N'},
      {id: 'sakura', name: '樱糖', filter: 'hue-rotate(330deg) saturate(1.3)', rarity: 'R'},
      {id: 'forest', name: '森林', filter: 'hue-rotate(90deg) saturate(1.2)', rarity: 'R'},
      {id: 'star', name: '星河', filter: 'hue-rotate(240deg) saturate(1.4) brightness(1.1)', rarity: 'SSR', vip: true}
    ],
    currency: [
      {id: 'coin', icon: 'item-chest'},
      {id: 'gem', icon: 'item-star'}
    ],
    onStart: startRun,
    onQuit: () => { FX.running = false; },
    onSkinChange: (sel) => { if (currentSel) currentSel.skin = sel.skin; }
  });
});

window.__game = {
  state: () => ({
    level: currentLevel + 1,
    score: score,
    moves: moves,
    combo: combo,
    goal: levelGoal,
    board: board.map(row => row.map(t => t ? {type: t.type, jelly: t.jelly, crate: t.crate} : null)),
    boosters: {
      hammer: boosters.hammer.count,
      shuffle: boosters.shuffle.count,
      moves: boosters.moves.count
    }
  })
};

})();
