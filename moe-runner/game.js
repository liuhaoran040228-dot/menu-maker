// 萌娘星风跑酷 (moe-runner) - game.js
(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: true, logicalH: 540});

// === STATE ===
let hero = null;
let groundY = 440;
let heroY = groundY;
let heroVY = 0;
let heroState = 'run';
let heroAnimT = 0;
let canDoubleJump = false;
let coyoteTimer = 0;
let slideTimer = 0;
let invulnTimer = 0;
let hitFlashTimer = 0;
let landingTimer = 0;

let scrollX = 0;
let speed = 420;
const baseSpeed = 420;
const maxSpeed = 900;
let distance = 0;
let coins = 0;
let combo = 0;
let comboTimer = 0;
const runnerLifeCap = () => 3 + (window.VIP?.active() ? Number(window.VIP?.perks?.().runner_bonus_lives || 0) : 0);
let lives = 3;
let score = 0;
let lastCoinPopupCount = 0;

let biome = 0;
let biomeDistance = 0;
let biomeTransition = 0;
const biomes = [
  {name:'樱花小镇', bg:'bg-sakura', props:[{img:'prop-sakura',speed:.6,y:320,h:220,gap:450,alpha:.85}], moteColor:'#ffb3d9', groundColor:'#e8b4c8'},
  {name:'松林', bg:'bg-forest', props:[{img:'prop-pine',speed:.65,y:300,h:240,gap:520,alpha:.8}], moteColor:'#90ee90', groundColor:'#5a8a5a'},
  {name:'雪原', bg:'bg-snow', props:[], moteColor:'#e0f7ff', groundColor:'#d0e8f0'},
  {name:'霓虹街', bg:'bg-neon', props:[{img:'prop-lantern',speed:.7,y:250,h:150,gap:380,alpha:.9}], moteColor:'#ff66ff', groundColor:'#6a4a7a'},
  {name:'星轨', bg:'bg-rail', props:[{img:'prop-rail',speed:.75,y:360,h:180,gap:400,alpha:.7}], moteColor:'#ffdd88', groundColor:'#7a6a5a'},
  {name:'云海', bg:'bg-sky', props:[], moteColor:'#aaddff', groundColor:'#8ab4d4'}
];

let obstacles = [];
let coins_arr = [];
let powerups = [];
let boss = null;

let magnetTimer = 0;
let shieldTimer = 0;
let coinMultiplier = 1;
let coinMultTimer = 0;

let missions = [];
let missionProgress = {coins:0, jumps:0, slides:0, kills:0};
let currentSel = null;

const store = FX.store('moe-runner', {bestScore:0, bestDistance:0});

// === MISSIONS ===
const missionTemplates = [
  {id:'coins', text:'收集{n}个金币', icon:'💰', check:(p,n)=>p.coins>=n, vals:[50,100,150]},
  {id:'jumps', text:'跳跃{n}次', icon:'🦘', check:(p,n)=>p.jumps>=n, vals:[20,30,50]},
  {id:'slides', text:'滑铲{n}次', icon:'🛹', check:(p,n)=>p.slides>=n, vals:[15,20,30]},
  {id:'distance', text:'跑{n}米', icon:'📍', check:(p,n)=>distance>=n, vals:[500,1000,1500]}
];

function generateMissions() {
  missions = [];
  const pool = [...missionTemplates];
  for (let i=0; i<3; i++) {
    if (pool.length===0) break;
    const idx = Math.floor(Math.random()*pool.length);
    const tpl = pool.splice(idx,1)[0];
    const val = tpl.vals[Math.floor(Math.random()*tpl.vals.length)];
    missions.push({...tpl, value:val, completed:false});
  }
}

function checkMissions() {
  missions.forEach(m => {
    if (!m.completed && m.check(missionProgress, m.value)) {
      m.completed = true;
      FX.banner('✓ ' + m.text.replace('{n}', m.value));
      FX.burst(W/2, H/2, {n:30, color:'#ffd700', speed:200, life:.8, size:6, glow:true});
      score += 500;
    }
  });
}

// === HERO ===
function resetHero() {
  heroY = groundY;
  heroVY = 0;
  heroState = 'run';
  heroAnimT = 0;
  canDoubleJump = false;
  coyoteTimer = 0;
  slideTimer = 0;
  invulnTimer = 0;
  hitFlashTimer = 0;
  landingTimer = 0;
  hero = {
    x: 180,
    w: 50,
    h: 150
  };
}

