// 萌娘星际战队 (shmup) - game.js
(function() {
'use strict';

const FX = window.FX;
const Lobby = window.Lobby;

let sel = null;
let state = {
  running: false, score: 0, coins: 0, gems: 0,
  px: 150, py: 270, vx: 0, vy: 0, rot: 0,
  starRot: 0, shootCd: 0, iframes: 0,
  enemies: [], bullets: [], powerups: [],
  boss: null, bossHp: 0, bossTotalHp: 0, bossPhase: 0,
  stageTime: 0, waveIdx: 0, waveSpawned: false,
  combo: 0, comboTime: 0, hp: 3, maxHp: 3,
  stageClear: false, missionKills: 0, missionGraze: 0, missionNoHit: true
};

const STAGES = [
  {id:'space', name:'星空战场', bg:'bg-space', props:[{img:'prop-crystal',speed:.6,y:330,h:200,gap:420,alpha:.9}], waves:[
    {t:1, formation:'line', enemy:'alien', count:3, y:100, spacing:150},
    {t:4, formation:'v', enemy:'bat', count:5, y:80},
    {t:8, formation:'swarm', enemy:'slime', count:6, y:120},
    {t:13, formation:'dual', enemy:'alien', count:4, y:150},
    {t:18, formation:'line', enemy:'slime', count:3, y:110, spacing:140},
    {t:22, boss:true, hp:120, phases:3}
  ]},
  {id:'moon', name:'月面基地', bg:'bg-moon', props:[], waves:[
    {t:1, formation:'line', enemy:'turret', count:2, y:100, spacing:250},
    {t:5, formation:'swarm', enemy:'bat', count:4, y:80},
    {t:9, formation:'line', enemy:'bat', count:3, y:130, spacing:180},
    {t:14, formation:'v', enemy:'bat', count:5, y:100},
    {t:19, formation:'swarm', enemy:'slime', count:4, y:120},
    {t:24, boss:true, hp:150, phases:3}
  ]},
  {id:'neon', name:'霓虹都市', bg:'bg-neon', props:[{img:'prop-lantern',speed:.4,y:300,h:240,gap:500,alpha:.8}], waves:[
    {t:1, formation:'swarm', enemy:'bat', count:5, y:90},
    {t:5, formation:'line', enemy:'slime', count:4, y:120, spacing:140},
    {t:10, formation:'dual', enemy:'bat', count:6, y:100},
    {t:15, formation:'v', enemy:'alien', count:5, y:110},
    {t:20, formation:'swarm', enemy:'slime', count:5, y:100},
    {t:26, boss:true, hp:180, phases:3}
  ]},
  {id:'undersea', name:'深海遗迹', bg:'bg-undersea', props:[{img:'prop-coral',speed:.5,y:280,h:300,gap:480,alpha:.85}], waves:[
    {t:1, formation:'v', enemy:'alien', count:5, y:100},
    {t:6, formation:'line', enemy:'turret', count:3, y:120, spacing:200},
    {t:11, formation:'swarm', enemy:'bat', count:4, y:110},
    {t:16, formation:'dual', enemy:'bat', count:8, y:90},
    {t:22, formation:'line', enemy:'slime', count:4, y:140, spacing:120},
    {t:28, boss:true, hp:220, phases:4}
  ]},
  {id:'station', name:'太空站', bg:'bg-station', props:[], waves:[
    {t:1, formation:'line', enemy:'turret', count:4, y:100, spacing:130},
    {t:6, formation:'v', enemy:'bat', count:4, y:120},
    {t:11, formation:'swarm', enemy:'alien', count:7, y:100},
    {t:16, formation:'dual', enemy:'bat', count:10, y:80},
    {t:23, formation:'line', enemy:'turret', count:3, y:110, spacing:160},
    {t:29, boss:true, hp:280, phases:4}
  ]},
  {id:'sakura', name:'樱花神社', bg:'bg-sakura', props:[{img:'prop-sakura',speed:.35,y:320,h:220,gap:460,alpha:.88}], waves:[
    {t:1, formation:'swarm', enemy:'alien', count:6, y:90},
    {t:6, formation:'v', enemy:'bat', count:5, y:110},
    {t:11, formation:'line', enemy:'slime', count:4, y:130, spacing:150},
    {t:16, formation:'dual', enemy:'bat', count:12, y:85},
    {t:24, formation:'swarm', enemy:'alien', count:6, y:95},
    {t:31, boss:true, hp:320, phases:4}
  ]}
];

const ENEMY_DEFS = {
  alien: {sprite:'enemy-alien', h:110, hp:1, speed:100, hue:0, shoot:true, shootRate:1.2, bulletSpeed:140},
  bat: {sprite:'enemy-bat', h:105, hp:1, speed:140, hue:30, shoot:false},
  slime: {sprite:'enemy-slime', h:100, hp:1, speed:80, hue:120, shoot:true, shootRate:1.5, bulletSpeed:110},
  turret: {sprite:'enemy-alien', h:115, hp:2, speed:0, hue:60, shoot:true, shootRate:.7, bulletSpeed:160},
  boss: {sprite:'enemy-boss', h:300, hue:280, shoot:true, shootRate:.35, bulletSpeed:130}
};

const CHAR_SPRITES = {
  lan: ['whale-idle','whale-run','whale-jump','whale-attack','whale-cast'],
  mo: ['mo-chibi','mo-chibi','mo-chibi','mo-chibi','mo-chibi'],
  li: ['li-chibi','li-chibi','li-chibi','li-chibi','li-chibi'],
  xing: ['xing-chibi','xing-chibi','xing-chibi','xing-chibi','xing-chibi'],
  hu: ['hu-chibi','hu-chibi','hu-chibi','hu-chibi','hu-chibi']
};

let scrollX = 0, parallaxLayers = [];

function startRun(selection) {
  sel = selection;
  state.running = true;
  FX.running = true;
  state.score = 0;
  state.coins = 0;
  state.gems = 0;
  state.hp = Math.floor(sel.stats.hp * 3);
  state.maxHp = state.hp;
  state.px = FX.W * 0.22;
  state.py = FX.H * 0.5;
  state.vx = 0;
  state.vy = 0;
  state.iframes = 0;
  state.shootCd = 0;
  state.enemies = [];
  state.bullets = [];
  state.powerups = [];
  state.boss = null;
  state.bossHp = 0;
  state.combo = 0;
  state.comboTime = 0;
  state.stageTime = 0;
  state.waveIdx = 0;
  state.waveSpawned = false;
  state.stageClear = false;
  state.missionKills = 0;
  state.missionGraze = 0;
  state.missionNoHit = true;
  scrollX = 0;

  const stg = STAGES[sel.stage];
  parallaxLayers = [{img: stg.bg, speed: .15, y: 0, h: 540, alpha: 1}].concat(stg.props || []);

  const hearts = '❤'.repeat(state.hp);
  FX.hud(`<span class="chip">🌌 ${sel.stage+1}</span><span class="chip" id="sc">⭐ 0</span><span class="chip" id="cb">🔥 0x</span><span class="chip" id="hp">${hearts}</span><span class="grow"></span>`);
}

function applySkin(selection) {
  sel = selection;
}

function spawnWave(wave) {
  const baseX = FX.W + 80;
  if (wave.formation === 'line') {
    for (let i = 0; i < wave.count; i++) {
      spawnEnemy(wave.enemy, baseX + i * 80, wave.y + i * wave.spacing);
    }
  } else if (wave.formation === 'v') {
    const mid = Math.floor(wave.count / 2);
    for (let i = 0; i < wave.count; i++) {
      const off = Math.abs(i - mid);
      spawnEnemy(wave.enemy, baseX + i * 70, wave.y + off * 60);
    }
  } else if (wave.formation === 'swarm') {
    for (let i = 0; i < wave.count; i++) {
      spawnEnemy(wave.enemy, baseX + FX.rand(-50, 50), wave.y + FX.rand(-40, 40));
    }
  } else if (wave.formation === 'dual') {
    const half = Math.floor(wave.count / 2);
    for (let i = 0; i < half; i++) {
      spawnEnemy(wave.enemy, baseX + i * 60, wave.y - 50);
      spawnEnemy(wave.enemy, baseX + i * 60, wave.y + 50);
    }
  }
}

function spawnEnemy(id, x, y) {
  const def = ENEMY_DEFS[id];
  state.enemies.push({
    id, def, x, y, vx: -def.speed, vy: 0,
    hp: def.hp, shootCd: FX.rand(.2, 1), time: 0,
    wobble: FX.rand(0, Math.PI * 2), hit: 0
  });
}

function spawnBoss() {
  const stg = STAGES[sel.stage];
  const wave = stg.waves.find(w => w.boss);
  if (!wave) return;

  const def = ENEMY_DEFS.boss;
  state.boss = {
    id: 'boss', def, x: FX.W - 150, y: 150,
    hp: wave.hp, shootCd: .5, time: 0, phase: 0,
    maxPhases: wave.phases, hit: 0
  };
  state.bossHp = wave.hp;
  state.bossTotalHp = wave.hp;
  state.bossPhase = 0;

  FX.banner(`⚠ Boss 阶段 1`);
  FX.hud(`<span class="chip">Boss</span><div class="fx-bar" id="boss-bar"><i></i></div><span class="grow"></span>`);
}

function updatePlayer(dt) {
  const jstick = FX.joystick({side: 'left'});
  const spd = 300 * sel.stats.speed;
  state.vx = jstick.x * spd;
  state.vy = jstick.y * spd;
  state.px = Math.max(60, Math.min(FX.W * 0.6, state.px + state.vx * dt));
  state.py = Math.max(110, Math.min(FX.H - 60, state.py + state.vy * dt));
  state.rot = FX.lerp(state.rot, state.vy * .1, .2);
  state.starRot += dt * 3;
  state.iframes = Math.max(0, state.iframes - dt);

  state.shootCd -= dt;
  if (state.shootCd <= 0) {
    const ang = 0;
    const dmg = sel.stats.atk;
    for (let i = 0; i < 1 + Math.floor(dmg); i++) {
      spawnBullet(state.px + 40, state.py - 20 + i * 15 - 7, ang, 400, 'player', dmg);
    }
    state.shootCd = .12;
  }
}

function updateEnemies(dt) {
  state.enemies = state.enemies.filter(e => {
    e.time += dt;
    e.hit = Math.max(0, e.hit - dt);

    if (e.id === 'bat') {
      e.vy = Math.sin(e.time * 4) * 80;
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    if (e.def.shoot) {
      e.shootCd -= dt;
      if (e.shootCd <= 0 && e.x < FX.W - 50) {
        const ang = Math.atan2(state.py - e.y, state.px - e.x);
        if (e.id === 'turret') {
          for (let i = -1; i <= 1; i++) {
            spawnBullet(e.x, e.y, ang + i * .4, e.def.bulletSpeed, 'enemy', 1);
          }
        } else {
          spawnBullet(e.x, e.y, ang, e.def.bulletSpeed, 'enemy', 1);
        }
        e.shootCd = e.def.shootRate;
      }
    }

    if (e.x < -100 || e.y < -50 || e.y > FX.H + 50) return false;

    if (e.hp <= 0) {
      explode(e.x, e.y, 50);
      state.score += Math.floor(100 * (1 + state.combo * .15));
      state.combo++;
      state.comboTime = 2.5;
      state.missionKills++;
      if (Math.random() > .65) spawnPowerup(e.x, e.y);
      FX.text(e.x, e.y, `+${Math.floor(100 * (1 + state.combo * .15))}`, {color: '#ffeb3b', size: 18, crit: state.combo > 5});
      return false;
    }
    return true;
  });
}

function updateBoss(dt) {
  if (!state.boss) return;
  const b = state.boss;
  b.time += dt;
  b.hit = Math.max(0, b.hit - dt);

  b.x = FX.lerp(b.x, FX.W - 200 + Math.sin(b.time * .8) * 100, .02);
  b.y = FX.lerp(b.y, 180 + Math.cos(b.time * 1.2) * 70, .02);

  const phaseRatio = b.hp / state.bossTotalHp;
  const targetPhase = Math.floor((1 - phaseRatio) * b.maxPhases);
  if (targetPhase > b.phase && targetPhase < b.maxPhases) {
    b.phase = targetPhase;
    FX.banner(`⚠ Boss 阶段 ${b.phase + 1}`);
    FX.shake(18);
    FX.ring(b.x, b.y, {color: '#ff00ff', r: 150, life: .6});
  }

  b.shootCd -= dt;
  if (b.shootCd <= 0) {
    const ang = Math.atan2(state.py - b.y, state.px - b.x);
    if (b.phase === 0) {
      for (let i = 0; i < 8; i++) {
        spawnBullet(b.x, b.y, (Math.PI * 2 / 8) * i + b.time, 120, 'enemy', 1);
      }
    } else if (b.phase === 1) {
      for (let i = -3; i <= 3; i++) {
        spawnBullet(b.x, b.y, ang + i * .25, 150, 'enemy', 1);
      }
    } else if (b.phase === 2) {
      for (let i = 0; i < 12; i++) {
        spawnBullet(b.x, b.y, (Math.PI * 2 / 12) * i, 130, 'enemy', 1);
      }
      for (let i = 0; i < 6; i++) {
        spawnBullet(b.x, b.y, (Math.PI * 2 / 6) * i + Math.PI / 6, 100, 'enemy', 1);
      }
    } else {
      for (let i = 0; i < 16; i++) {
        spawnBullet(b.x, b.y, (Math.PI * 2 / 16) * i + b.time * 2, 140, 'enemy', 1);
      }
    }
    b.shootCd = .35 - .05 * b.phase;
  }

  if (b.hp <= 0) {
    explode(b.x, b.y, 120);
    FX.shake(30);
    FX.ring(b.x, b.y, {color: '#ffd700', r: 200, life: 1});
    FX.banner('✓ Boss 击破！');
    state.boss = null;
    state.stageClear = true;
    state.score += 5000;
    state.gems += Math.floor(3 + state.combo * .5);
  }
}

function updateBullets(dt) {
  state.bullets = state.bullets.filter(b => {
    b.x += Math.cos(b.ang) * b.spd * dt;
    b.y += Math.sin(b.ang) * b.spd * dt;
    b.life -= dt;
    return b.x > -50 && b.x < FX.W + 50 && b.y > -50 && b.y < FX.H + 50 && b.life > 0;
  });
}

function checkCollisions() {
  state.bullets.forEach(bul => {
    if (bul.type === 'player') {
      state.enemies.forEach(e => {
        const dx = e.x - bul.x, dy = e.y - bul.y;
        if (Math.hypot(dx, dy) < 45) {
          e.hp -= bul.dmg;
          e.hit = .08;
          bul.life = 0;
          FX.burst(bul.x, bul.y, {n: 6, color: '#ffeb3b', speed: 180, life: .3, size: 3, glow: true});
          FX.shake(3);
          FX.trail(bul.x, bul.y, '#ffeb3b', 3);
        }
      });
      if (state.boss) {
        const dx = state.boss.x - bul.x, dy = state.boss.y - bul.y;
        if (Math.hypot(dx, dy) < 100) {
          state.boss.hp -= bul.dmg;
          state.bossHp -= bul.dmg;
          state.boss.hit = .08;
          bul.life = 0;
          FX.burst(bul.x, bul.y, {n: 8, color: '#ff6600', speed: 220, life: .35, size: 4, glow: true});
          FX.shake(6);
          FX.trail(bul.x, bul.y, '#ff6600', 4);
          if (state.bossHp % 20 < bul.dmg) FX.hitstop(.08);
        }
      }
    } else if (bul.type === 'enemy') {
      const dx = state.px - bul.x, dy = state.py - bul.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 30 && state.iframes <= 0) {
        state.hp--;
        state.iframes = 1.8;
        state.combo = 0;
        state.missionNoHit = false;
        FX.shake(18);
        FX.flash('#ff0000', .4);
        bul.life = 0;
        explode(state.px, state.py, 40);
      } else if (dist < 70 && !bul.grazed) {
        bul.grazed = true;
        state.score += 15;
        state.missionGraze++;
        FX.text(state.px + 20, state.py - 30, 'GRAZE', {color: '#00ffff', size: 14});
      }
    }
  });

  state.enemies.forEach(e => {
    if (state.iframes > 0) return;
    const dx = state.px - e.x, dy = state.py - e.y;
    if (Math.hypot(dx, dy) < 50) {
      state.hp--;
      state.iframes = 1.8;
      state.combo = 0;
      state.missionNoHit = false;
      FX.shake(18);
      FX.flash('#ff0000', .4);
      e.hp = 0;
    }
  });

  if (state.boss && state.iframes <= 0) {
    const dx = state.px - state.boss.x, dy = state.py - state.boss.y;
    if (Math.hypot(dx, dy) < 120) {
      state.hp--;
      state.iframes = 1.8;
      state.combo = 0;
      state.missionNoHit = false;
      FX.shake(22);
      FX.flash('#ff0000', .4);
    }
  }
}

function spawnBullet(x, y, ang, spd, type, dmg) {
  state.bullets.push({x, y, ang, spd, type, dmg, life: 8, grazed: false});
}

function spawnPowerup(x, y) {
  const types = ['heart', 'star', 'chest'];
  state.powerups.push({type: types[Math.floor(Math.random() * types.length)], x, y, time: 0});
}

function updatePowerups(dt) {
  state.powerups = state.powerups.filter(p => {
    p.time += dt;
    if (p.time > 10) return false;
    const dx = state.px - p.x, dy = state.py - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 180) {
      p.x += Math.sign(dx) * 280 * dt;
      p.y += Math.sign(dy) * 280 * dt;
    }
    if (dist < 50) {
      if (p.type === 'heart') state.hp = Math.min(state.maxHp, state.hp + 1);
      else if (p.type === 'star') state.score += 200;
      else if (p.type === 'chest') { state.coins += 5; state.gems += 1; }
      FX.burst(p.x, p.y, {n: 10, color: '#ffeb3b', speed: 150, life: .4, size: 3, glow: true});
      return false;
    }
    return true;
  });
}

function explode(x, y, r) {
  FX.burst(x, y, {n: 16, color: '#ff6600', speed: 220, life: .5, size: 4, gravity: 200});
  FX.ring(x, y, {color: '#ffeb3b', r, life: .4});
}

function updateCombo(dt) {
  state.comboTime = Math.max(0, state.comboTime - dt);
  if (state.comboTime <= 0) state.combo = 0;
}

function updateStage(dt) {
  if (state.stageClear || !sel || sel.mode !== 'story') return;
  state.stageTime += dt;
  scrollX += 80 * dt;

  const stg = STAGES[sel.stage];
  const wave = stg.waves[state.waveIdx];
  if (!wave) return;

  if (wave.boss && state.stageTime >= wave.t && !state.boss) {
    spawnBoss();
    state.waveSpawned = true;
  } else if (!wave.boss && state.stageTime >= wave.t && !state.waveSpawned) {
    spawnWave(wave);
    state.waveSpawned = true;
  }

  if (state.waveSpawned && state.enemies.length === 0 && !state.boss) {
    state.waveIdx++;
    state.waveSpawned = false;
    if (state.waveIdx >= stg.waves.length) {
      state.stageClear = true;
    }
  }
}

function updateHUD() {
  const hpEl = document.getElementById('hp');
  const scEl = document.getElementById('sc');
  const cbEl = document.getElementById('cb');
  if (hpEl) hpEl.textContent = '❤'.repeat(state.hp) + '🖤'.repeat(Math.max(0, state.maxHp - state.hp));
  if (scEl) scEl.textContent = '⭐ ' + state.score;
  if (cbEl) cbEl.textContent = '🔥 ' + state.combo + 'x';
  if (state.boss) FX.bar('boss-bar', Math.max(0, state.bossHp / state.bossTotalHp));
}

function checkGameEnd() {
  if (state.hp <= 0) {
    state.running = false;
    FX.running = false;
    const stars = 0;
    Lobby.reportResult({
      win: false, stage: sel.stage, stars, coins: state.coins, gems: state.gems,
      missionsProgress: {kills: state.missionKills, graze: state.missionGraze, nohit: state.missionNoHit ? 1 : 0}
    });
    return;
  }
  if (state.stageClear) {
    state.running = false;
    FX.running = false;
    let stars = 1;
    if (state.missionNoHit) stars++;
    if (state.missionGraze >= 20) stars++;
    Lobby.reportResult({
      stage: sel.stage, stars, coins: state.coins + 10, gems: state.gems + 3,
      missionsProgress: {kills: state.missionKills, graze: state.missionGraze, nohit: state.missionNoHit ? 1 : 0}
    });
  }
}

function update(dt) {
  if (!state.running || FX.paused) return;
  updatePlayer(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updateBullets(dt);
  checkCollisions();
  updatePowerups(dt);
  updateCombo(dt);
  updateStage(dt);
  updateHUD();
  checkGameEnd();
}

function draw(ctx) {
  ctx.fillStyle = '#0a0a1e';
  ctx.fillRect(0, 0, FX.W, FX.H);
  FX.parallax(ctx, parallaxLayers, scrollX);
  FX.motes(ctx, '#4488ff');

  drawPlayer(ctx);
  state.enemies.forEach(e => drawEnemy(ctx, e));
  if (state.boss) drawBoss(ctx);
  state.bullets.forEach(b => drawBullet(ctx, b));
  state.powerups.forEach(p => drawPowerup(ctx, p));

  FX.drawFX(ctx);
  FX.vignette(ctx);
}

function drawPlayer(ctx) {
  if (state.iframes > 0 && Math.floor(state.iframes * 12) % 2 === 0) return;
  const sprites = CHAR_SPRITES[sel?.char || 'lan'];
  const charImg = FX.img(sprites[0]);
  const starImg = FX.img('item-star');

  ctx.save();
  ctx.filter = 'none';
  if (starImg && starImg.naturalWidth) {
    ctx.save(); ctx.translate(state.px, state.py - 6); ctx.rotate(state.starRot); ctx.scale(1, 0.45);
    ctx.globalAlpha = .95; const sw = 96, sh = sw * starImg.naturalHeight / starImg.naturalWidth;
    ctx.drawImage(starImg, -sw / 2, -sh / 2, sw, sh); ctx.restore();
  }
  ctx.filter = sel?.skin?.filter || 'none';

  for (let i = 0; i < 4; i++) {
    const trailX = state.px - i * 12;
    const trailY = state.py + Math.sin(FX.time * 8 + i) * .5;
    FX.trail(trailX, trailY, '#ffeb3b', 3);
  }

  const sy = 1 + Math.sin(FX.time * 6) * .08;
  FX.drawSprite(ctx, charImg, state.px, state.py, 140, {rot: state.rot, sy, alpha: state.iframes > 0 && Math.floor(FX.time * 14) % 2 ? 0.55 : 1});

  ctx.restore();
}

function drawEnemy(ctx, e) {
  const img = FX.img(e.def.sprite);
  ctx.save();
  ctx.filter = `hue-rotate(${e.def.hue}deg)${e.hit > 0 ? ' brightness(3)' : ''}`;
  const wobble = Math.sin(e.wobble + e.time * 4) * .05;
  FX.drawSprite(ctx, img, e.x, e.y, e.def.h, {sx: 1 + wobble, sy: 1 - wobble});
  ctx.restore();
}

function drawBoss(ctx) {
  const b = state.boss;
  const img = FX.img(b.def.sprite);
  ctx.save();
  ctx.filter = `hue-rotate(${b.def.hue}deg)${b.hit > 0 ? ' brightness(3)' : ''}`;
  const pulse = 1 + Math.sin(b.time * 3) * .06;
  FX.drawSprite(ctx, img, b.x, b.y, 300, {sx: pulse, sy: pulse, glow: true});
  ctx.restore();
}

function drawBullet(ctx, b) {
  ctx.save();
  if (b.type === 'player') {
    ctx.filter = 'none'; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(80,220,255,.35)'; ctx.beginPath(); ctx.ellipse(b.x - 8, b.y, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7ff6ff'; ctx.beginPath(); ctx.ellipse(b.x, b.y, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x + 3, b.y, 3, 0, Math.PI * 2); ctx.fill();
    FX.trail(b.x - 12, b.y, '#00ffff', 4);
  } else {
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(255,90,200,.3)'; ctx.beginPath(); ctx.arc(b.x, b.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff80ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPowerup(ctx, p) {
  const icons = {heart: 'item-heart', star: 'item-star', chest: 'item-chest'};
  const img = FX.img(icons[p.type]);
  const bob = Math.sin(p.time * 5) * 5;
  FX.drawSprite(ctx, img, p.x, p.y + bob, 50, {sy: 1 + Math.sin(p.time * 6) * .12, glow: true});
}

const {cv} = FX.init({landscape: true, logicalH: 540});

FX.load([
  'bg-space', 'bg-moon', 'bg-neon', 'bg-undersea', 'bg-station', 'bg-sakura',
  'prop-crystal', 'prop-lantern', 'prop-coral', 'prop-sakura',
  'enemy-alien', 'enemy-bat', 'enemy-slime', 'enemy-boss',
  'whale-idle', 'whale-run', 'whale-jump', 'whale-attack', 'whale-cast', 'whale-ride',
  'lan-chibi', 'mo-chibi', 'li-chibi', 'xing-chibi', 'hu-chibi',
  'item-star', 'item-heart', 'item-chest', 'item-shield', 'item-weapon'
]).then(() => {
  FX.loop(update, draw);

  Lobby.init({
    id: 'shmup',
    title: '萌娘星际战队',
    orientation: 'landscape',
    bg: [{img: 'bg-space', speed: .15, y: 0, h: 540, alpha: 1}, {img: 'prop-crystal', speed: .6, y: 330, h: 200, gap: 420, alpha: .9}],
    modes: [
      {id: 'story', name: '剧情模式', icon: 'item-star', desc: '通关所有关卡'}
    ],
    stages: STAGES.map((s, i) => ({id: s.id, name: s.name, bg: s.bg})),
    chars: [
      {id: 'lan', name: '蓝蓝', img: 'whale-ride', chibi: 'lan-chibi', stats: {hp: 1, atk: 1, speed: 1}},
      {id: 'mo', name: '茉茉', img: 'mo-chibi', chibi: 'mo-chibi', stats: {hp: 1.2, atk: .8, speed: .9}},
      {id: 'li', name: '丽丽', img: 'li-chibi', chibi: 'li-chibi', stats: {hp: .8, atk: 1.3, speed: 1.1}},
      {id: 'xing', name: '星星', img: 'xing-chibi', chibi: 'xing-chibi', stats: {hp: 1, atk: 1.1, speed: 1.2}},
      {id: 'hu', name: '虎虎', img: 'hu-chibi', chibi: 'hu-chibi', stats: {hp: 1.3, atk: 1, speed: .85}}
    ],
    skins: [
      {id: 'lan-n', char: 'lan', name: '初始', filter: 'none'},
      {id: 'lan-r', char: 'lan', name: '海洋', filter: 'hue-rotate(80deg) saturate(1.2)'},
      {id: 'lan-sr', char: 'lan', name: '星光', filter: 'hue-rotate(280deg) saturate(1.4)'},
      {id: 'lan-ssr', char: 'lan', name: '幻彩', filter: 'hue-rotate(140deg) saturate(1.6) brightness(1.1)', vip: true},
      {id: 'mo-n', char: 'mo', name: '初始', filter: 'none'},
      {id: 'mo-r', char: 'mo', name: '樱花', filter: 'hue-rotate(320deg) saturate(1.2)'},
      {id: 'mo-sr', char: 'mo', name: '月光', filter: 'hue-rotate(200deg) saturate(1.3)'},
      {id: 'li-n', char: 'li', name: '初始', filter: 'none'},
      {id: 'li-r', char: 'li', name: '烈焰', filter: 'hue-rotate(15deg) saturate(1.3)'},
      {id: 'li-sr', char: 'li', name: '冰霜', filter: 'hue-rotate(180deg) saturate(1.4)'},
      {id: 'xing-n', char: 'xing', name: '初始', filter: 'none'},
      {id: 'xing-r', char: 'xing', name: '森林', filter: 'hue-rotate(90deg) saturate(1.2)'},
      {id: 'xing-sr', char: 'xing', name: '极光', filter: 'hue-rotate(240deg) saturate(1.5)'},
      {id: 'hu-n', char: 'hu', name: '初始', filter: 'none'},
      {id: 'hu-r', char: 'hu', name: '沙漠', filter: 'hue-rotate(30deg) saturate(1.1)'},
      {id: 'hu-sr', char: 'hu', name: '暗夜', filter: 'hue-rotate(270deg) saturate(1.3) brightness(.9)'}
    ],
    currency: [
      {id: 'coin', icon: 'item-chest'},
      {id: 'gem', icon: 'item-star'}
    ],
    onStart: startRun,
    onQuit: () => { state.running = false; FX.running = false; },
    onSkinChange: applySkin
  });
});

window.__game = {
  state: () => ({
    player: {x: state.px, y: state.py},
    score: state.score, combo: state.combo,
    hp: state.hp, maxHp: state.maxHp,
    enemies: state.enemies.length, bullets: state.bullets.length,
    boss: state.boss ? {hp: state.bossHp, totalHp: state.bossTotalHp, phase: state.boss.phase} : null,
    stageClear: state.stageClear
  })
};

})();
;FX.useSideSprites('idle');
