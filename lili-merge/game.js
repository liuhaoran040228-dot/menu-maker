(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: false});

// === CONFIG ===
const TIERS = 11;
const RADIUS = [22, 28, 35, 43, 52, 62, 73, 85, 98, 112, 120];
const GRAVITY = 0.35;
const FRICTION = 0.99;
const BOUNCE = -0.3;
const COLLISION_DAMP = 0.6;

// Jar boundaries
const JAR_LEFT = W * 0.08;
const JAR_RIGHT = W * 0.92;
const JAR_TOP = H * 0.22;
const JAR_BOTTOM = H * 0.86;
const JAR_WIDTH = JAR_RIGHT - JAR_LEFT;
const JAR_HEIGHT = JAR_BOTTOM - JAR_TOP;

const DANGER_Y = JAR_TOP + 80;

// Themed palettes
const PALETTES = [
  {
    name: '栗栗与伙伴',
    colors: ['#e9c79a','#d9a46b','#c98b4f','#b8743a','#a86030','#f0b860','#e88a5a','#d4a020','#f4d070','#e6b800','#ffcc33'],
    bg: 'bg-garden',
    jar: '#f5e8d8'
  },
  {
    name: '樱糖萌娘',
    colors: ['#ffd6e0','#ffb3c6','#ff9ebb','#f7a8c4','#f2c6de','#f9d5a7','#ffc2d1','#ff8fab','#fb6f92','#e5989b','#ffafcc'],
    bg: 'bg-sakura',
    jar: '#ffe8f0'
  },
  {
    name: '星河萌娘',
    colors: ['#c8d6ff','#b8c0ff','#bbd0ff','#9fa8ff','#a0c4ff','#8fb8ff','#cdb4db','#a2d2ff','#bde0fe','#7aa2ff','#e0c3fc'],
    bg: 'bg-sky',
    jar: '#e8f0ff'
  }
];

// === STATE ===
let balls = [];
let score = 0;
let nextTier = 0;
let aimX = W / 2;
let cooldown = 0;
let isGameOver = false;
let dangerTimer = 0;
let animTime = 0;

let currentSel = null;
let paletteIdx = 0;
const store = FX.store('lili-merge', {bestScore: 0});
let bestScore = parseInt(store.bestScore) || 0;

// Stages config
const stages = [
  {id: 's0', name: '初心者关', target: 4, theme: 0},
  {id: 's1', name: '中级关', target: 6, theme: 1},
  {id: 's2', name: '高级关', target: 8, theme: 2},
  {id: 's3', name: '终极关', target: 10, theme: 0},
  {id: 's4', name: '无尽挑战', target: 11, theme: 1},
  {id: 's5', name: '巅峰冲刺', target: 11, theme: 2}
];

// === MISSIONS ===
const missionTemplates = [
  {id: 'score', text: '得分达到 {n} 分', check: (p, n) => score >= n, vals: [500, 1000, 2000]},
  {id: 'merge', text: '合成 {n} 个球', check: (p, n) => p.merges >= n, vals: [5, 10, 15]},
  {id: 'tier', text: '合成到第 {n} 阶', check: (p, n) => p.maxTier >= n, vals: [4, 6, 8]},
  {id: 'drop', text: '投出 {n} 个球', check: (p, n) => p.drops >= n, vals: [20, 30, 50]}
];

let missions = [];
let missionProgress = {merges: 0, maxTier: 0, drops: 0};

