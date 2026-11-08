(function() {
  'use strict';

  const CONFIG = {
    classic: { size: 4, limit: null },
    expanded: { size: 5, limit: null },
    challenge: { size: 4, limit: 60 }
  };

  let state = {
    grid: null,
    score: 0,
    best: 0,
    size: 4,
    mode: 'classic',
    remaining: null,
    undoLeft: 3,
    won: false,
    continued: false,
    phase: 'idle',
    animating: false,
    finished: false,
    undoStack: [],
    inviteMode: false,
    restartToken: null,
    quitToken: null
  };

  FX.init({landscape:false});
  let roundToken=0, animationTimer=0;
  let dom = {};
  let pointerState = { active: false, startX: 0, startY: 0 };
  const SWIPE_THRESHOLD = 24;
  const SCORE_RATE_BASE = 0.65;
  const SCORE_RATE_INCREMENT = 0.085;
  const SCORE_RATE_CAP = 1.8;

  function loadBest(mode) {
    try {
      const parsed=JSON.parse(localStorage.getItem('lili-2048-rework')||'{}');
      const old=mode==='classic'?JSON.parse(localStorage.getItem('lili-2048')||'{}').bestScore:0;
      const value=Number.isFinite(parsed?.[mode])&&parsed[mode]>=0?parsed[mode]:0;
      return Math.max(value,Number.isFinite(old)&&old>=0?old:0);
    } catch (_) { return 0; }
  }

  function saveBest(mode, score) {
    if (state.inviteMode) return;
    try {
      const data = localStorage.getItem('lili-2048-rework');
      const parsed = data ? JSON.parse(data) : {};
      if (score > (parsed[mode] || 0)) {
        parsed[mode] = score;
        localStorage.setItem('lili-2048-rework', JSON.stringify(parsed));
      }
    } catch {}
  }

  function initDOM() {
    const root = document.createElement('div');
    root.id = 'game-root';
    root.innerHTML = `
      <div class="moon"></div>
      <div class="petal"></div>
      <div class="petal"></div>
      <div class="petal"></div>
      <div class="petal"></div>
      <div class="petal"></div>
      <div class="petal"></div>
      <div id="game-container">
        <div id="hud">
          <div class="stat-box"><div class="stat-label">分数</div><div class="stat-value" id="score-display">0</div></div>
          <div class="stat-box"><div class="stat-label">最佳</div><div class="stat-value" id="best-display">0</div></div>
          <div class="stat-box"><div class="stat-label">模式</div><div class="stat-value" id="mode-display">经典</div></div>
          <div class="stat-box" id="challenge-box" style="display:none"><div class="stat-label">挑战</div><div class="stat-value" id="remaining-display">60</div></div>
        </div>
        <div id="board-wrapper">
          <div id="board" class="size-4"></div>
          <div id="overlay"><div class="overlay-content"><div class="overlay-title" id="overlay-title"></div><div class="overlay-message" id="overlay-message"></div><div class="overlay-actions" id="overlay-actions"></div></div></div>
        </div>
        <div id="controls">
          <button class="icon-btn" id="undo-btn" aria-label="撤销">↶<span class="badge" id="undo-badge">3</span></button>
          <button class="icon-btn" id="restart-btn" aria-label="重新开始">⟳</button>
          <button class="icon-btn" id="finish-btn" aria-label="完成">✓</button>
          <button class="icon-btn" id="pause-btn" aria-label="暂停" >⏸</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    dom.root = root;
    dom.board = root.querySelector('#board');
    dom.scoreDisplay = root.querySelector('#score-display');
    dom.bestDisplay = root.querySelector('#best-display');
    dom.modeDisplay = root.querySelector('#mode-display');
    dom.remainingDisplay = root.querySelector('#remaining-display');
    dom.challengeBox = root.querySelector('#challenge-box');
    dom.undoBtn = root.querySelector('#undo-btn');
    dom.undoBadge = root.querySelector('#undo-badge');
    dom.restartBtn = root.querySelector('#restart-btn');
    dom.finishBtn = root.querySelector('#finish-btn');
    dom.pauseBtn = root.querySelector('#pause-btn');
    dom.overlay = root.querySelector('#overlay');
    dom.overlayTitle = root.querySelector('#overlay-title');
    dom.overlayMessage = root.querySelector('#overlay-message');
    dom.overlayActions = root.querySelector('#overlay-actions');

    dom.undoBtn.addEventListener('click', () => {
      GameAudio.sfx('button');
      undo();
    });
    dom.restartBtn.addEventListener('click', () => {
      GameAudio.sfx('button');
      confirmRestart();
    });
    dom.finishBtn.addEventListener('click', () => {
      GameAudio.sfx('button');
      confirmFinish();
    });
    dom.pauseBtn.addEventListener('click', () => {
      GameAudio.sfx('button');
      if (typeof Lobby !== 'undefined' && Lobby.pauseMenu) {
        Lobby.pauseMenu();
      }
    });

    setupInput();
    window.addEventListener('resize',()=>{if(state.grid&&!state.animating)renderBoard();});
    window.addEventListener('blur',handlePointerCancel);
  }

  function setupInput() {
    dom.board.addEventListener('pointerdown', handlePointerDown, { passive: false });
    dom.board.addEventListener('pointermove', handlePointerMove, { passive: false });
    dom.board.addEventListener('pointerup', handlePointerUp, { passive: false });
    dom.board.addEventListener('pointercancel', handlePointerCancel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);
    dom.board.addEventListener('lostpointercapture',handlePointerCancel);
  }

  function handlePointerDown(e) {
    if (!FX.running || FX.paused || (e.pointerType === 'mouse' && e.button !== 0) || !e.isPrimary || state.animating || state.phase !== 'playing' || dom.overlay.classList.contains('active')) return;
    e.preventDefault();
    pointerState.active = true; pointerState.id=e.pointerId;
    try { dom.board.setPointerCapture(e.pointerId); } catch (_) {}
    pointerState.startX = e.clientX;
    pointerState.startY = e.clientY;
  }

  function handlePointerMove(e) {
    if (!pointerState.active) return;
    e.preventDefault();
  }

  function handlePointerUp(e) {
    if (!pointerState.active || !e.isPrimary || e.pointerId !== pointerState.id) return;
    e.preventDefault();
    pointerState.active = false;

    const dx = e.clientX - pointerState.startX;
    const dy = e.clientY - pointerState.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) return;

    let dir = null;
    if (absDx > absDy) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }

    if (dir) move(dir);
  }

  function handlePointerCancel() {
    pointerState.active = false;
  }

  function handleKeyDown(e) {
    if (state.animating || state.phase !== 'playing' || dom.overlay.classList.contains('active')) return;
    if (typeof Lobby !== 'undefined' && typeof FX !== 'undefined' && (FX.paused || !FX.running)) return;

    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
      z: 'undo', Z: 'undo'
    };

    const action = keyMap[e.key];
    if (!action) return;
    e.preventDefault();
    if (action === 'undo') {
      undo();
    } else {
      move(action);
    }
  }

  function startRun(inviteOptions) {
    const isInvite = !!(inviteOptions && typeof GameInviteV0 !== 'undefined' && GameInviteV0.active());
    const mode = (inviteOptions && inviteOptions.mode) || 'classic';
    const normalizedMode = CONFIG[mode] ? mode : 'classic';

    const config = CONFIG[normalizedMode];
    roundToken++; clearTimeout(animationTimer);
    pointerState.active=false;
    state.grid = Array.from({length:config.size},()=>Array(config.size).fill(0));
    FX.running=true; FX.paused=false;
    dom.overlay.classList.remove('active');
    dom.root.querySelectorAll('.score-floater').forEach(el=>el.remove());
    state.score = 0;
    state.best = loadBest(normalizedMode);
    state.size = config.size;
    state.mode = normalizedMode;
    state.remaining = config.limit;
    state.undoLeft = 3;
    state.won = false;
    state.continued = false;
    state.phase = 'playing';
    state.animating = false;
    state.finished = false;
    state.undoStack = [];
    state.inviteMode = isInvite;
    state.restartToken = null;
    state.quitToken = null;

    const spawn1 = Puzzle2048.spawn(state.grid);
    state.grid = spawn1.board;
    const spawn2 = Puzzle2048.spawn(state.grid);
    state.grid = spawn2.board;

    Lobby.hide();dom.root.classList.add('active');
    dom.board.className = `size-${state.size}`;
    dom.modeDisplay.textContent = { classic: '经典', expanded: '扩展', challenge: '挑战' }[state.mode];
    dom.challengeBox.style.display = state.remaining !== null ? 'block' : 'none';

    updateDisplay();
    renderBoard();

    if (typeof GameAudio !== 'undefined') {
      GameAudio.bgm('lili-2048');
    }
  }

  function move(dir) {
    if (state.animating || state.phase !== 'playing' || dom.overlay.classList.contains('active')) return;
    if (typeof Lobby !== 'undefined' && typeof FX !== 'undefined' && (FX.paused || !FX.running)) return;

    const result = Puzzle2048.slide(state.grid, dir);
    if (!result.changed) {
      GameAudio.sfx('invalid');
      return;
    }

    saveUndo();

    state.animating = true;
    const gain = result.gain;
    state.score += gain;

    if (state.remaining !== null) {
      state.remaining--;
    }

    GameAudio.sfx('swap');
    if (result.merges.length > 0) {
      const high=Math.max(...result.merges.map(m=>m.value));
      GameAudio.sfx('merge',{rate:Math.min(SCORE_RATE_CAP,SCORE_RATE_BASE+Math.log2(high)*SCORE_RATE_INCREMENT)});
    }

    animateMove(result, () => {
      state.grid = result.board;
      const spawnResult = Puzzle2048.spawn(state.grid);
      state.grid = spawnResult.board;

      renderBoard();
      result.merges.forEach(m=>getTileElement(m.r,m.c)?.classList.add('merge-pop'));
      const spawnTile = spawnResult.tile;
      if (spawnTile) {
        const el = getTileElement(spawnTile.r, spawnTile.c);
        if (el) {
          el.classList.add('pop');
          setTimeout(() => el.classList.remove('pop'), 150);
        }
      }

      updateDisplay();

      if (!state.inviteMode) {
        saveBest(state.mode, state.score);
        state.best = Math.max(state.best, state.score);
        dom.bestDisplay.textContent = state.best;
      }

      if (gain > 0) {
        showScoreFloater(gain);
      }

      checkWin();
      checkLoss();

      state.animating = false;
    });
  }

  function animateMove(result, callback) {
    const token=roundToken;
    dom.board.querySelectorAll('.tile').forEach(el=>el.remove());
    const tiles=result.motions.map(m=>{
      const el=document.createElement('div');el.className='tile';el.dataset.value=m.value;el.textContent=m.value;
      positionTile(el,m.from.r,m.from.c);dom.board.appendChild(el);return{el,to:m.to};
    });
    void dom.board.offsetWidth;
    requestAnimationFrame(()=>{
      if(token!==roundToken)return;
      tiles.forEach(({el,to})=>positionTile(el,to.r,to.c));
      animationTimer=setTimeout(()=>{if(token!==roundToken)return;tiles.forEach(t=>t.el.remove());callback();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:125);
    });
  }

  function saveUndo() {
    state.undoStack.push({
      grid: JSON.parse(JSON.stringify(state.grid)),
      score: state.score,
      remaining: state.remaining,
      won: state.won,
      continued: state.continued,
      phase: state.phase
    });
    if (state.undoStack.length > 3) {
      state.undoStack.shift();
    }
  }

  function undo() {
    if (state.finished || state.undoLeft === 0 || state.undoStack.length === 0 || state.animating) return;
    if (typeof Lobby !== 'undefined' && typeof FX !== 'undefined' && (FX.paused || !FX.running)) return;

    const snapshot = state.undoStack.pop();
    state.grid = snapshot.grid;
    state.score = snapshot.score;
    state.remaining = snapshot.remaining;
    state.won = snapshot.won;
    state.continued = snapshot.continued;
    state.phase = snapshot.phase;
    state.undoLeft--;

    if (dom.overlay.classList.contains('active')) {
      dom.overlay.classList.remove('active');
    }

    updateDisplay();
    renderBoard();
    GameAudio.sfx('power');
  }

  function milestone() {
    const actions=[];
    if(state.remaining===null || state.remaining>0)actions.push({icon:'▶',label:'继续',action:continueGame});
    if(state.undoLeft>0 && state.undoStack.length)actions.push({icon:'↶',label:'撤销',action:undo});
    actions.push({icon:'✓',label:'完成',action:finish});
    showOverlay('星糖闪耀 · 2048','已达成目标，继续探索更高数字',actions);
  }
  function checkWin() {
    if(!state.won && state.grid.some(row=>row.some(v=>v>=2048))){state.won=true;state.phase='won';GameAudio.sfx('win');milestone();}
  }
  function checkLoss() {
    if(state.finished || state.phase==='won')return;
    if((state.remaining!==null && state.remaining<=0) || !Puzzle2048.hasMoves(state.grid)){
      const newlyLost=state.phase!=='lost';state.phase='lost';
      if(newlyLost)GameAudio.sfx('lose');
      const actions=[];
      if(state.undoLeft>0 && state.undoStack.length)actions.push({icon:'↶',label:'撤销',action:undo});
      actions.push({icon:'✓',label:'完成',action:finish});
      showOverlay(state.remaining!==null && state.remaining<=0?'挑战结束':'棋盘已满',`最终分数 ${state.score}`,actions);
    }
  }
  function continueGame() {
    if(state.phase!=='won'||state.finished||(state.remaining!==null && state.remaining<=0))return;
    state.continued=true;state.phase='playing';dom.overlay.classList.remove('active');GameAudio.sfx('button');checkLoss();
  }

  function showOverlay(title, message, actions) {
    dom.overlayTitle.textContent = title;
    dom.overlayMessage.textContent = message;
    dom.overlayActions.innerHTML = '';

    actions.forEach(({ icon, label, action }) => {
      const btn = document.createElement('button');
      btn.className = 'overlay-btn';
      btn.textContent = icon;
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', action);
      dom.overlayActions.appendChild(btn);
    });

    dom.overlay.classList.add('active');
  }

  function confirmRestart() {
    if(state.animating || state.finished || dom.overlay.classList.contains('active'))return;
    state.restartToken = Math.random();
    const token = state.restartToken;
    showOverlay('重新开始？', '当前进度将丢失', [
      { icon: '✓', label: '确认', action: () => {
        if (state.restartToken === token) {
          restart();
        }
      }},
      { icon: '✕', label: '取消', action: () => {
        if (state.restartToken === token) {
          state.restartToken = null;
          dom.overlay.classList.remove('active');
          GameAudio.sfx('button');
        }
      }}
    ]);
  }

  function restart() {
    state.restartToken = null;
    dom.overlay.classList.remove('active');
    startRun({ mode: state.mode });
  }

  function confirmFinish() {
    if(state.animating || state.finished || dom.overlay.classList.contains('active'))return;
    state.quitToken = Math.random();
    const token = state.quitToken;
    showOverlay('确认完成？', '结算当前分数', [
      { icon: '✓', label: '确认', action: () => {
        if (state.quitToken === token) {
          finish();
        }
      }},
      { icon: '✕', label: '取消', action: () => {
        if (state.quitToken === token) {
          state.quitToken = null;
          dom.overlay.classList.remove('active');
          GameAudio.sfx('button');
        }
      }}
    ]);
  }

  function finish() {
    if (state.finished || state.animating || !FX.running || FX.paused) return;
    state.finished = true;
    state.quitToken = null;

    if (state.inviteMode && typeof GameInviteV0 !== 'undefined' && GameInviteV0.active()) {
      GameInviteV0.finish(state.score);
      quit();
      return;
    }

    if (!state.inviteMode) {
      saveBest(state.mode, state.score);
    }

    if (typeof Lobby !== 'undefined' && Lobby.reportResult) {
      Lobby.reportResult({
        stage: 0,
        score: state.score,
        stars: state.won ? 3 : 0,
        coins: Math.floor(state.score / 50),
        gems: 0,
        win: state.won
      });
    }

    quit();
  }

  function quit() {
    dom.root.classList.remove('active');
    roundToken++;clearTimeout(animationTimer);state.animating=false;pointerState.active=false;
    FX.running=false;state.finished=true;state.phase='finished';

    if (typeof GameAudio !== 'undefined') {
      GameAudio.stop();
    }
  }

  function renderBoard() {
    dom.board.innerHTML = '';

    for (let i = 0; i < state.size * state.size; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      dom.board.appendChild(cell);
    }

    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        const value = state.grid[r][c];
        if (value > 0) {
          const tile = document.createElement('div');
          tile.className = 'tile';
          tile.dataset.value = value;
          tile.textContent = value;
          positionTile(tile, r, c);
          dom.board.appendChild(tile);
        }
      }
    }
  }

  function positionTile(el,r,c) {
    const css=getComputedStyle(dom.board),pad=parseFloat(css.paddingLeft)||12,gap=parseFloat(css.gap)||8;
    const size=(dom.board.clientWidth-2*pad-(state.size-1)*gap)/state.size;
    el.style.left='0';el.style.top='0';el.style.width=size+'px';el.style.height=size+'px';
    el.style.transform=`translate(${pad+c*(size+gap)}px,${pad+r*(size+gap)}px)`;
    el.dataset.row=r;el.dataset.col=c;
    el.style.fontSize=Math.min(size*.39,Math.max(15,size/(String(el.textContent).length*.67)))+'px';
  }

  function getTileElement(r,c) { return dom.board.querySelector(`.tile[data-row="${r}"][data-col="${c}"]`); }

  function updateDisplay() {
    dom.scoreDisplay.textContent = state.score;
    dom.bestDisplay.textContent = state.best;
    dom.undoBadge.textContent = state.undoLeft;
    dom.undoBtn.classList.toggle('disabled', state.undoLeft === 0 || state.undoStack.length === 0);
    dom.undoBtn.disabled=state.undoLeft===0 || state.undoStack.length===0 || state.finished;

    if (state.remaining !== null) {
      dom.remainingDisplay.textContent = state.remaining;
    }
  }

  function showScoreFloater(gain) {
    const display = gain;

    const floater = document.createElement('div');
    floater.className = 'score-floater';
    floater.textContent = `+${display}`;
    floater.style.left = '50%';
    floater.style.top = '30%';
    floater.style.transform = 'translateX(-50%)';
    dom.root.appendChild(floater);

    setTimeout(() => floater.remove(), 800);
  }

  window.__game = {
    state: () => JSON.parse(JSON.stringify({
      grid: state.grid,
      score: state.score,
      size: state.size,
      mode: state.mode,
      remaining: state.remaining,
      undoLeft: state.undoLeft,
      won: state.won,
      continued: state.continued,
      phase: state.phase,
      animating: state.animating,
      best: state.best
    })),
    move,
    undo,
    continueGame,
    finish,
    start: startRun
  };

  if (typeof FX !== 'undefined') {
    FX.load(['bg-garden', 'li-chibi', 'item-star', 'item-ice', 'item-heart']).then(() => {
      if (typeof Lobby !== 'undefined') {
        Lobby.init({
          id: 'lili-2048',
          title: '栗栗的星糖2048',
          orientation: 'portrait',
          bg: ['bg-garden'],
          modes: [
            { id: 'classic', name: '经典模式', description: '4×4 无限制', icon: 'item-star' },
            { id: 'expanded', name: '扩展模式', description: '5×5 无限制', icon: 'item-ice' },
            { id: 'challenge', name: '挑战模式', description: '4×4 限60步', icon: 'item-heart' }
          ],
          stages: [{ id: 's0', name: '星糖工坊', bg: 'bg-garden' }],
          chars: [{ id: 'li', name: '栗栗', img: 'li-chibi', chibi: 'li-chibi', hp: 100, atk: 80, speed: 90 }],
          skins: [{id:'default',char:'li',name:'原味',filter:'none',rarity:'N'}, {id:'sakura',char:'li',name:'樱糖',filter:'hue-rotate(340deg) saturate(1.2)',rarity:'R',vip:true}, {id:'starry',char:'li',name:'星河',filter:'hue-rotate(200deg) saturate(1.3) brightness(1.1)',rarity:'SR',vip:true}],
          currency: [{ id: 'coin', icon: 'item-heart' }, { id: 'gem', icon: 'item-star' }],
          onStart: startRun,
          onQuit: quit
        });

        if (typeof GameAudio !== 'undefined') {
          GameAudio.mount();
          GameAudio.setPauseCheck(() => {
            return (typeof FX !== 'undefined' && (FX.paused || !FX.running));
          });
        }

        initDOM();

        if (typeof GameInviteV0 !== 'undefined') {
          GameInviteV0.launch('lili-2048', startRun);
        }
      }
    });
  }
})();