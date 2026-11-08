// 贪吃蓝蓝 (snake) - game.js
(function() {
'use strict';
GameAudio.mount();
GameAudio.setPauseCheck(() => FX.paused || !FX.running);

const {cv, ctx} = FX.init({landscape: false});

// === CONSTANTS ===
const COLS = 12;
const ROWS = 18;

// === STATE ===
let snake = [];
let dir = {x:1, y:0};
let inputBuffer = [];
let snakeSpeed = 0.16;
let moveTimer = 0;
let growQueue = 0;
let score = 0;
let combo = 1;
let comboTimer = 0;
let targetLength = 10;

let food = [];
let obstacles = [];
let enemies = [];
let portals = [];
let boss = null;

let dashTimer = 0;
let shieldActive = false;
let invulnTimer = 0;
let slowTimer = 0;
let magnetTimer = 0;

let gameOver = false;
let won = false;
let deathSlowMo = 0;
let startGrace = 0;
let countdownTimer = 0;
let countdownNumber = 3;

let currentSel = null;
let stage = 0;
let startTime = 0;

// Board layout (computed each frame)
let cellSize = 32;
let boardX = 0;
let boardY = 150;
let boardW = 0;
let boardH = 0;

const biomeNames = ['花园', '樱花小镇', '雪原', '海底', '月球', '霓虹街'];
const stages = [
  {name:'花园', bg:'bg-garden', target:10, obstacles:[], enemies:[], wallWrap:true},
  {name:'樱花小镇', bg:'bg-sakura', target:15, obstacles:[{x:6,y:9}], enemies:[{type:'slime',x:4,y:4}], wallWrap:false},
  {name:'雪原', bg:'bg-snow', target:20, obstacles:[{x:3,y:5},{x:8,y:12}], enemies:[{type:'bat',x:6,y:8}], wallWrap:false},
  {name:'海底', bg:'bg-undersea', target:25, obstacles:[{x:2,y:6},{x:9,y:6},{x:6,y:11}], enemies:[{type:'slime',x:3,y:3},{type:'bat',x:9,y:9}], boss:true, wallWrap:false},
  {name:'月球', bg:'bg-moon', target:30, obstacles:[{x:4,y:4},{x:7,y:4},{x:4,y:13},{x:7,y:13}], enemies:[{type:'slime',x:2,y:8},{x:10,y:8}], wallWrap:false},
  {name:'霓虹街', bg:'bg-neon', target:35, obstacles:[{x:3,y:6},{x:8,y:6},{x:6,y:3},{x:6,y:14}], enemies:[{type:'bat',x:3,y:8},{type:'bat',x:8,y:8}], boss:true, wallWrap:false}
];

const store = FX.store('snake', {bestScore:0});

// === BOARD HELPERS ===
function computeBoardLayout() {
  const margin = 32;
  const topSpace = 150;
  const bottomSpace = 300;
  
  const availW = FX.W - margin * 2;
  const availH = FX.H - topSpace - bottomSpace;
  
  cellSize = Math.floor(Math.min(availW / COLS, availH / ROWS));
  cellSize = Math.max(24, Math.min(cellSize, 48));
  
  boardW = COLS * cellSize;
  boardH = ROWS * cellSize;
  boardX = (FX.W - boardW) / 2;
  boardY = topSpace;
}

function getBoardX(gx) {
  return boardX + gx * cellSize + cellSize / 2;
}

function getBoardY(gy) {
  return boardY + gy * cellSize + cellSize / 2;
}

function gridToScreen(gx, gy) {
  return {x: getBoardX(gx), y: getBoardY(gy)};
}

function isInBounds(gx, gy) {
  return gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS;
}

function wrapCoord(gx, gy) {
  return {
    x: ((gx % COLS) + COLS) % COLS,
    y: ((gy % ROWS) + ROWS) % ROWS
  };
}

function isOccupied(gx, gy) {
  if (obstacles.some(ob => ob.x === gx && ob.y === gy)) return true;
  if (boss && boss.bombs.some(b => Math.floor(b.x) === gx && Math.floor(b.y) === gy && !b.exploded)) return true;
  return false;
}

function isSelfCollision(gx, gy) {
  return snake.slice(1).some(seg => seg.x === gx && seg.y === gy);
}

// === BUTTONS ===
const dashBtn = FX.button({icon:'item-star', color:'#ffd700', size:84, right:28, bottom:22, key:'KeyJ', cd:6, onPress:()=>{}});
const shieldBtn = FX.button({icon:'item-shield', color:'#66ccff', size:72, right:130, bottom:26, key:'KeyK', cd:15, onPress:()=>{}});

dashBtn.onPress = () => {
  if (!dashBtn.ready() || gameOver || countdownTimer > 0) return;
  GameAudio.sfx('power');
  dashTimer = 2;
  snakeSpeed = 0.06;
  FX.banner('⚡ 冲刺');
  FX.shake(4);
  const head = snake[0];
  if (head) {
    const pos = gridToScreen(head.rx, head.ry);
    FX.burst(pos.x, pos.y, {n:25, color:'#ffff00', speed:200, life:.6, size:6, glow:true});
  }
  dashBtn.setCd(6);
};

shieldBtn.onPress = () => {
  if (!shieldBtn.ready() || gameOver || countdownTimer > 0) return;
  GameAudio.sfx('levelup');
  shieldActive = true;
  FX.banner('🛡 护盾');
  const head = snake[0];
  if (head) {
    const pos = gridToScreen(head.rx, head.ry);
    FX.burst(pos.x, pos.y, {n:30, color:'#66ccff', speed:180, life:.7, size:7, glow:true});
  }
  shieldBtn.setCd(15);
};

// === JOYSTICK ===
const joy = FX.joystick({side:'left'});
let lastJoyDir = null;

function updateJoystick() {
  if (!joy.active) {
    lastJoyDir = null;
    return;
  }
  
  let newDir = null;
  if (Math.abs(joy.x) > Math.abs(joy.y)) {
    newDir = joy.x > 0 ? 'right' : 'left';
  } else if (Math.abs(joy.y) > 0.3) {
    newDir = joy.y > 0 ? 'down' : 'up';
  }
  
  if (newDir && newDir !== lastJoyDir) {
    lastJoyDir = newDir;
    queueTurn(newDir);
  }
}

// === INPUT ===
function queueTurn(dirName) {
  const dirMap = {
    left: {x:-1, y:0},
    right: {x:1, y:0},
    up: {x:0, y:-1},
    down: {x:0, y:1}
  };
  
  const newDir = dirMap[dirName];
  if (!newDir) return;
  
  const lastDir = inputBuffer.length > 0 ? inputBuffer[inputBuffer.length-1] : dir;
  if (newDir.x === -lastDir.x && newDir.y === -lastDir.y) return;
  if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;
  
  if (inputBuffer.length < 2) {
    inputBuffer.push(newDir);
  }
}

let swipeStart = null;
cv.addEventListener('pointerdown', e => {
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width * FX.W;
  const py = (e.clientY - rect.top) / rect.height * FX.H;
  
  if (px < FX.W * 0.3) return;
  
  swipeStart = {x: px, y: py, t: FX.time};
});

cv.addEventListener('pointerup', e => {
  if (!swipeStart) return;
  
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width * FX.W;
  const py = (e.clientY - rect.top) / rect.height * FX.H;
  
  const dx = px - swipeStart.x;
  const dy = py - swipeStart.y;
  const dt = FX.time - swipeStart.t;
  
  if (dt < 0.4 && (Math.abs(dx) > 40 || Math.abs(dy) > 40)) {
    if (Math.abs(dx) > Math.abs(dy)) {
      queueTurn(dx > 0 ? 'right' : 'left');
    } else {
      queueTurn(dy > 0 ? 'down' : 'up');
    }
  }
  
  swipeStart = null;
});

document.addEventListener('keydown', e => {
  if (gameOver || FX.paused) return;
  const key = e.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') queueTurn('left');
  if (key === 'arrowright' || key === 'd') queueTurn('right');
  if (key === 'arrowup' || key === 'w') queueTurn('up');
  if (key === 'arrowdown' || key === 's') queueTurn('down');
});

// === INIT GAME ===
function initGame() {
  snake = [];
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  
  for (let i = 0; i < 3; i++) {
    snake.push({
      x: startX - i,
      y: startY,
      rx: startX - i,
      ry: startY,
      t: 1
    });
  }
  
  dir = {x:1, y:0};
  inputBuffer = [];
  snakeSpeed = 0.16;
  moveTimer = 0;
  growQueue = 0;
  score = 0;
  combo = 1;
  comboTimer = 0;
  
  food = [];
  obstacles = [];
  enemies = [];
  portals = [];
  boss = null;
  
  dashTimer = 0;
  shieldActive = false;
  invulnTimer = 0;
  slowTimer = 0;
  magnetTimer = 0;
  
  gameOver = false;
  won = false;
  deathSlowMo = 0;
  startGrace = 1.2;
  countdownTimer = 3;
  countdownNumber = 3;
  startTime = 0;
  
  dashBtn.setCd(0);
  shieldBtn.setCd(0);
  
  const stageData = stages[stage];
  targetLength = stageData.target;
  
  stageData.obstacles.forEach(ob => {
    obstacles.push({...ob});
  });
  
  stageData.enemies.forEach(en => {
    if (en.type === 'slime') {
      enemies.push({
        type: 'slime',
        x: en.x,
        y: en.y,
        rx: en.x,
        ry: en.y,
        t: 1,
        dir: {x:1, y:0},
        moveTimer: 0,
        moveDelay: 0.8
      });
    } else if (en.type === 'bat') {
      enemies.push({
        type: 'bat',
        x: en.x,
        y: en.y,
        rx: en.x,
        ry: en.y,
        t: 0,
        swoopTimer: 2,
        swooping: false,
        targetY: en.y
      });
    }
  });
  
  if (Math.random() < 0.3) {
    spawnPortals();
  }
  
  if (stageData.boss) {
    boss = {
      active: false,
      activateLength: Math.floor(targetLength * 0.6),
      x: Math.floor(COLS / 2),
      y: 2,
      rx: Math.floor(COLS / 2),
      ry: 2,
      t: 1,
      moveTimer: 0,
      moveDelay: 1.2,
      bombTimer: 2.5,
      bombs: [],
      hp: 3,
      flashTimer: 0
    };
  }
  
  spawnFood();
  spawnFood();
  spawnFood();
}

// === SPAWN ===
function spawnFood() {
  const types = ['berry', 'cake', 'star', 'ice', 'magnet'];
  const weights = [50, 20, 15, 10, 5];
  
  let type = 'berry';
  const r = Math.random() * 100;
  let sum = 0;
  for (let i = 0; i < types.length; i++) {
    sum += weights[i];
    if (r < sum) {
      type = types[i];
      break;
    }
  }
  
  let x, y;
  let attempts = 0;
  do {
    x = Math.floor(Math.random() * COLS);
    y = Math.floor(Math.random() * ROWS);
    attempts++;
  } while ((isOccupied(x, y) || snake.some(s => s.x === x && s.y === y) || food.some(f => Math.floor(f.x) === x && Math.floor(f.y) === y)) && attempts < 100);
  
  if (attempts >= 100) return;
  
  food.push({type, x, y, t: 0, collected: false});
}

function spawnPortals() {
  let x1, y1, x2, y2;
  let attempts = 0;
  do {
    x1 = Math.floor(Math.random() * COLS);
    y1 = Math.floor(Math.random() * ROWS);
    x2 = Math.floor(Math.random() * COLS);
    y2 = Math.floor(Math.random() * ROWS);
    attempts++;
  } while ((Math.abs(x1-x2) < 3 || Math.abs(y1-y2) < 3 || isOccupied(x1,y1) || isOccupied(x2,y2)) && attempts < 100);
  
  if (attempts >= 100) return;
  
  const id = Math.random();
  portals.push({id, x:x1, y:y1, target:{x:x2,y:y2}, t:0});
  portals.push({id, x:x2, y:y2, target:{x:x1,y:y1}, t:0});
}

// === UPDATE ===
function update(dt) {
  if (FX.paused || gameOver) return;
  
  if (countdownTimer > 0) {
    countdownTimer -= dt;
    const newNumber = Math.ceil(countdownTimer);
    if (newNumber !== countdownNumber && newNumber > 0) {
      countdownNumber = newNumber;
      FX.banner(countdownNumber.toString());
      FX.shake(4);
    }
    if (countdownTimer <= 0) {
      countdownNumber = 0;
      FX.banner('开始！');
      startTime = FX.time;
    }
    return;
  }
  
  if (deathSlowMo > 0) {
    deathSlowMo -= dt;
    dt *= 0.2;
  }
  
  if (startGrace > 0) {
    startGrace -= dt;
  }
  
  updateJoystick();
  
  if (dashTimer > 0) {
    dashTimer -= dt;
    if (dashTimer <= 0) {
      snakeSpeed = slowTimer > 0 ? 0.24 : 0.16;
    }
  }
  
  if (slowTimer > 0) {
    slowTimer -= dt;
    if (slowTimer <= 0 && dashTimer <= 0) {
      snakeSpeed = 0.16;
    }
  }
  
  if (invulnTimer > 0) {
    invulnTimer -= dt;
  }
  
  if (magnetTimer > 0) {
    magnetTimer -= dt;
  }
  
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 1;
    }
  }
  
  moveTimer += dt;
  const actualSpeed = slowTimer > 0 ? snakeSpeed * 1.5 : snakeSpeed;
  
  if (moveTimer >= actualSpeed) {
    moveTimer -= actualSpeed;
    
    if (inputBuffer.length > 0) {
      const newDir = inputBuffer.shift();
      if (!(newDir.x === -dir.x && newDir.y === -dir.y)) {
        dir = newDir; GameAudio.sfx('tap');
      }
    }
    
    moveSnake();
  }
  
  snake.forEach(seg => {
    seg.t = Math.min(seg.t + dt * 6, 1);
    seg.rx = FX.lerp(seg.rx, seg.x, FX.ease.outCubic(seg.t));
    seg.ry = FX.lerp(seg.ry, seg.y, FX.ease.outCubic(seg.t));
  });
  
  food.forEach(f => {
    f.t += dt;
    
    if (magnetTimer > 0 && !f.collected) {
      const head = snake[0];
      const dx = head.x - f.x;
      const dy = head.y - f.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 5 && dist > 0.5) {
        f.x += (dx / dist) * dt * 3;
        f.y += (dy / dist) * dt * 3;
      }
    }
  });
  
  portals.forEach(p => {
    p.t += dt;
  });
  
  enemies.forEach(en => {
    if (en.type === 'slime') {
      en.moveTimer += dt;
      if (en.moveTimer >= en.moveDelay) {
        en.moveTimer = 0;
        
        const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const validDirs = dirs.filter(d => {
          const nx = en.x + d.x;
          const ny = en.y + d.y;
          return isInBounds(nx, ny) && !isOccupied(nx, ny) && !snake.some(s => s.x === nx && s.y === ny);
        });
        
        if (validDirs.length > 0) {
          en.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
          en.x += en.dir.x;
          en.y += en.dir.y;
          en.t = 0;
        }
      }
      
      en.t = Math.min(en.t + dt * 4, 1);
      en.rx = FX.lerp(en.rx, en.x, FX.ease.outCubic(en.t));
      en.ry = FX.lerp(en.ry, en.y, FX.ease.outCubic(en.t));
    } else if (en.type === 'bat') {
      en.swoopTimer -= dt;
      
      if (!en.swooping && en.swoopTimer <= 0) {
        en.swooping = true;
        en.targetY = Math.floor(Math.random() * ROWS);
        en.swoopTimer = 3;
      }
      
      if (en.swooping) {
        const speed = 8;
        if (en.y < en.targetY) {
          en.y = Math.min(en.y + dt * speed, en.targetY);
        } else if (en.y > en.targetY) {
          en.y = Math.max(en.y - dt * speed, en.targetY);
        }
        
        if (Math.abs(en.y - en.targetY) < 0.1) {
          en.swooping = false;
          en.y = Math.round(en.y);
        }
      }
      
      en.rx = en.x;
      en.ry = en.y;
      en.t += dt;
    }
  });
  
  if (boss && boss.active) {
    boss.moveTimer += dt;
    if (boss.moveTimer >= boss.moveDelay) {
      boss.moveTimer = 0;
      
      const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
      const validDirs = dirs.filter(d => {
        const nx = boss.x + d.x;
        const ny = boss.y + d.y;
        return isInBounds(nx, ny) && !isOccupied(nx, ny);
      });
      
      if (validDirs.length > 0) {
        const targetDir = validDirs[Math.floor(Math.random() * validDirs.length)];
        boss.x += targetDir.x;
        boss.y += targetDir.y;
        boss.t = 0;
      }
    }
    
    boss.bombTimer -= dt;
    if (boss.bombTimer <= 0) {
      boss.bombTimer = 2.5;
      dropBomb();
    }
    
    boss.t = Math.min(boss.t + dt * 3, 1);
    boss.rx = FX.lerp(boss.rx, boss.x, FX.ease.outCubic(boss.t));
    boss.ry = FX.lerp(boss.ry, boss.y, FX.ease.outCubic(boss.t));
    
    boss.bombs.forEach(b => {
      if (!b.exploded) {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.exploded = true;
          const pos = gridToScreen(b.x, b.y);
          FX.burst(pos.x, pos.y, {n:30, color:'#ff4444', speed:200, life:.7, size:8});
          FX.shake(8);
          FX.ring(pos.x, pos.y, {color:'#ff0000', r:cellSize*1.5, life:.6});
        }
      }
    });
    
    boss.bombs = boss.bombs.filter(b => !b.exploded || b.timer > -0.5);
    
    if (boss.flashTimer > 0) {
      boss.flashTimer -= dt;
    }
  }
  
  if (boss && !boss.active && snake.length >= boss.activateLength) {
    boss.active = true;
    FX.banner('⚠ BOSS 出现！');
    FX.shake(12);
  }
  
  updateHUD();
}