function jump() {
  if (slideTimer > 0) return;
  const grounded = Math.abs(heroY - groundY) < 5;
  if (grounded || coyoteTimer > 0) {
    heroVY = -620;
    heroState = 'jump';
    canDoubleJump = true;
    coyoteTimer = 0;
    FX.burst(hero.x, groundY, {n:12, color:'#dddddd', speed:140, life:.5, size:5});
    missionProgress.jumps++;
  } else if (canDoubleJump) {
    heroVY = -580;
    canDoubleJump = false;
    FX.burst(hero.x, heroY+60, {n:15, color:'#66ddff', speed:160, life:.6, size:6, glow:true});
    missionProgress.jumps++;
  }
}

function slide() {
  if (heroState==='jump') {
    heroVY += 400;
  }
  heroState = 'slide';
  slideTimer = 0.4;
  missionProgress.slides++;
  FX.burst(hero.x, groundY, {n:8, color:'#aaaaaa', speed:100, life:.4, size:4});
}

function skill() {
  if (!skillBtn.ready()) return;
  FX.banner('⭐ 星爆');
  FX.shake(8);
  FX.hitstop(0.08);
  FX.flash('#ffdd00', 0.4);
  FX.burst(hero.x+80, heroY-70, {n:50, color:'#ffffaa', speed:300, life:.8, size:8, glow:true});
  FX.ring(hero.x+80, heroY-70, {color:'#ffff00', r:150, life:.6});
  
  obstacles = obstacles.filter(ob => {
    if (ob.x > hero.x && ob.x < hero.x + 250) {
      FX.burst(ob.x, ob.y, {n:15, color:'#ff6666', speed:180, life:.6, size:6});
      score += 50;
      missionProgress.kills++;
      return false;
    }
    return true;
  });
}

// === BUTTONS ===
const jumpBtn = FX.button({icon:'item-star', color:'#ffd700', size:104, right:22, bottom:22, key:'Space', hold:true});
const slideBtn = FX.button({icon:'item-shield', color:'#66ccff', size:82, right:140, bottom:18, key:'KeyS'});
const skillBtn = FX.button({icon:'item-weapon', color:'#ff6699', size:70, right:40, bottom:140, key:'KeyJ', cd:10, onPress:skill});

// === TAP/SWIPE CONTROLS ===
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

let swipeFired = false;
function toLogical(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
cv.addEventListener('pointerdown', e => {
  const [px, py] = toLogical(e);
  touchStartX = px; touchStartY = py; touchStartTime = FX.time || 0.0001; swipeFired = false;
});
cv.addEventListener('pointermove', e => {
  if (!touchStartTime || swipeFired) return;
  const [px, py] = toLogical(e);
  const dy = py - touchStartY, dx = px - touchStartX;
  if (Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx)) { swipeFired = true; dy < 0 ? jump() : slide(); }
});
cv.addEventListener('pointerup', e => {
  if (!touchStartTime) return;
  if (!swipeFired) jump();
  touchStartTime = 0;
});

// === OBSTACLES ===
function spawnObstacle(type, x) {
  const ob = {type, x, removed:false};
  if (type==='crate') {
    ob.y = groundY;
    ob.w = 60;
    ob.h = 60;
  } else if (type==='barrier') {
    ob.y = groundY;
    ob.w = 50;
    ob.h = 140;
  } else if (type==='gap') {
    ob.y = groundY+20;
    ob.w = 150;
    ob.h = 20;
  } else if (type==='bat') {
    ob.y = groundY - 120;
    ob.w = 50;
    ob.h = 50;
    ob.t = 0;
    ob.baseY = ob.y;
  } else if (type==='slime') {
    ob.y = groundY;
    ob.w = 60;
    ob.h = 60;
    ob.vx = -80;
  } else if (type==='crystal') {
    ob.y = -50;
    ob.vy = 0;
    ob.w = 50;
    ob.h = 70;
    ob.warned = false;
  } else if (type==='platform') {
    ob.y = groundY - 180;
    ob.w = 120;
    ob.h = 30;
    ob.vy = Math.random()>0.5 ? 40 : -40;
    ob.rangeY = [groundY-250, groundY-100];
  }
  obstacles.push(ob);
}

function spawnCoins(x, pattern) {
  if (pattern==='arc') {
    for (let i=0; i<8; i++) {
      const t = i/7;
      const cx = x + t*200;
      const cy = groundY - 80 - Math.sin(t*Math.PI)*100;
      coins_arr.push({x:cx, y:cy, vx:0, vy:0, t:0, collected:false});
    }
  } else if (pattern==='wave') {
    for (let i=0; i<10; i++) {
      coins_arr.push({x:x+i*40, y:groundY-120+Math.sin(i)*50, vx:0,vy:0,t:0,collected:false});
    }
  } else {
    for (let i=0; i<5; i++) {
      coins_arr.push({x:x+i*50, y:groundY-100, vx:0,vy:0,t:0,collected:false});
    }
  }
}

