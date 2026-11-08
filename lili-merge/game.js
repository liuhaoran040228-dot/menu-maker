(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: false});

// === CONFIG ===
const TIERS = 11;
const RADIUS = [22, 28, 35, 43, 52, 62, 73, 85, 98, 112, 128];
const GRAVITY = 0.4;
const FRICTION = 0.98;
const BOUNCE = -0.25;
const COLLISION_DAMP = 0.7;

// Jar boundaries
const JAR_LEFT = W * 0.12;
const JAR_RIGHT = W * 0.88;
const JAR_TOP = H * 0.24;
const JAR_BOTTOM = H * 0.78;
const JAR_WIDTH = JAR_RIGHT - JAR_LEFT;
const JAR_HEIGHT = JAR_BOTTOM - JAR_TOP;

const DANGER_Y = JAR_TOP + 70;
const PREVIEW_Y = JAR_TOP - 50;

// Themed palettes
const PALETTES = [
  {
    name: '栗栗花园',
    colors: ['#f4d9b8','#ecc28f','#e4a968','#d99044','#ce7825','#f5c97a','#f7a65d','#e69138','#f9d28e','#f2b847','#ffcc55'],
    bg: 'bg-garden',
    jar: '#fef5e7'
  },
  {
    name: '樱花梦',
    colors: ['#ffe4ec','#ffccd8','#ffb3c6','#ffaac4','#ffc9db','#ffd5b8','#ffd0dc','#ff9ab8','#ff7ca0','#f7a3b3','#ffc2d1'],
    bg: 'bg-sakura',
    jar: '#fff0f5'
  },
  {
    name: '星空物语',
    colors: ['#d6e4ff','#c8d6ff','#ccdeff','#b3c8ff','#b8d4ff','#a3c0ff','#d8c8e8','#b5d8ff','#cce8ff','#94b8ff','#e8d8ff'],
    bg: 'bg-sky',
    jar: '#f0f5ff'
  }
];

// === STATE ===
let balls = [];
let score = 0;
let nextTier = 0;
let aimX = W / 2;
let dropping = false;
let dropCooldown = 0;
let isGameOver = false;
let dangerTimer = 0;
let animTime = 0;
let combo = 0;
let comboTimer = 0;

let currentSel = null;
let paletteIdx = 0;
const store = FX.store('lili-merge', {bestScore: 0});
let bestScore = parseInt(store.bestScore) || 0;

// Stages config
const stages = [
  {id: 's0', name: '新手村', target: 300, theme: 0},
  {id: 's1', name: '栗子林', target: 800, theme: 0},
  {id: 's2', name: '樱花祭', target: 1500, theme: 1},
  {id: 's3', name: '梦幻夜', target: 2500, theme: 1},
  {id: 's4', name: '星河湾', target: 4000, theme: 2},
  {id: 's5', name: '无尽挑战', target: 9999, theme: 2}
];

// === MISSIONS ===
const missionTemplates = [
  {id: 'score', text: '得分达到 {n}', check: (p, n) => score >= n, vals: [400, 800, 1500]},
  {id: 'merge', text: '合成 {n} 次', check: (p, n) => p.merges >= n, vals: [8, 15, 25]},
  {id: 'tier', text: '合成到 Lv.{n}', check: (p, n) => p.maxTier >= n, vals: [5, 7, 9]},
  {id: 'combo', text: '连击 {n} 次', check: (p, n) => p.maxCombo >= n, vals: [3, 5, 8]}
];

let missions = [];
let missionProgress = {merges: 0, maxTier: 0, maxCombo: 0};

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
      FX.burst(W / 2, H * 0.4, {n: 40, color: '#ffd700', speed: 250, life: 1, size: 8, glow: true});
      FX.ring(W / 2, H * 0.4, {color: '#ff0', r: 120, life: 0.6});
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
    bobOffset: Math.random() * Math.PI * 2,
    scaleX: 1,
    scaleY: 1
  };
}

