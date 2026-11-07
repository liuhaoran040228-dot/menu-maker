// 萌娘星风跑酷 (moe-runner) - game.js
(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: true, logicalH: 540});

// === STATE ===
let hero = null;
let selectedChar = 'lan';
let groundY = 420;
let heroY = groundY;
let heroVY = 0;
let heroState = 'run'; // run, jump, slide
let heroAnimT = 0;
let jumpHeld = false;
let canDoubleJump = false;
let coyoteTimer = 0;
let jumpBufferTimer = 0;
let slideTimer = 0;
let invulnTimer = 0;
let hitFlashTimer = 0;

let scrollX = 0;
let speed = 280;
let baseSpeed = 280;
let distance = 0;
let coins = 0;
let combo = 0;
let comboTimer = 0;
let lives = 3;
let score = 0;

let biome = 0;
let biomeDistance = 0;
let biomeTransition = 0;
const biomes = [
  {name:'sakura', bg:'bg-sakura', props:[{img:'prop-sakura',speed:.6,y:320,h:220,gap:450,alpha:.85}], moteColor:'#ffb3d9'},
  {name:'forest', bg:'bg-forest', props:[{img:'prop-pine',speed:.65,y:300,h:240,gap:520,alpha:.8}], moteColor:'#90ee90'},
  {name:'snow', bg:'bg-snow', props:[], moteColor:'#e0f7ff'},
  {name:'neon', bg:'bg-neon', props:[{img:'prop-lantern',speed:.7,y:250,h:150,gap:380,alpha:.9}], moteColor:'#ff66ff'},
  {name:'rail', bg:'bg-rail', props:[{img:'prop-rail',speed:.75,y:360,h:180,gap:400,alpha:.7}], moteColor:'#ffdd88'},
  {name:'sky', bg:'bg-sky', props:[], moteColor:'#aaddff'}
];

let obstacles = [];
let coins_arr = [];
let powerups = [];
let particles_queue = [];
let boss = null;

let magnetTimer = 0;
let shieldTimer = 0;
let coinMultiplier = 1;
let coinMultTimer = 0;

let missions = [];
let missionProgress = {coins:0, jumps:0, slides:0, kills:0};

const store = FX.store('moe-runner', {bestScore:0, bestDistance:0});

// === MISSIONS ===
const missionTemplates = [
  {id:'coins', text:'收集{n}个金币', check:(p,n)=>p.coins>=n, vals:[50,100,150]},
  {id:'jumps', text:'跳跃{n}次', check:(p,n)=>p.jumps>=n, vals:[20,30,50]},
  {id:'slides', text:'滑铲{n}次', check:(p,n)=>p.slides>=n, vals:[15,20,30]},
  {id:'distance', text:'跑{n}米', check:(p,n)=>distance>=n, vals:[500,1000,1500]}
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
  jumpHeld = false;
  canDoubleJump = false;
  coyoteTimer = 0;
  jumpBufferTimer = 0;
  slideTimer = 0;
  invulnTimer = 0;
  hitFlashTimer = 0;
  hero = {
    x: 120,
    y: heroY,
    w: 50,
    h: 80,
    vx: 0,
    vy: 0
  };
}

function jump() {
  if (heroState==='slide') return;
  const grounded = Math.abs(heroY - groundY) < 5;
  if (grounded || coyoteTimer > 0) {
    heroVY = -620;
    heroState = 'jump';
    canDoubleJump = true;
    coyoteTimer = 0;
    FX.burst(hero.x, groundY, {n:8, color:'#dddddd', speed:120, life:.4, size:4});
    missionProgress.jumps++;
  } else if (canDoubleJump) {
    heroVY = -580;
    canDoubleJump = false;
    FX.burst(hero.x, heroY+40, {n:12, color:'#66ddff', speed:150, life:.5, size:5, glow:true});
    missionProgress.jumps++;
  } else {
    jumpBufferTimer = 0.15;
  }
}

function slide() {
  if (heroState==='jump') {
    heroVY += 400;
  }
  heroState = 'slide';
  slideTimer = 0.4;
  missionProgress.slides++;
}

