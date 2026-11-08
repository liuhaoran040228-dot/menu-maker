// 星野幸存者 - game.js (portrait survivor, polished)
(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: false, logicalH: 540});

// === STATE ===
let gameMode = 'ready';
let gameTime = 0;
let currentSel = null;

let player = null;
let enemies = [];
let projectiles = [];
let gems = [];
let vfx = [];

let level = 1;
let xp = 0;
let xpNeeded = 50;
let kills = 0;
let combo = 0;
let comboLastTime = 0;
let score = 0;

let skills = {};
let upgradingLevel = 0;
let levelUpPending = false;

let bossSpawned = false;
let bossDead = false;

let spawnTimer = 0;
let spawnInterval = 0.8;
let waveNum = 0;
let miniBossTimer = 0;
let miniBossInterval = 60;

let invulnTimer = 0;

const store = FX.store('star-survivor', {bestTime: 0, bestKills: 0, bestScore: 0, wins: 0});

const baseStats = {hp: 100, maxHP: 100, speed: 300, vamp: 0};

// === GROUND TILE CACHE ===
let groundTile = null;
let groundBgName = 'bg-garden';

function buildGroundTile(bgName) {
  const size = 512;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = size;
  offCanvas.height = size;
  const octx = offCanvas.getContext('2d');
  
  const bgImg = FX.img(bgName);
  const scale = Math.max(size / bgImg.width, size / bgImg.height);
  const sw = size / scale;
  const sh = size / scale;
  const sx = (bgImg.width - sw) / 2;
  const sy = (bgImg.height - sh) / 2;
  
  octx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, size, size);
  
  octx.save();
  octx.translate(size, 0);
  octx.scale(-1, 1);
  octx.globalAlpha = 0.25;
  octx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, size, size);
  octx.restore();
  
  octx.fillStyle = 'rgba(80, 120, 100, 0.12)';
  for (let i = 0; i < 180; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const gsize = 0.8 + Math.random() * 1.5;
    octx.fillRect(gx, gy, gsize, gsize);
  }
  
  octx.fillStyle = 'rgba(60, 90, 70, 0.08)';
  for (let i = 0; i < 6; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const pr = 15 + Math.random() * 35;
    octx.beginPath();
    octx.ellipse(px, py, pr, pr * 0.35, 0, 0, Math.PI * 2);
    octx.fill();
  }
  
  return offCanvas;
}

// === WEAPON DATA ===
const weaponData = {
  bolt: {
    name: '星芒',
    desc: '发射追踪光弹',
    icon: 'item-star',
    color: '#ffd700',
    rarity: 'N',
    dmgBase: 20,
    dmgPer: 8,
    coolBase: 0.35,
    coolPer: -0.025,
    maxLv: 5
  },
  heart: {
    name: '星环',
    desc: '旋转心形护盾',
    icon: 'item-heart',
    color: '#ff66cc',
    rarity: 'N',
    dmgBase: 15,
    dmgPer: 6,
    countBase: 3,
    countPer: 1,
    radiusBase: 80,
    radiusPer: 15,
    maxLv: 5
  },
  nova: {
    name: '冰爆',
    desc: '周期冰冻爆发',
    icon: 'item-ice',
    color: '#66ddff',
    rarity: 'R',
    dmgBase: 32,
    dmgPer: 13,
    coolBase: 3,
    coolPer: -0.22,
    radiusBase: 120,
    radiusPer: 20,
    maxLv: 5
  },
  lightning: {
    name: '雷链',
    desc: '敌人间跳跃放电',
    icon: 'item-weapon',
    color: '#ffdd00',
    rarity: 'R',
    dmgBase: 26,
    dmgPer: 11,
    chainCount: 4,
    coolBase: 1.4,
    coolPer: -0.12,
    maxLv: 5
  },
  wave: {
    name: '浪潮',
    desc: '正面冲击波',
    icon: 'item-shield',
    color: '#66ccff',
    rarity: 'SR',
    dmgBase: 42,
    dmgPer: 16,
    coolBase: 2,
    coolPer: -0.12,
    maxLv: 5
  },
  mine: {
    name: '花雷',
    desc: '撒布地雷',
    icon: 'prop-flowers',
    color: '#ffb3d9',
    rarity: 'SR',
    dmgBase: 38,
    dmgPer: 13,
    coolBase: 1.7,
    coolPer: -0.12,
    maxLv: 5
  },
  spear: {
    name: '晶枪',
    desc: '直线冰晶射击',
    icon: 'prop-crystal',
    color: '#aaddff',
    rarity: 'SR',
    dmgBase: 30,
    dmgPer: 12,
    coolBase: 1.1,
    coolPer: -0.1,
    countBase: 2,
    countPer: 1,
    maxLv: 5
  },
  bomb: {
    name: '点心弹',
    desc: '爆炸甜蜜炮弹',
    icon: 'item-chest',
    color: '#ffaa99',
    rarity: 'SSR',
    dmgBase: 55,
    dmgPer: 20,
    coolBase: 2.4,
    coolPer: -0.14,
    radiusBase: 100,
    radiusPer: 15,
    maxLv: 5
  }
};