function resetGame() {
  balls = [];
  score = 0;
  nextTier = Math.floor(Math.random() * 4);
  aimX = W / 2;
  dropping = false;
  dropCooldown = 0;
  isGameOver = false;
  dangerTimer = 0;
  animTime = 0;
  combo = 0;
  comboTimer = 0;
  missionProgress = {merges: 0, maxTier: 0, maxCombo: 0};
  generateMissions();
  
  updateHUD();
}

function dropBall() {
  if (isGameOver || dropping || dropCooldown > 0) return;
  
  const minX = JAR_LEFT + RADIUS[nextTier] + 5;
  const maxX = JAR_RIGHT - RADIUS[nextTier] - 5;
  const dropX = Math.max(minX, Math.min(maxX, aimX));
  
  const newBall = createBall(dropX, JAR_TOP + RADIUS[nextTier], nextTier);
  newBall.vy = 2;
  balls.push(newBall);
  
  nextTier = Math.floor(Math.random() * 4);
  dropping = true;
  dropCooldown = 15;
  
  FX.shake(3);
  FX.burst(dropX, JAR_TOP + RADIUS[nextTier], {n: 12, color: '#e0e0e0', speed: 100, life: 0.4, size: 5});
  FX.trail(dropX, JAR_TOP + RADIUS[nextTier], '#cccccc', 6);
}

// === PHYSICS UPDATE ===
function updatePhysics(dt) {
  for (const b of balls) {
    if (b.dead) continue;
    
    b.vy += GRAVITY;
    b.vx *= FRICTION;
    b.vy *= 0.995;
    
    b.x += b.vx;
    b.y += b.vy;
    b.age++;

    // Squash stretch on velocity
    const speed = Math.hypot(b.vx, b.vy);
    b.scaleY = FX.lerp(b.scaleY, 1 - Math.min(0.15, speed * 0.02), 0.2);
    b.scaleX = FX.lerp(b.scaleX, 1 + Math.min(0.15, speed * 0.02), 0.2);

    // Clamp to jar walls
    if (b.x < JAR_LEFT + b.r) {
      b.x = JAR_LEFT + b.r;
      b.vx *= -0.5;
      FX.burst(b.x, b.y, {n: 5, color: '#ddd', speed: 60, life: 0.3, size: 3});
    }
    if (b.x > JAR_RIGHT - b.r) {
      b.x = JAR_RIGHT - b.r;
      b.vx *= -0.5;
      FX.burst(b.x, b.y, {n: 5, color: '#ddd', speed: 60, life: 0.3, size: 3});
    }

    // Bounce off bottom
    if (b.y > JAR_BOTTOM - b.r) {
      b.y = JAR_BOTTOM - b.r;
      if (Math.abs(b.vy) > 0.5) {
        b.vy *= BOUNCE;
        b.vx *= 0.85;
        FX.burst(b.x, b.y, {n: 8, color: '#ccc', speed: 80, life: 0.35, size: 4});
      } else {
        b.vy = 0;
      }
    }
  }

  // Collision resolution (5 iterations for stability)
  for (let iter = 0; iter < 5; iter++) {
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
          if (a.tier === b.tier && !a.merged && !b.merged && a.tier < TIERS - 1 && a.age > 5 && b.age > 5) {
            a.dead = true;
            b.dead = true;
            a.merged = true;
            b.merged = true;
            
            const newTier = a.tier + 1;
            const newBall = createBall((a.x + b.x) / 2, (a.y + b.y) / 2, newTier);
            newBall.vy = -2;
            newBall.scaleX = 1.3;
            newBall.scaleY = 0.7;
            balls.push(newBall);
            
            const points = (newTier + 1) * (newTier + 1) * 10;
            score += points * (1 + combo * 0.2);
            combo++;
            comboTimer = 120;
            missionProgress.merges++;
            missionProgress.maxTier = Math.max(missionProgress.maxTier, newTier);
            missionProgress.maxCombo = Math.max(missionProgress.maxCombo, combo);
            
            FX.hitstop(0.06);
            FX.shake(5 + newTier);
            FX.burst(newBall.x, newBall.y, {n: 25, color: PALETTES[paletteIdx].colors[newTier], speed: 180, life: 0.7, size: 7, glow: true});
            FX.ring(newBall.x, newBall.y, {color: PALETTES[paletteIdx].colors[newTier], r: 100, life: 0.5});
            FX.text(newBall.x, newBall.y - 40, 'Lv.' + (newTier + 1), {color: '#ffff00', size: 28, crit: true});
            
            if (combo > 1) {
              FX.text(newBall.x, newBall.y - 70, combo + ' 连击!', {color: '#ff6699', size: 22, crit: false});
            }
            
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
  const inDanger = balls.some(b => b.age > 90 && b.y - b.r < DANGER_Y && Math.abs(b.vy) < 1);
  dangerTimer = inDanger ? dangerTimer + 1 : Math.max(0, dangerTimer - 2);

  if (dangerTimer > 120 && !isGameOver) {
    gameOver();
  }

  if (dropCooldown > 0) dropCooldown--;
  if (dropCooldown === 0) dropping = false;
  
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) combo = 0;
  }
}