function moveSnake() {
  const head = snake[0];
  let newX = head.x + dir.x;
  let newY = head.y + dir.y;
  
  const stageData = stages[stage];
  
  if (stageData.wallWrap) {
    const wrapped = wrapCoord(newX, newY);
    newX = wrapped.x;
    newY = wrapped.y;
  }
  
  const portal = portals.find(p => Math.floor(p.x) === newX && Math.floor(p.y) === newY);
  let finalX = newX;
  let finalY = newY;
  
  if (portal) {
    finalX = portal.target.x;
    finalY = portal.target.y;
    const pos = gridToScreen(portal.x, portal.y);
    FX.burst(pos.x, pos.y, {n:25, color:'#aa66ff', speed:180, life:.6, size:7, glow:true});
    FX.banner('🌀 传送');
  }
  
  if (!isInBounds(finalX, finalY)) {
    if (startGrace <= 0) {
      die();
    }
    return;
  }
  
  if (isOccupied(finalX, finalY)) {
    if (startGrace <= 0) {
      die();
    }
    return;
  }
  
  const enemyHit = enemies.find(e => Math.floor(e.rx) === finalX && Math.floor(e.ry) === finalY);
  if (enemyHit) {
    if (startGrace <= 0) {
      die();
    }
    return;
  }
  
  if (boss && boss.active && Math.floor(boss.rx) === finalX && Math.floor(boss.ry) === finalY) {
    if (startGrace <= 0) {
      die();
    }
    return;
  }
  
  const bombHit = boss && boss.bombs.find(b => b.exploded && Math.floor(b.x) === finalX && Math.floor(b.y) === finalY && b.timer > -0.5);
  if (bombHit) {
    if (startGrace <= 0) {
      die();
    }
    return;
  }
  
  if (isSelfCollision(finalX, finalY)) {
    if (shieldActive) {
      shieldActive = false;
      FX.banner('🛡 护盾抵挡');
      FX.shake(6);
      const pos = gridToScreen(finalX, finalY);
      FX.burst(pos.x, pos.y, {n:30, color:'#66ccff', speed:200, life:.6, size:7});
    } else if (startGrace <= 0) {
      die();
      return;
    }
  }
  
  snake.unshift({x: finalX, y: finalY, rx: head.rx, ry: head.ry, t: 0});
  
  const foodHit = food.find(f => Math.floor(f.x) === finalX && Math.floor(f.y) === finalY && !f.collected);
  if (foodHit) {
    eatFood(foodHit);
  } else {
    if (growQueue > 0) {
      growQueue--;
    } else {
      snake.pop();
    }
  }
  
  if (currentSel && currentSel.mode === 'story' && snake.length >= targetLength) {
    win();
  }
}