const passiveData = {
  haste: {name: '轻盈', desc: '移速+15%', icon: 'item-ice', effect: s => s.speed *= 1.15},
  leech: {name: '吸血', desc: '伤害转生命5%', icon: 'item-heart', effect: s => s.vamp = 0.05},
  pickup: {name: '吸金', desc: '拾取范围+80%', icon: 'item-star', effect: () => {}},
  regen: {name: '恢复', desc: '每秒回复最大血量1%', icon: 'item-shield', effect: () => {}},
  armor: {name: '盔甲', desc: '受伤-20%', icon: 'item-armor', effect: () => {}},
  crit: {name: '暴击', desc: '30%概率双倍伤害', icon: 'item-weapon', effect: () => {}}
};

// === ENEMY DATA ===
const enemyTypes = {
  slime: {
    name: '史莱姆',
    img: 'enemy-slime',
    hp: 20,
    speed: 85,
    dmg: 8,
    xp: 5,
    radius: 15,
    spawn: 0
  },
  bat: {
    name: '蝙蝠',
    img: 'enemy-bat',
    hp: 16,
    speed: 150,
    dmg: 6,
    xp: 4,
    radius: 12,
    spawn: 25
  },
  alien: {
    name: '外星人',
    img: 'enemy-alien',
    hp: 32,
    speed: 105,
    dmg: 11,
    xp: 9,
    radius: 14,
    spawn: 55
  },
  elite: {
    name: '精英',
    img: 'enemy-boss',
    hp: 65,
    speed: 115,
    dmg: 16,
    xp: 25,
    radius: 18,
    spawn: 120,
    mini: true
  }
};

// === INIT ===
function resetGame() {
  gameMode = 'play';
  gameTime = 0;
  level = 1;
  xp = 0;
  xpNeeded = 50;
  kills = 0;
  combo = 0;
  comboLastTime = 0;
  score = 0;
  
  skills = {bolt: 1};
  upgradingLevel = 0;
  levelUpPending = false;
  
  player = {
    x: FX.W / 2,
    y: FX.H / 2,
    ...baseStats,
    hp: baseStats.maxHP,
    vx: 0,
    vy: 0,
    weaponCds: {},
    _face: 1,
    bobOffset: 0
  };
  
  enemies = [];
  projectiles = [];
  gems = [];
  vfx = [];
  
  bossSpawned = false;
  bossDead = false;
  
  spawnTimer = 0;
  spawnInterval = 0.8;
  waveNum = 0;
  miniBossTimer = 0;
  miniBossInterval = 60;
  
  invulnTimer = 0;
  
  const stageBgs = ['bg-garden', 'bg-forest', 'bg-snow', 'bg-moon'];
  groundBgName = stageBgs[currentSel?.stage || 0] || 'bg-garden';
  groundTile = buildGroundTile(groundBgName);
  
  FX.hud(`
    <a class="fx-icon" href="../tools.html">‹</a>
    <span class="chip">⏱ <span id="time">0:00</span></span>
    <span class="chip">❤️ <span id="hp">100</span></span>
    <span class="chip">Lv.<span id="level">1</span></span>
    <span class="chip">💀 <span id="kills">0</span></span>
    <span class="grow"></span>
  `);
}

function startGame(sel) {
  currentSel = sel;
  resetGame();
  FX.running = true;
  FX.loop(update, draw);
}

// === SPAWNING ===
function spawnEnemy() {
  const types = Object.entries(enemyTypes).filter(([_, t]) => gameTime >= t.spawn);
  if (types.length === 0) return;
  
  const [typeKey, typeDef] = types[Math.floor(Math.random() * types.length)];
  
  const angle = Math.random() * Math.PI * 2;
  const dist = 380;
  const ex = player.x + Math.cos(angle) * dist;
  const ey = player.y + Math.sin(angle) * dist;
  
  const scaleFactor = 1 + Math.floor(gameTime / 90) * 0.15;
  const e = {
    type: typeKey,
    x: ex,
    y: ey,
    vx: 0,
    vy: 0,
    hp: typeDef.hp * scaleFactor,
    maxHP: typeDef.hp * scaleFactor,
    speed: typeDef.speed,
    dmg: typeDef.dmg,
    xp: typeDef.xp,
    radius: typeDef.radius,
    hit: 0,
    hitT: 0,
    elite: Math.random() < Math.min(0.15, 0.05 + gameTime / 500),
    mini: typeDef.mini,
    bobPhase: Math.random() * Math.PI * 2
  };
  
  if (e.elite) {
    e.hp *= 1.6;
    e.maxHP *= 1.6;
    e.dmg *= 1.35;
    e.xp *= 2.5;
    e.radius *= 1.2;
    e.speed *= 1.1;
  }
  
  enemies.push(e);
}

function spawnMiniBoss() {
  const scaleFactor = 1 + Math.floor(gameTime / 100) * 0.1;
  const e = {
    type: 'elite',
    x: player.x + FX.rand(-120, 120),
    y: player.y - 270,
    vx: 0,
    vy: 0,
    hp: 160 * scaleFactor,
    maxHP: 160 * scaleFactor,
    speed: 125,
    dmg: 22,
    xp: 60,
    radius: 20,
    mini: true,
    hit: 0,
    hitT: 0,
    boss: false,
    bobPhase: 0
  };
  enemies.push(e);
  FX.banner('⚠ 精英敌人');
  FX.shake(8);
}

