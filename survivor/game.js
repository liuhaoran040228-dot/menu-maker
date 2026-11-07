// 星野幸存者 - game.js (portrait survivor)
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

const store = FX.store('star-survivor', {bestTime: 0, bestKills: 0, wins: 0});

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
  octx.globalAlpha = 0.3;
  octx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, size, size);
  octx.restore();
  
  octx.fillStyle = 'rgba(80, 120, 100, 0.15)';
  for (let i = 0; i < 200; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const gsize = 1 + Math.random() * 2;
    octx.fillRect(gx, gy, gsize, gsize);
  }
  
  octx.fillStyle = 'rgba(60, 90, 70, 0.1)';
  for (let i = 0; i < 8; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const pr = 20 + Math.random() * 40;
    octx.beginPath();
    octx.ellipse(px, py, pr, pr * 0.4, 0, 0, Math.PI * 2);
    octx.fill();
  }
  
  return offCanvas;
}

function hashCell(cx, cy) {
  return ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
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
    coolBase: 0.33,
    coolPer: -0.02,
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
    dmgBase: 30,
    dmgPer: 12,
    coolBase: 3,
    coolPer: -0.2,
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
    dmgBase: 25,
    dmgPer: 10,
    chainCount: 4,
    coolBase: 1.5,
    coolPer: -0.1,
    maxLv: 5
  },
  wave: {
    name: '浪潮',
    desc: '正面冲击波',
    icon: 'item-shield',
    color: '#66ccff',
    rarity: 'SR',
    dmgBase: 40,
    dmgPer: 15,
    coolBase: 2,
    coolPer: -0.1,
    maxLv: 5
  },
  mine: {
    name: '花雷',
    desc: '撒布地雷',
    icon: 'prop-flowers',
    color: '#ffb3d9',
    rarity: 'SR',
    dmgBase: 35,
    dmgPer: 12,
    coolBase: 1.8,
    coolPer: -0.1,
    maxLv: 5
  },
  spear: {
    name: '晶枪',
    desc: '直线冰晶射击',
    icon: 'prop-crystal',
    color: '#aaddff',
    rarity: 'SR',
    dmgBase: 28,
    dmgPer: 11,
    coolBase: 1.2,
    coolPer: -0.08,
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
    dmgBase: 50,
    dmgPer: 18,
    coolBase: 2.5,
    coolPer: -0.12,
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
    speed: 80,
    dmg: 8,
    xp: 5,
    radius: 15,
    spawn: 0
  },
  bat: {
    name: '蝙蝠',
    img: 'enemy-bat',
    hp: 15,
    speed: 140,
    dmg: 6,
    xp: 4,
    radius: 12,
    spawn: 30
  },
  alien: {
    name: '外星人',
    img: 'enemy-alien',
    hp: 30,
    speed: 100,
    dmg: 10,
    xp: 8,
    radius: 14,
    spawn: 60
  },
  elite: {
    name: '精英',
    img: 'enemy-boss',
    hp: 60,
    speed: 110,
    dmg: 15,
    xp: 20,
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
    _face: 1
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
  const dist = 350;
  const ex = player.x + Math.cos(angle) * dist;
  const ey = player.y + Math.sin(angle) * dist;
  
  const e = {
    type: typeKey,
    x: ex,
    y: ey,
    vx: 0,
    vy: 0,
    hp: typeDef.hp * (1 + gameTime / 120),
    maxHP: typeDef.hp * (1 + gameTime / 120),
    speed: typeDef.speed,
    dmg: typeDef.dmg,
    xp: typeDef.xp,
    radius: typeDef.radius,
    hit: 0,
    hitT: 0,
    elite: Math.random() < 0.1 && !typeDef.mini,
    mini: typeDef.mini
  };
  
  if (e.elite) {
    e.hp *= 1.5;
    e.maxHP *= 1.5;
    e.dmg *= 1.3;
    e.xp *= 2;
    e.radius *= 1.2;
  }
  
  enemies.push(e);
}

