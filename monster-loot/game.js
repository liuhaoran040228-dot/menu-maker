// 萌娘星糖远征 (Monster Loot Expedition) - Polish Pass
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
    bullets: [],
    bossPhase: 1,
    bossPhaseTimer: 0,
    kills: 0,
    startTime: 0
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
    {id: 'lan', name: '蓝蓝', sideImg: 'whale', stats: {atk: 12, def: 8, hp: 120, spd: 1.0}},
    {id: 'mo', name: '墨墨', sideImg: 'mo', stats: {atk: 15, def: 5, hp: 100, spd: 1.2}},
    {id: 'li', name: '丽丽', sideImg: 'li', stats: {atk: 10, def: 10, hp: 140, spd: 0.9}},
    {id: 'xing', name: '星星', sideImg: 'xing', stats: {atk: 18, def: 4, hp: 90, spd: 1.3}},
    {id: 'hu', name: '虎虎', sideImg: 'hu', stats: {atk: 14, def: 6, hp: 110, spd: 1.1}}
  ];

  // Create hero light outline cache
  let heroOutlineCache = null;
  function createHeroOutline(height) {
    const w = Math.ceil(height * 0.6);
    const h = Math.ceil(height * 1.2);
    const outline = document.createElement('canvas');
    outline.width = w;
    outline.height = h;
    const outlineCtx = outline.getContext('2d');
    outlineCtx.fillStyle = 'rgba(255,255,255,0.25)';
    outlineCtx.beginPath();
    outlineCtx.ellipse(w/2, h/2, w/2.1, h/2.1, 0, 0, Math.PI * 2);
    outlineCtx.fill();
    outlineCtx.strokeStyle = 'rgba(255,255,255,0.35)';
    outlineCtx.lineWidth = 2;
    outlineCtx.stroke();
    return outline;
  }

  // Hero class with proper side-view sprites
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
      this.animFrame = 0;
      this.flip = false;
      this.sx = 1;
      this.sy = 1;
      this.targetSx = 1;
      this.targetSy = 1;
      this.bobOffset = 0;
      this.leanAngle = 0;
      this.attacking = false;
      this.attackTimer = 0;
      this.hitFlash = 0;
      this.invulnerable = 0;
      this.afterimages = [];
      this.outlineCanvas = createHeroOutline(170);
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
        this.leanAngle = (joy.x * -0.15);
        this.bobOffset = Math.sin(FX.time * 12) * 8;
      } else if (!this.attacking) {
        this.vx *= 0.85;
        this.vy *= 0.85;
        this.leanAngle *= 0.9;
        this.bobOffset *= 0.85;
        if (Math.abs(this.vx) < 5 && Math.abs(this.vy) < 5) {
          this.vx = 0;
          this.vy = 0;
          this.anim = 'idle';
          this.bobOffset = Math.sin(FX.time * 2) * 3;
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
      this.x = Math.max(roomLeft + 100, Math.min(roomRight - 100, this.x));
      this.y = Math.max(360, Math.min(500, this.y));

      this.sx = FX.lerp(this.sx, this.targetSx, dt * 10);
      this.sy = FX.lerp(this.sy, this.targetSy, dt * 10);

      this.animFrame += dt * 10;
      if (this.anim === 'idle') this.animFrame %= 4;
      else if (this.anim === 'run') this.animFrame %= 6;

      if (this.attacking && this.attackTimer <= 0) {
        this.attacking = false;
        this.targetSx = 1;
        this.targetSy = 1;
      }

      if (Math.abs(this.vx) > 100 || Math.abs(this.vy) > 100) {
        this.afterimages.push({
          x: this.x, y: this.y, z: this.z, flip: this.flip,
          anim: this.anim, frame: Math.floor(this.animFrame), alpha: 0.3, life: 0.15
        });
      }

      this.afterimages = this.afterimages.filter(img => {
        img.life -= dt;
        img.alpha = (img.life / 0.15) * 0.3;
        return img.life > 0;
      });
    }

    attack() {
      if (this.attacking) return;
      
      this.attacking = true;
      this.attackTimer = 0.35;
      this.anim = 'attack';
      this.animFrame = 0;
      game.comboCount = (game.comboCount + 1) % 3;
      game.comboTimer = 0.8;

      const lunge = game.comboCount === 2 ? 150 : 70;
      this.vx = (this.flip ? -1 : 1) * lunge / 0.35;

      this.targetSx = 1.35;
      this.targetSy = 0.75;

      const range = 130;
      const slashX = this.x + (this.flip ? -range/2 : range/2);
      const slashY = this.y - 80;

      for (let i = 0; i < 5; i++) {
        const angle = (this.flip ? Math.PI : 0) + FX.rand(-0.5, 0.5);
        const dist = FX.rand(20, 80);
        const sx = slashX + Math.cos(angle) * dist;
        const sy = slashY + Math.sin(angle) * dist;
        const screenX = sx - game.cameraX;
        const screenY = sy;
        FX.trail(screenX, screenY, '#60a5fa', 4);
      }

      const crit = Math.random() < 0.15;
      const damage = Math.floor(game.stats.atk * (1 + game.comboCount * 0.25) * (crit ? 2 : 1));

      game.enemies.forEach(e => {
        if (e.dead) return;
        const dx = e.x - slashX;
        const dy = e.y - slashY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < range + e.radius) {
          e.hit(damage, crit);
          e.vx = (this.flip ? -1 : 1) * 180;
          e.vy = -80;
          FX.hitstop(0.06);
        }
      });
    }

    skill1() {
      this.anim = 'cast';
      this.animFrame = 0;
      this.vx = 0;
      this.vy = 0;

      FX.shake(0.4);
      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      FX.ring(screenX, screenY, {color: '#fbbf24', r: 200, life: 0.6});
      FX.burst(screenX, screenY, {n: 40, color: '#fbbf24', speed: 280, life: 1, size: 5, glow: true});

      const damage = Math.floor(game.stats.atk * 2);
      game.enemies.forEach(e => {
        if (e.dead) return;
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 200) {
          e.hit(damage, false);
          const angle = Math.atan2(dy, dx);
          e.vx = Math.cos(angle) * 220;
          e.vy = Math.sin(angle) * 220;
        }
      });
    }

    skill2() {
      this.anim = 'jump';
      this.animFrame = 0;
      this.invulnerable = 0.4;
      
      const dashDist = 220;
      const dir = this.flip ? -1 : 1;
      this.vx = dir * dashDist / 0.4;

      const damage = Math.floor(game.stats.atk * 1.6);
      
      const dashCheck = () => {
        for (let i = 0; i < 6; i++) {
          const trailX = this.x + FX.rand(-25, 25) - game.cameraX;
          const trailY = this.y + FX.rand(-40, 10);
          FX.trail(trailX, trailY, '#60a5fa', 3);
        }

        game.enemies.forEach(e => {
          if (e.dead || e.hitByDash) return;
          const dx = e.x - this.x;
          const dy = e.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 70 + e.radius) {
            e.hit(damage, false);
            e.vx = dir * 200;
            e.hitByDash = true;
            const burstX = e.x - game.cameraX;
            const burstY = e.y;
            FX.burst(burstX, burstY, {n: 15, color: '#60a5fa', speed: 150, life: 0.7, size: 4});
            FX.hitstop(0.05);
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
      }, 40);
    }

    skill3() {
      this.anim = 'cast';
      this.animFrame = 0;
      
      const heal = Math.floor(game.stats.maxHp * 0.35);
      game.stats.hp = Math.min(game.stats.maxHp, game.stats.hp + heal);
      FX.bar('hp', game.stats.hp / game.stats.maxHp);

      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      FX.ring(screenX, screenY, {color: '#4ade80', r: 120, life: 0.7});
      FX.burst(screenX, screenY, {n: 25, color: '#4ade80', speed: 100, life: 1.2, size: 4, glow: true});
      FX.text(screenX, screenY - 60, `+${heal}`, {color: '#4ade80', size: 26});
    }

    takeDamage(amount) {
      if (this.invulnerable > 0) return;
      
      const reduced = Math.max(1, amount - game.stats.def);
      game.stats.hp -= reduced;
      FX.bar('hp', Math.max(0, game.stats.hp / game.stats.maxHp));
      
      this.hitFlash = 0.1;
      this.invulnerable = 0.6;
      FX.shake(0.25);
      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      FX.text(screenX, screenY - 50, `-${reduced}`, {color: '#ef4444', size: 22});
      FX.burst(screenX, screenY - 40, {n: 10, color: '#ef4444', speed: 120, life: 0.6, size: 3});

      if (game.stats.hp <= 0) {
        gameOver(false);
      }
    }

    draw(ctx) {
      const shadow = 0.35 + Math.sin(FX.time * 3.5) * 0.08;
      ctx.globalAlpha = shadow;
      ctx.fillStyle = '#00000050';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 5, 55 * this.sx, 28 * this.sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      this.afterimages.forEach(img => {
        const spriteName = (this.char.sideImg==='whale'?'':'side-')+`${this.char.sideImg}-${(img.anim==='cast'&&this.char.sideImg!=='whale')?'attack':img.anim}`;
        ctx.globalAlpha = img.alpha;
        ctx.save();
        if (this.skinFilter) ctx.filter = this.skinFilter;
        FX.drawSprite(ctx, FX.img(spriteName), img.x, img.y - img.z, 170, {
          flip: img.flip, sx: this.sx, sy: this.sy, rot: this.leanAngle
        });
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      const spriteName = (this.char.sideImg==='whale'?'':'side-')+`${this.char.sideImg}-${(this.anim==='cast'&&this.char.sideImg!=='whale')?'attack':this.anim}`;
      const yOffset = this.anim === 'run' ? this.bobOffset : (this.anim === 'idle' ? this.bobOffset : 0);

      if (this.hitFlash > 0) {
        ctx.save();
        ctx.filter = (this.skinFilter || '') + ' brightness(3.2)';
      } else if (this.skinFilter) {
        ctx.save();
        ctx.filter = this.skinFilter;
      }

      if (this.invulnerable > 0 && Math.floor(FX.time * 20) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      // Draw soft light outline
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.outlineCanvas, this.x - 51, this.y - 170 - this.z + yOffset);
      ctx.restore();

      FX.drawSprite(ctx, FX.img(spriteName), this.x, this.y - this.z + yOffset, 170, {
        flip: this.flip, sx: this.sx, sy: this.sy, rot: this.leanAngle
      });

      if (this.hitFlash > 0 || this.skinFilter) {
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Enemy class with multiple behaviors
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
      this.animFrame = 0;
      this.flip = false;
      this.bobTime = 0;
      this.behavior = 0;

      const configs = {
        slime: {hp: 35, atk: 8, radius: 45, speed: 90, h: 100},
        bat: {hp: 24, atk: 7, radius: 38, speed: 160, h: 110},
        alien: {hp: 45, atk: 11, radius: 40, speed: 65, h: 120},
        boss: {hp: 350, atk: 16, radius: 90, speed: 45, h: 260}
      };

      const cfg = configs[type];
      this.maxHp = cfg.hp * (1 + variant * 0.9);
      this.hp = this.maxHp;
      this.atk = cfg.atk * (1 + variant * 0.6);
      this.radius = cfg.radius * (1 + variant * 0.25);
      this.speed = cfg.speed;
      this.height = cfg.h;
      this.actionTimer = FX.rand(0.3, 1.2);
      this.actionInterval = type === 'boss' ? 3.5 : (type === 'slime' ? 2.2 : 2.8);

      this.sx = 1;
      this.sy = 1;
      this.targetSx = 1;
      this.targetSy = 1;
      
      if (type === 'boss') {
        this.bossState = 'normal';
        this.bossStateTimer = 0;
      }
    }

    update(dt) {
      if (this.dead) {
        this.dissolve += dt * 2.2;
        return;
      }

      if (this.hitFlash > 0) this.hitFlash -= dt;
      this.actionTimer -= dt;
      this.bobTime += dt;

      this.vx *= 0.88;
      this.vy *= 0.88;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.y = Math.max(340, Math.min(510, this.y));

      this.sx = FX.lerp(this.sx, this.targetSx, dt * 9);
      this.sy = FX.lerp(this.sy, this.targetSy, dt * 9);
      this.animFrame += dt * 8;

      const hero = game.hero;
      if (!hero) return;

      const dx = hero.x - this.x;
      const dy = hero.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      this.flip = dx < 0;

      if (this.type === 'boss') {
        this.bossStateTimer += dt;
        const transitionDist = 500;
        if (dist < transitionDist && this.bossStateTimer > 8 && this.hp < this.maxHp * 0.5) {
          this.bossState = 'enraged';
        }
      }

      if (dist > 130) {
        const angle = Math.atan2(dy, dx);
        const accel = this.type === 'boss' ? 35 : (this.type === 'bat' ? 50 : 40);
        this.vx += Math.cos(angle) * this.speed * accel * dt;
        this.vy += Math.sin(angle) * this.speed * accel * dt;
      }

      if (this.actionTimer <= 0) {
        this.actionTimer = this.actionInterval + FX.rand(-0.4, 0.6);
        this.behavior = Math.floor(Math.random() * 2);

        if (this.type === 'slime') {
          this.targetSy = 0.65;
          setTimeout(() => {
            if (dist > 0 && !this.dead) {
              this.vy = (dy / dist) * 170 + FX.rand(-30, 30);
              this.vx = (dx / dist) * 120 + FX.rand(-50, 50);
              this.targetSy = 1.25;
              setTimeout(() => { if (!this.dead) this.targetSy = 1; }, 180);
            }
          }, 250);
        } else if (this.type === 'bat') {
          const swoopAngle = Math.atan2(dy, dx) + FX.rand(-0.3, 0.3);
          this.vx = Math.cos(swoopAngle) * this.speed * 2.2;
          this.vy = Math.sin(swoopAngle) * this.speed * 2.2;
        } else if (this.type === 'alien') {
          if (this.behavior === 0 && dist > 0) {
            const bullet = {
              x: this.x, y: this.y - 20,
              vx: (dx / dist) * 220 + FX.rand(-40, 40),
              vy: (dy / dist) * 220 + FX.rand(-40, 40),
              life: 3.5,
              damage: this.atk
            };
            game.bullets.push(bullet);
            const screenX = this.x - game.cameraX;
            const screenY = this.y - 20;
            FX.trail(screenX, screenY, '#f97316', 4);
          } else {
            const moveAngle = Math.atan2(dy, dx) + FX.rand(-Math.PI/3, Math.PI/3);
            this.vx = Math.cos(moveAngle) * this.speed * 1.5;
            this.vy = Math.sin(moveAngle) * this.speed * 1.5;
          }
        } else if (this.type === 'boss') {
          if (this.bossState === 'enraged') {
            this.actionInterval = 2;
          }
          
          if (this.behavior === 0) {
            const slamX = hero.x + FX.rand(-60, 60);
            const slamY = hero.y;
            const screenX = slamX - game.cameraX;
            const screenY = slamY;
            FX.ring(screenX, screenY, {color: '#ef4444', r: 100, life: 1.4});
            FX.text(screenX, screenY - 80, 'ボス攻撃！', {color: '#ef4444', size: 24});
            
            setTimeout(() => {
              if (!this.dead) {
                const hitDist = Math.sqrt((hero.x - slamX)**2 + (hero.y - slamY)**2);
                if (hitDist < 100) {
                  hero.takeDamage(this.atk * 2.2);
                }
                FX.shake(0.6);
                const finalScreenX = slamX - game.cameraX;
                const finalScreenY = slamY;
                FX.burst(finalScreenX, finalScreenY, {n: 25, color: '#ef4444', speed: 220, life: 0.9, size: 5});
              }
            }, 1300);
          } else {
            const summonCount = this.bossState === 'enraged' ? 2 : 1;
            for (let i = 0; i < summonCount; i++) {
              setTimeout(() => {
                if (!this.dead) {
                  const summonX = this.x + FX.rand(-120, 120);
                  const summonY = this.y + FX.rand(-80, 80);
                  game.enemies.push(new Enemy('slime', summonX, summonY, 0));
                  const screenX = summonX - game.cameraX;
                  const screenY = summonY;
                  FX.ring(screenX, screenY, {color: '#a855f7', r: 60, life: 0.6});
                }
              }, i * 400);
            }
          }
        }
      }

      if (dist < this.radius + 55 && this.type !== 'alien') {
        hero.takeDamage(this.atk);
      }
    }

    hit(damage, crit) {
      this.hp -= damage;
      this.hitFlash = 0.1;
      this.targetSx = 1.25;
      this.targetSy = 0.75;
      setTimeout(() => {
        if (!this.dead) {
          this.targetSx = 1;
          this.targetSy = 1;
        }
      }, 120);

      const screenX = this.x - game.cameraX;
      const screenY = this.y - 50;
      FX.text(screenX, screenY, `-${damage}`, {color: crit ? '#fbbf24' : '#ffff99', size: crit ? 30 : 22, crit});
      FX.burst(screenX, screenY - 30, {n: crit ? 14 : 8, color: crit ? '#fbbf24' : '#ff6b35', speed: 120, life: 0.6, size: 3});

      if (crit) {
        FX.hitstop(0.1);
        FX.shake(0.2);
      }

      if (this.hp <= 0) {
        this.die();
      }
    }

    die() {
      this.dead = true;
      game.kills++;
      const screenX = this.x - game.cameraX;
      const screenY = this.y;
      const color = this.variant > 0 ? (this.variant === 1 ? '#a855f7' : '#f97316') : '#94a3b8';
      FX.burst(screenX, screenY, {n: 25, color: color, speed: 180, life: 1.1, size: 4});
      
      const xpGain = this.type === 'boss' ? 150 : (20 + this.variant * 15);
      game.xp += xpGain;
      updateXPBar();

      const coinCount = Math.floor(FX.rand(4, 10) * (1 + this.variant * 0.6));
      for (let i = 0; i < coinCount; i++) {
        setTimeout(() => {
          game.coins += 1;
          updateHUD();
        }, i * 60);
      }

      if (this.type === 'boss') {
        game.gems += 3;
        FX.banner('BOSS 击败！');
      } else if (Math.random() < 0.1 + this.variant * 0.12) {
        game.gems += 1;
      }
      updateHUD();

      if (Math.random() < 0.3 + this.variant * 0.15) {
        const slots = ['weapon', 'armor', 'accessory'];
        const slot = slots[Math.floor(Math.random() * slots.length)];
        const icons = {'weapon': 'item-weapon', 'armor': 'item-armor', 'accessory': 'item-accessory'};
        const icon = icons[slot];
        
        const rarityRoll = Math.random();
        let rarity = 'N';
        if (this.type === 'boss') {
          rarity = rarityRoll < 0.4 ? 'SR' : (rarityRoll < 0.8 ? 'SSR' : 'SR');
        } else {
          if (rarityRoll < 0.55) rarity = 'N';
          else if (rarityRoll < 0.78) rarity = 'R';
          else if (rarityRoll < 0.93) rarity = 'SR';
          else rarity = 'SSR';
        }

        const loot = {
          x: this.x,
          y: this.y,
          z: 0,
          vz: 280,
          slot: slot,
          icon: icon,
          rarity: rarity,
          collected: false,
          bobTime: 0
        };
        game.loot.push(loot);
        const lootScreenX = this.x - game.cameraX;
        const lootScreenY = this.y;
        FX.ring(lootScreenX, lootScreenY, {color: RARITY_COLORS[rarity], r: 50, life: 0.8});
      }

      setTimeout(() => {
        game.enemies = game.enemies.filter(e => e !== this);
        checkRoomCleared();
      }, 600);
    }

    draw(ctx) {
      if (this.dissolve > 1) return;

      const shadow = 0.3;
      ctx.globalAlpha = shadow * (1 - this.dissolve);
      ctx.fillStyle = '#00000060';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 3, this.radius * 0.75 * this.sx, this.radius * 0.35 * this.sy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const imgName = `enemy-${this.type}`;

      ctx.save();
      ctx.globalAlpha = 1 - this.dissolve;
      
      if (this.variant > 0) {
        if (this.variant === 1) {
          ctx.filter = 'hue-rotate(280deg) brightness(1.3)';
        } else {
          ctx.filter = 'hue-rotate(30deg) brightness(1.25)';
        }
      }
      if (this.hitFlash > 0) {
        const currentFilter = ctx.filter;
        ctx.filter = currentFilter + ' brightness(3.5)';
      }

      const scaleBonus = 1 + this.variant * 0.2;
      const idleBobbale = Math.sin(this.bobTime * 4) * 4;
      FX.drawSprite(ctx, FX.img(imgName), this.x, this.y + idleBobbale, this.height, {
        flip: this.flip, sx: this.sx * scaleBonus, sy: this.sy * scaleBonus
      });

      ctx.restore();

      if (this.variant > 0 && !this.dead) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(FX.time * 5) * 0.25;
        ctx.strokeStyle = this.variant === 1 ? '#a855f7' : '#f97316';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height/2 + 10, this.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (this.hp < this.maxHp && !this.dead) {
        const barW = 60;
        const barH = 6;
        const barX = this.x - barW/2;
        const barY = this.y - this.height - 15;
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = this.type === 'boss' ? '#ef4444' : '#ef4444';
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        
        if (this.type === 'boss') {
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(Math.ceil(this.hp) + '/' + Math.ceil(this.maxHp), this.x, barY - 5);
        }
      }
    }
  }

  function spawnWave() {
    const isBoss = game.room === game.maxRoom;
    const roomX = game.cameraX + 480;

    if (isBoss) {
      const boss = new Enemy('boss', roomX, 420, 0);
      game.enemies.push(boss);
      FX.banner('ボス出現！');
      FX.shake(0.5);
      return;
    }

    const diffMult = 1 + (game.room - 1) * 0.35;
    const count = Math.ceil((3 + Math.floor(game.room / 1.5)) * diffMult);
    const variant = game.room > 2 ? (Math.random() < 0.15 + game.room * 0.03 ? 1 : 0) : 0;

    for (let i = 0; i < Math.min(count, 12); i++) {
      const types = ['slime', 'bat', 'alien'];
      const weights = game.room <= 2 ? [0.6, 0.3, 0.1] : (game.room <= 4 ? [0.4, 0.4, 0.2] : [0.3, 0.3, 0.4]);
      let roll = Math.random();
      let type = 'slime';
      for (let j = 0; j < types.length; j++) {
        if (roll < weights[j]) {
          type = types[j];
          break;
        }
        roll -= weights[j];
      }

      const x = roomX + FX.rand(80, 880);
      const y = FX.rand(360, 480);
      const enemyVariant = Math.random() < (0.08 + game.room * 0.02) ? variant : 0;
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
        }, 1800);
      }
    }
  }

  function nextRoom() {
    game.transitioning = true;
    const targetX = game.cameraX + 960;

    const duration = 1.8;
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
    const xpForLevel = 60 + game.level * 30;
    if (game.xp >= xpForLevel) {
      game.xp -= xpForLevel;
      game.level++;
      
      game.stats.maxHp += 25;
      game.stats.hp = game.stats.maxHp;
      game.stats.atk += 4;
      game.stats.def += 2;

      FX.banner(`レベルアップ Lv.${game.level}`);
      const screenX = game.hero.x - game.cameraX;
      const screenY = game.hero.y - 80;
      FX.ring(screenX, screenY, {color: '#fbbf24', r: 180, life: 1.2});
      FX.burst(screenX, screenY, {n: 35, color: '#fbbf24', speed: 240, life: 1.4, size: 6, glow: true});
      FX.bar('hp', 1);
      updateHUD();
      updateXPBar();
    }
    const ratio = game.xp / (60 + game.level * 30);
    FX.bar('xp', ratio);
  }

  function updateHUD() {
    const coinText = `<span class="chip">💰 ${game.coins}</span>`;
    const gemText = `<span class="chip">💎 ${game.gems}</span>`;
    const levelText = `<span class="chip">Lv.${game.level}</span>`;
    const roomText = `<span class="chip">${game.room}/${game.maxRoom}</span>`;
    
    FX.hud(`
      <div style="display:flex;gap:10px;align-items:center;width:100%;padding-right:150px;">
        <div style="flex:0.8;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:2px;">HP</div>
          <div class="fx-bar" id="hp"><i></i></div>
        </div>
        <div style="flex:0.8;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:2px;">XP</div>
          <div class="fx-bar" id="xp"><i></i></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:nowrap;white-space:nowrap;">
          ${levelText}
          ${coinText}
          ${gemText}
          ${roomText}
        </div>
      </div>
    `);
    
    FX.bar('hp', game.stats.hp / game.stats.maxHp);
    FX.bar('xp', game.xp / (60 + game.level * 30));
  }

  function collectLoot(loot) {
    loot.collected = true;
    
    const statRolls = {
      weapon: {atk: Math.floor((6 + RARITIES.indexOf(loot.rarity) * 10) * (0.75 + Math.random() * 0.5))},
      armor: {def: Math.floor((4 + RARITIES.indexOf(loot.rarity) * 6) * (0.75 + Math.random() * 0.5))},
      accessory: {hp: Math.floor((15 + RARITIES.indexOf(loot.rarity) * 25) * (0.75 + Math.random() * 0.5)), spd: 0.06 * (RARITIES.indexOf(loot.rarity) + 1)}
    };

    const item = {
      id: `${loot.slot}_${Date.now()}_${Math.random()}`,
      slot: loot.slot,
      icon: loot.icon,
      rarity: loot.rarity,
      stats: statRolls[loot.slot] || {},
      name: `${RARITY_NAMES[loot.rarity]}${loot.slot === 'weapon' ? '武器' : loot.slot === 'armor' ? '防具' : 'アクセ'}`
    };

    window.Lobby.addItem(item);

    const screenX = loot.x - game.cameraX;
    const screenY = loot.y;
    FX.burst(screenX, screenY, {n: 18, color: RARITY_COLORS[loot.rarity], speed: 150, life: 1, size: 4, glow: true});
    FX.text(game.hero.x - game.cameraX, game.hero.y - 80, `獲得 ${item.name}`, {color: RARITY_COLORS[loot.rarity], size: 20});
  }

  function gameOver(win) {
    FX.running = false;
    const elapsedTime = Math.floor(FX.time - game.startTime);
    
    let stars = 0;
    if (win) {
      stars = 3;
      if (game.stats.hp < game.stats.maxHp * 0.4) stars = 2;
      if (game.stats.hp < game.stats.maxHp * 0.15) stars = 1;
    }

    setTimeout(() => {
      window.Lobby.reportResult({
        stage: game.sel ? game.sel.stage : 0,
        stars: stars,
        coins: game.coins,
        gems: game.gems,
        score: game.kills * 100 + game.coins + game.gems * 50,
        kills: game.kills,
        time: elapsedTime,
        level: game.level,
        missionsProgress: {}
      });
    }, 600);
  }

  function startRun(sel) {
    game.sel = sel;
    game.mode = sel.mode;
    game.maxRoom = sel.mode === 'story' ? 5 : 999;
    game.startTime = FX.time;
    game.kills = 0;
    
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
      size: 110,
      right: 20,
      bottom: 20,
      key: 'KeyJ',
      cd: 0,
      hold: true,
      onPress: () => {
        if (attackBtn.down && FX.running && !FX.paused && game.hero) game.hero.attack();
      }
    });

    const skill1Btn = FX.button({
      icon: 'item-star',
      color: '#fbbf24',
      size: 76,
      right: 160,
      bottom: 10,
      key: 'KeyK',
      cd: 7,
      onPress: () => {
        if (FX.running && !FX.paused && game.hero) game.hero.skill1();
      }
    });

    const skill2Btn = FX.button({
      icon: 'item-ice',
      color: '#60a5fa',
      size: 76,
      right: 140,
      bottom: 110,
      key: 'KeyL',
      cd: 6,
      onPress: () => {
        if (FX.running && !FX.paused && game.hero) game.hero.skill2();
      }
    });

    const skill3Btn = FX.button({
      icon: 'item-heart',
      color: '#4ade80',
      size: 76,
      right: 60,
      bottom: 160,
      key: 'KeyI',
      cd: 18,
      onPress: () => {
        if (FX.running && !FX.paused && game.hero) game.hero.skill3();
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

        if (dist < 55) {
          game.hero.takeDamage(b.damage);
          return false;
        }
      }

      return b.life > 0;
    });

    game.loot = game.loot.filter(loot => {
      if (loot.collected) return false;

      loot.z += loot.vz * dt;
      loot.vz -= 850 * dt;
      if (loot.z < 0) {
        loot.z = 0;
        loot.vz = 0;
      }

      if (loot.z === 0 && game.hero) {
        loot.bobTime += dt;
        const dx = loot.x - game.hero.x;
        const dy = loot.y - game.hero.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 80) {
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
      layers.push({img: a.prop, speed: 0.6, y: 340, h: 200, gap: 480, alpha: 0.95});
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
        
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#00000080';
        ctx.beginPath();
        ctx.ellipse(loot.x, loot.y, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const bob = Math.sin(loot.bobTime * 3.5) * 10;
        const h = 56;
        
        ctx.save();
        ctx.shadowColor = RARITY_COLORS[loot.rarity];
        ctx.shadowBlur = 18;
        FX.drawSprite(ctx, FX.img(loot.icon), loot.x, loot.y - loot.z - bob, h, {glow: true});
        ctx.restore();

        if (loot.z === 0 && Math.floor(FX.time * 10) % 10 < 2) {
          const trailX = loot.x + FX.rand(-12, 12) - game.cameraX;
          const trailY = loot.y - 25 + FX.rand(-8, 8);
          FX.trail(trailX, trailY, RARITY_COLORS[loot.rarity], 2.5);
        }
      }
    });

    if (game.bullets) {
      game.bullets.forEach(b => {
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
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
    'whale-idle', 'whale-run', 'whale-attack', 'whale-cast', 'whale-jump',
    'side-mo-idle', 'side-mo-run', 'side-mo-attack', 'side-mo-jump',
    'side-li-idle', 'side-li-run', 'side-li-attack', 'side-li-jump',
    'side-xing-idle', 'side-xing-run', 'side-xing-attack', 'side-xing-jump',
    'side-hu-idle', 'side-hu-run', 'side-hu-attack', 'side-hu-jump'
  ];

  FX.load(assets).then(() => {
    const skins = [];
    CHARS.forEach(char => {
      skins.push(
        {char: char.id, id: 'default', name: 'デフォルト', filter: '', rarity: 'N', vip: false},
        {char: char.id, id: 'flame', name: '烈焰', filter: 'hue-rotate(25deg) saturate(1.4)', rarity: 'R', vip: false},
        {char: char.id, id: 'frost', name: '冰霜', filter: 'hue-rotate(185deg) saturate(1.3)', rarity: 'SR', vip: false},
        {char: char.id, id: 'galaxy', name: '星河', filter: 'hue-rotate(270deg) saturate(1.6) brightness(1.15)', rarity: 'SSR', vip: true}
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
        img: (c.sideImg==='whale'?'':'side-')+`${c.sideImg}-idle`,
        chibi: `${c.sideImg === 'whale' ? 'lan' : c.sideImg}-chibi`,
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