function spawnBoss() {
  const e = {
    type: 'boss',
    x: FX.W / 2,
    y: FX.H / 2 - 180,
    vx: 0,
    vy: 0,
    hp: 600,
    maxHP: 600,
    speed: 110,
    dmg: 32,
    radius: 32,
    boss: true,
    hit: 0,
    hitT: 0,
    shootT: 0,
    shootInterval: 1.3,
    phase: 0,
    bobPhase: 0
  };
  enemies.push(e);
  FX.banner('👑 幻梦首领');
  FX.shake(18);
}

// === WEAPONS ===
function fireWeapon(weaponKey, dt) {
  const cd = player.weaponCds[weaponKey] || 0;
  const weaponDef = weaponData[weaponKey];
  if (!weaponDef || !skills[weaponKey]) return;
  
  if (cd > 0) {
    player.weaponCds[weaponKey] = cd - dt;
    return;
  }
  
  const lv = skills[weaponKey];
  const dmg = weaponDef.dmgBase + lv * weaponDef.dmgPer;
  const coolNext = Math.max(0.12, weaponDef.coolBase + lv * weaponDef.coolPer);
  player.weaponCds[weaponKey] = coolNext;
  
  if (weaponKey === 'bolt') {
    const targets = enemies.filter(e => !e.boss).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)).slice(0, lv >= 4 ? 3 : 1);
    targets.forEach(t => {
      projectiles.push({
        type: 'bolt',
        x: player.x,
        y: player.y,
        target: t,
        dmg: dmg,
        speed: 520,
        life: 5,
        trail: true
      });
    });
  } else if (weaponKey === 'nova') {
    const rad = weaponDef.radiusBase + lv * weaponDef.radiusPer;
    FX.ring(player.x, player.y, {color: '#66ddff', r: rad, life: 0.5});
    FX.burst(player.x, player.y, {n: 16, color: '#66ddff', speed: 180, life: 0.4, size: 4});
    enemies.forEach(e => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < rad + e.radius) {
        damageEnemy(e, dmg, player.x, player.y);
      }
    });
  } else if (weaponKey === 'heart') {
    // Orbiting hearts handled in update
  } else if (weaponKey === 'lightning') {
    const targets = enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) < 280).slice(0, 3);
    targets.forEach(t => {
      projectiles.push({
        type: 'lightning',
        x: player.x,
        y: player.y,
        target: t,
        dmg: dmg,
        chains: 3,
        life: 0.6
      });
      FX.trail(t.x, t.y, '#ffdd00', 9);
    });
    if (targets.length > 0) FX.shake(4);
  } else if (weaponKey === 'wave') {
    projectiles.push({
      type: 'wave',
      x: player.x,
      y: player.y,
      vx: FX.rand(-180, 180),
      vy: FX.rand(-280, -180),
      dmg: dmg,
      radius: 85,
      life: 1.1,
      maxLife: 1.1
    });
  } else if (weaponKey === 'mine') {
    for (let i = 0; i < 3 + lv; i++) {
      const angle = (i / (3 + lv)) * Math.PI * 2 + Math.random() * 0.3;
      projectiles.push({
        type: 'mine',
        x: player.x + Math.cos(angle) * 50,
        y: player.y + Math.sin(angle) * 50,
        dmg: dmg,
        armed: 0.4,
        radius: 110,
        life: 8.5,
        angle: angle
      });
    }
  } else if (weaponKey === 'spear') {
    const count = lv >= 3 ? 3 : (lv >= 2 ? 2 : 1);
    for (let i = 0; i < count; i++) {
      const angleOffset = count > 1 ? (i - (count - 1) / 2) * 0.4 : 0;
      const angle = Math.random() * Math.PI * 2 + angleOffset;
      projectiles.push({
        type: 'spear',
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 420,
        vy: Math.sin(angle) * 420,
        dmg: dmg,
        life: 3.2,
        angle: angle
      });
    }
  } else if (weaponKey === 'bomb') {
    projectiles.push({
      type: 'bomb',
      x: player.x,
      y: player.y,
      vx: FX.rand(-140, 140),
      vy: FX.rand(-180, 20),
      dmg: dmg,
      radius: weaponDef.radiusBase + lv * weaponDef.radiusPer,
      life: 2.2,
      maxLife: 2.2
    });
  }
}

// === DAMAGE ===
function damageEnemy(e, dmg, fromX, fromY) {
  if (e.hp <= 0) return;
  
  const roll = Math.random();
  const isCrit = skills.crit && roll < 0.3;
  const actualDmg = isCrit ? dmg * 2 : dmg;
  
  e.hp -= actualDmg;
  e.hit = 0.12;
  e.hitT = 0.12;
  
  score += Math.round(actualDmg);
  
  FX.trail(e.x, e.y, currentSel?.skin?.filter || '#ffd700', 7);
  if (isCrit) {
    FX.text(e.x, e.y - 35, 'CRIT!', {color: '#ff0', size: 26});
  } else {
    FX.text(e.x, e.y - 20, Math.round(actualDmg), {color: '#fff', size: 18});
  }
  
  if (player.vamp > 0) {
    player.hp = Math.min(player.maxHP, player.hp + actualDmg * player.vamp);
  }
  
  if (e.hp <= 0) {
    killEnemy(e);
  }
}