// === DRAWING ===
function drawBall(b, pal) {
  const x = b.x;
  const y = b.y;
  const r = b.r;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(b.scaleX, b.scaleY);

  // Main gradient fill
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  grad.addColorStop(0, '#ffffffaa');
  grad.addColorStop(0.5, pal.colors[b.tier]);
  grad.addColorStop(1, '#00000055');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = '#00000040';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Highlight
  ctx.fillStyle = '#ffffff66';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Cute face
  const eyeY = -r * 0.15;
  const eyeSpacing = r * 0.3;
  const eyeR = r * 0.09;
  
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
  ctx.arc(eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.08, r * 0.35, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // Blush
  ctx.fillStyle = '#ff669933';
  ctx.beginPath();
  ctx.arc(-eyeSpacing * 1.4, eyeY + r * 0.2, eyeR * 0.8, 0, Math.PI * 2);
  ctx.arc(eyeSpacing * 1.4, eyeY + r * 0.2, eyeR * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Tier badge
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.font = 'bold ' + Math.max(11, r * 0.32) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(b.tier + 1, 0, r * 0.55);
  ctx.fillText(b.tier + 1, 0, r * 0.55);

  // Pop animation on spawn
  if (b.age < 20) {
    const t = b.age / 20;
    const flash = Math.sin(t * Math.PI) * 0.4;
    ctx.fillStyle = 'rgba(255,255,255,' + flash + ')';
    ctx.beginPath();
    ctx.arc(0, 0, r * (1 + (1 - t) * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawJar(pal) {
  // Shadow
  ctx.fillStyle = '#00000022';
  ctx.beginPath();
  ctx.ellipse(W / 2, JAR_BOTTOM + 15, JAR_WIDTH / 2 + 10, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jar body gradient
  const grad = ctx.createLinearGradient(JAR_LEFT, 0, JAR_RIGHT, 0);
  grad.addColorStop(0, pal.jar + 'bb');
  grad.addColorStop(0.5, pal.jar + 'ee');
  grad.addColorStop(1, pal.jar + 'bb');
  ctx.fillStyle = grad;
  
  ctx.beginPath();
  ctx.moveTo(JAR_LEFT + 15, JAR_TOP);
  ctx.lineTo(JAR_RIGHT - 15, JAR_TOP);
  ctx.quadraticCurveTo(JAR_RIGHT, JAR_TOP, JAR_RIGHT, JAR_TOP + 15);
  ctx.lineTo(JAR_RIGHT, JAR_BOTTOM - 15);
  ctx.quadraticCurveTo(JAR_RIGHT, JAR_BOTTOM, JAR_RIGHT - 15, JAR_BOTTOM);
  ctx.lineTo(JAR_LEFT + 15, JAR_BOTTOM);
  ctx.quadraticCurveTo(JAR_LEFT, JAR_BOTTOM, JAR_LEFT, JAR_BOTTOM - 15);
  ctx.lineTo(JAR_LEFT, JAR_TOP + 15);
  ctx.quadraticCurveTo(JAR_LEFT, JAR_TOP, JAR_LEFT + 15, JAR_TOP);
  ctx.closePath();
  ctx.fill();

  // Thick glass outline
  ctx.strokeStyle = '#00000044';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Inner highlight
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(JAR_LEFT + 20, JAR_TOP + 8);
  ctx.lineTo(JAR_RIGHT - 20, JAR_TOP + 8);
  ctx.quadraticCurveTo(JAR_RIGHT - 8, JAR_TOP + 8, JAR_RIGHT - 8, JAR_TOP + 20);
  ctx.lineTo(JAR_RIGHT - 8, JAR_BOTTOM - 20);
  ctx.quadraticCurveTo(JAR_RIGHT - 8, JAR_BOTTOM - 8, JAR_RIGHT - 20, JAR_BOTTOM - 8);
  ctx.lineTo(JAR_LEFT + 20, JAR_BOTTOM - 8);
  ctx.quadraticCurveTo(JAR_LEFT + 8, JAR_BOTTOM - 8, JAR_LEFT + 8, JAR_BOTTOM - 20);
  ctx.lineTo(JAR_LEFT + 8, JAR_TOP + 20);
  ctx.quadraticCurveTo(JAR_LEFT + 8, JAR_TOP + 8, JAR_LEFT + 20, JAR_TOP + 8);
  ctx.stroke();

  // Glass reflections
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(JAR_LEFT + 20, JAR_TOP + 20);
  ctx.lineTo(JAR_LEFT + 20, JAR_TOP + JAR_HEIGHT * 0.3);
  ctx.lineTo(JAR_LEFT + JAR_WIDTH * 0.25, JAR_TOP + JAR_HEIGHT * 0.25);
  ctx.lineTo(JAR_LEFT + JAR_WIDTH * 0.25, JAR_TOP + 20);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(JAR_RIGHT - JAR_WIDTH * 0.15, JAR_TOP + JAR_HEIGHT * 0.35);
  ctx.lineTo(JAR_RIGHT - JAR_WIDTH * 0.15, JAR_TOP + JAR_HEIGHT * 0.6);
  ctx.lineTo(JAR_RIGHT - 15, JAR_TOP + JAR_HEIGHT * 0.55);
  ctx.lineTo(JAR_RIGHT - 15, JAR_TOP + JAR_HEIGHT * 0.35);
  ctx.closePath();
  ctx.fill();
}

function drawDangerZone() {
  if (dangerTimer === 0) return;

  const intensity = Math.min(1, dangerTimer / 120);
  const pulse = Math.sin(FX.time * 10) * 0.5 + 0.5;
  
  ctx.strokeStyle = 'rgba(255,' + Math.floor(120 - intensity * 60) + ',' + Math.floor(120 - intensity * 60) + ',' + (0.4 + pulse * 0.4 * intensity) + ')';
  ctx.lineWidth = 4 + intensity * 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(JAR_LEFT + 5, DANGER_Y);
  ctx.lineTo(JAR_RIGHT - 5, DANGER_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (dangerTimer > 80) {
    FX.flash('#ff4444', 0.15 * intensity);
  }
}

function drawAim(pal) {
  if (isGameOver || dropping) return;

  // Aiming guide line
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(aimX, PREVIEW_Y + RADIUS[nextTier] + 10);
  ctx.lineTo(aimX, JAR_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Next ball preview (floating above jar)
  const r = RADIUS[nextTier];
  const bob = Math.sin(animTime * 3) * 4;
  const py = PREVIEW_Y + bob;
  
  ctx.save();
  ctx.translate(aimX, py);

  // Preview ball
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  grad.addColorStop(0, '#ffffffaa');
  grad.addColorStop(0.5, pal.colors[nextTier]);
  grad.addColorStop(1, '#00000055');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#00000040';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#ffffff66';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Face
  const eyeY = -r * 0.15;
  const eyeSpacing = r * 0.3;
  const eyeR = r * 0.09;
  
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
  ctx.arc(eyeSpacing + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.08, r * 0.35, 0.3, Math.PI - 0.3);
  ctx.stroke();

  ctx.fillStyle = '#ff669933';
  ctx.beginPath();
  ctx.arc(-eyeSpacing * 1.4, eyeY + r * 0.2, eyeR * 0.8, 0, Math.PI * 2);
  ctx.arc(eyeSpacing * 1.4, eyeY + r * 0.2, eyeR * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.font = 'bold ' + Math.max(11, r * 0.32) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(nextTier + 1, 0, r * 0.55);
  ctx.fillText(nextTier + 1, 0, r * 0.55);

  ctx.restore();

  // "下一个" label
  ctx.fillStyle = '#666666';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('下一个', aimX, py - r - 20);
}

function updateHUD() {
  const completedMissions = missions.filter(m => m.completed).length;
  const targetScore = currentSel ? stages[currentSel.stage].target : 500;
  
  let hudHTML = `
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">💰 ${score}</span>
    <span class="chip">🏆 ${bestScore}</span>
    <span class="chip">✓ ${completedMissions}/3</span>
  `;
  
  if (combo > 1) {
    hudHTML += `<span class="chip" style="background:#ff6699;color:#fff">⚡ ${combo}连击</span>`;
  }
  
  hudHTML += `<span class="grow"></span>`;
  
  FX.hud(hudHTML);
  FX.bar('hp', Math.min(1, dangerTimer / 120));
}

function drawMissionProgress() {
  const startY = H * 0.82;
  const spacing = 32;
  
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  
  missions.forEach((m, i) => {
    const y = startY + i * spacing;
    const completed = m.completed;
    
    // Background chip
    ctx.fillStyle = completed ? '#4caf5055' : '#00000033';
    ctx.beginPath();
    ctx.roundRect(20, y - 12, W - 40, 28, 14);
    ctx.fill();
    
    // Icon
    ctx.fillStyle = completed ? '#4caf50' : '#888888';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(completed ? '✓' : '○', 35, y + 5);
    
    // Text
    ctx.fillStyle = completed ? '#ffffff' : '#cccccc';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(m.text.replace('{n}', m.value), 60, y + 5);
  });
}

// === INPUT ===
cv.addEventListener('pointermove', e => {
  if (isGameOver || dropping) return;
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (W / rect.width);
  const minX = JAR_LEFT + RADIUS[nextTier] + 5;
  const maxX = JAR_RIGHT - RADIUS[nextTier] - 5;
  aimX = Math.max(minX, Math.min(maxX, px));
});

cv.addEventListener('pointerdown', e => {
  if (isGameOver) return;
  const rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (W / rect.width);
  const py = (e.clientY - rect.top) * (H / rect.height);
  
  // Only respond to taps inside jar area
  if (px >= JAR_LEFT && px <= JAR_RIGHT && py >= JAR_TOP - 80 && py <= JAR_BOTTOM) {
    const minX = JAR_LEFT + RADIUS[nextTier] + 5;
    const maxX = JAR_RIGHT - RADIUS[nextTier] - 5;
    aimX = Math.max(minX, Math.min(maxX, px));
    dropBall();
  }
});

document.addEventListener('keydown', e => {
  if (isGameOver) return;
  if (e.code === 'Space') {
    e.preventDefault();
    dropBall();
  } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    e.preventDefault();
    aimX = Math.max(JAR_LEFT + RADIUS[nextTier] + 5, aimX - 25);
  } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    e.preventDefault();
    aimX = Math.min(JAR_RIGHT - RADIUS[nextTier] - 5, aimX + 25);
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

  // Background with proper portrait scaling
  const bgScale = Math.max(W / 640, H / 360);
  const bgW = 640 * bgScale;
  const bgH = 360 * bgScale;
  const bgX = (W - bgW) / 2;
  const bgY = (H - bgH) / 2;
  
  const bgImg = FX.img(pal.bg);
  c.drawImage(bgImg, bgX, bgY, bgW, bgH);

  // Motes
  FX.motes(c, '#ffffff33');

  // Bottom decorations
  const propImg = FX.img('prop-flowers');
  for (let i = 0; i < 3; i++) {
    const px = W * (0.15 + i * 0.35);
    const py = H - 30;
    c.globalAlpha = 0.6;
    FX.drawSprite(c, propImg, px, py, 65, {});
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

  // Aiming preview
  drawAim(pal);

  // Danger zone warning
  drawDangerZone();

  // Mission progress
  drawMissionProgress();

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
  const targetScore = stages[stageIdx].target;
  const win = score >= targetScore;

  let stars = 0;
  if (win) stars = 1;
  if (score >= targetScore * 1.5) stars = 2;
  if (score >= targetScore * 2 && completedMissions >= 2) stars = 3;

  Lobby.reportResult({
    stage: stageIdx,
    stars: stars,
    coins: Math.floor(score / 8),
    gems: Math.floor(score / 400) + completedMissions,
    win: win,
    score: score,
    combo: missionProgress.maxCombo,
    level: missionProgress.maxTier
  });
}

// === BOOSTERS ===
function boosterShake() {
  FX.shake(18);
  FX.burst(W / 2, H / 2, {n: 60, color: '#66ccff', speed: 280, life: 1, size: 10, glow: true});
  FX.ring(W / 2, H / 2, {color: '#66ccff', r: 150, life: 0.6});
  
  for (const b of balls) {
    const angle = Math.random() * Math.PI * 2;
    b.vx += Math.cos(angle) * 4;
    b.vy += Math.sin(angle) * 4;
  }
}

function boosterRemove() {
  if (!window.VIP?.active()) {
    FX.banner('需要 VIP 解锁');
    return;
  }
  if (balls.length === 0 || isGameOver) return;
  
  const smallest = balls.reduce((a, b) => b.tier < a.tier ? b : a);
  const idx = balls.indexOf(smallest);
  balls.splice(idx, 1);
  
  FX.burst(smallest.x, smallest.y, {n: 25, color: '#ff6699', speed: 200, life: 0.8, size: 7, glow: true});
  FX.shake(8);
}

function boosterUpgrade() {
  if (!window.VIP?.active()) {
    FX.banner('需要 VIP 解锁');
    return;
  }
  if (balls.length === 0 || isGameOver) return;
  
  const toUpgrade = balls.find(b => b.tier < TIERS - 1);
  if (toUpgrade) {
    toUpgrade.tier++;
    toUpgrade.r = RADIUS[toUpgrade.tier];
    toUpgrade.scaleX = 1.4;
    toUpgrade.scaleY = 0.6;
    FX.burst(toUpgrade.x, toUpgrade.y, {n: 35, color: '#ffdd00', speed: 220, life: 0.8, size: 9, glow: true});
    FX.ring(toUpgrade.x, toUpgrade.y, {color: '#ffdd00', r: 120, life: 0.6});
    FX.shake(10);
  }
}

// === BUTTONS ===
const shakeBtn = FX.button({
  icon: 'item-ice', 
  color: '#66ccff', 
  size: 64, 
  right: 20, 
  bottom: H - JAR_BOTTOM + 50, 
  key: 'KeyJ', 
  cd: 8, 
  onPress: boosterShake
});

const removeBtn = FX.button({
  icon: 'item-star', 
  color: '#ff6699', 
  size: 58, 
  right: 100, 
  bottom: H - JAR_BOTTOM + 50, 
  key: 'KeyK', 
  onPress: boosterRemove
});

const upgradeBtn = FX.button({
  icon: 'item-heart', 
  color: '#ffaa88', 
  size: 56, 
  right: 174, 
  bottom: H - JAR_BOTTOM + 50, 
  key: 'KeyL', 
  onPress: boosterUpgrade
});

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
    title: '🌰 栗栗合成大作战',
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
      {id: '0', name: '栗栗花园', filter: 'none', rarity: 'N'},
      {id: '1', name: '樱花梦', filter: 'hue-rotate(340deg) saturate(1.15)', rarity: 'SSR', vip: true},
      {id: '2', name: '星空物语', filter: 'hue-rotate(220deg) saturate(1.1)', rarity: 'SSR', vip: true}
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
    combo: combo,
    missions: missions.map(m => ({
      text: m.text.replace('{n}', m.value),
      done: m.completed
    }))
  })
};

})();
