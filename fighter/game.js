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
    { id: 'arena', name: '竞技场', bg: 'bg-arena', enemy: 'lan', ai: 'rush' },
    { id: 'neon', name: '霓虹城', bg: 'bg-neon', enemy: 'mo', ai: 'zone' },
    { id: 'moon', name: '月球基地', bg: 'bg-moon', enemy: 'li', ai: 'grapple' },
    { id: 'sakura', name: '樱花谷', bg: 'bg-sakura', enemy: 'xing', ai: 'counter' },
    { id: 'station', name: '空间站', bg: 'bg-station', enemy: 'hu', ai: 'rush' },
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
    h: 190,
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
  };

  let enemy = {
    x: 0,
    y: 470,
    vx: 0,
    vy: 0,
    h: 190,
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
  };

  let projectiles = [];
  let hud = { hp1Chip: 0, hp2Chip: 0, comboShown: false, comboScale: 1 };

  const config = {
    gravity: 1200,
    moveSpeed: 300,
    jumpPower: 800,
    friction: 0.85,
    airFriction: 0.95,
    attackRange: 80,
    knockbackDampen: 0.88,
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
    const isBoss = (state.stage + 1) % 3 === 0;
    const _ids = Object.keys(charStats); if (!isBoss && stageData.enemy === state.char) stageData.enemy = _ids[(_ids.indexOf(state.char) + 1) % _ids.length];
    const enemyChar = isBoss ? 'boss' : stageData.enemy;
    const enemyBase = isBoss ? { hp: 250, atk: 15, spd: 0.9, img: 'enemy-boss' } : charStats[enemyChar];
    const enemyStatScale = { hp: isBoss ? 1.2 : 1, atk: isBoss ? 1.1 : 1, spd: 1 };
    state.enemyMaxHp = Math.floor(enemyBase.hp * enemyStatScale.hp);
    state.enemyHp = state.enemyMaxHp;

    hero.x = FX.W * 0.3;
    hero.y = 470;
    hero.vx = 0;
    hero.vy = 0;
    hero.h = 190;
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

    enemy.x = FX.W * 0.7;
    enemy.y = 470;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.h = isBoss ? 260 : 190;
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

    projectiles = [];
    hud.hp1Chip = state.heroHp;
    hud.hp2Chip = state.enemyHp;

    const bgLayer = stageData.bg;
    const propImg = stageData.id === 'neon' ? 'prop-lantern' :
                    stageData.id === 'moon' ? 'prop-crystal' :
                    stageData.id === 'sakura' ? 'prop-sakura' : null;

    const parallaxLayers = [
      { img: bgLayer, speed: 0.2, y: 0, h: 540, alpha: 1 },
    ];
    if (propImg) {
      parallaxLayers.push({ img: propImg, speed: 0.6, y: 320, h: 180, gap: 420, alpha: 0.9 });
    }

    FX.hud(`
      <div class="chip" id="round">⚔ ${(state.stage + 1)}/5</div>
      <span class="chip" id="p1name">蓝蓝</span>
      <div class="fx-bar" id="hp1"><i></i></div>
      <div class="grow"></div>
      <div class="chip" id="timer">60</div>
      <div id="roundpips" style="text-align:center;font-size:12px;color:#fff;margin-top:4px;">●●●●●</div>
      <div class="grow"></div>
      <div class="fx-bar" id="hp2"><i></i></div>
      <span class="chip" id="p2name">对手</span>
    `);

    FX.bar('hp1', state.heroHp / state.heroMaxHp);
    FX.bar('hp2', state.enemyHp / state.enemyMaxHp);

    FX.banner(`第 ${state.stage + 1} 轮 - ${stageData.name}`);

    const joystick = FX.joystick({ side: 'left' });
    const btnAttack = FX.button({
      icon: 'item-weapon',
      color: '#ff7cc8',
      size: 100,
      right: 30,
      bottom: 30,
      key: 'KeyJ',
      cd: 0.15,
      onPress: () => doAttack(),
      hold: false,
    });
    const btnSpecial = FX.button({
      icon: 'item-star',
      color: '#ffeb3b',
      size: 72,
      right: 160,
      bottom: 30,
      key: 'KeyK',
      cd: 3,
      onPress: () => doSpecial(),
      hold: false,
    });
    const btnDash = FX.button({
      icon: 'item-ice',
      color: '#00bfff',
      size: 72,
      right: 160,
      bottom: 120,
      key: 'KeyL',
      cd: 1.2,
      onPress: () => doDash(),
      hold: false,
    });
    const btnUltimate = FX.button({
      icon: 'item-heart',
      color: '#ff1493',
      size: 72,
      right: 70,
      bottom: 120,
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
        hero.jumpHeld = joystickState.y > 0.5;
        const moveInput = joystickState.x;

        // Hero movement
        if (!hero.ultimateActive) {
          if (moveInput > 0.2) {
            hero.facing = 1;
            if (hero.grounded) hero.state = 'run';
            hero.vx = FX.lerp(hero.vx, config.moveSpeed * state.stats.spd, 0.15);
          } else if (moveInput < -0.2) {
            hero.facing = -1;
            if (hero.grounded) hero.state = 'run';
            hero.vx = FX.lerp(hero.vx, -config.moveSpeed * state.stats.spd, 0.15);
          } else {
            hero.vx *= config.friction;
          }

          if (joystickState.y > 0.5 && hero.grounded && hero.state !== 'jump') {
            hero.vy = -config.jumpPower;
            hero.grounded = false;
            hero.state = 'jump';
            FX.burst(hero.x, hero.y + hero.h * 0.3, { n: 18, color: '#ffcc00', speed: 280, life: 0.3, size: 6 });
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
        if (Math.abs(hero.knockbackX) < 10) hero.knockbackX = 0;

        enemy.x += enemy.knockbackX * dt;
        enemy.knockbackX *= config.knockbackDampen;
        if (Math.abs(enemy.knockbackX) < 10) enemy.knockbackX = 0;

        // Clamp positions
        hero.x = Math.max(50, Math.min(FX.W - 50, hero.x));
        enemy.x = Math.max(50, Math.min(FX.W - 50, enemy.x));

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
            FX.flash('#ffffff', 0.3);
          }
        }

        // Enemy AI
        updateEnemyAI(dt, stageData);

        // Update projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 400 * dt;
          p.life -= dt;

          if (p.life <= 0) {
            projectiles.splice(i, 1);
            continue;
          }

          const dist = Math.hypot(p.x - hero.x, p.y - hero.y);
          if (dist < 40 && hero.invulnTime <= 0) {
            onHitHero(p.dmg, p.x, 0);
            projectiles.splice(i, 1);
            FX.burst(p.x, p.y, { n: 24, color: '#ff6b6b', speed: 420, life: 0.4, size: 8, glow: true });
            FX.shake(4);
            FX.hitstop(0.08);
          }
        }

        // Meter gain
        state.meter = Math.min(state.maxMeter, state.meter + 0.5 * dt);

        hero.stateTime += dt;
        enemy.stateTime += dt;
      },
      (ctx) => {
        const { W, H } = FX;

        // Parallax background
        const stageData = stages[state.stage % stages.length];
        const parallaxLayers = [
          { img: stageData.bg, speed: 0.2, y: 0, h: 540, alpha: 1 },
        ];
        if (stageData.id === 'neon') {
          parallaxLayers.push({ img: 'prop-lantern', speed: 0.6, y: 320, h: 180, gap: 420, alpha: 0.9 });
        } else if (stageData.id === 'moon') {
          parallaxLayers.push({ img: 'prop-crystal', speed: 0.6, y: 320, h: 180, gap: 420, alpha: 0.9 });
        } else if (stageData.id === 'sakura') {
          parallaxLayers.push({ img: 'prop-sakura', speed: 0.6, y: 320, h: 180, gap: 420, alpha: 0.9 });
        }
        FX.parallax(ctx, parallaxLayers, 0);
        FX.motes(ctx, '#ffffff');

        // Floor
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 490);
        ctx.lineTo(W, 490);
        ctx.stroke();

        // Draw projectiles
        for (const p of projectiles) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 1));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw enemy
        const enemyImg = enemy.isBoss ? FX.img('enemy-boss') : FX.img(charStats[stageData.enemy].img);
        let enemyFilter = '';
        if (enemy.isBoss) {
          const hue = 30 + Math.sin(FX.time * 2) * 10;
          enemyFilter = `hue-rotate(${hue}deg)`;
        }
        ctx.filter = enemyFilter;
        const enemyScaleX = -enemy.facing * (1 + Math.sin(enemy.stateTime * 3) * 0.05);
        const enemyScaleY = 0.95 + Math.cos(enemy.stateTime * 2) * 0.03;
        FX.drawSprite(ctx, enemyImg, enemy.x, enemy.y, enemy.h, { sx: enemyScaleX, sy: enemyScaleY });

        if (enemy.invulnTime > 0 && Math.floor(enemy.invulnTime * 10) % 2 === 0) {
          ctx.filter = 'brightness(2.5)';
          FX.drawSprite(ctx, enemyImg, enemy.x, enemy.y, enemy.h, { sx: enemyScaleX, sy: enemyScaleY });
        }

        // Draw hero
        ctx.filter = state.skin || '';
        const heroAnimState = hero.state === 'run' ? 'run' : hero.state === 'jump' ? 'jump' : hero.state === 'attack' ? 'attack' : hero.state === 'cast' ? 'cast' : 'idle';
        const heroImg = FX.img('whale-' + heroAnimState);
        const heroScaleX = hero.facing * (1 + Math.sin(hero.stateTime * 3) * 0.05);
        const heroScaleY = 0.95 + Math.cos(hero.stateTime * 2) * 0.03;
        FX.drawSprite(ctx, heroImg, hero.x, hero.y, hero.h, { sx: heroScaleX, sy: heroScaleY });

        if (hero.invulnTime > 0 && Math.floor(hero.invulnTime * 10) % 2 === 0) {
          ctx.filter = 'brightness(2.5)';
          FX.drawSprite(ctx, heroImg, hero.x, hero.y, hero.h, { sx: heroScaleX, sy: heroScaleY });
        }

        ctx.filter = 'none';

        // HP bars
        const hpBarX = 30, hpBarY = 20, hpBarW = 160, hpBarH = 16;
        const hpBarX2 = W - 30 - hpBarW, hpBarY2 = 20;

        hud.hp1Chip = FX.lerp(hud.hp1Chip, state.heroHp, 0.1);
        hud.hp2Chip = FX.lerp(hud.hp2Chip, state.enemyHp, 0.1);

        // P1 bar
        ctx.fillStyle = '#333';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(hpBarX, hpBarY, (hud.hp1Chip / state.heroMaxHp) * hpBarW, hpBarH);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(hpBarX, hpBarY, (state.heroHp / state.heroMaxHp) * hpBarW, hpBarH);

        // P2 bar
        ctx.fillStyle = '#333';
        ctx.fillRect(hpBarX2, hpBarY2, hpBarW, hpBarH);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(hpBarX2, hpBarY2, (hud.hp2Chip / state.enemyMaxHp) * hpBarW, hpBarH);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(hpBarX2, hpBarY2, (state.enemyHp / state.enemyMaxHp) * hpBarW, hpBarH);

        // Meter bar (below P1 HP)
        const meterY = hpBarY + hpBarH + 6;
        ctx.fillStyle = '#444';
        ctx.fillRect(hpBarX, meterY, hpBarW, 10);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(hpBarX, meterY, (state.meter / state.maxMeter) * hpBarW, 10);

        // Timer
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.textContent = Math.ceil(state.time);

        // Combo display
        if (state.combo > 0) {
          const comboEl = document.getElementById('combo');
          if (!comboEl) {
            const el = document.createElement('div');
            el.id = 'combo';
            el.className = 'chip';
            el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:bold;color:#ffeb3b;text-shadow:0 0 10px #ffaa00;pointer-events:none;z-index:9999;';
            document.body.appendChild(el);
          }
          const comboEl2 = document.getElementById('combo');
          comboEl2.textContent = `x${state.combo} HIT`;
          comboEl2.style.opacity = state.comboTime > 0 ? '1' : '0';
          hud.comboScale = Math.min(1, (state.comboTime || 1) / 0.3);
          comboEl2.style.transform = `translate(-50%,-50%) scale(${1 + hud.comboScale * 0.3})`;
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
      if (enemy.aiTime > 2) {
        enemy.aiTime = 0;
        const choice = Math.floor(Math.random() * 3);
        if (choice === 0 && dist > 120) {
          enemy.vx = dirToHero * config.moveSpeed * 0.8;
          enemy.facing = dirToHero;
        } else if (choice === 1) {
          const dmg = FX.rand(8, 12);
          FX.ring(enemy.x, enemy.y - enemy.h * 0.5, { color: '#fff', r: 90, life: 0.3 }); FX.burst(enemy.x, enemy.y - enemy.h * 0.5, { n: 36, color: '#ff6b6b', speed: 560, life: 0.5, size: 10, glow: true });
          onHitHero(dmg, enemy.x, 150 * dirToHero);
          FX.shake(6);
          FX.hitstop(0.12);
        } else if (choice === 2) {
          for (let i = 0; i < 4; i++) {
            projectiles.push({
              x: enemy.x,
              y: enemy.y - enemy.h * 0.3,
              vx: FX.rand(-150, 150),
              vy: FX.rand(-250, -100),
              size: 6,
              color: '#ff1493',
              dmg: FX.rand(4, 7),
              life: 3,
              maxLife: 3,
            });
          }
        }
      }
    } else {
      enemy.aiTime += dt;
      const aiType = stageData.ai || 'rush';

      if (aiType === 'rush') {
        if (enemy.aiTime > 1.5 && dist > 100) {
          enemy.vx = dirToHero * config.moveSpeed;
          enemy.facing = dirToHero;
        } else if (enemy.aiTime > 3) {
          enemy.aiTime = 0;
          const dmg = FX.rand(6, 10);
          onHitHero(dmg, enemy.x, 150 * dirToHero);
          FX.shake(4);
          FX.hitstop(0.1);
        }
      } else if (aiType === 'zone') {
        if (dist < 250 && enemy.aiTime > 1.2) {
          projectiles.push({
            x: enemy.x,
            y: enemy.y - 40,
            vx: dirToHero * 250,
            vy: FX.rand(-100, 100),
            size: 5,
            color: '#ffeb3b',
            dmg: FX.rand(5, 8),
            life: 2.5,
            maxLife: 2.5,
          });
          enemy.aiTime = 0;
        }
      } else if (aiType === 'grapple') {
        if (dist > 150 && enemy.aiTime > 1) {
          enemy.vx = dirToHero * config.moveSpeed * 1.1;
          enemy.facing = dirToHero;
        } else if (dist < 150 && enemy.aiTime > 2) {
          enemy.aiTime = 0;
          const dmg = FX.rand(10, 14);
          onHitHero(dmg, enemy.x, 200 * dirToHero);
          FX.shake(5);
          FX.hitstop(0.12);
        }
      }
    }

    enemy.vx *= config.friction;
    enemy.x += enemy.vx * dt;
    enemy.x = Math.max(50, Math.min(FX.W - 50, enemy.x));
  }

  function doAttack() {
    if (!state.gameActive || hero.ultimateActive || !FX.running || FX.paused) return;

    hero.state = 'attack';
    hero.stateTime = 0;
    hero.lastAttackTime = 0.1;

    const dist = Math.abs(enemy.x - hero.x);
    if (dist < config.attackRange + 100) {
      const baseDmg = FX.rand(8, 12);
      const dmg = baseDmg * state.stats.atk;
      onHitEnemy(dmg, hero.x, 150 * hero.facing);
      state.combo++;
      state.comboTime = 1.5;
      state.meter = Math.min(state.maxMeter, state.meter + 15);
      FX.hitstop(0.08);
    }

    FX.burst(hero.x + 60 * hero.facing, hero.y - 30, { n: 24, color: '#ff7cc8', speed: 350, life: 0.3, size: 6, glow: true });
  }

  function doSpecial() {
    if (!state.gameActive || hero.specialCd > 0 || hero.ultimateActive || !FX.running || FX.paused) return;

    hero.state = 'cast';
    hero.specialCd = 3;
    hero.casting = true;
    hero.castTime = 0.5;

    projectiles.push({
      x: hero.x + 60 * hero.facing,
      y: hero.y - 50,
      vx: hero.facing * 400,
      vy: FX.rand(-50, 50),
      size: 7,
      color: '#ffeb3b',
      dmg: FX.rand(6, 10),
      life: 2,
      maxLife: 2,
    });

    FX.burst(hero.x + 60 * hero.facing, hero.y - 30, { n: 30, color: '#ffeb3b', speed: 420, life: 0.4, size: 8, glow: true });
    state.meter = Math.max(0, state.meter - 20);
  }

  function doDash() {
    if (!state.gameActive || hero.dashCd > 0 || hero.ultimateActive || !FX.running || FX.paused) return;

    hero.dashCd = 1.2;
    hero.vx = hero.facing * 600;
    hero.invulnTime = 0.3;

    for (let i = 0; i < 6; i++) {
      FX.burst(hero.x + FX.rand(-30, 30), hero.y + FX.rand(-30, 30), {
        n: 2,
        color: '#00bfff',
        speed: 100,
        life: 0.4,
        size: 2,
      });
    }

    FX.shake(2);
  }

  function doUltimate() {
    if (!state.gameActive || state.meter < state.maxMeter || hero.ultimateActive || !FX.running || FX.paused) return;

    hero.ultimateActive = true;
    hero.ultimateTime = 1;
    state.meter = 0;

    FX.flash('#ff1493', 0.5);
    FX.shake(8);

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const baseDmg = FX.rand(15, 25);
        const dmg = baseDmg * state.stats.atk;
        onHitEnemy(dmg, enemy.x, 200 * hero.facing);
        FX.burst(enemy.x, enemy.y, { n: 45, color: '#ff1493', speed: 560, life: 0.5, size: 10, glow: true });
        FX.shake(6);
        FX.ring(enemy.x, enemy.y, { color: '#ff1493', r: 100, life: 0.4 });
      }, i * 150);
    }
  }

  function onHitHero(dmg, x, knockback) {
    if (hero.invulnTime > 0) return;

    const trueDmg = Math.round(dmg);
    state.heroHp = Math.max(0, state.heroHp - trueDmg);
    hero.invulnTime = 0.15;
    hero.knockbackX = knockback;

    FX.text(x, 400, trueDmg, { color: '#ff3333', size: 28, crit: dmg > 12 });
    FX.burst(hero.x, hero.y, { n: 18, color: '#ff6b6b', speed: 280, life: 0.3, size: 6 });

    if (state.heroHp <= 0) {
      endRound();
    }
  }

  function onHitEnemy(dmg, x, knockback) {
    if (enemy.invulnTime > 0) return;

    const trueDmg = Math.round(dmg);
    state.enemyHp = Math.max(0, state.enemyHp - trueDmg);
    enemy.invulnTime = 0.15;
    enemy.knockbackX = knockback;

    FX.text(x, 350, trueDmg, { color: '#ffff00', size: 28, crit: dmg > 15 });
    FX.burst(enemy.x, enemy.y, { n: 18, color: '#ffeb3b', speed: 280, life: 0.3, size: 6, glow: true });

    if (state.enemyHp <= 0) {
      endRound();
    }
  }

  function endRound() {
    state.gameActive = false;
    FX.running = false;

    const won = state.enemyHp <= 0;
    const stars = won ? (state.time > 20 ? 3 : state.time > 10 ? 2 : 1) : 0;
    const coins = won ? FX.rand(50, 150) : FX.rand(10, 30);
    const gems = won && stars === 3 ? FX.rand(5, 15) : 0;

    if (won) {
      FX.banner('K.O.!');
      FX.flash('#ffeb3b', 0.4);
      FX.shake(10);
    } else {
      FX.banner('失败');
      FX.flash('#ff3333', 0.3);
    }

    setTimeout(() => {
      Lobby.reportResult({
        stage: state.stage,
        stars,
        coins,
        gems,
      });
    }, 1500);
  }

  FX.init({ landscape: true, logicalH: 540 });

  const assets = [
    'bg-arena', 'bg-neon', 'bg-moon', 'bg-sakura', 'bg-station',
    'whale-idle', 'whale-run', 'whale-jump', 'whale-attack', 'whale-cast',
    'lan-chibi', 'mo-chibi', 'li-chibi', 'xing-chibi', 'hu-chibi',
    'enemy-boss',
    'item-weapon', 'item-star', 'item-ice', 'item-heart',
    'prop-lantern', 'prop-crystal', 'prop-sakura',
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
  window.__game={state:()=>({hero:{x:hero.x,y:hero.y,hp:hero.hp},enemy:{x:enemy.x,y:enemy.y,vx:enemy.vx,vy:enemy.vy,hp:enemy.hp,state:enemy.state},W:FX.W,H:FX.H})};
})();