function skill() {
  FX.banner('⭐ 星爆');
  FX.shake(8);
  FX.hitstop(0.08);
  FX.flash('#ffdd00', 0.4);
  FX.burst(hero.x+80, hero.y-40, {n:50, color:'#ffffaa', speed:300, life:.8, size:8, glow:true});
  FX.ring(hero.x+80, hero.y-40, {color:'#ffff00', r:150, life:.6});
  
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
const jumpBtn = FX.button({icon:'item-star', color:'#ffd700', size:100, right:30, bottom:30, key:'Space', hold:true});
const slideBtn = FX.button({icon:'item-shield', color:'#66ccff', size:90, right:150, bottom:30, key:'KeyS'});
const skillBtn = FX.button({icon:'item-weapon', color:'#ff6699', size:90, right:270, bottom:30, key:'KeyJ', cd:10, onPress:skill});

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
    shootTimer: 0,
    projectiles: [],
    stunTimer: 0,
    flashTimer: 0
  };
  FX.banner('⚠ BOSS 来袭！');
  FX.shake(10);
}

let spawnTimer = 0;
let spawnDelay = 2.0;

function updateSpawning(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const x = scrollX + W + 100;
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
    
    if (Math.random()<0.6) {
      const cx = x + FX.rand(50, 150);
      const pattern = ['arc','wave','line'][Math.floor(Math.random()*3)];
      spawnCoins(cx, pattern);
    }
    
    if (Math.random()<0.05) {
      const types = ['magnet','shield','rocket','x2'];
      spawnPowerup(types[Math.floor(Math.random()*types.length)], x + FX.rand(100,200));
    }
    
    spawnDelay = FX.lerp(2.0, 0.8, Math.min(speed/600, 1));
    spawnTimer = spawnDelay;
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
    h: hero.h * (heroState==='slide' ? 0.5 : 1)
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
  lives--;
  invulnTimer = 1.5;
  hitFlashTimer = 0.08;
  FX.hitstop(0.08);
  FX.shake(12);
  FX.flash('#ff0000', 0.5);
  FX.burst(hero.x, heroY-40, {n:30, color:'#ff4444', speed:200, life:.7, size:7});
  combo = 0;
  FX.bar('hp', lives/3);
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
  
  const isCrit = combo >= 5;
  FX.text(c.x, c.y, '+' + (10*coinMultiplier), {color:isCrit?'#ff0':'#ffd700', size:isCrit?28:20, crit:isCrit});
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
    lives = Math.min(3, lives+1);
    FX.bar('hp', lives/3);
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
  
  // Jump button
  if (jumpBtn.down && !jumpHeld) {
    jump();
    jumpHeld = true;
  }
  if (!jumpBtn.down) {
    jumpHeld = false;
    if (heroState==='jump' && heroVY < -200) {
      heroVY = -200;
    }
  }
  
  // Jump buffer
  if (jumpBufferTimer > 0) {
    jumpBufferTimer -= dt;
    const grounded = Math.abs(heroY - groundY)<5;
    if (grounded && jumpBufferTimer>0) {
      jump();
      jumpBufferTimer = 0;
    }
  }
  
  // Slide button
  if (slideBtn.down) {
    slide();
  }
  
  // Touch/tap controls
  const touchRight = cv.touchX > W/2 && cv.touchJustDown;
  if (touchRight) jump();
  
  // Hero physics
  const grounded = Math.abs(heroY - groundY) < 5;
  if (!grounded) {
    heroVY += 1800 * dt;
    heroY += heroVY * dt;
    if (heroY >= groundY) {
      heroY = groundY;
      heroVY = 0;
      heroState = 'run';
      FX.burst(hero.x, groundY, {n:10, color:'#cccccc', speed:100, life:.4, size:5});
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
  
  hero.y = heroY;
  
  // Speed ramp
  speed = baseSpeed + Math.min(distance/10, 200);
  scrollX += speed * dt;
  distance = scrollX / 2;
  score = Math.floor(distance + coins*10);
  
  // Biome transition
  biomeDistance += speed * dt;
  if (biomeDistance >= 600) {
    biomeDistance = 0;
    biome = (biome + 1) % biomes.length;
    biomeTransition = 1.5;
    FX.banner('进入 ' + biomes[biome].name.toUpperCase());
  }
  if (biomeTransition > 0) {
    biomeTransition -= dt;
  }
  
  // Timers
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
  
  // Boss spawn
  if (!boss && Math.floor(distance/1000) > Math.floor((distance-speed*dt)/1000)) {
    spawnBoss();
  }
  
  // Update boss
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
        if (p.x < scrollX - 100) p.removed = true;
        FX.trail(p.x, p.y, '#ff4444', 8);
      });
      
      if (FX.time - (boss.spawnTime||FX.time) > 15) {
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
    if (boss && boss.x > scrollX + W + 200) boss = null;
    if (boss) boss.flashTimer = (boss.flashTimer||0) - dt;
  }
  
  // Spawning
  if (!boss) updateSpawning(dt);
  
  // Update obstacles
  obstacles.forEach(ob => {
    if (ob.removed) return;
    if (ob.type==='bat') {
      ob.t += dt*2;
      ob.y = ob.baseY + Math.sin(ob.t)*40;
    } else if (ob.type==='slime') {
      ob.x += ob.vx * dt;
    } else if (ob.type==='crystal') {
      if (!ob.warned && ob.x - scrollX < W) {
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
    if (ob.x < scrollX - 200) ob.removed = true;
  });
  obstacles = obstacles.filter(ob => !ob.removed);
  
  // Update coins
  coins_arr.forEach(c => {
    if (c.collected) return;
    c.t += dt;
    
    const dist = Math.hypot(c.x - hero.x, c.y - heroY+40);
    if (magnetTimer > 0 && dist < 200) {
      const angle = Math.atan2(heroY-40 - c.y, hero.x - c.x);
      c.vx = Math.cos(angle) * 400;
      c.vy = Math.sin(angle) * 400;
    }
    
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    
    if (dist < 40) {
      collectCoin(c);
    }
    if (c.x < scrollX - 100) c.collected = true;
    FX.trail(c.x, c.y, '#ffd700', 4);
  });
  coins_arr = coins_arr.filter(c => !c.collected);
  
  // Update powerups
  powerups.forEach(p => {
    if (p.collected) return;
    p.t += dt;
    p.y += Math.sin(p.t*3)*1.5;
    
    const dist = Math.hypot(p.x - hero.x, p.y - heroY+40);
    if (dist < 50) {
      collectPowerup(p);
    }
    if (p.x < scrollX - 100) p.collected = true;
  });
  powerups = powerups.filter(p => !p.collected);
  
  checkCollisions();
  checkMissions();
  
  // HUD update
  const comboStr = combo>=3 ? ` <span style="color:#ff0;font-size:1.2em">x${combo}</span>` : '';
  FX.hud(`
    <span class="chip">💰 ${coins}</span>
    <span class="chip">📍 ${Math.floor(distance)}m</span>
    ${comboStr}
    <span class="grow"></span>
    <div class="fx-bar" id="hp"><i></i></div>
  `);
  FX.bar('hp', lives/3);
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
  FX.motes(ctx, b.moteColor);
  
  // Ground tiles
  const tileW = 80;
  const startTile = Math.floor((scrollX-100)/tileW);
  const endTile = Math.ceil((scrollX+W+100)/tileW);
  ctx.fillStyle = '#2a4a2a';
  for (let i=startTile; i<=endTile; i++) {
    const x = i*tileW - scrollX;
    ctx.fillRect(x, groundY, tileW, 200);
  }
  ctx.fillStyle = '#4a7a4a';
  for (let i=startTile; i<=endTile; i++) {
    const x = i*tileW - scrollX;
    ctx.fillRect(x, groundY, tileW, 4);
    for (let j=0; j<3; j++) {
      const gx = x + FX.rand(10, tileW-10);
      const gy = groundY + FX.rand(5, 15);
      ctx.fillRect(gx, gy, 2, 8);
    }
  }
  
  // Speed lines
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
  
  // Obstacles
  obstacles.forEach(ob => {
    if (ob.removed) return;
    const x = ob.x - scrollX;
    if (x < -200 || x > W+200) return;
    
    if (ob.type==='crate') {
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(x-ob.w/2, ob.y-ob.h, ob.w, ob.h);
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 3;
      ctx.strokeRect(x-ob.w/2, ob.y-ob.h, ob.w, ob.h);
    } else if (ob.type==='barrier') {
      ctx.fillStyle = '#555';
      ctx.fillRect(x-ob.w/2, ob.y-ob.h, ob.w, ob.h);
      ctx.fillStyle = '#ff0';
      for (let i=0; i<3; i++) {
        const yy = ob.y-ob.h + i*50;
        ctx.fillRect(x-ob.w/2, yy, ob.w, 10);
      }
    } else if (ob.type==='gap') {
      ctx.fillStyle = '#000';
      ctx.fillRect(x-ob.w/2, groundY, ob.w, 200);
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
  });
  
  // Coins
  coins_arr.forEach(c => {
    if (c.collected) return;
    const x = c.x - scrollX;
    if (x < -100 || x > W+100) return;
    const img = FX.img('item-star');
    const scale = 1 + Math.sin(c.t*6)*0.2;
    const rot = c.t*3;
    FX.drawSprite(ctx, img, x, c.y, 30, {sx:scale, sy:scale, rot:rot, glow:true});
  });
  
  // Powerups
  powerups.forEach(p => {
    if (p.collected) return;
    const x = p.x - scrollX;
    if (x < -100 || x > W+100) return;
    const iconMap = {magnet:'item-chest', shield:'item-shield', rocket:'item-heart', x2:'item-star'};
    const img = FX.img(iconMap[p.type]);
    const bob = Math.sin(p.t*3)*10;
    FX.drawSprite(ctx, img, x, p.y+bob, 50, {glow:true});
  });
  
  // Boss
  if (boss) {
    const x = boss.x - scrollX;
    const img = FX.img('enemy-boss');
    const flash = (boss.flashTimer||0)>0 || boss.phase==='stun';
    if (flash) ctx.filter = 'brightness(2)';
    FX.drawSprite(ctx, img, x, boss.y, 120, {flip:true});
    ctx.filter = 'none';
    
    boss.projectiles.forEach(p => {
      if (p.removed) return;
      const px = p.x - scrollX;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(px, p.y, 15, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    
    // Boss HP
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x-60, boss.y-150, 120, 10);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x-60, boss.y-150, 120*(boss.hp/3), 10);
  }
  
  // Hero
  const hx = hero.x;
  const hy = hero.y;
  let heroImg;
  let heroH = 80;
  let heroSx = 1;
  let heroSy = 1;
  
  if (selectedChar === 'lan') {
    if (heroState==='run') {
      heroImg = FX.img('whale-run');
      const cycle = (heroAnimT*speed/100) % 1;
      heroSy = 1 + Math.sin(cycle*Math.PI*2)*0.15;
      heroSx = 1 / heroSy;
      heroH = 75;
    } else if (heroState==='jump') {
      heroImg = FX.img('whale-jump');
      heroSy = heroVY<0 ? 1.2 : 0.85;
      heroSx = 1 / heroSy;
      heroH = 80;
    } else if (heroState==='slide') {
      heroImg = FX.img('whale-attack');
      heroSx = 1.3;
      heroSy = 0.7;
      heroH = 60;
    }
  } else {
    const chibis = {lan:'lan-chibi',mo:'mo-chibi',li:'li-chibi',xing:'xing-chibi',hu:'hu-chibi'};
    heroImg = FX.img(chibis[selectedChar]);
    if (heroState==='run') {
      const cycle = (heroAnimT*speed/100) % 1;
      heroSy = 1 + Math.sin(cycle*Math.PI*2)*0.12;
      heroSx = 1 / heroSy;
      heroH = 70;
    } else if (heroState==='jump') {
      heroSy = heroVY<0 ? 1.15 : 0.9;
      heroSx = 1 / heroSy;
      heroH = 75;
    } else if (heroState==='slide') {
      heroSx = 1.2;
      heroSy = 0.7;
      heroH = 55;
    }
  }
  
  if (invulnTimer>0 && Math.floor(FX.time*15)%2===0) {
    ctx.globalAlpha = 0.3;
  }
  if (hitFlashTimer > 0) {
    ctx.filter = 'brightness(3)';
  }
  
  FX.drawSprite(ctx, heroImg, hx, hy, heroH, {sx:heroSx, sy:heroSy});
  
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  
  // Shield bubble
  if (shieldTimer > 0) {
    ctx.strokeStyle = 'rgba(102,204,255,0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hx, hy-40, 50, 0, Math.PI*2);
    ctx.stroke();
    
    const pulse = 1 + Math.sin(FX.time*10)*0.1;
    ctx.strokeStyle = 'rgba(102,204,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy-40, 50*pulse, 0, Math.PI*2);
    ctx.stroke();
  }
  
  // Trail afterimages
  if (speed > 400) {
    ctx.globalAlpha = 0.15;
    for (let i=1; i<=3; i++) {
      const offset = i * 30;
      FX.drawSprite(ctx, heroImg, hx-offset, hy, heroH, {sx:heroSx, sy:heroSy});
    }
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
  store.bestDistance = Math.max(store.bestDistance, Math.floor(distance));
  store.save();
  
  const completedMissions = missions.filter(m=>m.completed).length;
  
  FX.overlay({
    title: '游戏结束',
    text: `
      <div style="text-align:center;line-height:1.8">
        <div style="font-size:1.8em;color:#ffd700;margin:15px 0">💎 ${score}</div>
        <div>最远距离: ${Math.floor(distance)}m</div>
        <div>金币: ${coins}</div>
        <div>最大连击: ${combo}</div>
        <div>任务完成: ${completedMissions}/3</div>
        <div style="margin-top:20px;color:#aaa">最高分: ${best}</div>
      </div>
    `,
    hero: 'whale-idle',
    button: '▶ 再来一局',
    onStart: startGame
  });
}

// === START ===
function startGame() {
  FX.hideOverlay();
  
  resetHero();
  scrollX = 0;
  speed = baseSpeed;
  distance = 0;
  coins = 0;
  combo = 0;
  comboTimer = 0;
  lives = 3;
  score = 0;
  biome = 0;
  biomeDistance = 0;
  biomeTransition = 0;
  
  obstacles = [];
  coins_arr = [];
  powerups = [];
  particles_queue = [];
  boss = null;
  
  magnetTimer = 0;
  shieldTimer = 0;
  coinMultiplier = 1;
  coinMultTimer = 0;
  
  missionProgress = {coins:0, jumps:0, slides:0, kills:0};
  checkMissions();
  
  spawnTimer = 1;
  
  FX.running = true;
  FX.loop(update, draw);
}

function showStart() {
  const missionsHtml = missions.map(m => 
    `<div style="padding:5px;background:rgba(0,0,0,0.3);margin:3px 0;border-radius:5px">• ${m.text.replace('{n}',m.value)}</div>`
  ).join('');
  
  FX.overlay({
    title: '萌娘星风跑酷',
    text: `
      <div style="text-align:center">
        <div style="margin:15px 0;font-size:0.95em;line-height:1.6">
          奔跑、跳跃、闪避障碍！<br>
          收集金币，挑战 BOSS！
        </div>
        <div style="margin:20px 0;font-size:0.9em">
          <div style="margin-bottom:8px;color:#ffd700">✨ 本局任务</div>
          ${missionsHtml}
        </div>
        <div class="fx-row" style="justify-content:center;margin:20px 0">
          <button class="fx-pick" data-char="lan"><img src="../assets/lan-chibi.webp" height="60"></button>
          <button class="fx-pick" data-char="mo"><img src="../assets/mo-chibi.webp" height="60"></button>
          <button class="fx-pick" data-char="li"><img src="../assets/li-chibi.webp" height="60"></button>
          <button class="fx-pick" data-char="xing"><img src="../assets/xing-chibi.webp" height="60"></button>
          <button class="fx-pick" data-char="hu"><img src="../assets/hu-chibi.webp" height="60"></button>
        </div>
      </div>
    `,
    hero: 'whale-run',
    button: '▶ 开始游戏',
    onStart: startGame
  });
  
  document.querySelectorAll('.fx-pick').forEach(btn => {
    if (btn.dataset.char === selectedChar) btn.classList.add('selected');
    btn.onclick = () => {
      document.querySelectorAll('.fx-pick').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedChar = btn.dataset.char;
    };
  });
}

// === INIT ===
const assets = [
  'bg-sakura','bg-forest','bg-snow','bg-neon','bg-rail','bg-sky',
  'prop-sakura','prop-pine','prop-lantern','prop-rail',
  'enemy-bat','enemy-slime','enemy-boss',
  'lan-chibi','mo-chibi','li-chibi','xing-chibi','hu-chibi',
  'whale-run','whale-jump','whale-attack','whale-idle',
  'item-star','item-chest','item-shield','item-heart','item-weapon'
];

FX.load(assets).then(() => {
  generateMissions();
  showStart();
});

// === QA EXPORT ===
window.__game = {
  state: () => ({
    hero: {x:hero.x, y:heroY, state:heroState},
    distance: Math.floor(distance),
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
