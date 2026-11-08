// 花园守护计划 (garden-guardians) - game.js
(function() {
'use strict';

const {cv, ctx, W, H} = FX.init({landscape: false, logicalH: 1170});

// === STATE ===
let gameState = null;
let currentSel = null;
let selectedTowerType = null;
let selectedTower = null;
let hoverCell = null;
let gameSpeed = 1;
let gameTime = 0;
let showTowerMenu = false;
let towerMenuPos = null;
let showUpgradeSellMenu = false;
let upgradeSellMenuPos = null;

const MAPS = [
  {id:'garden', name:'花园', bg:'bg-garden', rows:12, cols:6, path:[[3,0],[3,3],[1,3],[1,7],[4,7],[4,11]]},
  {id:'forest', name:'林间', bg:'bg-forest', rows:12, cols:6, path:[[0,2],[3,2],[3,5],[5,5],[5,9],[2,9],[2,12]]},
  {id:'sakura', name:'樱花', bg:'bg-sakura', rows:12, cols:6, path:[[2,0],[2,4],[4,4],[4,8],[1,8],[1,11]]},
  {id:'snow', name:'冰原', bg:'bg-snow', rows:12, cols:6, path:[[3,0],[3,2],[0,2],[0,6],[5,6],[5,10],[3,10]]},
  {id:'neon', name:'霓虹', bg:'bg-neon', rows:12, cols:6, path:[[1,1],[1,5],[4,5],[4,9],[2,9],[2,11]]},
  {id:'rail', name:'星轨', bg:'bg-rail', rows:12, cols:6, path:[[4,0],[4,4],[1,4],[1,8],[5,8],[5,11]]}
];

const TOWER_DEFS = [
  {id:'lan', name:'蓝蓝', role:'单体', color:'#66ccff', cost:100, damage:45, range:2.8, rate:1.2, splash:0},
  {id:'mo', name:'小模', role:'减速', color:'#88dd99', cost:120, damage:20, range:2.5, rate:1.5, splash:0, slow:0.4},
  {id:'li', name:'栗栗', role:'群攻', color:'#ffcc66', cost:150, damage:25, range:2.2, rate:0.8, splash:1.5},
  {id:'xing', name:'星眠', role:'狙击', color:'#dd99ff', cost:130, damage:70, range:4.0, rate:2.0, splash:0}
];

const ENEMY_DEFS = {
  slime: {name:'史莱姆', color:'#66dd99', hp:30, speed:1.5, r:18, reward:15, img:'enemy-slime'},
  bat: {name:'蝙蝠', color:'#dd99ff', hp:25, speed:2.2, r:16, reward:20, img:'enemy-bat', flying:true},
  alien: {name:'异星人', color:'#ffaa66', hp:50, speed:1.2, r:20, reward:30, img:'enemy-alien', shield:15},
  elite: {name:'精英', color:'#ffdd66', hp:80, speed:1.0, r:22, reward:50, img:'enemy-slime'},
  boss: {name:'首领', color:'#ff66cc', hp:200, speed:0.8, r:32, reward:200, img:'enemy-boss', boss:true}
};

const WAVES = [
  {groups:[['slime',8,0.3]]},
  {groups:[['slime',5,0.4],['bat',4,0.5]]},
  {groups:[['slime',6,0.3],['alien',3,0.6]]},
  {groups:[['slime',4,0.3],['bat',3,0.4],['slime',4,0.3]]},
  {groups:[['boss',1,0]],isBossWave:true},
  {groups:[['alien',5,0.5],['bat',3,0.5]]},
  {groups:[['slime',3,0.3],['elite',2,0.8],['slime',3,0.3]]},
  {groups:[['bat',6,0.4],['alien',4,0.6]]},
  {groups:[['elite',3,0.6],['slime',5,0.2]]},
  {groups:[['boss',1,0]],isBossWave:true}
];

const SKILLS = [
  {id:'meteor', name:'星陨', icon:'item-star', color:'#ffdd00', cost:0, cd:8},
  {id:'freeze', name:'冻结', icon:'item-ice', color:'#aaddff', cost:0, cd:10},
  {id:'gold', name:'收获', icon:'item-chest', color:'#ffcc66', cost:0, cd:6}
];

// === HELPERS ===
function buildPath() {
  const map = MAPS[currentSel.stage];
  const path = [];
  for (let i=0; i<map.path.length-1; i++) {
    const [ax,ay] = map.path[i], [bx,by] = map.path[i+1];
    const n = Math.abs(bx-ax) + Math.abs(by-ay);
    const dx = Math.sign(bx-ax), dy = Math.sign(by-ay);
    for (let j=0; j<=n; j++) {
      path.push({c: ax+dx*j, r: ay+dy*j});
    }
  }
  return path;
}

function getTowerDef(id) {
  return TOWER_DEFS.find(t => t.id === id);
}

function getUpgradeCost(level) {
  return Math.floor(100 + level * 40);
}

function cellToScreen(c, r) {
  const cellSize = Math.min((W-40)/6, (H-240)/12);
  const offsetX = (W - cellSize*6) / 2;
  const offsetY = 140;
  return {x: offsetX + (c+0.5)*cellSize, y: offsetY + (r+0.5)*cellSize, size: cellSize};
}

function screenToCell(x, y) {
  const cellSize = Math.min((W-40)/6, (H-240)/12);
  const offsetX = (W - cellSize*6) / 2;
  const offsetY = 140;
  const c = Math.floor((x-offsetX)/cellSize);
  const r = Math.floor((y-offsetY)/cellSize);
  return {c, r};
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2-x1, y2-y1);
}

// === GAME STATE ===
function initGame(sel) {
  currentSel = sel;
  const map = MAPS[sel.stage];
  const path = buildPath();
  const roadSet = new Set(path.map(p => p.c+','+p.r));
  
  gameState = {
    mode: 'build',
    wave: 0,
    gold: 300,
    lives: 20,
    kills: 0,
    map: map,
    path: path,
    roadSet: roadSet,
    towers: [],
    enemies: [],
    projectiles: [],
    waveQueue: [],
    waveTime: 0,
    combo: 0,
    comboTime: 0,
    skills: SKILLS.map(s => ({...s, cooldown: 0})),
    hitStop: 0,
    score: 0,
    started: false
  };
  
  selectedTowerType = null;
  selectedTower = null;
  showTowerMenu = false;
  towerMenuPos = null;
  showUpgradeSellMenu = false;
  upgradeSellMenuPos = null;
  gameTime = 0;
  gameSpeed = 1;
  
  updateHUD();
}

function startWave() {
  if (gameState.mode !== 'build' || gameState.wave >= WAVES.length) return;
  
  gameState.wave++;
  gameState.mode = 'play';
  gameState.waveTime = 0;
  gameState.waveQueue = [];
  gameState.started = true;
  
  const waveData = WAVES[gameState.wave-1];
  let time = 0.5;
  for (const [enemyId, count, gap] of waveData.groups) {
    for (let i=0; i<count; i++) {
      gameState.waveQueue.push({id: enemyId, time: time});
      time += gap;
    }
  }
  
  if (waveData.isBossWave) {
    FX.banner('⚠ BOSS 来袭！');
  } else {
    FX.banner('第 ' + gameState.wave + ' 波');
  }
  updateHUD();
}

function placeTower(c, r, towerId) {
  if (!['build','play'].includes(gameState.mode)) return;
  
  const map = gameState.map;
  if (c<0 || c>=map.cols || r<0 || r>=map.rows) return;
  
  if (gameState.roadSet.has(c+','+r)) {
    return;
  }
  
  const existing = gameState.towers.find(t => t.c===c && t.r===r);
  if (existing) {
    return;
  }
  
  const def = getTowerDef(towerId);
  if (gameState.gold < def.cost) {
    return;
  }
  
  const screen = cellToScreen(c, r);
  const tower = {
    id: towerId,
    c: c,
    r: r,
    x: screen.x,
    y: screen.y,
    level: 1,
    cooldown: 0,
    spent: def.cost
  };
  
  gameState.towers.push(tower);
  gameState.gold -= def.cost;
  selectedTower = tower;
  
  FX.burst(screen.x, screen.y, {n:15, color:def.color, speed:150, life:0.6, size:5, glow:true});
  FX.ring(screen.x, screen.y, {color:def.color, r:80, life:0.5});
  
  showTowerMenu = false;
  towerMenuPos = null;
  
  updateHUD();
}

function upgradeTower() {
  if (!selectedTower || selectedTower.level >= 3) return;
  
  const cost = getUpgradeCost(selectedTower.level);
  if (gameState.gold < cost) return;
  
  gameState.gold -= cost;
  selectedTower.spent += cost;
  selectedTower.level++;
  selectedTower.cooldown = 0;
  
  FX.burst(selectedTower.x, selectedTower.y, {n:20, color:'#ffd700', speed:180, life:0.6, size:6, glow:true});
  FX.text(selectedTower.x, selectedTower.y-60, 'Lv.' + selectedTower.level, {color:'#ffe6cc', size:20, crit:true});
  
  showUpgradeSellMenu = false;
  upgradeSellMenuPos = null;
  
  updateHUD();
}

function sellTower() {
  if (!selectedTower) return;
  
  const refund = Math.floor(selectedTower.spent * 0.65);
  gameState.gold += refund;
  
  const x = selectedTower.x;
  const y = selectedTower.y;
  
  gameState.towers = gameState.towers.filter(t => t !== selectedTower);
  selectedTower = null;
  
  FX.burst(x, y, {n:12, color:'#ffcc99', speed:120, life:0.5, size:5});
  
  showUpgradeSellMenu = false;
  upgradeSellMenuPos = null;
  
  updateHUD();
}

function useSkill(skillId) {
  const skill = gameState.skills.find(s => s.id === skillId);
  if (!skill || skill.cooldown > 0) return;
  
  const map = gameState.map;
  const centerC = Math.floor(map.cols/2);
  const centerR = Math.floor(map.rows/2);
  const screen = cellToScreen(centerC, centerR);
  
  if (skillId === 'meteor') {
    FX.banner('⭐ 星陨');
    FX.shake(10);
    FX.hitstop(0.1);
    FX.flash('#ffdd00', 0.4);
    FX.burst(screen.x, screen.y, {n:40, color:'#ffff99', speed:250, life:0.8, size:8, glow:true});
    FX.ring(screen.x, screen.y, {color:'#ffff00', r:200, life:0.6});
    
    gameState.enemies.forEach(e => {
      if (distance(e.x, e.y, screen.x, screen.y) < 250) {
        damageEnemy(e, 50, {color:'#ffdd00'});
      }
    });
  } else if (skillId === 'freeze') {
    FX.banner('❄ 冻结');
    FX.flash('#aaddff', 0.3);
    gameState.enemies.forEach(e => {
      e.frozen = 2.5;
    });
  } else if (skillId === 'gold') {
    FX.banner('🌟 收获');
    const gain = 100;
    gameState.gold += gain;
    FX.text(screen.x, screen.y, '+' + gain, {color:'#ffd700', size:24, crit:true});
  }
  
  skill.cooldown = skill.cd;
  updateHUD();
}

function toggleSpeed() {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  updateHUD();
}

// === SPAWN ===
function spawnEnemy(enemyId) {
  const def = ENEMY_DEFS[enemyId];
  const path = gameState.path;
  const screen = cellToScreen(path[0].c, path[0].r);
  
  const enemy = {
    id: enemyId,
    x: screen.x,
    y: screen.y,
    progress: 0,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * (1 + gameState.wave * 0.1),
    r: def.r,
    reward: def.reward,
    color: def.color,
    frozen: 0,
    hitFlash: 0,
    image: def.img
  };
  
  if (def.shield) enemy.shield = def.shield;
  if (def.flying) enemy.flying = true;
  if (def.boss) enemy.boss = true;
  
  gameState.enemies.push(enemy);
}

// === UPDATE ===
function updateGame(dt) {
  if (gameState.mode !== 'play') return;
  
  if (gameState.hitStop > 0) {
    gameState.hitStop -= dt;
    return;
  }
  
  const delta = dt * gameSpeed;
  gameState.waveTime += delta;
  gameState.comboTime = Math.max(0, gameState.comboTime - delta);
  if (gameState.comboTime <= 0) gameState.combo = 0;
  
  // Spawn enemies
  while (gameState.waveQueue.length > 0 && gameState.waveQueue[0].time <= gameState.waveTime) {
    spawnEnemy(gameState.waveQueue.shift().id);
  }
  
  // Update skills
  gameState.skills.forEach(s => {
    s.cooldown = Math.max(0, s.cooldown - delta);
  });
  
  // Update enemies
  const path = gameState.path;
  gameState.enemies.forEach(e => {
    e.frozen = Math.max(0, e.frozen - delta);
    e.hitFlash = Math.max(0, e.hitFlash - delta);
    
    const speed = e.frozen > 0 ? e.speed * 0.2 : e.speed;
    e.progress += speed * delta;
    
    if (e.progress >= path.length - 1) {
      e.hp = -1;
      gameState.lives = Math.max(0, gameState.lives - (e.boss ? 5 : 1));
      FX.burst(e.x, e.y, {n:15, color:'#ff6699', speed:180, life:0.6, size:6});
      if (gameState.lives <= 0) {
        endGame(false);
        return;
      }
    } else {
      const i = Math.floor(e.progress);
      const f = e.progress - i;
      const p1 = cellToScreen(path[i].c, path[i].r);
      const p2 = cellToScreen(path[Math.min(i+1, path.length-1)].c, path[Math.min(i+1, path.length-1)].r);
      e.x = p1.x + (p2.x - p1.x) * f;
      e.y = p1.y + (p2.y - p1.y) * f;
    }
  });
  
  // Update towers
  gameState.towers.forEach(t => {
    const def = getTowerDef(t.id);
    const range = (def.range + (t.level-1)*0.3) * 80;
    
    t.cooldown -= delta;
    if (t.cooldown <= 0) {
      let target = null;
      let maxProg = -1;
      
      gameState.enemies.forEach(e => {
        if (e.hp > 0 && distance(e.x, e.y, t.x, t.y) < range) {
          if (e.progress > maxProg) {
            maxProg = e.progress;
            target = e;
          }
        }
      });
      
      if (target) {
        gameState.projectiles.push({
          sx: t.x,
          sy: t.y,
          tx: target.x,
          ty: target.y,
          target: target,
          damage: def.damage * (1 + (t.level-1)*0.5),
          color: def.color,
          def: def,
          life: 1.0
        });
        t.cooldown = 1 / (def.rate * (1 + (t.level-1)*0.2));
      }
    }
  });
  
  // Update projectiles
  gameState.projectiles.forEach(p => {
    const v = 500 * delta;
    let dx = p.tx - p.sx;
    let dy = p.ty - p.sy;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0) {
      p.sx += dx/dist * Math.min(v, dist);
      p.sy += dy/dist * Math.min(v, dist);
    }
    
    if (p.target.hp > 0) {
      p.tx = p.target.x;
      p.ty = p.target.y;
    }
    
    p.life -= delta;
    
    if (distance(p.sx, p.sy, p.tx, p.ty) < 30) {
      if (p.def.splash) {
        const splashR = p.def.splash * 100;
        gameState.enemies.forEach(e => {
          if (e.hp > 0 && distance(e.x, e.y, p.tx, p.ty) < splashR) {
            damageEnemy(e, p.damage, p.def);
          }
        });
        FX.ring(p.tx, p.ty, {color:p.color, r:splashR, life:0.5});
      } else if (p.target.hp > 0) {
        damageEnemy(p.target, p.damage, p.def);
      }
      
      FX.burst(p.tx, p.ty, {n:10, color:p.color, speed:150, life:0.5, size:5});
      FX.trail(p.tx, p.ty, p.color, 6);
      p.life = 0;
    }
  });
  
  gameState.projectiles = gameState.projectiles.filter(p => p.life > 0 && p.sx > -100 && p.sx < W+100);
  gameState.enemies = gameState.enemies.filter(e => e.hp > 0);
  
  // Wave complete
  if (gameState.waveQueue.length === 0 && gameState.enemies.length === 0) {
    if (gameState.wave >= WAVES.length) {
      endGame(true);
    } else {
      gameState.mode = 'build';
      const bonus = 50 + gameState.wave * 10;
      gameState.gold += bonus;
      FX.banner('波次完成！+' + bonus + ' 星糖');
      updateHUD();
    }
  }
  
  updateHUD();
}