function eatFood(f) {
  if(combo>1) GameFXLib.combo(combo); GameAudio.sfx(f.type === 'berry' ? 'eat' : f.type === 'cake' ? 'levelup' : 'power', {rate: 1 + Math.min(combo, 5) * .07});
  f.collected = true;
  
  const pos = gridToScreen(f.x, f.y);
  
  if (f.type === 'berry') {
    growQueue += 1;
    score += 10 * combo;
    FX.text(pos.x, pos.y, '+' + (10 * combo), {color:'#ff66aa', size:24});
    FX.burst(pos.x, pos.y, {n:15, color:'#ff66aa', speed:140, life:.5, size:6});
    comboTimer = 3;
  } else if (f.type === 'cake') {
    growQueue += 3;
    score += 50 * combo;
    FX.text(pos.x, pos.y, '+' + (50 * combo), {color:'#ffdd00', size:28, crit:true});
    FX.burst(pos.x, pos.y, {n:25, color:'#ffdd00', speed:180, life:.6, size:8, glow:true});
    FX.shake(4);
    comboTimer = 3;
  } else if (f.type === 'star') {
    growQueue += 1;
    combo = Math.min(combo + 1, 5);
    score += 20 * combo;
    FX.text(pos.x, pos.y, 'COMBO ×' + combo, {color:'#ffd700', size:26, crit:true});
    FX.burst(pos.x, pos.y, {n:20, color:'#ffd700', speed:160, life:.6, size:7, glow:true});
    comboTimer = 4;
  } else if (f.type === 'ice') {
    growQueue += 1;
    slowTimer = 5;
    snakeSpeed = 0.24;
    score += 15 * combo;
    FX.text(pos.x, pos.y, '❄ 减速', {color:'#66ddff', size:24});
    FX.burst(pos.x, pos.y, {n:18, color:'#66ddff', speed:150, life:.5, size:6, glow:true});
    comboTimer = 3;
  } else if (f.type === 'magnet') {
    growQueue += 1;
    magnetTimer = 6;
    score += 25 * combo;
    FX.text(pos.x, pos.y, '🧲 磁铁', {color:'#ff66ff', size:24});
    FX.burst(pos.x, pos.y, {n:20, color:'#ff66ff', speed:160, life:.6, size:7, glow:true});
    comboTimer = 3;
  }
  
  food = food.filter(fo => fo !== f);
  
  if (food.length < 3) {
    spawnFood();
  }
}