function spawnPowerup(type, x) {
  powerups.push({type, x, y:groundY-100, w:50, h:50, t:0, collected:false});
}

function spawnBoss() {
  boss = {
    x: W + 100,
    y: groundY - 100,
    vx: -200,
    hp: 3,
    phase: 'chase',
    shootTimer: 1.2,
    projectiles: [],
    stunTimer: 0,
    flashTimer: 0,
    spawnTime: FX.time
  };
  FX.banner('⚠ BOSS 来袭！');
  FX.shake(10);
}

let spawnTimer = 0.9;
let coinTimer = 0.6;

function updateSpawning(dt) {
  if (boss) return;
  
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const x = W + 200;
    const r = Math.random();
    if (r < 0.25) {
      spawnObstacle('crate', x);
    } else if (r < 0.45) {
      spawnObstacle('barrier', x);
    } else if (r < 0.55) {
      spawnObstacle('gap', x);
    } else if (r < 0.7) {
      spawnObstacle('bat', x);
    } else if (r < 0.82) {
      spawnObstacle('slime', x);
    } else if (r < 0.9) {
      spawnObstacle('crystal', x);
    } else {
      spawnObstacle('platform', x);
    }
    
    if (Math.random()<0.05) {
      const types = ['magnet','shield','rocket','x2'];
      spawnPowerup(types[Math.floor(Math.random()*types.length)], x + FX.rand(100,200));
    }
    
    spawnTimer = FX.rand(0.9, 1.6);
  }
  
  coinTimer -= dt;
  if (coinTimer <= 0) {
    const cx = W + FX.rand(150, 250);
    const pattern = ['arc','wave','line'][Math.floor(Math.random()*3)];
    spawnCoins(cx, pattern);
    coinTimer = 0.6;
  }
}