function generateMissions() {
  missions = [];
  const pool = [...missionTemplates];
  for (let i = 0; i < 3; i++) {
    if (pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    const tpl = pool.splice(idx, 1)[0];
    const val = tpl.vals[Math.floor(Math.random() * tpl.vals.length)];
    missions.push({...tpl, value: val, completed: false});
  }
}

function checkMissions() {
  missions.forEach(m => {
    if (!m.completed && m.check(missionProgress, m.value)) {
      m.completed = true;
      FX.banner('✓ ' + m.text.replace('{n}', m.value));
      FX.burst(W / 2, H / 2, {n: 30, color: '#ffd700', speed: 200, life: 0.8, size: 6, glow: true});
      score += 500;
    }
  });
}

// === PHYSICS BALL ===
function createBall(x, y, tier) {
  return {
    x, y,
    vx: 0, vy: 0,
    tier,
    r: RADIUS[tier],
    age: 0,
    dead: false,
    merged: false,
    flashTime: 0
  };
}

function resetGame() {
  balls = [];
  score = 0;
  nextTier = Math.floor(Math.random() * 4);
  aimX = W / 2;
  cooldown = 0;
  isGameOver = false;
  dangerTimer = 0;
  animTime = 0;
  missionProgress = {merges: 0, maxTier: 0, drops: 0};
  generateMissions();
  
  // Spawn first ball ready
  const minX = JAR_LEFT + RADIUS[nextTier];
  const maxX = JAR_RIGHT - RADIUS[nextTier];
  aimX = W / 2;
  balls.push(createBall(aimX, JAR_TOP + RADIUS[nextTier] + 10, nextTier));
  nextTier = Math.floor(Math.random() * 4);
  
  updateHUD();
}

function dropBall() {
  if (isGameOver || cooldown > 0 || balls.length === 0) return;
  
  // Find ball at top (next tier preview position)
  const minX = JAR_LEFT + RADIUS[nextTier];
  const maxX = JAR_RIGHT - RADIUS[nextTier];
  const dropX = Math.max(minX, Math.min(maxX, aimX));
  
  // Drop the first ball that's still in aim zone or create new
  let dropped = false;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    if (Math.abs(b.y - (JAR_TOP + RADIUS[b.tier] + 10)) < 5 && Math.abs(b.x - aimX) < 10) {
      b.x = dropX;
      b.vy = 0;
      dropped = true;
      break;
    }
  }
  
  if (!dropped) {
    balls.push(createBall(dropX, JAR_TOP + RADIUS[nextTier] + 10, nextTier));
  }
  
  missionProgress.drops++;
  nextTier = Math.floor(Math.random() * 4);
  cooldown = 25;
  FX.shake(2);
  FX.burst(dropX, JAR_TOP + RADIUS[nextTier] + 10, {n: 8, color: '#dddddd', speed: 80, life: 0.3, size: 4});
}

// === PHYSICS UPDATE ===
function updatePhysics(dt) {
  for (const b of balls) {
    if (b.dead) continue;
    b.vy += GRAVITY;
    b.vx *= FRICTION;
    b.x += b.vx;
    b.y += b.vy;
    b.age++;

    // Clamp to jar walls
    if (b.x < JAR_LEFT + b.r) {
      b.x = JAR_LEFT + b.r;
      b.vx *= -0.4;
    }
    if (b.x > JAR_RIGHT - b.r) {
      b.x = JAR_RIGHT - b.r;
      b.vx *= -0.4;
    }

    // Bounce off bottom
    if (b.y > JAR_BOTTOM - b.r) {
      b.y = JAR_BOTTOM - b.r;
      b.vy *= BOUNCE;
      b.vx *= 0.9;
    }
  }

  // Collision resolution (4 iterations for stability)
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (a.dead || b.dead) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = a.r + b.r;

        if (dist < minDist) {
          // Merge if same tier
          if (a.tier === b.tier && !a.merged && !b.merged && a.tier < TIERS - 1) {
            a.dead = true;
            b.dead = true;
            const newTier = a.tier + 1;
            const newBall = createBall((a.x + b.x) / 2, (a.y + b.y) / 2, newTier);
            newBall.vy = -1;
            balls.push(newBall);
            score += (newTier + 1) * (newTier + 1) * 10;
            missionProgress.merges++;
            missionProgress.maxTier = Math.max(missionProgress.maxTier, newTier);
            
            FX.hitstop(0.05);
            FX.shake(4);
            FX.burst(newBall.x, newBall.y, {n: 20, color: '#ffdd00', speed: 150, life: 0.5, size: 6, glow: true});
            FX.ring(newBall.x, newBall.y, {color: '#ffaa00', r: 80, life: 0.4});
            FX.text(newBall.x, newBall.y - 50, 'LV ' + (newTier + 1), {color: '#ff0', size: 24, crit: true});
            continue;
          }

          // Separate overlapping balls
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // Elastic collision
          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const relVel = relVx * nx + relVy * ny;
          if (relVel < 0) {
            const impulse = relVel * COLLISION_DAMP;
            a.vx += nx * impulse;
            a.vy += ny * impulse;
            b.vx -= nx * impulse;
            b.vy -= ny * impulse;
          }
        }
      }
    }
  }

  // Remove dead balls
  balls = balls.filter(b => !b.dead);

  // Check danger zone
  const inDanger = balls.some(b => b.age > 60 && b.y - b.r < DANGER_Y && Math.abs(b.vy) < 0.5);
  dangerTimer = inDanger ? dangerTimer + 1 : 0;

  if (dangerTimer > 60 && !isGameOver) {
    gameOver();
  }

  if (cooldown > 0) cooldown--;
}