function spawnMiniBoss() {
  const e = {
    type: 'elite',
    x: player.x + FX.rand(-150, 150),
    y: player.y - 250,
    vx: 0,
    vy: 0,
    hp: 150 * (1 + gameTime / 100),
    maxHP: 150 * (1 + gameTime / 100),
    speed: 120,
    dmg: 20,
    xp: 50,
    radius: 20,
    mini: true,
    hit: 0,
    hitT: 0,
    boss: false
  };
  enemies.push(e);
  FX.banner('⚠ 精英敌人');
}

function spawnBoss() {
  const e = {
    type: 'boss',
    x: FX.W / 2,
    y: FX.H / 2 - 150,
    vx: 0,
    vy: 0,
    hp: 500,
    maxHP: 500,
    speed: 100,
    dmg: 30,
    radius: 30,
    boss: true,
    hit: 0,
    hitT: 0,
    shootT: 0,
    shootInterval: 1.5,
    projectiles: []
  };
  enemies.push(e);
  FX.banner('👑 幻梦首领');
  FX.shake(15);
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
  const coolNext = Math.max(0.1, weaponDef.coolBase + lv * weaponDef.coolPer);
  player.weaponCds[weaponKey] = coolNext;
  
  if (weaponKey === 'bolt') {
    const targets = enemies.filter(e => !e.boss).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)).slice(0, 1);
    targets.forEach(t => {
      projectiles.push({
        type: 'bolt',
        x: player.x,
        y: player.y,
        target: t,
        dmg: dmg,
        speed: 500,
        life: 5
      });
    });
  } else if (weaponKey === 'nova') {
    const rad = weaponDef.radiusBase + lv * weaponDef.radiusPer;
    FX.ring(player.x, player.y, {color: '#66ddff', r: rad, life: 0.4});
    enemies.forEach(e => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < rad + e.radius) {
        damageEnemy(e, dmg);
      }
    });
  } else if (weaponKey === 'heart') {
    // Orbiting hearts handled in update
  } else if (weaponKey === 'lightning') {
    const targets = enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) < 250).slice(0, 2);
    targets.forEach(t => {
      projectiles.push({
        type: 'lightning',
        x: player.x,
        y: player.y,
        target: t,
        dmg: dmg,
        chains: 3,
        life: 0.5
      });
      FX.trail(t.x, t.y, '#ffdd00', 8);
    });
  } else if (weaponKey === 'wave') {
    projectiles.push({
      type: 'wave',
      x: player.x,
      y: player.y,
      vx: FX.rand(-200, 200),
      vy: FX.rand(-300, -200),
      dmg: dmg,
      radius: 80,
      life: 1.0
    });
  } else if (weaponKey === 'mine') {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      projectiles.push({
        type: 'mine',
        x: player.x + Math.cos(angle) * 60,
        y: player.y + Math.sin(angle) * 60,
        dmg: dmg,
        armed: 0.3,
        radius: 100,
        life: 8
      });
    }
  } else if (weaponKey === 'spear') {
    for (let i = 0; i < (lv >= 3 ? 2 : 1); i++) {
      const angle = Math.random() * Math.PI * 2;
      projectiles.push({
        type: 'spear',
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 400,
        vy: Math.sin(angle) * 400,
        dmg: dmg,
        life: 3
      });
    }
  } else if (weaponKey === 'bomb') {
    projectiles.push({
      type: 'bomb',
      x: player.x,
      y: player.y,
      vx: FX.rand(-150, 150),
      vy: FX.rand(-200, 0),
      dmg: dmg,
      radius: weaponDef.radiusBase + lv * weaponDef.radiusPer,
      life: 2
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
  e.hit = 0.1;
  e.hitT = 0.1;
  
  FX.trail(e.x, e.y, currentSel?.skin?.filter || '#ffd700', 6);
  if (isCrit) {
    FX.text(e.x, e.y - 30, 'CRIT!', {color: '#ff0', size: 24, crit: true});
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
  
  if (combo % 5 === 0) {
    FX.text(player.x, player.y - 80, combo + 'x', {color: '#ffdd00', size: 26, crit: true});
  }
  
  xp += e.xp * (1 + combo * 0.1);
  
  FX.burst(e.x, e.y, {n: 12, color: '#ffaa99', speed: 150, life: 0.6, size: 5});
  FX.shake(Math.min(8, combo));
  
  if (Math.random() < 0.4 + (combo * 0.02)) {
    gems.push({x: e.x, y: e.y, value: 1, life: 8});
  }
  
  if (e.mini) {
    miniBossTimer = 0;
  }
  if (e.boss) {
    bossDead = true;
    FX.banner('✨ 幻梦粉碎');
    FX.ring(e.x, e.y, {color: '#ff66ff', r: 300, life: 1});
    gameMode = 'gameover';
    FX.running = false;
    store.bestTime = Math.max(store.bestTime, gameTime);
    store.bestKills = Math.max(store.bestKills, kills);
    store.wins++;
    store.save();
    Lobby.reportResult({
      stage: currentSel ? currentSel.stage : 0,
      stars: Math.min(3, Math.floor(kills / 50)),
      coins: kills,
      gems: Math.floor(gameTime),
      win: true
    });
  }
}

function hurtPlayer(dmg) {
  if (invulnTimer > 0 || gameMode !== 'play') return;
  
  const actualDmg = skills.armor ? dmg * 0.8 : dmg;
  player.hp -= actualDmg;
  invulnTimer = 1.0;
  FX.shake(10);
  FX.flash('#ff0000', 0.3);
  FX.burst(player.x, player.y, {n: 20, color: '#ff4444', speed: 200, life: 0.7, size: 6});
  
  if (player.hp <= 0) {
    gameMode = 'gameover';
    FX.running = false;
    store.bestTime = Math.max(store.bestTime, gameTime);
    store.bestKills = Math.max(store.bestKills, kills);
    store.save();
    Lobby.reportResult({
      stage: currentSel ? currentSel.stage : 0,
      stars: Math.min(3, Math.floor(kills / 50)),
      coins: kills,
      gems: Math.floor(gameTime),
      win: false
    });
  }
}

// === LEVEL UP ===
function levelUp() {
  level++;
  xpNeeded = Math.floor(50 * Math.pow(1.4, level - 1));
  upgradingLevel = level;
  levelUpPending = true;
  gameMode = 'levelup';
  FX.ring(player.x, player.y, {color: '#ffdd00', r: 150, life: 0.8});
  FX.banner('✨ 等级提升！');
  
  const pool = Object.keys(weaponData).filter(k => !skills[k] || skills[k] < weaponData[k].maxLv);
  const passivePool = Object.keys(passiveData).filter(k => !skills[k]);
  
  const opts = [];
  for (let i = 0; i < 2 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    opts.push(pool.splice(idx, 1)[0]);
  }
  if (passivePool.length > 0) {
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
    const rarity = isPassive ? '#aaa' : {N: '#999', R: '#66f', SR: '#f66', SSR: '#ff0'}[def.rarity];
    
    return `
      <button class="a2-choice" data-key="${key}" style="border-color: ${rarity}; padding: 12px; margin: 6px; background: rgba(0,0,0,0.4); border: 2px solid ${rarity}; border-radius: 8px; color: white; cursor: pointer; font-size: 0.9em; text-align: left;">
        <div style="color: ${def.color || '#aaa'}; font-size: 1.2em; font-weight: bold; margin-bottom: 4px;">${def.name}</div>
        <div style="font-size: 0.8em; opacity: 0.9; margin-bottom: 4px;">${def.desc}</div>
        <div style="color: ${rarity}; font-size: 0.75em;">${isPassive ? '被动' : '✦ ' + def.rarity} ${currentLv > 0 ? '(Lv.' + currentLv + ')' : '(新)'}</div>
      </button>
    `;
  });
  
  FX.overlay({
    title: '升级选择',
    html: '<div style="display: flex; flex-direction: column; gap: 0;">' + cards.join('') + '</div>',
    button: null,
    onStart: () => {}
  });
  
  document.querySelectorAll('.a2-choice').forEach((btn, idx) => {
    btn.onclick = () => selectSkill(btn.dataset.key, idx);
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
  player.x = FX.lerp(player.x, player.x + px * speed * dt, 0.9);
  player.y = FX.lerp(player.y, player.y + py * speed * dt, 0.9);
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
        FX.burst(p.x, p.y, {n: 5, color: '#ffd700', speed: 100, life: 0.3, size: 3});
        p.life = 0;
      }
    } else if (p.type === 'wave') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      
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
            FX.burst(p.x, p.y, {n: 20, color: '#ffb3d9', speed: 180, life: 0.6, size: 5});
          }
        });
        p.life = 0;
      }
    } else if (p.type === 'spear') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      enemies.forEach(e => {
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.radius + 8) {
          damageEnemy(e, p.dmg, p.x, p.y);
          FX.trail(p.x, p.y, '#aaddff', 5);
        }
      });
    } else if (p.type === 'bomb') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      
      if (p.life <= 0) {
        enemies.forEach(e => {
          if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
            damageEnemy(e, p.dmg, p.x, p.y);
          }
        });
        FX.burst(p.x, p.y, {n: 30, color: '#ffaa99', speed: 250, life: 0.8, size: 8, glow: true});
      }
    } else if (p.type === 'boss_proj') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      if (Math.hypot(p.x - player.x, p.y - player.y) < 15 && invulnTimer <= 0) {
        hurtPlayer(p.dmg);
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
      const a = gameTime * 2 + (i / n) * Math.PI * 2;
      const hx = player.x + Math.cos(a) * rad;
      const hy = player.y + Math.sin(a) * rad;
      
      enemies.forEach(e => {
        if (Math.hypot(hx - e.x, hy - e.y) < e.radius + 12) {
          damageEnemy(e, weaponData.heart.dmgBase + (skills.heart - 1) * weaponData.heart.dmgPer);
        }
      });
    }
  }
  
  // XP gems
  const pickupRad = 100 + (skills.pickup ? 80 : 0);
  gems.forEach(g => {
    g.life -= dt;
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    if (d < pickupRad) {
      const a = Math.atan2(player.y - g.y, player.x - g.x);
      g.x += Math.cos(a) * 400 * dt;
      g.y += Math.sin(a) * 400 * dt;
    }
    if (d < 20) {
      xp += g.value;
      g.life = 0;
      FX.burst(g.x, g.y, {n: 8, color: '#80f6d2', speed: 100, life: 0.4, size: 3, glow: true});
    }
  });
  gems = gems.filter(g => g.life > 0);
  
  // Enemy update
  enemies.forEach(e => {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    
    if (!e.boss) {
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
    } else {
      const phase = Math.floor(gameTime / 4) % 4;
      const targetX = player.x + Math.cos(phase) * 150;
      const targetY = player.y + Math.sin(phase) * 150;
      const angle = Math.atan2(targetY - e.y, targetX - e.x);
      e.x += Math.cos(angle) * e.speed * dt;
      e.y += Math.sin(angle) * e.speed * dt;
      
      e.shootT -= dt;
      if (e.shootT <= 0) {
        for (let i = 0; i < 8; i++) {
          const aa = (i / 8) * Math.PI * 2 + gameTime;
          projectiles.push({
            type: 'boss_proj',
            x: e.x,
            y: e.y,
            vx: Math.cos(aa) * 200,
            vy: Math.sin(aa) * 200,
            life: 5,
            dmg: 15
          });
        }
        FX.ring(e.x, e.y, {color: '#e9b8ff', r: 100, life: 0.3});
        e.shootT = e.shootInterval;
      }
    }
    
    e.hit = Math.max(0, e.hit - dt);
    
    if (d < e.radius + 20) {
      hurtPlayer(e.dmg * dt);
    }
  });
  
  // Spawning
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    if (enemies.length < Math.min(40, 15 + gameTime / 15)) {
      spawnEnemy();
    }
    spawnInterval = Math.max(0.4, 0.8 - gameTime / 150);
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
    player.hp = Math.min(player.maxHP, player.hp + player.maxHP * 0.01 * dt);
  }
  if (gameTime - comboLastTime > 3) {
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
  
  const cellSize = 260;
  const cellStartX = Math.floor((cameraX - FX.W / 2 - 200) / cellSize);
  const cellEndX = Math.ceil((cameraX + FX.W / 2 + 200) / cellSize);
  const cellStartY = Math.floor((cameraY - FX.H / 2 - 200) / cellSize);
  const cellEndY = Math.ceil((cameraY + FX.H / 2 + 200) / cellSize);
  
  const propObjects = [];
  for (let cx = cellStartX; cx <= cellEndX; cx++) {
    for (let cy = cellStartY; cy <= cellEndY; cy++) {
      const hash = hashCell(cx, cy);
      if (hash % 3 === 0) {
        const px = cx * cellSize + ((hash >> 4) % cellSize);
        const py = cy * cellSize + ((hash >> 8) % cellSize);
        const propIdx = (hash >> 12) % 5;
        const propScale = 0.5 + ((hash >> 16) % 40) / 100;
        
        const propTypes = ['prop-flowers', 'prop-pine', 'prop-crystal', 'prop-sakura', 'prop-lantern'];
        const propImg = propTypes[propIdx];
        
        propObjects.push({
          x: px,
          y: py,
          img: propImg,
          scale: propScale
        });
      }
    }
  }
  
  propObjects.sort((a, b) => a.y - b.y);
  
  propObjects.forEach(prop => {
    const screenX = prop.x - cameraX + FX.W / 2;
    const screenY = prop.y - cameraY + FX.H / 2;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 5, 20 * prop.scale, 8 * prop.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const img = FX.img(prop.img);
    FX.drawSprite(ctx, img, screenX, screenY, 60 * prop.scale, {alpha: 0.7});
  });
  
  ctx.save();
  ctx.translate(-cameraX + FX.W / 2, -cameraY + FX.H / 2);
  
  // Gems
  gems.forEach(g => {
    const img = FX.img('item-star');
    const rot = gameTime * 3;
    FX.drawSprite(ctx, img, g.x, g.y, 20, {rot: rot, glow: true});
  });
  
  // Projectiles
  projectiles.forEach(p => {
    if (p.type === 'bolt') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      FX.trail(p.x, p.y, '#ffd700', 4);
    } else if (p.type === 'mine') {
      const img = FX.img('prop-flowers');
      const alpha = p.armed > 0 ? 0.3 : 0.8;
      FX.drawSprite(ctx, img, p.x, p.y, 40, {alpha: alpha});
    } else if (p.type === 'spear') {
      const img = FX.img('prop-crystal');
      FX.drawSprite(ctx, img, p.x, p.y, 30, {glow: true});
    } else if (p.type === 'bomb') {
      ctx.fillStyle = '#ffaa99';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'boss_proj') {
      ctx.fillStyle = '#e9b8ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  // Enemies
  enemies.forEach(e => {
    const img = FX.img(enemyTypes[e.type]?.img || 'enemy-slime');
    let alpha = 1;
    if (e.hit > 0) {
      ctx.filter = 'brightness(2)';
      alpha = 0.7;
    }
    
    const scale = e.elite ? 1.3 : (e.mini ? 1.5 : 1);
    const hpRatio = Math.max(0, e.hp / e.maxHP);
    
    if (currentSel?.skin?.filter) ctx.filter = currentSel.skin.filter;
    FX.drawSprite(ctx, img, e.x, e.y, 70 * scale, {alpha: alpha});
    ctx.filter = 'none';
    
    // HP bar for elites/boss
    if (e.mini || e.boss) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - 40, e.y - 80, 80, 8);
      ctx.fillStyle = e.boss ? '#e9b8ff' : '#ff9999';
      ctx.fillRect(e.x - 40, e.y - 80, 80 * hpRatio, 8);
      ctx.strokeStyle = e.boss ? '#e9b8ff' : '#ff9999';
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x - 40, e.y - 80, 80, 8);
    }
  });
  
  // Heart orbits
  if (skills.heart) {
    const n = 3 + (skills.heart - 1);
    const rad = 80 + (skills.heart - 1) * 15;
    ctx.strokeStyle = 'rgba(255, 102, 204, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, rad, 0, Math.PI * 2);
    ctx.stroke();
    
    for (let i = 0; i < n; i++) {
      const a = gameTime * 2 + (i / n) * Math.PI * 2;
      const hx = player.x + Math.cos(a) * rad;
      const hy = player.y + Math.sin(a) * rad;
      const img = FX.img('item-heart');
      FX.drawSprite(ctx, img, hx, hy, 25, {rot: a, glow: true});
    }
  }
  
  // Player shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 5, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Player
  let playerAlpha = invulnTimer > 0 && Math.sin(gameTime * 20) > 0 ? 0.3 : 1;
  ctx.globalAlpha = playerAlpha;
  
  const chibis = {lan: 'lan-chibi', mo: 'mo-chibi', li: 'li-chibi', xing: 'xing-chibi', hu: 'hu-chibi'};
  const charKey = currentSel?.char || 'lan';
  const img = FX.img(chibis[charKey]);
  
  if (currentSel?.skin?.filter) ctx.filter = currentSel.skin.filter;
  const joy = FX.joystick({side: 'left'});
  if (Math.abs(joy.x) > 0.15) player._face = joy.x < 0 ? -1 : 1;
  FX.drawSprite(ctx, img, player.x, player.y, 130, {flip: player._face < 0});
  ctx.filter = 'none';
  
  ctx.globalAlpha = 1;
  
  // Shield effect
  if (skills.armor) {
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 80, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
  
  // XP bar (screen-space)
  const xpRatio = xp / xpNeeded;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(20, FX.H - 30, FX.W - 40, 20);
  ctx.fillStyle = '#80f6d2';
  ctx.fillRect(20, FX.H - 30, (FX.W - 40) * xpRatio, 20);
  ctx.strokeStyle = '#80f6d2';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, FX.H - 30, FX.W - 40, 20);
  
  // FX
  FX.drawFX(ctx);
  FX.vignette(ctx);
}