// === COLLISION ===
function rectCollide(a, b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function checkCollisions() {
  if (invulnTimer > 0) return;
  
  const heroBox = {
    x: hero.x - hero.w/2,
    y: heroY - hero.h,
    w: hero.w,
    h: hero.h * (slideTimer > 0 ? 0.5 : 1)
  };
  
  obstacles.forEach(ob => {
    if (ob.removed) return;
    const obBox = {x:ob.x-ob.w/2, y:ob.y-ob.h, w:ob.w, h:ob.h};
    if (ob.type==='gap') {
      const grounded = Math.abs(heroY - groundY)<5;
      if (grounded && hero.x > ob.x-ob.w/2 && hero.x < ob.x+ob.w/2) {
        if (shieldTimer>0) {
          shieldTimer = 0;
          ob.removed = true;
          FX.burst(ob.x, ob.y, {n:20, color:'#66ccff', speed:150, life:.6, size:6});
        } else {
          hit();
        }
      }
    } else if (rectCollide(heroBox, obBox)) {
      if (shieldTimer > 0) {
        shieldTimer = 0;
        ob.removed = true;
        FX.burst(ob.x, ob.y, {n:20, color:'#66ccff', speed:150, life:.6, size:6});
        score += 50;
      } else {
        hit();
        ob.removed = true;
      }
    }
  });
  
  if (boss && boss.phase==='chase') {
    boss.projectiles.forEach(proj => {
      if (proj.removed) return;
      const pBox = {x:proj.x-20, y:proj.y-20, w:40, h:40};
      if (rectCollide(heroBox, pBox)) {
        if (shieldTimer>0) {
          shieldTimer = 0;
          proj.removed = true;
          FX.burst(proj.x, proj.y, {n:15, color:'#66ccff', speed:120, life:.5, size:5});
        } else {
          hit();
          proj.removed = true;
        }
      }
    });
  }
}

function hit() {
  lives = Math.max(0, lives - 1);
  invulnTimer = 1.5;
  hitFlashTimer = 0.08;
  FX.hitstop(0.08);
  FX.shake(12);
  FX.flash('#ff0000', 0.5);
  FX.burst(hero.x, heroY-70, {n:30, color:'#ff4444', speed:200, life:.7, size:7});
  combo = 0;
  FX.bar('hp', Math.max(0, lives)/runnerLifeCap());
  if (lives <= 0) {
    gameOver();
  }
}

// === COIN COLLECTION ===
function collectCoin(c) {
  c.collected = true;
  coins += coinMultiplier;
  score += 10 * coinMultiplier;
  combo++;
  comboTimer = 2.0;
  missionProgress.coins++;
  
  const shouldShowPopup = (coins - lastCoinPopupCount) >= 3;
  if (shouldShowPopup) {
    const isCrit = combo >= 5;
    const amount = coins - lastCoinPopupCount;
    FX.text(c.x, c.y, '+' + (amount*10*coinMultiplier), {color:isCrit?'#ff0':'#ffd700', size:isCrit?28:20, crit:isCrit});
    lastCoinPopupCount = coins;
  }
  
  FX.burst(c.x, c.y, {n:8, color:'#ffd700', speed:100, life:.5, size:4, glow:true});
  FX.trail(c.x, c.y, '#ffdd00', 6);
}

function collectPowerup(p) {
  p.collected = true;
  FX.burst(p.x, p.y, {n:20, color:'#66ff66', speed:150, life:.6, size:6, glow:true});
  if (p.type==='magnet') {
    magnetTimer = 8;
    FX.banner('🧲 磁铁');
  } else if (p.type==='shield') {
    shieldTimer = 10;
    FX.banner('🛡 护盾');
  } else if (p.type==='rocket') {
    lives = Math.min(runnerLifeCap(), lives+1);
    FX.bar('hp', Math.max(0, lives)/runnerLifeCap());
    FX.banner('💖 生命+1');
  } else if (p.type==='x2') {
    coinMultiplier = 2;
    coinMultTimer = 10;
    FX.banner('✨ 双倍金币');
  }
}

// === UPDATE ===
function update(dt) {
  if (FX.paused) return;
  
  heroAnimT += dt;
  
  if (jumpBtn.down) {
    jump();
  }
  
  if (slideBtn.down && slideTimer <= 0) {
    slide();
  }
  
  const grounded = Math.abs(heroY - groundY) < 5;
  if (!grounded) {
    heroVY += 1800 * dt;
    heroY += heroVY * dt;
    if (heroY >= groundY) {
      heroY = groundY;
      heroVY = 0;
      heroState = 'run';
      landingTimer = 0.12;
      FX.burst(hero.x, groundY, {n:12, color:'#cccccc', speed:120, life:.5, size:5});
      FX.shake(3);
    }
    coyoteTimer = 0;
  } else {
    if (heroState==='jump') heroState='run';
    coyoteTimer = 0.1;
  }
  
  if (slideTimer > 0) {
    slideTimer -= dt;
    if (slideTimer <= 0) {
      heroState = 'run';
    }
  }
  
  if (landingTimer > 0) landingTimer -= dt;
  
  speed = baseSpeed + (distance / 100) * (maxSpeed - baseSpeed) / 150;
  speed = Math.min(speed, maxSpeed);
  scrollX += speed * dt;
  distance = Math.floor(scrollX / 10);
  score = Math.floor(distance + coins*10);
  
  biomeDistance += speed * dt;
  if (biomeDistance >= 6000) {
    biomeDistance = 0;
    biome = (biome + 1) % biomes.length;
    biomeTransition = 1.5;
    FX.banner('进入 ' + biomes[biome].name);
  }
  if (biomeTransition > 0) {
    biomeTransition -= dt;
  }
  
  if (invulnTimer > 0) invulnTimer -= dt;
  if (hitFlashTimer > 0) hitFlashTimer -= dt;
  if (magnetTimer > 0) magnetTimer -= dt;
  if (shieldTimer > 0) shieldTimer -= dt;
  if (coinMultTimer > 0) {
    coinMultTimer -= dt;
    if (coinMultTimer <= 0) coinMultiplier = 1;
  }
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }
  
  if (!boss && distance >= 1000 && distance % 1000 < 10) {
    spawnBoss();
  }
  
  if (boss) {
    if (boss.phase === 'chase') {
      boss.x += boss.vx * dt;
      if (boss.x < W/2 + 200) boss.x = W/2 + 200;
      
      boss.shootTimer -= dt;
      if (boss.shootTimer <= 0) {
        boss.projectiles.push({x:boss.x, y:boss.y, vx:-400, vy:FX.rand(-100,100), removed:false});
        FX.burst(boss.x, boss.y, {n:10, color:'#ff6666', speed:120, life:.4, size:5});
        boss.shootTimer = 1.2;
      }
      
      boss.projectiles.forEach(p => {
        if (p.removed) return;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -100) p.removed = true;
        FX.trail(p.x, p.y, '#ff4444', 8);
      });
      
      if (FX.time - boss.spawnTime > 15) {
        boss.phase = 'stun';
        boss.stunTimer = 2;
        boss.hp--;
        FX.banner('BOSS 眩晕！');
        FX.shake(10);
        FX.hitstop(0.12);
        FX.burst(boss.x, boss.y, {n:50, color:'#ffaa00', speed:250, life:.8, size:10, glow:true});
        FX.ring(boss.x, boss.y, {color:'#ff8800', r:200, life:.8});
        score += 1000;
        if (boss.hp <= 0) {
          boss = null;
          FX.banner('✓ BOSS 击败！');
        }
      }
    } else if (boss.phase === 'stun') {
      boss.stunTimer -= dt;
      boss.x += 80 * dt;
      if (boss.stunTimer <= 0) {
        boss.phase = 'chase';
        boss.spawnTime = FX.time;
        boss.shootTimer = 1;
      }
    }
    if (boss && boss.x > W + 300) boss = null;
    if (boss) boss.flashTimer = (boss.flashTimer||0) - dt;
  }
  
  updateSpawning(dt);
  
  obstacles.forEach(ob => {
    if (ob.removed) return;
    ob.x -= speed * dt;
    if (ob.type==='bat') {
      ob.t += dt*2;
      ob.y = ob.baseY + Math.sin(ob.t)*40;
    } else if (ob.type==='slime') {
      ob.x += ob.vx * dt;
    } else if (ob.type==='crystal') {
      if (!ob.warned && ob.x < W + 100) {
        ob.warned = true;
        FX.trail(ob.x, 50, '#ff0000', 10);
      }
      if (ob.warned) {
        ob.vy += 1200 * dt;
        ob.y += ob.vy * dt;
        if (ob.y >= groundY) {
          ob.y = groundY;
          FX.burst(ob.x, ob.y, {n:20, color:'#aaddff', speed:180, life:.6, size:6});
          FX.shake(6);
          ob.removed = true;
        }
      }
    } else if (ob.type==='platform') {
      ob.y += ob.vy * dt;
      if (ob.y < ob.rangeY[0] || ob.y > ob.rangeY[1]) ob.vy *= -1;
      
      if (heroState==='jump' && heroVY>0 && Math.abs(hero.x-ob.x)<ob.w/2 && Math.abs(heroY-ob.y)<20) {
        heroY = ob.y;
        heroVY = -500;
        FX.burst(ob.x, ob.y, {n:8, color:'#88ff88', speed:100, life:.4, size:5});
      }
    }
    if (ob.x < -200) ob.removed = true;
  });
  obstacles = obstacles.filter(ob => !ob.removed);
  
  coins_arr.forEach(c => {
    if (c.collected) return;
    c.t += dt;
    c.x -= speed * dt;
    
    const dist = Math.hypot(c.x - hero.x, c.y - heroY+75);
    if (magnetTimer > 0 && dist < 200) {
      const angle = Math.atan2(heroY-75 - c.y, hero.x - c.x);
      c.vx = Math.cos(angle) * 400;
      c.vy = Math.sin(angle) * 400;
    }
    
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    
    if (dist < 40) {
      collectCoin(c);
    }
    if (c.x < -100) c.collected = true;
    FX.trail(c.x, c.y, '#ffd700', 4);
  });
  coins_arr = coins_arr.filter(c => !c.collected);
  
  powerups.forEach(p => {
    if (p.collected) return;
    p.t += dt;
    p.x -= speed * dt;
    p.y += Math.sin(p.t*3)*1.5;
    
    const dist = Math.hypot(p.x - hero.x, p.y - heroY+75);
    if (dist < 50) {
      collectPowerup(p);
    }
    if (p.x < -100) p.collected = true;
  });
  powerups = powerups.filter(p => !p.collected);
  
  checkCollisions();
  checkMissions();
  
  const comboStr = combo>=3 ? ` <span style="color:#ff0;font-size:1.2em">×${combo}</span>` : '';
  const lifeStr = Math.max(0, lives);
  const missionIcons = missions.map(m => m.icon + (m.completed ? '✓' : '')).join(' ');
  FX.hud(`
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">💰 ${coins}</span>
    <span class="chip">📍 ${distance}m</span>
    <span class="chip">❤️ ${'♥'.repeat(lifeStr)}</span>
    <span class="chip">${missionIcons}</span>
    ${comboStr}
    <span class="grow"></span>
  `);
}

