/* Mobile-first single integrated viewport. Existing nodes/handlers are moved, not cloned. */
(()=>{'use strict';
const $=s=>document.querySelector(s),title=$('h1')?.textContent||document.title,route=location.pathname.split('/').filter(Boolean).at(-1),main=$('main');if(!main)return;
document.body.classList.add('game-full');const landscape=document.body.dataset.orientation==='landscape';if(landscape)document.body.classList.add('landscape-game');const tryLandscape=async()=>{if(!landscape)return;try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();await screen.orientation?.lock?.('landscape')}catch{}};
const host=document.createElement('section');host.className='play-viewport';host.setAttribute('aria-label',title+'全屏游戏');
if(landscape){const rotate=document.createElement('div');rotate.className='rotate-overlay';rotate.innerHTML='<img src="../assets/whale-ride.webp" alt="鲸鱼萌娘蓝蓝"><span>STAR CANDY · LANDSCAPE</span><h2>把手机横过来<br>冒险视野更开阔 ✧</h2><p>为连招、跑酷与星海战斗准备的横屏舞台</p><button type="button">横屏开启冒险　↻</button><a href="../tools.html">先回大厅</a>';rotate.querySelector('button').onclick=tryLandscape;host.append(rotate)}
const field=document.createElement('div');field.className='playfield';host.append(field);
const nav=document.createElement('nav');nav.className='play-nav';nav.innerHTML='<a href="../tools.html" aria-label="返回游戏大厅">‹ 大厅</a><span class="play-title"></span><button class="menu-toggle" type="button" aria-label="菜单与装扮">☰ 菜单</button>';nav.querySelector('.play-title').textContent=title;host.append(nav);
const hud=document.createElement('div');hud.className='play-hud';host.append(hud);
const pad=document.createElement('div');pad.className='play-pad';pad.setAttribute('aria-label','方向控制');host.append(pad);
const skills=document.createElement('div');skills.className='play-skills';skills.setAttribute('aria-label','技能控制');host.append(skills);
host.style.backgroundImage="linear-gradient(#162c5e55,#102340aa),url('../assets/"+(location.pathname.includes('fighter')?'bg-arena':location.pathname.includes('runner')?'bg-rail':/snake|monster-loot|td|match|merge|2048/.test(location.pathname)?'bg-garden':'bg-space')+".webp')";
const dialog=document.createElement('dialog');dialog.className='game-menu';dialog.setAttribute('aria-label','菜单、装备与装扮');dialog.innerHTML='<div class="menu-title"><h2>冒险手账 · 菜单</h2><button type="button">回到游戏</button></div>';
const pause=$('#pause');if(pause)nav.append(pause);
const firstHud=$('.hud')||$('.a2-hud')||$('.page-head .bar');if(firstHud)hud.append(firstHud);
for(const el of document.querySelectorAll('.health-row,.loot-stats'))hud.append(el);
const en=$('#energy');if(en?.closest('label'))hud.append(en.closest('label'));
let board=$('.a2-vn-stage')||$('.a2-board')||$('.game-wrap')||$('canvas')||$('#g')||$('#board');if(board){field.append(board);if(board.id==='stage')field.classList.add('story-field');if(board.id==='g'||board.id==='board'||board.querySelector('#g,#board')){field.classList.add('puzzle-field');const slot=$('#slot');if(slot)field.append(slot)}if(location.pathname.includes('fortune'))field.classList.add('fortune-field')}
// All direction buttons remain pointer-held buttons; actions occupy the other corner.
for(const btn of document.querySelectorAll('.controls button')){if(btn.id==='start')continue;const a=btn.dataset.action;if(['left','right','up','down'].includes(a))pad.append(btn);else skills.append(btn)}
for(const id of ['vipitem','pulse','freeze','undo','shuffle','pop','go','save','next','speed']){const el=document.getElementById(id);if(el&&!skills.contains(el)&&!field.contains(el))skills.append(el)}
for(const id of ['special','ultimate']){const el=skills.querySelector('[data-action="'+id+'"]');if(el)el.classList.add('big-skill')}
// A true virtual thumbstick overlays the lower-left corner. Keyboard remains available.
if(pad.children.length){const stick=document.createElement('div');stick.className='virtual-stick';stick.setAttribute('role','group');stick.setAttribute('aria-label','拖动摇杆移动，键盘方向键也可操作');stick.innerHTML='<span></span>';host.append(stick);pad.classList.add('fallback-pad');let held=new Set(),pointer=null;
 const keyFor={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'};
 function release(){for(const a of held)window.dispatchEvent(new KeyboardEvent('keyup',{key:keyFor[a],bubbles:true}));held.clear();stick.firstChild.style.transform='translate(0,0)';pointer=null}
 function steer(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),k=Math.min(1,30/Math.max(1,len));stick.firstChild.style.transform='translate('+dx*k+'px,'+dy*k+'px)';const next=new Set();if(len>10){if(location.pathname.includes('/snake/'))next.add(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');else {if(Math.abs(dx)>10)next.add(dx>0?'right':'left');if(Math.abs(dy)>17)next.add(dy>0?'down':'up')}}for(const a of held)if(!next.has(a))window.dispatchEvent(new KeyboardEvent('keyup',{key:keyFor[a],bubbles:true}));for(const a of next)if(!held.has(a))window.dispatchEvent(new KeyboardEvent('keydown',{key:keyFor[a],bubbles:true}));held=next}
 stick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);steer(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)steer(e)});for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,release);window.addEventListener('blur',release);
}
const storyControls=$('.a2-settings');if(storyControls){storyControls.classList.add('play-story-controls');host.append(storyControls)}
const start=$('#start');if(start&&!field.contains(start)){
 const launch=document.createElement('div');launch.className='play-launch';launch.innerHTML='<span class="launch-label">STAR CANDY · ORIGINAL ADVENTURE</span><img src="../assets/whale-idle.webp" alt="原创鲸鱼萌娘蓝蓝"><h2></h2><p>开启属于你的星糖冒险。<br>左手移动，右手释放技能；外观和装备都在菜单里。</p><button type="button">开始冒险　✦</button>';launch.querySelector('h2').textContent=title;
 const who=location.pathname.includes('fighter')?'hu':location.pathname.includes('monster-loot')?'li':location.pathname.includes('shooter')?'xing':'lan';launch.querySelector('img').src='../assets/'+(who==='lan'?'whale-idle':who+'-chibi')+'.webp';
 launch.querySelector('button').onclick=async()=>{if(landscape)await tryLandscape();start.click();launch.hidden=true};host.append(launch);
 // Keep restart/resume accessible without leaving the viewport.
 const quick=document.createElement('button');quick.type='button';quick.textContent='▶';quick.setAttribute('aria-label','开始或重新开始');quick.onclick=async()=>{if(landscape)await tryLandscape();start.click();launch.hidden=true};nav.append(quick);
}
const quick=$('.a2-mobile-build');if(quick){quick.classList.remove('a2-mobile-build');quick.classList.add('play-quickbuild');host.classList.add('has-quickbuild');host.append(quick)}
const status=$('#msg')||$('#state');if(status){status.classList.add('play-status');host.append(status)}
// Character/wardrobe/inventory/help all live in a modal; there is no scrollable page below canvas.
dialog.append(main);document.body.append(dialog,host);
nav.querySelector('.menu-toggle').onclick=()=>{if(pause&&((window.__game?.active&&!window.__game?.paused)||['play','build'].includes(window.A2Game?.snapshot().mode)))pause.click();if(storyControls&&($('#auto')?.dataset.controlText||$('#auto')?.textContent||'').includes('开'))$('#auto').click();dialog.showModal()};dialog.querySelector('.menu-title button').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
if(window.WorldScenes&&(field.classList.contains('puzzle-field')||field.classList.contains('fortune-field')||field.classList.contains('story-field')))WorldScenes.bindDOM(field.classList.contains('story-field')?board:field,route,GameArt.level);
// Move top-level header settings such as 2048 palettes into the modal if not part of HUD.
const header=$('body>header');if(header){const select=header.querySelector('select');if(select&&!hud.contains(select))main.prepend(select)}
// A visible fixed-position joystick marker matches survivor's drag-anywhere input.
if(location.pathname.includes('/survivor/')){const hint=document.createElement('div');hint.className='stick-hint';hint.innerHTML='<span>✥</span>';hint.style.cssText='position:absolute;left:22px;bottom:calc(env(safe-area-inset-bottom,0px) + 26px);width:84px;height:84px;border:1px solid #c6eaff55;border-radius:50%;background:#93cbff16;pointer-events:none;display:grid;place-items:center;color:#c3e6ff88;font-size:28px;z-index:12';host.append(hint)}
})();

{const icons=document.createElement("script");icons.src=new URL("game-icons.js",document.currentScript.src).href;document.body.append(icons)}
