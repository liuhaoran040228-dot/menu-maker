window.TwinMoba=(()=>{'use strict';let root=null,controller=null,options={},pads=[],buttons=[];
const listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:controller.signal,passive:false});
function move(p,x,y){p.x=x;p.y=y;options.onMove?.(p.player,x,y);}
function releasePad(p){const id=p.id;p.id=null;p.el.classList.remove('is-dragging');p.el.style.setProperty('--jx','0px');p.el.style.setProperty('--jy','0px');move(p,0,0);if(id!==null&&p.el.hasPointerCapture?.(id))p.el.releasePointerCapture(id);}
function releaseButton(b){const id=b.id;b.id=null;b.el.classList.remove('is-pressed');if(id!==null&&b.el.hasPointerCapture?.(id))b.el.releasePointerCapture(id);}
function reset(){for(const p of pads)releasePad(p);for(const b of buttons)releaseButton(b);root?.querySelectorAll('.moba-ripple').forEach(r=>r.remove());}
function destroy(){reset();controller?.abort();controller=null;if(root){root.replaceChildren();root.classList.remove('moba-controls','moba-duo');}pads=[];buttons=[];root=null;options={};}
function update(p,e){const r=p.el.getBoundingClientRect(),knob=p.knob.getBoundingClientRect(),radius=Math.max(1,(r.width-knob.width)/2-4),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),dist=Math.hypot(dx,dy),f=dist>radius?radius/dist:1,kx=dx*f,ky=dy*f,mag=Math.min(1,dist/radius),amp=mag<.10?0:(mag-.10)/.9;
p.el.style.setProperty('--jx',kx+'px');p.el.style.setProperty('--jy',ky+'px');p.el.style.setProperty('--angle',Math.atan2(dy,dx)+'rad');move(p,dist?dx/dist*amp:0,dist?dy/dist*amp:0);}
function pad(player,zone){const el=document.createElement('div');el.className='moba-joystick';el.dataset.player=player;el.setAttribute('role','group');el.setAttribute('aria-label',options.mode==='duo'?(player?'烬遥移动摇杆':'岚汐移动摇杆'):'移动摇杆');el.innerHTML='<span class="moba-axis" aria-hidden="true"></span><span class="moba-direction" aria-hidden="true"></span><span class="moba-knob" aria-hidden="true"></span>';zone.append(el);const p={el,knob:el.querySelector('.moba-knob'),player,id:null,x:0,y:0};pads.push(p);
listen(el,'pointerdown',e=>{if(p.id!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();p.id=e.pointerId;el.setPointerCapture(e.pointerId);el.classList.add('is-dragging');update(p,e);});listen(el,'pointermove',e=>{if(e.pointerId!==p.id)return;e.preventDefault();update(p,e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(el,event,e=>{if(e.pointerId===p.id){e.preventDefault();releasePad(p);}});listen(el,'contextmenu',e=>e.preventDefault());}
function fire(b){const ripple=document.createElement('span');ripple.className='moba-ripple';b.el.append(ripple);b.el.classList.add('is-pressed');listen(ripple,'animationend',()=>{ripple.remove();if(b.id===null)b.el.classList.remove('is-pressed');});try{if(typeof navigator.vibrate==='function')navigator.vibrate(12);}catch{}if(b.type==='jump')options.onJump?.(b.player);else if(b.type==='interact')options.onInteract?.(b.player);else options.onSwap?.();}
function skill(type,player,zone){const el=createButton(type,48,player);const b={el,type,player,id:null};if(options.mode==='duo')el.setAttribute('aria-label',(player?'烬遥':'岚汐')+(type==='jump'?'跳跃':'互动'));zone.append(el);buttons.push(b);listen(el,'pointerdown',e=>{if(b.id!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();b.id=e.pointerId;el.setPointerCapture(e.pointerId);fire(b);});for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(el,event,e=>{if(e.pointerId===b.id){e.preventDefault();releaseButton(b);}});listen(el,'click',e=>{if(e.detail===0){e.preventDefault();fire(b);}});listen(el,'contextmenu',e=>e.preventDefault());}
function mount(el,opts={}){destroy();root=el;options=opts;controller=new AbortController();root.classList.add('moba-controls');root.classList.toggle('moba-duo',opts.mode==='duo');for(let i=0;i<(opts.mode==='duo'?2:1);i++){const zone=document.createElement('div');zone.className='moba-player-zone';zone.dataset.player=i;root.append(zone);pad(i,zone);const cluster=document.createElement('div');cluster.className='moba-skills';zone.append(cluster);skill('jump',i,cluster);if(opts.mode!=='duo')skill('swap',i,cluster);skill('interact',i,cluster);}listen(window,'blur',reset);listen(window,'resize',reset);listen(window,'orientationchange',reset);listen(document,'visibilitychange',()=>{if(document.hidden)reset();});}
/* Generated SVG artwork helpers are retained; pointer lifecycle was reviewed and unified per widget. */
  function createJumpButtonSVG(size) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.style.pointerEvents = 'none';
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M11 5L5 11H9V18H15V11H19L13 5ZM4 21H20V23H4Z');
    path.setAttribute('fill', 'rgba(0,255,255,0.9)');
    svg.appendChild(path);
    
    return svg;
  }

  function createSwapButtonSVG(size) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.style.pointerEvents = 'none';
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M4 8H20L16 4M20 8L16 12M20 16H4L8 12M4 16L8 20');
    path.setAttribute('stroke', 'rgba(200,100,255,0.9)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
    
    return svg;
  }

  function createInteractButtonSVG(size) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.style.pointerEvents = 'none';
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '8');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'rgba(255,215,100,0.9)');
    circle.setAttribute('stroke-width', '2');
    svg.appendChild(circle);
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 6L14 12L12 18L10 12Z');
    path.setAttribute('fill', 'rgba(255,215,100,0.9)');
    svg.appendChild(path);
    
    return svg;
  }

  function createButton(type, size, player = 0) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('moba-btn', `moba-btn-${type}`);
    btn.dataset.type = type;
    if (player !== undefined) btn.dataset.player = player;
    
    let svg;
    switch (type) {
      case 'jump':
        svg = createJumpButtonSVG(size * 0.6);
        btn.setAttribute('aria-label', '跳跃');
        break;
      case 'swap':
        svg = createSwapButtonSVG(size * 0.6);
        btn.setAttribute('aria-label', '切换角色');
        break;
      case 'interact':
        svg = createInteractButtonSVG(size * 0.6);
        btn.setAttribute('aria-label', '元素互动');
        break;
    }
    
    if (svg) btn.appendChild(svg);
    
    return btn;
  }


return{mount,reset,destroy,state:()=>({mode:options.mode||'solo',pads:pads.map(p=>({player:p.player,x:p.x,y:p.y,pointerId:p.id})),buttons:buttons.map(b=>({player:b.player,type:b.type,pressed:b.el.classList.contains('is-pressed'),pointerId:b.id}))})};})();