function killEnemy(e) {
  kills++;
  combo++;
  comboLastTime = gameTime;
  
  if (combo % 5 === 0 && combo > 0) {
    FX.text(player.x, player.y - 100, combo + 'x', {color: '#ffdd00', size: 28, crit: true});
    FX.shake(Math.min(10, combo / 2));
  }
  
  xp += e.xp * (1 + Math.min(combo * 0.08, 0.5));
  score += e.xp * 10;
  
  FX.burst(e.x, e.y, {n: 14, color: '#ffaa99', speed: 160, life: 0.65, size: 5, glow: true});
  
  if (Math.random() < 0.35 + Math.min(combo * 0.015, 0.15)) {
    gems.push({x: e.x, y: e.y, value: 1, life: 8.5, bobPhase: Math.random() * Math.PI * 2});
  }
  
  if (e.mini) {
    miniBossTimer = 0;
  }
  if (e.boss) {
    bossDead = true;
    FX.banner('✨ 幻梦粉碎');
    FX.ring(e.x, e.y, {color: '#ff66ff', r: 320, life: 1.2});
    FX.burst(e.x, e.y, {n: 60, color: '#ff66ff', speed: 300, life: 1, size: 8, glow: true});
    gameMode = 'gameover';
    FX.running = false;
    store.bestTime = Math.max(store.bestTime, gameTime);
    store.bestKills = Math.max(store.bestKills, kills);
    store.bestScore = Math.max(store.bestScore, score);
    store.wins++;
    store.save();
    const stars = Math.min(3, Math.floor(kills / 40));
    Lobby.reportResult({
      stage: currentSel ? currentSel.stage : 0,
      stars: stars,
      coins: kills,
      gems: Math.floor(gameTime / 60),
      win: true,
      score: score,
      time: gameTime,
      level: level,
      wave: waveNum,
      combo: combo
    });
  }
}

function hurtPlayer(dmg) {
  if (invulnTimer > 0 || gameMode !== 'play') return;
  
  const actualDmg = skills.armor ? dmg * 0.8 : dmg;
  player.hp -= actualDmg;
  invulnTimer = 1.2;
  FX.shake(12);
  FX.flash('#ff0000', 0.35);
  FX.burst(player.x, player.y, {n: 24, color: '#ff4444', speed: 220, life: 0.75, size: 6, glow: true});
  
  if (player.hp <= 0) {
    gameMode = 'gameover';
    FX.running = false;
    store.bestTime = Math.max(store.bestTime, gameTime);
    store.bestKills = Math.max(store.bestKills, kills);
    store.bestScore = Math.max(store.bestScore, score);
    store.save();
    const stars = Math.min(3, Math.floor(kills / 40));
    Lobby.reportResult({
      stage: currentSel ? currentSel.stage : 0,
      stars: stars,
      coins: kills,
      gems: Math.floor(gameTime / 60),
      win: false,
      score: score,
      time: gameTime,
      level: level,
      wave: waveNum,
      kills: kills
    });
  }
}

// === LEVEL UP ===
function levelUp() {
  level++;
  xpNeeded = Math.floor(50 * Math.pow(1.35, level - 1));
  upgradingLevel = level;
  levelUpPending = true;
  gameMode = 'levelup';
  waveNum++;
  FX.ring(player.x, player.y, {color: '#ffdd00', r: 160, life: 0.9});
  FX.burst(player.x, player.y, {n: 30, color: '#ffdd00', speed: 200, life: 0.6, size: 5, glow: true});
  FX.banner('✨ 等级提升！');
  FX.shake(6);
  
  const pool = Object.keys(weaponData).filter(k => !skills[k] || skills[k] < weaponData[k].maxLv);
  const passivePool = Object.keys(passiveData).filter(k => !skills[k]);
  
  const opts = [];
  for (let i = 0; i < 2 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    opts.push(pool.splice(idx, 1)[0]);
  }
  if (passivePool.length > 0 && opts.length < 3) {
    const idx = Math.floor(Math.random() * passivePool.length);
    opts.push(passivePool.splice(idx, 1)[0]);
  }
  
  showLevelupOverlay(opts.slice(0, 3));
}

function showLevelupOverlay(opts) {
  const cards = opts.map((key, idx) => {
    let def, isPassive = false;
    if (weaponData[key]) {
      def = weaponData[key];
    } else {
      def = passiveData[key];
      isPassive = true;
    }
    
    const currentLv = skills[key] || 0;
    const rarity = isPassive ? '#888' : {N: '#888', R: '#55c', SR: '#e55', SSR: '#ff0'}[def.rarity];
    
    return `
      <button class="a2-choice" data-key="${key}" style="border-color: ${rarity}; padding: 14px; margin: 8px; background: rgba(0,0,0,0.45); border: 2.5px solid ${rarity}; border-radius: 10px; color: white; cursor: pointer; font-size: 0.95em; text-align: left; transition: transform 0.15s;">
        <div style="color: ${def.color || '#aaa'}; font-size: 1.3em; font-weight: bold; margin-bottom: 5px;">${def.name}</div>
        <div style="font-size: 0.82em; opacity: 0.88; margin-bottom: 5px;">${def.desc}</div>
        <div style="color: ${rarity}; font-size: 0.78em; font-weight: 600;">${isPassive ? '被动 ✦' : '✦ ' + def.rarity} ${currentLv > 0 ? '(Lv.' + currentLv + '→' + (currentLv + 1) + ')' : '(新)'}</div>
      </button>
    `;
  });
  
  FX.overlay({
    title: '升级选择',
    html: '<div style="display: flex; flex-direction: column; gap: 2px;">' + cards.join('') + '</div>',
    button: null,
    onStart: () => {}
  });
  
  document.querySelectorAll('.a2-choice').forEach((btn, idx) => {
    btn.onclick = () => {
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => selectSkill(btn.dataset.key, idx), 80);
    };
    btn.onmouseover = () => btn.style.transform = 'scale(1.02)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
  });
}

