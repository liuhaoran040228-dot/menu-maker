(function() {
  const FX = window.FX;
  const Lobby = window.Lobby;

  let state = {
    round: 0,
    stage: 0,
    mode: 'story',
    char: null,
    skin: null,
    stats: null,
    heroMaxHp: 100,
    heroHp: 100,
    enemyMaxHp: 100,
    enemyHp: 100,
    meter: 0,
    maxMeter: 100,
    time: 60,
    combo: 0,
    comboTime: 0,
    gameActive: true,
    roundStart: 0,
  };

  const stages = [
    { id: 'arena', name: '竞技场', bg: 'bg-arena', enemy: 'lan', ai: 'rush', boss: false },
    { id: 'neon', name: '霓虹城', bg: 'bg-neon', enemy: 'mo', ai: 'zone', boss: false },
    { id: 'moon', name: '月球基地', bg: 'bg-moon', enemy: 'li', ai: 'grapple', boss: true },
    { id: 'sakura', name: '樱花谷', bg: 'bg-sakura', enemy: 'xing', ai: 'counter', boss: false },
    { id: 'station', name: '空间站', bg: 'bg-station', enemy: 'hu', ai: 'rush', boss: true },
  ];

  const charStats = {
    lan: { hp: 100, atk: 10, spd: 1.0, img: 'lan-chibi' },
    mo: { hp: 110, atk: 9, spd: 0.95, img: 'mo-chibi' },
    li: { hp: 95, atk: 11, spd: 1.05, img: 'li-chibi' },
    xing: { hp: 100, atk: 10, spd: 1.0, img: 'xing-chibi' },
    hu: { hp: 105, atk: 10, spd: 0.98, img: 'hu-chibi' },
  };

  let hero = {
    x: 0,
    y: 470,
    vx: 0,
    vy: 0,
    h: 180,
    grounded: false,
    facing: 1,
    state: 'idle',
    stateTime: 0,
    attacking: false,
    combo: 0,
    comboTime: 0,
    invulnTime: 0,
    knockbackX: 0,
    knockbackY: 0,
    jumpHeld: false,
    lastAttackTime: 0,
    specialCd: 0,
    dashCd: 0,
    ultimateActive: false,
    ultimateTime: 0,
    casting: false,
    castTime: 0,
    afterimageTrail: [],
  };

  let enemy = {
    x: 0,
    y: 470,
    vx: 0,
    vy: 0,
    h: 180,
    grounded: false,
    facing: -1,
    state: 'idle',
    stateTime: 0,
    attacking: false,
    invulnTime: 0,
    knockbackX: 0,
    knockbackY: 0,
    aiTime: 0,
    aiState: 'idle',
    projectiles: [],
    isBoss: false,
    bossPhase: 0,
    bossAttackCd: 0,
    afterimageTrail: [],
  };

  let projectiles = [];
  let hud = { hp1Chip: 0, hp2Chip: 0, comboShown: false, comboScale: 1 };

  const config = {
    gravity: 1200,
    moveSpeed: 320,
    jumpPower: 850,
    friction: 0.82,
    airFriction: 0.93,
    attackRange: 100,
    knockbackDampen: 0.85,
  };

  function startRun(sel) {
    state.stage = sel.stage || 0;
    state.mode = sel.mode || 'story';
    state.char = sel.char;
    state.skin = sel.skin?.filter || '';
    state.stats = sel.stats || { hp: 1, atk: 1, spd: 1 };

    const base = charStats[sel.char];
    const statScale = state.stats;
    state.heroMaxHp = Math.floor(base.hp * (statScale.hp || 1));
    state.heroHp = state.heroMaxHp;
    state.meter = 0;
    state.maxMeter = 100;
    state.combo = 0;
    state.time = 60;
    state.gameActive = true;
    state.roundStart = FX.time;

    const stageData = stages[state.stage % stages.length];
    const isBoss = stageData.boss;
    const _ids = Object.keys(charStats);
    const enemyChar = isBoss ? 'boss' : stageData.enemy;
    const enemyBase = isBoss ? { hp: 280, atk: 16, spd: 0.85, img: 'enemy-boss' } : charStats[stageData.enemy];
    const enemyStatScale = { hp: isBoss ? 1.3 : 1, atk: isBoss ? 1.2 : 1, spd: 1 };
    state.enemyMaxHp = Math.floor(enemyBase.hp * enemyStatScale.hp);
    state.enemyHp = state.enemyMaxHp;

    hero.x = FX.W * 0.25;
    hero.y = 470;
    hero.vx = 0;
    hero.vy = 0;
    hero.h = 180;
    hero.grounded = true;
    hero.facing = 1;
    hero.state = 'idle';
    hero.stateTime = 0;
    hero.combo = 0;
    hero.comboTime = 0;
    hero.invulnTime = 0;
    hero.knockbackX = 0;
    hero.specialCd = 0;
    hero.dashCd = 0;
    hero.ultimateActive = false;
    hero.ultimateTime = 0;
    hero.afterimageTrail = [];

    enemy.x = FX.W * 0.75;
    enemy.y = 470;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.h = isBoss ? 240 : 180;
    enemy.grounded = true;
    enemy.facing = -1;
    enemy.state = 'idle';
    enemy.stateTime = 0;
    enemy.invulnTime = 0;
    enemy.knockbackX = 0;
    enemy.isBoss = isBoss;
    enemy.bossPhase = 0;
    enemy.bossAttackCd = 0;
    enemy.aiTime = 0;
    enemy.projectiles = [];
    enemy.afterimageTrail = [];

    projectiles = [];
    hud.hp1Chip = state.heroHp;
    hud.hp2Chip = state.enemyHp;

    const bgLayer = stageData.bg;
    const propImg = stageData.id === 'neon' ? 'prop-lantern' :
                    stageData.id === 'moon' ? 'prop-crystal' :
                    stageData.id === 'sakura' ? 'prop-sakura' : 'prop-flowers';

    const charName = state.char;

    FX.hud(`
      <div class="chip" style="display:inline-block;">⚔ ${(state.stage + 1)}/5</div>
      <span class="chip" style="display:inline-block;">${charName}</span>
      <div class="fx-bar" id="hp1"><i></i></div>
      <span class="grow"></span>
      <div class="chip" style="display:inline-block;" id="timer">60</div>
      <span class="grow"></span>
      <div class="fx-bar" id="hp2"><i></i></div>
      <span class="chip" style="display:inline-block;" id="p2name">对手</span>
    `);

    FX.bar('hp1', state.heroHp / state.heroMaxHp);
    FX.bar('hp2', state.enemyHp / state.enemyMaxHp);

    FX.banner(`第 ${state.stage + 1} 轮 - ${stageData.name}`);

    const joystick = FX.joystick({ side: 'left' });
    const btnAttack = FX.button({
      icon: 'item-weapon',
      color: '#ff7cc8',
      size: 100,
      right: 28,
      bottom: 28,
      key: 'KeyJ',
      cd: 0.12,
      onPress: () => doAttack(),
      hold: false,
    });
    const btnSpecial = FX.button({
      icon: 'item-star',
      color: '#ffeb3b',
      size: 72,
      right: 148,
      bottom: 28,
      key: 'KeyK',
      cd: 2.8,
      onPress: () => doSpecial(),
      hold: false,
    });
    const btnDash = FX.button({
      icon: 'item-ice',
      color: '#00bfff',
      size: 72,
      right: 148,
      bottom: 124,
      key: 'KeyL',
      cd: 1.0,
      onPress: () => doDash(),
      hold: false,
    });
    const btnUltimate = FX.button({
      icon: 'item-heart',
      color: '#ff1493',
      size: 72,
      right: 64,
      bottom: 124,
      key: 'KeyU',
      cd: 0,
      onPress: () => doUltimate(),
      hold: false,
    });

    let pausePressed = false;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (!pausePressed) {
          pausePressed = true;
          Lobby.pauseMenu();
        }
      }
    });
    window.addEventListener('keyup', () => {
      pausePressed = false;
    });

    FX.loop(
      (dt) => {
        if (!state.gameActive || FX.paused) return;

        state.time -= dt;
        if (state.time <= 0) {
          state.time = 0;
          endRound();
        }

        const joystickState = joystick;
        const moveInput = joystickState.x;

        // Hero movement
        if (!hero.ultimateActive) {
          if (moveInput > 0.2) {
            hero.facing = 1;
            if (hero.grounded) hero.state = 'run';
            hero.vx = FX.lerp(hero.vx, config.moveSpeed * state.stats.spd, 0.12);
          } else if (moveInput < -0.2) {
            hero.facing = -1;
            if (hero.grounded) hero.state = 'run';
            hero.vx = FX.lerp(hero.vx, -config.moveSpeed * state.stats.spd, 0.12);
          } else {
            hero.vx *= config.friction;
          }

          if (joystickState.y > 0.5 && hero.grounded && hero.state !== 'jump') {
            hero.vy = -config.jumpPower;
            hero.grounded = false;
            hero.state = 'jump';
            FX.burst(hero.x, hero.y + hero.h * 0.3, { n: 20, color: '#ffcc00', speed: 300, life: 0.32, size: 7, gravity: 600 });
          }
        }

        // Gravity & floor collision for hero
        hero.vy += config.gravity * dt;
        hero.y += hero.vy * dt;
        if (hero.y >= 470) {
          hero.y = 470;
          hero.vy = 0;
          hero.grounded = true;
          if (hero.state === 'jump' || hero.state === 'fall') hero.state = 'idle';
        } else {
          hero.grounded = false;
          if (hero.vy > 0 && hero.state !== 'jump') hero.state = 'fall';
        }

        // Gravity & floor collision for enemy
        enemy.vy += config.gravity * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.y >= 470) {
          enemy.y = 470;
          enemy.vy = 0;
          enemy.grounded = true;
        } else {
          enemy.grounded = false;
        }

        // Knockback
        hero.x += hero.knockbackX * dt;
        hero.knockbackX *= config.knockbackDampen;
        if (Math.abs(hero.knockbackX) < 8) hero.knockbackX = 0;

        enemy.x += enemy.knockbackX * dt;
        enemy.knockbackX *= config.knockbackDampen;
        if (Math.abs(enemy.knockbackX) < 8) enemy.knockbackX = 0;

        // Clamp positions
        hero.x = Math.max(60, Math.min(FX.W - 60, hero.x));
        enemy.x = Math.max(60, Math.min(FX.W - 60, enemy.x));

        // Invulnerability
        if (hero.invulnTime > 0) hero.invulnTime -= dt;
        if (enemy.invulnTime > 0) enemy.invulnTime -= dt;

        // Combo decay
        if (state.comboTime > 0) {
          state.comboTime -= dt;
        } else {
          state.combo = 0;
        }

        // Cooldowns
        if (hero.specialCd > 0) hero.specialCd -= dt;
        if (hero.dashCd > 0) hero.dashCd -= dt;
        if (hero.lastAttackTime > 0) hero.lastAttackTime -= dt;

        // Ultimate
        if (hero.ultimateActive) {
          hero.ultimateTime -= dt;
          if (hero.ultimateTime <= 0) {
            hero.ultimateActive = false;
            hero.state = 'idle';
            FX.flash('#ffffff', 0.25);
          }
        }

        // Enemy AI
        updateEnemyAI(dt, stageData);

        // Update projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 420 * dt;
          p.life -= dt;

          if (p.life <= 0) {
            projectiles.splice(i, 1);
            continue;
          }

          const dist = Math.hypot(p.x - hero.x, p.y - hero.y);
          if (dist < 45 && hero.invulnTime <= 0) {
            onHitHero(p.dmg, p.x, 0);
            projectiles.splice(i, 1);
            FX.burst(p.x, p.y, { n: 28, color: '#ff6b6b', speed: 450, life: 0.42, size: 9, glow: true });
            FX.shake(5);
            FX.hitstop(0.09);
          }
        }

        // Meter gain
        state.meter = Math.min(state.maxMeter, state.meter + 0.6 * dt);

        hero.stateTime += dt;
        enemy.stateTime += dt;

        // Afterimage trails
        if (hero.dashCd > 0.8 && hero.dashCd < 1.0) {
          hero.afterimageTrail.push({
            x: hero.x,
            y: hero.y,
            facing: hero.facing,
            state: hero.state,
            age: 0,
            maxAge: 0.15,
          });
        }
      },
      (ctx) => {
        const { W, H } = FX;

        // Parallax background
        const stageData = stages[state.stage % stages.length];
        const parallaxLayers = [
          { img: stageData.bg, speed: 0.2, y: 0, h: 540, alpha: 1 },
        ];
        if (stageData.id === 'neon') {
          parallaxLayers.push({ img: 'prop-lantern', speed: 0.6, y: 300, h: 220, gap: 420, alpha: 0.85 });
        } else if (stageData.id === 'moon') {
          parallaxLayers.push({ img: 'prop-crystal', speed: 0.6, y: 300, h: 220, gap: 420, alpha: 0.85 });
        } else if (stageData.id === 'sakura') {
          parallaxLayers.push({ img: 'prop-sakura', speed: 0.6, y: 300, h: 220, gap: 420, alpha: 0.85 });
        } else {
          parallaxLayers.push({ img: 'prop-flowers', speed: 0.55, y: 310, h: 210, gap: 400, alpha: 0.8 });
        }
        FX.parallax(ctx, parallaxLayers, 0);
        FX.motes(ctx, '#ffffff');

        // Floor
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 495);
        ctx.lineTo(W, 495);
        ctx.stroke();

        // Draw ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(hero.x, 505, 50, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(enemy.x, 505, 50, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw projectiles
        for (const p of projectiles) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 1));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          if (p.glow) {
            ctx.fillStyle = p.color + '40';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + 6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Draw enemy afterimage trail
        for (let i = enemy.afterimageTrail.length - 1; i >= 0; i--) {
          const trail = enemy.afterimageTrail[i];
          trail.age += 1 / 60;
          const alpha = 1 - (trail.age / trail.maxAge);
          if (alpha <= 0) {
            enemy.afterimageTrail.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.globalAlpha = alpha * 0.3;
          const enemyImg = enemy.isBoss ? FX.img('enemy-boss') : FX.img(charStats[stageData.enemy].img);
          FX.drawSprite(ctx, enemyImg, trail.x, trail.y, enemy.h, { sx: trail.facing * 0.95, sy: 0.95 });
          ctx.restore();
        }

        // Draw enemy
        const enemyImg = enemy.isBoss ? FX.img('enemy-boss') : FX.img(charStats[stageData.enemy].img);
        let enemyFilter = '';
        if (enemy.isBoss) {
          const hue = 30 + Math.sin(FX.time * 1.5) * 12;
          enemyFilter = `hue-rotate(${hue}deg) saturate(1.1)`;
        }
        ctx.filter = enemyFilter;

        const bobPhase = Math.sin(enemy.stateTime * 2.8) * 0.04;
        const enemyScaleX = enemy.facing * (1 + bobPhase * 0.5);
        const enemyScaleY = 1 + bobPhase * 0.3;
        FX.drawSprite(ctx, enemyImg, enemy.x, enemy.y, enemy.h, { sx: enemyScaleX, sy: enemyScaleY });

        if (enemy.invulnTime > 0 && Math.floor(enemy.invulnTime * 12) % 2 === 0) {
          ctx.filter = 'brightness(2.2) ' + enemyFilter;
          FX.drawSprite(ctx, enemyImg, enemy.x, enemy.y, enemy.h, { sx: enemyScaleX * 0.98, sy: enemyScaleY * 0.98 });
        }

        // Draw hero afterimage trail
        for (let i = hero.afterimageTrail.length - 1; i >= 0; i--) {
          const trail = hero.afterimageTrail[i];
          trail.age += 1 / 60;
          const alpha = 1 - (trail.age / trail.maxAge);
          if (alpha <= 0) {
            hero.afterimageTrail.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.globalAlpha = alpha * 0.35;
          ctx.filter = state.skin || '';
          const heroImg = FX.img('whale-' + (trail.state === 'run' ? 'run' : trail.state === 'jump' ? 'jump' : trail.state === 'attack' ? 'attack' : trail.state === 'cast' ? 'cast' : 'idle'));
          FX.drawSprite(ctx, heroImg, trail.x, trail.y, hero.h, { sx: trail.facing * 0.95, sy: 0.95 });
          ctx.restore();
        }

        // Draw hero
        ctx.filter = state.skin || '';
        const heroAnimState = hero.state === 'run' ? 'run' : hero.state === 'jump' ? 'jump' : hero.state === 'attack' ? 'attack' : hero.state === 'cast' ? 'cast' : 'idle';
        const heroImg = FX.img('whale-' + heroAnimState);

        const heroBob = Math.sin(hero.stateTime * 3) * 0.05;
        const heroScaleX = hero.facing * (1 + heroBob * 0.5);
        const heroScaleY = 1 + heroBob * 0.3;
        FX.drawSprite(ctx, heroImg, hero.x, hero.y, hero.h, { sx: heroScaleX, sy: heroScaleY });

        if (hero.invulnTime > 0 && Math.floor(hero.invulnTime * 12) % 2 === 0) {
          ctx.filter = 'brightness(2.2) ' + (state.skin || '');
          FX.drawSprite(ctx, heroImg, hero.x, hero.y, hero.h, { sx: heroScaleX * 0.98, sy: heroScaleY * 0.98 });
        }

        ctx.filter = 'none';

        // HP bars
        const hpBarX = 28, hpBarY = 16, hpBarW = 140, hpBarH = 14;
        const hpBarX2 = W - 28 - hpBarW;

        hud.hp1Chip = FX.lerp(hud.hp1Chip, state.heroHp, 0.12);
        hud.hp2Chip = FX.lerp(hud.hp2Chip, state.enemyHp, 0.12);

        // P1 bar bg
        ctx.fillStyle = 'rgba(40,40,60,0.7)';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
        // Delayed HP (yellow)
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(hpBarX, hpBarY, (hud.hp1Chip / state.heroMaxHp) * hpBarW, hpBarH);
        // Current HP (red)
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(hpBarX, hpBarY, (state.heroHp / state.heroMaxHp) * hpBarW, hpBarH);

        // P2 bar bg
        ctx.fillStyle = 'rgba(40,40,60,0.7)';
        ctx.fillRect(hpBarX2, hpBarY, hpBarW, hpBarH);
        // Delayed HP (yellow)
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(hpBarX2, hpBarY, (hud.hp2Chip / state.enemyMaxHp) * hpBarW, hpBarH);
        // Current HP (red)
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(hpBarX2, hpBarY, (state.enemyHp / state.enemyMaxHp) * hpBarW, hpBarH);

        // Meter bar (below P1 HP)
        const meterY = hpBarY + hpBarH + 5;
        ctx.fillStyle = 'rgba(30,30,50,0.8)';
        ctx.fillRect(hpBarX, meterY, hpBarW, 9);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(hpBarX, meterY, (state.meter / state.maxMeter) * hpBarW, 9);
        if (state.meter >= state.maxMeter) {
          ctx.fillStyle = '#ff1493';
          ctx.fillRect(hpBarX, meterY, hpBarW, 9);
          ctx.fillStyle = '#ffeb3b';
          ctx.fillRect(hpBarX, meterY + 3, 4, 3);
        }

        // Timer
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.textContent = Math.ceil(state.time);

        // Combo display
        if (state.combo > 0) {
          const comboEl = document.getElementById('combo');
          if (!comboEl) {
            const el = document.createElement('div');
            el.id = 'combo';
            el.style.cssText = 'position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);font-size:32px;font-weight:bold;color:#ffeb3b;text-shadow:0 0 20px #ffaa00,0 0 40px #ff7700;pointer-events:none;z-index:9999;font-family:sans-serif;';
            document.body.appendChild(el);
          }
          const comboEl2 = document.getElementById('combo');
          comboEl2.textContent = `✕${state.combo} HIT`;
          comboEl2.style.opacity = state.comboTime > 0 ? '1' : '0';
          const scale = 1 + FX.ease.outBack(Math.min(1, 1 - state.comboTime / 1.5)) * 0.25;
          comboEl2.style.transform = `translate(-50%,-50%) scale(${scale})`;
        }

        FX.drawFX(ctx);
        FX.vignette(ctx);
      }
    );

    FX.running = true;
  }

  function updateEnemyAI(dt, stageData) {
    const dist = Math.hypot(enemy.x - hero.x, enemy.y - hero.y);
    const dirToHero = Math.sign(hero.x - enemy.x);

    if (enemy.isBoss) {
      enemy.aiTime += dt;
      const phaseThresh = state.enemyMaxHp * 0.5;
      if (state.enemyHp < phaseThresh && enemy.bossPhase === 0) {
        enemy.bossPhase = 1;
        enemy.bossAttackCd = 0;
        FX.banner('首领强化！');
      }

      const aggression = enemy.bossPhase === 1 ? 1.3 : 1;
      if (enemy.aiTime > (2.5 / aggression)) {
        enemy.aiTime = 0;
        const choice = Math.floor(Math.random() * 4);

        if (choice === 0 && dist > 110) {
          enemy.vx = dirToHero * config.moveSpeed * 0.75;
          enemy.facing = dirToHero;
          enemy.state = 'run';
        } else if (choice === 1) {
          const dmg = FX.rand(12, 18) * (enemy.bossPhase === 1 ? 1.2 : 1);
          FX.ring(enemy.x, enemy.y - enemy.h * 0.4, { color: '#ff6b9d', r: 100, life: 0.35 });
          FX.burst(enemy.x, enemy.y - enemy.h * 0.4, { n: 42, color: '#ff6b6b', speed: 500, life: 0.5, size: 11, glow: true, gravity: 300 });
          onHitHero(dmg, enemy.x, 170 * dirToHero);
          FX.shake(7);
          FX.hitstop(0.14);
        } else if (choice === 2) {
          for (let i = 0; i < (enemy.bossPhase === 1 ? 6 : 4); i++) {
            projectiles.push({
              x: enemy.x,
              y: enemy.y - enemy.h * 0.3,
              vx: FX.rand(-180, 180),
              vy: FX.rand(-280, -80),
              size: 7,
              color: '#ff1493',
              dmg: FX.rand(5, 8),
              life: 3.5,
              maxLife: 3.5,
              glow: true,
            });
          }
        } else {
          enemy.vx = dirToHero * config.moveSpeed * 1.2;
          enemy.facing = dirToHero;
        }
      }
    } else {
      enemy.aiTime += dt;
      const aiType = stageData.ai || 'rush';

      if (aiType === 'rush') {
        if (enemy.aiTime > 1.3 && dist > 90) {
          enemy.vx = dirToHero * config.moveSpeed * 0.9;
          enemy.facing = dirToHero;
          enemy.state = 'run';
        } else if (enemy.aiTime > 3.2) {
          enemy.aiTime = 0;
          const dmg = FX.rand(8, 12);
          onHitHero(dmg, enemy.x, 160 * dirToHero);
          FX.shake(5);
          FX.hitstop(0.1);
        }
      } else if (aiType === 'zone') {
        if (dist < 280 && enemy.aiTime > 1.4) {
          projectiles.push({
            x: enemy.x,
            y: enemy.y - 50,
            vx: dirToHero * 280,
            vy: FX.rand(-120, 100),
            size: 6,
            color: '#ffeb3b',
            dmg: FX.rand(6, 9),
            life: 2.8,
            maxLife: 2.8,
            glow: true,
          });
          enemy.aiTime = 0;
        }
        if (dist > 120) {
          enemy.vx = FX.lerp(enemy.vx, dirToHero * config.moveSpeed * 0.6, 0.1);
        }
      } else if (aiType === 'grapple') {
        if (dist > 140 && enemy.aiTime > 1.2) {
          enemy.vx = dirToHero * config.moveSpeed * 1.15;
          enemy.facing = dirToHero;
          enemy.state = 'run';
        } else if (dist < 140 && enemy.aiTime > 2.5) {
          enemy.aiTime = 0;
          const dmg = FX.rand(11, 15);
          onHitHero(dmg, enemy.x, 210 * dirToHero);
          FX.shake(6);
          FX.hitstop(0.13);
        }
      } else if (aiType === 'counter') {
        if (dist > 160 && enemy.aiTime > 1.1) {
          enemy.vx = dirToHero * config.moveSpeed * 0.85;
          enemy.facing = dirToHero;
        } else if (dist < 160 && enemy.aiTime > 2.8) {
          enemy.aiTime = 0;
          const dmg = FX.rand(7, 11);
          onHitHero(dmg, enemy.x, 140 * dirToHero);
          FX.shake(4);
          FX.hitstop(0.09);
        }
      }
    }

    enemy.vx *= config.friction;
    enemy.x += enemy.vx * dt;
    enemy.x = Math.max(60, Math.min(FX.W - 60, enemy.x));
  }

  function doAttack() {
    if (!state.gameActive || hero.ultimateActive || !FX.running || FX.paused) return;

    hero.state = 'attack';
    hero.stateTime = 0;
    hero.lastAttackTime = 0.08;

    const dist = Math.abs(enemy.x - hero.x);
    if (dist < config.attackRange + 80) {
      const baseDmg = FX.rand(9, 13);
      const dmg = baseDmg * state.stats.atk;
      onHitEnemy(dmg, hero.x, 160 * hero.facing);
      state.combo++;
      state.comboTime = 1.8;
      state.meter = Math.min(state.maxMeter, state.meter + 18);
      FX.hitstop(0.08);
    }

    FX.burst(hero.x + 70 * hero.facing, hero.y - 40, { n: 26, color: '#ff7cc8', speed: 380, life: 0.35, size: 7, glow: true });
  }

  function doSpecial() {
    if (!state.gameActive || hero.specialCd > 0 || hero.ultimateActive || !FX.running || FX.paused) return;

    hero.state = 'cast';
    hero.specialCd = 2.8;
    hero.casting = true;
    hero.castTime = 0.5;

    projectiles.push({
      x: hero.x + 70 * hero.facing,
      y: hero.y - 60,
      vx: hero.facing * 420,
      vy: FX.rand(-40, 60),
      size: 8,
      color: '#ffeb3b',
      dmg: FX.rand(7, 11),
      life: 2.2,
      maxLife: 2.2,
      glow: true,
    });

    FX.burst(hero.x + 70 * hero.facing, hero.y - 40, { n: 35, color: '#ffeb3b', speed: 450, life: 0.42, size: 9, glow: true, gravity: 280 });
    state.meter = Math.max(0, state.meter - 25);
  }

  function doDash() {
    if (!state.gameActive || hero.dashCd > 0 || hero.ultimateActive || !FX.running || FX.paused) return;

    hero.dashCd = 1.0;
    hero.vx = hero.facing * 650;
    hero.invulnTime = 0.32;

    for (let i = 0; i < 8; i++) {
      FX.burst(hero.x + FX.rand(-40, 40), hero.y + FX.rand(-35, 35), {
        n: 3,
        color: '#00bfff',
        speed: 120,
        life: 0.45,
        size: 3,
        gravity: 200,
      });
    }

    FX.shake(3);
  }

  function doUltimate() {
    if (!state.gameActive || state.meter < state.maxMeter || hero.ultimateActive || !FX.running || FX.paused) return;

    hero.ultimateActive = true;
    hero.ultimateTime = 0.95;
    state.meter = 0;

    FX.flash('#ff1493', 0.5);
    FX.shake(9);

    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const baseDmg = FX.rand(18, 28);
        const dmg = baseDmg * state.stats.atk;
        onHitEnemy(dmg, enemy.x, 220 * hero.facing);
        FX.burst(enemy.x, enemy.y, { n: 50, color: '#ff1493', speed: 580, life: 0.55, size: 11, glow: true, gravity: 250 });
        FX.shake(7);
        FX.ring(enemy.x, enemy.y, { color: '#ff1493', r: 110, life: 0.45 });
      }, i * 140);
    }
  }

  function onHitHero(dmg, x, knockback) {
    if (hero.invulnTime > 0) return;

    const trueDmg = Math.round(dmg);
    state.heroHp = Math.max(0, state.heroHp - trueDmg);
    hero.invulnTime = 0.16;
    hero.knockbackX = knockback;

    FX.text(x, 380, trueDmg, { color: '#ff3333', size: 32, crit: dmg > 13 });
    FX.burst(hero.x, hero.y, { n: 20, color: '#ff6b6b', speed: 320, life: 0.35, size: 7, gravity: 400 });

    if (state.heroHp <= 0) {
      endRound();
    }
  }

  function onHitEnemy(dmg, x, knockback) {
    if (enemy.invulnTime > 0) return;

    const trueDmg = Math.round(dmg);
    state.enemyHp = Math.max(0, state.enemyHp - trueDmg);
    enemy.invulnTime = 0.16;
    enemy.knockbackX = knockback;

    FX.text(x, 320, trueDmg, { color: '#ffff00', size: 32, crit: dmg > 16 });
    FX.burst(enemy.x, enemy.y, { n: 20, color: '#ffeb3b', speed: 320, life: 0.35, size: 7, glow: true, gravity: 400 });

    if (state.enemyHp <= 0) {
      endRound();
    }
  }

  function endRound() {
    state.gameActive = false;
    FX.running = false;

    const won = state.enemyHp <= 0;
    const stars = won ? (state.time > 25 ? 3 : state.time > 12 ? 2 : 1) : 0;
    const coins = won ? FX.rand(60, 160) : FX.rand(15, 35);
    const gems = won && stars === 3 ? FX.rand(8, 18) : 0;

    if (won) {
      FX.banner('K.O.!');
      FX.flash('#ffeb3b', 0.45);
      FX.shake(12);
    } else {
      FX.banner('败北');
      FX.flash('#ff3333', 0.35);
    }

    setTimeout(() => {
      Lobby.reportResult({
        stage: state.stage,
        stars,
        coins,
        gems,
      });
    }, 1600);
  }

  FX.init({ landscape: true, logicalH: 540 });

  const assets = [
    'bg-arena', 'bg-neon', 'bg-moon', 'bg-sakura', 'bg-station',
    'whale-idle', 'whale-run', 'whale-jump', 'whale-attack', 'whale-cast',
    'lan-chibi', 'mo-chibi', 'li-chibi', 'xing-chibi', 'hu-chibi',
    'enemy-boss',
    'item-weapon', 'item-star', 'item-ice', 'item-heart',
    'prop-lantern', 'prop-crystal', 'prop-sakura', 'prop-flowers',
  ];

  FX.load(assets).then(() => {
    Lobby.init({
      id: 'moetai',
      title: '萌娘星光擂台',
      orientation: 'landscape',
      bg: ['bg-neon'],
      modes: [{ id: 'story', name: '故事模式' }],
      stages: stages.slice(0, 5).map((s, i) => ({ id: s.id, name: `第 ${i + 1} 轮：${s.name}` })),
      chars: [
        { id: 'lan', name: '蓝蓝', img: 'lan-chibi', hp: 100, atk: 10, spd: 1.0 },
        { id: 'mo', name: '墨儿', img: 'mo-chibi', hp: 110, atk: 9, spd: 0.95 },
        { id: 'li', name: '丽云', img: 'li-chibi', hp: 95, atk: 11, spd: 1.05 },
        { id: 'xing', name: '星星', img: 'xing-chibi', hp: 100, atk: 10, spd: 1.0 },
        { id: 'hu', name: '胡桃', img: 'hu-chibi', hp: 105, atk: 10, spd: 0.98 },
      ],
      skins: [
        { id: 'normal', name: '标准', filter: '' },
        { id: 'fire', name: '烈焰', filter: 'hue-rotate(20deg) saturate(1.3)' },
        { id: 'ice', name: '冰霜', filter: 'hue-rotate(200deg) saturate(1.2)', vip: true },
      ],
      currency: [
        { id: 'coin', icon: 'item-chest' },
        { id: 'gem', icon: 'item-star' },
      ],
      onStart: (sel) => startRun(sel),
      onQuit: () => {
        FX.running = false;
      },
    });
  });
  window.__game = {
    state: () => ({
      hero: { x: hero.x, y: hero.y, hp: state.heroHp },
      enemy: { x: enemy.x, y: enemy.y, vx: enemy.vx, vy: enemy.vy, hp: state.enemyHp, state: enemy.state },
      W: FX.W,
      H: FX.H,
    }),
  };
})();

FX.useSideSprites('idle');