function dropBomb() {
  if (!boss) return;
  GameAudio.sfx('drop');
  
  let x, y;
  let attempts = 0;
  do {
    x = Math.floor(Math.random() * COLS);
    y = Math.floor(Math.random() * ROWS);
    attempts++;
  } while ((snake.some(s => s.x === x && s.y === y) || isOccupied(x, y)) && attempts < 50);
  
  if (attempts >= 50) return;
  
  boss.bombs.push({x, y, timer: 2, exploded: false});
  
  const pos = gridToScreen(x, y);
  FX.trail(pos.x, pos.y - 100, '#ff0000', 10);
}

function die() {
  GameAudio.sfx('invalid'); // Collision impact; endGame plays the final result cue.
  if (invulnTimer > 0) return;
  
  if (shieldActive) {
    shieldActive = false;
    invulnTimer = 0.5;
    FX.banner('🛡 护盾抵挡');
    FX.shake(8);
    const head = snake[0];
    if (head) {
      const pos = gridToScreen(head.rx, head.ry);
      FX.burst(pos.x, pos.y, {n:35, color:'#66ccff', speed:220, life:.7, size:8});
    }
    return;
  }
  
  gameOver = true;
  deathSlowMo = 1;
  FX.shake(15);
  FX.flash('#ff0000', 0.6);
  
  const head = snake[0];
  if (head) {
    const pos = gridToScreen(head.rx, head.ry);
    FX.burst(pos.x, pos.y, {n:50, color:'#ff4444', speed:250, life:.9, size:10});
    FX.ring(pos.x, pos.y, {color:'#ff0000', r:cellSize*2, life:.8});
  }
  
  setTimeout(() => {
    endGame(false);
  }, 1500);
}

