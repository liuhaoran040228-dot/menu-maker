(function() {
  'use strict';
  
  const FX = window.FX = {};
  
  // State
  let cv, ctx, stage, hud, skillsCont, joyEl, joyKnob, overEl, bannerEl, rotateEl;
  let W, H, dpr, aspect, logicalH;
  let updateFn, drawFn, dt, lastT, pauseBtn;
  let hitstopTimer = 0, shakeIntensity = 0, shakeDecay = 0.92;
  let pauseState = false, runningFlag = false, portraitMode = false;
  
  // Assets
  const images = {};
  
  // Particles
  const particles = [], texts = [], rings = [], flashList = [];
  const MAX_PARTICLES = 500;
  
  // Joystick
  let joyActive = false, joyBaseX = 0, joyBaseY = 0;
  let joyOutX = 0, joyOutY = 0, joyTargetX = 0, joyTargetY = 0;
  let joyPointerId = null, joyFadeState = 'hidden'; // hidden | fadein | visible | fadeout
  let joyFadeTimer = 0;
  const JOY_RADIUS = 55, JOY_DEADZONE = 0.12, JOY_FADE_IN = 0.08, JOY_FADE_OUT = 0.15;
  
  // Input
  const keys = new Set();
  FX.keys = keys;
  let tapHandler = null;
  const buttons = [];
  
  // Motes state
  const motes = [];
  for (let i = 0; i < 40; i++) {
    motes.push({
      x: Math.random(),
      y: Math.random(),
      size: 1 + Math.random() * 2,
      speed: 0.01 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2
    });
  }
  
  // Init
  FX.init = function(opts = {}) {
    portraitMode = opts.landscape === false;
    if (FX._inited) return FX._initRes; FX._inited = true;
    logicalH = opts.logicalH || 540;
    const isLandscape = opts.landscape;
    
    document.body.classList.add('fx');
    if (isLandscape) document.body.classList.add('fx-land');
    
    stage = document.createElement('div');
    stage.className = 'fx-stage';
    document.body.appendChild(stage);
    
    cv = document.createElement('canvas');
    ctx = cv.getContext('2d', { alpha: false });
    stage.appendChild(cv);
    
    hud = document.createElement('div');
    hud.className = 'fx-hud';
    stage.appendChild(hud);
    
    skillsCont = document.createElement('div');
    skillsCont.className = 'fx-skills';
    stage.appendChild(skillsCont);
    
    joyEl = document.createElement('div');
    joyEl.className = 'fx-joy idle';
    joyKnob = document.createElement('i');
    joyEl.appendChild(joyKnob);
    stage.appendChild(joyEl);
    
    overEl = document.createElement('div');
    overEl.className = 'fx-over hide';
    overEl.innerHTML = '<div class="fx-card"><h1></h1><p></p><img class="hero"><div class="fx-html"></div><button class="fx-play"></button></div>';
    stage.appendChild(overEl);
    
    bannerEl = document.createElement('div');
    bannerEl.className = 'fx-banner';
    stage.appendChild(bannerEl);
    
    if (isLandscape) {
      rotateEl = document.createElement('div');
      rotateEl.className = 'fx-rotate';
      rotateEl.innerHTML = '<img src="../assets/whale-ride.webp"><p>横过来玩更爽 ↻</p>';
      document.body.appendChild(rotateEl);
    }
    
    pauseBtn = document.createElement('button');
    pauseBtn.className = 'fx-icon';
    pauseBtn.textContent = '⏸';
    pauseBtn.style.cssText = 'position:absolute;right:calc(10px + env(safe-area-inset-right));top:calc(10px + env(safe-area-inset-top));z-index:10;';
    pauseBtn.addEventListener('click', togglePause);
    hud.appendChild(pauseBtn);
    
    resize();
    window.addEventListener('resize', resize);
    
    // Prevent scroll/zoom
    const prevent = e => e.preventDefault();
    document.addEventListener('touchmove', prevent, { passive: false });
    document.addEventListener('gesturestart', prevent, { passive: false });
    document.addEventListener('dblclick', prevent);
    document.addEventListener('contextmenu', prevent);
    
    // Input
    document.addEventListener('keydown', e => {
      if (e.repeat) return;
      keys.add(e.code);
    });
    document.addEventListener('keyup', e => keys.delete(e.code));
    
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    
    const releaseAll = () => { keys.clear(); joyPointerId = null; joyActive = false; joyTargetX = joyTargetY = 0; for (const btn of buttons) { btn.el.classList.remove('down'); btn.isDown = false; btn.pointerId = null; } };
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && runningFlag && overEl.classList.contains('hide')) {
        pauseState = true;
        updatePauseBtn();
        if (window.Lobby && Lobby.pauseMenu) Lobby.pauseMenu();
      }
    });
    
    return FX._initRes = { cv, ctx, W, H };
  };
  
  function resize() {
    const cw = stage.clientWidth, ch = stage.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cw * dpr;
    cv.height = ch * dpr;
    cv.style.width = cw + 'px';
    cv.style.height = ch + 'px';
    
    aspect = cw / ch;
    if (portraitMode) { W = 540; H = W / aspect; }
    else { H = logicalH; W = H * aspect; }
    
    const scale = cv.height / H;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    
    FX.W = W;
    FX.H = H;
  }
  
  // Assets
  FX.skinMap = {};
  FX.baseMap = {};
  FX.useSideSprites = (pose = 'idle') => {
    const ids = ['lan', 'mo', 'li', 'xing', 'hu'], m = {};
    ids.forEach(c => { m[c + '-chibi'] = 'side-' + c + '-' + pose; });
    Object.assign(m, { 'whale-idle': 'side-lan-idle', 'whale-run': 'side-lan-run', 'whale-jump': 'side-lan-jump', 'whale-attack': 'side-lan-attack', 'whale-cast': 'side-lan-attack' });
    FX.baseMap = m;
    FX.load([...new Set(Object.values(m))].concat(ids.flatMap(c => ['side-' + c + '-run', 'side-' + c + '-jump', 'side-' + c + '-attack'])));
  };
  FX.img = name => { const b = FX.baseMap[name]; const bi = b && images[b]; if (bi && bi.naturalWidth) return bi; const m = FX.skinMap[name]; const im = m && images[m]; return (im && im.complete && im.naturalWidth) ? im : images[name]; };
  FX.load = function(names) {
    return Promise.all(names.map(name => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { images[name] = img; resolve(); };
        img.onerror = () => resolve();
        img.src = `../assets/${name}.webp`;
      });
    }));
  };
  
  // Loop
  FX.loop = function(update, draw) {
    updateFn = update;
    drawFn = draw;
    lastT = performance.now() / 1000;
    requestAnimationFrame(tick);
  };
  
  function tick(now) {
    now /= 1000;
    dt = Math.min(now - lastT, 0.05);
    lastT = now;
    FX.time = now;
    
    if (!pauseState) {
      if (hitstopTimer > 0) {
        hitstopTimer -= dt;
      } else {
        updateInput(dt);
        updateFn(dt);
      }
    }
    
    if (shakeIntensity > 0.01) {
      const ox = (Math.random() - 0.5) * shakeIntensity;
      const oy = (Math.random() - 0.5) * shakeIntensity;
      ctx.save();
      ctx.translate(ox, oy);
      drawFn(ctx);
      ctx.restore();
      shakeIntensity *= shakeDecay;
    } else {
      drawFn(ctx);
    }
    
    requestAnimationFrame(tick);
  }
  
  FX.hitstop = sec => hitstopTimer = sec;
  FX.shake = intensity => shakeIntensity = Math.max(shakeIntensity, intensity);
  Object.defineProperty(FX, 'paused', { get: () => pauseState, set: v => { pauseState = !!v; if (pauseBtn) updatePauseBtn(); } });
  Object.defineProperty(FX, 'running', { get: () => runningFlag, set: v => { runningFlag = !!v; } });
  
  function togglePause() {
    if (window.Lobby && Lobby.pauseMenu) { if (runningFlag) { pauseState = true; updatePauseBtn(); Lobby.pauseMenu(); } return; }
    pauseState = !pauseState;
    updatePauseBtn();
  }
  
  function updatePauseBtn() {
    pauseBtn.textContent = pauseState ? '▶' : '⏸';
  }
  
  // Joystick
  function updateInput(dt) {
    let kx = 0, ky = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) ky -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) ky += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) kx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) kx += 1;
    
    if (kx || ky) {
      const kmag = Math.hypot(kx, ky);
      joyTargetX = kx / kmag;
      joyTargetY = ky / kmag;
    } else if (!joyActive) {
      joyTargetX = 0;
      joyTargetY = 0;
    }
    
    joyOutX += (joyTargetX - joyOutX) * Math.min(1, 18 * dt);
    joyOutY += (joyTargetY - joyOutY) * Math.min(1, 18 * dt);
    
    const mag = Math.hypot(joyOutX, joyOutY);
    let finalMag = mag;
    if (mag < JOY_DEADZONE) finalMag = 0;
    else finalMag = (mag - JOY_DEADZONE) / (1 - JOY_DEADZONE);
    
    const joy = FX.joystick.state || (FX.joystick.state = { x: 0, y: 0, mag: 0, active: false });
    if (finalMag > 0) {
      joy.x = joyOutX / mag;
      joy.y = joyOutY / mag;
      joy.mag = finalMag;
      joy.active = true;
    } else {
      joy.x = joy.y = joy.mag = 0;
      joy.active = false;
    }
    
    // Handle fade states
    const dragMode = FX.controlMode === 'drag';
    if (dragMode) {
      if (joyActive) {
        if (joyFadeState === 'hidden') {
          joyFadeState = 'fadein';
          joyFadeTimer = 0;
        }
        if (joyFadeState === 'fadein') {
          joyFadeTimer += dt;
          if (joyFadeTimer >= JOY_FADE_IN) {
            joyFadeState = 'visible';
            joyFadeTimer = 0;
          }
        }
      } else {
        if (joyFadeState === 'visible' || joyFadeState === 'fadein') {
          joyFadeState = 'fadeout';
          joyFadeTimer = 0;
        }
        if (joyFadeState === 'fadeout') {
          joyFadeTimer += dt;
          if (joyFadeTimer >= JOY_FADE_OUT) {
            joyFadeState = 'hidden';
            joyFadeTimer = 0;
          }
        }
      }
      
      let opacity = 0;
      if (joyFadeState === 'visible') opacity = 1;
      else if (joyFadeState === 'fadein') opacity = joyFadeTimer / JOY_FADE_IN;
      else if (joyFadeState === 'fadeout') opacity = 1 - joyFadeTimer / JOY_FADE_OUT;
      
      if (opacity > 0) {
        joyEl.style.opacity = opacity;
        joyEl.classList.remove('idle');
        joyEl.classList.add('on');
        joyEl.style.left = joyBaseX + 'px';
        joyEl.style.bottom = joyBaseY + 'px';
        joyKnob.style.transform = `translate(${joyOutX * JOY_RADIUS}px, ${-joyOutY * JOY_RADIUS}px)`;
      } else {
        joyEl.classList.add('idle');
        joyEl.classList.remove('on');
      }
    } else {
      // Fixed stick mode
      if (joy.active) {
        joyEl.style.opacity = 1;
        joyEl.classList.remove('idle');
        joyEl.classList.add('on');
        joyEl.style.left = 'calc(90px + env(safe-area-inset-left))';
        joyEl.style.bottom = 'calc(90px + env(safe-area-inset-bottom))';
        joyKnob.style.transform = `translate(${joyOutX * JOY_RADIUS}px, ${-joyOutY * JOY_RADIUS}px)`;
      } else {
        joyEl.classList.add('idle');
        joyEl.classList.remove('on');
        joyKnob.style.transform = '';
      }
    }
  }
  
  FX.joystick = function(opts) {
    document.body.classList.add('fx-hasjoy');
    if (!FX.joystick.state) FX.joystick.state = { x: 0, y: 0, mag: 0, active: false };
    return FX.joystick.state;
  };
  
  // Input handlers
  function onPointerDown(e) {
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dragMode = FX.controlMode === 'drag';
    
    // Check buttons first
    let hitBtn = false;
    for (const btn of buttons) {
      const br = btn.el.getBoundingClientRect();
      const hw = br.width / 2, hh = br.height / 2;
      const cx = br.left + hw - rect.left, cy = br.top + hh - rect.top;
      if (Math.hypot(x - cx, y - cy) < Math.max(hw, hh) * 1.5) {
        btn.pointerId = e.pointerId;
        btn.el.setPointerCapture(e.pointerId);
        btn.buffered = FX.time;
        btn.el.classList.add('down');
        btn.isDown = true;
        if (btn.hold) (runningFlag && !pauseState && btn.onPress());
        hitBtn = true;
        break;
      }
    }
    
    if (hitBtn) return;
    
    // In drag mode, left half is joystick (unless tap handler exists and handles it)
    const isLeft = x < rect.width / 2;
    
    if (dragMode && isLeft && joyPointerId === null) {
      joyPointerId = e.pointerId;
      joyActive = true;
      joyBaseX = x;
      joyBaseY = rect.height - y;
      stage.setPointerCapture(e.pointerId);
      onPointerMove(e);
    } else if (!isLeft && tapHandler) {
      tapHandler(x, y);
    }
  }
  
  function onPointerMove(e) {
    if (e.pointerId === joyPointerId && joyActive) {
      const rect = stage.getBoundingClientRect();
      const dx = e.clientX - rect.left - joyBaseX;
      const dy = rect.height - (e.clientY - rect.top) - joyBaseY;
      const dist = Math.hypot(dx, dy);
      if (dist > JOY_RADIUS) {
        joyTargetX = dx / dist;
        joyTargetY = dy / dist;
        if (FX.controlMode === 'drag') {
          joyBaseX += joyTargetX * (dist - JOY_RADIUS);
          joyBaseY += joyTargetY * (dist - JOY_RADIUS);
        }
      } else {
        joyTargetX = dx / JOY_RADIUS;
        joyTargetY = dy / JOY_RADIUS;
      }
    }
  }
  
  function onPointerUp(e) {
    if (e.pointerId === joyPointerId) {
      joyPointerId = null;
      joyActive = false;
      joyTargetX = joyTargetY = 0;
      stage.releasePointerCapture(e.pointerId);
    }
    
    for (const btn of buttons) {
      if (btn.pointerId === e.pointerId) {
        btn.el.releasePointerCapture(e.pointerId);
        btn.el.classList.remove('down');
        btn.isDown = false;
        if (!btn.hold && FX.time - btn.buffered < 0.15 && btn.isReady) {
          (runningFlag && !pauseState && btn.onPress());
          btn.lastPress = FX.time;
          btn.isReady = false;
          btn.el.classList.add('cool');
        }
        btn.pointerId = null;
        break;
      }
    }
  }
  
  FX.tap = fn => tapHandler = fn;
  
  // Button
  FX.button = function(opts) {
    if (!FX._inited) FX.init({landscape:true});
    const el = document.createElement('button');
    el.className = 'fx-btn ready';
    el.style.cssText = `right:calc(${opts.right}px*var(--k,1) + env(safe-area-inset-right));bottom:calc(${opts.bottom}px*var(--k,1) + env(safe-area-inset-bottom));width:calc(${opts.size}px*var(--k,1));height:calc(${opts.size}px*var(--k,1));`;
    el.style.setProperty('--c', opts.color || '#ff7cc8');
    el.style.setProperty('--r', '1');
    
    if (opts.icon.startsWith('<')) {
      el.innerHTML = opts.icon;
    } else {
      const img = document.createElement('img');
      img.src = `../assets/${opts.icon}.webp`;
      el.appendChild(img);
    }
    
    skillsCont.appendChild(el);
    
    const btn = {
      el, onPress: opts.onPress || (() => {}), cd: opts.cd || 0,
      hold: opts.hold || false, isReady: true, lastPress: -999,
      pointerId: null, buffered: 0, isDown: false,
      ready: () => btn.isReady,
      trigger: () => { if (btn.isReady) (runningFlag && !pauseState && btn.onPress()); },
      setCd: sec => { btn.cd = sec; },
      get down() { return btn.isDown; }
    };
    
    if (opts.key) {
      document.addEventListener('keydown', e => {
        if (e.code === opts.key && !e.repeat && btn.isReady) {
          (runningFlag && !pauseState && btn.onPress());
          btn.lastPress = FX.time;
          btn.isReady = false;
          btn.el.classList.add('cool');
        }
      });
    }
    
    buttons.push(btn);
    
    const updateBtn = () => {
      if (!btn.isReady) {
        const elapsed = FX.time - btn.lastPress;
        const ratio = Math.min(elapsed / btn.cd, 1);
        btn.el.style.setProperty('--r', ratio.toFixed(3));
        if (ratio >= 1) {
          btn.isReady = true;
          btn.el.classList.remove('cool');
          btn.el.classList.add('ready');
          setTimeout(() => btn.el.classList.remove('ready'), 200);
        }
      }
      requestAnimationFrame(updateBtn);
    };
    updateBtn();
    
    return btn;
  };
  
  // HUD
  FX.hud = html => {
    hud.innerHTML = html;
    hud.appendChild(pauseBtn);
  };
  
  FX.bar = (id, ratio) => {
    const bar = document.getElementById(id);
    if (bar) bar.firstElementChild.style.transform = `scaleX(${ratio})`;
  };
  
  // Overlay
  FX.overlay = function(opts) {
    const card = overEl.querySelector('.fx-card');
    card.querySelector('h1').textContent = opts.title || '';
    card.querySelector('p').innerHTML = opts.text || '';
    card.querySelector('.fx-html').innerHTML = opts.html || '';
    card.querySelector('.fx-play').textContent = opts.button || '▶';
    
    const hero = card.querySelector('.hero');
    if (opts.hero) {
      hero.src = `../assets/${opts.hero}.webp`;
      hero.style.display = 'block';
    } else {
      hero.style.display = 'none';
    }
    
    const btn = card.querySelector('.fx-play');
    btn.onclick = () => {
      FX.hideOverlay();
      if (opts.onStart) opts.onStart();
    };
    
    overEl.classList.remove('hide');
    runningFlag = false;
  };
  
  FX.hideOverlay = () => overEl.classList.add('hide');
  
  // Banner
  FX.banner = function(text) {
    bannerEl.classList.remove('show');
    void bannerEl.offsetWidth;
    bannerEl.textContent = text;
    bannerEl.classList.add('show');
  };
  
  // Parallax
  FX.parallax = function(ctx, layers, scrollX) {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const img = images[layer.img];
      if (!img || !img.complete || !img.naturalWidth) continue;
      
      ctx.globalAlpha = layer.alpha !== undefined ? layer.alpha : 1;
      
      if (i === 0) {
        const scale = H / img.naturalHeight;
        const sw = img.naturalWidth * scale;
        const span = sw * 2, o = ((scrollX * layer.speed) % span + span) % span;
        for (let k = 0, x = -o; x < W; k++, x += sw) {
          if (k % 2) { ctx.save(); ctx.translate(x + sw, 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, sw + 1, H); ctx.restore(); }
          else ctx.drawImage(img, x, 0, sw + 1, H);
        }
      } else {
        const sy = layer.y, sh = layer.h;
        const scale = sh / img.naturalHeight;
        const sw = img.naturalWidth * scale;
        const gap = layer.gap || sw;
        const offsetX = -(((scrollX * layer.speed) % gap) + gap) % gap;
        const vary = 1 + Math.sin(i * 1.234) * 0.08;
        const fh = sh * vary;
        for (let x = offsetX - sw; x < W + sw; x += gap) {
          ctx.drawImage(img, x, sy + (sh - fh), sw, fh);
        }
      }
    }
    ctx.globalAlpha = 1;
  };
  
  FX.motes = function(ctx, color) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const x = (m.x + m.speed * FX.time) % 1;
      const y = (m.y + Math.sin(FX.time * 0.5 + m.phase) * 0.05) % 1;
      const alpha = 0.3 + Math.sin(FX.time * 2 + m.phase) * 0.2;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color || '#fff';
      ctx.beginPath();
      ctx.arc(x * W, y * H, m.size, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  };
  
  FX.vignette = function(ctx) {
    const R = Math.hypot(W, H) / 2;
    const grad = ctx.createRadialGradient(W / 2, H / 2, R * 0.62, W / 2, H / 2, R);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(10,8,40,0.38)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  };
  
  // Draw sprite
  FX.drawSprite = function(ctx, img, x, y, h, opts = {}) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const scale = h / img.naturalHeight;
    const w = img.naturalWidth * scale;
    const sx = opts.sx || 1, sy = opts.sy || 1;
    
    ctx.save();
    ctx.translate(x, y);
    if (opts.rot) ctx.rotate(opts.rot);
    if (opts.flip) ctx.scale(-1, 1);
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    if (opts.glow) ctx.globalCompositeOperation = 'lighter';
    ctx.scale(sx, sy);
    let src = img;
    const f = ctx.filter;
    if (f && f !== 'none' && img.src) { src = tintCache(img, f); ctx.filter = 'none'; }
    ctx.drawImage(src, -w / 2, -h, w, h);
    ctx.restore();
  };
  
  const _tint = new Map();
  function tintCache(img, f) {
    const k = img.src + '|' + f;
    let c = _tint.get(k);
    if (!c) {
      if (_tint.size > 300) _tint.clear();
      c = document.createElement('canvas');
      const sc = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.max(1, Math.round(img.naturalWidth * sc)); c.height = Math.max(1, Math.round(img.naturalHeight * sc));
      const g = c.getContext('2d'); g.filter = f; g.drawImage(img, 0, 0, c.width, c.height);
      _tint.set(k, c);
    }
    return c;
  }
  
  FX.controlMode = (() => { try { return localStorage.getItem('fx-ctrl') || 'drag'; } catch (e) { return 'drag'; } })();
  document.documentElement.classList.toggle('fx-drag', FX.controlMode === 'drag');
  FX.setControl = m => { FX.controlMode = m; try { localStorage.setItem('fx-ctrl', m); } catch (e) {} document.documentElement.classList.toggle('fx-drag', m === 'drag'); };
  FX.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  FX.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  FX.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  FX.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  
  FX.coin = function(ctx, x, y, r, t) {
    const sx = Math.max(0.12, Math.abs(Math.cos(t * 4)));
    ctx.save(); ctx.translate(x, y); ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(2, 3, r * sx, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(sx, 1);
    const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fff6b0'); g.addColorStop(.45, '#ffc93c'); g.addColorStop(1, '#c97a00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * .14); ctx.strokeStyle = '#9a5a00'; ctx.stroke();
    ctx.lineWidth = Math.max(1, r * .1); ctx.strokeStyle = '#ffe680'; ctx.beginPath(); ctx.arc(0, 0, r * .68, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff8d0'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .2 : r * .45; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    if (sx > .9 && Math.sin(t * 9) > .97) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * .4, y - r * .4, r * .18, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  };

  // Particles
  FX.burst = function(x, y, opts) {
    const n = opts.n || 10;
    for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = opts.speed || 100;
      const vx = Math.cos(angle) * speed * (0.5 + Math.random());
      const vy = Math.sin(angle) * speed * (0.5 + Math.random());
      particles.push({
        x, y, vx, vy,
        life: opts.life || 0.5,
        maxLife: opts.life || 0.5,
        size: opts.size || 3,
        color: opts.color || '#fff',
        glow: opts.glow || false,
        gravity: opts.gravity || 0
      });
    }
  };
  
  FX.trail = function(x, y, color, size) {
    if (particles.length < MAX_PARTICLES) {
      particles.push({
        x, y, vx: 0, vy: 0,
        life: 0.15, maxLife: 0.15,
        size: size || 2, color: color || '#fff',
        glow: true, gravity: 0
      });
    }
  };
  
  FX.text = function(x, y, str, opts = {}) {
    texts.push({
      x, y: y - 10, str,
      life: 0.98, maxLife: 0.98,
      color: opts.color || '#fff',
      size: opts.size || 24,
      crit: opts.crit || false,
      t: 0
    });
  };
  
  FX.ring = function(x, y, opts) {
    rings.push({
      x, y, r: opts.r || 30,
      life: opts.life || 0.5, maxLife: opts.life || 0.5,
      color: opts.color || '#fff'
    });
  };
  
  FX.flash = function(color, alpha) {
    flashList.push({ color, alpha, life: 0.15 });
  };
  
  FX.drawFX = function(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!pauseState && hitstopTimer <= 0) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.life -= dt;
      }
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      
      const alpha = p.life / p.maxLife;
      ctx.save();
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 7);
      ctx.fill();
      ctx.restore();
    }
    
    for (let i = texts.length - 1; i >= 0; i--) {
      const txt = texts[i];
      if (!pauseState && hitstopTimer <= 0) {
        txt.t += dt;
        txt.life -= dt;
        txt.y -= 50 * dt;
      }
      if (txt.life <= 0) {
        texts.splice(i, 1);
        continue;
      }
      
      const popT = Math.min(txt.t / 0.18, 1);
      const scale = FX.ease.outBack(popT);
      const alpha = txt.life / txt.maxLife;
      
      ctx.save();
      ctx.translate(txt.x, txt.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${txt.crit ? txt.size * 1.4 : txt.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(txt.str, 0, 0);
      ctx.fillStyle = txt.crit ? '#ff0' : txt.color;
      ctx.fillText(txt.str, 0, 0);
      if (txt.crit) ctx.fillText('!', txt.size, -txt.size * 0.3);
      ctx.restore();
    }
    
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      if (!pauseState && hitstopTimer <= 0) ring.life -= dt;
      if (ring.life <= 0) {
        rings.splice(i, 1);
        continue;
      }
      
      const t = 1 - ring.life / ring.maxLife;
      const r = ring.r + t * ring.r * 2;
      const alpha = 1 - t;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r, 0, 7);
      ctx.stroke();
      ctx.restore();
    }
    
    for (let i = flashList.length - 1; i >= 0; i--) {
      const flash = flashList[i];
      if (!pauseState && hitstopTimer <= 0) flash.life -= dt;
      if (flash.life <= 0) {
        flashList.splice(i, 1);
        continue;
      }
      
      const alpha = flash.alpha * (flash.life / 0.15);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = flash.color;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };
  
  // Easing
  FX.ease = {
    outBack: t => {
      const c = 1.70158, c2 = c + 1;
      return 1 + c2 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    },
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  };
  
  FX.lerp = (a, b, t) => a + (b - a) * t;
  FX.rand = (a, b) => a + Math.random() * (b - a);
  
  // Storage
  FX.store = function(key, defaults) {
    let data = { ...defaults };
    try {
      const saved = localStorage.getItem(key);
      if (saved) Object.assign(data, JSON.parse(saved));
    } catch (e) {}
    
    Object.defineProperty(data, 'save', {
      enumerable: false,
      value: function() {
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {}
      }
    });
    
    return data;
  };
})();
try{document.documentElement.classList.add('fx-game');}catch(e){}