function damageEnemy(e, dmg, towerDef) {
  e.hp -= dmg;
  e.hitFlash = 0.08;
  FX.hitstop(0.04);
  FX.shake(3);
  FX.trail(e.x, e.y, towerDef.color, 5);
  
  if (towerDef.slow && !e.flying) {
    e.frozen = Math.max(e.frozen, 1.2);
  }
  
  FX.text(e.x, e.y-30, '-' + Math.floor(dmg), {color:'#ffddaa', size:16});
  
  if (e.hp <= 0) {
    gameState.kills++;
    gameState.gold += e.reward;
    gameState.combo++;
    gameState.comboTime = 2.0;
    gameState.score += e.reward * (1 + gameState.combo*0.1);
    
    if (gameState.combo % 3 === 0) {
      FX.text(e.x, e.y-50, '×' + gameState.combo, {color:'#ffff99', size:20, crit:true});
    }
    
    FX.burst(e.x, e.y, {n:20, color:e.color, speed:200, life:0.7, size:8});
    if (e.boss) {
      FX.ring(e.x, e.y, {color:'#ffaa00', r:250, life:0.8});
      FX.shake(15);
    }
  }
}

function endGame(won) {
  gameState.mode = 'over';
  FX.running = false;
  
  Lobby.reportResult({
    win: !!won,
    stage: currentSel.stage,
    stars: won ? 3 : Math.min(2, Math.floor(gameState.wave/3)),
    coins: gameState.gold,
    gems: Math.floor(gameState.score/100)
  });
}