function win() {
  gameOver = true;
  won = true;
  FX.banner('✓ 通关！');
  FX.shake(10);
  FX.flash('#00ff00', 0.5);
  
  const head = snake[0];
  if (head) {
    const pos = gridToScreen(head.rx, head.ry);
    FX.burst(pos.x, pos.y, {n:60, color:'#00ff00', speed:280, life:1, size:12, glow:true});
  }
  
  setTimeout(() => {
    endGame(true);
  }, 1500);
}

function endGame(victory) {
  if(victory) GameFXLib.win(); GameAudio.sfx(victory ? 'win' : 'lose'); GameAudio.stop();
  if (GameInviteV0.active()) { FX.running = false; GameInviteV0.finish(score); return; }
  FX.running = false;
  
  const best = Math.max(store.bestScore, score);
  store.bestScore = best;
  store.save();
  
  const playTime = Math.round(FX.time - startTime);
  const stars = victory ? (snake.length >= targetLength + 5 ? 3 : snake.length >= targetLength ? 2 : 1) : 0;
  
  Lobby.reportResult({
    win: victory,
    stage: currentSel ? currentSel.stage : 0,
    stars,
    coins: Math.floor(score / 10),
    gems: Math.floor(score / 50),
    score,
    time: playTime,
    combo,
    length: snake.length
  });
}