// === DRAW ===
function draw(ctx) {
  const b = biomes[biome];
  const bPrev = biomes[(biome-1+biomes.length)%biomes.length];
  const trans = Math.max(0, 1 - biomeTransition/1.5);
  
  if (biomeTransition > 0) {
    ctx.globalAlpha = 1 - trans;
    FX.parallax(ctx, [
      {img:bPrev.bg, speed:.2, y:0, h:540, alpha:1},
      ...bPrev.props
    ], scrollX);
    ctx.globalAlpha = trans;
  }
  
  FX.parallax(ctx, [
    {img:b.bg, speed:.2, y:0, h:540, alpha:1},
    ...b.props
  ], scrollX);
  
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  FX.motes(ctx, b.moteColor);
  
  const groundColor = b.groundColor;
  const tileW = 80;
  const startTile = Math.floor((scrollX-100)/tileW);
  const endTile = Math.ceil((scrollX+W+100)/tileW);
  
  const grad = ctx.createLinearGradient(0, groundY, 0, groundY+30);
  grad.addColorStop(0, groundColor);
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundY, W, 200);
  
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(0, groundY, W, 2);
  
  for (let i=startTile; i<=endTile; i++) {
    const x = i*tileW - scrollX;
    const seed = i * 7919;
    for (let j=0; j<3; j++) {
      const gx = x + ((seed+j*13)%tileW);
      const gy = groundY + ((seed+j*17)%20) + 5;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(gx, gy+1, 2, 8);
      ctx.fillStyle = 'rgba(100,150,100,0.7)';
      ctx.fillRect(gx, gy, 2, 8);
    }
    
    if (biome===2) {
      for (let s=0; s<2; s++) {
        const sx = x + ((seed+s*23)%tileW);
        const sy = groundY + ((seed+s*31)%15) + 3;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }
  
  const fgProps = scrollX * 1.3;
  const fgImg = FX.img('prop-flowers');
  for (let i = 0; i < 4; i++) {
    const px = W + 200 - (((fgProps + i * 420) % (W + 400)));
    FX.drawSprite(ctx, fgImg, px, H + 30, 150 + (i % 2) * 30, { alpha: 0.9 });
  }
  if (speed > 350) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    for (let i=0; i<8; i++) {
      const x = (scrollX*2 + i*100) % W;
      const y = FX.rand(100, 400);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x-60, y);
      ctx.stroke();
    }
  }
  
  obstacles.forEach(ob => {
    if (ob.removed) return;
    const x = ob.x;
    if (x < -200 || x > W+200) return;
    
    ctx.filter = 'none';
    
    if (ob.type==='crate') {
      const img = FX.img('item-chest');
      FX.drawSprite(ctx, img, x, ob.y, 60);
    } else if (ob.type==='barrier') {
      const img = FX.img('prop-rail');
      FX.drawSprite(ctx, img, x, ob.y, 140);
    } else if (ob.type==='gap') {
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      const gx = x - ob.w/2;
      ctx.fillRect(gx, groundY, ob.w, 200);
      
      const depthGrad = ctx.createLinearGradient(gx, groundY, gx, groundY+80);
      depthGrad.addColorStop(0, 'rgba(60,40,20,0.8)');
      depthGrad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = depthGrad;
      ctx.fillRect(gx, groundY, ob.w, 80);
      
      for (let i=0; i<5; i++) {
        const sx = gx + Math.random() * ob.w;
        const sy = groundY - 5 + Math.random() * 10;
        ctx.fillStyle = 'rgba(100,80,60,0.7)';
        ctx.beginPath();
        ctx.arc(sx, sy, 3+Math.random()*3, 0, Math.PI*2);
        ctx.fill();
      }
      
      for (let i=0; i<3; i++) {
        const px = gx + ob.w/4 + i*ob.w/4;
        const py = groundY + 20 + Math.random()*20;
        ctx.fillStyle = '#ffa500';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff6600';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      ctx.strokeStyle = 'rgba(139,69,19,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, groundY);
      ctx.lineTo(gx + 10, groundY - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx + ob.w, groundY);
      ctx.lineTo(gx + ob.w - 10, groundY - 8);
      ctx.stroke();
    } else if (ob.type==='bat') {
      const img = FX.img('enemy-bat');
      const scale = 1 + Math.sin(ob.t*10)*0.1;
      FX.drawSprite(ctx, img, x, ob.y+25, 50, {sx:scale, sy:1/scale, flip:true});
    } else if (ob.type==='slime') {
      const img = FX.img('enemy-slime');
      const squash = 1 + Math.sin(FX.time*8)*0.15;
      FX.drawSprite(ctx, img, x, ob.y, 60, {sx:1/squash, sy:squash});
    } else if (ob.type==='crystal') {
      if (ob.warned && ob.y < groundY) {
        ctx.strokeStyle = 'rgba(255,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5,5]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, groundY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const img = FX.img('prop-crystal');
      FX.drawSprite(ctx, img, x, ob.y+35, 70, {glow:true});
    } else if (ob.type==='platform') {
      ctx.fillStyle = '#6a8a6a';
      ctx.fillRect(x-ob.w/2, ob.y-ob.h, ob.w, ob.h);
      ctx.fillStyle = '#8aaa8a';
      ctx.fillRect(x-ob.w/2, ob.y-ob.h, ob.w, 4);
    }
    
    ctx.filter = 'none';
  });
  
  coins_arr.forEach(c => {
    if (c.collected) return;
    const x = c.x;
    if (x < -100 || x > W+100) return;
    FX.coin(ctx, x, c.y - 14, 14, c.t + x * 0.01);
  });
  
  powerups.forEach(p => {
    if (p.collected) return;
    const x = p.x;
    if (x < -100 || x > W+100) return;
    const iconMap = {magnet:'item-chest', shield:'item-shield', rocket:'item-heart', x2:'item-star'};
    const img = FX.img(iconMap[p.type]);
    const bob = Math.sin(p.t*3)*10;
    ctx.filter = 'none';
    FX.drawSprite(ctx, img, x, p.y+bob, 50, {glow:true});
  });
  
  if (boss) {
    const x = boss.x;
    const img = FX.img('enemy-boss');
    const flash = (boss.flashTimer||0)>0 || boss.phase==='stun';
    ctx.filter = flash ? 'brightness(2)' : 'none';
    FX.drawSprite(ctx, img, x, boss.y, 120, {flip:true});
    ctx.filter = 'none';
    
    boss.projectiles.forEach(p => {
      if (p.removed) return;
      const px = p.x;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(px, p.y, 15, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x-60, boss.y-150, 120, 10);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x-60, boss.y-150, 120*(boss.hp/3), 10);
  }
  
  let heroImg;
  let heroH = 150;
  let heroSx = 1;
  let heroSy = 1;
  
  if (currentSel && currentSel.char === 'lan') {
    if (heroState==='run') {
      heroImg = FX.img('whale-run');
      const cycle = (heroAnimT*speed/100) % 1;
      heroSy = 1 + Math.sin(cycle*Math.PI*2)*0.05;
      heroSx = 1 / heroSy;
      heroH = 170;
    } else if (heroState==='jump') {
      heroImg = FX.img('whale-jump');
      heroSy = heroVY<0 ? 1.25 : 0.85;
      heroSx = 1 / heroSy;
      heroH = 170;
    } else if (slideTimer > 0) {
      heroImg = FX.img('whale-attack');
      heroSx = 1.4;
      heroSy = 0.65;
      heroH = 120;
    }
  } else {
    const chibis = {lan:'lan-chibi',mo:'mo-chibi',li:'li-chibi',xing:'xing-chibi',hu:'hu-chibi'};
    const charKey = currentSel ? currentSel.char : 'lan';
    heroImg = FX.img(chibis[charKey] || 'lan-chibi');
    if (heroState==='run') {
      const cycle = (heroAnimT*speed/100) % 1;
      heroSy = 1 + Math.sin(cycle*Math.PI*2)*0.06;
      heroSx = 1 / heroSy;
      heroH = 170;
    } else if (heroState==='jump') {
      heroSy = heroVY<0 ? 1.2 : 0.88;
      heroSx = 1 / heroSy;
      heroH = 170;
    } else if (slideTimer > 0) {
      heroSx = 1.3;
      heroSy = 0.7;
      heroH = 120;
    }
  }
  
  if (landingTimer > 0) {
    const t = 1 - landingTimer/0.12;
    heroSy *= 0.85 + t*0.15;
    heroSx *= 1.15 - t*0.15;
  }
  
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  
  if (invulnTimer>0 && Math.floor(FX.time*15)%2===0) {
    ctx.globalAlpha = 0.6;
  }
  ctx.save(); ctx.globalAlpha *= 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(hero.x, 442, 46, 9, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 10;
  if (hitFlashTimer > 0) {
    ctx.filter = 'brightness(3)';
  } else if (currentSel && currentSel.skin && currentSel.skin.filter && currentSel.skin.filter !== 'none') {
    ctx.filter = currentSel.skin.filter;
  }
  
  FX.drawSprite(ctx, heroImg, hero.x, heroY, heroH, {sx:heroSx, sy:heroSy});
  ctx.shadowBlur = 0;
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  
  if (shieldTimer > 0) {
    ctx.strokeStyle = 'rgba(102,204,255,0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hero.x, heroY-75, 65, 0, Math.PI*2);
    ctx.stroke();
    
    const pulse = 1 + Math.sin(FX.time*10)*0.1;
    ctx.strokeStyle = 'rgba(102,204,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hero.x, heroY-75, 65*pulse, 0, Math.PI*2);
    ctx.stroke();
  }
  
  if (speed > 400) {
    ctx.globalAlpha = 0.2;
    const trailFilter = (currentSel && currentSel.skin && currentSel.skin.filter !== 'none') ? currentSel.skin.filter : 'none';
    ctx.filter = trailFilter;
    for (let i=1; i<=3; i++) {
      const offset = i * 40;
      FX.drawSprite(ctx, heroImg, hero.x-offset, heroY, heroH, {sx:heroSx, sy:heroSy});
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }
  
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

// === GAME OVER ===
function gameOver() {
  FX.running = false;
  const best = Math.max(store.bestScore, score);
  store.bestScore = best;
  store.bestDistance = Math.max(store.bestDistance, distance);
  store.save();
  
  const completedMissions = missions.filter(m=>m.completed).length;
  
  Lobby.reportResult({
    stage: currentSel ? currentSel.stage : 0,
    win: distance >= 1000,
    stars: Math.min(3, Math.floor(completedMissions / 1.5)),
    coins,
    gems: Math.floor(score / 100)
  });
}

// === START ===
function startRun(sel) {
  currentSel = sel;
  
  resetHero();
  scrollX = 0;
  speed = baseSpeed;
  distance = 0;
  coins = 0;
  combo = 0;
  comboTimer = 0;
  lives = runnerLifeCap();
  score = 0;
  biome = sel.stage % biomes.length;
  biomeDistance = 0;
  biomeTransition = 0;
  lastCoinPopupCount = 0;
  
  obstacles = [];
  coins_arr = [];
  powerups = [];
  boss = null;
  
  magnetTimer = 0;
  shieldTimer = 0;
  coinMultiplier = 1;
  coinMultTimer = 0;
  
  missionProgress = {coins:0, jumps:0, slides:0, kills:0};
  generateMissions();
  
  spawnTimer = 0.9;
  coinTimer = 0.6;
  
  FX.running = true;
  FX.loop(update, draw);
}

const assets = [
  'bg-sakura','bg-forest','bg-snow','bg-neon','bg-rail','bg-sky',
  'prop-sakura','prop-pine','prop-lantern','prop-rail','prop-crystal','prop-flowers',
  'enemy-bat','enemy-slime','enemy-boss',
  'lan-chibi','mo-chibi','li-chibi','xing-chibi','hu-chibi',
  'whale-run','whale-jump','whale-attack','whale-idle',
  'item-star','item-chest','item-shield','item-heart','item-weapon'
];

FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'moe-runner',
    title: '萌娘星风跑酷',
    orientation: 'landscape',
    bg: biomes.map(b => b.bg),
    modes: [{id:'story',name:'故事'},{id:'endless',name:'无尽'}],
    stages: [
      {id:'s0', name:'樱花道', bg:'bg-sakura'},
      {id:'s1', name:'森林路', bg:'bg-forest'},
      {id:'s2', name:'冰雪地', bg:'bg-snow'},
      {id:'s3', name:'霓虹街', bg:'bg-neon'},
      {id:'s4', name:'铁轨线', bg:'bg-rail'},
      {id:'s5', name:'天空岛', bg:'bg-sky'}
    ],
    chars: [
      {id:'lan', name:'蓝蓝', img:'whale-idle', chibi:'whale-run', hp:100, atk:80, speed:100},
      {id:'mo', name:'墨', img:'mo-chibi', chibi:'mo-chibi', hp:90, atk:90, speed:110},
      {id:'li', name:'莉', img:'li-chibi', chibi:'li-chibi', hp:110, atk:75, speed:95},
      {id:'xing', name:'星', img:'xing-chibi', chibi:'xing-chibi', hp:85, atk:100, speed:120},
      {id:'hu', name:'胡', img:'hu-chibi', chibi:'hu-chibi', hp:95, atk:85, speed:105}
    ],
    skins: [
      {name:'原始', filter:'none'},
      {name:'红晕', filter:'hue-rotate(10deg) saturate(1.3)'},
      {name:'寒冰', filter:'hue-rotate(200deg) saturate(1.2) brightness(1.1)'},
      {name:'星耀', filter:'hue-rotate(60deg) saturate(1.5) brightness(1.15)', vip:true}
    ],
    currency: [
      {id:'coin', icon:'item-chest'},
      {id:'gem', icon:'item-star'}
    ],
    onStart: startRun,
    onQuit: () => { FX.running = false; },
    onSkinChange: (sel) => { if (currentSel) currentSel.skin = sel.skin; }
  });
});

window.__game = {
  state: () => ({
    hero: {x:hero.x, y:heroY, state:heroState},
    distance: distance,
    coins,
    combo,
    lives,
    score,
    biome: biomes[biome].name,
    speed: Math.floor(speed),
    obstacles: obstacles.length,
    powerups: {magnet:magnetTimer>0, shield:shieldTimer>0, x2:coinMultiplier>1},
    boss: boss ? {phase:boss.phase, hp:boss.hp} : null,
    missions: missions.map(m=>({text:m.text.replace('{n}',m.value),done:m.completed}))
  })
};

})();
FX.useSideSprites('run');
