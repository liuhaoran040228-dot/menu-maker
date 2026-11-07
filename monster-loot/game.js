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
    maxRoom: 5,
    roomCleared: false,
    coins: 0,
    gems: 0,
    xp: 0,
    level: 1,
    stats: {atk: 10, def: 5, hp: 100, maxHp: 100, spd: 1},
    cameraX: 0,
    transitioning: false,
    comboCount: 0,
    comboTimer: 0,
    sel: null,
    mode: 'story',
    bullets: []
  };

  const RARITIES = ['N', 'R', 'SR', 'SSR'];
  const RARITY_COLORS = {N: '#ffffff', R: '#4ade80', SR: '#3b82f6', SSR: '#a855f7'};
  const RARITY_NAMES = {N: '普通', R: '精良', SR: '稀有', SSR: '传说'};

  const STAGES = [
    {id: 'garden', name: '花之庭院', bg: 'bg-garden', prop: 'prop-flowers', moteColor: '#fbbf24'},
    {id: 'forest', name: '幽静森林', bg: 'bg-forest', prop: 'prop-pine', moteColor: '#86efac'},
    {id: 'undersea', name: '深海遗迹', bg: 'bg-undersea', prop: 'prop-coral', moteColor: '#60a5fa'},
    {id: 'snow', name: '雪域高原', bg: 'bg-snow', prop: '', moteColor: '#e0e7ff'},
    {id: 'moon', name: '月华秘境', bg: 'bg-moon', prop: 'prop-crystal', moteColor: '#c084fc'},
    {id: 'sakura', name: '樱之神社', bg: 'bg-sakura', prop: 'prop-sakura', moteColor: '#fda4af'},
    {id: 'neon', name: '霓虹都市', bg: 'bg-neon', prop: 'prop-rail', moteColor: '#818cf8'},
    {id: 'space', name: '星际空间', bg: 'bg-space', prop: 'prop-crystal', moteColor: '#a78bfa'}
  ];

  const CHARS = [
    {id: 'lan', name: '蓝蓝', img: 'whale', stats: {atk: 12, def: 8, hp: 120, spd: 1.0}},
    {id: 'mo', name: '墨墨', img: 'mo-chibi', stats: {atk: 15, def: 5, hp: 100, spd: 1.2}},
    {id: 'li', name: '丽丽', img: 'li-chibi', stats: {atk: 10, def: 10, hp: 140, spd: 0.9}},
    {id: 'xing', name: '星星', img: 'xing-chibi', stats: {atk: 18, def: 4, hp: 90, spd: 1.3}},
    {id: 'hu', name: '虎虎', img: 'hu-chibi', stats: {atk: 14, def: 6, hp: 110, spd: 1.1}}
  ];

  // Hero class
  class Hero {
    constructor(sel) {
      this.char = CHARS.find(c => c.id === sel.char);
      this.skinFilter = sel.skin.filter;
      this.x = 300;
      this.y = 420;
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
      const speed = 220 * game.stats.spd;

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
      this.x = Math.max(roomLeft + 80, Math.min(roomRight - 80, this.x));
      this.y = Math.max(350, Math.min(500, this.y));

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

      const lunge = game.comboCount === 2 ? 120 : 60;
      this.vx = (this.flip ? -1 : 1) * lunge / 0.35;
      this.vy = 0;

      this.targetSx = 1.3;
      this.targetSy = 0.8;

      const range = 110;
      const slashX = this.x + (this.flip ? -range/2 : range/2);
      const slashY = this.y - 60;

      for (let i = 0; i < 3; i++) {
        const angle = (this.flip ? Math.PI : 0) + FX.rand(-0.4, 0.4);
        const dist = FX.rand(30, 60);
        const sx = slashX + Math.cos(angle) * dist;
        const sy = slashY + Math.sin(angle) * dist;
        const screenX = sx - game.cameraX;
        const screenY = sy;
        FX.trail(screenX, screenY, '#60a5fa', 3);
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
      this.anim = 'cast';
      this.frame = 0;
      this.vx = 0;
      this.vy = 0;

      FX.shake(0.3);
      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      FX.ring(screenX, screenY, {color: '#fbbf24', r: 180, life: 0.5});
      FX.burst(screenX, screenY, {n: 30, color: '#fbbf24', speed: 250, life: 0.8, size: 4, glow: true});

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
          const trailX = this.x + FX.rand(-20, 20) - game.cameraX;
          const trailY = this.y + FX.rand(-30, 0);
          FX.trail(trailX, trailY, '#60a5fa', 2);
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
            const burstX = e.x - game.cameraX;
            const burstY = e.y;
            FX.burst(burstX, burstY, {n: 10, color: '#60a5fa', speed: 120, life: 0.6, size: 3});
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
      this.anim = 'cast';
      this.frame = 0;
      
      const heal = Math.floor(game.stats.maxHp * 0.3);
      game.stats.hp = Math.min(game.stats.maxHp, game.stats.hp + heal);
      FX.bar('hp', game.stats.hp / game.stats.maxHp);

      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      FX.ring(screenX, screenY, {color: '#4ade80', r: 100, life: 0.6});
      FX.burst(screenX, screenY, {n: 20, color: '#4ade80', speed: 80, life: 1, size: 3, glow: true});
      FX.text(screenX, screenY - 50, `+${heal}`, {color: '#4ade80', size: 24});
    }

    takeDamage(amount) {
      if (this.invulnerable > 0) return;
      
      const reduced = Math.max(1, amount - game.stats.def);
      game.stats.hp -= reduced;
      FX.bar('hp', Math.max(0, game.stats.hp / game.stats.maxHp));
      
      this.hitFlash = 0.08;
      this.invulnerable = 0.5;
      FX.shake(0.2);
      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      FX.text(screenX, screenY - 40, `-${reduced}`, {color: '#ef4444', size: 20});
      FX.burst(screenX, screenY - 30, {n: 8, color: '#ef4444', speed: 100, life: 0.5, size: 2});

      if (game.stats.hp <= 0) {
        gameOver(false);
      }
    }

    draw(ctx) {
      const shadow = 0.3 + Math.sin(FX.time * 3) * 0.05;
      ctx.globalAlpha = shadow;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 50 * this.sx, 25 * this.sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      this.afterimages.forEach(img => {
        const imgName = this.char.img === 'whale' ? `whale-${img.anim}` : this.char.img;
        ctx.globalAlpha = img.alpha;
        ctx.save();
        if (this.skinFilter) ctx.filter = this.skinFilter;
        FX.drawSprite(ctx, FX.img(imgName), img.x, img.y - img.z, 165, {
          flip: img.flip, sx: this.sx, sy: this.sy
        });
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      const imgName = this.char.img === 'whale' ? `whale-${this.anim}` : this.char.img;

      if (this.hitFlash > 0) {
        ctx.save();
        ctx.filter = (this.skinFilter || '') + ' brightness(3)';
      } else if (this.skinFilter) {
        ctx.save();
        ctx.filter = this.skinFilter;
      }

      if (this.invulnerable > 0 && Math.floor(FX.time * 20) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }

      FX.drawSprite(ctx, FX.img(imgName), this.x, this.y - this.z, 165, {
        flip: this.flip, sx: this.sx, sy: this.sy
      });

      if (this.hitFlash > 0 || this.skinFilter) {
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
      this.dissolve = 0;
      this.frame = 0;
      this.flip = false;

      const configs = {
        slime: {hp: 30, atk: 8, radius: 40, speed: 80, jumpInterval: 2, h: 100},
        bat: {hp: 20, atk: 6, radius: 35, speed: 150, swoopInterval: 3, h: 110},
        alien: {hp: 40, atk: 10, radius: 38, speed: 60, shootInterval: 2.5, h: 120},
        boss: {hp: 300, atk: 15, radius: 80, speed: 40, slamInterval: 4, h: 240}
      };

      const cfg = configs[type];
      this.maxHp = cfg.hp * (1 + variant * 0.8);
      this.hp = this.maxHp;
      this.atk = cfg.atk * (1 + variant * 0.5);
      this.radius = cfg.radius * (1 + variant * 0.2);
      this.speed = cfg.speed;
      this.height = cfg.h;
      this.actionTimer = FX.rand(0.5, 1.5);
      this.actionInterval = cfg[Object.keys(cfg).find(k => k.includes('Interval'))] || 2;

      this.sx = 1;
      this.sy = 1;
      this.targetSx = 1;
      this.targetSy = 1;
    }

    update(dt) {
      if (this.dead) {
        this.dissolve += dt * 2;
        return;
      }

      if (this.hitFlash > 0) this.hitFlash -= dt;
      this.actionTimer -= dt;

      this.vx *= 0.9;
      this.vy *= 0.9;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.y = Math.max(340, Math.min(510, this.y));

      this.sx = FX.lerp(this.sx, this.targetSx, dt * 8);
      this.sy = FX.lerp(this.sy, this.targetSy, dt * 8);
      this.frame += dt * 6;

      const hero = game.hero;
      if (!hero) return;

      const dx = hero.x - this.x;
      const dy = hero.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      this.flip = dx < 0;

      if (dist > 120) {
        const angle = Math.atan2(dy, dx);
        this.vx += Math.cos(angle) * this.speed * dt * 2;
        this.vy += Math.sin(angle) * this.speed * dt * 2;
      }

      if (this.actionTimer <= 0) {
        this.actionTimer = this.actionInterval + FX.rand(-0.5, 0.5);

        if (this.type === 'slime' && dist > 0) {
          this.targetSy = 0.6;
          setTimeout(() => {
            this.vy = (dy / dist) * 150;
            this.vx = (dx / dist) * 100;
            this.targetSy = 1.3;
            setTimeout(() => this.targetSy = 1, 200);
          }, 300);
        } else if (this.type === 'bat' && dist > 0) {
          const angle = Math.atan2(dy, dx);
          this.vx = Math.cos(angle) * this.speed * 2;
          this.vy = Math.sin(angle) * this.speed * 2;
        } else if (this.type === 'alien' && dist > 0) {
          const bullet = {
            x: this.x, y: this.y,
            vx: (dx / dist) * 200,
            vy: (dy / dist) * 200,
            life: 3,
            damage: this.atk
          };
          game.bullets.push(bullet);
          const screenX = this.x - game.cameraX;
          const screenY = this.y;
          FX.trail(screenX, screenY, '#f97316', 3);
        } else if (this.type === 'boss') {
          if (Math.random() < 0.5) {
            const slamX = hero.x;
            const slamY = hero.y;
            const screenX = slamX - game.cameraX;
            const screenY = slamY;
            FX.ring(screenX, screenY, {color: '#ef4444', r: 80, life: 1.2});
            setTimeout(() => {
              const hitDist = Math.sqrt((hero.x - slamX)**2 + (hero.y - slamY)**2);
              if (hitDist < 80) {
                hero.takeDamage(this.atk * 2);
              }
              FX.shake(0.5);
              const finalScreenX = slamX - game.cameraX;
              const finalScreenY = slamY;
              FX.burst(finalScreenX, finalScreenY, {n: 20, color: '#ef4444', speed: 200, life: 0.8, size: 4});
            }, 1200);
          } else {
            const summonX = this.x + FX.rand(-100, 100);
            const summonY = this.y + FX.rand(-50, 50);
            game.enemies.push(new Enemy('slime', summonX, summonY, 0));
            const screenX = summonX - game.cameraX;
            const screenY = summonY;
            FX.ring(screenX, screenY, {color: '#a855f7', r: 50, life: 0.5});
          }
        }
      }

      if (dist < this.radius + 50 && this.type !== 'alien') {
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

      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      FX.text(screenX, screenY - 50, `-${damage}`, {color: crit ? '#fbbf24' : '#ffffff', size: crit ? 28 : 20, crit});
      FX.burst(screenX, screenY - 30, {n: crit ? 12 : 6, color: crit ? '#fbbf24' : '#ef4444', speed: 100, life: 0.5, size: 2});

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
      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      FX.burst(screenX, screenY, {n: 20, color: this.variant > 0 ? '#a855f7' : '#94a3b8', speed: 150, life: 1, size: 3});
      
      const xpGain = this.type === 'boss' ? 100 : (15 + this.variant * 10);
      game.xp += xpGain;
      updateXPBar();

      const coinCount = Math.floor(FX.rand(3, 8) * (1 + this.variant * 0.5));
      for (let i = 0; i < coinCount; i++) {
        setTimeout(() => {
          game.coins += 1;
          updateHUD();
        }, i * 50);
      }

      if (this.type === 'boss' || Math.random() < 0.08) {
        game.gems += 1;
        updateHUD();
      }

      if (Math.random() < 0.25 + this.variant * 0.1) {
        const slots = ['weapon', 'armor', 'accessory'];
        const slot = slots[Math.floor(Math.random() * slots.length)];
        const icons = {'weapon': 'item-weapon', 'armor': 'item-armor', 'accessory': 'item-accessory'};
        const icon = icons[slot];
        
        const rarityRoll = Math.random();
        let rarity = 'N';
        if (rarityRoll < 0.5) rarity = 'N';
        else if (rarityRoll < 0.75) rarity = 'R';
        else if (rarityRoll < 0.9) rarity = 'SR';
        else rarity = 'SSR';

        const loot = {
          x: this.x,
          y: this.y,
          z: 0,
          vz: 250,
          slot: slot,
          icon: icon,
          rarity: rarity,
          collected: false,
          bobTime: 0
        };
        game.loot.push(loot);
        const lootScreenX = this.x - game.cameraX;
        const lootScreenY = this.y;
        FX.ring(lootScreenX, lootScreenY, {color: RARITY_COLORS[rarity], r: 40, life: 0.6});
      }

      setTimeout(() => {
        game.enemies = game.enemies.filter(e => e !== this);
        checkRoomCleared();
      }, 500);
    }

    draw(ctx) {
      if (this.dissolve > 1) return;

      const shadow = 0.3;
      ctx.globalAlpha = shadow * (1 - this.dissolve);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius * 0.8 * this.sx, this.radius * 0.4 * this.sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const imgName = `enemy-${this.type}`;

      ctx.save();
      ctx.globalAlpha = 1 - this.dissolve;
      
      if (this.variant > 0) {
        const hue = this.variant === 1 ? 60 : 240;
        ctx.filter = `hue-rotate(${hue}deg) brightness(1.2)`;
      }
      if (this.hitFlash > 0) {
        ctx.filter = (ctx.filter || '') + ' brightness(3)';
      }

      const scaleBonus = 1 + this.variant * 0.15;
      FX.drawSprite(ctx, FX.img(imgName), this.x, this.y, this.height, {
        flip: this.flip, sx: this.sx * scaleBonus, sy: this.sy * scaleBonus
      });

      ctx.restore();

      if (this.variant > 0 && !this.dead) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(FX.time * 4) * 0.2;
        ctx.strokeStyle = this.variant === 1 ? '#a855f7' : '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height/2, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (this.hp < this.maxHp && !this.dead) {
        const barW = 50;
        const barH = 5;
        const barX = this.x - barW/2;
        const barY = this.y - this.height - 10;
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
      }
    }
  }

  function spawnWave() {
    const isBoss = game.room === game.maxRoom;
    const roomX = game.cameraX + 480;

    if (isBoss) {
      const boss = new Enemy('boss', roomX, 420, 0);
      game.enemies.push(boss);
      FX.banner('BOSS出现！');
      return;
    }

    const count = Math.min(3 + Math.floor(game.room / 2), 8);
    const variant = game.room > 2 ? (Math.random() < 0.2 + game.room * 0.02 ? 1 : 0) : 0;

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
      const y = FX.rand(360, 480);
      const enemyVariant = Math.random() < 0.2 ? variant : 0;
      game.enemies.push(new Enemy(type, x, y, enemyVariant));
    }
  }

  function checkRoomCleared() {
    if (game.enemies.length === 0 && !game.roomCleared) {
      game.roomCleared = true;
      
      if (game.room === game.maxRoom) {
        gameOver(true);
      } else {
        FX.banner('区域清理完成 →');
        setTimeout(() => {
          nextRoom();
        }, 1500);
      }
    }
  }

  function nextRoom() {
    game.transitioning = true;
    const targetX = game.cameraX + 960;

    const duration = 1.5;
    const start = FX.time;
    const startX = game.cameraX;

    const transition = () => {
      const elapsed = FX.time - start;
      const t = Math.min(1, elapsed / duration);
      const eased = FX.ease.outCubic(t);
      game.cameraX = startX + (targetX - startX) * eased;

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
      const screenX = game.hero.x - game.cameraX;
      const screenY = game.hero.y;
      FX.ring(screenX, screenY, {color: '#fbbf24', r: 150, life: 1});
      FX.burst(screenX, screenY, {n: 30, color: '#fbbf24', speed: 200, life: 1.2, size: 5, glow: true});
      FX.bar('hp', 1);
      updateHUD();
      updateXPBar();
    }
    const ratio = game.xp / (50 + game.level * 25);
    FX.bar('xp', ratio);
  }

  function updateHUD() {
    const coinText = `<span class="chip">💰 ${game.coins}</span>`;
    const gemText = `<span class="chip">💎 ${game.gems}</span>`;
    const levelText = `<span class="chip">Lv.${game.level}</span>`;
    const roomText = `<span class="chip">${game.room}/${game.maxRoom}</span>`;
    
    FX.hud(`
      <div style="display:flex;gap:10px;align-items:center;width:100%;">
        <div style="flex:1;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:2px;">HP</div>
          <div class="fx-bar" id="hp"><i></i></div>
        </div>
        <div style="flex:1;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:2px;">XP</div>
          <div class="fx-bar" id="xp"><i></i></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${levelText}
          ${coinText}
          ${gemText}
          ${roomText}
        </div>
      </div>
    `);
    
    FX.bar('hp', game.stats.hp / game.stats.maxHp);
    FX.bar('xp', game.xp / (50 + game.level * 25));
  }

  function collectLoot(loot) {
    loot.collected = true;
    
    const statRolls = {
      weapon: {atk: Math.floor((5 + RARITIES.indexOf(loot.rarity) * 8) * (0.8 + Math.random() * 0.4))},
      armor: {def: Math.floor((3 + RARITIES.indexOf(loot.rarity) * 5) * (0.8 + Math.random() * 0.4))},
      accessory: {hp: Math.floor((10 + RARITIES.indexOf(loot.rarity) * 20) * (0.8 + Math.random() * 0.4)), spd: 0.05 * (RARITIES.indexOf(loot.rarity) + 1)}
    };

    const item = {
      id: `${loot.slot}_${Date.now()}_${Math.random()}`,
      slot: loot.slot,
      icon: loot.icon,
      rarity: loot.rarity,
      stats: statRolls[loot.slot] || {},
      name: `${RARITY_NAMES[loot.rarity]}${loot.slot === 'weapon' ? '武器' : loot.slot === 'armor' ? '护甲' : '饰品'}`
    };

    window.Lobby.addItem(item);

    const screenX = loot.x - game.cameraX;
    const screenY = loot.y;
    FX.burst(screenX, screenY, {n: 15, color: RARITY_COLORS[loot.rarity], speed: 120, life: 0.8, size: 3, glow: true});
    FX.text(game.hero.x - game.cameraX, game.hero.y - 60, `获得 ${item.name}`, {color: RARITY_COLORS[loot.rarity], size: 18});
  }

  function gameOver(win) {
    FX.running = false;
    
    let stars = 0;
    if (win) {
      stars = 3;
      if (game.stats.hp < game.stats.maxHp * 0.3) stars = 2;
      if (game.stats.hp < game.stats.maxHp * 0.1) stars = 1;
    }

    setTimeout(() => {
      window.Lobby.reportResult({
        stage: game.sel ? game.sel.stage : 0,
        stars: stars,
        coins: game.coins,
        gems: game.gems,
        missionsProgress: {}
      });
    }, 500);
  }

  function startRun(sel) {
    game.sel = sel;
    game.mode = sel.mode;
    game.maxRoom = sel.mode === 'story' ? 5 : 999;
    
    const charData = CHARS.find(c => c.id === sel.char);
    game.stats = {
      atk: sel.stats.atk || charData.stats.atk,
      def: sel.stats.def || charData.stats.def,
      hp: sel.stats.hp || charData.stats.hp,
      maxHp: sel.stats.hp || charData.stats.hp,
      spd: sel.stats.spd || charData.stats.spd
    };

    game.hero = new Hero(sel);
    game.enemies = [];
    game.loot = [];
    game.bullets = [];
    game.room = 1;
    game.roomCleared = false;
    game.coins = 0;
    game.gems = 0;
    game.xp = 0;
    game.level = 1;
    game.cameraX = 0;
    game.transitioning = false;
    game.comboCount = 0;
    game.comboTimer = 0;

    updateHUD();

    const attackBtn = FX.button({
      icon: 'item-weapon',
      color: '#ef4444',
      size: 100,
      right: 20,
      bottom: 20,
      key: 'KeyJ',
      cd: 0,
      hold: true,
      onPress: () => {
        if (attackBtn.down && FX.running && !FX.paused) game.hero.attack();
      }
    });

    const skill1Btn = FX.button({
      icon: 'item-star',
      color: '#fbbf24',
      size: 70,
      right: 140,
      bottom: 18,
      key: 'KeyK',
      cd: 6,
      onPress: () => {
        if (FX.running && !FX.paused) game.hero.skill1();
      }
    });

    const skill2Btn = FX.button({
      icon: 'item-ice',
      color: '#60a5fa',
      size: 70,
      right: 128,
      bottom: 104,
      key: 'KeyL',
      cd: 5,
      onPress: () => {
        if (FX.running && !FX.paused) game.hero.skill2();
      }
    });

    const skill3Btn = FX.button({
      icon: 'item-heart',
      color: '#4ade80',
      size: 70,
      right: 52,
      bottom: 140,
      key: 'KeyI',
      cd: 15,
      onPress: () => {
        if (FX.running && !FX.paused) game.hero.skill3();
      }
    });

    spawnWave();
    FX.running = true;
  }

  function applySkin(sel) {
    if (game.hero && sel.char === (game.sel ? game.sel.char : null)) {
      game.hero.skinFilter = sel.skin.filter;
      if (game.sel) game.sel.skin = sel.skin;
    }
  }

  const area = () => {
    const idx = game.sel ? game.sel.stage : 0;
    return STAGES[Math.max(0, Math.min(idx, STAGES.length - 1))];
  };

  function update(dt) {
    if (!FX.running || FX.paused || !game.hero) return;

    game.hero.update(dt);

    game.enemies.forEach(e => e.update(dt));

    game.bullets = game.bullets.filter(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (game.hero) {
        const dx = b.x - game.hero.x;
        const dy = b.y - game.hero.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 50) {
          game.hero.takeDamage(b.damage);
          return false;
        }
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

      if (loot.z === 0 && game.hero) {
        loot.bobTime += dt;
        const dx = loot.x - game.hero.x;
        const dy = loot.y - game.hero.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 70) {
          collectLoot(loot);
          return false;
        }
      }

      return true;
    });
  }

  function draw(ctx) {
    ctx.save();
    const a = area();
    const layers = [
      {img: a.bg, speed: 0.2, y: 0, h: 540, alpha: 1}
    ];
    if (a.prop) {
      layers.push({img: a.prop, speed: 0.6, y: 360, h: 180, gap: 420, alpha: 0.9});
    }
    FX.parallax(ctx, layers, game.cameraX * 0.3);
    FX.motes(ctx, a.moteColor);
    ctx.restore();

    ctx.save();
    ctx.translate(-game.cameraX, 0);
    
    if (!game.hero) { 
      ctx.restore(); 
      FX.drawFX(ctx); 
      FX.vignette(ctx);
      return; 
    }

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
        ctx.ellipse(loot.x, loot.y, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const bob = Math.sin(loot.bobTime * 3) * 8;
        const h = 50;
        
        ctx.save();
        ctx.shadowColor = RARITY_COLORS[loot.rarity];
        ctx.shadowBlur = 15;
        FX.drawSprite(ctx, FX.img(loot.icon), loot.x, loot.y - loot.z - bob, h, {glow: true});
        ctx.restore();

        if (loot.z === 0 && Math.floor(FX.time * 8) % 8 === 0) {
          const trailX = loot.x + FX.rand(-10, 10) - game.cameraX;
          const trailY = loot.y - 20 + FX.rand(-10, 10);
          FX.trail(trailX, trailY, RARITY_COLORS[loot.rarity], 2);
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
    const skins = [];
    CHARS.forEach(char => {
      skins.push(
        {char: char.id, id: 'default', name: '默认', filter: '', rarity: 'N', vip: false},
        {char: char.id, id: 'flame', name: '烈焰', filter: 'hue-rotate(20deg) saturate(1.3)', rarity: 'R', vip: false},
        {char: char.id, id: 'frost', name: '冰霜', filter: 'hue-rotate(180deg) saturate(1.2)', rarity: 'SR', vip: false},
        {char: char.id, id: 'galaxy', name: '星河', filter: 'hue-rotate(270deg) saturate(1.5) brightness(1.1)', rarity: 'SSR', vip: true}
      );
    });

    window.Lobby.init({
      id: 'monster-loot',
      title: '萌娘星糖远征',
      orientation: 'landscape',
      bg: STAGES.map(s => ({img: s.bg, prop: s.prop, moteColor: s.moteColor})),
      modes: ['story', 'endless'],
      stages: STAGES,
      chars: CHARS.map(c => ({
        id: c.id,
        name: c.name,
        img: c.img === 'whale' ? 'whale-idle' : c.img,
        chibi: c.img === 'whale' ? 'lan-chibi' : c.img,
        stats: c.stats
      })),
      skins: skins,
      currency: [
        {id: 'coin', icon: 'item-chest'},
        {id: 'gem', icon: 'item-star'}
      ],
      slots: [
        {id: 'weapon', icon: 'item-weapon'},
        {id: 'armor', icon: 'item-armor'},
        {id: 'accessory', icon: 'item-accessory'}
      ],
      onStart: startRun,
      onQuit: () => { FX.running = false; },
      onSkinChange: applySkin
    });

    FX.loop(update, draw);
  });

})();
;FX.useSideSprites('idle');