function selectSkill(key, idx) {
  if (weaponData[key]) {
    skills[key] = (skills[key] || 0) + 1;
  } else if (passiveData[key]) {
    passiveData[key].effect(player);
    skills[key] = 1;
  }
  gameMode = 'play';
  FX.hideOverlay();
  FX.running = true;
  levelUpPending = false;
}

// === UPDATE ===
function update(dt) {
  if (!FX.running || gameMode !== 'play') return;
  
  gameTime += dt;
  invulnTimer = Math.max(0, invulnTimer - dt);
  player.bobOffset = Math.sin(gameTime * 3) * 3;
  
  // XP level up check
  if (xp >= xpNeeded && !levelUpPending) {
    xp -= xpNeeded;
    levelUp();
    return;
  }
  
  // Player movement
  const joy = FX.joystick({side: 'left'});
  const len = Math.hypot(joy.x, joy.y);
  let px = 0, py = 0;
  if (len > 0.12) {
    px = joy.x;
    py = joy.y;
  }
  
  const speed = player.speed * (skills.haste ? 1.15 : 1);
  player.x += px * speed * dt;
  player.y += py * speed * dt;
  player.x = Math.max(50, Math.min(FX.W - 50, player.x));
  player.y = Math.max(50, Math.min(FX.H - 50, player.y));
  
  // Firing weapons
  Object.keys(skills).forEach(k => {
    if (weaponData[k]) fireWeapon(k, dt);
  });
  
  // Update projectiles
  projectiles = projectiles.filter(p => {
    p.life -= dt;
    
    if (p.type === 'bolt') {
      if (p.target.hp <= 0) {
        p.life = 0;
        return false;
      }
      const a = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      p.x += Math.cos(a) * p.speed * dt;
      p.y += Math.sin(a) * p.speed * dt;
      
      if (Math.hypot(p.x - p.target.x, p.y - p.target.y) < p.target.radius + 8) {
        damageEnemy(p.target, p.dmg, p.x, p.y);
        FX.burst(p.x, p.y, {n: 6, color: '#ffd700', speed: 120, life: 0.35, size: 3, glow: true});
        p.life = 0;
      }
    } else if (p.type === 'wave') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      
      enemies.forEach(e => {
        if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
          damageEnemy(e, p.dmg, p.x, p.y);
        }
      });
    } else if (p.type === 'mine') {
      p.armed -= dt;
      if (p.armed <= 0) {
        enemies.forEach(e => {
          if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
            damageEnemy(e, p.dmg, p.x, p.y);
            FX.burst(p.x, p.y, {n: 22, color: '#ffb3d9', speed: 200, life: 0.7, size: 6, glow: true});
          }
        });
        p.life = 0;
      }
    } else if (p.type === 'spear') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      enemies.forEach(e => {
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius + 10) {
          damageEnemy(e, p.dmg, p.x, p.y);
          FX.trail(p.x, p.y, '#aaddff', 6);
        }
      });
    } else if (p.type === 'bomb') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
      
      if (p.life <= 0) {
        enemies.forEach(e => {
          if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
            damageEnemy(e, p.dmg, p.x, p.y);
          }
        });
        FX.burst(p.x, p.y, {n: 35, color: '#ffaa99', speed: 280, life: 0.9, size: 9, glow: true});
        FX.ring(p.x, p.y, {color: '#ffaa99', r: p.radius, life: 0.6});
        FX.shake(7);
      }
    } else if (p.type === 'boss_proj') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      if (Math.hypot(p.x - player.x, p.y - player.y) < 18 && invulnTimer <= 0) {
        hurtPlayer(p.dmg);
        FX.burst(p.x, p.y, {n: 12, color: '#e9b8ff', speed: 150, life: 0.4, size: 4});
        p.life = 0;
      }
    }
    
    return p.life > 0;
  });
  
  // Heart orbits
  if (skills.heart) {
    const n = 3 + (skills.heart - 1);
    const rad = 80 + (skills.heart - 1) * 15;
    for (let i = 0; i < n; i++) {
      const a = gameTime * 2.5 + (i / n) * Math.PI * 2;
      const hx = player.x + Math.cos(a) * rad;
      const hy = player.y + Math.sin(a) * rad;
      
      enemies.forEach(e => {
        if (Math.hypot(hx - e.x, hy - e.y) < e.radius + 14) {
          damageEnemy(e, weaponData.heart.dmgBase + (skills.heart - 1) * weaponData.heart.dmgPer, hx, hy);
        }
      });
    }
  }
  
  // XP gems
  const pickupRad = 110 + (skills.pickup ? 90 : 0);
  gems.forEach(g => {
    g.life -= dt;
    g.bobPhase += dt * 4;
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    if (d < pickupRad) {
      const a = Math.atan2(player.y - g.y, player.x - g.x);
      g.x += Math.cos(a) * 450 * dt;
      g.y += Math.sin(a) * 450 * dt;
    }
    if (d < 22) {
      xp += g.value;
      score += 5;
      g.life = 0;
      FX.burst(g.x, g.y, {n: 10, color: '#80f6d2', speed: 120, life: 0.45, size: 3, glow: true});
    }
  });
  gems = gems.filter(g => g.life > 0);
  
  // Enemy update
  enemies.forEach(e => {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    
    if (!e.boss) {
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
      e.bobPhase += dt * 2;
    } else {
      const phase = Math.floor(gameTime / 3.5) % 4;
      const targetX = player.x + Math.cos(phase * Math.PI / 2) * 180;
      const targetY = player.y + Math.sin(phase * Math.PI / 2) * 180;
      const angle = Math.atan2(targetY - e.y, targetX - e.x);
      e.x += Math.cos(angle) * e.speed * dt * 0.9;
      e.y += Math.sin(angle) * e.speed * dt * 0.9;
      
      e.shootT -= dt;
      if (e.shootT <= 0) {
        const projCount = Math.floor(1 + gameTime / 120);
        for (let ring = 0; ring < projCount; ring++) {
          for (let i = 0; i < 8; i++) {
            const aa = (i / 8) * Math.PI * 2 + gameTime + ring * 0.2;
            projectiles.push({
              type: 'boss_proj',
              x: e.x,
              y: e.y,
              vx: Math.cos(aa) * (180 + ring * 30),
              vy: Math.sin(aa) * (180 + ring * 30),
              life: 5,
              dmg: 15
            });
          }
        }
        FX.ring(e.x, e.y, {color: '#e9b8ff', r: 120, life: 0.35});
        e.shootT = e.shootInterval;
      }
      e.bobPhase = gameTime;
    }
    
    e.hit = Math.max(0, e.hit - dt);
    
    if (d < e.radius + 20) {
      hurtPlayer(e.dmg * dt);
    }
  });
  
  // Spawning
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const maxEnemies = Math.min(50, 18 + Math.floor(gameTime / 12));
    if (enemies.length < maxEnemies) {
      spawnEnemy();
    }
    spawnInterval = Math.max(0.35, 0.8 - gameTime / 180);
    spawnTimer = spawnInterval;
  }
  
  miniBossTimer -= dt;
  if (miniBossTimer <= 0 && gameTime < 180) {
    spawnMiniBoss();
    miniBossTimer = miniBossInterval;
  }
  
  if (!bossSpawned && gameTime >= 180) {
    bossSpawned = true;
    spawnBoss();
  }
  
  // Passive effects
  if (skills.regen) {
    player.hp = Math.min(player.maxHP, player.hp + player.maxHP * 0.012 * dt);
  }
  if (gameTime - comboLastTime > 4) {
    combo = 0;
  }
  
  // Update HUD
  const timeStr = `${Math.floor(gameTime / 60)}:${String(Math.floor(gameTime % 60)).padStart(2, '0')}`;
  document.getElementById('time').textContent = timeStr;
  document.getElementById('hp').textContent = Math.ceil(player.hp);
  document.getElementById('level').textContent = level;
  document.getElementById('kills').textContent = kills;
}

