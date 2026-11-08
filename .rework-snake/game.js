(function() {
  'use strict';
  
  const CANVAS = document.getElementById('game-canvas');
  const CTX = CANVAS.getContext('2d', { alpha: true });
  const GAME_ROOT = document.getElementById('game-root');
  const RESULT_PANEL = document.getElementById('result-panel');
  const SETTINGS_OVERLAY = document.getElementById('settings-overlay');
  const SCORE_VAL = document.getElementById('score-val');
  const COMBO_CHIP = document.getElementById('combo-chip');
  const COMBO_VAL = document.getElementById('combo-val');
  const GOAL_CHIP = document.getElementById('goal-chip');
  const EATEN_VAL = document.getElementById('eaten-val');
  const GOAL_VAL = document.getElementById('goal-val');
  const BOOST_BTN = document.getElementById('boost-btn');
  const GEAR_BTN = document.getElementById('gear-btn');
  const PAUSE_BTN = document.getElementById('pause-btn');
  const VIRTUAL_JOYSTICK = document.getElementById('virtual-joystick');
  const JOYSTICK_KNOB = document.querySelector('.joystick-knob');
  const POWER_CHIPS = ['speed', 'magnet', 'shield'];
  
  let engine = null;
  let frameDelta=0,viewportW=390,viewportH=844,skinFilter='none',charColor='#8ceaff',deathWait=0,replayTime=-1,replayFrames=[],ready=.7,growthPulse=0,shake=0;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const read=(k)=>{try{return localStorage.getItem(k)}catch(_){return null}};
  const write=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
  let renderState = {
    accumulator: 0,
    lastTime: performance.now(),
    bodyTrail: {},
    particles: [],
    floatTexts: [],
    deathFrames: [],
    maxDeathFrames: 40
  };
  
  let gameState = {
    playing: false,
    paused: false,
    mode: 'classic',
    level: 0,
    isInvite: false,
    bestScore: 0,
    controlType: 'swipe',
    musicEnabled: true,
    boostLastTime: 0,
    boostCooldown: 6,
    lastMaxCombo: 0,
    inputMode: 'none',
    touchId: null,
    touchStartX: 0,
    touchStartY: 0,
    touchLastX: 0,
    touchLastY: 0,
    swipeThreshold: 18
  };
  
  const CELL_SIZE_RATIO = 1;
  const BOARD_COLS = 18;
  const BOARD_ROWS = 26;
  let cellSize = 0;
  let boardX = 0;
  let boardY = 0;
  
  function resizeCanvas() {
    const dpr=Math.min(devicePixelRatio||1,2);viewportW=innerWidth;viewportH=innerHeight;
    CANVAS.width=Math.round(viewportW*dpr);CANVAS.height=Math.round(viewportH*dpr);CTX.setTransform(dpr,0,0,dpr,0,0);
    CANVAS.style.width=viewportW+'px';CANVAS.style.height=viewportH+'px';
    const top=110,bottom=gameState.controlType==='joystick'?140:108;
    cellSize=Math.min((viewportW-28)/18,(viewportH-top-bottom)/26);boardX=(viewportW-cellSize*18)/2;boardY=top+(viewportH-top-bottom-cellSize*26)/2;
  }
  function roundRect(x,y,w,h,r){CTX.beginPath();CTX.roundRect(x,y,w,h,r);}
  function drawBackground() {
    const t=performance.now()/1000,theme=engine&&engine.mode==='levels'?SnakeEngine.LEVELS[engine.level].theme:engine&&engine.mode==='arena'?'night':'ocean';
    const bg=FX.img(theme==='forest'?'bg-forest':theme==='night'?'bg-moon':'bg-undersea');
    CTX.fillStyle=theme==='forest'?'#163629':theme==='night'?'#192341':'#12394c';CTX.fillRect(0,0,viewportW,viewportH);
    if(bg&&bg.complete&&bg.naturalWidth){const sc=Math.max(viewportW/bg.naturalWidth,viewportH/bg.naturalHeight);CTX.globalAlpha=.46;CTX.drawImage(bg,(viewportW-bg.naturalWidth*sc)/2,(viewportH-bg.naturalHeight*sc)/2,bg.naturalWidth*sc,bg.naturalHeight*sc);CTX.globalAlpha=1;}
    const grad=CTX.createLinearGradient(0,0,0,viewportH);grad.addColorStop(0,'#11233d77');grad.addColorStop(.55,'#0a263b22');grad.addColorStop(1,'#08182fbb');CTX.fillStyle=grad;CTX.fillRect(0,0,viewportW,viewportH);
    // Distant diagonal rays, drifting plankton/stars, and foreground reeds.
    CTX.save();CTX.globalCompositeOperation='screen';
    for(let i=0;i<4;i++){CTX.fillStyle='rgba(160,226,233,'+(.018+.012*Math.sin(t*.4+i))+')';CTX.beginPath();CTX.moveTo(i*140-100,0);CTX.lineTo(i*140-35,0);CTX.lineTo(i*140+180,viewportH);CTX.lineTo(i*140+40,viewportH);CTX.fill();}
    for(let i=0;i<28;i++){const x=(i*83+Math.sin(t*.2+i)*12)%viewportW,y=(i*71-t*(2+i%3)+viewportH*10)%viewportH;CTX.fillStyle=i%3?'#ade9ef44':'#fbe5bc66';CTX.beginPath();CTX.arc(x,y,1+i%2*.6,0,Math.PI*2);CTX.fill();}CTX.restore();
    CTX.fillStyle='#0c2b42aa';roundRect(boardX-7,boardY-7,cellSize*18+14,cellSize*26+14,18);CTX.fill();CTX.strokeStyle='#c9edee33';CTX.lineWidth=1;CTX.stroke();
    // Layered foreground foliage stays outside the playable cells.
    CTX.save();for(let side=0;side<2;side++){const x=side?viewportW+3:-3;for(let i=0;i<7;i++){CTX.strokeStyle=['#20516999','#397b8299','#638c8a66'][i%3];CTX.lineWidth=3+i%2;CTX.beginPath();CTX.moveTo(x,viewportH+5);CTX.quadraticCurveTo(x+(side?-1:1)*(30+i*9),viewportH-20-i*10,x+(side?-1:1)*(12+i*7)+Math.sin(t*.7+i)*3,viewportH-80-i*13);CTX.stroke();}}CTX.restore();
  }

  function drawGrid() {
    CTX.strokeStyle = 'rgba(0, 212, 255, 0.06)';
    CTX.lineWidth = 0.5;
    
    for (let x = 0; x <= BOARD_COLS; x++) {
      const px = boardX + x * cellSize;
      CTX.beginPath();
      CTX.moveTo(px, boardY);
      CTX.lineTo(px, boardY + cellSize * BOARD_ROWS);
      CTX.stroke();
    }
    
    for (let y = 0; y <= BOARD_ROWS; y++) {
      const py = boardY + y * cellSize;
      CTX.beginPath();
      CTX.moveTo(boardX, py);
      CTX.lineTo(boardX + cellSize * BOARD_COLS, py);
      CTX.stroke();
    }
  }
  
  function drawObstacles(){
    if(!engine)return;for(const p of engine.obstacles){const x=boardX+p.x*cellSize,y=boardY+p.y*cellSize,g=CTX.createLinearGradient(x,y,x+cellSize,y+cellSize);g.addColorStop(0,'#a4c1c8');g.addColorStop(1,'#425672');CTX.fillStyle=g;roundRect(x+1,y+1,cellSize-2,cellSize-2,cellSize*.23);CTX.fill();CTX.strokeStyle='#d8edf755';CTX.stroke();CTX.fillStyle='#ceefdb55';roundRect(x+3,y+2,cellSize-6,3,2);CTX.fill();}
  }
  function drawSnakeBody(actor, interpolation) {
    const body=actor.body,prev=actor.prev||body;if(!body.length)return;
    const points=body.map((p,i)=>{const old=prev[i]||prev[prev.length-1]||p;return{x:boardX+(old.x+(p.x-old.x)*interpolation+.5)*cellSize,y:boardY+(old.y+(p.y-old.y)*interpolation+.5)*cellSize};});
    const player=actor.id==='player',colors=player?[charColor,'#429cc0']:actor.id==='a0'?['#f0a4d1','#a86098']:actor.id==='a1'?['#c9b3ff','#8072b9']:['#f8d89a','#b78d56'];
    CTX.save();if(player)CTX.filter=skinFilter||'none';CTX.lineCap='round';CTX.lineJoin='round';
    CTX.strokeStyle='#06142688';CTX.lineWidth=cellSize*.9;CTX.beginPath();points.forEach((p,i)=>i?CTX.lineTo(p.x,p.y+2):CTX.moveTo(p.x,p.y+2));CTX.stroke();
    if(player&&engine.powers.speed>0){CTX.strokeStyle='#b9ebf33d';CTX.lineWidth=cellSize;CTX.beginPath();points.forEach((p,i)=>i?CTX.lineTo(p.x,p.y):CTX.moveTo(p.x,p.y));CTX.stroke();}
    CTX.strokeStyle=colors[1];CTX.lineWidth=cellSize*.73;CTX.beginPath();points.forEach((p,i)=>i?CTX.lineTo(p.x,p.y):CTX.moveTo(p.x,p.y));CTX.stroke();
    for(let i=points.length-1;i>=0;i--){const p=points[i],pulse=player&&!reduced()?1+Math.max(0,growthPulse-i*.018)*.16:1,r=cellSize*(i===0?.45:.37)*pulse;const g=CTX.createRadialGradient(p.x-r*.3,p.y-r*.45,0,p.x,p.y,r);g.addColorStop(0,i===0?'#e6fbff':colors[0]);g.addColorStop(.5,colors[0]);g.addColorStop(1,colors[1]);CTX.fillStyle=g;CTX.beginPath();CTX.arc(p.x,p.y,r,0,Math.PI*2);CTX.fill();if(i%2===0&&i>0){CTX.fillStyle='#ffffff66';CTX.beginPath();CTX.ellipse(p.x-r*.25,p.y-r*.35,r*.28,r*.13,-.7,0,Math.PI*2);CTX.fill();}}
    const h=points[0],angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[actor.dir]||0;
    CTX.translate(h.x,h.y);CTX.rotate(angle);for(const side of [-1,1]){CTX.fillStyle='#f7ffff';CTX.beginPath();CTX.ellipse(cellSize*.16,side*cellSize*.18,cellSize*.13,cellSize*.15,0,0,Math.PI*2);CTX.fill();CTX.fillStyle='#243454';CTX.beginPath();CTX.arc(cellSize*.21,side*cellSize*.18,cellSize*.065,0,Math.PI*2);CTX.fill();CTX.fillStyle='#fff';CTX.beginPath();CTX.arc(cellSize*.23,side*cellSize*.18-cellSize*.025,cellSize*.022,0,Math.PI*2);CTX.fill();}
    CTX.restore();
    if(player&&engine.powers.shield>0){CTX.strokeStyle='#c6efff99';CTX.lineWidth=1.5;CTX.beginPath();CTX.arc(h.x,h.y,cellSize*.67,0,Math.PI*2);CTX.stroke();}
    if(player&&engine.powers.magnet>0){CTX.strokeStyle='#f6cf9855';CTX.setLineDash([3,7]);CTX.beginPath();CTX.arc(h.x,h.y,cellSize*2.6,0,Math.PI*2);CTX.stroke();CTX.setLineDash([]);}
  }

  function drawFood(){
    if(!engine)return;
    const t=performance.now()/1000;
    for(const f of engine.food){const x=boardX+(f.x+.5)*cellSize,y=boardY+(f.y+.5)*cellSize,r=cellSize*.32;
      CTX.save();CTX.translate(x,y);
      const colors={berry:'#f7ae92',cake:'#f2c9d0',star:'#ffe3a2',speed:'#a2e9c9',magnet:'#c9b3ef',shield:'#a7d8f4'},color=colors[f.kind];
      const aura=CTX.createRadialGradient(0,0,0,0,0,r*2.2);aura.addColorStop(0,color+'50');aura.addColorStop(1,color+'00');CTX.fillStyle=aura;CTX.beginPath();CTX.arc(0,0,r*2.2,0,Math.PI*2);CTX.fill();
      if(f.kind==='berry'){
        const g=CTX.createRadialGradient(-r*.3,-r*.4,0,0,0,r);g.addColorStop(0,'#ffe0ae');g.addColorStop(.5,'#efa47d');g.addColorStop(1,'#bc6476');CTX.fillStyle=g;CTX.beginPath();CTX.arc(0,0,r,0,Math.PI*2);CTX.fill();
        CTX.fillStyle='#b1d4a9';CTX.beginPath();CTX.ellipse(r*.2,-r*.9,r*.5,r*.2,-.5,0,Math.PI*2);CTX.fill();CTX.fillStyle='#fff8';CTX.beginPath();CTX.ellipse(-r*.25,-r*.3,r*.2,r*.1,-.8,0,Math.PI*2);CTX.fill();
      }else if(f.kind==='cake'){
        CTX.fillStyle='#bd858e';roundRect(-r,-r*.5,r*2,r*1.4,r*.25);CTX.fill();CTX.fillStyle='#fae8ce';roundRect(-r,-r*.8,r*2,r*.85,r*.3);CTX.fill();CTX.fillStyle='#efacae';CTX.fillRect(-r*.85,r*.15,r*1.7,r*.24);CTX.fillStyle='#d88b9c';CTX.beginPath();CTX.arc(0,-r*.9,r*.35,0,Math.PI*2);CTX.fill();
      }else if(f.kind==='star'){
        CTX.rotate(Math.sin(t+f.x)*.12);drawStar(0,0,r*1.1,'#f5d68f');drawStar(-r*.1,-r*.1,r*.65,'#fff2c9');
      }else{
        CTX.fillStyle='#244359';CTX.strokeStyle=color;CTX.lineWidth=1.1;CTX.beginPath();CTX.arc(0,0,r*1.15,0,Math.PI*2);CTX.fill();CTX.stroke();CTX.strokeStyle=color;CTX.fillStyle=color;CTX.lineWidth=1.6;
        if(f.kind==='speed'){CTX.beginPath();CTX.moveTo(r*.2,-r*.8);CTX.lineTo(-r*.5,r*.1);CTX.lineTo(r*.1,r*.1);CTX.lineTo(-r*.2,r*.8);CTX.lineTo(r*.6,-r*.15);CTX.lineTo(0,-r*.15);CTX.closePath();CTX.fill();}
        else if(f.kind==='magnet'){CTX.beginPath();CTX.moveTo(-r*.5,-r*.6);CTX.lineTo(-r*.5,r*.2);CTX.quadraticCurveTo(0,r*.9,r*.5,r*.2);CTX.lineTo(r*.5,-r*.6);CTX.stroke();}
        else{CTX.beginPath();CTX.moveTo(0,-r*.7);CTX.lineTo(r*.65,-r*.3);CTX.lineTo(r*.5,r*.35);CTX.lineTo(0,r*.8);CTX.lineTo(-r*.5,r*.35);CTX.lineTo(-r*.65,-r*.3);CTX.closePath();CTX.stroke();}
      }CTX.restore();
    }
  }

  function drawStar(x, y, size, color) {
    CTX.fillStyle = color;
    CTX.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? size : size * 0.5;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) CTX.moveTo(px, py);
      else CTX.lineTo(px, py);
    }
    CTX.closePath();
    CTX.fill();
  }
  
  function drawParticles() {
    renderState.particles = renderState.particles.filter(p => p.life > 0);
    
    for (const p of renderState.particles) {
      p.x += p.vx * frameDelta * 60;
      p.y += p.vy * frameDelta * 60;
      p.vy += frameDelta * 9;
      p.life -= frameDelta * 1.2;
      
      CTX.save();
      CTX.globalAlpha = Math.max(0,p.life) * 0.8;
      CTX.fillStyle = p.color || '#00ff88';
      CTX.beginPath();
      CTX.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      CTX.fill();
      CTX.restore();
    }
  }
  
  function drawFloatTexts() {
    renderState.floatTexts = renderState.floatTexts.filter(t => t.life > 0);
    
    for (const t of renderState.floatTexts) {
      t.y -= frameDelta * 30;
      t.life -= frameDelta * 1.8;
      
      CTX.save();
      CTX.globalAlpha = Math.max(0,t.life);
      CTX.font = 'bold 16px sans-serif';
      CTX.fillStyle = t.color || '#00ffff';
      CTX.textAlign = 'center';
      CTX.textBaseline = 'middle';
      CTX.fillText(t.text, t.x, t.y);
      CTX.restore();
    }
  }
  
  function emitParticles(x, y, count = 6) {
    const px = boardX + (x + 0.5) * cellSize;
    const py = boardY + (y + 0.5) * cellSize;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 1 + Math.random() * 2;
      renderState.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color: '#00ff88',
        life: 1
      });
    }
  }
  
  function addFloatText(text, x, y, color = '#00ffff') {
    renderState.floatTexts.push({
      text,
      x: boardX + (x + 0.5) * cellSize,
      y: boardY + (y + 0.5) * cellSize,
      color,
      life: 1
    });
  }
  
  function updateHUD() {
    if (!engine) return;
    
    SCORE_VAL.textContent = engine.score.toString();
    
    if (engine.combo > 1) {
      COMBO_CHIP.style.display = 'flex';
      COMBO_VAL.textContent = engine.combo.toString();
      if (engine.combo > gameState.lastMaxCombo) {
        gameState.lastMaxCombo = engine.combo;
      }
    } else {
      COMBO_CHIP.style.display = 'none';
    }
    
    if (engine.goal !== null) {
      GOAL_CHIP.style.display = 'flex';
      EATEN_VAL.textContent = engine.eaten.toString();
      GOAL_VAL.textContent = engine.goal.toString();
    } else {
      GOAL_CHIP.style.display = 'none';
    }
    
    for (const kind of POWER_CHIPS) {
      const chip = document.getElementById('power-' + kind);
      const remaining = engine.powers[kind];
      if (remaining > 0) {
        chip.style.display = 'flex';
        const bar = chip.querySelector('.power-bar');
        const maxTime = kind === 'shield' ? 12 : 7;
        const percent = Math.max(0, Math.min(1, remaining / maxTime));
        bar.style.transform = `scaleX(${percent})`;
      } else {
        chip.style.display = 'none';
      }
    }
    
    const cooldownRemaining = Math.max(0,gameState.boostCooldown - (engine.time - gameState.boostLastTime));
    BOOST_BTN.setAttribute('aria-label',cooldownRemaining>0?'冲刺冷却中':'加速冲刺');
    if (cooldownRemaining > 0) {
      BOOST_BTN.classList.add('cooldown');
    } else {
      BOOST_BTN.classList.remove('cooldown');
    }
  }
  
  function snapshot(){return [engine.player,...engine.ai].filter(a=>a.alive||a===engine.player).map(a=>({id:a.id,dir:a.dir,body:a.body.map(p=>({...p})),prev:(a.prev||a.body).map(p=>({...p}))}));}
  function handleEvents(events) {
    for(const evt of events){
      if(evt.type==='eat'){
        growthPulse=1;emitParticles(evt.x,evt.y,reduced()?2:12);addFloatText('+'+evt.value,evt.x,evt.y,'#f5dfad');
        gameState.lastMaxCombo=Math.max(gameState.lastMaxCombo,evt.combo);
        const power=['speed','magnet','shield'].includes(evt.kind);GameAudio.sfx(power?'power':evt.combo>1?'combo':'eat',{rate:Math.min(1.7,1+evt.combo*.075)});
        if(evt.combo>1){addFloatText('×'+evt.combo,evt.x,evt.y-1,'#c2c3ff');GameFXLib.combo(evt.combo,(boardX+evt.x*cellSize)/viewportW,(boardY+evt.y*cellSize)/viewportH);}
      }else if(evt.type==='death'){GameAudio.sfx('lose');emitParticles(evt.x,evt.y,reduced()?4:26);shake=reduced()?0:8;deathWait=1.05;gameState.playing=false;}
      else if(evt.type==='shieldbreak'){GameAudio.sfx('invalid');shake=reduced()?0:3;emitParticles(evt.x,evt.y,12);}
      else if(evt.type==='aideath')emitParticles(evt.x,evt.y,8);
      else if(evt.type==='win'){GameAudio.sfx('win');GameFXLib.win();deathWait=.55;gameState.playing=false;}
    }
    renderState.particles=renderState.particles.slice(-140);renderState.floatTexts=renderState.floatTexts.slice(-14);
  }
  function gameLoop(now) {
    let dt=Math.min(Math.max((now-renderState.lastTime)/1000,0),.04);renderState.lastTime=now;
    requestAnimationFrame(gameLoop);
    if(!FX.running||!engine)return;
    const paused=FX.paused||gameState.paused||document.hidden;
    if(paused){dt=0;renderState.accumulator=0;}
    if(gameState.playing&&!paused){
      if(ready>0)ready-=dt;else{
        renderState.accumulator+=dt;let n=0;
        while(engine.phase==='playing'&&renderState.accumulator>=SnakeEngine.interval(engine)&&n++<3){
          const interval=SnakeEngine.interval(engine);renderState.accumulator-=interval;
          const events=SnakeEngine.step(engine,interval);
          renderState.deathFrames.push(snapshot());if(renderState.deathFrames.length>40)renderState.deathFrames.shift();handleEvents(events);
        }
      }
    }
    if(deathWait>0&&!paused){deathWait-=dt;if(deathWait<=0)showResultPanel();}
    let actors=null,alpha=engine.phase==='playing'?Math.min(renderState.accumulator/SnakeEngine.interval(engine),1):1;
    if(replayTime>=0&&!paused){replayTime+=dt;const v=Math.min(replayFrames.length-.001,replayTime/1.6*replayFrames.length),index=Math.floor(v);actors=replayFrames[index];alpha=v-index;if(replayTime>=1.6){replayTime=-1;actors=null;showResultPanel();}}
    frameDelta=dt;growthPulse=Math.max(0,growthPulse-dt*2);shake=Math.max(0,shake-dt*12);
    CTX.clearRect(0,0,viewportW,viewportH);drawBackground();CTX.save();
    if(shake&&!paused)CTX.translate(Math.sin(now*.11)*shake,Math.cos(now*.09)*shake*.4);
    drawGrid();drawObstacles();drawFood();
    for(const a of actors||[...engine.ai.filter(a=>a.alive),engine.player])drawSnakeBody(a,alpha);
    drawParticles();drawFloatTexts();CTX.restore();
    if(replayTime>=0){CTX.fillStyle='#e4f5ff';CTX.font='12px sans-serif';CTX.textAlign='center';CTX.fillText('↶ 精彩回放 · 不计分',viewportW/2,boardY-18);}
    else if(ready>0){CTX.fillStyle='#e4f5ff';CTX.font='13px sans-serif';CTX.textAlign='center';CTX.fillText('轻划转向 · 收集星果',viewportW/2,boardY+cellSize*26+24);}
    updateHUD();
  }

  function showResultPanel() {
    if (!gameState.playing && engine) {
      const isDeath = engine.phase === 'dead';
      document.getElementById('result-header').textContent = isDeath ? '星光暂歇' : '目标达成';
      document.getElementById('final-score').textContent = engine.score.toString();
      document.getElementById('final-length').textContent = engine.player.body.length.toString();
      document.getElementById('final-combo').textContent = gameState.lastMaxCombo.toString();
      
      document.getElementById('length-row').style.display = 'flex';
      document.getElementById('combo-row').style.display = 'flex';
      
      if (isDeath && renderState.deathFrames.length > 0) {
        document.getElementById('replay-btn').style.display = 'flex';
      } else {
        document.getElementById('replay-btn').style.display = 'none';
      }
      
      RESULT_PANEL.style.display = 'flex';
    }
  }
  
  function showWinResult() {
    document.getElementById('result-header').textContent = '胜利';
    if (engine) {
      document.getElementById('final-score').textContent = engine.score.toString();
      document.getElementById('final-length').textContent = engine.player.body.length.toString();
      document.getElementById('final-combo').textContent = gameState.lastMaxCombo.toString();
    }
    document.getElementById('length-row').style.display = 'flex';
    document.getElementById('combo-row').style.display = 'flex';
    document.getElementById('replay-btn').style.display = 'none';
    RESULT_PANEL.style.display = 'flex';
  }
  
  function applySkin(sel={}){skinFilter=sel.skin&&sel.skin.filter||'none';charColor={lan:'#9beeff',mo:'#a8efd1',li:'#f4d4a6',xing:'#d0b4fa',hu:'#f5bf9d'}[sel.char]||'#9beeff';}
  function startRun(sel={}) {
    const mode={story:'levels',endless:'arena'}[sel.mode]||sel.mode;
    gameState.mode=['classic','levels','arena'].includes(mode)?mode:'classic';gameState.level=Math.max(0,Math.min(5,Math.floor(sel.stage)||0));
    gameState.isInvite=GameInviteV0.active();gameState.finished=false;gameState.playing=true;gameState.paused=false;
    gameState.lastMaxCombo=0;gameState.boostLastTime=-99;gameState.touchId=null;gameState.joyId=null;
    engine=SnakeEngine.create({mode:gameState.mode,level:gameState.level});applySkin(sel);
    renderState.accumulator=0;renderState.lastTime=performance.now();renderState.floatTexts=[];renderState.particles=[];renderState.deathFrames=[];
    deathWait=0;replayTime=-1;ready=.7;growthPulse=0;shake=0;
    FX.running=true;FX.paused=false;Lobby.hide();GAME_ROOT.style.display='flex';RESULT_PANEL.style.display='none';SETTINGS_OVERLAY.style.display='none';
    BOOST_BTN.style.display='flex';VIRTUAL_JOYSTICK.style.display=gameState.controlType==='joystick'?'block':'none';
    document.getElementById('mode-label').textContent={classic:'潮汐漫游',levels:SnakeEngine.LEVELS[engine.level].name,arena:'星海竞技 · 本机AI'}[engine.mode];
    document.getElementById('best-val').textContent=gameState.bestScore;
    GameAudio.bgm('snake');resizeCanvas();updateHUD();
  }
  function quitGame(){gameState.playing=false;gameState.finished=true;gameState.paused=false;gameState.touchId=null;gameState.joyId=null;deathWait=0;replayTime=-1;FX.running=false;FX.paused=false;GAME_ROOT.style.display='none';RESULT_PANEL.style.display='none';SETTINGS_OVERLAY.style.display='none';GameAudio.stop();}
  function finishGame(){
    if(!engine||gameState.finished||!FX.running)return;gameState.finished=true;
    const score=engine.score,won=engine.phase==='won',level=gameState.level,mode=gameState.mode;
    if(gameState.isInvite){quitGame();GameInviteV0.finish(score);return;}
    if(score>gameState.bestScore){gameState.bestScore=score;let saved={};try{saved=JSON.parse(read('snake')||'{}')||{}}catch(_){};write('snake',JSON.stringify({...saved,bestScore:score}));}
    quitGame();Lobby.reportResult({stage:mode==='levels'?level:undefined,score,stars:won?Math.min(3,1+(gameState.lastMaxCombo>=3?1:0)+(gameState.lastMaxCombo>=6?1:0)):0,coins:Math.floor(score/20),gems:0,win:won});
  }
  function setControl(type){if(!['swipe','joystick'].includes(type))return;gameState.controlType=type;write('snake-control',type);document.getElementById('control-select').value=type;VIRTUAL_JOYSTICK.style.display=type==='joystick'?'block':'none';resizeCanvas();}
  function steer(dir){if(!engine||!gameState.playing||gameState.paused||FX.paused)return false;const ok=SnakeEngine.turn(engine,dir);if(ok)GameAudio.sfx('tap',{rate:1.04});return ok;}
  function boost(){if(!engine||!gameState.playing||FX.paused||gameState.paused||engine.phase!=='playing')return false;if(engine.time-gameState.boostLastTime<6){GameAudio.sfx('invalid');return false;}gameState.boostLastTime=engine.time;engine.powers.speed=Math.max(engine.powers.speed,2.4);GameAudio.sfx('power');return true;}

  function handlePointerDown(e) {
    if (!gameState.playing || gameState.paused || FX.paused || gameState.controlType!=='swipe') return;
    if (!e.isPrimary || (e.pointerType==='mouse'&&e.button!==0)) return;
    
    try {
      if (e.touches && e.touches.length > 1) return;
      CANVAS.setPointerCapture(e.pointerId);
    } catch (err) {
      return;
    }
    
    gameState.touchId = e.pointerId;
    gameState.touchStartX = e.clientX;
    gameState.touchStartY = e.clientY;
    gameState.touchLastX = e.clientX;
    gameState.touchLastY = e.clientY;
  }
  
  function handlePointerMove(e) {
    if (gameState.touchId !== e.pointerId || !gameState.playing || gameState.paused || FX.paused || gameState.controlType!=='swipe') return;
    
    const dx = e.clientX - gameState.touchStartX;
    const dy = e.clientY - gameState.touchStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = gameState.swipeThreshold;
    
    if (dist > threshold) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      let dir = null;
      
      if (absDx > absDy) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }
      
      if (dir) {
        steer(dir);
        gameState.touchStartX = e.clientX;
        gameState.touchStartY = e.clientY;
      }
    }
    
    gameState.touchLastX = e.clientX;
    gameState.touchLastY = e.clientY;
  }
  
  function handlePointerUp(e) {
    if(e.type==='pointerup')handlePointerMove(e);
    if (gameState.touchId !== e.pointerId) return;
    
    try {
      CANVAS.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    gameState.touchId = null;
  }
  
  function handleKeyDown(e) {
    if (!gameState.playing || FX.paused || gameState.paused) return;
    
    const dirMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const dir = dirMap[e.key];
    
    if (dir) {
      e.preventDefault();
      steer(dir);
    }
  }
  
  function initEventListeners(){
    CANVAS.addEventListener('pointerdown',handlePointerDown);CANVAS.addEventListener('pointermove',handlePointerMove);
    for(const e of ['pointerup','pointercancel','lostpointercapture'])CANVAS.addEventListener(e,handlePointerUp);
    document.addEventListener('keydown',handleKeyDown);
    BOOST_BTN.onclick=boost;PAUSE_BTN.onclick=()=>{if(FX.running)Lobby.pauseMenu();};
    GEAR_BTN.onclick=()=>{if(!gameState.playing)return;gameState.paused=true;SETTINGS_OVERLAY.style.display='flex';};
    document.getElementById('settings-close').onclick=()=>{SETTINGS_OVERLAY.style.display='none';gameState.paused=false;};
    document.getElementById('control-select').onchange=e=>setControl(e.target.value);
    document.getElementById('music-toggle').onchange=e=>{gameState.musicEnabled=e.target.checked;write('snake-music',String(e.target.checked));GameAudio.volumes({bgm:e.target.checked?.22:0});};
    document.getElementById('finish-btn').onclick=finishGame;
    document.getElementById('replay-btn').onclick=()=>{if(!renderState.deathFrames.length)return;RESULT_PANEL.style.display='none';replayFrames=renderState.deathFrames.slice(-12);replayTime=0;};
    VIRTUAL_JOYSTICK.addEventListener('pointerdown',e=>{if(!e.isPrimary||!gameState.playing||gameState.paused||FX.paused)return;e.preventDefault();gameState.joyId=e.pointerId;try{VIRTUAL_JOYSTICK.setPointerCapture(e.pointerId)}catch(_){};joystickMove(e);});
    function joystickMove(e){if(gameState.joyId!==e.pointerId||!gameState.playing||FX.paused||gameState.paused)return;const r=VIRTUAL_JOYSTICK.getBoundingClientRect(),dx=e.clientX-r.x-r.width/2,dy=e.clientY-r.y-r.height/2,m=Math.hypot(dx,dy),max=r.width*.29;JOYSTICK_KNOB.style.transform=`translate(calc(-50% + ${m?dx*Math.min(1,max/m):0}px),calc(-50% + ${m?dy*Math.min(1,max/m):0}px))`;JOYSTICK_KNOB.classList.add('active');if(m>12)steer(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');}
    VIRTUAL_JOYSTICK.addEventListener('pointermove',joystickMove);
    const release=()=>{gameState.joyId=null;JOYSTICK_KNOB.style.transform='translate(-50%,-50%)';JOYSTICK_KNOB.classList.remove('active');};
    for(const e of ['pointerup','pointercancel','lostpointercapture'])VIRTUAL_JOYSTICK.addEventListener(e,release);
    window.addEventListener('resize',resizeCanvas);window.addEventListener('blur',()=>{gameState.touchId=null;release();if(FX.running&&!FX.paused)Lobby.pauseMenu();});
  }
  function loadSettings(){try{const data=JSON.parse(read('snake')||'{}');if(Number.isFinite(data?.bestScore))gameState.bestScore=Math.max(0,data.bestScore);}catch(_){}
    const control=read('snake-control');if(['swipe','joystick'].includes(control))gameState.controlType=control;document.getElementById('control-select').value=gameState.controlType;
    gameState.musicEnabled=read('snake-music')!=='false';document.getElementById('music-toggle').checked=gameState.musicEnabled;if(!gameState.musicEnabled)GameAudio.volumes({bgm:0});
  }
  function init(){
    FX.init({landscape:false});loadSettings();initEventListeners();GameAudio.mount();GameAudio.setPauseCheck(()=>FX.paused||!FX.running||gameState.paused);
    FX.load(['bg-undersea','bg-forest','bg-moon','bg-garden','lan-chibi','mo-chibi','li-chibi','xing-chibi','hu-chibi','item-star','item-ice','item-heart','item-shield']).then(()=>{
      Lobby.init({id:'snake',title:'蓝蓝的幻光蛇境',orientation:'portrait',bg:['bg-undersea'],
      modes:[{id:'classic',name:'经典',icon:'item-star'},{id:'levels',name:'关卡',icon:'item-ice'},{id:'arena',name:'竞技场',icon:'item-shield'}],
      stages:SnakeEngine.LEVELS.map((s,i)=>({id:'s'+i,name:s.name,bg:s.theme==='forest'?'bg-forest':s.theme==='night'?'bg-moon':'bg-undersea'})),
      chars:[['lan','蓝蓝'],['mo','小模'],['li','栗栗'],['xing','星眠'],['hu','橙铃']].map(([id,name])=>({id,name,img:id+'-chibi',chibi:id+'-chibi',hp:100,atk:80,speed:100})),
      skins:[{id:'0',name:'潮蓝',filter:'none',rarity:'N'},{id:'1',name:'樱珊瑚',filter:'hue-rotate(90deg) saturate(1.1)',rarity:'R'},{id:'2',name:'星河',filter:'hue-rotate(220deg)',rarity:'R'}],currency:[{id:'coin',icon:'item-heart'},{id:'gem',icon:'item-star'}],onStart:startRun,onQuit:quitGame,onSkinChange:applySkin});
      GameInviteV0.launch('snake',startRun);
    });resizeCanvas();requestAnimationFrame(gameLoop);
  }

  window.__game = {
    state: () => ({
      score: engine ? engine.score : 0,
      mode: gameState.mode,
      level: gameState.level,
      length: engine ? engine.player.body.length : 0,
      combo: engine ? engine.combo : 0,
      food: engine ? engine.food.length : 0,
      ai: engine ? engine.ai.filter(a => a.alive).length : 0,
      powers: engine ? { ...engine.powers } : {},
      phase: engine ? engine.phase : 'idle',
      dir: engine ? engine.player.dir : 'right',
      body: engine ? engine.player.body.map(p=>({...p})) : [],
      queue:engine?engine.player.queue.slice():[],
      replaying:replayTime>=0,
      history:renderState.deathFrames.length,
      particles:renderState.particles.length,
      skin:skinFilter,
      best: gameState.bestScore,
      control: gameState.controlType
    }),
    start: startRun,
    turn:steer,
    boost,
    finish:finishGame,
    setControl

  };
  
  init();
})();