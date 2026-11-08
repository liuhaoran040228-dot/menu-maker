from pathlib import Path
p=Path('.rework-2048/game.js');s=p.read_text()
s=s.replace("  let dom = {};", "  FX.init({landscape:false});\n  let roundToken=0, animationTimer=0;\n  let dom = {};")
s=s.replace("state.grid = Puzzle2048.createBoard(config.size);","roundToken++; clearTimeout(animationTimer);\n    pointerState.active=false;\n    state.grid = Array.from({length:config.size},()=>Array(config.size).fill(0));\n    FX.running=true; FX.paused=false;\n    dom.overlay.classList.remove('active');\n    dom.root.querySelectorAll('.score-floater').forEach(el=>el.remove());")
s=s.replace("return parsed[mode] || 0;", "return Number.isFinite(parsed?.[mode]) && parsed[mode] >= 0 ? parsed[mode] : 0;")
s=s.replace('state.inviteMode = isInvite;',"state.inviteMode = isInvite;")
s=s.replace('if (!e.isPrimary || state.animating', 'if (!FX.running || FX.paused || (e.pointerType === \'mouse\' && e.button !== 0) || !e.isPrimary || state.animating')
s=s.replace('pointerState.active = true;',"pointerState.active = true; pointerState.id=e.pointerId;\n    dom.board.setPointerCapture(e.pointerId);")
s=s.replace('if (!pointerState.active || !e.isPrimary) return;', 'if (!pointerState.active || !e.isPrimary || e.pointerId !== pointerState.id) return;')
s=s.replace("GameAudio.sfx('merge');", "const high=Math.max(...result.merges.map(m=>m.value));\n      GameAudio.sfx('merge',{rate:Math.min(SCORE_RATE_CAP,SCORE_RATE_BASE+Math.log2(high)*SCORE_RATE_INCREMENT)});")
s=s.replace('      renderBoard();\n      const spawnTile', "      renderBoard();\n      result.merges.forEach(m=>getTileElement(m.r,m.c)?.classList.add('merge-pop'));\n      const spawnTile")
a=s.index('  function animateMove(');b=s.index('  function saveUndo()',a)
s=s[:a]+'''  function animateMove(result, callback) {
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

'''+s[b:]
s=s.replace('if (state.undoLeft === 0 || state.undoStack.length === 0 || state.animating) return;', 'if (state.finished || state.undoLeft === 0 || state.undoStack.length === 0 || state.animating) return;')
a=s.index('  function checkWin()');b=s.index('  function showOverlay(',a)
s=s[:a]+'''  function milestone() {
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

'''+s[b:]
s=s.replace("  function confirmRestart() {", "  function confirmRestart() {\n    if(state.animating || state.finished || dom.overlay.classList.contains('active'))return;")
s=s.replace("  function confirmFinish() {", "  function confirmFinish() {\n    if(state.animating || state.finished || dom.overlay.classList.contains('active'))return;")
s=s.replace('if (state.finished) return;', 'if (state.finished || state.animating || !FX.running || FX.paused) return;')
s=s.replace("      GameAudio.bgm();", "      GameAudio.stop();")
s=s.replace("    state.phase = 'idle';", "    roundToken++;clearTimeout(animationTimer);state.animating=false;pointerState.active=false;\n    FX.running=false;state.finished=true;state.phase='finished';")
a=s.index('  function positionTile(');b=s.index('  function getTileElement(',a)
s=s[:a]+'''  function positionTile(el,r,c) {
    const css=getComputedStyle(dom.board),pad=parseFloat(css.paddingLeft)||12,gap=parseFloat(css.gap)||8;
    const size=(dom.board.clientWidth-2*pad-(state.size-1)*gap)/state.size;
    el.style.left='0';el.style.top='0';el.style.width=size+'px';el.style.height=size+'px';
    el.style.transform=`translate(${pad+c*(size+gap)}px,${pad+r*(size+gap)}px)`;
    el.dataset.row=r;el.dataset.col=c;
    el.style.fontSize=Math.min(size*.39,Math.max(15,size/(String(el.textContent).length*.67)))+'px';
  }

'''+s[b:]
a=s.index('  function getTileElement(');b=s.index('  function updateDisplay()',a)
s=s[:a]+'''  function getTileElement(r,c) { return dom.board.querySelector(`.tile[data-row="${r}"][data-col="${c}"]`); }

'''+s[b:]
s=s.replace('const display = Math.floor(gain * rateMultiplier);', 'const display = gain;')
s=s.replace("          initDOM();", "          initDOM();")
s=s.replace("    setupInput();", "    setupInput();\n    window.addEventListener('resize',()=>{if(state.grid&&!state.animating)renderBoard();});\n    window.addEventListener('blur',handlePointerCancel);")
s=s.replace('image: \'item-', 'icon: \'item-')
s=s.replace('style="position:absolute;right:12px;top:70px;display:none;"','')
s=s.replace("    dom.root.classList.add('active');", "    Lobby.hide();dom.root.classList.add('active');")
p.write_text(s)
p=Path('.rework-2048/index.html');s=p.read_text().replace('<body>','<body class="fx">\n  <script src="../vip.js"></script>\n  <script src="../star-economy.js"></script>');p.write_text(s)