function updateHUD() {
  const comboStr = combo > 1 ? ` <span style="color:#ffd700;font-size:1.2em">×${combo}</span>` : '';
  const targetStr = currentSel && currentSel.mode === 'story' ? ` 目标 ${snake.length}/${targetLength}` : '';
  
  FX.hud(`
    <span class="chip">🏆 ${score}</span>
    <span class="chip">📏 ${Math.max(0, snake.length)}</span>
    ${targetStr}
    ${comboStr}
    <span class="grow"></span>
  `);
}

// === DRAW ===
function draw(ctx) {
  computeBoardLayout();
  
  const stageData = stages[stage];
  
  const bgImg = FX.img(stageData.bg);
  const scale = Math.max(FX.W / 640, FX.H / 360);
  const bgW = 640 * scale;
  const bgH = 360 * scale;
  const bgX = (FX.W - bgW) / 2;
  const bgY = (FX.H - bgH) / 2;
  ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  
  FX.motes(ctx, '#ffddee');
  
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeStyle = 'rgba(100,150,255,0.4)';
  ctx.lineWidth = 4;
  const radius = 16;
  ctx.beginPath();
  ctx.roundRect(boardX - 6, boardY - 6, boardW + 12, boardH + 12, radius);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();
  
  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const x = boardX + gx * cellSize;
      const y = boardY + gy * cellSize;
      
      const cellColor = (gx + gy) % 2 === 0 ? 'rgba(220,235,255,0.6)' : 'rgba(200,220,240,0.5)';
      ctx.fillStyle = cellColor;
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x + 1, y + cellSize - 2, cellSize - 2, 1);
    }
  }
  
  obstacles.forEach(ob => {
    const pos = gridToScreen(ob.x, ob.y);
    const size = cellSize * 0.85;
    
    ctx.fillStyle = '#8b6f47';
    ctx.fillRect(pos.x - size/2, pos.y - size/2, size, size);
    
    ctx.fillStyle = '#a0855b';
    ctx.fillRect(pos.x - size/2, pos.y - size/2, size, 4);
    
    ctx.strokeStyle = '#6b4f27';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x - size/2, pos.y - size/2, size, size);
  });
  
  portals.forEach(p => {
    const pos = gridToScreen(p.x, p.y);
    
    const pulse = 1 + Math.sin(p.t * 4) * 0.2;
    const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, cellSize / 2 * pulse);
    grad.addColorStop(0, 'rgba(170,102,255,0.8)');
    grad.addColorStop(0.5, 'rgba(170,102,255,0.4)');
    grad.addColorStop(1, 'rgba(170,102,255,0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, cellSize / 2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#aa66ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, cellSize / 3, 0, Math.PI * 2);
    ctx.stroke();
  });
  
  if (boss && boss.active) {
    boss.bombs.forEach(b => {
      const pos = gridToScreen(b.x, b.y);
      
      if (!b.exploded) {
        const flashRate = Math.min(b.timer, 1);
        const flash = Math.floor(FX.time * 10 / flashRate) % 2;
        
        ctx.fillStyle = flash ? '#ff0000' : '#ff6666';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, cellSize * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - cellSize*0.4, pos.y - cellSize*0.4, cellSize*0.8, cellSize*0.8);
      }
    });
  }
  
  food.forEach(f => {
    const pos = gridToScreen(f.x, f.y);
    
    const bob = Math.sin(f.t * 3) * 3;
    const scale = 1 + Math.sin(f.t * 4) * 0.1;
    
    let icon = 'item-heart';
    if (f.type === 'berry') icon = 'item-heart';
    else if (f.type === 'cake') icon = 'item-chest';
    else if (f.type === 'star') icon = 'item-star';
    else if (f.type === 'ice') icon = 'item-ice';
    else if (f.type === 'magnet') icon = 'item-accessory';
    
    const img = FX.img(icon);
    const size = cellSize * 0.8 * scale;
    ctx.save();
    ctx.translate(pos.x, pos.y + bob);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, -size/2, -size/2, size, size);
    ctx.restore();
  });
  
  enemies.forEach(en => {
    const pos = gridToScreen(en.rx, en.ry);
    let img;
    const size = cellSize * 1;
    
    if (en.type === 'slime') {
      img = FX.img('enemy-slime');
      const squash = 1 + Math.sin(FX.time * 6) * 0.15;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(1 / squash, squash);
      ctx.drawImage(img, -size/2, -size/2, size, size);
      ctx.restore();
    } else if (en.type === 'bat') {
      img = FX.img('enemy-bat');
      const flap = 1 + Math.sin(en.t * 10) * 0.2;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(flap, 1 / flap);
      ctx.drawImage(img, -size/2, -size/2, size, size);
      ctx.restore();
    }
  });
  
  if (boss && boss.active) {
    const pos = gridToScreen(boss.rx, boss.ry);
    
    const img = FX.img('enemy-boss');
    const size = cellSize * 1.5;
    
    if (boss.flashTimer > 0) {
      ctx.filter = 'brightness(2)';
    }
    
    ctx.drawImage(img, pos.x - size/2, pos.y - size/2, size, size);
    ctx.filter = 'none';
    
    const barW = cellSize * 1.2;
    const barH = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(pos.x - barW/2, pos.y - size/2 - 12, barW, barH);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(pos.x - barW/2, pos.y - size/2 - 12, barW * (boss.hp / 3), barH);
  }
  
  if (snake.length > 0) {
    const bodyGrad = ctx.createLinearGradient(boardX, boardY, boardX + boardW, boardY + boardH);
    bodyGrad.addColorStop(0, currentSel && currentSel.skin && currentSel.skin.filter !== 'none' ? '#88dd88' : '#66cc66');
    bodyGrad.addColorStop(1, currentSel && currentSel.skin && currentSel.skin.filter !== 'none' ? '#66bb66' : '#44aa44');
    
    ctx.strokeStyle = bodyGrad;
    ctx.lineWidth = cellSize * 0.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (invulnTimer > 0 && Math.floor(FX.time * 12) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    
    if (currentSel && currentSel.skin && currentSel.skin.filter !== 'none') {
      ctx.filter = currentSel.skin.filter;
    }
    
    ctx.beginPath();
    const head = snake[0];
    const headPos = gridToScreen(head.rx, head.ry);
    ctx.moveTo(headPos.x, headPos.y);
    
    for (let i = 1; i < snake.length; i++) {
      const seg = snake[i];
      const segPos = gridToScreen(seg.rx, seg.ry);
      ctx.lineTo(segPos.x, segPos.y);
    }
    
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = cellSize * 0.68;
    ctx.stroke();
    
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    
    const chibis = {lan:'lan-chibi',mo:'mo-chibi',li:'li-chibi',xing:'xing-chibi',hu:'hu-chibi'};
    const charKey = currentSel ? currentSel.char : 'lan';
    const chibiImg = FX.img(chibis[charKey]);
    
    const headSize = cellSize * 1.8;
    const turnSquash = Math.abs(dir.x) > 0 ? {sx:1.15, sy:0.88} : {sx:0.88, sy:1.15};
    
    ctx.save();
    ctx.translate(headPos.x, headPos.y);
    ctx.scale(turnSquash.sx, turnSquash.sy);
    
    if (currentSel && currentSel.skin && currentSel.skin.filter !== 'none') {
      ctx.filter = currentSel.skin.filter;
    }
    
    ctx.drawImage(chibiImg, -headSize/2, -headSize/2, headSize, headSize);
    ctx.restore();
    ctx.filter = 'none';
    
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(102,204,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(headPos.x, headPos.y, cellSize * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      
      const pulse = 1 + Math.sin(FX.time * 8) * 0.1;
      ctx.strokeStyle = 'rgba(102,204,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(headPos.x, headPos.y, cellSize * 0.9 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  if (countdownNumber > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, FX.W, FX.H);
    
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeText(countdownNumber.toString(), FX.W/2, FX.H/2);
    ctx.fillText(countdownNumber.toString(), FX.W/2, FX.H/2);
  }
  
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

// === START ===
function startRun(sel) {
  GameAudio.bgm('snake');
  currentSel = sel;
  stage = sel.stage % stages.length;
  
  initGame();
  
  FX.running = true;
  FX.loop(update, draw);
}

const assets = [
  'bg-garden','bg-sakura','bg-snow','bg-undersea','bg-moon','bg-neon',
  'prop-flowers','prop-sakura','prop-pine','prop-coral',
  'lan-chibi','mo-chibi','li-chibi','xing-chibi','hu-chibi',
  'enemy-slime','enemy-bat','enemy-boss',
  'item-heart','item-chest','item-star','item-ice','item-accessory','item-shield','item-weapon'
];

FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'snake',
    title: '贪吃蓝蓝',
    orientation: 'portrait',
    bg: ['bg-garden', 'prop-flowers'],
    modes: [{id:'story',icon:'item-star',name:'故事'},{id:'endless',icon:'item-ice',name:'无尽'}],
    stages: stages.map((s, i) => ({id:`s${i}`, name:s.name, bg:s.bg})),
    chars: [
      {id:'lan', name:'蓝蓝', img:'lan-chibi', chibi:'lan-chibi', hp:100, atk:80, speed:100},
      {id:'mo', name:'墨', img:'mo-chibi', chibi:'mo-chibi', hp:90, atk:90, speed:110},
      {id:'li', name:'莉', img:'li-chibi', chibi:'li-chibi', hp:110, atk:75, speed:95},
      {id:'xing', name:'星', img:'xing-chibi', chibi:'xing-chibi', hp:85, atk:100, speed:120},
      {id:'hu', name:'胡', img:'hu-chibi', chibi:'hu-chibi', hp:95, atk:85, speed:105}
    ],
    skins: [
      {name:'原色', filter:'none', rarity:'N'},
      {name:'樱糖粉', filter:'hue-rotate(30deg) saturate(1.4)', rarity:'R'},
      {name:'星河蓝', filter:'hue-rotate(200deg) saturate(1.3) brightness(1.1)', rarity:'R'},
      {name:'霓虹紫', filter:'hue-rotate(280deg) saturate(1.5) brightness(1.15)', rarity:'SR', vip:true}
    ],
    currency: [
      {id:'coin', icon:'item-chest'},
      {id:'gem', icon:'item-star'}
    ],
    onStart: startRun,
    onQuit: () => { FX.running = false; GameAudio.stop(); },
    onSkinChange: (sel) => { if (currentSel) currentSel.skin = sel.skin; }
  });
  GameInviteV0.launch('snake', startRun);
});

window.__game = {
  state: () => ({
    snake: {length: Math.max(0, snake.length), head: snake[0] ? {x:snake[0].x, y:snake[0].y} : null, dir},
    score,
    combo,
    stage: biomeNames[stage],
    target: currentSel && currentSel.mode === 'story' ? targetLength : null,
    food: food.length,
    enemies: enemies.length,
    powerups: {dash:dashTimer>0, shield:shieldActive, slow:slowTimer>0, magnet:magnetTimer>0},
    boss: boss && boss.active ? {hp:boss.hp, bombs:boss.bombs.length} : null,
    gameOver,
    won
  })
};

})();