// === DRAW ===
function draw(ctx) {
  const cameraX = player.x;
  const cameraY = player.y;
  
  const bgImg = FX.img(groundBgName);
  const bgScale = Math.max(FX.W / bgImg.width, FX.H / bgImg.height);
  const bgW = bgImg.width * bgScale;
  const bgH = bgImg.height * bgScale;
  const bgX = (FX.W - bgW) / 2;
  const bgY = (FX.H - bgH) / 2;
  ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  
  FX.motes(ctx, '#ffeedd');
  
  const tileSize = 512;
  const startX = Math.floor((cameraX - FX.W / 2 - 100) / tileSize) * tileSize;
  const endX = Math.ceil((cameraX + FX.W / 2 + 100) / tileSize) * tileSize;
  const startY = Math.floor((cameraY - FX.H / 2 - 100) / tileSize) * tileSize;
  const endY = Math.ceil((cameraY + FX.H / 2 + 100) / tileSize) * tileSize;
  
  for (let tx = startX; tx <= endX; tx += tileSize) {
    for (let ty = startY; ty <= endY; ty += tileSize) {
      const screenX = tx - cameraX + FX.W / 2;
      const screenY = ty - cameraY + FX.H / 2;
      ctx.drawImage(groundTile, screenX, screenY, tileSize, tileSize);
    }
  }
  
  const cellSize = 280;
  const cellStartX = Math.floor((cameraX - FX.W / 2 - 250) / cellSize);
  const cellEndX = Math.ceil((cameraX + FX.W / 2 + 250) / cellSize);
  const cellStartY = Math.floor((cameraY - FX.H / 2 - 250) / cellSize);
  const cellEndY = Math.ceil((cameraY + FX.H / 2 + 250) / cellSize);
  
  const propObjects = [];
  for (let cx = cellStartX; cx <= cellEndX; cx++) {
    for (let cy = cellStartY; cy <= cellEndY; cy++) {
      const hash = ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
      if (hash % 3 === 0) {
        const px = cx * cellSize + ((hash >> 4) % cellSize);
        const py = cy * cellSize + ((hash >> 8) % cellSize);
        const propIdx = (hash >> 12) % 5;
        const propScale = 0.55 + ((hash >> 16) % 35) / 100;
        
        const propTypes = ['prop-flowers', 'prop-pine', 'prop-crystal', 'prop-sakura', 'prop-lantern'];
        const propImg = propTypes[propIdx];
        
        propObjects.push({
          x: px,
          y: py,
          img: propImg,
          scale: propScale,
          hash: hash
        });
      }
    }
  }
  
  propObjects.sort((a, b) => a.y - b.y);
  
  propObjects.forEach(prop => {
    const screenX = prop.x - cameraX + FX.W / 2;
    const screenY = prop.y - cameraY + FX.H / 2;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 8, 22 * prop.scale, 9 * prop.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const img = FX.img(prop.img);
    FX.drawSprite(ctx, img, screenX, screenY, 65 * prop.scale, {alpha: 0.72});
  });
  
  ctx.save();
  ctx.translate(-cameraX + FX.W / 2, -cameraY + FX.H / 2);
  
  // Gems
  gems.forEach(g => {
    const img = FX.img('item-star');
    const rot = gameTime * 3.5;
    const bob = Math.sin(g.bobPhase) * 4;
    FX.drawSprite(ctx, img, g.x, g.y + bob, 22, {rot: rot, glow: true});
  });
  
  // Projectiles
  projectiles.forEach(p => {
    if (p.type === 'bolt') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      FX.trail(p.x, p.y, '#ffd700', 4);
    } else if (p.type === 'mine') {
      const img = FX.img('prop-flowers');
      const alpha = p.armed > 0 ? 0.35 : 0.85;
      FX.drawSprite(ctx, img, p.x, p.y, 45, {alpha: alpha, glow: p.armed <= 0});
    } else if (p.type === 'spear') {
      const img = FX.img('prop-crystal');
      FX.drawSprite(ctx, img, p.x, p.y, 32, {rot: p.angle, glow: true, alpha: 0.9});
    } else if (p.type === 'bomb') {
      ctx.fillStyle = '#ffaa99';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = '#ffaa99';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (p.type === 'boss_proj') {
      ctx.fillStyle = '#e9b8ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = '#e9b8ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
  
  // Enemies
  enemies.forEach(e => {
    const img = FX.img(enemyTypes[e.type]?.img || 'enemy-slime');
    let alpha = 1;
    if (e.hit > 0) {
      ctx.filter = 'brightness(2.2)';
      alpha = 0.65;
    }
    
    const scale = e.elite ? 1.35 : (e.mini ? 1.55 : 1);
    const hpRatio = Math.max(0, e.hp / e.maxHP);
    const bob = Math.sin(e.bobPhase) * 2.5;
    
    if (currentSel?.skin?.filter) ctx.filter = currentSel.skin.filter;
    FX.drawSprite(ctx, img, e.x, e.y + bob, 72 * scale, {alpha: alpha});
    ctx.filter = 'none';
    
    // HP bar for elites/boss
    if (e.mini || e.boss) {
      const barW = e.boss ? 100 : 85;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - barW / 2, e.y - 90, barW, 10);
      ctx.fillStyle = e.boss ? '#e9b8ff' : '#ff8888';
      ctx.fillRect(e.x - barW / 2, e.y - 90, barW * hpRatio, 10);
      ctx.strokeStyle = e.boss ? '#e9b8ff' : '#ff8888';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(e.x - barW / 2, e.y - 90, barW, 10);
    }
  });
  
  // Heart orbits
  if (skills.heart) {
    const n = 3 + (skills.heart - 1);
    const rad = 80 + (skills.heart - 1) * 15;
    ctx.strokeStyle = 'rgba(255, 102, 204, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, rad, 0, Math.PI * 2);
    ctx.stroke();
    
    for (let i = 0; i < n; i++) {
      const a = gameTime * 2.5 + (i / n) * Math.PI * 2;
      const hx = player.x + Math.cos(a) * rad;
      const hy = player.y + Math.sin(a) * rad;
      const img = FX.img('item-heart');
      FX.drawSprite(ctx, img, hx, hy, 28, {rot: a + Math.PI / 2, glow: true, alpha: 0.9});
    }
  }
  
  // Player shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 12, 32, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Player
  let playerAlpha = invulnTimer > 0 && Math.sin(gameTime * 25) > 0 ? 0.25 : 1;
  ctx.globalAlpha = playerAlpha;
  
  const chibis = {lan: 'lan-chibi', mo: 'mo-chibi', li: 'li-chibi', xing: 'xing-chibi', hu: 'hu-chibi'};
  const charKey = currentSel?.char || 'lan';
  const img = FX.img(chibis[charKey]);
  
  if (currentSel?.skin?.filter) ctx.filter = currentSel.skin.filter;
  const joy = FX.joystick({side: 'left'});
  if (Math.abs(joy.x) > 0.15) player._face = joy.x < 0 ? -1 : 1;
  FX.drawSprite(ctx, img, player.x, player.y + player.bobOffset, 135, {flip: player._face < 0, alpha: playerAlpha});
  ctx.filter = 'none';
  
  ctx.globalAlpha = 1;
  
  // Shield effect
  if (skills.armor) {
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.35)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 90, 0, Math.PI * 2);
    ctx.stroke();
    const shieldArc = (gameTime * Math.PI) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 95, shieldArc, shieldArc + Math.PI * 0.5);
    ctx.stroke();
  }
  
  ctx.restore();
  
  // XP bar (screen-space)
  const xpRatio = Math.min(1, xp / xpNeeded);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(18, FX.H - 28, FX.W - 36, 22);
  ctx.fillStyle = '#80f6d2';
  ctx.fillRect(18, FX.H - 28, (FX.W - 36) * xpRatio, 22);
  
  // XP text
  ctx.fillStyle = '#80f6d2';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(xp)}/${Math.floor(xpNeeded)} XP`, FX.W / 2, FX.H - 11);
  
  ctx.strokeStyle = '#80f6d2';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(18, FX.H - 28, FX.W - 36, 22);
  
  // FX
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

// === BUTTONS ===
const ultimateBtn = FX.button({icon: 'item-star', color: '#ffdd00', size: 110, right: 28, bottom: 28, key: 'KeyJ', cd: 25, onPress: () => {
  if (gameMode !== 'play') return;
  FX.burst(player.x, player.y, {n: 60, color: '#ffddff', speed: 320, life: 1.2, size: 11, glow: true});
  FX.ring(player.x, player.y, {color: '#ffdd00', r: 280, life: 1});
  FX.shake(18);
  
  enemies.filter(e => !e.boss).forEach(e => {
    damageEnemy(e, 120, player.x, player.y);
    FX.burst(e.x, e.y, {n: 12, color: '#ffdd00', speed: 220, life: 0.7, size: 7, glow: true});
  });
}});

const dashBtn = FX.button({icon: 'item-ice', color: '#66ccff', size: 95, right: 28, bottom: 160, key: 'KeyK', cd: 3.5, onPress: () => {
  if (gameMode !== 'play') return;
  const joy = FX.joystick({side: 'left'});
  let dx = 1, dy = 0;
  if (Math.hypot(joy.x, joy.y) > 0.1) {
    dx = joy.x;
    dy = joy.y;
  }
  const len = Math.hypot(dx, dy) || 1;
  const moveX = (dx / len) * 220;
  const moveY = (dy / len) * 220;
  player.x += moveX;
  player.y += moveY;
  player.x = Math.max(50, Math.min(FX.W - 50, player.x));
  player.y = Math.max(50, Math.min(FX.H - 50, player.y));
  FX.burst(player.x - (dx / len) * 60, player.y - (dy / len) * 60, {n: 24, color: '#66ccff', speed: 240, life: 0.7, size: 7, glow: true});
  FX.ring(player.x, player.y, {color: '#66ccff', r: 100, life: 0.4});
}});

// === INIT ===
const assets = [
  'bg-space', 'bg-sakura', 'bg-forest', 'bg-garden', 'bg-snow', 'bg-moon',
  'enemy-slime', 'enemy-bat', 'enemy-alien', 'enemy-boss',
  'lan-chibi', 'mo-chibi', 'li-chibi', 'xing-chibi', 'hu-chibi',
  'item-star', 'item-heart', 'item-ice', 'item-weapon', 'item-shield', 'item-armor', 'item-chest',
  'prop-crystal', 'prop-flowers', 'prop-pine', 'prop-sakura', 'prop-lantern'
];

FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'star-survivor',
    title: '星野幸存者',
    orientation: 'portrait',
    bg: ['bg-space'],
    modes: [{id: 'story', name: '故事'}, {id: 'endless', name: '无尽'}],
    stages: [
      {id: 's0', name: '梦境', bg: 'bg-space'},
      {id: 's1', name: '星轨', bg: 'bg-sakura'},
      {id: 's2', name: '幻海', bg: 'bg-forest'}
    ],
    chars: [
      {id: 'xing', name: '星眠', img: 'xing-chibi', chibi: 'xing-chibi', stats: {atk: 80, def: 80, hp: 100, spd: 100}},
      {id: 'lan', name: '蓝蓝', img: 'lan-chibi', chibi: 'lan-chibi', stats: {atk: 90, def: 75, hp: 95, spd: 110}},
      {id: 'mo', name: '墨', img: 'mo-chibi', chibi: 'mo-chibi', stats: {atk: 85, def: 85, hp: 105, spd: 95}},
      {id: 'li', name: '栗栗', img: 'li-chibi', chibi: 'li-chibi', stats: {atk: 75, def: 90, hp: 120, spd: 85}},
      {id: 'hu', name: '橙铃', img: 'hu-chibi', chibi: 'hu-chibi', stats: {atk: 88, def: 82, hp: 100, spd: 105}}
    ],
    skins: [
      {id: 's0', char: 'xing', name: '原始', filter: 'none', rarity: 'N'},
      {id: 's1', char: 'xing', name: '星耀', filter: 'hue-rotate(50deg) saturate(1.4)', rarity: 'R'},
      {id: 's2', char: 'xing', name: '冷月', filter: 'hue-rotate(200deg) saturate(1.15) brightness(1.05)', rarity: 'SR'},
      {id: 's3', char: 'xing', name: '梦幻', filter: 'hue-rotate(280deg) saturate(1.6) brightness(1.15)', rarity: 'SSR', vip: true}
    ],
    currency: [{id: 'coin', icon: 'item-chest'}, {id: 'gem', icon: 'item-star'}],
    onStart: startGame,
    onQuit: () => { FX.running = false; },
    onSkinChange: (sel) => { if (currentSel) currentSel.skin = sel.skin; }
  });
});

window.__game = {
  state: () => ({
    time: gameTime,
    player: {x: player.x, y: player.y, hp: Math.ceil(player.hp)},
    level,
    kills,
    score,
    xp,
    enemies: enemies.length,
    gems: gems.length,
    skills: Object.keys(skills).filter(k => skills[k] > 0),
    bossAlive: bossSpawned && !bossDead
  })
};

})();