// === BUTTONS ===
const ultimateBtn = FX.button({icon: 'item-star', color: '#ffdd00', size: 100, right: 30, bottom: 30, key: 'KeyJ', cd: 20, onPress: () => {
  if (gameMode !== 'play') return;
  FX.burst(player.x, player.y, {n: 50, color: '#ffddff', speed: 300, life: 1, size: 10, glow: true});
  FX.ring(player.x, player.y, {color: '#ffdd00', r: 250, life: 0.8});
  FX.shake(15);
  enemies.forEach(e => {
    if (!e.boss) {
      damageEnemy(e, 100);
      FX.burst(e.x, e.y, {n: 10, color: '#ffdd00', speed: 200, life: 0.6, size: 6});
    }
  });
}});

const dashBtn = FX.button({icon: 'item-ice', color: '#66ccff', size: 80, right: 30, bottom: 150, key: 'KeyK', cd: 3, onPress: () => {
  if (gameMode !== 'play') return;
  const joy = FX.joystick({side: 'left'});
  let dx = 1, dy = 0;
  if (Math.hypot(joy.x, joy.y) > 0.1) {
    dx = joy.x;
    dy = joy.y;
  }
  const len = Math.hypot(dx, dy);
  player.x += (dx / len || 1) * 200;
  player.y += (dy / len || 0) * 200;
  player.x = Math.max(50, Math.min(FX.W - 50, player.x));
  player.y = Math.max(50, Math.min(FX.H - 50, player.y));
  FX.burst(player.x - dx * 50, player.y - dy * 50, {n: 20, color: '#66ccff', speed: 200, life: 0.6, size: 6, glow: true});
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
      {id: 's1', char: 'xing', name: '星耀', filter: 'hue-rotate(60deg) saturate(1.3)', rarity: 'R'},
      {id: 's2', char: 'xing', name: '冷月', filter: 'hue-rotate(200deg) saturate(1.1)', rarity: 'SR'},
      {id: 's3', char: 'xing', name: '梦幻', filter: 'hue-rotate(280deg) saturate(1.5) brightness(1.1)', rarity: 'SSR', vip: true}
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
    xp,
    enemies: enemies.length,
    gems: gems.length,
    skills: Object.keys(skills).filter(k => skills[k] > 0),
    bossAlive: bossSpawned && !bossDead
  })
};

})();
;FX.useSideSprites('run');