// === DRAWING ===
function drawBall(b, pal) {
  const x = b.x;
  const y = b.y;
  const r = b.r;

  // Gradient fill
  const grad = ctx.createRadialGradient(x - r / 3, y - r / 3, 0, x, y, r);
  grad.addColorStop(0, '#ffffff88');
  grad.addColorStop(0.6, pal.colors[b.tier]);
  grad.addColorStop(1, '#00000044');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = '#00000033';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Face
  const eyeY = y - r * 0.15;
  const eyeSpacing = r * 0.35;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(x - eyeSpacing, eyeY, r * 0.08, 0, Math.PI * 2);
  ctx.arc(x + eyeSpacing, eyeY, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.arc(x, y + r * 0.1, r * 0.4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Tier number
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.max(12, r * 0.35) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.tier + 1, x, y + r * 0.5);

  // Flash on merge
  if (b.age < 30) {
    const flash = Math.sin(b.age / 30 * Math.PI) * 0.3;
    ctx.fillStyle = 'rgba(255,255,255,' + flash + ')';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawJar(pal) {
  // Jar body with glass effect
  const grad = ctx.createLinearGradient(JAR_LEFT, 0, JAR_RIGHT, 0);
  grad.addColorStop(0, pal.jar + 'aa');
  grad.addColorStop(0.5, pal.jar + 'dd');
  grad.addColorStop(1, pal.jar + 'aa');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(JAR_LEFT, JAR_TOP, JAR_WIDTH, JAR_HEIGHT, [20, 20, 15, 15]);
  ctx.fill();

  // Thick glass outline
  ctx.strokeStyle = '#00000055';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner highlight
  ctx.strokeStyle = '#ffffff44';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(JAR_LEFT + 8, JAR_TOP + 8, JAR_WIDTH - 16, JAR_HEIGHT - 16, [15, 15, 10, 10]);
  ctx.stroke();

  // Glass shine
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.roundRect(JAR_LEFT + 15, JAR_TOP + 15, JAR_WIDTH * 0.3, JAR_HEIGHT * 0.25, 12);
  ctx.fill();

  // Reflection
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.roundRect(JAR_RIGHT - JAR_WIDTH * 0.2, JAR_TOP + JAR_HEIGHT * 0.3, JAR_WIDTH * 0.15, JAR_HEIGHT * 0.4, 8);
  ctx.fill();
}

function drawDangerZone() {
  if (dangerTimer === 0) return;

  const pulse = Math.sin(FX.time * 8) * 0.5 + 0.5;
  ctx.strokeStyle = 'rgba(255,100,100,' + (0.3 + pulse * 0.4) + ')';
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(JAR_LEFT, DANGER_Y);
  ctx.lineTo(JAR_RIGHT, DANGER_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (dangerTimer > 40) {
    FX.flash('#ff3333', 0.2);
  }
}

function drawAim(pal) {
  if (isGameOver) return;

  // Aiming line
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(aimX, JAR_TOP);
  ctx.lineTo(aimX, JAR_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Next ball preview
  const nextX = aimX;
  const nextY = JAR_TOP - RADIUS[nextTier] - 20;
  const r = RADIUS[nextTier];
  
  const grad = ctx.createRadialGradient(nextX - r / 3, nextY - r / 3, 0, nextX, nextY, r);
  grad.addColorStop(0, '#ffffff88');
  grad.addColorStop(0.6, pal.colors[nextTier]);
  grad.addColorStop(1, '#00000044');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(nextX, nextY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00000033';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Face on preview
  const eyeY = nextY - r * 0.15;
  const eyeSpacing = r * 0.35;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(nextX - eyeSpacing, eyeY, r * 0.08, 0, Math.PI * 2);
  ctx.arc(nextX + eyeSpacing, eyeY, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.arc(nextX, nextY + r * 0.1, r * 0.4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.max(10, r * 0.35) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nextTier + 1, nextX, nextY + r * 0.5);
}

function updateHUD() {
  const completedMissions = missions.filter(m => m.completed).length;
  FX.hud(`
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">💰 ${score}</span>
    <span class="chip">🏆 ${bestScore}</span>
    <span class="chip">✓ ${completedMissions}/3</span>
    <span class="grow"></span>
  `);
  FX.bar('hp', Math.min(1, dangerTimer / 100));
}

// === INPUT ===
cv.addEventListener('pointermove', e => {
  if (isGameOver) return;
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (W / rect.width);
  const minX = JAR_LEFT + RADIUS[nextTier];
  const maxX = JAR_RIGHT - RADIUS[nextTier];
  aimX = Math.max(minX, Math.min(maxX, px));
});

cv.addEventListener('pointerdown', e => {
  if (isGameOver) return;
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (W / rect.width);
  const minX = JAR_LEFT + RADIUS[nextTier];
  const maxX = JAR_RIGHT - RADIUS[nextTier];
  aimX = Math.max(minX, Math.min(maxX, px));
});

cv.addEventListener('pointerup', () => {
  dropBall();
});

document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    dropBall();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    aimX = Math.max(JAR_LEFT + RADIUS[nextTier], aimX - 30);
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    aimX = Math.min(JAR_RIGHT - RADIUS[nextTier], aimX + 30);
  }
});

// === GAME LOOP ===
function update(dt) {
  if (FX.paused) return;

  animTime += dt;
  updatePhysics(dt);
  checkMissions();
  updateHUD();
}

function draw(c) {
  const pal = PALETTES[paletteIdx];

  // Background with proper scaling for portrait
  const bgScale = Math.max(W / 640, H / 360);
  const bgW = 640 * bgScale;
  const bgH = 360 * bgScale;
  const bgX = (W - bgW) / 2;
  const bgY = (H - bgH) / 2;
  
  const bgImg = FX.img(pal.bg);
  c.drawImage(bgImg, bgX, bgY, bgW, bgH);

  // Motes
  FX.motes(c, '#ffffff44');

  // Bottom decorations
  const propImg = FX.img('prop-flowers');
  for (let i = 0; i < 3; i++) {
    const px = W * (0.2 + i * 0.3);
    const py = H - 50;
    c.globalAlpha = 0.7;
    FX.drawSprite(c, propImg, px, py, 80, {});
    c.globalAlpha = 1;
  }

  // Jar
  drawJar(pal);

  // Balls
  balls.forEach(b => {
    if (!b.dead) {
      drawBall(b, pal);
    }
  });

  // Aiming
  drawAim(pal);

  // Danger zone
  drawDangerZone();

  // Effects
  FX.drawFX(c);
  FX.vignette(c);
}

function gameOver() {
  isGameOver = true;
  FX.running = false;

  if (score > bestScore) {
    bestScore = score;
    store.bestScore = bestScore;
    store.save();
  }

  const completedMissions = missions.filter(m => m.completed).length;
  const stageIdx = currentSel ? currentSel.stage : 0;

  Lobby.reportResult({
    stage: stageIdx,
    stars: Math.min(3, completedMissions),
    coins: Math.floor(score / 10),
    gems: Math.floor(score / 500),
    win: false
  });
}

// === BOOSTERS ===
function boosterShake() {
  FX.shake(15);
  FX.burst(W / 2, H / 2, {n: 50, color: '#66ccff', speed: 250, life: 0.8, size: 8, glow: true});
  for (const b of balls) {
    const angle = Math.random() * Math.PI * 2;
    b.vx += Math.cos(angle) * 3;
    b.vy += Math.sin(angle) * 3;
  }
}

function boosterRemove() {
  if (!window.VIP?.active()) {
    FX.banner('需要 VIP');
    return;
  }
  if (balls.length === 0 || isGameOver) return;
  const smallest = balls.reduce((a, b) => b.tier < a.tier ? b : a);
  const idx = balls.indexOf(smallest);
  balls.splice(idx, 1);
  FX.burst(smallest.x, smallest.y, {n: 20, color: '#ff6699', speed: 150, life: 0.6, size: 6});
}

function boosterUpgrade() {
  if (!window.VIP?.active()) {
    FX.banner('需要 VIP');
    return;
  }
  if (balls.length === 0 || isGameOver) return;
  const toUpgrade = balls.find(b => b.tier < TIERS - 1);
  if (toUpgrade) {
    toUpgrade.tier++;
    toUpgrade.r = RADIUS[toUpgrade.tier];
    FX.burst(toUpgrade.x, toUpgrade.y, {n: 30, color: '#ffdd00', speed: 180, life: 0.7, size: 8, glow: true});
    FX.shake(6);
  }
}

// === BUTTONS ===
const shakeBtn = FX.button({icon: 'item-ice', color: '#66ccff', size: 64, right: 20, bottom: JAR_BOTTOM + 30, key: 'KeyS', cd: 5, onPress: boosterShake});
const removeBtn = FX.button({icon: 'item-star', color: '#ff6699', size: 60, right: 100, bottom: JAR_BOTTOM + 30, key: 'KeyD', onPress: boosterRemove});
const upgradeBtn = FX.button({icon: 'item-heart', color: '#ffaa88', size: 56, right: 180, bottom: JAR_BOTTOM + 30, key: 'KeyU', onPress: boosterUpgrade});

// === START ===
function startRun(sel) {
  currentSel = sel;
  paletteIdx = stages[sel.stage].theme;
  
  resetGame();
  FX.running = true;
  FX.loop(update, draw);
}

const assets = [
  'bg-garden', 'bg-sakura', 'bg-sky',
  'item-ice', 'item-star', 'item-heart', 'item-chest', 'item-shield', 'item-weapon',
  'li-chibi', 'mo-chibi', 'lan-chibi', 'xing-chibi', 'hu-chibi',
  'prop-flowers'
];

FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'lili-merge',
    title: '🌰 栗栗合成大栗子',
    orientation: 'portrait',
    bg: ['bg-garden', 'bg-sakura', 'bg-sky'],
    modes: [
      {id: 'story', name: '故事', icon: 'item-star'},
      {id: 'endless', name: '无尽', icon: 'item-ice'}
    ],
    stages: stages,
    chars: [
      {id: 'li', name: '栗栗', img: 'li-chibi', chibi: 'li-chibi', hp: 100, atk: 80, speed: 100},
      {id: 'lan', name: '蓝蓝', img: 'lan-chibi', chibi: 'lan-chibi', hp: 90, atk: 90, speed: 110},
      {id: 'mo', name: '墨', img: 'mo-chibi', chibi: 'mo-chibi', hp: 110, atk: 75, speed: 95},
      {id: 'xing', name: '星眠', img: 'xing-chibi', chibi: 'xing-chibi', hp: 85, atk: 100, speed: 120},
      {id: 'hu', name: '橙铃', img: 'hu-chibi', chibi: 'hu-chibi', hp: 95, atk: 85, speed: 105}
    ],
    skins: [
      {id: '0', name: '栗栗与伙伴', filter: 'none', rarity: 'N'},
      {id: '1', name: '樱糖萌娘', filter: 'hue-rotate(345deg) saturate(1.2)', rarity: 'SSR', vip: true},
      {id: '2', name: '星河萌娘', filter: 'hue-rotate(220deg) saturate(1.1)', rarity: 'SSR', vip: true}
    ],
    currency: [
      {id: 'coin', icon: 'item-chest'},
      {id: 'gem', icon: 'item-star'}
    ],
    onStart: startRun,
    onQuit: () => { FX.running = false; },
    onSkinChange: (sel) => { 
      if (currentSel && sel.skin) {
        paletteIdx = Math.min(2, parseInt(sel.skin.id) || 0);
      }
    }
  });
});

window.__game = {
  state: () => ({
    balls: balls.length,
    score: score,
    nextTier: nextTier,
    isGameOver: isGameOver,
    dangerLevel: Math.min(100, dangerTimer),
    missions: missions.map(m => ({
      text: m.text.replace('{n}', m.value),
      done: m.completed
    }))
  })
};

})();