// === DRAW ===
function drawGame(ctx) {
  const map = gameState.map;
  const cellSize = Math.min((W-40)/6, (H-240)/12);
  
  // Background
  const bgImg = FX.img(map.bg);
  const bgScale = Math.max(W/640, H/360);
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.drawImage(bgImg, -320*bgScale, -180*bgScale, 640*bgScale, 360*bgScale);
  ctx.restore();
  
  FX.motes(ctx, '#ffffff');
  
  // Grid background
  const offsetX = (W - cellSize*6) / 2;
  const offsetY = 140;
  
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(offsetX-10, offsetY-10, cellSize*6+20, cellSize*12+20);
  
  // Draw path
  const pathCells = new Set();
  gameState.path.forEach(p => {
    pathCells.add(p.c+','+p.r);
  });
  
  // Draw path polyline
  ctx.save();
  ctx.strokeStyle = 'rgba(140,120,160,0.9)';
  ctx.lineWidth = cellSize * 0.85;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  
  let firstPoint = true;
  gameState.path.forEach(p => {
    const screen = cellToScreen(p.c, p.r);
    if (firstPoint) {
      ctx.moveTo(screen.x, screen.y);
      firstPoint = false;
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  });
  ctx.stroke();
  ctx.restore();
  
  // Path edge highlight
  ctx.save();
  ctx.strokeStyle = 'rgba(180,160,200,0.5)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  
  firstPoint = true;
  gameState.path.forEach(p => {
    const screen = cellToScreen(p.c, p.r);
    if (firstPoint) {
      ctx.moveTo(screen.x, screen.y);
      firstPoint = false;
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  });
  ctx.stroke();
  ctx.restore();
  
  // Path dashed center
  ctx.save();
  ctx.strokeStyle = 'rgba(220,200,240,0.3)';
  ctx.lineWidth = cellSize * 0.2;
  ctx.lineCap = 'round';
  ctx.setLineDash([cellSize*0.3, cellSize*0.3]);
  ctx.beginPath();
  
  firstPoint = true;
  gameState.path.forEach(p => {
    const screen = cellToScreen(p.c, p.r);
    if (firstPoint) {
      ctx.moveTo(screen.x, screen.y);
      firstPoint = false;
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  });
  ctx.stroke();
  ctx.restore();
  
  // Draw grid cells
  for (let r=0; r<map.rows; r++) {
    for (let c=0; c<map.cols; c++) {
      const isRoad = pathCells.has(c+','+r);
      const screen = cellToScreen(c, r);
      
      if (!isRoad) {
        ctx.fillStyle = ((r+c)%2 ? 'rgba(100,120,140,0.15)' : 'rgba(120,140,160,0.15)');
        ctx.fillRect(screen.x - cellSize*0.45, screen.y - cellSize*0.45, cellSize*0.9, cellSize*0.9);
        
        ctx.strokeStyle = 'rgba(200,220,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4,4]);
        ctx.strokeRect(screen.x - cellSize*0.4, screen.y - cellSize*0.4, cellSize*0.8, cellSize*0.8);
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(200,220,255,0.3)';
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 3, 0, Math.PI*2);
        ctx.fill();
        
        if (!gameState.towers.find(t => t.c===c && t.r===r)) {
          ctx.strokeStyle = 'rgba(200,220,255,0.25)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screen.x-8, screen.y);
          ctx.lineTo(screen.x+8, screen.y);
          ctx.moveTo(screen.x, screen.y-8);
          ctx.lineTo(screen.x, screen.y+8);
          ctx.stroke();
        }
      }
      
      if (!isRoad && hoverCell && hoverCell.c === c && hoverCell.r === r && !selectedTower) {
        ctx.strokeStyle = 'rgba(100,200,255,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(screen.x - cellSize*0.45, screen.y - cellSize*0.45, cellSize*0.9, cellSize*0.9);
      }
    }
  }
  
  // Towers
  gameState.towers.forEach(t => {
    const def = getTowerDef(t.id);
    const screen = cellToScreen(t.c, t.r);
    
    ctx.fillStyle = 'rgba(100,80,120,0.6)';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y+10, cellSize*0.35, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(120,100,140,0.4)';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y+8, cellSize*0.3, 0, Math.PI*2);
    ctx.fill();
    
    if (t === selectedTower) {
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([6,6]);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, (def.range + (t.level-1)*0.3)*80, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    
    const img = FX.img(t.id+'-chibi');
    const scale = 0.7 + t.level*0.15;
    if (currentSel && currentSel.skin && currentSel.skin.filter) {
      ctx.filter = currentSel.skin.filter;
    }
    FX.drawSprite(ctx, img, screen.x, screen.y, 80*scale);
    ctx.filter = 'none';
    
    for (let i=0; i<t.level; i++) {
      ctx.fillStyle = def.color;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(screen.x + (i-1)*12, screen.y + cellSize*0.35, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
  
  // Enemies
  gameState.enemies.forEach(e => {
    ctx.save();
    if (e.hitFlash > 0) {
      ctx.globalAlpha = 0.5;
      ctx.filter = 'brightness(2)';
    }
    
    const img = FX.img(e.image);
    const hueShift = e.boss ? 'hue-rotate(30deg) saturate(1.5)' : '';
    if (hueShift) ctx.filter = hueShift;
    
    const scale = e.boss ? 1.5 : 1;
    FX.drawSprite(ctx, img, e.x, e.y, e.r*2.5*scale);
    
    ctx.restore();
    
    const barW = e.boss ? 70 : 50;
    const barH = 5;
    const barY = e.y - (e.boss ? 60 : 45);
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x-barW/2, barY, barW, barH);
    
    const hpRatio = Math.max(0, e.hp/e.maxHp);
    ctx.fillStyle = e.frozen > 0 ? '#66ddff' : (hpRatio > 0.5 ? '#88ff88' : (hpRatio > 0.25 ? '#ffdd66' : '#ff6666'));
    ctx.fillRect(e.x-barW/2, barY, barW*hpRatio, barH);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(e.x-barW/2, barY, barW, barH);
    
    if (e.shield) {
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r+8, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    if (e.boss) {
      ctx.fillStyle = '#ffdd00';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', e.x, e.y-65);
    }
  });
  
  // Projectiles
  gameState.projectiles.forEach(p => {
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, 7, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.tx, p.ty);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  });
  
  FX.drawFX(ctx);
  FX.vignette(ctx);
  
  // Tower build menu
  if (showTowerMenu && towerMenuPos) {
    const menuR = 100;
    const cx = towerMenuPos.x;
    const cy = towerMenuPos.y;
    
    // Semi-transparent backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);
    
    TOWER_DEFS.forEach((def, i) => {
      const angle = (i / TOWER_DEFS.length) * Math.PI * 2 - Math.PI/2;
      const bx = cx + Math.cos(angle) * menuR;
      const by = cy + Math.sin(angle) * menuR;
      
      // Button circle
      ctx.fillStyle = gameState.gold >= def.cost ? def.color : 'rgba(100,100,100,0.8)';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by, 30, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      
      // Icon
      const img = FX.img(def.id+'-chibi');
      FX.drawSprite(ctx, img, bx, by, 40);
      
      // Cost label
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      const labelW = 40;
      const labelH = 16;
      ctx.fillRect(bx-labelW/2, by+30, labelW, labelH);
      
      ctx.fillStyle = gameState.gold >= def.cost ? '#ffff99' : '#ff8888';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.cost, bx, by+38);
    });
  }
  
  // Upgrade/Sell menu
  if (showUpgradeSellMenu && upgradeSellMenuPos && selectedTower) {
    const menuR = 90;
    const cx = upgradeSellMenuPos.x;
    const cy = upgradeSellMenuPos.y;
    
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);
    
    const def = getTowerDef(selectedTower.id);
    
    // Upgrade button
    if (selectedTower.level < 3) {
      const angle = -Math.PI/2 - Math.PI/4;
      const bx = cx + Math.cos(angle) * menuR;
      const by = cy + Math.sin(angle) * menuR;
      
      const upgCost = getUpgradeCost(selectedTower.level);
      ctx.fillStyle = gameState.gold >= upgCost ? '#88ff88' : 'rgba(100,100,100,0.8)';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by, 30, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⬆', bx, by);
      
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(bx-20, by+25, 40, 16);
      ctx.fillStyle = gameState.gold >= upgCost ? '#ffff99' : '#ff8888';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(upgCost, bx, by+33);
    }
    
    // Sell button
    const sellAngle = -Math.PI/2 + Math.PI/4;
    const sbx = cx + Math.cos(sellAngle) * menuR;
    const sby = cy + Math.sin(sellAngle) * menuR;
    
    ctx.fillStyle = '#ffcc99';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sbx, sby, 30, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰', sbx, sby);
    
    const refund = Math.floor(selectedTower.spent * 0.65);
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(sbx-20, sby+25, 40, 16);
    ctx.fillStyle = '#ffff99';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(refund, sbx, sby+33);
  }
  
  // Props at bottom
  const propImg = FX.img('prop-flowers');
  for (let i=0; i<2; i++) {
    const px = 50 + i * (W-100);
    const py = H - 100;
    ctx.globalAlpha = 0.4;
    FX.drawSprite(ctx, propImg, px, py, 80);
    ctx.globalAlpha = 1;
  }
}

// === HUD ===
function updateHUD() {
  const chips = [
    '<span class="chip" style="cursor:pointer" onclick="window.__game.toggleSpeed()">×' + gameSpeed + '</span>',
    '<span class="chip" style="cursor:pointer" onclick="window.__game.startWave()">▶ 波 ' + gameState.wave + '/' + WAVES.length + '</span>',
    '<span class="chip">💰 ' + gameState.gold + '</span>',
    '<span class="chip">❤️ ' + gameState.lives + '</span>',
    '<span class="chip">击 ' + gameState.kills + '</span>'
  ];
  
  const content = `
    <a class="fx-icon" href="../tools.html">‹</a>
    ${chips.join('')}
    <span class="grow"></span>
  `;
  
  FX.hud(content);
}

// === INPUT ===
const bottomBtns = [];

// Build tower buttons (4 towers)
TOWER_DEFS.forEach((def, i) => {
  const btn = FX.button({
    icon: def.id+'-chibi',
    color: def.color,
    size: 52,
    bottom: 16,
    right: 80 + (TOWER_DEFS.length-1-i)*62,
    onPress: () => {
      selectedTowerType = def.id;
      selectedTower = null;
      showTowerMenu = false;
      showUpgradeSellMenu = false;
    }
  });
  bottomBtns.push(btn);
});

// Skill buttons (3 skills in HUD top row, right side)
SKILLS.forEach((skill, i) => {
  FX.button({
    icon: skill.icon,
    color: skill.color,
    size: 48,
    bottom: 96 + i*58,
    right: 12,
    cd: skill.cd,
    onPress: () => useSkill(skill.id)
  });
});

cv.addEventListener('pointerdown', e => {
  const rect = cv.getBoundingClientRect();
  const x = (e.clientX - rect.left) * W / rect.width;
  const y = (e.clientY - rect.top) * H / rect.height;
  
  if (showTowerMenu && towerMenuPos) {
    const menuR = 100;
    const cx = towerMenuPos.x;
    const cy = towerMenuPos.y;
    
    let clickedTower = null;
    TOWER_DEFS.forEach((def, i) => {
      const angle = (i / TOWER_DEFS.length) * Math.PI * 2 - Math.PI/2;
      const bx = cx + Math.cos(angle) * menuR;
      const by = cy + Math.sin(angle) * menuR;
      
      if (distance(x, y, bx, by) < 30) {
        clickedTower = def;
      }
    });
    
    if (clickedTower) {
      placeTower(towerMenuPos.c, towerMenuPos.r, clickedTower.id);
      return;
    } else {
      showTowerMenu = false;
      towerMenuPos = null;
      return;
    }
  }
  
  if (showUpgradeSellMenu && upgradeSellMenuPos && selectedTower) {
    const menuR = 90;
    const cx = upgradeSellMenuPos.x;
    const cy = upgradeSellMenuPos.y;
    
    // Check upgrade
    if (selectedTower.level < 3) {
      const angle = -Math.PI/2 - Math.PI/4;
      const bx = cx + Math.cos(angle) * menuR;
      const by = cy + Math.sin(angle) * menuR;
      
      if (distance(x, y, bx, by) < 30) {
        upgradeTower();
        return;
      }
    }
    
    // Check sell
    const sellAngle = -Math.PI/2 + Math.PI/4;
    const sbx = cx + Math.cos(sellAngle) * menuR;
    const sby = cy + Math.sin(sellAngle) * menuR;
    
    if (distance(x, y, sbx, sby) < 30) {
      sellTower();
      return;
    }
    
    showUpgradeSellMenu = false;
    upgradeSellMenuPos = null;
    return;
  }
  
  if (y < 100 || y > H-200) return;
  
  const cell = screenToCell(x, y);
  if (cell.c >= 0 && cell.c < gameState.map.cols && cell.r >= 0 && cell.r < gameState.map.rows) {
    const map = gameState.map;
    
    if (gameState.roadSet.has(cell.c+','+cell.r)) {
      return;
    }
    
    const existing = gameState.towers.find(t => t.c===cell.c && t.r===cell.r);
    if (existing) {
      selectedTower = existing;
      const screen = cellToScreen(cell.c, cell.r);
      showUpgradeSellMenu = true;
      upgradeSellMenuPos = {x: screen.x, y: screen.y, c: cell.c, r: cell.r};
      showTowerMenu = false;
      towerMenuPos = null;
    } else {
      const screen = cellToScreen(cell.c, cell.r);
      showTowerMenu = true;
      towerMenuPos = {x: screen.x, y: screen.y, c: cell.c, r: cell.r};
      showUpgradeSellMenu = false;
      upgradeSellMenuPos = null;
      selectedTower = null;
    }
  }
});

cv.addEventListener('pointermove', e => {
  if (!gameState || gameState.mode === 'over') return;
  const rect = cv.getBoundingClientRect();
  const x = (e.clientX - rect.left) * W / rect.width;
  const y = (e.clientY - rect.top) * H / rect.height;
  if (y >= 100 && y <= H-200) {
    const cell = screenToCell(x, y);
    if (cell.c >= 0 && cell.c < gameState.map.cols && cell.r >= 0 && cell.r < gameState.map.rows) {
      hoverCell = cell;
    } else {
      hoverCell = null;
    }
  } else {
    hoverCell = null;
  }
});

cv.addEventListener('pointerleave', () => hoverCell = null);

// === MAIN LOOP ===
function update(dt) {
  if (gameState && gameState.mode === 'play') {
    updateGame(dt);
  }
  gameTime += dt;
}

function draw(ctx_unused) {
  if (gameState) {
    drawGame(ctx);
  }
}

const assets = [
  'bg-garden','bg-forest','bg-sakura','bg-snow','bg-neon','bg-rail',
  'lan-chibi','mo-chibi','li-chibi','xing-chibi','hu-chibi',
  'enemy-slime','enemy-bat','enemy-alien','enemy-boss',
  'item-star','item-ice','item-chest','item-weapon','item-shield',
  'prop-flowers','whale-idle'
];

FX.load(assets).then(() => {
  window.Lobby.init({
    id: 'garden-guardians',
    title: '花园守护计划',
    orientation: 'portrait',
    bg: ['bg-garden', 'prop-flowers'],
    modes: [{id:'story',name:'故事',icon:'item-star'},{id:'endless',name:'无尽',icon:'item-shield'}],
    stages: [
      {id:'garden', name:'花园', bg:'bg-garden'},
      {id:'forest', name:'林间', bg:'bg-forest'},
      {id:'sakura', name:'樱花', bg:'bg-sakura'},
      {id:'snow', name:'冰原', bg:'bg-snow'},
      {id:'neon', name:'霓虹', bg:'bg-neon'},
      {id:'rail', name:'星轨', bg:'bg-rail'}
    ],
    chars: [
      {id:'lan', name:'蓝蓝', img:'whale-idle', chibi:'lan-chibi', stats:{atk:100,def:80,hp:100,spd:90}},
      {id:'mo', name:'小模', img:'mo-chibi', chibi:'mo-chibi', stats:{atk:90,def:85,hp:95,spd:100}},
      {id:'li', name:'栗栗', img:'li-chibi', chibi:'li-chibi', stats:{atk:110,def:70,hp:90,spd:85}},
      {id:'xing', name:'星眠', img:'xing-chibi', chibi:'xing-chibi', stats:{atk:120,def:60,hp:85,spd:95}},
      {id:'hu', name:'橙铃', img:'hu-chibi', chibi:'hu-chibi', stats:{atk:95,def:90,hp:100,spd:80}}
    ],
    skins: [
      {id:'base', char:'lan', name:'原始', rarity:'N'},
      {id:'rose', char:'lan', name:'玫瑰', filter:'hue-rotate(350deg) saturate(1.2)', rarity:'R'},
      {id:'frost', char:'mo', name:'寒霜', filter:'hue-rotate(200deg) saturate(1.3)', rarity:'SR'},
      {id:'starlight', char:'xing', name:'星光', filter:'hue-rotate(280deg) saturate(1.4)', rarity:'SSR', vip:true}
    ],
    currency: [{id:'coin',icon:'item-chest'},{id:'gem',icon:'item-star'}],
    onStart: sel => {
      initGame(sel);
      FX.running = true;
      FX.loop(update, draw);
    },
    onQuit: () => { FX.running = false; },
    onSkinChange: sel => { if (currentSel) currentSel.skin = sel.skin; }
  });
});

window.__game = {
  state: () => ({
    mode: gameState?.mode || 'init',
    wave: gameState?.wave || 0,
    gold: gameState?.gold || 0,
    lives: gameState?.lives || 20,
    kills: gameState?.kills || 0,
    towers: gameState?.towers.length || 0,
    enemies: gameState?.enemies.length || 0
  }),
  toggleSpeed: () => toggleSpeed(),
  startWave: () => startWave()
};

})();
