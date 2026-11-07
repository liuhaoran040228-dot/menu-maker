// 萌娘星糖远征 (Monster Loot Expedition)
(function() {
  'use strict';

  const {cv, ctx, W, H} = FX.init({landscape: true, logicalH: 540});
  
  // Game state
  const game = {
    hero: null,
    enemies: [],
    loot: [],
    room: 1,
    roomCleared: false,
    gold: 0,
    xp: 0,
    level: 1,
    stats: {atk: 10, def: 5, hp: 100, maxHp: 100},
    inventory: [],
    scrollX: 0,
    targetScrollX: 0,
    cameraX: 0,
    transitioning: false,
    transitionPhase: 0,
    showBag: false,
    selectedChar: 'lan',
    comboCount: 0,
    comboTimer: 0
  };

  const RARITIES = [
    {name: '普通', color: '#ffffff', tier: 0},
    {name: '精良', color: '#4ade80', tier: 1},
    {name: '稀有', color: '#3b82f6', tier: 2},
    {name: '史诗', color: '#a855f7', tier: 3},
    {name: '传说', color: '#f97316', tier: 4}
  ];

  const CHARS = [
    {id: 'lan', name: '蓝蓝', img: 'whale'},
    {id: 'mo', name: '墨墨', img: 'mo-chibi'},
    {id: 'li', name: '丽丽', img: 'li-chibi'},
    {id: 'xing', name: '星星', img: 'xing-chibi'},
    {id: 'hu', name: '虎虎', img: 'hu-chibi'}
  ];

  const AREAS = [
    {bg: 'bg-garden', prop: 'prop-flowers', moteColor: '#fbbf24'},
    {bg: 'bg-forest', prop: 'prop-pine', moteColor: '#86efac'},
    {bg: 'bg-undersea', prop: 'prop-coral', moteColor: '#60a5fa'},
    {bg: 'bg-snow', prop: '', moteColor: '#e0e7ff'},
    {bg: 'bg-moon', prop: 'prop-crystal', moteColor: '#c084fc'}
  ];

  const store = FX.store('monster-loot', {
    bestRoom: 1,
    stats: {atk: 10, def: 5, hp: 100, maxHp: 100},
    inventory: []
  });

  // Hero class
  class Hero {
    constructor(charId) {
      this.char = CHARS.find(c => c.id === charId);
      this.x = 300;
      this.y = 400;
      this.vx = 0;
      this.vy = 0;
      this.z = 0;
      this.vz = 0;
      this.anim = 'idle';
      this.frame = 0;
      this.flip = false;
      this.sx = 1;
      this.sy = 1;
      this.targetSx = 1;
      this.targetSy = 1;
      this.attacking = false;
      this.attackTimer = 0;
      this.hitFlash = 0;
      this.invulnerable = 0;
      this.afterimages = [];
    }

    update(dt) {
      if (this.invulnerable > 0) this.invulnerable -= dt;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      if (this.attackTimer > 0) this.attackTimer -= dt;
      if (game.comboTimer > 0) {
        game.comboTimer -= dt;
        if (game.comboTimer <= 0) game.comboCount = 0;
      }

      const joy = FX.joystick({side: 'left'});
      const speed = 220;

      if (!this.attacking && joy.mag > 0.12) {
        this.vx = joy.x * speed;
        this.vy = joy.y * speed * 0.6;
        this.anim = 'run';
        this.flip = joy.x < 0;
      } else if (!this.attacking) {
        this.vx *= 0.85;
        this.vy *= 0.85;
        if (Math.abs(this.vx) < 5 && Math.abs(this.vy) < 5) {
          this.vx = 0;
          this.vy = 0;
          this.anim = 'idle';
        }
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.z += this.vz * dt;
      this.vz -= 800 * dt;
      if (this.z < 0) {
        this.z = 0;
        this.vz = 0;
      }

      const roomLeft = game.cameraX;
      const roomRight = game.cameraX + 960;
      this.x = Math.max(roomLeft + 50, Math.min(roomRight - 50, this.x));
      this.y = Math.max(320, Math.min(480, this.y));

      this.sx = FX.lerp(this.sx, this.targetSx, dt * 10);
      this.sy = FX.lerp(this.sy, this.targetSy, dt * 10);

      this.frame += dt * 8;

      if (this.attacking && this.attackTimer <= 0) {
        this.attacking = false;
        this.targetSx = 1;
        this.targetSy = 1;
      }

      if (Math.abs(this.vx) > 100 || Math.abs(this.vy) > 100) {
        this.afterimages.push({
          x: this.x, y: this.y, z: this.z, flip: this.flip,
          anim: this.anim, frame: this.frame, alpha: 0.3, life: 0.2
        });
      }

      this.afterimages = this.afterimages.filter(img => {
        img.life -= dt;
        img.alpha = img.life / 0.2 * 0.3;
        return img.life > 0;
      });
    }

    attack() {
      if (this.attacking) return;
      
      this.attacking = true;
      this.attackTimer = 0.35;
      this.anim = 'attack';
      this.frame = 0;
      game.comboCount = (game.comboCount + 1) % 3;
      game.comboTimer = 0.8;

      const lunge = game.comboCount === 2 ? 80 : 40;
      this.vx = (this.flip ? -1 : 1) * lunge / 0.35;
      this.vy = 0;

      this.targetSx = 1.3;
      this.targetSy = 0.8;

      const range = 100;
      const slashX = this.x + (this.flip ? -range/2 : range/2);
      const slashY = this.y;

      for (let i = 0; i < 3; i++) {
        const angle = (this.flip ? Math.PI : 0) + FX.rand(-0.4, 0.4);
        const sx = slashX + Math.cos(angle) * 20;
        const sy = slashY + Math.sin(angle) * 20 - 30;
        FX.trail(sx, sy, '#60a5fa', 3);
      }

      const crit = Math.random() < 0.15;
      const damage = Math.floor(game.stats.atk * (1 + game.comboCount * 0.2) * (crit ? 2 : 1));

      game.enemies.forEach(e => {
        if (e.dead) return;
        const dx = e.x - slashX;
        const dy = e.y - slashY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < range + e.radius) {
          e.hit(damage, crit);
          e.vx = (this.flip ? -1 : 1) * 150;
          e.vy = -50;
        }
      });
    }

    skill1() {
      // Star nova
      this.anim = 'cast';
      this.frame = 0;
      this.vx = 0;
      this.vy = 0;

      FX.shake(0.3);
      FX.ring(this.x, this.y, {color: '#fbbf24', r: 180, life: 0.5});
      FX.burst(this.x, this.y, {n: 30, color: '#fbbf24', speed: 250, life: 0.8, size: 4, glow: true});

      const damage = Math.floor(game.stats.atk * 1.8);
      game.enemies.forEach(e => {
        if (e.dead) return;
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 180) {
          e.hit(damage, false);
          const angle = Math.atan2(dy, dx);
          e.vx = Math.cos(angle) * 200;
          e.vy = Math.sin(angle) * 200;
        }
      });
    }

    skill2() {
      // Frost dash
      this.anim = 'jump';
      this.frame = 0;
      this.invulnerable = 0.4;
      
      const dashDist = 200;
      const dir = this.flip ? -1 : 1;
      this.vx = dir * dashDist / 0.4;
      this.vy = 0;

      const damage = Math.floor(game.stats.atk * 1.5);
      
      const dashCheck = () => {
        for (let i = 0; i < 5; i++) {
          FX.trail(this.x + FX.rand(-20, 20), this.y + FX.rand(-30, 0), '#60a5fa', 2);
        }

        game.enemies.forEach(e => {
          if (e.dead || e.hitByDash) return;
          const dx = e.x - this.x;
          const dy = e.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 60 + e.radius) {
            e.hit(damage, false);
            e.vx = dir * 180;
            e.hitByDash = true;
            FX.burst(e.x, e.y, {n: 10, color: '#60a5fa', speed: 120, life: 0.6, size: 3});
          }
        });
      };

      const checkInterval = setInterval(() => {
        if (!this.invulnerable || this.invulnerable <= 0) {
          clearInterval(checkInterval);
          game.enemies.forEach(e => e.hitByDash = false);
        } else {
          dashCheck();
        }
      }, 50);
    }

    skill3() {
      // Heal
      this.anim = 'cast';
      this.frame = 0;
      
      const heal = Math.floor(game.stats.maxHp * 0.3);
      game.stats.hp = Math.min(game.stats.maxHp, game.stats.hp + heal);
      FX.bar('hp', game.stats.hp / game.stats.maxHp);

      FX.ring(this.x, this.y, {color: '#4ade80', r: 100, life: 0.6});
      FX.burst(this.x, this.y, {n: 20, color: '#4ade80', speed: 80, life: 1, size: 3, glow: true});
      FX.text(this.x, this.y - 50, `+${heal}`, {color: '#4ade80', size: 24});
    }

    takeDamage(amount) {
      if (this.invulnerable > 0) return;
      
      const reduced = Math.max(1, amount - game.stats.def);
      game.stats.hp -= reduced;
      FX.bar('hp', Math.max(0, game.stats.hp / game.stats.maxHp));
      
      this.hitFlash = 0.08;
      this.invulnerable = 0.5;
      FX.shake(0.2);
      FX.text(this.x, this.y - 40, `-${reduced}`, {color: '#ef4444', size: 20});
      FX.burst(this.x, this.y - 30, {n: 8, color: '#ef4444', speed: 100, life: 0.5, size: 2});

      if (game.stats.hp <= 0) {
        gameOver();
      }
    }

    draw(ctx) {
      const shadow = 0.3 + Math.sin(FX.time * 3) * 0.05;
      ctx.globalAlpha = shadow;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 25 * this.sx, 12 * this.sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      this.afterimages.forEach(img => {
        const imgName = this.char.img === 'whale' ? `whale-${img.anim}` : this.char.img;
        const h = 100;
        ctx.globalAlpha = img.alpha;
        FX.drawSprite(ctx, FX.img(imgName), img.x, img.y - img.z, h, {
          flip: img.flip, sx: this.sx, sy: this.sy
        });
      });
      ctx.globalAlpha = 1;

      const imgName = this.char.img === 'whale' ? `whale-${this.anim}` : this.char.img;
      const h = 100;

      if (this.hitFlash > 0) {
        ctx.save();
        ctx.filter = 'brightness(3)';
      }

      if (this.invulnerable > 0 && Math.floor(FX.time * 20) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }

      FX.drawSprite(ctx, FX.img(imgName), this.x, this.y - this.z, h, {
        flip: this.flip, sx: this.sx, sy: this.sy
      });

      if (this.hitFlash > 0) {
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Enemy class
  class Enemy {
    constructor(type, x, y, variant = 0) {
      this.type = type;
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.variant = variant;
      this.dead = false;
      this.hitFlash = 0;
      this.frame = 0;
      this.flip = false;

      const configs = {
        slime: {hp: 30, atk: 8, radius: 30, speed: 80, jumpInterval: 2},
        bat: {hp: 20, atk: 6, radius: 25, speed: 150, swoopInterval: 3},
        alien: {hp: 40, atk: 10, radius: 28, speed: 60, shootInterval: 2.5},
        boss: {hp: 300, atk: 15, radius: 50, speed: 40, slamInterval: 4}
      };

      const cfg = configs[type];
      this.maxHp = cfg.hp * (1 + variant * 0.8);
      this.hp = this.maxHp;
      this.atk = cfg.atk * (1 + variant * 0.5);
      this.radius = cfg.radius * (1 + variant * 0.2);
      this.speed = cfg.speed;
      this.actionTimer = FX.rand(0.5, 1.5);
      this.actionInterval = cfg[Object.keys(cfg).find(k => k.includes('Interval'))];

      this.sx = 1;
      this.sy = 1;
      this.targetSx = 1;
      this.targetSy = 1;
    }

    update(dt) {
      if (this.dead) return;

      if (this.hitFlash > 0) this.hitFlash -= dt;
      this.actionTimer -= dt;

      this.vx *= 0.9;
      this.vy *= 0.9;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.y = Math.max(320, Math.min(480, this.y));

      this.sx = FX.lerp(this.sx, this.targetSx, dt * 8);
      this.sy = FX.lerp(this.sy, this.targetSy, dt * 8);
      this.frame += dt * 6;

      const hero = game.hero;
      const dx = hero.x - this.x;
      const dy = hero.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      this.flip = dx < 0;

      if (this.actionTimer <= 0) {
        this.actionTimer = this.actionInterval + FX.rand(-0.5, 0.5);

        if (this.type === 'slime') {
          this.targetSy = 0.6;
          setTimeout(() => {
            this.vy = (dy / dist) * 150;
            this.vx = (dx / dist) * 100;
            this.targetSy = 1.3;
            setTimeout(() => this.targetSy = 1, 200);
          }, 300);
        } else if (this.type === 'bat') {
          const angle = Math.atan2(dy, dx);
          this.vx = Math.cos(angle) * this.speed * 2;
          this.vy = Math.sin(angle) * this.speed * 2;
        } else if (this.type === 'alien') {
          const bullet = {
            x: this.x, y: this.y,
            vx: (dx / dist) * 200,
            vy: (dy / dist) * 200,
            life: 3,
            damage: this.atk
          };
          game.bullets = game.bullets || [];
          game.bullets.push(bullet);
          FX.trail(this.x, this.y, '#f97316', 3);
        } else if (this.type === 'boss') {
          if (Math.random() < 0.5) {
            // Slam telegraph
            const slamX = hero.x;
            const slamY = hero.y;
            FX.ring(slamX, slamY, {color: '#ef4444', r: 80, life: 1.2});
            setTimeout(() => {
              const hitDist = Math.sqrt((hero.x - slamX)**2 + (hero.y - slamY)**2);
              if (hitDist < 80) {
                hero.takeDamage(this.atk * 2);
              }
              FX.shake(0.5);
              FX.burst(slamX, slamY, {n: 20, color: '#ef4444', speed: 200, life: 0.8, size: 4});
            }, 1200);
          } else {
            // Summon
            const summonX = this.x + FX.rand(-100, 100);
            const summonY = this.y + FX.rand(-50, 50);
            game.enemies.push(new Enemy('slime', summonX, summonY, 0));
            FX.ring(summonX, summonY, {color: '#a855f7', r: 50, life: 0.5});
          }
        }
      }

      if (dist < this.radius + 30 && this.type !== 'alien') {
        hero.takeDamage(this.atk);
      }
    }

    hit(damage, crit) {
      this.hp -= damage;
      this.hitFlash = 0.08;
      this.targetSx = 1.2;
      this.targetSy = 0.8;
      setTimeout(() => {
        this.targetSx = 1;
        this.targetSy = 1;
      }, 100);

      FX.text(this.x, this.y - 50, `-${damage}`, {color: crit ? '#fbbf24' : '#ffffff', size: crit ? 28 : 20, crit});
      FX.burst(this.x, this.y - 30, {n: crit ? 12 : 6, color: crit ? '#fbbf24' : '#ef4444', speed: 100, life: 0.5, size: 2});

      if (crit) {
        FX.hitstop(0.08);
        FX.shake(0.15);
      }

      if (this.hp <= 0) {
        this.die();
      }
    }

    die() {
      this.dead = true;
      FX.burst(this.x, this.y, {n: 20, color: this.variant > 0 ? '#a855f7' : '#94a3b8', speed: 150, life: 1, size: 3});
      
      const xpGain = this.type === 'boss' ? 100 : (15 + this.variant * 10);
      game.xp += xpGain;
      updateXPBar();

      const goldCount = Math.floor(FX.rand(3, 8) * (1 + this.variant * 0.5));
      for (let i = 0; i < goldCount; i++) {
        const angle = FX.rand(0, Math.PI * 2);
        const speed = FX.rand(100, 200);
        setTimeout(() => {
          FX.burst(this.x, this.y, {n: 1, color: '#fbbf24', speed: 80, life: 0.8, size: 4, glow: true});
          game.gold += 1;
          updateHUD();
        }, i * 50);
      }

      if (Math.random() < 0.25 + this.variant * 0.1) {
        const lootTypes = ['item-weapon', 'item-armor', 'item-accessory'];
        const lootType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
        const rarityRoll = Math.random();
        let rarity = 0;
        if (rarityRoll < 0.5) rarity = 0;
        else if (rarityRoll < 0.75) rarity = 1;
        else if (rarityRoll < 0.9) rarity = 2;
        else if (rarityRoll < 0.97) rarity = 3;
        else rarity = 4;

        rarity = Math.min(4, rarity + this.variant);

        const loot = {
          x: this.x,
          y: this.y,
          z: 0,
          vz: 250,
          type: lootType,
          rarity: rarity,
          collected: false,
          bobTime: 0
        };
        game.loot.push(loot);
        FX.ring(this.x, this.y, {color: RARITIES[rarity].color, r: 40, life: 0.6});
      }

      game.enemies = game.enemies.filter(e => e !== this);
      checkRoomCleared();
    }

    draw(ctx) {
      if (this.dead) return;

      const shadow = 0.3;
      ctx.globalAlpha = shadow;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius * 0.8 * this.sx, this.radius * 0.4 * this.sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const imgName = `enemy-${this.type}`;
      const h = this.radius * 2;

      ctx.save();
      if (this.variant > 0) {
        const hue = this.variant === 1 ? 60 : 240;
        ctx.filter = `hue-rotate(${hue}deg) brightness(1.2)`;
      }
      if (this.hitFlash > 0) {
        ctx.filter = (ctx.filter || '') + ' brightness(3)';
      }

      FX.drawSprite(ctx, FX.img(imgName), this.x, this.y, h, {
        flip: this.flip, sx: this.sx * (1 + this.variant * 0.15), sy: this.sy * (1 + this.variant * 0.15)
      });

      ctx.restore();

      if (this.variant > 0) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(FX.time * 4) * 0.2;
        ctx.strokeStyle = this.variant === 1 ? '#a855f7' : '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y - h/2, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // HP bar
      if (this.hp < this.maxHp) {
        const barW = 40;
        const barH = 4;
        const barX = this.x - barW/2;
        const barY = this.y - h - 10;
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
      }
    }
  }

  // Spawn wave
  function spawnWave() {
    const isBoss = game.room % 5 === 0;
    const roomX = game.cameraX + 480;

    if (isBoss) {
      const boss = new Enemy('boss', roomX, 400, 0);
      game.enemies.push(boss);
      FX.banner('BOSS出现！');
      return;
    }

    const count = Math.min(3 + Math.floor(game.room / 3), 8);
    const variant = game.room > 5 ? (Math.random() < 0.3 + game.room * 0.02 ? 1 : 0) : 0;

    for (let i = 0; i < count; i++) {
      const types = ['slime', 'bat', 'alien'];
      const weights = [0.5, 0.3, 0.2];
      let roll = Math.random();
      let type = 'slime';
      for (let j = 0; j < types.length; j++) {
        if (roll < weights[j]) {
          type = types[j];
          break;
        }
        roll -= weights[j];
      }

      const x = roomX + FX.rand(100, 860);
      const y = FX.rand(340, 460);
      const enemyVariant = Math.random() < 0.2 ? variant : 0;
      game.enemies.push(new Enemy(type, x, y, enemyVariant));
    }
  }

  function checkRoomCleared() {
    if (game.enemies.length === 0 && !game.roomCleared) {
      game.roomCleared = true;
      FX.banner('区域清理完成！');
      setTimeout(() => {
        nextRoom();
      }, 1500);
    }
  }

  function nextRoom() {
    game.transitioning = true;
    game.transitionPhase = 0;
    game.targetScrollX = game.cameraX + 960;

    const duration = 1.5;
    const start = FX.time;
    const startX = game.cameraX;

    const transition = () => {
      const elapsed = FX.time - start;
      const t = Math.min(1, elapsed / duration);
      const eased = FX.ease.inOut(t);
      game.cameraX = startX + (game.targetScrollX - startX) * eased;

      if (t >= 1) {
        game.room++;
        game.roomCleared = false;
        game.transitioning = false;
        updateHUD();
        spawnWave();
      } else {
        requestAnimationFrame(transition);
      }
    };
    transition();
  }

  function updateXPBar() {
    const xpForLevel = 50 + game.level * 25;
    if (game.xp >= xpForLevel) {
      game.xp -= xpForLevel;
      game.level++;
      
      game.stats.maxHp += 20;
      game.stats.hp = game.stats.maxHp;
      game.stats.atk += 3;
      game.stats.def += 2;

      FX.banner(`等级提升！Lv.${game.level}`);
      FX.ring(game.hero.x, game.hero.y, {color: '#fbbf24', r: 150, life: 1});
      FX.burst(game.hero.x, game.hero.y, {n: 30, color: '#fbbf24', speed: 200, life: 1.2, size: 5, glow: true});
      FX.bar('hp', 1);
      updateXPBar();
    }
    const ratio = game.xp / (50 + game.level * 25);
    FX.bar('xp', ratio);
  }

  function updateHUD() {
    const goldText = `<span class="chip">💰 ${game.gold}</span>`;
    const roomText = `<span class="chip">区域 ${game.room}</span>`;
    FX.hud(goldText + '<span class="grow"></span>' + roomText);
  }

  function collectLoot(loot) {
    loot.collected = true;
    
    const item = {
      type: loot.type,
      rarity: loot.rarity,
      atk: loot.type === 'item-weapon' ? Math.floor((5 + loot.rarity * 8) * (0.8 + Math.random() * 0.4)) : 0,
      def: loot.type === 'item-armor' ? Math.floor((3 + loot.rarity * 5) * (0.8 + Math.random() * 0.4)) : 0,
      hp: loot.type === 'item-accessory' ? Math.floor((10 + loot.rarity * 20) * (0.8 + Math.random() * 0.4)) : 0
    };

    game.inventory.push(item);
    equipBest();

    FX.burst(loot.x, loot.y, {n: 15, color: RARITIES[loot.rarity].color, speed: 120, life: 0.8, size: 3, glow: true});
    FX.text(game.hero.x, game.hero.y - 60, `获得 ${RARITIES[loot.rarity].name}装备`, {color: RARITIES[loot.rarity].color, size: 18});
  }

  function equipBest() {
    const byType = {};
    game.inventory.forEach(item => {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    });

    game.stats.atk = 10;
    game.stats.def = 5;
    let hpBonus = 0;

    Object.values(byType).forEach(items => {
      items.sort((a, b) => b.rarity - a.rarity);
      const best = items[0];
      game.stats.atk += best.atk;
      game.stats.def += best.def;
      hpBonus += best.hp;
    });

    const oldMax = game.stats.maxHp;
    game.stats.maxHp = 100 + (game.level - 1) * 20 + hpBonus;
    game.stats.hp += (game.stats.maxHp - oldMax);
    FX.bar('hp', game.stats.hp / game.stats.maxHp);

    store.stats = {...game.stats};
    store.inventory = [...game.inventory];
    store.save();
  }

  function showBag() {
    game.showBag = true;
    FX.paused = true;

    let html = '<div style="background:#1e293b;color:#fff;padding:20px;border-radius:12px;max-width:600px;margin:auto;">';
    html += '<h2 style="margin:0 0 20px 0;font-size:24px;text-align:center;">背包</h2>';

    const byType = {};
    game.inventory.forEach(item => {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    });

    Object.keys(byType).forEach(type => {
      const typeName = type === 'item-weapon' ? '武器' : (type === 'item-armor' ? '护甲' : '饰品');
      html += `<h3 style="margin:15px 0 10px 0;font-size:18px;color:#94a3b8;">${typeName}</h3>`;
      
      const grouped = {};
      byType[type].forEach(item => {
        const key = item.rarity;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });

      Object.keys(grouped).sort((a, b) => b - a).forEach(rarity => {
        const items = grouped[rarity];
        const r = RARITIES[rarity];
        html += `<div style="display:flex;align-items:center;margin:8px 0;padding:10px;background:#334155;border-radius:8px;border-left:3px solid ${r.color};">`;
        html += `<span style="color:${r.color};font-weight:bold;margin-right:10px;">${r.name}</span>`;
        html += `<span style="color:#cbd5e1;">×${items.length}</span>`;
        
        if (items.length >= 3 && rarity < 4) {
          html += `<button onclick="window.__mergeItems('${type}',${rarity})" style="margin-left:auto;padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;">合成 ▲</button>`;
        }
        html += '</div>';
      });
    });

    html += '<button onclick="window.__closeBag()" style="width:100%;margin-top:20px;padding:12px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;">关闭</button>';
    html += '</div>';

    const overlay = document.createElement('div');
    overlay.id = 'bag-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
  }

  window.__closeBag = function() {
    const overlay = document.getElementById('bag-overlay');
    if (overlay) overlay.remove();
    game.showBag = false;
    FX.paused = false;
  };

  window.__mergeItems = function(type, rarity) {
    const items = game.inventory.filter(i => i.type === type && i.rarity === rarity);
    if (items.length < 3) return;

    for (let i = 0; i < 3; i++) {
      const idx = game.inventory.indexOf(items[i]);
      game.inventory.splice(idx, 1);
    }

    const newItem = {
      type: type,
      rarity: rarity + 1,
      atk: type === 'item-weapon' ? Math.floor((5 + (rarity + 1) * 8) * (0.8 + Math.random() * 0.4)) : 0,
      def: type === 'item-armor' ? Math.floor((3 + (rarity + 1) * 5) * (0.8 + Math.random() * 0.4)) : 0,
      hp: type === 'item-accessory' ? Math.floor((10 + (rarity + 1) * 20) * (0.8 + Math.random() * 0.4)) : 0
    };

    game.inventory.push(newItem);
    equipBest();

    window.__closeBag();
    setTimeout(() => showBag(), 100);
  };

  function gameOver() {
    FX.running = false;
    
    if (game.room > store.bestRoom) {
      store.bestRoom = game.room;
      store.save();
    }

    setTimeout(() => {
      FX.overlay({
        title: '远征结束',
        text: `到达区域: ${game.room}\n最佳记录: ${store.bestRoom}\n收集金币: ${game.gold}`,
        hero: 'whale-idle',
        button: '▶ 重新开始',
        onStart: () => {
          FX.hideOverlay();
          startGame(game.selectedChar);
        }
      });
    }, 500);
  }

  function startGame(charId) {
    game.selectedChar = charId;
    game.hero = new Hero(charId);
    game.enemies = [];
    game.loot = [];
    game.bullets = [];
    game.room = 1;
    game.roomCleared = false;
    game.gold = 0;
    game.xp = 0;
    game.level = 1;
    game.stats = {...store.stats};
    game.inventory = [...store.inventory];
    game.scrollX = 0;
    game.cameraX = 0;
    game.transitioning = false;
    game.comboCount = 0;
    game.comboTimer = 0;

    FX.hud(`
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="flex:1;">
          <div style="font-size:12px;color:#94a3b8;margin-bottom:2px;">HP</div>
          <div class="fx-bar" id="hp"><i></i></div>
        </div>
        <div style="flex:1;">
          <div style="font-size:12px;color:#94a3b8;margin-bottom:2px;">XP</div>
          <div class="fx-bar" id="xp"><i></i></div>
        </div>
      </div>
    `);

    FX.bar('hp', 1);
    FX.bar('xp', 0);
    updateHUD();

    const attackBtn = FX.button({
      icon: 'item-weapon',
      color: '#ef4444',
      size: 84,
      right: 20,
      bottom: 180,
      key: 'KeyJ',
      cd: 0,
      hold: true,
      onPress: () => {
        if (attackBtn.down) game.hero.attack();
      }
    });

    const skill1Btn = FX.button({
      icon: 'item-star',
      color: '#fbbf24',
      size: 74,
      right: 120,
      bottom: 180,
      key: 'KeyK',
      cd: 6,
      onPress: () => {
        game.hero.skill1();
      }
    });

    const skill2Btn = FX.button({
      icon: 'item-ice',
      color: '#60a5fa',
      size: 74,
      right: 20,
      bottom: 90,
      key: 'KeyL',
      cd: 5,
      onPress: () => {
        game.hero.skill2();
      }
    });

    const skill3Btn = FX.button({
      icon: 'item-heart',
      color: '#4ade80',
      size: 74,
      right: 120,
      bottom: 90,
      key: 'KeyI',
      cd: 15,
      onPress: () => {
        game.hero.skill3();
      }
    });

    const bagBtn = FX.button({
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4z"/></svg>',
      color: '#a855f7',
      size: 64,
      right: 220,
      bottom: 135,
      key: 'KeyB',
      cd: 0,
      onPress: () => {
        showBag();
      }
    });

    spawnWave();
    FX.running = true;
  }

  // Main loop
  const area = () => AREAS[(Math.floor(game.room / 5)) % AREAS.length];

  function update(dt) {
    if (!FX.running || FX.paused) return;

    game.hero.update(dt);

    game.enemies.forEach(e => e.update(dt));

    game.bullets = game.bullets || [];
    game.bullets = game.bullets.filter(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      const dx = b.x - game.hero.x;
      const dy = b.y - game.hero.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < 30) {
        game.hero.takeDamage(b.damage);
        return false;
      }

      return b.life > 0;
    });

    game.loot = game.loot.filter(loot => {
      if (loot.collected) return false;

      loot.z += loot.vz * dt;
      loot.vz -= 800 * dt;
      if (loot.z < 0) {
        loot.z = 0;
        loot.vz = 0;
      }

      if (loot.z === 0) {
        loot.bobTime += dt;
        const dx = loot.x - game.hero.x;
        const dy = loot.y - game.hero.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 50) {
          collectLoot(loot);
          return false;
        }
      }

      return true;
    });
  }

  function draw(ctx) {
    ctx.save();
    ctx.translate(-game.cameraX, 0);

    const a = area();
    const layers = [
      {img: a.bg, speed: 0.2, y: 0, h: 540, alpha: 1}
    ];
    if (a.prop) {
      layers.push({img: a.prop, speed: 0.6, y: 360, h: 180, gap: 420, alpha: 0.9});
    }
    FX.parallax(ctx, layers, game.cameraX * 0.3);
    FX.motes(ctx, a.moteColor);

    const entities = [
      ...game.enemies.map(e => ({obj: e, y: e.y, type: 'enemy'})),
      {obj: game.hero, y: game.hero.y, type: 'hero'},
      ...game.loot.map(l => ({obj: l, y: l.y, type: 'loot'}))
    ];
    entities.sort((a, b) => a.y - b.y);

    entities.forEach(e => {
      if (e.type === 'enemy') {
        e.obj.draw(ctx);
      } else if (e.type === 'hero') {
        game.hero.draw(ctx);
      } else if (e.type === 'loot') {
        const loot = e.obj;
        
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(loot.x, loot.y, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const bob = Math.sin(loot.bobTime * 3) * 8;
        const h = 40;
        
        ctx.save();
        ctx.shadowColor = RARITIES[loot.rarity].color;
        ctx.shadowBlur = 15;
        FX.drawSprite(ctx, FX.img(loot.type), loot.x, loot.y - loot.z - bob, h, {glow: true});
        ctx.restore();

        if (loot.z === 0 && Math.floor(FX.time * 8) % 8 === 0) {
          FX.trail(loot.x + FX.rand(-10, 10), loot.y - 20 + FX.rand(-10, 10), RARITIES[loot.rarity].color, 2);
        }
      }
    });

    if (game.bullets) {
      game.bullets.forEach(b => {
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    ctx.restore();

    FX.drawFX(ctx);
    FX.vignette(ctx);
  }

  // Initialize
  const assets = [
    'bg-arena', 'bg-forest', 'bg-garden', 'bg-moon', 'bg-neon', 'bg-rail',
    'bg-sakura', 'bg-sky', 'bg-snow', 'bg-space', 'bg-station', 'bg-undersea',
    'enemy-alien', 'enemy-bat', 'enemy-boss', 'enemy-slime',
    'hu-chibi', 'lan-chibi', 'li-chibi', 'mo-chibi', 'xing-chibi',
    'item-accessory', 'item-armor', 'item-chest', 'item-heart', 'item-ice',
    'item-shield', 'item-star', 'item-weapon',
    'prop-arch', 'prop-coral', 'prop-crystal', 'prop-flowers', 'prop-lantern',
    'prop-pine', 'prop-rail', 'prop-sakura',
    'whale-attack', 'whale-cast', 'whale-idle', 'whale-jump', 'whale-ride', 'whale-run'
  ];

  FX.load(assets).then(() => {
    let selectedChar = 'lan';

    const charButtons = CHARS.map(char => {
      const btn = document.createElement('button');
      btn.className = 'fx-pick';
      if (char.id === selectedChar) btn.classList.add('selected');
      btn.innerHTML = `<img src="../assets/${char.img === 'whale' ? 'whale-idle' : char.img}.webp" style="width:60px;height:60px;object-fit:contain;">`;
      btn.onclick = () => {
        selectedChar = char.id;
        document.querySelectorAll('.fx-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      return btn;
    });

    const charRow = document.createElement('div');
    charRow.className = 'fx-row';
    charRow.style.marginTop = '20px';
    charButtons.forEach(btn => charRow.appendChild(btn));

    FX.overlay({
      title: '萌娘星糖远征',
      text: '选择你的角色，踏上史诗般的冒险旅程！',
      hero: 'whale-idle',
      html: charRow.outerHTML,
      button: '▶ 开始远征',
      onStart: () => {
        FX.hideOverlay();
        startGame(selectedChar);
      }
    });

    FX.loop(update, draw);
  });

  // QA
  window.__game = {
    state: () => ({
      room: game.room,
      level: game.level,
      gold: game.gold,
      hp: game.stats.hp,
      enemies: game.enemies.length,
      inventory: game.inventory.length
    })
  };

})();
